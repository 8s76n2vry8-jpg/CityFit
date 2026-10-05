import {cities,categories,sampleBudget} from './data.js';
import {total,estimate,parseCSV,parseAmount,buildTransactions,aggregate} from './model.js';

const $=id=>document.getElementById(id);
const state={budget:{...sampleBudget},from:'nyc',currentHousing:'alone',targetHousing:'alone',factor:.65,selected:['chicago','austin','seattle'],active:'chicago',overrides:{},source:'example'};
const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const money=n=>currency.format(Math.round(n));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const city=id=>cities.find(c=>c.id===id);
const paths={home:'M3 10 12 3l9 7M5 9v11h14V9M9 20v-7h6v7',basket:'m7 9 5-6 5 6M3 9h18l-2 11H5L3 9ZM9 12v5m6-5v5',coffee:'M4 5h12v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V5Zm12 1h2a3 3 0 0 1 0 6h-2M3 22h16',train:'M7 3h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM5 11h14M8 15h1m6 0h1M8 19l-2 3m10-3 2 3',bolt:'m13 2-9 12h7l-1 8 10-12h-7l0-8',bag:'M5 8h14l1 13H4L5 8ZM8 8V6a4 4 0 0 1 8 0v2',music:'M9 18V5l11-2v13M9 8l11-2M9 18c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Zm11-2c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Z',repeat:'M4 9a8 8 0 0 1 13-5l3 3M20 3v4h-4M20 15a8 8 0 0 1-13 5l-3-3M4 21v-4h4'};
const icon=c=>`<span class="category-icon" style="color:${c.color};background:${c.color}12" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[c.icon]}"/></svg></span>`;
const deltaClass=n=>n<-0.5?'saving':n>.5?'more':'neutral';
const deltaText=n=>Math.abs(n)<.5?'—':(n<0?'−':'+')+money(Math.abs(n));
function projected(id){return estimate(state.budget,city(state.from),city(id),state.currentHousing,state.targetHousing,state.factor,state.overrides[id]??null);}
function announce(s){$('live-status').textContent=s;}

$('current-city').innerHTML=cities.map(c=>`<option value="${c.id}">${c.name}, ${c.state}</option>`).join('');
$('budget-inputs').innerHTML=categories.map(c=>`<div class="budget-row">${icon(c)}<label for="budget-${c.id}">${c.name}</label><div class="money-field"><span aria-hidden="true">$</span><input type="number" id="budget-${c.id}" data-category="${c.id}" min="0" max="100000" step="0.01" value="${state.budget[c.id]}" inputmode="decimal" aria-label="${c.name}, dollars per month"></div></div>`).join('');

