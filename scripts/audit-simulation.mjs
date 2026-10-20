// Read-only audit of the maintained engine. No game rules or source data change.
// node scripts/audit-simulation.mjs --runs 200 --output reports/simulation-audit.json
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {parseArgs} from 'node:util';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
import * as game from '../dist/engine.js';
import {TRAITS,CAREER_PROFILES,careerProfile,matchupEffects,rollTraits} from '../dist/traits.js';
import {styleEffect,rollProfiles,FORM_ELO} from '../dist/player-profile.js';
const {values:args}=parseArgs({options:{runs:{type:'string',default:'200'},output:{type:'string'}}});
const runs=Number(args.runs);
if(!Number.isInteger(runs)||runs<10||runs>2000)throw new Error('--runs must be an integer from 10 to 2000.');
const output=args.output;
const db=openDatabase(':memory:');game.configureCatalogue(await readCatalogue(db));db.close();
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor((values.length-1)*p))];
const rounded=value=>Math.round(value*10000)/10000;
const summary=values=>({mean:rounded(mean(values)),median:rounded(quantile(values,0.5)),p05:rounded(quantile(values,0.05)),p95:rounded(quantile(values,0.95))});
const interval=values=>{
  const average=mean(values),variance=values.reduce((sum,value)=>sum+(value-average)**2,0)/(values.length-1),margin=1.96*Math.sqrt(variance/values.length);
  return [rounded(average-margin),rounded(average+margin)];
};
const wilson=(successes,n)=>{
  const z=1.96,p=successes/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
  return [rounded(c-h),rounded(c+h)];
};
const contexts=[];
// Integrate the engine's context distribution rather than sample it here.
for(const kind of ['theory','sharp','quiet','technical'])for(const ending of kind==='technical'?['rook','minor']:[null])for(const timePressure of [false,true])contexts.push({context:{kind,ending,timePressure},weight:0.25*(kind==='technical'?0.5:1)*(timePressure?0.2:0.8)});
function chances(a,traitA,styleA,b=2720,traitB=null,styleB='universal'){
  let expected=0,draw=0;
  for(const {context,weight} of contexts){
    const sa=styleEffect(styleA,styleB,context),sb=styleEffect(styleB,styleA,context),ra=a+sa.bonus,rb=b+sb.bonus;
    const effects=matchupEffects(traitA,traitB,context,ra,rb);
    for(const white of [true,false]){
      const p=game.boardProbabilities(ra+effects.a.bonus,rb+effects.b.bonus,white,sa.draw+sb.draw+effects.a.draw+effects.b.draw);
      expected+=weight/2*(p.win+p.draw/2);draw+=weight/2*p.draw;
    }
  }
  return {expected,draw};
}
function draft(policy,seed,onPick=()=>{}){
  let s=game.initialState();
  for(let pick=0;pick<5;pick++){
    s.offer=game.createOffer(s.squad,game.random(seed^Math.imul(pick+1,0x9E3779B1)));
    const eligible=s.offer.players.filter(id=>game.canDraft(game.playerById(id),s.squad));
    let id=eligible[0];
    if(policy==='random')id=eligible[Math.floor(game.random(seed^Math.imul(pick+1,0x85EBCA6B))()*eligible.length)];
    if(policy==='profile')id=eligible.map(id=>{
      const p=game.playerById(id),profile=s.offer.profiles[id];
      return {id,score:chances(p.rating+profile.form*FORM_ELO,s.offer.traits[id],profile.style).expected};
    }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))[0].id;
    onPick(id,eligible);
    s=game.selectPlayer(s,id,pick);
  }
  return {...s,squad:game.sortBoards(s.squad)};
}
const seen=new Set(),elite=[...game.PLAYERS].sort((a,b)=>b.rating-a.rating||b.year-a.year||a.id.localeCompare(b.id)).filter(p=>{if(seen.has(p.personId))return false;seen.add(p.personId);return true;}).slice(0,5);
function eliteDraft(seed){
  return {...game.initialState(),squad:elite.map(p=>p.id),traits:rollTraits(elite,game.random(seed^0x1234)),profiles:rollProfiles(elite,game.random(seed^0x4321))};
}
function matchOdds(match){
  // Convolve four independent board scores in half-point units.
  let distribution=[1];
  for(const board of match.boards){
    const p=board.probabilities,own=match.a==='YOU'?[p.loss,p.draw,p.win]:[p.win,p.draw,p.loss],next=Array(distribution.length+2).fill(0);
    distribution.forEach((value,index)=>own.forEach((probability,score)=>next[index+score]+=value*probability));distribution=next;
  }
  const win=distribution.slice(5).reduce((a,b)=>a+b,0),draw=distribution[4];
  return {win,draw,expectedMatchPoints:2*win+draw};
}

