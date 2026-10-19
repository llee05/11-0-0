import { readFileSync, writeFileSync, cpSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildSeed, CATALOGUE_FORMAT } from '../server/catalog.mjs';

// Keep maintained dist/*.js and artwork intact. Framework output is built in
// backend/dist and copied only into the generated dist/server and dist/client.
const root=new URL('../',import.meta.url),backend=new URL('backend/',root);
const dataset=readFileSync(new URL('data/fide-snapshots.json',root),'utf8');
const federations=readFileSync(new URL('data/federations.json',root),'utf8');
let historic='null';try{historic=readFileSync(new URL('data/historical-snapshots.json',root),'utf8');}catch{}
const release=createHash('sha256').update(CATALOGUE_FORMAT+dataset+federations+historic).digest('hex');
writeFileSync(new URL('catalogue-seed.json',backend),JSON.stringify({release,data:buildSeed(JSON.parse(dataset),JSON.parse(federations),JSON.parse(historic))}));
const manifest=JSON.parse(readFileSync(new URL('.openai/hosting.json',root),'utf8'));
delete manifest.static;manifest.d1='DB';manifest.r2=null;
writeFileSync(new URL('.openai/hosting.json',backend),JSON.stringify(manifest,null,2)+'\n');
mkdirSync(new URL('public/',backend),{recursive:true});
for(const entry of readdirSync(new URL('dist/',root),{withFileTypes:true})){
  if(['server','client','.openai','index.html'].includes(entry.name))continue;
  cpSync(new URL(`dist/${entry.name}`,root),new URL(`public/${entry.name}`,backend),{recursive:true});
}
const result=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{cwd:backend,stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
for(const name of ['server','client','.openai'])cpSync(new URL(`dist/${name}`,backend),new URL(`dist/${name}`,root),{recursive:true});
cpSync(new URL('drizzle/',root),new URL('dist/.openai/drizzle/',root),{recursive:true});
console.log('Hosted build complete. Maintained browser source preserved.');
