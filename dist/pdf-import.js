import {categorize,parseAmount} from './model.js';
import './pdf-compat.js';

// Rebuild lines from PDF text coordinates; extraction order is often not reading order.
export function textItemsToLines(items,page=1){
  const rows=[];
  for(const item of items){
    if(!item.str?.trim()||!item.transform)continue;
    const x=item.transform[4],y=item.transform[5];
    let row=rows.find(r=>Math.abs(r.y-y)<Math.max(2,Math.min(item.height||10,10)*.3));
    if(!row){row={y,items:[]};rows.push(row);}row.items.push({x,text:item.str});
  }
  return rows.sort((a,b)=>b.y-a.y).map(row=>({page,text:row.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ').replace(/\s+/g,' ').trim()}));
}

export async function extractPDF(file,onProgress=()=>{}){
  const pdfjs=await import('./vendor/pdf.compat.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('./pdf-worker.js',import.meta.url).href;
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true});
  let document;
  try{
    document=await task.promise;
    if(document.numPages>75)throw new Error('Please upload a statement with 75 pages or fewer.');
    const lines=[];
    for(let page=1;page<=document.numPages;page++){
      onProgress(`Reading page ${page} of ${document.numPages}…`);
      const pdfPage=await document.getPage(page);
      const content=await pdfPage.getTextContent();
      lines.push(...textItemsToLines(content.items,page));pdfPage.cleanup();
    }
    if(!lines.some(l=>/[a-z0-9]/i.test(l.text)))throw new Error('This PDF has no readable text. Scanned or image-only statements need OCR; please use a text-based PDF or CSV.');
    return {lines,pages:document.numPages};
  }catch(error){
    if(error.name==='PasswordException')throw new Error('This PDF is password protected. Export an unlocked copy and try again.');
    if(error.name==='InvalidPDFException')throw new Error('This file is not a valid PDF. Please try another statement.');
    throw error;
  }finally{await task.destroy();}
}

const datePattern=/^(?:(?:\d{4}[-/]\d{1,2}[-/]\d{1,2})|(?:\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?)|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?))\b\s*/i;
const amountPattern=/\(?[-+]?\$?\s*(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\)?(?:\s?(?:CR|DR))?/gi;

export function parseStatementLines(lines,amountPosition='first',negativeMeaning='credit'){
  const transactions=[];let section='unknown',pending=null,datedRows=0;
  for(const line of lines){
    const text=line.text.trim();let date=text.match(datePattern);
    if(!date){
      if(/^(?:deposits|payments and credits|credits|deposits and (?:other )?additions|money (?:in|added))/i.test(text))section='credit';
      else if(/^(?:withdrawals|electronic withdrawals|purchases|debits|payments and (?:other )?withdrawals|money (?:out|spent)|card transactions|transactions)/i.test(text))section='spending';
      if(pending && !/^(?:page |date\b|description\b|total\b|balance\b)/i.test(text)) pending.text+=' '+text;
      else continue;
    }else{
      datedRows++;pending={...line,date:date[0].trim(),text:text.slice(date[0].length),section};
      const secondDate=pending.text.match(datePattern);if(secondDate)pending.text=pending.text.slice(secondDate[0].length);
    }
    if(!pending)continue;
    const amounts=[...pending.text.matchAll(amountPattern)];
    if(!amounts.length)continue;
    const selected=amountPosition==='last'?amounts.at(-1):amounts[0];
    const rawText=selected[0].replace(/\s*(?:CR|DR)$/i,'').trim();const raw=parseAmount(rawText);
    const description=pending.text.slice(0,amounts[0].index).trim();
    if(raw!==null && raw!==0 && description && !/^(?:opening|closing|beginning|ending|available)?\s*balance\b|^total\b/i.test(description)){
      const credit=pending.section==='credit'||/CR\s*$/i.test(selected[0])||(raw<0&&negativeMeaning==='credit');
      transactions.push({description,amount:Math.abs(raw),category:credit?'exclude':categorize(description),date:pending.date,page:pending.page,original:text,multipleAmounts:amounts.length>1});
    }
    pending=null;
  }
  return {transactions,datedRows};
}