const grid={cases:0,maxProbabilitySumError:0,maxExpectedScoreError:0,invalid:0};
for(let difference=-1200;difference<=1200;difference+=5)for(let shift=-0.16;shift<=0.16001;shift+=0.02)for(const white of [false,true]){
  const p=game.boardProbabilities(2650+difference,2650,white,shift),expected=1/(1+10**(-(difference+(white?28:-28))/400));
  grid.cases++;grid.maxProbabilitySumError=Math.max(grid.maxProbabilitySumError,Math.abs(p.win+p.draw+p.loss-1));grid.maxExpectedScoreError=Math.max(grid.maxExpectedScoreError,Math.abs(p.win+p.draw/2-expected));
  if(Object.values(p).some(value=>!Number.isFinite(value)||value<0||value>1))grid.invalid++;
}
const traitEffects=TRAITS.map(trait=>{
  const values=[{id:null,weight:0.25},...TRAITS.map(t=>({id:t.id,weight:0.75/TRAITS.length}))];
  let expected=0,draw=0;
  for(const other of values){const p=chances(2650,trait.id,'universal',2650,other.id);expected+=other.weight*p.expected;draw+=other.weight*p.draw;}
  return {trait:trait.id,expectedScore:rounded(expected),drawProbability:rounded(draw)};
}).sort((a,b)=>b.expectedScore-a.expectedScore);

