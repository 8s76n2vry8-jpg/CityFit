import {cities,categories,sampleBudget} from './data.js';
import {extractPDF,parseStatementLines} from './pdf-import.js?v=amex-section-fix-2';
import {total,estimate,parseCSV,parseAmount,buildTransactions,aggregate} from './model.js';
import {initializeAccount,account,requestJSON} from './account.js';
import {classifyTransaction,flattenTransactions,validSplits,normalizeMerchant,applyAIResult} from './merchant-engine.js';
import {renderTransaction,transactionNeedsReview} from './import-review.js';

const $=id=>document.getElementById(id);
const state={budget:{...sampleBudget},from:'nyc',currentHousing:'alone',targetHousing:'alone',factor:.65,selected:['chicago','austin','seattle'],active:'chicago',overrides:{},source:'example'};
const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const money=n=>currency.format(Math.round(n));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const city=id=>cities.find(c=>c.id===id);
const paths={home:'M3 10 12 3l9 7M5 9v11h14V9M9 20v-7h6v7',basket:'m7 9 5-6 5 6M3 9h18l-2 11H5L3 9ZM9 12v5m6-5v5',coffee:'M4 5h12v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V5Zm12 1h2a3 3 0 0 1 0 6h-2M3 22h16',train:'M7 3h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM5 11h14M8 15h1m6 0h1M8 19l-2 3m10-3 2 3',bolt:'m13 2-9 12h7l-1 8 10-12h-7l0-8',bag:'M5 8h14l1 13H4L5 8ZM8 8V6a4 4 0 0 1 8 0v2',music:'M9 18V5l11-2v13M9 8l11-2M9 18c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Zm11-2c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Z',repeat:'M4 9a8 8 0 0 1 13-5l3 3M20 3v4h-4M20 15a8 8 0 0 1-13 5l-3-3M4 21v-4h4'};
const icon=c=>`<span class="category-icon" style="color:${c.color};background:${c.color}12" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[c.icon]}"/></svg></span>`;
const deltaClass=n=>n<=-0.5?'saving':n>=.5?'more':'neutral';
const deltaText=n=>Math.abs(n)<.5?'—':(n<0?'−':'+')+money(Math.abs(n));
function projected(id){return estimate(state.budget,city(state.from),city(id),state.currentHousing,state.targetHousing,state.factor,state.overrides[id]??null);}
function announce(s){$('live-status').textContent=s;}

