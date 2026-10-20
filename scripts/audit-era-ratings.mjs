// Research only: compare rating transformations without changing game/catalogue data.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';

export function rankEquivalent(rating,source,reference,cap=150){
  if(!Number.isFinite(rating)||!Number.isFinite(cap)||cap<0||!Array.isArray(source)||!source.length||!Array.isArray(reference)||reference.length<source.length||[...source,...reference].some(n=>!Number.isFinite(n)))throw new Error('Invalid rating study inputs.');
  const from=[...source].sort((a,b)=>b-a),to=[...reference].sort((a,b)=>b-a),anchors=[];
  for(let i=0;i<from.length;){
    let end=i+1;while(end<from.length&&from[end]===from[i])end++;
    anchors.push({source:from[i],target:to.slice(i,end).reduce((a,b)=>a+b,0)/(end-i)});i=end;
  }
  let target;
  if(rating>=anchors[0].source)target=rating+anchors[0].target-anchors[0].source;
  else if(rating<=anchors.at(-1).source)target=rating+anchors.at(-1).target-anchors.at(-1).source;
  else for(let i=1;i<anchors.length;i++){
    const high=anchors[i-1],low=anchors[i];
    if(rating>=low.source){target=low.target+(high.target-low.target)*(rating-low.source)/(high.source-low.source);break;}
  }
  return Math.round(rating+Math.max(-cap,Math.min(cap,target-rating)));
}

export async function study(){
  const files=['data/fide-snapshots.json','data/historical-observations.json','data/historical-snapshots.json','data/historical-affiliations.json'];
  const input=files.map(file=>({file,text:readFileSync(new URL('../'+file,import.meta.url),'utf8')}));
  const [fide,historical]=input.map(({text})=>JSON.parse(text));
  const reference=fide.snapshots.find(s=>s.year===2026).reference.top100Ratings;
  const median=xs=>(xs[49]+xs[50])/2,referenceMedian=median(reference);
  const db=openDatabase(':memory:');let catalogue;try{catalogue=await readCatalogue(db);}finally{db.close();}
  const periods=[...fide.snapshots.map(s=>({year:s.year,kind:s.source.type,date:s.source.listDate,url:s.source.url,sha256:s.source.archiveSha256,ratings:s.reference.top100Ratings,leader:s.countries.flatMap(c=>c.players).find(p=>p.rawRating===s.reference.top100Ratings[0])?.name||null})),...historical.map(s=>({year:Number(s.players[0].sourceMonth.slice(0,4)),kind:'historical-estimate',date:s.players[0].sourceMonth+'-01',url:s.sourceUrl,sha256:s.sourceSha256,ratings:s.players.map(p=>p.sourceRating),leader:s.players[0].name}))].sort((a,b)=>a.year-b.year);
  return {
    researchOnly:true,gameRulesApplied:false,catalogueRelease:catalogue.metadata.release,
    reference:{year:2026,median:referenceMedian,leader:reference[0],policy:'Same-world-rank interpolation; equal source ratings share the mean reference rank value; preserve gaps beyond observed endpoints; cap adjustment at ±150 and round to whole points. This is a fictional game-balance candidate, not an estimated cross-era Elo correction.'},
    sourceHashes:Object.fromEntries(input.map(({file,text})=>[file,createHash('sha256').update(text).digest('hex')])),
    scriptSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
    periods:periods.map(p=>{
      if(p.ratings.length!==100||p.ratings.some((r,i)=>!Number.isFinite(r)||i&&r>p.ratings[i-1]))throw new Error('Invalid reference distribution.');
      const offset=referenceMedian-median(p.ratings),editions=catalogue.players.filter(player=>player.year===p.year),mapped=p.ratings.map(r=>rankEquivalent(r,p.ratings,reference));
      if(mapped.some((r,i)=>i&&r>mapped[i-1]))throw new Error('Non-monotone candidate.');
      return {year:p.year,kind:p.kind,date:p.date,sourceUrl:p.url,sourceSha256:p.sha256,observations:100,playableCountries:editions.length/5,sourceMedian:median(p.ratings),unboundedMedianOffset:offset,leader:{name:p.leader,source:p.ratings[0],unboundedMedianAligned:p.ratings[0]+offset,rankEquivalent:mapped[0]},rankAnchors:[1,5,10,25,50,75,100].map(rank=>({rank,source:p.ratings[rank-1],rankEquivalent:mapped[rank-1]})),playableEditionChanges:editions.map(player=>({id:player.id,name:player.name,source:player.rating,candidate:rankEquivalent(player.rating,p.ratings,reference)}))};
    }),
  };
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);
  if(args.length&&!(args.length===2&&args[0]==='--output'))throw new Error('Usage: node scripts/audit-era-ratings.mjs [--output path]');
  const report=await study(),json=JSON.stringify(report,null,2)+'\n';
  if(args.length){writeFileSync(resolve(args[1]),json);console.log(`Compared ${report.periods.length} source periods; study only, no game rules changed. Output: ${resolve(args[1])}`);}else process.stdout.write(json);
}