function render(){
  const currentTotal=total(state.budget),target=city(state.active),budget=projected(state.active),targetTotal=total(budget),difference=targetTotal-currentTotal;
  $('budget-total').innerHTML=`${money(currentTotal)}<span>/mo</span>`;
  $('source-note').textContent=state.source==='example'?'Example budget · edit to make it yours':state.source==='csv'?'Imported budget · editable amounts':'Your monthly budget';
  $('budget-strip').innerHTML=categories.map(c=>`<span style="width:${currentTotal?state.budget[c.id]/currentTotal*100:0}%;background:${c.color}" title="${c.name}: ${money(state.budget[c.id])}"></span>`).join('');
  $('city-cards').innerHTML=state.selected.map(id=>{
    const c=city(id),t=total(projected(id)),d=t-currentTotal,pct=currentTotal?Math.abs(d/currentTotal*100):0;
    const label=Math.abs(d)<.5?'Same monthly budget':currentTotal?`${pct.toFixed(0)}% ${d<0?'less':'more'} · ${money(Math.abs(d))}/mo`:`${money(t)}/mo estimated`;
    return `<button class="city-card ${id===state.active?'selected':''}" data-city="${id}" aria-pressed="${id===state.active}" aria-label="View ${c.name}: ${money(t)} per month, ${escape(label)}"><span class="city-card-top"><span class="city-name">${c.name}<span class="state-tag">${c.state} / United States</span></span><span class="select-indicator" aria-hidden="true">✓</span></span><span class="city-total">${money(t)}<span class="city-month">/mo</span></span><span class="city-range">${money(t*.85)} – ${money(t*1.15)} scenario range</span><span class="city-change ${d>.5?'higher':Math.abs(d)<.5?'same':''}">${label}</span><span class="city-bar" aria-hidden="true"><span style="width:${currentTotal?Math.min(100,t/currentTotal*100):0}%"></span></span>${Object.hasOwn(state.overrides,id)?'<span class="city-override">Includes your actual rent</span>':''}</button>`;
  }).join('');
  $('estimate-caption').textContent=currentTotal?'Monthly estimates based on your spending. Select a city to explore its breakdown.':'Enter your monthly spending to see personalized city estimates.';
  $('breakdown-title').textContent=`Your spending in ${target.name}`;
  $('current-legend').textContent=city(state.from).name;$('target-legend').textContent=target.name;
  $('from-column').textContent='Now';$('to-column').textContent=target.name;
  const max=Math.max(...Object.values(state.budget),...Object.values(budget),1);
  $('comparison-rows').innerHTML=categories.map(c=>{
    const before=state.budget[c.id],after=budget[c.id],d=after-before;
    return `<div class="comparison-row"><div><div class="category-label">${icon(c)}<span>${c.name}</span></div><div class="bar-pair" aria-hidden="true"><span class="bar-now" style="width:${before/max*100}%"></span><span class="bar-target" style="width:${after/max*100}%"></span></div></div><span class="amount now">${money(before)}</span><span class="amount projected">${money(after)}</span><span class="amount delta ${deltaClass(d)}">${deltaText(d)}</span></div>`;
  }).join('');
  $('table-current').textContent=money(currentTotal);$('table-target').textContent=money(targetTotal);$('table-delta').textContent=deltaText(difference);$('table-delta').className=deltaClass(difference);
  if(!currentTotal){$('annual-title').textContent='Start with your spending.';$('annual-text').textContent='Even a rough monthly budget is enough to explore the possibilities.';}
  else if(Math.abs(difference)<.5){$('annual-title').textContent='A similar budget, a different backdrop.';$('annual-text').textContent='Your estimated monthly spending is about the same.';}
  else{$('annual-title').textContent=difference<0?`${money(Math.abs(difference)*12)} more room in your yearly budget.`:`Plan for ${money(difference*12)} more per year.`;$('annual-text').textContent=`That’s ${money(Math.abs(difference))} ${difference<0?'less':'more'} each month in ${target.name}, assuming the same habits.`;}
  $('rent-city').textContent=target.name;
  if(document.activeElement!==$('rent-override'))$('rent-override').value=state.overrides[state.active]??'';
  $('rent-override').placeholder=`Estimated: ${money(budget.rent)}`;
  $('reset-rent').hidden=!Object.hasOwn(state.overrides,state.active);
  $('context-text').textContent=state.targetHousing==='shared'?`You’re comparing shared housing at ${Math.round(state.factor*100)}% of solo rent per person. Local rents and the number of roommates can change your costs.`:'Your habits stay the same; local prices change. Neighborhoods and your next apartment can make a big difference.';
}