const probes={comparisons:0,opponentChanges:0,opponentChangesAfterFirstRound:0,contextChanges:0,sameOpponentContextChanges:0,rankChanges:0,rankChangesAfterFirstRound:0,unrelatedGamesChanged:0,example:null,unrelatedExample:null,plannerComparisons:0,plannerInferior:0,plannerExample:null,finalRoundPlannerComparisons:0,finalRoundPlannerInferior:0,finalRoundPlannerExample:null};
// Every alternative starts from the same state; previews never advance it.
for(const draftPolicy of ['random','rating'])for(let seed=1;seed<=40;seed++){
  const s=draftPolicy==='random'?game.completeDraft(game.initialState(),game.random(seed)):draft('rating',seed);
  let t=game.startTournament(s.squad,s.teamName,seed,s.traits,s.profiles);
  for(let round=0;round<11;round++){
    const preview=game.previewRound(t),opponent=preview.a==='YOU'?preview.b:preview.a,played=game.simulateRound(t),ownRank=game.standings(t).findIndex(team=>team.id==='YOU');
    const recommended=game.applyRecommendedLineup(t),recommendedPreview=game.previewRound(recommended),recommendedOpponent=recommendedPreview.a==='YOU'?recommendedPreview.b:recommendedPreview.a,recommendedOdds=matchOdds(recommendedPreview);
    for(let board=0;board<4;board++){
      const alternative=game.rotateReserve(t,board),forecast=game.previewRound(alternative),other=forecast.a==='YOU'?forecast.b:forecast.a;
      probes.comparisons++;if(other!==opponent){probes.opponentChanges++;if(round>0)probes.opponentChangesAfterFirstRound++;}
      const changedContexts=JSON.stringify(preview.boards.map(b=>b.context))!==JSON.stringify(forecast.boards.map(b=>b.context));
      if(changedContexts){probes.contextChanges++;if(other===opponent)probes.sameOpponentContextChanges++;}
      if(ownRank!==game.standings(alternative).findIndex(team=>team.id==='YOU')){probes.rankChanges++;if(round>0)probes.rankChangesAfterFirstRound++;}
      if(!probes.example&&other!==opponent)probes.example={draftPolicy,seed,round:round+1,reserveIn:game.playerById(t.squad[4]).name,resting:game.playerById(t.squad[board]).name,opponent,alternativeOpponent:other,baseContexts:preview.boards.map(b=>b.context),alternativeContexts:forecast.boards.map(b=>b.context)};
      if(other===recommendedOpponent&&forecast.a===recommendedPreview.a&&JSON.stringify(forecast.boards.map(b=>b.context))===JSON.stringify(recommendedPreview.boards.map(b=>b.context))){
        probes.plannerComparisons++;const odds=matchOdds(forecast),gain=odds.expectedMatchPoints-recommendedOdds.expectedMatchPoints;
        if(gain>0.01)probes.plannerInferior++;
        const example={draftPolicy,seed,round:round+1,gain:rounded(gain),recommendedRest:game.playerById(recommended.squad[4]).name,alternativeRest:game.playerById(alternative.squad[4]).name,recommended:recommendedOdds,alternative:odds};
        if(gain>0.01&&(!probes.plannerExample||gain>probes.plannerExample.gain))probes.plannerExample=example;
        if(round===10){
          probes.finalRoundPlannerComparisons++;
          if(gain>0.01)probes.finalRoundPlannerInferior++;
          if(gain>0.01&&(!probes.finalRoundPlannerExample||gain>probes.finalRoundPlannerExample.gain))probes.finalRoundPlannerExample=example;
        }
      }
      const alternateRound=game.simulateRound(alternative).rounds.at(-1);let unrelatedChanged=false;
      for(const match of played.rounds.at(-1)){
        if([match.a,match.b].includes('YOU'))continue;
        const unchanged=alternateRound.find(m=>m.a===match.a&&m.b===match.b);if(!unchanged)continue;
        match.boards.forEach((a,i)=>{
          const b=unchanged.boards[i];
          if(a.a.id===b.a.id&&a.b.id===b.b.id&&a.white===b.white&&JSON.stringify(a.probabilities)===JSON.stringify(b.probabilities)&&JSON.stringify(a.context)===JSON.stringify(b.context)&&a.score!==b.score){
            unrelatedChanged=true;
            if(!probes.unrelatedExample)probes.unrelatedExample={draftPolicy,seed,round:round+1,resting:game.playerById(t.squad[board]).name,teams:[match.a,match.b],board:i+1,players:[a.a.name,a.b.name],context:a.context,probabilities:a.probabilities,baseScore:a.score,alternativeScore:b.score};
          }
        });
      }
      if(unrelatedChanged)probes.unrelatedGamesChanged++;
    }
    t=played;
  }
  if(seed%10===0)console.error(`Probed ${draftPolicy} draft seeds 1–${seed}/40 through all eleven rounds.`);
}

