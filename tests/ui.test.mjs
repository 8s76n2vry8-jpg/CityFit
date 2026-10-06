import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {api} from '../worker/index.js';
import {database} from './d1.mjs';

test('account gate, CSV review, split editing, saved corrections, and logout work together',async()=>{
  const {window,document}=parseHTML(fs.readFileSync('dist/index.html','utf8'));
  Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return Array.from(this.options).find(o=>o.hasAttribute('selected'))?.value||this.options[0]?.value||'';},set(value){for(const option of this.options)option.toggleAttribute('selected',option.value===String(value));},configurable:true});
  Object.defineProperty(window.HTMLInputElement.prototype,'valueAsNumber',{get(){return this.value===''?NaN:Number(this.value);},configurable:true});
  Object.defineProperty(window.HTMLInputElement.prototype,'checked',{get(){return this.hasAttribute('checked');},set(value){this.toggleAttribute('checked',!!value);},configurable:true});
  for(const dialog of document.querySelectorAll('dialog')){dialog.showModal=()=>{dialog.open=true;dialog.setAttribute('open','');};dialog.close=()=>{dialog.open=false;dialog.removeAttribute('open');};}
  window.HTMLElement.prototype.scrollIntoView=()=>{};
  for(const form of document.querySelectorAll('form'))form.reset=()=>{for(const el of form.querySelectorAll('input'))el.value='';};
  const db=database();let cookie='';
  globalThis.document=document;globalThis.CustomEvent=window.CustomEvent;globalThis.innerWidth=1200;globalThis.innerHeight=900;
  globalThis.fetch=async(path,options={})=>{const response=await api(new Request('https://cityfit.test'+path,{method:options.method||'GET',headers:{'Content-Type':'application/json','Origin':'https://cityfit.test','CF-Connecting-IP':'ui-test',Cookie:cookie},...(options.body?{body:options.body}:{})}),{DB:db});if(response.headers.has('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];return response;};
  const $=id=>document.getElementById(id),click=el=>el.dispatchEvent(new window.Event('click',{bubbles:true})),change=el=>el.dispatchEvent(new window.Event('change',{bubbles:true})),input=el=>el.dispatchEvent(new window.Event('input',{bubbles:true}));
  async function until(check){const start=Date.now();while(!check()){if(Date.now()-start>15000)throw new Error('Timed out waiting for UI. '+$('auth-error').textContent+' '+$('import-error').textContent);await new Promise(resolve=>setTimeout(resolve,20));}}
  await import('../dist/app.js');await until(()=>$('auth-form').hidden===false);assert($('main').hidden);
  click($('auth-toggle'));$('auth-username').value='ui-user';$('auth-identifier').value='ui@test.example';$('auth-password').value='a long UI test password';$('auth-password-confirm').value='a long UI test password';$('auth-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>$('main').hidden===false);await until(()=>$('merchant-save-status').textContent.includes('loaded'));assert.equal($('account-name').textContent,'ui-user');
  click($('csv-button'));await until(()=>$('choose-upload').disabled===false);
  const csv='date,description,amount\n2026-09-01,SQ *BLUE BOTTLE COF 1847,8.74\n2026-09-02,WM SUPERCENTER,30.01\n2026-09-03,Chipotlw,20.00\n2026-09-04,MY UNKNOWN MERCHANT,11.25\n';
  Object.defineProperty($('csv-file'),'files',{value:[{name:'charges.csv',type:'text/csv',size:csv.length,text:async()=>csv}],configurable:true});change($('csv-file'));
  await until(()=>document.querySelectorAll('.merchant-row').length===4);assert($('transaction-list').textContent.includes('Blue Bottle Coffee'));assert($('transaction-list').textContent.includes('$8.74'));assert($('apply-import').disabled);
  click(document.querySelector('[data-split="1"]'));assert.equal(document.querySelectorAll('[data-split-amount="1"]').length,2);
  assert($('apply-import').disabled);const firstCategory=document.querySelector('[data-split-category="1"][data-part="0"]');firstCategory.value='groceries';change(firstCategory);const secondCategory=document.querySelector('[data-split-category="1"][data-part="1"]');secondCategory.value='shopping';change(secondCategory);
  const splitAmount=document.querySelector('[data-split-amount="1"][data-part="0"]');splitAmount.value='10.01';input(splitAmount);const second=document.querySelector('[data-split-amount="1"][data-part="1"]');second.value='20';input(second);
  click(document.querySelector('[data-approve="2"]'));await until(()=>$('merchant-save-status').textContent.includes('Remembered Chipotle'));
  const unknown=document.querySelector('[data-transaction="3"]');unknown.value='dining';change(unknown);await until(()=>$('merchant-save-status').textContent.includes('Remembered My Unknown Merchant'));
  assert.equal($('apply-import').disabled,false);click($('apply-import'));assert($('budget-save-status').textContent.includes('Saved to your budget: 4 transactions'));assert($('budget-save-status').textContent.includes('$70'));
  const rules=await (await globalThis.fetch('/api/merchant-rules')).json();assert.equal(rules.rules.length,2);assert(rules.rules.some(r=>r.merchant_key==='MY UNKNOWN MERCHANT'&&r.category==='dining'));
  click($('account-logout'));await until(()=>$('main').hidden);assert($('account-gate').hidden===false);assert.equal($('transaction-list').innerHTML,'');assert.equal((await (await globalThis.fetch('/api/account')).json()).user,null);db.sqlite.close();
});
