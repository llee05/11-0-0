// Read-only source study using the shipped era mapping; never writes catalogue or game data.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';

import {rankEquivalent,RATING_RULESET} from '../dist/rating-rules.js';
export {rankEquivalent};

export async function study(){
  const files=['data/fide-snapshots.json','data/historical-observations.json','data/historical-snapshots.json','data/historical-affiliations.json'];
  const input=files.map(file=>({file,text:readFileSync(new URL('../'+file,import.meta.url),'utf8')}));
  const [fide,historical]=input.map(({text})=>JSON.parse(text));
  const reference=fide.snapshots.find(s=>s.year===2026).reference.top100Ratings;
  const median=xs=>(xs[49]+xs[50])/2,referenceMedian=median(reference);
  const db=openDatabase(':memory:');let catalogue;try{catalogue=await readCatalogue(db);}finally{db.close();}
  const periods=[...fide.snapshots.map(s=>({year:s.year,kind:s.source.type,date:s.source.listDate,url:s.source.url,sha256:s.source.archiveSha256,ratings:s.reference.top100Ratings,leader:s.countries.flatMap(c=>c.players).find(p=>p.rawRating===s.reference.top100Ratings[0])?.name||null})),...historical.map(s=>({year:Number(s.players[0].sourceMonth.slice(0,4)),kind:'historical-estimate',date:s.players[0].sourceMonth+'-01',url:s.sourceUrl,sha256:s.sourceSha256,ratings:s.players.map(p=>p.sourceRating),leader:s.players[0].name}))].sort((a,b)=>a.year-b.year);
  return {
    researchOnly:true,readOnly:true,gameRulesApplied:true,mappingRules:RATING_RULESET,catalogueRelease:catalogue.metadata.release,
    reference:{year:2026,median:referenceMedian,leader:reference[0],policy:'Same-world-rank interpolation; equal source ratings share the mean reference rank value; preserve gaps beyond observed endpoints; cap adjustment at ±150 and round to whole points. This is a fictional game-balance rule, not an estimated cross-era Elo correction.'},
    sourceHashes:Object.fromEntries(input.map(({file,text})=>[file,createHash('sha256').update(text).digest('hex')])),
    scriptSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
    periods:periods.map(p=>{
      if(p.ratings.length!==100||p.ratings.some((r,i)=>!Number.isFinite(r)||i&&r>p.ratings[i-1]))throw new Error('Invalid reference distribution.');
      const offset=referenceMedian-median(p.ratings),editions=catalogue.players.filter(player=>player.year===p.year),mapped=p.ratings.map(r=>rankEquivalent(r,p.ratings,reference));
      if(mapped.some((r,i)=>i&&r>mapped[i-1]))throw new Error('Non-monotone candidate.');
      return {year:p.year,kind:p.kind,date:p.date,sourceUrl:p.url,sourceSha256:p.sha256,observations:100,playableCountries:editions.length/5,sourceMedian:median(p.ratings),unboundedMedianOffset:offset,leader:{name:p.leader,source:p.ratings[0],unboundedMedianAligned:p.ratings[0]+offset,rankEquivalent:mapped[0]},rankAnchors:[1,5,10,25,50,75,100].map(rank=>({rank,source:p.ratings[rank-1],rankEquivalent:mapped[rank-1]})),playableEditionChanges:editions.map(player=>({id:player.id,name:player.name,source:player.rawRating,candidate:rankEquivalent(player.rawRating,p.ratings,reference)}))};
    }),
  };
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);
  if(args.length&&!(args.length===2&&args[0]==='--output'))throw new Error('Usage: node scripts/audit-era-ratings.mjs [--output path]');
  const report=await study(),json=JSON.stringify(report,null,2)+'\n';
  if(args.length){writeFileSync(resolve(args[1]),json);console.log(`Compared ${report.periods.length} source periods; read-only study of the shipped mapping; no catalogue or game data written. Output: ${resolve(args[1])}`);}else process.stdout.write(json);
}