$('budget-inputs').addEventListener('input',event=>{
  const el=event.target;if(!el.dataset.category)return;el.setCustomValidity('');
  if(el.value===''){state.budget[el.dataset.category]=0;el.setCustomValidity('');}
  else if(!el.validity.valid||!Number.isFinite(el.valueAsNumber)){el.setCustomValidity('Enter an amount between $0 and $100,000.');el.reportValidity();return;}
  else{el.setCustomValidity('');state.budget[el.dataset.category]=el.valueAsNumber;}
  state.source='manual';render();
});
$('budget-inputs').addEventListener('focusout',event=>{if(event.target.dataset.category && event.target.value==='')event.target.value='0';});
$('current-city').addEventListener('change',()=>{state.from=$('current-city').value;render();announce(`Current city changed to ${city(state.from).name}. Estimates updated.`);});
$('current-housing').addEventListener('change',()=>{state.currentHousing=$('current-housing').value;render();});
document.querySelectorAll('[data-housing]').forEach(button=>button.addEventListener('click',()=>{
  state.targetHousing=button.dataset.housing;
  document.querySelectorAll('[data-housing]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button?'true':'false');});render();announce('Housing changed. City estimates updated.');
}));
$('city-cards').addEventListener('click',event=>{const card=event.target.closest('[data-city]');if(card){state.active=card.dataset.city;render();announce(`Showing the spending breakdown for ${city(state.active).name}.`);}});
function syncInputs(){categories.forEach(c=>$(`budget-${c.id}`).value=state.budget[c.id]);render();}
$('clear-button').addEventListener('click',()=>{state.budget=Object.fromEntries(categories.map(c=>[c.id,0]));state.overrides={};state.source='manual';syncInputs();announce('All spending amounts cleared.');});
$('example-button').addEventListener('click',()=>{state.budget={...sampleBudget};state.source='example';state.from='nyc';state.currentHousing='alone';$('current-city').value='nyc';$('current-housing').value='alone';state.overrides={};syncInputs();announce('New York example budget loaded.');});
$('manual-button').addEventListener('click',()=>{$('budget-rent').focus();});
$('rent-override').addEventListener('input',()=>{const el=$('rent-override');if(!el.value){delete state.overrides[state.active];el.setCustomValidity('');}else if(!el.validity.valid){el.reportValidity();return;}else state.overrides[state.active]=el.valueAsNumber;render();});
$('reset-rent').addEventListener('click',()=>{delete state.overrides[state.active];$('rent-override').value='';render();});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}}));
for(const id of ['method-button','details-button'])$(id).addEventListener('click',()=>$('method-dialog').showModal());
$('roommate-factor').addEventListener('input',()=>{state.factor=Number($('roommate-factor').value)/100;$('factor-output').textContent=`${Math.round(state.factor*100)}%`;render();});

let draftCities=[];
function renderCityPicker(){
  const q=$('city-search').value.trim().toLowerCase(),filtered=cities.filter(c=>(c.name+' '+c.state).toLowerCase().includes(q));
  $('city-options').innerHTML=filtered.map(c=>`<label class="city-option"><input type="checkbox" value="${c.id}" ${draftCities.includes(c.id)?'checked':''} ${draftCities.length>=3&&!draftCities.includes(c.id)?'disabled':''}><span>${c.name}</span><span class="state">${c.state}</span></label>`).join('')||'<p class="empty-state">No cities match that search.</p>';
  $('selection-count').textContent=`${draftCities.length} of 3 selected`;$('apply-cities').disabled=!draftCities.length;
}
$('choose-button').addEventListener('click',()=>{draftCities=[...state.selected];$('city-search').value='';renderCityPicker();$('cities-dialog').showModal();});
$('city-search').addEventListener('input',renderCityPicker);
$('city-options').addEventListener('change',event=>{const input=event.target;if(input.type!=='checkbox')return;if(input.checked && draftCities.length<3)draftCities.push(input.value);else draftCities=draftCities.filter(id=>id!==input.value);const focusId=input.value;renderCityPicker();$('city-options').querySelector(`input[value="${focusId}"]`)?.focus();});
$('apply-cities').addEventListener('click',()=>{state.selected=[...draftCities];if(!state.selected.includes(state.active))state.active=state.selected[0];$('cities-dialog').close();render();announce('City shortlist updated.');});

