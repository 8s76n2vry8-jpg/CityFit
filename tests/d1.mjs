import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
export function database(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
  for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
  return {sqlite,prepare(sql){const statement=sqlite.prepare(sql);let values=[];const query={bind(...parameters){values=parameters;return query;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){return statement.run(...values);}};return query;},async batch(queries){sqlite.exec('BEGIN');try{const result=[];for(const q of queries)result.push(await q.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
}
