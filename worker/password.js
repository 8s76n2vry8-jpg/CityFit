import { scryptAsync } from '@noble/hashes/scrypt.js';
const options={N:32768,r:8,p:3,dkLen:32,maxmem:64*1024*1024};
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
let hashingQueue=Promise.resolve();
export function passwordHash(password,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){
  const job=hashingQueue.then(async()=>{const hash=await scryptAsync(password,salt,options);return `scrypt-v1$${salt}$${hex(hash)}`;});
  hashingQueue=job.catch(()=>{});return job;
}
export async function passwordMatches(password,stored){
  const parts=String(stored).split('$');
  if(parts.length!==3||parts[0]!=='scrypt-v1'||!/^[a-f0-9]{32}$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return false;
  const computed=await passwordHash(password,parts[1]);
  let difference=computed.length^stored.length;
  for(let i=0;i<computed.length;i++)difference|=computed.charCodeAt(i)^(stored.charCodeAt(i)||0);
  return difference===0;
}
export const dummyPasswordHash='scrypt-v1$00000000000000000000000000000000$'+'0'.repeat(64);
