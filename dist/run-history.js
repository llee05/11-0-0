import {ROUND_COUNT,standings,playerById,nationById} from './engine.js';
import {careerProfile,traitLabel,traitById} from './traits.js';
import {FORM_ELO} from './player-profile.js';

export const HISTORY_KEY='11-0-0:best-runs:v1';
export const HISTORY_VERSION=1;
export const HISTORY_LIMIT=3;
const traitInfo=(player,trait)=>({career:!!careerProfile(player),name:traitLabel(trait),description:traitById(trait)?.description||'No match modifier.'});

// Store an independent report, not a resumable game. Keep the user's complete
// boards and every team score without duplicating the other 660 board reports.
export function snapshotRun(game,completedAt=new Date().toISOString()){
  const t=game.tournament;
  if(game.phase!=='results'||t?.round!==ROUND_COUNT||t.rounds.length!==ROUND_COUNT)throw new Error('Only completed tournaments enter the records.');
  const rows=standings(t),own=rows.find(team=>team.id==='YOU');
  const run={version:HISTORY_VERSION,completedAt,teamName:game.teamName,mode:game.mode,seed:t.seed,
    catalogueRelease:game.catalogueRelease,rulesVersion:game.rulesVersion,formElo:FORM_ELO,rank:rows.indexOf(own)+1,
    summary:Object.fromEntries(['w','d','l','mp','bp','sb'].map(key=>[key,own[key]])),
    squad:t.squad.map(id=>{
      const p=playerById(id);
      return {...p,source:nationById(p.nation).source,trait:game.traits[id],traitInfo:traitInfo(p,game.traits[id]),profile:game.profiles[id],form:own.forms[id],load:own.loads[id]};
    }),
    standings:rows.map(team=>Object.fromEntries(['id','name','flag','w','d','l','mp','bp','sb','seedingRating'].map(key=>[key,team[key]]))),
    rounds:t.rounds.map(matches=>{
      const match=matches.find(match=>match.a==='YOU'||match.b==='YOU');
      return {matches:matches.map(({a,b,points})=>({a,b,points})),match:{...match,boards:match.boards.map(b=>({...b,a:{...b.a,traitInfo:traitInfo(b.a,b.a.trait)},b:{...b.b,traitInfo:traitInfo(b.b,b.b.trait)}}))}};
    }),
  };
  // Exact content identity avoids duplicate records on reload and distinguishes
  // different rotation decisions made with the same seed. Dates are metadata.
  const content=JSON.stringify({...run,completedAt:undefined});
  let a=2166136261,b=5381;
  for(let i=0;i<content.length;i++){a=Math.imul(a^content.charCodeAt(i),16777619);b=Math.imul(b,33)^content.charCodeAt(i);}
  return structuredClone({...run,id:`${t.seed}-${(a>>>0).toString(16)}${(b>>>0).toString(16)}`});
}

export const compareRuns=(a,b)=>b.summary.mp-a.summary.mp||b.summary.w-a.summary.w||a.rank-b.rank||b.summary.sb-a.summary.sb||b.summary.bp-a.summary.bp||a.completedAt.localeCompare(b.completedAt)||a.id.localeCompare(b.id);
export function keepBestRuns(runs,run){
  if(runs.some(previous=>previous.id===run.id))return runs;
  return [...runs,run].sort(compareRuns).slice(0,HISTORY_LIMIT);
}

