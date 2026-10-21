import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';

const root=new URL('../',import.meta.url);
const output=new URL('release/pages/',root);
const assets=['app.js','engine.js','tournament-rules.js','rating-rules.js','traits.js','player-profile.js','run-history.js','tournament-story.js','player-explorer.js','browser-saves.js','portable-save.js','styles.css','favicon.svg','king.svg','knight.svg',
  'fonts/manrope.ttf','fonts/manrope-LICENSE.txt','fonts/dm-sans.ttf','fonts/dm-sans-LICENSE.txt'];
const build=()=>execFileSync(process.execPath,[fileURLToPath(new URL('scripts/build-pages.mjs',root))],{cwd:fileURLToPath(root),stdio:'pipe'});
const files=directory=>readdirSync(directory,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>relative(fileURLToPath(directory),join(entry.parentPath,entry.name)).split('\\').join('/')).sort();

test('Pages release exports the canonical SQL catalogue, preserves browser source and rebuilds reproducibly',async()=>{
  const sourceFiles=['index.html',...assets];
  const before=new Map(sourceFiles.map(name=>[name,readFileSync(new URL(`dist/${name}`,root))]));
  const databaseFiles=existsSync(new URL('.data/',root))?readdirSync(new URL('.data/',root)).filter(name=>name.startsWith('catalogue.sqlite')).map(name=>[name,readFileSync(new URL(`.data/${name}`,root))]):[];
  build();
  assert.deepEqual(files(output),['.nojekyll','catalog.json','index.html','sw.js',...assets].sort());
  for(const name of assets)assert.deepEqual(readFileSync(new URL(name,output)),before.get(name),name);
  const html=readFileSync(new URL('index.html',output),'utf8');
  assert.ok(html.includes('<meta name="catalogue-url" content="./catalog.json">'));
  assert.equal(html.replace('./catalog.json','/api/catalog'),before.get('index.html').toString());
  const db=openDatabase(':memory:');
  try{assert.deepEqual(JSON.parse(readFileSync(new URL('catalog.json',output),'utf8')),await readCatalogue(db));}finally{db.close();}
  const first=new Map(files(output).map(name=>[name,readFileSync(new URL(name,output))]));
  writeFileSync(new URL('stale-worker.js',output),'stale build output');
  build();
  assert.deepEqual(files(output),[...first.keys()]);
  for(const [name,bytes] of first)assert.deepEqual(readFileSync(new URL(name,output)),bytes,name);
  for(const [name,bytes] of before)assert.deepEqual(readFileSync(new URL(`dist/${name}`,root)),bytes,name);
  for(const [name,bytes] of databaseFiles)assert.deepEqual(readFileSync(new URL(`.data/${name}`,root)),bytes,name);
});
