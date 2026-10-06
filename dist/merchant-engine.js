import { categories } from './data.js';

// Ordered aliases are explicit; never collapse distinct merchants by substring alone.
export const merchants=[
  ['Whole Foods','groceries',['WHOLE FOODS','WHOLEFDS','WHOLE FOODS MARKET','WFM']],
  ["Trader Joe's",'groceries',['TRADER JOES','TRADER JOE']],
  ['Kroger','groceries',['KROGER']],['Aldi','groceries',['ALDI']],['Publix','groceries',['PUBLIX']],['Safeway','groceries',['SAFEWAY']],['Sprouts','groceries',['SPROUTS','SPROUTS FARMERS MARKET']],
  ['Uber Eats','dining',['UBER EATS','UBEREATS','UBER EATS HELP']],
  ['Uber','transport',['UBER','UBER TRIP','UBER BV','UBER TECHNOLOGIES','UBER HELP']],
  ['Lyft','transport',['LYFT','LYFT RIDE']],['Shell','transport',['SHELL','SHELL OIL']],['Chevron','transport',['CHEVRON']],['SP Plus','transport',['SP PLUS','SP PLUS CORP','SPPLUS','SP PLUS CORPORATION']],['ParkMobile','transport',['PARKMOBILE']],
  ['Delta Air Lines','travel',['DELTA','DELTA AIR','DELTA AIR LINES','DELTA AIRLINES']],
  ['Delta Dental','insurance',['DELTA DENTAL']],['American Airlines','travel',['AMERICAN AIRLINES','AMERICAN AIR']],['United Airlines','travel',['UNITED AIRLINES','UNITED AIR']],['Southwest','travel',['SOUTHWEST','SOUTHWEST AIRLINES']],['JetBlue','travel',['JETBLUE','JETBLUE AIRWAYS']],['Marriott','travel',['MARRIOTT']],['Hilton','travel',['HILTON']],['Airbnb','travel',['AIRBNB']],['Expedia','travel',['EXPEDIA']],
  ['Netflix','entertainment',['NETFLIX','NETFLIXCOM']],['Spotify','entertainment',['SPOTIFY']],['Hulu','entertainment',['HULU']],['AMC','entertainment',['AMC THEATRES','AMC THEATERS']],['Ticketmaster','entertainment',['TICKETMASTER']],
  ['Chipotle','dining',['CHIPOTLE','CHIPOTLE MEXICAN GRILL']],['Starbucks','dining',['STARBUCKS','STARBUCKS STORE']],['Blue Bottle Coffee','dining',['BLUE BOTTLE','BLUE BOTTLE COF','BLUE BOTTLE COFFEE']],['ABC Kitchen','dining',['ABC KITCHEN']],['The Hampton Social','dining',['THE HAMPTON SOCIAL','HAMPTON SOCIAL']],['DoorDash','dining',['DOORDASH','DD DOORDASH']],['Panera Bread','dining',['PANERA','PANERA BREAD']],['McDonalds','dining',['MCDONALDS']],['Sweetgreen','dining',['SWEETGREEN']],
  ['Target','shopping',['TARGET']],['Walmart','shopping',['WALMART','WAL MART','WM SUPERCENTER','WALMART SUPERCENTER']],['Costco','shopping',['COSTCO','COSTCO WHSE','COSTCO WHOLESALE']],['Amazon','shopping',['AMAZON','AMAZONCOM','AMZN','AMZN MKTPLACE','AMAZON MKTPLACE','AMAZON MARKETPLACE','AMZN MKTP US']],['CVS','health',['CVS','CVS PHARMACY']],['Walgreens','health',['WALGREENS']],
  ['Amazon Prime','subscriptions',['AMAZON PRIME','AMZN PRIME']],['Apple Services','subscriptions',['APPLECOM BILL','APPLE SERVICES','APPLE BILL']],['Adobe','subscriptions',['ADOBE']],['Microsoft','subscriptions',['MICROSOFT']],
  ['Nike','shopping',['NIKE']],['IKEA','shopping',['IKEA']],['RH','shopping',['RH','RESTORATION HARDWARE']],['RH Restaurant','dining',['RH RESTAURANT','RH ROOFTOP RESTAURANT']],
  ['Verizon','utilities',['VERIZON','VZWRLSS']],['AT&T','utilities',['ATT','AT T']],['Comcast','utilities',['COMCAST','XFINITY']],['Spectrum','utilities',['SPECTRUM']],
  ['Planet Fitness','health',['PLANET FITNESS']],['ClassPass','health',['CLASSPASS']],['Peloton','health',['PELOTON']],['OrangeTheory','health',['ORANGETHEORY','ORANGE THEORY FITNESS']],
  ['Sephora','personal',['SEPHORA']],['Ulta Beauty','personal',['ULTA','ULTA BEAUTY']],['Great Clips','personal',['GREAT CLIPS']],
  ['Geico','insurance',['GEICO']],['Progressive','insurance',['PROGRESSIVE']],['State Farm','insurance',['STATE FARM']],['Allstate','insurance',['ALLSTATE']],
  ['Chewy','pets',['CHEWY','CHEWYCOM']],['PetSmart','pets',['PETSMART']],['Petco','pets',['PETCO']],
].map(([name,category,aliases])=>({name,category,aliases,mixed:['Target','Walmart','Costco','Amazon','CVS','Walgreens'].includes(name)}));