const names=['random-auto','rating-auto','rating-manual','profile-auto','elite-auto'],samples=Object.fromEntries(names.map(name=>[name,[]]));
const telemetry={games:0,observed:[0,0,0],predicted:[0,0,0],variance:[0,0,0],contexts:{},timePressure:0,colors:[],maxColorStreak:0,maxColorExample:null,ownAverageFatigueByRound:Array(11).fill(0),opponentAverageFatigueByRound:Array(11).fill(0)};
let profileChoices=0,profileLowerRatedChoices=0;
for(let run=0;run<runs;run++){
  const seed=(0x1BFD_A550+Math.imul(run+1,997))>>>0,states={random:draft('random',seed),rating:draft('rating',seed),profile:draft('profile',seed,(chosen,eligible)=>{
    profileChoices++;if(game.playerById(chosen).rating<Math.max(...eligible.map(id=>game.playerById(id).rating)))profileLowerRatedChoices++;
  }),elite:eliteDraft(seed)};
  for(const name of names){
    const state=states[name.startsWith('rating')?'rating':name.split('-')[0]],auto=!name.endsWith('manual'),start=performance.now();
    let tournament=game.startTournament(state.squad,state.teamName,seed,state.traits,state.profiles);
    for(let round=0;round<11;round++)tournament=game.simulateRound(auto?game.applyRecommendedLineup(tournament):tournament);
    const ranked=game.standings(tournament),own=tournament.teams.find(team=>team.id==='YOU');
    const firstMatch=tournament.rounds[0].find(match=>[match.a,match.b].includes('YOU'));
    const openingRating=mean(firstMatch.boards.map(board=>firstMatch.a==='YOU'?board.a.baseRating:board.b.baseRating));
    samples[name].push({seed,mp:own.mp,bp:own.bp,rank:ranked.findIndex(team=>team.id==='YOU')+1,wins:own.w,perfect:own.w===11,sourceRating:openingRating,milliseconds:performance.now()-start,mirrorPlayers:state.squad.filter(id=>game.OPPONENTS.some(team=>team.players.some(other=>game.playerById(other).personId===game.playerById(id).personId))).length});
    if(run===0&&!game.validSave({...state,phase:'results',tournament}))throw new Error(`Invalid audited ${name} save.`);
    if(name==='rating-auto'){
      const colors=new Map();
      tournament.rounds.forEach((matches,round)=>matches.forEach(match=>match.boards.forEach(board=>{
        telemetry.games++;const p=board.probabilities,ps=[p.win,p.draw,p.loss],actual=board.score===1?0:board.score===0.5?1:2;
        for(let i=0;i<3;i++){telemetry.predicted[i]+=ps[i];telemetry.variance[i]+=ps[i]*(1-ps[i]);}telemetry.observed[actual]++;
        telemetry.contexts[board.context.kind]=(telemetry.contexts[board.context.kind]||0)+1;if(board.context.timePressure)telemetry.timePressure++;
        for(const [player,teamId,white] of [[board.a,match.a,board.white],[board.b,match.b,!board.white]]){
          const key=`${teamId}:${player.id}`,record=colors.get(key)||{team:teamId,player:player.name,playerId:player.id,white:0,black:0,last:null,streak:0,games:0,appearances:[]};
          record.appearances.push({round:round+1,color:white?'white':'black'});
          record[white?'white':'black']++;record.streak=record.last===white?record.streak+1:1;record.last=white;record.games++;colors.set(key,record);telemetry.maxColorStreak=Math.max(telemetry.maxColorStreak,record.streak);
          if(teamId==='YOU')telemetry.ownAverageFatigueByRound[round]+=player.fatigue/(runs*4);else telemetry.opponentAverageFatigueByRound[round]+=player.fatigue/(runs*31*4);
        }
      })));
      telemetry.colors.push(...[...colors.values()].filter(record=>record.games>=8).map(({white,black,games})=>({white,black,games})));
      for(const record of colors.values())if(!telemetry.maxColorExample||Math.abs(record.white-record.black)>telemetry.maxColorExample.imbalance)telemetry.maxColorExample={seed,...record,imbalance:Math.abs(record.white-record.black)};
    }
  }
  if((run+1)%25===0)console.error(`Audited ${run+1}/${runs} paired seeds (${(run+1)*names.length} full tournaments).`);
}
const policies=Object.fromEntries(names.map(name=>{
  const rows=samples[name],titles=rows.filter(row=>row.rank===1).length,perfect=rows.filter(row=>row.perfect).length;
  return [name,{runs,titles,titleRate:titles/runs,titleRate95:wilson(titles,runs),podiumRate:rows.filter(row=>row.rank<=3).length/runs,perfect,meanWins:rounded(mean(rows.map(row=>row.wins))),rank:summary(rows.map(row=>row.rank)),matchPoints:summary(rows.map(row=>row.mp)),matchPoints95:interval(rows.map(row=>row.mp)),sourceRating:summary(rows.map(row=>row.sourceRating)),meanMirrorPlayers:rounded(mean(rows.map(row=>row.mirrorPlayers))),runtimeMs:summary(rows.map(row=>row.milliseconds))}];
}));
const rotationGains=samples['rating-auto'].map((row,i)=>row.mp-samples['rating-manual'][i].mp),profileGains=samples['profile-auto'].map((row,i)=>row.mp-samples['rating-auto'][i].mp);
const result={
  source:{
    node:process.version,
    sourceRatings:'Unchanged published ratings and labelled historical estimates; sampled best observed editions.',
    catalogueRelease:game.CATALOGUE.release,rules:game.RULES_VERSION,
    snapshots:game.NATIONS.length,careerProfiles:CAREER_PROFILES.length,
    fixedOpponentPlayers:game.OPPONENTS.flatMap(team=>team.players).filter(id=>careerProfile(game.playerById(id))).length,
    opponentsAtLeast2700:game.OPPONENTS.filter(team=>team.rating>=2700).length,
    meanOfferLeader:mean(game.NATIONS.map(n=>game.playerById(n.players[0]).rating)),
    meanLeaderToSecondGap:mean(game.NATIONS.map(n=>game.playerById(n.players[0]).rating-game.playerById(n.players[1]).rating)),
    opponentMean:mean(game.OPPONENTS.map(team=>team.rating)),
    opponentRange:[game.OPPONENTS.at(-1).rating,game.OPPONENTS[0].rating],
    elitePlayers:elite.map(p=>({name:p.name,rating:p.rating,year:p.year})),
  },
  method:{
    counterfactuals:'40 seeds per random/rating draft policy, 11 rounds, four reserve substitutions; no user rotation on the baseline path.',
    rerollsUsed:0,
    sourceRating:'Unrounded mean source rating of the four players actually fielded in round one.',
    runsPerPolicy:runs,totalTournaments:runs*names.length,
    pairedSeeds:'(0x1BFDA550 + (run + 1) * 997) >>> 0',
    profilePolicyReferenceRating:2720,
    profilePolicy:'Maximize context-averaged expected fresh-board score, including starting form and style, against a neutral universal opponent; omit future fatigue and daily swings.',
  },
  probabilities:grid,policies,
  pairedComparisons:{
    rotationMatchPointGain:{mean:mean(rotationGains),ci95:interval(rotationGains)},
    profileMatchPointGain:{mean:mean(profileGains),ci95:interval(profileGains)},
    profileLowerRatedChoices,profileChoices,
  },
  counterfactuals:probes,traitEffects,
  telemetry:{
    games:telemetry.games,
    observedRates:telemetry.observed.map(n=>n/telemetry.games),
    predictedRates:telemetry.predicted.map(n=>n/telemetry.games),
    calibrationZ:telemetry.observed.map((n,i)=>(n-telemetry.predicted[i])/Math.sqrt(telemetry.variance[i])),
    contextRates:Object.fromEntries(Object.entries(telemetry.contexts).map(([key,n])=>[key,n/telemetry.games])),
    timePressureRate:telemetry.timePressure/telemetry.games,
    playersAtLeast8Games:telemetry.colors.length,
    playersColorImbalanceAtLeast6:telemetry.colors.filter(p=>Math.abs(p.white-p.black)>=6).length,
    maxColorImbalance:Math.max(...telemetry.colors.map(p=>Math.abs(p.white-p.black))),
    maxConsecutiveSameColor:telemetry.maxColorStreak,maxColorExample:telemetry.maxColorExample,
    meanOwnFatigueByRound:telemetry.ownAverageFatigueByRound,
    meanOpponentFatigueByRound:telemetry.opponentAverageFatigueByRound,
  },
};
const json=JSON.stringify(result,null,2)+'\n';
if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,json);console.log(`Audit written to ${output}`);}else console.log(json);
