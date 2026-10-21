import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,relative,resolve} from 'node:path';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';

const root=new URL('../',import.meta.url),output=new URL('release/cloudflare/',root);
const assets=['app.js','engine.js','tournament-rules.js','rating-rules.js','traits.js','player-profile.js','run-history.js','tournament-story.js','styles.css','favicon.svg','king.svg','knight.svg',
  'fonts/manrope.ttf','fonts/manrope-LICENSE.txt','fonts/dm-sans.ttf','fonts/dm-sans-LICENSE.txt'];
const files=()=>readdirSync(output,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>relative(fileURLToPath(output),join(entry.parentPath,entry.name)).split('\\').join('/')).sort();
const run=(command,args)=>execFileSync(command,args,{cwd:fileURLToPath(root),stdio:'pipe'});
const build=()=>run(process.execPath,['scripts/build-cloudflare.mjs']);
const zip=()=>run('python3',['-B','scripts/package-cloudflare.py']);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

test('Cloudflare release and upload archive preserve the SQL catalogue, source and isolated hosting configuration',async()=>{
  const sourceNames=['dist/index.html',...assets.map(name=>`dist/${name}`),'.openai/hosting.json','backend/vite.config.ts'];
  const before=new Map(sourceNames.map(name=>[name,readFileSync(new URL(name,root))]));
  const config=JSON.parse(readFileSync(new URL('cloudflare/wrangler.json',root),'utf8'));
  assert.equal(resolve(fileURLToPath(new URL('cloudflare/',root)),config.pages_build_output_dir),fileURLToPath(output).replace(/\/$/,''));
  assert.deepEqual(Object.keys(config).sort(),['compatibility_date','name','pages_build_output_dir']);
  build();
  assert.deepEqual(files(),['_headers','404.html','catalog.json','index.html',...assets].sort());
  for(const name of assets)assert.deepEqual(readFileSync(new URL(name,output)),before.get(`dist/${name}`),name);
  const html=readFileSync(new URL('index.html',output),'utf8');
  assert.equal(html.replace('./catalog.json','/api/catalog'),before.get('dist/index.html').toString());
  for(const name of ['_headers','404.html'])assert.deepEqual(readFileSync(new URL(name,output)),readFileSync(new URL(`cloudflare/${name}`,root)));
  const db=openDatabase(':memory:');
  try{assert.deepEqual(JSON.parse(readFileSync(new URL('catalog.json',output),'utf8')),await readCatalogue(db));}finally{db.close();}
  const first=new Map(files().map(name=>[name,readFileSync(new URL(name,output))]));
  zip();
  const archive=new URL('release/11-0-0-cloudflare.zip',root),firstZip=readFileSync(archive);
  // Check the actual upload payload, including licenses and root-level index.html.
  const manifest=JSON.parse(run('python3',['-B','-c',
    'import hashlib,json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist()}))',fileURLToPath(archive)]));
  assert.deepEqual(Object.keys(manifest).sort(),files());
  for(const [name,bytes] of first)assert.equal(manifest[name],digest(bytes),name);
  writeFileSync(new URL('stale-worker.js',output),'stale build output');
  build();zip();
  assert.deepEqual(files(),[...first.keys()]);
  for(const [name,bytes] of first)assert.deepEqual(readFileSync(new URL(name,output)),bytes,name);
  assert.deepEqual(readFileSync(archive),firstZip,'reproducible upload archive');
  for(const [name,bytes] of before)assert.deepEqual(readFileSync(new URL(name,root)),bytes,name);
});
