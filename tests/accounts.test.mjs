import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../worker/index.js';
import {passwordHash,passwordMatches} from '../worker/password.js';
import {database} from './d1.mjs';
const origin='https://cityfit.test';
function call(db,path,{method='GET',body,cookie,ip='127.0.0.1',requestOrigin=origin}={}){return api(new Request(origin+path,{method,headers:{'Content-Type':'application/json','Origin':requestOrigin,'CF-Connecting-IP':ip,...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:db});}
test('passwords are salted and reject incorrect passwords',async()=>{const hash=await passwordHash('correct horse battery');assert(!hash.includes('correct horse'));assert(await passwordMatches('correct horse battery',hash));assert(!await passwordMatches('wrong password',hash));assert.notEqual(hash,await passwordHash('correct horse battery'));});
test('signup, login by email and username, account isolation, expiry, logout, and CSRF',async()=>{
  const db=database(),body={username:'Jason.Test',email:'Jason@Test.example',password:'a long test password'};
  const registered=await call(db,'/api/register',{method:'POST',body});assert.equal(registered.status,200);const cookie=registered.headers.get('Set-Cookie');assert(cookie.includes('HttpOnly'));assert(cookie.includes('Secure'));assert(cookie.includes('SameSite=Lax'));
  const me=await call(db,'/api/account',{cookie});assert.equal((await me.json()).user.username,'jason.test');assert.equal((await (await call(db,'/api/account')).json()).user,null);
  assert.equal((await call(db,'/api/merchant-rules')).status,401);
  const rule={merchantName:'RH RESTAURANT',category:'dining'};assert.equal((await call(db,'/api/merchant-rules',{method:'POST',cookie,body:rule})).status,200);
  assert.equal((await call(db,'/api/merchant-rules',{method:'POST',cookie,body:rule,requestOrigin:'https://attacker.test'})).status,403);
  const second=await call(db,'/api/register',{method:'POST',ip:'127.0.0.2',body:{username:'other',email:'other@test.example',password:'another long password'}});assert.equal(second.status,200);const secondCookie=second.headers.get('Set-Cookie');assert.equal((await (await call(db,'/api/merchant-rules',{cookie:secondCookie})).json()).rules.length,0);
  for(const identifier of ['JASON@TEST.EXAMPLE','Jason.Test']){const login=await call(db,'/api/login',{method:'POST',body:{identifier,password:body.password}});assert.equal(login.status,200);assert.notEqual(login.headers.get('Set-Cookie'),cookie);}
  assert.equal((await call(db,'/api/login',{method:'POST',body:{identifier:'Jason.Test',password:'wrong long password'}})).status,401);
  assert.equal((await call(db,'/api/register',{method:'POST',body})).status,409);
  assert.equal((await call(db,'/api/categorize',{method:'POST',cookie,body:{transactions:[]}})).status,503);
  assert.equal((await call(db,'/api/merchant-rules',{method:'DELETE',cookie,body:rule})).status,200);assert.equal((await (await call(db,'/api/merchant-rules',{cookie})).json()).rules.length,0);
  await call(db,'/api/logout',{method:'POST',cookie,body:{}});assert.equal((await (await call(db,'/api/account',{cookie})).json()).user,null);
  db.sqlite.prepare('UPDATE sessions SET expires_at=0').run();assert.equal((await (await call(db,'/api/account',{cookie:secondCookie})).json()).user,null);db.sqlite.close();
});
test('bad credentials, rate limiting, and invalid account input',async()=>{const db=database();assert.equal((await call(db,'/api/register',{method:'POST',body:{username:'x',email:'invalid',password:'short'}})).status,400);for(let i=0;i<10;i++)await call(db,'/api/login',{method:'POST',body:{identifier:'absent',password:'incorrect password'}});assert.equal((await call(db,'/api/login',{method:'POST',body:{identifier:'absent',password:'incorrect password'}})).status,429);db.sqlite.close();});
