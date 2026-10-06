import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTransaction,normalizeMerchant,confidenceStatus,applyAIResult,validSplits} from '../dist/merchant-engine.js';
import {parseCSV,buildTransactions,aggregate,total} from '../dist/model.js';
import {parseStatementLines,textItemsToLines} from '../dist/pdf-import.js';
import {renderTransaction,transactionNeedsReview} from '../dist/import-review.js';

test('normalizes processors, store numbers, locations, and merchant variants without losing raw text',()=>{
  for(const [raw,name,category] of [['SQ *BLUE BOTTLE COF 1234','Blue Bottle Coffee','dining'],['TST*ABC KITCHEN NYC','ABC Kitchen','dining'],['WHOLEFDS10094 NASHVILLE TN','Whole Foods','groceries'],['UBER *TRIP','Uber','transport'],['UBER BV','Uber','transport'],['UBER *TRIP HELP.UBER.COM','Uber','transport'],['DELTA 0062345234567','Delta Air Lines','travel'],['NETFLIX.COM','Netflix','entertainment'],['Chipotle #2002','Chipotle','dining']]){
    const result=classifyTransaction({description:raw});assert.equal(result.merchantName,name,raw);assert.equal(result.category,category,raw);assert.equal(result.originalDescriptor,raw);assert(result.confidence>=90);
  }
});
test('avoids false matches, detects fuzzy variants, and keeps mixed stores unresolved',()=>{
  assert.equal(classifyTransaction({description:'Delta Dental'}).category,'insurance');assert.equal(classifyTransaction({description:'Uber Eats'}).category,'dining');
  const typo=classifyTransaction({description:'Chipotlw'});assert.equal(typo.category,'dining');assert.equal(typo.status,'suggested');
  for(const name of ['WM SUPERCENTER','Target','Amazon','CVS','Costco']){const t=classifyTransaction({description:name});assert.equal(t.category,'review');assert(t.mixed);}
  assert.equal(classifyTransaction({description:'UBERSOME DIFFERENT COMPANY'}).category,'review');assert.equal(normalizeMerchant('7 ELEVEN').key,'7 ELEVEN');
});
test('personal rules beat defaults and MCC enrichment respects review thresholds',()=>{
  const t=classifyTransaction({description:'RH RESTAURANT 8432'},{rules:{'RH RESTAURANT':{category:'shopping',merchant_name:'RH Restaurant'}}});assert.equal(t.category,'shopping');assert.equal(t.source,'personal');
  assert.equal(classifyTransaction({description:'Unfamiliar business',mcc:'5812'}).category,'dining');assert.equal(classifyTransaction({description:'Unfamiliar business',mcc:'5311'}).category,'review');
  assert.deepEqual([69,70,89,90].map(confidenceStatus),['needs-category','suggested','suggested','automatic']);
});
test('AI validation leaves known merchants, mixed stores, and credits unchanged',()=>{
  const unknown=classifyTransaction({description:'XYZ'});assert.equal(applyAIResult(unknown,{category:'dining',confidence:96}).source,'ai');assert.equal(applyAIResult(unknown,{category:'dining',confidence:65}).category,'review');assert.equal(applyAIResult(unknown,{category:'nonsense',confidence:100}),unknown);
  for(const t of [classifyTransaction({description:'Netflix'}),classifyTransaction({description:'Walmart'}),classifyTransaction({description:'Netflix',credit:true})])assert.equal(applyAIResult(t,{category:'dining',confidence:99}),t);
});
test('CSV and PDF use the same categories and keep dates, credit exclusions, and original descriptors',()=>{
  const csv=parseCSV('date,description,amount,mcc\n2026-09-01,SQ *BLUE BOTTLE COF 1847,8.74,5812\n2026-09-02,UBER BV,10.00,4121\n');
  const built=buildTransactions(csv,{date:0,description:1,amount:2,category:-1,mcc:3});assert.equal(built.transactions[0].category,'dining');assert.equal(built.transactions[0].date,'2026-09-01');assert.equal(total(aggregate(built.transactions,1)),18.74);
  const pdf=parseStatementLines([{page:1,text:'Purchases'},{page:1,text:'09/01 SQ *BLUE BOTTLE COF 1847 8.74'},{page:1,text:'09/02 UBER BV 10.00'},{page:1,text:'Payments and credits'},{page:1,text:'09/03 NETFLIX 15.99 CR'}]);
  assert.deepEqual(pdf.transactions.map(t=>t.category),['dining','transport','exclude']);assert.equal(pdf.transactions[0].originalDescriptor,'SQ *BLUE BOTTLE COF 1847');assert.equal(total(aggregate(pdf.transactions,1)),18.74);
  const coords=textItemsToLines([{str:'UBER',transform:[1,0,0,1,90,100],height:10},{str:'09/01',transform:[1,0,0,1,0,100],height:10},{str:'10.00',transform:[1,0,0,1,200,100],height:10}]);assert.equal(coords[0].text,'09/01 UBER 10.00');
});
test('Amex New Charges switches back to spending and dated statement prose is ignored',()=>{
  const parsed=parseStatementLines([
    {page:2,text:'Payments and Credits'},
    {page:2,text:'07/18/26* AUTOPAY PAYMENT RECEIVED - THANK YOU -$3,984.14'},
    {page:3,text:'New Charges'},
    {page:3,text:'08/06/26 Uber Trip help.uber.com CA $9.69'},
    {page:8,text:'09/18/26. This Date May Not Be The Same Date Your Bank Will Debit Your Pay Over Time Limit $15,000.00'}
  ]);
  assert.deepEqual(parsed.transactions.map(x=>x.category),['exclude','transport']);
  assert.equal(parsed.transactions.some(x=>x.amount===15000),false);
});
test('splits conserve cents, average correctly, and block unbalanced or unassigned purchases',()=>{
  const t={description:'Target',amount:30.01,category:'review',splits:[{category:'groceries',amount:10.01},{category:'shopping',amount:20}]};assert(validSplits(t));const budget=aggregate([t],2);assert.equal(budget.groceries,5.01);assert.equal(budget.shopping,10);
  t.splits[1].amount=19.99;assert(!validSplits(t));assert.throws(()=>aggregate([t],1));assert.throws(()=>aggregate([{description:'X',amount:3,category:'review'}],1));assert.throws(()=>aggregate([],0));
});
test('review markup preserves cents and escapes merchant and statement text',()=>{
  const t={description:'<script>alert(1)</script>',originalDescriptor:'<img src=x onerror=alert(1)>',merchantName:'A & B',amount:8.74,...classifyTransaction({description:'XYZ'})};t.merchantName='A & B';const html=renderTransaction(t,0);assert(html.includes('$8.74'));assert(!html.includes('<img'));assert(html.includes('A &amp; B'));assert(transactionNeedsReview(t));
});
