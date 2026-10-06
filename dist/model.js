import {categories} from './data.js';
import {classifyTransaction, flattenTransactions, validSplits} from './merchant-engine.js';
export const total = budget => categories.reduce((sum,c)=>sum+Math.round((Number(budget[c.id])||0)*100),0)/100;
export function estimate(budget,from,to,currentHousing='alone',targetHousing='alone',roommateFactor=.65,override=null) {
  const result={};
  for(const c of categories) {
    let multiplier=c.index ? to[c.index]/from[c.index] : 1;
    if(c.id==='rent') multiplier *= (targetHousing==='shared'?roommateFactor:1)/(currentHousing==='shared'?roommateFactor:1);
    result[c.id]=Math.round((Number(budget[c.id])||0)*multiplier*100)/100;
  }
  if(override!==null && Number.isFinite(override) && override>=0) result.rent=override;
  return result;
}
export function parseCSV(text) {
  const rows=[]; let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(char==='"') {
      if(quoted && text[i+1]==='"') {field+='"';i++;}
      else if(!quoted && field.length) throw new Error('A quote appears inside an unquoted value. Save the file as standard CSV.');
      else quoted=!quoted;
    } else if(char===',' && !quoted) {row.push(field);field='';}
    else if((char==='\n'||char==='\r')&&!quoted) {
      if(char==='\r'&&text[i+1]==='\n') i++;
      row.push(field); if(row.some(v=>v.trim()))rows.push(row); row=[];field='';
    }else field+=char;
  }
  if(quoted)throw new Error('An opening quote has no closing quote. Check the CSV file.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.length<2)throw new Error('Add a header row and at least one transaction.');
  const headers=rows.shift().map((x,i)=>x.trim()||`Column ${i+1}`);
  if(rows.some(r=>r.length!==headers.length)) throw new Error('Some rows have a different number of columns. Check commas and quoted values.');
  if(rows.length>10000)throw new Error('Please use a file with 10,000 transactions or fewer.');
  return {headers,rows};
}
export function parseAmount(value) {
  const s=String(value).trim();
  if(!s)return null;
  const normalized=s.replace(/[$,\s]/g,'').replace(/^\((.+)\)$/,'-$1');
  if(!/^[+-]?\d+(?:\.\d{1,2})?$/.test(normalized))return null;
  const result=Number(normalized);return Number.isFinite(result)?result:null;
}
export function categorize(description,category='') {return classifyTransaction({description,providedCategory:category}).category;}
export function buildTransactions(csv,mapping,sign='positive',options={}) {
  let invalid=0;
  const transactions=csv.rows.map((row,i)=>{
    const raw=parseAmount(row[mapping.amount]);
    if(raw===null){invalid++;return null;}
    const amount=sign==='negative'?-raw:raw;
    if(amount<=0)return null;
    const description=String(row[mapping.description]||`Transaction ${i+1}`);
    const transaction={description,amount,providedCategory:mapping.category>=0?row[mapping.category]:'',date:row[mapping.date]||'',mcc:row[mapping.mcc]||'',merchantName:row[mapping.merchant]||'',location:row[mapping.location]||'',row:i+2};
    return {...transaction,...classifyTransaction(transaction,options)};
  }).filter(Boolean);
  return {transactions,invalid,skipped:csv.rows.length-transactions.length-invalid};
}
export function aggregate(transactions,months) {
  if(!Number.isInteger(months)||months<1||months>120)throw new Error('Choose 1–120 complete months.');
  if(transactions.some(t=>!validSplits(t)||(!t.splits&&t.category==='review')))throw new Error('Resolve every transaction category and check split totals before saving.');
  const cents=Object.fromEntries(categories.map(c=>[c.id,0]));
  for(const t of flattenTransactions(transactions))if(Object.hasOwn(cents,t.category)){
    if(!Number.isFinite(t.amount)||t.amount<=0)throw new Error('Check transaction amounts before saving.');
    cents[t.category]+=Math.round(t.amount*100);
  }
  return Object.fromEntries(categories.map(c=>[c.id,Math.round(cents[c.id]/months)/100]));
}
