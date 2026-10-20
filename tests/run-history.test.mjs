import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
import {configureCatalogue,initialState,quickSim,completeDraft,startTournament,simulateRound,rotateReserve,restoreSave,random,standings} from '../dist/engine.js';
import {snapshotRun,validRun,keepBestRuns,parseRunHistory,serializeRunHistory} from '../dist/run-history.js';

const db=openDatabase(':memory:');
const catalogue=await readCatalogue(db);db.close();configureCatalogue(catalogue);
const games=[831,832,833,834].map(seed=>quickSim(initialState(),seed));
const runs=games.map((game,i)=>snapshotRun(game,`2026-10-${String(10+i).padStart(2,'0')}T12:00:00.000Z`));

test('only complete tournaments become independent reports with every user board and team result',()=>{
  assert.throws(()=>snapshotRun(initialState()),/completed/);
  const draft=completeDraft(initialState(),random(8));
  assert.throws(()=>snapshotRun({...draft,phase:'tournament',tournament:startTournament(draft.squad,draft.teamName,8,draft.traits,draft.profiles)}),/completed/);
  const game=games[0],before=structuredClone(game),run=snapshotRun(game);
  assert.ok(validRun(run));
  assert.deepEqual(game,before);
  assert.equal(run.rounds.length,11);
  assert.equal(run.rounds.reduce((n,r)=>n+r.match.boards.length,0),44);
  assert.equal(run.rounds.reduce((n,r)=>n+r.matches.length,0),176);
  for(const [i,round] of run.rounds.entries()){
    const report=structuredClone(round.match);
    for(const board of report.boards)for(const side of ['a','b'])delete board[side].traitInfo;
    assert.deepEqual(report,game.tournament.rounds[i].find(m=>m.a==='YOU'||m.b==='YOU'));
    assert.deepEqual(round.matches,game.tournament.rounds[i].map(({a,b,points})=>({a,b,points})));
  }
  const rows=standings(game.tournament),own=rows.find(t=>t.id==='YOU');
  assert.equal(run.rank,rows.indexOf(own)+1);
  assert.equal(run.standings.length,32);
  assert.deepEqual(run.standings.map(t=>t.id),rows.map(t=>t.id));
  assert.deepEqual(run.squad.map(p=>p.id),game.tournament.squad);
  assert.deepEqual(run.squad.map(p=>p.profile),game.tournament.squad.map(id=>game.profiles[id]));
  run.rounds[0].match.boards[0].a.name='Changed archived copy';
  run.squad[0].profile.form=99;
  run.squad[0].source.url='changed';
  assert.deepEqual(game,before);
  assert.notEqual(catalogue.nations.find(n=>n.id===run.squad[0].nation).source.url,'changed');
});

test('best three rank by match points, wins, place, SB, BP, then the earlier exact tie',()=>{
  const entry=(id,mp,w,rank,sb,bp,date='2026-10-10')=>({id,completedAt:date,summary:{mp,w,sb,bp},rank});
  const a=entry('a',20,10,1,600,30),b=entry('b',20,9,1,700,35),c=entry('c',19,9,1,800,40),d=entry('d',21,10,2,500,25);
  const input=[b,c,a],before=structuredClone(input);
  assert.deepEqual(keepBestRuns(input,d).map(r=>r.id),['d','a','b']);
  assert.deepEqual(input,before);
  let tied=[entry('later',20,10,1,600,30,'2026-10-11')];
  tied=keepBestRuns(tied,entry('earlier',20,10,1,600,30));
  assert.equal(tied[0].id,'earlier');
  for(const [better,worse] of [
    [entry('better',20,10,1,600,30),entry('worse',20,10,2,700,35)],
    [entry('better',20,10,1,601,30),entry('worse',20,10,1,600,35)],
    [entry('better',20,10,1,600,31),entry('worse',20,10,1,600,30)],
  ])assert.equal(keepBestRuns([worse],better)[0].id,'better');
});

test('reloading a result never duplicates it or changes its recorded date',()=>{
  const later=snapshotRun(games[0],'2026-10-20T12:00:00.000Z');
  assert.equal(later.id,runs[0].id);
  const existing=[runs[0]];
  assert.strictEqual(keepBestRuns(existing,later),existing);
  assert.equal(existing[0].completedAt,'2026-10-10T12:00:00.000Z');
  // A different reserve decision with the same seed remains a distinct run.
  const game=games[0];
  let t=startTournament(game.squad,game.teamName,game.tournament.seed,game.traits,game.profiles);
  t=rotateReserve(t,0);
  while(t.round<11)t=simulateRound(t);
  assert.notEqual(snapshotRun({...game,tournament:t}).id,runs[0].id);
});

test('reports from earlier rating rules stay independently readable after active saves become incompatible',()=>{
  const legacy={...games[0],rulesVersion:games[0].rulesVersion.replace('olympiad-7','olympiad-6')};
  assert.equal(restoreSave(legacy),null);
  const original=structuredClone(runs[0]);original.rulesVersion=legacy.rulesVersion;delete original.ratingRules;
  assert.ok(validRun(original));const existing=[original];
  const [reloaded]=parseRunHistory(serializeRunHistory(existing));
  assert.deepEqual(reloaded,original);assert.strictEqual(keepBestRuns(existing,reloaded),existing);
});

test('reports round-trip independently of the active catalogue and game rules',()=>{
  const best=runs.reduce(keepBestRuns,[]),raw=serializeRunHistory(best);
  assert.equal(best.length,3);
  assert.ok(Buffer.byteLength(raw)<500_000,'three reports stay well below typical local storage quotas');
  assert.deepEqual(parseRunHistory(raw),best);
  configureCatalogue({...catalogue,metadata:{...catalogue.metadata,release:'new-catalogue'}});
  try{
    const historic=structuredClone(best);
    for(const run of historic){run.catalogueRelease='removed-catalogue';run.rulesVersion='retired-rules';}
    assert.deepEqual(parseRunHistory(serializeRunHistory(historic)),historic);
  }finally{configureCatalogue(catalogue);}
});

test('unreadable or inconsistent record data is rejected before rendering',()=>{
  for(const raw of ['{broken','null','{}',JSON.stringify({version:2,runs:[]}),serializeRunHistory(runs),serializeRunHistory([runs[0],runs[0]])])assert.throws(()=>parseRunHistory(raw));
  const corruptions=[
    r=>{r.rounds.pop();},r=>{r.completedAt='not a date';},r=>{r.rounds[0].match.boards[0].a.style='missing';},
    r=>{r.rounds[0].matches[0]=r.rounds[0].matches[1];},r=>{r.standings[0].bp+=0.5;},
    r=>{r.rounds[0].match.boards[0].a.afterFatigue=101;},r=>{r.squad[0].source.url='javascript:alert(1)';},
    r=>{r.rounds[0].match.boards[0].score=0.25;},r=>{r.rounds[0].match.boards[0].context=null;},
  ];
  for(const corrupt of corruptions){const run=structuredClone(runs[0]);corrupt(run);assert.equal(validRun(run),false);assert.throws(()=>parseRunHistory(serializeRunHistory([run])));}
  assert.deepEqual(parseRunHistory(serializeRunHistory([])),[]);
});