$('current-city').innerHTML=cities.map(c=>`<option value="${c.id}">${c.name}, ${c.state}</option>`).join('');
$('budget-inputs').innerHTML=categories.map(c=>`<div class="budget-row">${icon(c)}<label for="budget-${c.id}">${c.name}</label><div class="money-field"><span aria-hidden="true">$</span><input type="number" id="budget-${c.id}" data-category="${c.id}" min="0" max="100000" step="0.01" required value="${state.budget[c.id]}" inputmode="decimal" aria-label="${c.name}, dollars per month"></div></div>`).join('');
let activeCategory='rent';
function mood(difference,current){
  if(!current)return 'Make it yours';
  const ratio=difference/current;
  return ratio<-.2?'More breathing room':ratio<-.05?'A little lighter':ratio>.2?'A bigger stretch':ratio>.05?'A bigger budget':'Similar spending';
}
function directionLabel(difference){return (Math.abs(difference)<.5?'$0':deltaText(difference))+'/mo';}
function renderDonut(){
  const sum=total(state.budget);let start=-90;
  const paths=categories.filter(c=>state.budget[c.id]>0).map(c=>{
    const sweep=state.budget[c.id]/sum*360,end=start+sweep;
    const point=angle=>({x:110+Math.cos(angle*Math.PI/180)*83,y:110+Math.sin(angle*Math.PI/180)*83});
    const s=point(start+Math.min(1.6,sweep/4)),e=point(end-Math.min(1.6,sweep/4));
    const path=sweep>359.99?`<circle cx="110" cy="110" r="83" fill="none" stroke="${c.color}" stroke-width="19"/>`:`<path data-donut-category="${c.id}" d="M ${s.x} ${s.y} A 83 83 0 ${sweep>180?1:0} 1 ${e.x} ${e.y}" fill="none" stroke="${c.color}" stroke-width="19" stroke-linecap="round"/>`;
    start=end;return `<g data-edit="${c.id}" data-tip-title="${c.name}" data-tip-text="${escape(money(state.budget[c.id])+' per month · click to edit')}">${path}</g>`;
  }).join('');
  $('spending-donut').innerHTML=`<circle cx="110" cy="110" r="83" fill="none" stroke="#e9edf5" stroke-width="19"/>${paths}`;
  $('category-chips').innerHTML=categories.map(c=>`<button data-edit="${c.id}" data-tip-title="${c.name}" data-tip-text="${escape(money(state.budget[c.id])+' per month · click to edit')}" aria-label="Edit ${c.name}: ${money(state.budget[c.id])} per month"><i style="background:${c.color}"></i>${c.name}</button>`).join('');
}
function render(){
  const currentTotal=total(state.budget),target=city(state.active),budget=projected(state.active),targetTotal=total(budget),difference=targetTotal-currentTotal;
  $('budget-total').textContent=money(currentTotal);
  $('example-label').hidden=state.source!=='example';
  $('source-note').textContent=state.source==='example'?'An example to explore. Make it yours.':['csv','pdf'].includes(state.source)?'Your imported spending, ready to explore.':'Your spending. Your starting point.';
  renderDonut();
  const maxTotal=Math.max(currentTotal,...state.selected.map(id=>total(projected(id))),1);
  $('city-cards').style.setProperty('--city-count',state.selected.length);
  $('city-cards').innerHTML=state.selected.map(id=>{
    const c=city(id),estimated=projected(id),sum=total(estimated),d=sum-currentTotal;
    const mix=categories.map(cat=>`<i style="background:${cat.color};width:${sum?estimated[cat.id]/sum*100:0}%"></i>`).join('');
    const tip=`${money(sum)} estimated per month · ${Math.abs(d)<.5?'similar to now':money(Math.abs(d))+(d<0?' less':' more')+' than now'}`;
    return `<button class="city-tile ${id===state.active?'selected':''}" data-city="${id}" aria-pressed="${id===state.active}" aria-label="Compare ${c.name}. ${escape(tip)}" data-tip-title="${c.name}" data-tip-text="${escape(tip)}"><span class="tile-location">${c.state} / US<span class="tile-check" aria-hidden="true">${id===state.active?'✓':''}</span></span><span class="tile-city">${c.name}</span><span class="tile-mood">${mood(d,currentTotal)}</span><span class="tile-graph" aria-hidden="true"><span class="tile-bar now" style="width:${currentTotal/maxTotal*100}%"></span><span class="tile-bar projected" style="width:${sum/maxTotal*100}%">${mix}</span></span><span class="tile-footer">${id===state.active?'Comparing below':'Explore this city'}<span aria-hidden="true">${Object.hasOwn(state.overrides,id)?'Rent added':'◌'}</span></span></button>`;
  }).join('');
  $('estimate-caption').textContent=currentTotal?'Choose a city to see how your spending could change.':'Add your spending to start exploring cities.';
  $('breakdown-title').textContent=!currentTotal?`Picture your life in ${target.name}.`:difference<-.5?`A little more room in ${target.name}.`:difference>.5?`Plan a little more for ${target.name}.`:`A familiar budget in ${target.name}.`;
  const largest=categories.reduce((a,c)=>Math.abs(budget[c.id]-state.budget[c.id])>Math.abs(budget[a.id]-state.budget[a.id])?c:a,categories[0]);
  $('comparison-insight').textContent=!currentTotal?'A rough budget is all you need to start.':Math.abs(difference)<.5?'Your spending could stay close to what you know.':`${largest.name} would make the biggest difference. Your habits stay the same.`;
  $('current-legend').textContent=city(state.from).name;$('target-legend').textContent=target.name;
  $('comparison-change-note').textContent=`Estimated monthly change compared with ${city(state.from).name}.`;
  const scale=Math.max(...Object.values(state.budget),...Object.values(budget),1);
  $('category-chart').innerHTML=categories.map(c=>{
    const before=state.budget[c.id],after=budget[c.id],d=after-before;
    return `<button class="chart-category" data-edit="${c.id}" data-tip-title="${c.name}" data-tip-text="${escape(city(state.from).name+': '+money(before)+' · '+target.name+': '+money(after)+' per month')}" aria-label="View and edit ${c.name}. ${money(before)} now, ${money(after)} estimated in ${target.name}."><span class="chart-category-name">${icon(c)}<span>${c.name}</span></span><span class="comparison-tracks" aria-hidden="true"><i class="comparison-now" style="width:${before/scale*100}%"></i><i class="comparison-target" style="width:${after/scale*100}%;background:${c.color}"></i></span><span class="category-direction ${deltaClass(d)}">${directionLabel(d)}</span><span class="chart-edit" aria-hidden="true">+</span></button>`;
  }).join('');
  $('numbers-title').textContent=`Your spending in ${target.name}`;
  $('detail-total').textContent=money(targetTotal);$('detail-change-label').textContent=difference<-.5?'Less than now':difference>.5?'More than now':'Difference';$('detail-change').textContent=money(Math.abs(difference));
  $('detail-range').textContent=`Planning range: ${money(targetTotal*.85)}–${money(targetTotal*1.15)} per month. This ±15% scenario band is not a statistical confidence interval.`;
  $('from-column').textContent=city(state.from).name;$('to-column').textContent=target.name;
  $('comparison-rows').innerHTML=categories.map(c=>`<tr><th scope="row"><button class="table-category" data-edit="${c.id}">${c.name}</button></th><td>${money(state.budget[c.id])}</td><td>${money(budget[c.id])}</td><td class="${deltaClass(budget[c.id]-state.budget[c.id])}">${deltaText(budget[c.id]-state.budget[c.id])}</td></tr>`).join('');
  $('table-current').textContent=money(currentTotal);$('table-target').textContent=money(targetTotal);$('table-delta').textContent=deltaText(difference);$('table-delta').className=deltaClass(difference);
  $('annual-title').textContent=Math.abs(difference)<.5?'A similar yearly budget.':difference<0?`${money(Math.abs(difference)*12)} more room in your yearly budget.`:`Plan for ${money(difference*12)} more per year.`;
  $('annual-text').textContent=`Assuming the same habits in ${target.name}. Moving costs, income changes, and taxes are not included.`;
  $('rent-city').textContent=target.name;
  $('context-text').textContent=state.targetHousing==='shared'?`Shared housing is estimated at ${Math.round(state.factor*100)}% of solo rent per person. Actual neighborhoods and roommates can change your costs.`:'CityFit uses relative city prices. Your actual apartment and transportation choices can change the estimate.';
}
function syncInputs(){categories.forEach(c=>$(`budget-${c.id}`).value=state.budget[c.id]);render();}
function showBudgetEditor(){categories.forEach(c=>$(`budget-${c.id}`).value=state.budget[c.id]);$('budget-dialog').showModal();$('budget-rent').focus();}
function showCategory(id){
  activeCategory=id;const c=categories.find(cat=>cat.id===id),target=city(state.active),estimated=projected(state.active);
  $('category-title').textContent=c.name;$('category-intro').textContent=`Your spending today, compared with an estimate for ${target.name}.`;
  $('category-from-name').textContent=city(state.from).name+' now';$('category-to-name').textContent=target.name+' estimate';$('category-current').textContent=money(state.budget[id]);$('category-projected').textContent=money(estimated[id]);$('category-amount').value=state.budget[id];$('category-price-note').textContent=c.index?`${target.name}’s estimate adjusts your current spending for local prices.`:'This category keeps the same amount across cities.';$('category-rent-link').hidden=id!=='rent';
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('category-chart').querySelector(`[data-edit="${id}"]`)?.focus({preventScroll:true});$('category-dialog').showModal();$('category-amount').focus();
}
function showRent(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('rent-override').value=state.overrides[state.active]??'';$('rent-override').placeholder=`Estimated: ${money(projected(state.active).rent)}`;$('reset-rent').hidden=!Object.hasOwn(state.overrides,state.active);$('rent-dialog').showModal();$('rent-override').focus();}
function showNumbers(){if($('numbers-dialog').open)return;hideTip();const fromCity=!!document.activeElement?.closest('[data-city]');render();if(fromCity)$('city-cards').querySelector(`[data-city="${state.active}"]`)?.focus({preventScroll:true});$('numbers-dialog').showModal();}
function spendingSaved(message){$('budget-save-status').textContent=message;$('budget-save-status').hidden=false;announce(message);}
$('budget-form').addEventListener('submit',event=>{event.preventDefault();const budget={};for(const c of categories){const input=$(`budget-${c.id}`);if(!input.reportValidity())return;budget[c.id]=input.valueAsNumber;}state.budget=budget;state.source='manual';syncInputs();$('budget-dialog').close();spendingSaved('Spending updated. Your city comparisons are ready.');});
$('category-form').addEventListener('submit',event=>{event.preventDefault();const input=$('category-amount');if(!input.reportValidity())return;state.budget[activeCategory]=input.valueAsNumber;state.source='manual';syncInputs();$('category-dialog').close();$('category-chart').querySelector(`[data-edit="${activeCategory}"]`)?.focus({preventScroll:true});spendingSaved('Spending category updated. Your city comparisons are ready.');});
$('rent-form').addEventListener('submit',event=>{event.preventDefault();const input=$('rent-override');if(!input.reportValidity())return;if(input.value==='')delete state.overrides[state.active];else state.overrides[state.active]=input.valueAsNumber;render();$('rent-dialog').close();spendingSaved('Rent updated. Your city comparison now includes your actual rent.');});
$('reset-rent').addEventListener('click',()=>{delete state.overrides[state.active];$('rent-override').value='';$('reset-rent').hidden=true;render();$('rent-override').placeholder=`Estimated: ${money(projected(state.active).rent)}`;});
for(const id of ['manual-button','budget-summary-button'])$(id).addEventListener('click',showBudgetEditor);
for(const id of ['rent-button','category-rent-link'])$(id).addEventListener('click',showRent);
$('numbers-button').addEventListener('click',showNumbers);
$('current-city').addEventListener('change',()=>{state.from=$('current-city').value;render();announce('Current city changed. City comparisons updated.');});
$('current-housing').addEventListener('change',()=>{state.currentHousing=$('current-housing').value;render();});
document.querySelectorAll('[data-housing]').forEach(button=>button.addEventListener('click',()=>{state.targetHousing=button.dataset.housing;document.querySelectorAll('[data-housing]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button?'true':'false');});render();announce('Housing changed. City comparisons updated.');}));
let lastCityClick={id:null,time:0};
$('city-cards').addEventListener('click',event=>{const card=event.target.closest('[data-city]');if(!card)return;const now=performance.now(),id=card.dataset.city;if(lastCityClick.id===id&&now-lastCityClick.time<450){state.active=id;lastCityClick={id:null,time:0};showNumbers();return;}lastCityClick={id,time:now};if(state.active!==id){state.active=id;render();$('city-cards').querySelector(`[data-city="${id}"]`)?.focus({preventScroll:true});}announce(`Comparing your spending in ${city(state.active).name}.`);});
$('city-cards').addEventListener('dblclick',event=>{const card=event.target.closest('[data-city]');if(card){state.active=card.dataset.city;showNumbers();}});
$('clear-button').addEventListener('click',()=>{state.budget=Object.fromEntries(categories.map(c=>[c.id,0]));state.overrides={};state.source='manual';$('budget-save-status').hidden=true;syncInputs();showBudgetEditor();announce('Start with your own monthly spending.');});
$('example-button').addEventListener('click',()=>{state.budget={...sampleBudget};state.source='example';state.from='nyc';state.currentHousing='alone';$('current-city').value='nyc';$('current-housing').value='alone';state.overrides={};$('budget-save-status').hidden=true;syncInputs();announce('New York example loaded.');});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}}));
for(const id of ['method-button','details-button'])$(id).addEventListener('click',()=>$('method-dialog').showModal());
$('roommate-factor').addEventListener('input',()=>{state.factor=Number($('roommate-factor').value)/100;$('factor-output').textContent=`${Math.round(state.factor*100)}%`;render();});
document.addEventListener('click',event=>{const item=event.target.closest('[data-edit]');if(item){hideTip();showCategory(item.dataset.edit);}});
function hideTip(){$('chart-tooltip').hidden=true;}
function showTip(item){
  $('tooltip-title').textContent=item.dataset.tipTitle;$('tooltip-text').textContent=item.dataset.tipText;$('chart-tooltip').hidden=false;
  const box=item.getBoundingClientRect(),tip=$('chart-tooltip').getBoundingClientRect();
  $('chart-tooltip').style.left=`${Math.max(12,Math.min(innerWidth-tip.width-12,box.left+box.width/2-tip.width/2))}px`;
  $('chart-tooltip').style.top=`${box.top>tip.height+18?box.top-tip.height-10:Math.min(innerHeight-tip.height-12,box.bottom+10)}px`;
}
document.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const item=event.target.closest('[data-tip-title]');if(item)showTip(item);});
document.addEventListener('pointerout',event=>{const item=event.target.closest('[data-tip-title]');if(item&&!item.contains(event.relatedTarget))hideTip();});
document.addEventListener('focusin',event=>{const item=event.target.closest('[data-tip-title]');if(item)showTip(item);});
document.addEventListener('focusout',hideTip);document.addEventListener('scroll',hideTip,true);document.addEventListener('keydown',event=>{if(event.key==='Escape')hideTip();});

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

