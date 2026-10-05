import {categories} from './data.js';
export const total = budget => categories.reduce((sum,c)=>sum+(Number(budget[c.id])||0),0);
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
export function categorize(description,category='') {
  const explicit=String(category).trim().toLowerCase();
  if(categories.some(c=>c.id===explicit)) return explicit;
  const s=(explicit+' '+description).toLowerCase();
  if(/transfer|payment to credit card|credit card payment|payroll|salary|income|deposit|refund|venmo|zelle/.test(s))return 'exclude';
  if(/rent|landlord|lease|housing|mortgage/.test(s))return 'rent';
  if(/grocery|groceries|trader joe|whole foods|aldi|kroger|safeway|supermarket/.test(s))return 'groceries';
  if(/restaurant|dining|coffee|cafe|starbucks|doordash|uber eats|chipotle|takeout|bar |brewery/.test(s))return 'dining';
  if(/transport|uber|lyft|metro|transit|train|gasoline|parking|fuel|shell|chevron/.test(s))return 'transport';
  if(/utilit|electric|water bill|internet|phone|verizon|comcast|energy/.test(s))return 'utilities';
  if(/shopping|amazon|clothing|retail|target|ikea|nike/.test(s))return 'shopping';
  if(/entertainment|fitness|gym|concert|cinema|movie|ticket|yoga/.test(s))return 'entertainment';
  if(/subscription|netflix|spotify|insurance|loan|health|medical|other|apple/.test(s))return 'fixed';
  return 'review';
}
export function buildTransactions(csv,mapping,sign='positive') {
  let invalid=0;
  const transactions=csv.rows.map((row,i)=>{
    const raw=parseAmount(row[mapping.amount]);
    if(raw===null){invalid++;return null;}
    const amount=sign==='negative'?-raw:raw;
    if(amount<=0)return null;
    const description=String(row[mapping.description]||`Transaction ${i+1}`);
    return {description,amount,category:categorize(description,mapping.category>=0?row[mapping.category]:''),row:i+2};
  }).filter(Boolean);
  return {transactions,invalid,skipped:csv.rows.length-transactions.length-invalid};
}
export function aggregate(transactions,months) {
  const budget=Object.fromEntries(categories.map(c=>[c.id,0]));
  for(const t of transactions) if(Object.hasOwn(budget,t.category))budget[t.category]+=t.amount;
  for(const c of categories)budget[c.id]=Math.round(budget[c.id]/months*100)/100;
  return budget;
}