const text=value=>typeof value==='string'&&value.length>0&&value.length<=2000;
const number=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const integer=(value,min,max)=>Number.isInteger(value)&&number(value,min,max);
const half=(value,min,max)=>number(value,min,max)&&Number.isInteger(value*2);
const validTraitInfo=info=>info&&typeof info.career==='boolean'&&text(info.name)&&text(info.description);
const profile=p=>p&&['attacking','positional','defensive','universal'].includes(p.style)&&integer(p.stamina,1,5)&&integer(p.consistency,1,5)&&integer(p.form,-2,2);
const record=r=>r&&['w','d','l'].every(key=>integer(r[key],0,11))&&r.w+r.d+r.l===11&&r.mp===r.w*2+r.d&&half(r.bp,0,44)&&half(r.sb,0,968);
function boardPlayer(p){
  return p&&text(p.id)&&text(p.name)&&text(p.personId)&&profile(p)&&
    (p.trait===null||text(p.trait))&&validTraitInfo(p.traitInfo)&&integer(p.baseRating,100,4000)&&
    ['rating','traitBonus','styleBonus','formBonus','performance','drawShift','fatigue'].every(key=>number(p[key],-4000,5000))&&
    integer(p.fatigueLoad,0,100)&&integer(p.streak,0,11)&&integer(p.afterForm,-2,2)&&integer(p.afterFatigue,0,100);
}
export function validRun(run){
  try{
    if(!run||run.version!==HISTORY_VERSION||!text(run.id)||!text(run.teamName)||!['classic','expert'].includes(run.mode)||
      !text(run.completedAt)||!Number.isFinite(Date.parse(run.completedAt))||!integer(run.seed,0,4294967295)||
      !text(run.catalogueRelease)||!text(run.rulesVersion)||!number(run.formElo,0,1000)||!integer(run.rank,1,32)||!record(run.summary))return false;
    if(!Array.isArray(run.squad)||run.squad.length!==5||new Set(run.squad.map(p=>p.id)).size!==5||run.squad.some(p=>
      !text(p.id)||!text(p.personId)||!text(p.name)||!text(p.flag)||!text(p.federation)||!integer(p.year,1800,3000)||
      !integer(p.rating,100,4000)||!profile(p.profile)||(p.trait!==null&&!text(p.trait))||!validTraitInfo(p.traitInfo)||!integer(p.form,-2,2)||!integer(p.load,0,100)||
      !text(p.source?.url)||!/^https?:\/\//.test(p.source.url)||!text(p.source.date)))return false;
    if(!Array.isArray(run.standings)||run.standings.length!==32||new Set(run.standings.map(t=>t.id)).size!==32||
      run.standings.some(t=>!text(t.id)||!text(t.name)||!text(t.flag)||!record(t)||!number(t.seedingRating,100,4000)))return false;
    const own=run.standings[run.rank-1],teamIds=new Set(run.standings.map(t=>t.id));
    if(own.id!=='YOU'||Object.keys(run.summary).some(key=>run.summary[key]!==own[key]))return false;
    const totals=new Map(run.standings.map(t=>[t.id,{w:0,d:0,l:0,mp:0,bp:0,opponents:[]}]));
    const squadIds=new Set(run.squad.map(p=>p.id));
    if(!Array.isArray(run.rounds)||run.rounds.length!==11)return false;
    for(const round of run.rounds){
      if(!Array.isArray(round.matches)||round.matches.length!==16||new Set(round.matches.flatMap(m=>[m.a,m.b])).size!==32)return false;
      for(const m of round.matches){
        if(!teamIds.has(m.a)||!teamIds.has(m.b)||!half(m.points,0,4))return false;
        for(const [id,opponent,points] of [[m.a,m.b,m.points],[m.b,m.a,4-m.points]]){
          const total=totals.get(id);if(total.opponents.some(o=>o.id===opponent))return false;
          total[points>2?'w':points===2?'d':'l']++;total.mp+=points>2?2:points===2?1:0;total.bp+=points;total.opponents.push({id:opponent,points});
        }
      }
      const match=round.match,fixture=round.matches.find(m=>m.a==='YOU'||m.b==='YOU');
      if(!match||match.a!==fixture.a||match.b!==fixture.b||match.points!==fixture.points||!Array.isArray(match.boards)||match.boards.length!==4)return false;
      if(new Set(match.boards.map(b=>(match.a==='YOU'?b.a:b.b)?.id)).size!==4)return false;
      if(match.boards.some(b=>!boardPlayer(b.a)||!boardPlayer(b.b)||!squadIds.has((match.a==='YOU'?b.a:b.b).id)||
        ![0,0.5,1].includes(b.score)||typeof b.white!=='boolean'||!['theory','sharp','quiet','technical'].includes(b.context?.kind)||
        typeof b.context.timePressure!=='boolean'||(b.context.kind==='technical'?!['rook','minor'].includes(b.context.ending):b.context.ending!==null)))return false;
      if(match.boards.reduce((sum,b)=>sum+b.score,0)!==match.points)return false;
    }
    return run.standings.every(t=>{
      const total=totals.get(t.id),sb=total.opponents.reduce((sum,o)=>sum+totals.get(o.id).mp*o.points,0);
      return ['w','d','l','mp','bp'].every(key=>total[key]===t[key])&&sb===t.sb;
    });
  }catch{return false;}
}

export function parseRunHistory(raw){
  const history=JSON.parse(raw);
  if(history?.version!==HISTORY_VERSION||!Array.isArray(history.runs)||history.runs.length>HISTORY_LIMIT||
    new Set(history.runs.map(run=>run.id)).size!==history.runs.length||!history.runs.every(validRun))throw new Error('Invalid run history.');
  return history.runs.sort(compareRuns);
}
export const serializeRunHistory=runs=>JSON.stringify({version:HISTORY_VERSION,runs});
