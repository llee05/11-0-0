// Syntax check across application, server, script, test and backend modules.
import {glob} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const patterns=[
  'dist/*.js',
  'scripts/*.mjs',
  'server/*.mjs',
  'backend/build/*.mjs',
  'backend/scripts/**/*.mjs',
  'tests/*.mjs',
];

const files=[];
for await(const file of glob(patterns,{cwd:root})){
  files.push(file);
}
files.sort();

let failed=false;
await Promise.all(files.map(file=>new Promise(resolve=>{
  const p=spawn(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
  p.on('close',code=>{
    if(code!==0)failed=true;
    resolve();
  });
})));

if(failed)process.exit(1);
