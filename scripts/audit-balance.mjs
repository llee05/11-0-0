// Read-only, paired experiments against complete 32-team tournaments.
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {availableParallelism,tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs,promisify} from 'node:util';
import {isMainThread,parentPort,Worker,workerData} from 'node:worker_threads';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const git=promisify(execFile);
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const rounded=x=>Math.round(x*1e6)/1e6;
const hash=text=>createHash('sha256').update(text).digest('hex');
const quantile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*p)];
function interval(xs){
  const average=mean(xs),variance=xs.length>1?xs.reduce((sum,x)=>sum+(x-average)**2,0)/(xs.length-1):0;
  const margin=1.96*Math.sqrt(variance/xs.length);
  return [rounded(average-margin),rounded(average+margin)];
}
function wilson(count,n){
  const z=1.96,p=count/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
  return [rounded(c-h),rounded(c+h)];
}

// Exact convolution of four independent board results, in half-point units.
export function matchChances(probabilities){
  if(probabilities.length!==4)throw new Error('A match needs four boards.');
  let distribution=[1];
  for(const p of probabilities){
    const next=Array(distribution.length+2).fill(0);
    distribution.forEach((value,i)=>[p.loss,p.draw,p.win].forEach((chance,score)=>next[i+score]+=value*chance));
    distribution=next;
  }
  const win=distribution.slice(5).reduce((a,b)=>a+b,0),draw=distribution[4],loss=distribution.slice(0,4).reduce((a,b)=>a+b,0);
  return {win,draw,loss,expectedMatchPoints:2*win+draw};
}
export function summarizeSamples(rows){
  const rate=predicate=>{const count=rows.filter(predicate).length;return {count,rate:rounded(count/rows.length),interval95:wilson(count,rows.length)};};
  const poor=rows.filter(row=>row.mp<=10);
  return {
    runs:rows.length,meanWins:rounded(mean(rows.map(r=>r.w))),meanDraws:rounded(mean(rows.map(r=>r.d))),meanLosses:rounded(mean(rows.map(r=>r.l))),
    matchPoints:{mean:rounded(mean(rows.map(r=>r.mp))),interval95:interval(rows.map(r=>r.mp)),p05:quantile(rows.map(r=>r.mp),0.05),median:quantile(rows.map(r=>r.mp),0.5),p95:quantile(rows.map(r=>r.mp),0.95)},
    meanRank:rounded(mean(rows.map(r=>r.rank))),titles:rate(r=>r.rank===1),perfect:rate(r=>r.w===11),
    atMostTwoWins:rate(r=>r.w<=2),atMostTenMatchPoints:rate(r=>r.mp<=10),exactTwoSixThree:rate(r=>r.w===2&&r.d===6&&r.l===3),
    meanForecastMatchPoints:rounded(mean(rows.map(r=>r.expectedMP))),meanOutcomeMinusForecast:rounded(mean(rows.map(r=>r.mp-r.expectedMP))),
    poorRunForecast:poor.length?{runs:poor.length,meanActualMP:rounded(mean(poor.map(r=>r.mp))),meanForecastMP:rounded(mean(poor.map(r=>r.expectedMP))),meanOutcomeMinusForecast:rounded(mean(poor.map(r=>r.mp-r.expectedMP)))}:null,
    meanSourceGap:rounded(mean(rows.map(r=>r.sourceGap))),...(!Object.hasOwn(rows[0],'gameBaseGap')?{}:{meanGameBaseGap:rounded(mean(rows.map(r=>r.gameBaseGap)))}),meanEffectiveGap:rounded(mean(rows.map(r=>r.effectiveGap))),
    ...(!rows[0].modifierGaps?{}:{meanModifierGaps:Object.fromEntries(Object.keys(rows[0].modifierGaps).map(key=>[key,rounded(mean(rows.map(r=>r.modifierGaps[key])))]))}),
    sourceFavouriteOverturnRate:rows[0].sourceFavourites?rounded(rows.reduce((n,r)=>n+r.sourceFavouriteOverturned,0)/rows.reduce((n,r)=>n+r.sourceFavourites,0)):0,
    records:Object.fromEntries([...new Set(rows.map(r=>`${r.w}-${r.d}-${r.l}`))].sort().map(record=>[record,rows.filter(r=>`${r.w}-${r.d}-${r.l}`===record).length])),
  };
}
function calibration(){return {count:0,predicted:[0,0,0],observed:[0,0,0],variance:[0,0,0],brier:0,maxSumError:0};}
function observe(c,p,outcome){
  const ps=[p.win,p.draw,p.loss];c.count++;
  for(let i=0;i<3;i++){c.predicted[i]+=ps[i];c.observed[i]+=Number(outcome===i);c.variance[i]+=ps[i]*(1-ps[i]);c.brier+=(ps[i]-Number(outcome===i))**2;}
  c.maxSumError=Math.max(c.maxSumError,Math.abs(ps.reduce((a,b)=>a+b,0)-1));
}
function mergeCalibration(a,b){
  a.count+=b.count;a.brier+=b.brier;a.maxSumError=Math.max(a.maxSumError,b.maxSumError);
  for(const key of ['predicted','observed','variance'])for(let i=0;i<3;i++)a[key][i]+=b[key][i];
}
function calibrationReport(c){
  return {count:c.count,meanBrier:rounded(c.brier/c.count),maxSumError:c.maxSumError,
    outcomes:Object.fromEntries(['win','draw','loss'].map((name,i)=>[name,{predicted:rounded(c.predicted[i]/c.count),observed:rounded(c.observed[i]/c.count),residualStandardErrors:c.variance[i]?rounded((c.observed[i]-c.predicted[i])/Math.sqrt(c.variance[i])):0}]))};
}
function diagnose(game,tournament,seed,cohort){
  const own=tournament.teams.find(t=>t.id==='YOU'),boards=calibration(),matches=calibration(),rounds=[];
  let expectedMP=0,sourceGap=0,gameBaseGap=0,eraGap=0,effectiveGap=0,fatigueGap=0,formGap=0,performanceGap=0,traitGap=0,styleGap=0,sourceFavouriteOverturned=0,sourceFavourites=0,favouriteLosses=0;
  for(const fixtures of tournament.rounds){
    for(const match of fixtures)for(const board of match.boards)observe(boards,board.probabilities,board.score===1?0:board.score===0.5?1:2);
    const match=fixtures.find(m=>m.a==='YOU'||m.b==='YOU'),side=match.a==='YOU'?'a':'b',other=side==='a'?'b':'a';
    const chances=matchChances(match.boards.map(b=>side==='a'?b.probabilities:{win:b.probabilities.loss,draw:b.probabilities.draw,loss:b.probabilities.win}));
    const points=side==='a'?match.points:4-match.points,outcome=points>2?0:points===2?1:2;
    observe(matches,chances,outcome);expectedMP+=chances.expectedMatchPoints;
    if(chances.win>=0.5&&outcome===2)favouriteLosses++;
    let roundSource=0,roundEffective=0;
    for(const board of match.boards){
      const a=board[side],b=board[other],colour=(side==='a'?board.white:!board.white)?28:-28;
      const sg=(a.rawRating??a.baseRating)-(b.rawRating??b.baseRating),gb=a.baseRating-b.baseRating,eg=a.rating-b.rating+colour;
      sourceGap+=sg;gameBaseGap+=gb;eraGap+=gb-sg;effectiveGap+=eg;roundSource+=sg;roundEffective+=eg;
      fatigueGap+=b.fatigue-a.fatigue;formGap+=a.formBonus-b.formBonus;performanceGap+=a.performance-b.performance;traitGap+=a.traitBonus-b.traitBonus;styleGap+=a.styleBonus-b.styleBonus;
      if(sg>0){sourceFavourites++;if(eg<0)sourceFavouriteOverturned++;}
    }
    rounds.push({round:rounds.length+1,opponent:match[other],points,win:rounded(chances.win),draw:rounded(chances.draw),loss:rounded(chances.loss),sourceGap:rounded(roundSource/4),effectiveGap:rounded(roundEffective/4)});
  }
  const count=44,rank=game.standings(tournament).findIndex(t=>t.id==='YOU')+1;
  return {sample:{seed,cohort,w:own.w,d:own.d,l:own.l,mp:own.mp,bp:own.bp,rank,expectedMP:rounded(expectedMP),sourceGap:rounded(sourceGap/count),gameBaseGap:rounded(gameBaseGap/count),effectiveGap:rounded(effectiveGap/count),
    modifierGaps:Object.fromEntries(Object.entries({era:eraGap,fatigue:fatigueGap,form:formGap,performance:performanceGap,trait:traitGap,style:styleGap}).map(([k,v])=>[k,rounded(v/count)])),
    sourceFavourites,sourceFavouriteOverturned,favouriteLosses,...(own.mp<=10&&Number(cohort)>=2800?{rounds}:{})},boards,matches};
}
function changeScale(source,scale){
  if(/export const ELO_SCALE = \d+;/.test(source))return source.replace(/export const ELO_SCALE = \d+;/,`export const ELO_SCALE = ${scale};`);
  const original='const expected=1/(1+10**(-difference/400));';
  if(!source.includes(original))throw new Error('Cannot locate the Elo scale for this experiment.');
  return source.replace(original,`const expected=1/(1+10**(-difference/${scale}));`);
}
async function buildVariants(temp,ref,names){
  const baseline=(await git('git',['rev-parse','--verify',`${ref}^{commit}`],{cwd:root})).stdout.trim();
  const files=['engine.js','player-profile.js','traits.js'];
  const originals=Object.fromEntries(await Promise.all(files.map(async file=>[file,(await git('git',['show',`${baseline}:dist/${file}`],{cwd:root})).stdout])));
  const baselineRatings=originals['engine.js'].includes('./rating-rules.js')?(await git('git',['show',`${baseline}:dist/rating-rules.js`],{cwd:root})).stdout:null;
  return names.map(name=>{
    const directory=join(temp,name);mkdirSync(directory);writeFileSync(join(directory,'package.json'),' {"type":"module"}\n');
    const hashes={};
    for(const file of files){
      let source=name==='baseline'?originals[file]:readFileSync(join(root,'dist',file),'utf8');
      if(file==='engine.js'&&name!=='baseline')source=changeScale(source,name==='steeper'?320:400);
      hashes[file]=hash(source);writeFileSync(join(directory,file),source);
    }
    const ratingModule='./rating-rules.js';
    if(readFileSync(join(directory,'engine.js'),'utf8').includes(ratingModule)){
      const source=name==='baseline'?baselineRatings:readFileSync(join(root,'dist','rating-rules.js'),'utf8');
      hashes['rating-rules.js']=hash(source);writeFileSync(join(directory,'rating-rules.js'),source);
    }
    const engineSource=readFileSync(join(directory,'engine.js'),'utf8');
    const scale=engineSource.match(/export const ELO_SCALE = (\d+);/)||engineSource.match(/10\*\*\(-difference\/(\d+)\)/);
    if(!scale)throw new Error('Cannot identify the audited Elo scale.');
    return {name,url:pathToFileURL(join(directory,'engine.js')).href,sourceRef:name==='baseline'?baseline:'working tree',hashes,eloScale:Number(scale[1])};
  });
}
function fixedCohorts(players,targets){
  const seen=new Set(),best=[...players].sort((a,b)=>b.rating-a.rating||b.year-a.year||a.id.localeCompare(b.id)).filter(p=>{if(seen.has(p.personId))return false;seen.add(p.personId);return true;});
  return targets.map(target=>{
    const roster=[...best].sort((a,b)=>Math.abs(a.rating-target)-Math.abs(b.rating-target)||b.rating-a.rating||a.id.localeCompare(b.id)).slice(0,5).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id));
    return {name:String(target),target,sourceRating:mean(roster.slice(0,4).map(p=>p.rating)),roster:roster.map(p=>({id:p.id,personId:p.personId,name:p.name,year:p.year,rating:p.rating}))};
  });
}
async function runWorker(){
  const variants=await Promise.all(workerData.variants.map(async variant=>{const game=await import(variant.url);game.configureCatalogue(workerData.catalogue);return {...variant,game};}));
  parentPort.on('message',task=>{
    try{
      const seed=(0x2B00_A550+Math.imul(task.run+1,997))>>>0,ids=task.cohort.roster.map(p=>p.id),results=[];
      for(const {name,game} of variants){
        let t=game.startTournament(ids,`Benchmark ${task.cohort.name}`,seed);
        const initial=t.teams.find(team=>team.id==='YOU');
        while(t.round<11)t=game.simulateRound(game.applyRecommendedLineup(t));
        if(task.validate&&!game.validSave({...game.initialState(),squad:ids,teamName:initial.name,traits:initial.traits,profiles:initial.profiles,phase:'results',tournament:t}))throw new Error(`Invalid ${name} ${task.cohort.name} completed save.`);
        results.push({variant:name,...diagnose(game,t,seed,task.cohort.name)});
      }
      parentPort.postMessage({results});
    }catch(error){parentPort.postMessage({error:error.stack});}
  });
  parentPort.postMessage({ready:true});
}
async function main(){
  const {values:args}=parseArgs({options:{runs:{type:'string',default:'500'},workers:{type:'string',default:String(Math.min(4,availableParallelism()))},'baseline-ref':{type:'string',default:'68a4ff6'},variants:{type:'string',default:'baseline,profiles,steeper'},cohorts:{type:'string',default:'2700,2750,2800,2850'},offset:{type:'string',default:'0'},'include-samples':{type:'boolean',default:false},output:{type:'string'}}});
  const runs=Number(args.runs),workers=Number(args.workers),offset=Number(args.offset),names=args.variants.split(','),targets=args.cohorts.split(',').map(Number);
  if(!Number.isInteger(runs)||runs<2||runs>10000||!Number.isInteger(workers)||workers<1||workers>16||!Number.isInteger(offset)||offset<0)throw new Error('Invalid runs, workers or offset.');
  if(!names.length||new Set(names).size!==names.length||names.some(n=>!['baseline','profiles','steeper'].includes(n))||!targets.length||new Set(targets).size!==targets.length||targets.some(n=>![2700,2750,2800,2850].includes(n)))throw new Error('Invalid variant or cohort.');
  const temp=mkdtempSync(join(tmpdir(),'11-0-0-balance-')),pool=[];
  try{
    const variants=await buildVariants(temp,args['baseline-ref'],names),db=openDatabase(':memory:');
    let catalogue;try{catalogue=await readCatalogue(db);}finally{db.close();}
    const cohorts=fixedCohorts(catalogue.players,targets),samples=[],boards=Object.fromEntries(names.map(n=>[n,calibration()])),matches=Object.fromEntries(names.map(n=>[n,calibration()])),cohortMatches=Object.fromEntries(cohorts.map(c=>[c.name,Object.fromEntries(names.map(n=>[n,calibration()]))]));
    const tasks=cohorts.flatMap(cohort=>Array.from({length:runs},(_,i)=>({cohort,run:offset+i,validate:i===0}))),total=tasks.length;let next=0,done=0;
    const started=Date.now();
    await new Promise((resolveAll,reject)=>{
      const assign=worker=>{if(next<tasks.length)worker.postMessage(tasks[next++]);};
      for(let i=0;i<Math.min(workers,total);i++){
        const worker=new Worker(new URL(import.meta.url),{workerData:{variants,catalogue}});pool.push(worker);
        worker.on('error',reject);worker.on('exit',code=>{if(code&&done<total)reject(new Error(`Audit worker exited ${code}.`));});
        worker.on('message',message=>{
          if(message.error){reject(new Error(message.error));return;}
          if(message.ready){assign(worker);return;}
          for(const result of message.results){samples.push({variant:result.variant,...result.sample});mergeCalibration(boards[result.variant],result.boards);mergeCalibration(matches[result.variant],result.matches);mergeCalibration(cohortMatches[result.sample.cohort][result.variant],result.matches);}
          done++;if(done%25===0||done===total)console.error(`Completed ${done}/${total} paired squads (${done*names.length} tournaments), ${Math.round((Date.now()-started)/1000)}s.`);
          if(done===total)resolveAll();else assign(worker);
        });
      }
    });
    samples.sort((a,b)=>a.cohort.localeCompare(b.cohort)||a.seed-b.seed||a.variant.localeCompare(b.variant));
    const summaries={},paired={};
    for(const cohort of cohorts){
      summaries[cohort.name]=Object.fromEntries(names.map(name=>[name,summarizeSamples(samples.filter(r=>r.cohort===cohort.name&&r.variant===name))]));
      for(let i=1;i<names.length;i++){
        const name=names[i],previous=names[i-1],rows=samples.filter(r=>r.cohort===cohort.name&&r.variant===name),bySeed=new Map(samples.filter(r=>r.cohort===cohort.name&&r.variant===previous).map(r=>[r.seed,r]));
        const differences=rows.map(r=>r.mp-bySeed.get(r.seed).mp);
        paired[`${cohort.name}:${previous}->${name}`]={meanMatchPointChange:rounded(mean(differences)),interval95:interval(differences)};
      }
    }
    const examples=samples.filter(r=>r.rounds).sort((a,b)=>(a.mp-a.expectedMP)-(b.mp-b.expectedMP)).filter((r,i,all)=>all.slice(0,i).filter(a=>a.variant===r.variant&&a.cohort===r.cohort).length<3);
    const result={metadata:{baselineRef:variants.find(v=>v.name==='baseline')?.sourceRef??args['baseline-ref'],catalogueRelease:catalogue.metadata.release,runsPerCohort:runs,seedOffset:offset,totalTournaments:total*names.length,workers,seconds:rounded((Date.now()-started)/1000),cohorts,
      variants:await Promise.all(variants.map(async v=>{const game=await import(v.url),profile=await import(new URL('./player-profile.js',v.url));return {name:v.name,sourceRef:v.sourceRef,hashes:v.hashes,rules:game.RULES_VERSION,eloScale:v.eloScale,formElo:profile.FORM_ELO,dailySwings:profile.SWINGS.slice(1),maxFatiguePenalty:profile.profileFatigue(null,100)};})),
      method:'Fixed best-observed rosters near target ratings, identical seeds across variants, automatic rotation for every team. Forecast sums describe each encountered adaptive Swiss path; they are not unconditional tournament expectations. Poor means at most 10 match points (2-6-3 scores 10). Numeric profiles and alternative Elo scales are fictional game balance, not empirical chess calibration.'},summaries,paired,
      calibration:Object.fromEntries(names.map(n=>[n,{boards:calibrationReport(boards[n]),userMatches:calibrationReport(matches[n]),userMatchesByCohort:Object.fromEntries(cohorts.map(c=>[c.name,calibrationReport(cohortMatches[c.name][n])]))}])),poorRunExamples:examples,
      ...(args['include-samples']?{samples:samples.map(({rounds,...row})=>row)}:{})};
    if(args.output){mkdirSync(dirname(resolve(args.output)),{recursive:true});writeFileSync(args.output,JSON.stringify(result,null,2)+'\n');console.error(`Wrote ${args.output}`);}
    else console.log(JSON.stringify(result,null,2));
  }finally{await Promise.all(pool.map(worker=>worker.terminate()));rmSync(temp,{recursive:true,force:true});}
}

if(!isMainThread)await runWorker();
else if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