const stateCodes='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const locations=['NEW YORK','NYC','SAN FRANCISCO','SEATTLE','WASHINGTON','BOSTON','SAN DIEGO','LOS ANGELES','MIAMI','PHILADELPHIA','CHICAGO','ATLANTA','PORTLAND','DENVER','DALLAS','NASHVILLE','AUSTIN'];
function clean(value){
  let text=String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  text=text.replace(/^(?:(?:PURCHASE|POS(?: DEBIT)?|CHECKCARD|DEBIT CARD|VISA|MASTERCARD|MC|CARD PURCHASE)\s+(?:\d+\s+)?)+/,'');
  text=text.replace(/^(?:(?:SQ|SQUARE|SQUAREUP|TST|TOAST|PAYPAL|PP|STRIPE)\s*\*?\s+|(?:SQ|TST|PAYPAL|STRIPE)\*)+/,'');
  text=text.replace(/\bHELP[.\s-]*(?:UBER|LYFT)[.]COM\b/g,'');
  text=text.replace(/(?:https?:\/\/)?(?:www\.)?/gi,'').replace(/\.COM\b/g,'COM');
  text=text.replace(/\b(?:CARD(?: ENDING)?|AUTH(?:ORIZATION)?|REF(?:ERENCE)?|STORE|LOC(?:ATION)?)\s*#?\s*\d+\b/g,' ');
  text=text.replace(/\b\d{3}[-.]\d{3}[-.]\d{4}\b/g,' ').replace(/\b\d{4,}\b/g,' ').replace(/#\d+\b/g,' ');
  text=text.replace(/([A-Z])\d{3,}\b/g,'$1');
  text=text.replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  text=text.replace(/\s+(?:US|USA)$/,'').replace(new RegExp('\\s+(?:'+stateCodes.join('|')+')$'),'');
  for(const location of locations)if(text.endsWith(' '+location))text=text.slice(0,-location.length-1).trim();
  text=text.replace(/\s+(?:BV|LLC|INC|CORP|CORPORATION)$/,'').replace(/\s+\d+$/,'').trim();
  return text;
}
const aliases=new Map(merchants.flatMap(m=>m.aliases.map(a=>[clean(a),m])));
const title=text=>text.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bAbc\b/g,'ABC').replace(/\bCvs\b/g,'CVS');
export function normalizeMerchant(descriptor){
  const cleaned=clean(descriptor),known=aliases.get(cleaned),name=known?.name||title(cleaned);
  return {merchantName:name,key:clean(known?.name||cleaned),cleaned,originalDescriptor:String(descriptor||'')};
}
export function similarity(a,b){
  a=clean(a);b=clean(b);if(a===b)return 1;if(!a||!b)return 0;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=row;}
  return 1-previous[b.length]/Math.max(a.length,b.length);
}
const categoryAliases={housing:'rent',rent:'rent',groceries:'groceries',grocery:'groceries',dining:'dining','dining coffee':'dining',restaurants:'dining',transportation:'transport',travel:'travel',shopping:'shopping',entertainment:'entertainment','fun fitness':'health','health fitness':'health',health:'health','personal care':'personal',utilities:'utilities',subscriptions:'subscriptions',insurance:'insurance',pets:'pets',miscellaneous:'misc',other:'misc',fixed:'misc',exclude:'exclude'};
export function resolveCategory(value){const text=String(value||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();return categories.find(c=>c.id===text)?.id||categoryAliases[text]||null;}
// MCC guidance describes merchant business, not the individual goods purchased.
const mccs={5411:'groceries',5422:'groceries',5441:'groceries',5451:'groceries',5462:'groceries',5499:'groceries',5812:'dining',5813:'dining',5814:'dining',4111:'transport',4112:'transport',4121:'transport',4131:'transport',4789:'transport',5541:'transport',5542:'transport',7523:'transport',4511:'travel',4722:'travel',7011:'travel',7512:'travel',4814:'utilities',4899:'utilities',4900:'utilities',5912:'health',8011:'health',8021:'health',8031:'health',8041:'health',8042:'health',8062:'health',8099:'health',7997:'health',7230:'personal',7298:'personal',6300:'insurance',5995:'pets','0742':'pets',7832:'entertainment',7922:'entertainment',7996:'entertainment',5310:'shopping',5311:'shopping',5399:'shopping'};
const heuristics=[['rent',/\b(?:RENT|LANDLORD|APARTMENT|MORTGAGE)\b/],['groceries',/\b(?:GROCERIES|GROCERY|SUPERMARKET)\b/],['dining',/\b(?:RESTAURANT|COFFEE|CAFE|DINER|TAKEOUT|BREWERY)\b/],['transport',/\b(?:PARKING|TRANSIT|RIDESHARE|GASOLINE|FUEL)\b/],['travel',/\b(?:AIRLINES|AIRWAYS|HOTEL|LODGING)\b/],['health',/\b(?:PHARMACY|DENTIST|MEDICAL|GYM|FITNESS|YOGA)\b/],['personal',/\b(?:SALON|BARBER|SPA|BEAUTY)\b/],['utilities',/\b(?:ELECTRIC|WATER BILL|INTERNET|UTILITIES)\b/],['insurance',/\bINSURANCE\b/],['pets',/\b(?:VETERINARY|VETERINARIAN|PET SUPPLIES)\b/],['subscriptions',/\bSUBSCRIPTION\b/],['shopping',/\b(?:CLOTHING|RETAIL|HOUSEHOLD SHOPPING)\b/]];
const validCategory=c=>c==='exclude'||categories.some(x=>x.id===c);
export function confidenceStatus(confidence){return confidence>=90?'automatic':confidence>=70?'suggested':'needs-category';}
function finish(base,category,confidence,source,reason,extra={}){
  confidence=Math.max(0,Math.min(100,Math.round(confidence)));const status=confidenceStatus(confidence);
  return {...base,category:status==='needs-category'?'review':category,suggestedCategory:category,confidence,status,source,reason,...extra};
}
export function classifyTransaction(transaction,{rules={}}={}){
  const original=String(transaction.originalDescriptor??transaction.description??transaction.name??''),normalized=normalizeMerchant(transaction.merchantName||transaction.merchant_name||original);
  const base={...normalized,originalDescriptor:original};
  if(transaction.credit||transaction.category==='exclude'&&transaction.source==='statement-credit')return finish(base,'exclude',100,'statement-credit','Credit or refund from the statement.',{credit:true});
  const userRule=rules[base.key];if(userRule&&validCategory(userRule.category))return finish({...base,merchantName:userRule.merchant_name||userRule.merchantName||base.merchantName},userRule.category,100,'personal','Your saved merchant rule.');
  if(/^(?:PAYMENT(?: THANK YOU| RECEIVED| TO CREDIT CARD)?|CREDIT CARD PAYMENT|AUTOPAY PAYMENT|TRANSFER|PAYROLL|SALARY|INTEREST PAYMENT)\b/i.test(normalized.cleaned))return finish(base,'exclude',99,'transfer','Payment, income, or transfer; not a purchase.');
  const explicit=resolveCategory(transaction.providedCategory);
  if(explicit)return finish(base,explicit,96,'statement-category','Category supplied in the file.');
  const known=aliases.get(normalized.cleaned)||merchants.find(m=>clean(m.name)===base.key);
  if(known)return finish({...base,merchantName:known.name,key:clean(known.name)},known.category,known.mixed?65:98,'dictionary',known.mixed?'This store sells items in several categories. Choose a category or split the purchase.':'Matched a known merchant.',{mixed:known.mixed});
  if(base.key.length>=6){
    const candidates=merchants.map(m=>({merchant:m,score:Math.max(...m.aliases.filter(a=>clean(a).length>=6).map(a=>similarity(base.key,a)),0)})).sort((a,b)=>b.score-a.score);
    const best=candidates[0],next=candidates[1];
    if(best.score>=.84&&best.score-(next?.score||0)>=.09){const m=best.merchant,personal=rules[clean(m.name)],variant={...base,merchantName:m.name,key:clean(m.name)};if(personal&&validCategory(personal.category))return finish(variant,personal.category,best.score>=.94?95:84,'personal','Matched a spelling variant of your saved merchant rule.');return finish(variant,m.category,m.mixed?65:best.score>=.94?92:84,'fuzzy',m.mixed?'Similar to a mixed retailer; choose a category or split.':'Matched a spelling variant of '+m.name+'.',{mixed:m.mixed});}
  }
  const mcc=String(transaction.mcc||transaction.merchant_category_code||'').trim();
  const mccCategory=mccs[mcc]||(/^(?:3[0-9]{3})$/.test(mcc)?'travel':null);
  if(mccCategory)return finish(base,mccCategory,[5310,5311,5399,5912].includes(Number(mcc))?65:94,'mcc','Merchant category code '+mcc+'.');
  const enrichment=resolveCategory(transaction.enrichedCategory||transaction.personal_finance_category?.primary);
  if(enrichment)return finish(base,enrichment,85,'enrichment','Category supplied by a transaction provider.');
  const matches=heuristics.filter(([,rx])=>rx.test(normalized.cleaned));
  if(matches.length===1)return finish(base,matches[0][0],78,'description','Suggested from the merchant description.');
  return finish(base,matches[0]?.[0]||'misc',0,'unknown','Choose a category. There is not enough reliable information to guess.');
}
export function applyAIResult(classification,result){
  if(!validCategory(result?.category)||result.category==='exclude'||!Number.isFinite(result.confidence))return classification;
  if(classification.confidence>=90||classification.credit||classification.mixed)return classification;
  return finish(classification,result.category,result.confidence,'ai',String(result.reason||'AI suggestion.').slice(0,300));
}
export function classifyTransactions(transactions,options){return transactions.map(t=>({...t,...classifyTransaction(t,options)}));}
export function validSplits(transaction){
  if(!transaction.splits)return true;if(!Array.isArray(transaction.splits)||transaction.splits.length<2)return false;
  if(transaction.splits.some(s=>!validCategory(s.category)||!Number.isFinite(s.amount)||s.amount<=0||Math.abs(s.amount*100-Math.round(s.amount*100))>.00001))return false;
  return transaction.splits.reduce((sum,s)=>sum+Math.round(s.amount*100),0)===Math.round(transaction.amount*100);
}
export function flattenTransactions(transactions){return transactions.flatMap(t=>t.splits&&validSplits(t)?t.splits.map(s=>({...t,splits:undefined,category:s.category,amount:s.amount})):t);}