let csv=null,transactions=[],importKind='csv',pdfLines=[],fileRead=false,fileReading=false,merchantRules={},rulesReady=false,correctionSaving=false,aiAvailable=false;

const mappings=['amount-column','description-column','category-column'];
const months=()=>Number($('import-months').value);
function showError(message){$('import-error').textContent=message;$('import-error').hidden=false;}
function updateImportTotal(){
  const valid=Number.isInteger(months())&&months()>=1&&months()<=120&&(importKind==='pdf'||$('amount-column').value!==$('description-column').value);
  const included=flattenTransactions(transactions).filter(t=>categories.some(c=>c.id===t.category));
  const pending=transactions.filter(transactionNeedsReview).length;
  const validRows=transactions.every(t=>t.description.trim()&&Number.isFinite(t.amount)&&t.amount>0&&t.amount<=10000000&&validSplits(t));
  const ready=fileRead&&!fileReading&&valid&&validRows&&included.length&&!pending&&!correctionSaving;
  $('import-total').textContent=!fileRead?'No file read yet':valid&&!pending&&validRows?`${money(total(aggregate(transactions,months())))}/mo · ${included.length} allocations`:'Review your transactions';
  $('apply-import').disabled=!ready||(importKind==='pdf'&&!$('pdf-confirm').checked);
  $('import-save-help').textContent=correctionSaving?'Saving your merchant rule…':fileReading?'Reading your file…':!fileRead?'Choose a readable PDF or CSV to begin.':!valid?'Choose different amount and description columns and enter 1–120 complete months.':!validRows?'Check descriptions, amounts, and split totals.':pending?`Review ${pending} transaction${pending===1?'':'s'} before saving. Confirm suggestions or choose categories.`:!included.length?'Assign a spending category to at least one transaction.':importKind==='pdf'&&!$('pdf-confirm').checked?'Check your PDF against the statement, then confirm below.':'Ready to save your reviewed spending.';
}
function updateReviewNote(){
  const pending=transactions.filter(transactionNeedsReview).length,excluded=transactions.filter(t=>t.category==='exclude').length;
  $('review-note').textContent=`${pending} need review · ${excluded} excluded · ${Object.keys(merchantRules).length} saved merchant rules`;
}
function renderTransactions(){
  $('review-count').textContent=`${transactions.length} transactions`;
  updateReviewNote();
  $('transaction-list').innerHTML=transactions.map(renderTransaction).join('')||'<p class="empty-state">No spending rows found. Check the amount settings or add a missing PDF transaction.</p>';
  $('ai-review-button').disabled=!aiAvailable||!transactions.some(t=>t.confidence<90&&!t.reviewed&&!t.credit&&!t.mixed);
  updateImportTotal();
}
function renderSavedRules(){
  $('saved-merchant-rules').innerHTML=Object.entries(merchantRules).map(([key,r])=>`<div class="saved-rule"><span>${escape(r.merchant_name||r.merchantName||key)} · ${r.category==='exclude'?'Excluded':escape(categories.find(c=>c.id===r.category)?.name||r.category)}</span><button class="text-button" type="button" data-forget-rule="${escape(key)}">Forget</button></div>`).join('')||'<p class="small-copy">Your category corrections will appear here.</p>';
}
async function loadMerchantRules(){
  const owner=account()?.id;rulesReady=false;
  try{const data=await requestJSON('/api/merchant-rules');if(account()?.id!==owner)return;merchantRules=Object.fromEntries(data.rules.map(r=>[r.merchant_key,r]));rulesReady=true;$('merchant-save-status').textContent='Your saved merchant rules are loaded.';}
  catch(error){if(account()?.id!==owner)return;merchantRules={};$('merchant-save-status').textContent='Saved rules could not be loaded. You can review this upload manually. '+error.message;}
  renderSavedRules();
}
async function saveMerchantCorrection(t){
  if(!t.remember||t.category==='review'||t.splits||t.credit)return;
  const owner=account()?.id;correctionSaving=true;updateImportTotal();
  try{await requestJSON('/api/merchant-rules',{method:'POST',body:JSON.stringify({merchantName:t.merchantName,category:t.category})});if(account()?.id!==owner)return;merchantRules[t.key]={merchant_name:t.merchantName,category:t.category};
    for(const other of transactions)if(other!==t&&other.key===t.key&&!other.splits&&!other.credit){Object.assign(other,classifyTransaction(other,{rules:merchantRules}),{reviewed:true});}
    $('merchant-save-status').textContent=`Remembered ${t.merchantName} as ${t.category==='exclude'?'excluded':categories.find(c=>c.id===t.category)?.name}. Future uploads will use this rule.`;
  }catch(error){$('merchant-save-status').textContent='This category is applied to the current upload, but the rule was not saved. '+error.message;}
  finally{correctionSaving=false;if(account()?.id===owner){renderSavedRules();renderTransactions();}}
}
$('saved-merchant-rules').addEventListener('click',async event=>{
  const button=event.target.closest('[data-forget-rule]');if(!button)return;const key=button.dataset.forgetRule,r=merchantRules[key];button.disabled=true;
  try{await requestJSON('/api/merchant-rules',{method:'DELETE',body:JSON.stringify({merchantName:r.merchant_name||r.merchantName||key})});delete merchantRules[key];renderSavedRules();$('merchant-save-status').textContent='Rule forgotten. Future uploads will use merchant matching again.';updateReviewNote();}
  catch(error){button.disabled=false;$('merchant-save-status').textContent=error.message;}
});
function rebuildTransactions(){
  if(!csv)return;
  const find=rx=>csv.headers.findIndex(h=>rx.test(h));
  const mapping={amount:Number($('amount-column').value),description:Number($('description-column').value),category:Number($('category-column').value),date:find(/^(?:date|transaction date|posted date)$/i),mcc:find(/^(?:mcc|merchant category code)$/i),merchant:find(/^(?:clean merchant|merchant name)$/i),location:find(/^(?:location|city)$/i)};
  if(mapping.amount===mapping.description){showError('Choose different columns for amounts and descriptions.');$('apply-import').disabled=true;return;}
  const built=buildTransactions(csv,mapping,$('amount-sign').value,{rules:merchantRules});transactions=built.transactions;
  $('import-error').hidden=true;
  if(built.invalid)showError(`${built.invalid} row${built.invalid===1?' has':'s have'} an unreadable amount and will be skipped. Check these in your file before continuing. USD amounts such as 12.50, $12.50, or (12.50) are supported.`);
  renderTransactions();$('review-count').textContent+=` · ${built.skipped} non-spending rows skipped`;
}
function rebuildPDF(){
  transactions=parseStatementLines(pdfLines,$('pdf-amount-position').value,$('pdf-negative-meaning').value,{rules:merchantRules}).transactions;
  $('pdf-confirm').checked=false;renderTransactions();
}
$('csv-button').addEventListener('click',async()=>{if(!account())return;$('import-dialog').showModal();$('choose-upload').disabled=true;await loadMerchantRules();$('choose-upload').disabled=false;});
$('choose-upload').addEventListener('click',()=>$('csv-file').click());
$('csv-file').addEventListener('change',async event=>{
  const uploadInput=event.target,file=uploadInput.files?.[0];if(!file)return;
  $('import-settings').hidden=true;$('import-error').hidden=true;$('import-progress').hidden=true;$('file-read-status').hidden=true;$('pdf-confirm-label').hidden=true;$('pdf-confirm').checked=false;csv=null;transactions=[];pdfLines=[];fileRead=false;fileReading=false;updateImportTotal();
  importKind=/\.pdf$/i.test(file.name)||file.type==='application/pdf'?'pdf':'csv';
  const max=importKind==='pdf'?10:2;
  if(file.size>max*1024*1024){showError(`Choose a ${importKind.toUpperCase()} smaller than ${max} MB.`);uploadInput.value='';return;}
  if(!/\.(?:csv|pdf)$/i.test(file.name)&&!['application/pdf','text/csv'].includes(file.type)){showError('Please choose a PDF statement or CSV file.');uploadInput.value='';return;}
  $('upload-label').textContent=file.name;uploadInput.disabled=true;$('choose-upload').disabled=true;fileReading=true;updateImportTotal();
  try{
    $('csv-mapping').hidden=importKind==='pdf';$('pdf-settings').hidden=importKind!=='pdf';$('add-pdf-row').hidden=importKind!=='pdf';$('pdf-confirm').checked=false;$('import-months').value='1';
    if(importKind==='pdf'){
      $('import-progress').hidden=false;$('import-progress').textContent='Opening PDF…';
      const result=await extractPDF(file,message=>{$('import-progress').textContent=message;});
      pdfLines=result.lines;$('pdf-raw-text').textContent=pdfLines.map(l=>`[Page ${l.page}] ${l.text}`).join('\n');
      $('pdf-amount-position').value='first';$('pdf-negative-meaning').value='credit';
      fileRead=true;$('import-settings').hidden=false;$('pdf-confirm-label').hidden=false;rebuildPDF();
      $('import-progress').hidden=true;$('file-read-status').hidden=false;
      $('file-read-status').textContent=`PDF read successfully: ${file.name}. ${result.pages} page${result.pages===1?'':'s'} read; ${transactions.length} transaction${transactions.length===1?'':'s'} detected. ${transactions.length?'Review them, then save to your budget.':'No dated transactions were identified. Add them manually from the extracted text.'}`;
    }else{
      csv=parseCSV(await file.text());
      const options=csv.headers.map((h,i)=>`<option value="${i}">${escape(h)}</option>`).join('');
      $('amount-column').innerHTML=options;$('description-column').innerHTML=options;$('category-column').innerHTML='<option value="-1">None — guess from description</option>'+options;
      const find=rx=>csv.headers.findIndex(h=>rx.test(h.toLowerCase()));
      const a=find(/amount|debit|withdrawal|cost/),d=find(/description|merchant|payee|memo|name/),c=find(/category|bucket/);
      $('amount-column').value=a>=0?a:csv.headers.length-1;$('description-column').value=d>=0?d:0;$('category-column').value=c;
      const aIndex=Number($('amount-column').value),values=csv.rows.map(r=>parseAmount(r[aIndex])).filter(v=>v!==null);
      $('amount-sign').value=values.filter(v=>v<0).length>values.filter(v=>v>0).length?'negative':'positive';
      fileRead=true;$('import-settings').hidden=false;rebuildTransactions();
      $('file-read-status').hidden=false;$('file-read-status').textContent=`CSV read successfully: ${file.name}. ${csv.rows.length} row${csv.rows.length===1?'':'s'} read; ${transactions.length} spending transaction${transactions.length===1?'':'s'} found. Review the spending categories, then save to your budget.`;
    }
  }catch(error){console.error('File import failed:',error);fileRead=false;showError(error instanceof TypeError?'The PDF reader could not start in this browser. Refresh the page and try again. If this continues, use a CSV export.':error.message||'This file could not be read. Please try another statement or a CSV export.');$('import-progress').hidden=true;$('file-read-status').hidden=true;$('import-settings').hidden=true;$('pdf-confirm-label').hidden=true;}
  finally{uploadInput.disabled=false;uploadInput.value='';$('choose-upload').disabled=false;fileReading=false;updateImportTotal();}
});
[...mappings,'amount-sign'].forEach(id=>$(id).addEventListener('change',rebuildTransactions));
['pdf-amount-position','pdf-negative-meaning'].forEach(id=>$(id).addEventListener('change',rebuildPDF));
$('pdf-confirm').addEventListener('change',updateImportTotal);
$('import-months').addEventListener('input',updateImportTotal);
$('transaction-list').addEventListener('change',async event=>{
  const el=event.target;
  if(el.dataset.remember!==undefined){transactions[Number(el.dataset.remember)].remember=el.checked;return;}
  if(el.dataset.transaction!==undefined){const t=transactions[Number(el.dataset.transaction)];t.category=el.value;t.confidence=100;t.status=el.value==='review'?'needs-category':'automatic';t.source='manual';t.reason='Category chosen by you.';t.reviewed=el.value!=='review';t.remember=$('transaction-list').querySelector(`[data-remember="${el.dataset.transaction}"]`)?.checked;renderTransactions();await saveMerchantCorrection(t);}
  else if(el.dataset.splitCategory!==undefined){const t=transactions[Number(el.dataset.splitCategory)];t.splits[Number(el.dataset.part)].category=el.value;t.reviewed=true;renderTransactions();}
  else if(el.dataset.description!==undefined){const t=transactions[Number(el.dataset.description)],original=t.originalDescriptor;t.description=el.value;delete t.splits;Object.assign(t,classifyTransaction({...t,originalDescriptor:t.description,merchantName:''},{rules:merchantRules}),{reviewed:false,originalDescriptor:original});renderTransactions();}
  if(importKind==='pdf')$('pdf-confirm').checked=false;updateImportTotal();
});
$('transaction-list').addEventListener('input',event=>{
  const el=event.target;
  if(el.dataset.amount!==undefined)transactions[Number(el.dataset.amount)].amount=el.valueAsNumber;
  else if(el.dataset.splitAmount!==undefined){const t=transactions[Number(el.dataset.splitAmount)];t.splits[Number(el.dataset.part)].amount=el.valueAsNumber;const line=el.closest('.split-lines'),sum=t.splits.reduce((s,p)=>s+(Number(p.amount)||0),0);line.querySelector('.split-total').textContent=`Split total $${sum.toFixed(2)} / $${t.amount.toFixed(2)}${validSplits(t)?' · balanced':' · must match the charge'}`;line.querySelector('.split-total').className='split-total '+(validSplits(t)?'saving':'more');}
  else return;
  $('pdf-confirm').checked=false;updateReviewNote();updateImportTotal();
});
$('transaction-list').addEventListener('click',async event=>{
  const el=event.target.closest('button');if(!el)return;
  let t;
  if(el.dataset.approve!==undefined){t=transactions[Number(el.dataset.approve)];t.reviewed=true;t.remember=$('transaction-list').querySelector(`[data-remember="${el.dataset.approve}"]`)?.checked;renderTransactions();await saveMerchantCorrection(t);}
  if(el.dataset.split!==undefined){t=transactions[Number(el.dataset.split)];const cents=Math.round(t.amount*100);if(cents<2){showError('A split needs at least two cents.');return;}t.splits=[{category:'review',amount:Math.floor(cents/2)/100},{category:'review',amount:(cents-Math.floor(cents/2))/100}];t.reviewed=true;t.source='manual';t.remember=false;}
  if(el.dataset.addSplit!==undefined){t=transactions[Number(el.dataset.addSplit)];t.splits.push({category:'review',amount:0});}
  if(el.dataset.removeSplit!==undefined){t=transactions[Number(el.dataset.removeSplit)];if(t.splits.length>2)t.splits.splice(Number(el.dataset.part),1);}
  if(el.dataset.cancelSplit!==undefined){t=transactions[Number(el.dataset.cancelSplit)];delete t.splits;Object.assign(t,classifyTransaction(t,{rules:merchantRules}),{reviewed:false});}
  if(t){$('pdf-confirm').checked=false;renderTransactions();}
});
$('ai-review-button').addEventListener('click',async()=>{
  const pending=transactions.filter(t=>t.confidence<90&&!t.reviewed&&!t.credit&&!t.mixed).slice(0,25);if(!pending.length)return;
  $('ai-review-button').disabled=true;fileReading=true;updateImportTotal();
  try{const payload={transactions:pending.map(t=>({description:t.description,originalDescriptor:t.originalDescriptor,amount:t.amount,date:t.date,location:t.location}))};const data=await requestJSON('/api/categorize',{method:'POST',body:JSON.stringify(payload)});for(const result of data.results){const t=pending[result.id];if(t)Object.assign(t,applyAIResult(t,result));}$('merchant-save-status').textContent='AI suggestions are ready. Check any rows marked for review.';}
  catch(error){$('merchant-save-status').textContent=error.message;}
  finally{fileReading=false;renderTransactions();}
});
$('add-pdf-row').addEventListener('click',()=>{
  if(transactions.length>=10000){showError('Please import at most 10,000 transactions.');return;}
  transactions.push({description:'',amount:0,...classifyTransaction({description:''})});$('pdf-confirm').checked=false;renderTransactions();
  const last=$('transaction-list').lastElementChild;last.scrollIntoView({block:'nearest'});last.querySelector('input').focus();
});
$('apply-import').addEventListener('click',()=>{if($('apply-import').disabled)return;state.budget=aggregate(transactions,months());state.source=importKind;state.overrides={};syncInputs();$('import-dialog').close();const count=transactions.filter(t=>flattenTransactions([t]).some(p=>categories.some(c=>c.id===p.category))).length;$('budget-save-status').textContent=`Saved to your budget: ${count} transaction${count===1?'':'s'}, ${money(total(state.budget))} per month. Your CityFit comparisons are updated.`;$('budget-save-status').hidden=false;$('budget-save-status').scrollIntoView({block:'nearest',behavior:'smooth'});announce(`Your ${importKind.toUpperCase()} budget was saved. City estimates updated.`);});
$('sample-csv').addEventListener('click',()=>{const contents='date,description,amount,category\n2026-09-01,Apartment rent,2200,rent\n2026-09-03,Groceries,420,groceries\n2026-09-06,"Coffee, takeout and restaurants",380,dining\n2026-09-08,Metro and rideshare,160,transport\n2026-09-10,Utilities and internet,150,utilities\n2026-09-12,Clothing and household shopping,210,shopping\n2026-09-15,Concerts,140,entertainment\n2026-09-16,Gym,80,health\n2026-09-20,Subscriptions,100,subscriptions\n2026-09-21,Insurance,80,insurance\n';const url=URL.createObjectURL(new Blob([contents],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='cityfit-example.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.addEventListener('cityfit-account',async event=>{
  state.budget={...sampleBudget};state.from='nyc';state.currentHousing='alone';state.targetHousing='alone';state.overrides={};state.source='example';merchantRules={};transactions=[];csv=null;pdfLines=[];fileRead=false;$('budget-save-status').hidden=true;syncInputs();
  $('current-city').value='nyc';$('current-housing').value='alone';document.querySelectorAll('[data-housing]').forEach(b=>{b.classList.toggle('active',b.dataset.housing==='alone');b.setAttribute('aria-pressed',b.dataset.housing==='alone'?'true':'false');});$('import-settings').hidden=true;$('file-read-status').hidden=true;$('pdf-raw-text').textContent='';$('transaction-list').innerHTML='';$('upload-label').textContent='Choose a PDF or CSV';
  if(event.detail){await loadMerchantRules();try{const data=await requestJSON('/api/account');aiAvailable=data.aiAvailable;}catch{aiAvailable=false;}$('ai-review-info').textContent=aiAvailable?'AI assistance can suggest categories for unclear merchants. Only these transaction details are sent for AI review.':'AI assistance is not connected yet. Unknown merchants need your choice.';}else{aiAvailable=false;document.querySelectorAll('dialog[open]').forEach(d=>d.close());renderSavedRules();}
});
render();initializeAccount();
