// A separate static release; dist/ remains the maintained browser source.
import {cpSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
import {configureCatalogue} from '../dist/engine.js';

const source=new URL('../dist/',import.meta.url);
const release=fileURLToPath(new URL('../release/',import.meta.url));
const output=join(release,'pages');
const marker='<meta name="catalogue-url" content="/api/catalog">';
const html=readFileSync(new URL('index.html',source),'utf8');
if(html.split(marker).length!==2)throw new Error('Expected exactly one API catalogue marker in dist/index.html.');

const db=openDatabase(':memory:');
let catalogue;
try{catalogue=await readCatalogue(db);configureCatalogue(catalogue);}finally{db.close();}

mkdirSync(release,{recursive:true});
const staging=mkdtempSync(join(release,'.pages-'));
try{
  // Explicit assets exclude generated Workers, databases and hosting metadata.
  for(const name of ['app.js','engine.js','traits.js','player-profile.js','run-history.js','styles.css','favicon.svg','king.svg','knight.svg','fonts']){
    cpSync(new URL(name,source),join(staging,name),{recursive:true});
  }
  writeFileSync(join(staging,'index.html'),html.replace(marker,'<meta name="catalogue-url" content="./catalog.json">'));
  writeFileSync(join(staging,'catalog.json'),JSON.stringify(catalogue)+'\n');
  writeFileSync(join(staging,'.nojekyll'),'');
  // Publish the complete build only after the export and asset copies succeed.
  rmSync(output,{recursive:true,force:true});
  renameSync(staging,output);
}finally{rmSync(staging,{recursive:true,force:true});}
console.log(`GitHub Pages release: ${output}`);
console.log(`${catalogue.metadata.snapshotCount} country-year rolls, ${catalogue.players.length} player editions, ${catalogue.opponents.length} opponents · catalogue ${catalogue.metadata.release}`);