let csv=null,transactions=[];
const mappings=['amount-column','description-column','category-column'];
const months=()=>Number($('import-months').value);
function showError(message){$('import-error').textContent=message;$('import-error').hidden=false;}
function updateImportTotal(){
  const valid=Number.isInteger(months())&&months()>=1&&months()<=120&&$('amount-column').value!==$('description-column').value;
  const included=transactions.filter(t=>categories.some(c=>c.id===t.category));
  $('import-total').textContent=valid?`${money(total(aggregate(included,months())))}/mo · ${included.length} included`:'Enter 1–120 complete months';
  $('apply-import').disabled=!valid||!included.length;
}
function renderTransactions(){
  $('review-count').textContent=`${transactions.length} spending rows`;
  const missing=transactions.filter(t=>t.category==='review').length;
  const excluded=transactions.filter(t=>t.category==='exclude').length;
  $('review-note').textContent=`${missing} need a bucket · ${excluded} marked excluded. All rows appear below.`;
  $('transaction-list').innerHTML=transactions.map((t,i)=>`<div class="transaction-row"><span>${escape(t.description)}</span><span class="transaction-amount">${money(t.amount)}</span><select data-transaction="${i}" data-review="${t.category==='review'}" aria-label="Category for ${escape(t.description)}"><option value="review" ${t.category==='review'?'selected':''}>Choose a bucket</option>${categories.map(c=>`<option value="${c.id}" ${t.category===c.id?'selected':''}>${c.name}</option>`).join('')}<option value="exclude" ${t.category==='exclude'?'selected':''}>Exclude</option></select></div>`).join('')||'<p class="empty-state">No spending rows found. Try changing whether spending is positive or negative.</p>';
  updateImportTotal();
}
function rebuildTransactions(){
  if(!csv)return;
  const mapping={amount:Number($('amount-column').value),description:Number($('description-column').value),category:Number($('category-column').value)};
  if(mapping.amount===mapping.description){showError('Choose different columns for amounts and descriptions.');$('apply-import').disabled=true;return;}
  const built=buildTransactions(csv,mapping,$('amount-sign').value);transactions=built.transactions;
  $('import-error').hidden=true;
  if(built.invalid)showError(`${built.invalid} row${built.invalid===1?' has':'s have'} an unreadable amount and will be skipped. Check these in your file before continuing. USD amounts such as 12.50, $12.50, or (12.50) are supported.`);
  renderTransactions();
  $('review-count').textContent+=` · ${built.skipped} non-spending rows skipped`;
}
$('csv-button').addEventListener('click',()=>$('import-dialog').showModal());
$('csv-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  $('import-settings').hidden=true;$('import-error').hidden=true;csv=null;transactions=[];
  if(file.size>2*1024*1024){showError('Choose a CSV smaller than 2 MB.');return;}
  try{
    csv=parseCSV(await file.text());$('upload-label').textContent=file.name;
    const options=csv.headers.map((h,i)=>`<option value="${i}">${escape(h)}</option>`).join('');
    $('amount-column').innerHTML=options;$('description-column').innerHTML=options;$('category-column').innerHTML='<option value="-1">None — guess from description</option>'+options;
    const find=rx=>csv.headers.findIndex(h=>rx.test(h.toLowerCase()));
    const a=find(/amount|debit|withdrawal|cost/),d=find(/description|merchant|payee|memo|name/),c=find(/category|bucket/);
    $('amount-column').value=a>=0?a:csv.headers.length-1;$('description-column').value=d>=0?d:0;$('category-column').value=c;
    const aIndex=Number($('amount-column').value),values=csv.rows.map(r=>parseAmount(r[aIndex])).filter(v=>v!==null);
    $('amount-sign').value=values.filter(v=>v<0).length>values.filter(v=>v>0).length?'negative':'positive';
    $('import-months').value='1';$('import-settings').hidden=false;rebuildTransactions();
  }catch(error){showError(error.message||'This file could not be read. Please try a standard UTF-8 CSV.');}
});
[...mappings,'amount-sign'].forEach(id=>$(id).addEventListener('change',rebuildTransactions));
$('import-months').addEventListener('input',updateImportTotal);
$('transaction-list').addEventListener('change',event=>{const index=event.target.dataset.transaction;if(index===undefined)return;transactions[Number(index)].category=event.target.value;event.target.dataset.review=String(event.target.value==='review');const missing=transactions.filter(t=>t.category==='review').length,excluded=transactions.filter(t=>t.category==='exclude').length;$('review-note').textContent=`${missing} need a bucket · ${excluded} marked excluded. All rows appear below.`;updateImportTotal();});
$('apply-import').addEventListener('click',()=>{if($('apply-import').disabled)return;state.budget=aggregate(transactions,months());state.source='csv';state.overrides={};syncInputs();$('import-dialog').close();announce('Your CSV budget is ready. City estimates updated.');});
$('sample-csv').addEventListener('click',()=>{const contents='date,description,amount,category\n2026-09-01,Apartment rent,2200,rent\n2026-09-03,Groceries,420,groceries\n2026-09-06,"Coffee, takeout and restaurants",380,dining\n2026-09-08,Metro and rideshare,160,transport\n2026-09-10,Utilities and internet,150,utilities\n2026-09-12,Clothing and household shopping,210,shopping\n2026-09-15,Gym and concerts,220,entertainment\n2026-09-20,Subscriptions and insurance,180,fixed\n';const url=URL.createObjectURL(new Blob([contents],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='elsewhere-example.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
render();
