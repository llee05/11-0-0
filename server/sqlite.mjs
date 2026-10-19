import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildSeed, seedStatements, CATALOGUE_FORMAT } from './catalog.mjs';

const root=new URL('../',import.meta.url);
export function openDatabase(filename=process.env.DATABASE_PATH||resolve('.data/catalogue.sqlite')){
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
  const sqlite=new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  sqlite.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
  const migrationDir=new URL('drizzle/',root);
  for(const name of readdirSync(migrationDir).filter(f=>f.endsWith('.sql')).sort()){
    if(sqlite.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name))continue;
    sqlite.exec('BEGIN');
    try{sqlite.exec(readFileSync(new URL(name,migrationDir),'utf8'));sqlite.prepare('INSERT INTO _local_migrations VALUES (?)').run(name);sqlite.exec('COMMIT');}
    catch(error){sqlite.exec('ROLLBACK');sqlite.close();throw error;}
  }
  const dataset=readFileSync(new URL('data/fide-snapshots.json',root),'utf8');
  const federations=readFileSync(new URL('data/federations.json',root),'utf8');
  let historical='null';try{historical=readFileSync(new URL('data/historical-snapshots.json',root),'utf8');}catch{}
  const release=createHash('sha256').update(CATALOGUE_FORMAT+dataset+federations+historical).digest('hex');
  const current=sqlite.prepare("SELECT value FROM catalogue_metadata WHERE key='catalogue'").get();
  if(!current||JSON.parse(current.value).release!==release){
    const seed=buildSeed(JSON.parse(dataset),JSON.parse(federations),JSON.parse(historical));
    sqlite.exec('BEGIN');
    try{for(const {sql,params} of seedStatements(seed,release))sqlite.prepare(sql).run(...params);sqlite.exec('COMMIT');}
    catch(error){sqlite.exec('ROLLBACK');sqlite.close();throw error;}
  }
  return {sqlite,all:async(sql,params=[])=>sqlite.prepare(sql).all(...params),first:async(sql,params=[])=>sqlite.prepare(sql).get(...params),close:()=>sqlite.close()};
}
