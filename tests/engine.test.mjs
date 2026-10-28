import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYERS,NATIONS,OPPONENTS,initialState,createOffer,selectPlayer,random,canDraft,startTournament,simulateRound,standings,rotateReserve,setBoardOrder,boardProbabilities,validSave,restoreSave,configureCatalogue,previewRound,playerById,RULES_VERSION,ELO_SCALE,planLineup,previewTeams,applyRecommendedLineup,completeDraft,quickSim,roundFixtures,sortBoards,lineupExpectation,expectedMatchPoints,recommendedLineup,offerWeight,rankedCandidates,draftValue} from '../dist/engine.js';

import {rollTraits,careerProfile} from '../dist/traits.js';
import {fixedProfile,rollProfiles,profileFatigue,nextFatigue,performanceSeed,performanceSwing,restedForm} from '../dist/player-profile.js';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
const db=openDatabase(':memory:');
configureCatalogue(await readCatalogue(db));
db.close();

function draft(seed=1) {
  let s=initialState();const rng=random(seed);
  for(let i=0;i<5;i++){
    s.offer=createOffer(s.squad,rng);
    assert.ok(s.offer?.players.length);
    const available=s.offer.players.filter(id=>canDraft(PLAYERS.find(p=>p.id===id),s.squad));
    const id=available[Math.floor(rng()*available.length)];
    s=selectPlayer(s,id,i);
    assert.equal(s.squad.filter(Boolean).length,i+1);
  }
  return s;
}

test('the entire player pool has unique identities and valid nations',()=>{
  assert.equal(PLAYERS.length,2370);
  assert.equal(new Set(PLAYERS.map(p=>p.id)).size,PLAYERS.length);
  assert.ok(PLAYERS.every(p=>NATIONS.some(n=>n.id===p.nation)&&!Object.hasOwn(p,'cost')));
});

test('1,000 random drafts can finish with no duplicates or dead ends',()=>{
  for(let seed=0;seed<1000;seed++){
    const s=draft(seed);
    assert.equal(new Set(s.squad).size,5);
    assert.equal(createOffer(s.squad),null);
    assert.ok(validSave(s));
  }
});

test('automatic drafting keeps existing picks and the current offer assignments without mutating the draft',()=>{
  let s=initialState();
  s.offer=createOffer(s.squad,random(4));
  const reserve=s.offer.players[0];s=selectPlayer(s,reserve,4);
  s.offer=createOffer(s.squad,random(7));
  const offered=rankedCandidates(s.offer,s.squad)[0],before=structuredClone(s);
  const completed=completeDraft(s,()=>0);
  assert.deepEqual(s,before);
  assert.ok(validSave(completed));
  assert.equal(completed.squad[4],reserve);
  for(const id of [reserve,offered]){
    assert.ok(completed.squad.includes(id));
    assert.equal(completed.traits[id],id===reserve?s.traits[id]:s.offer.traits[id]);
    assert.deepEqual(completed.profiles[id],id===reserve?s.profiles[id]:s.offer.profiles[id]);
  }
});

test('Quick Sim completes a reproducible full Olympiad from an empty or completed draft',()=>{
  for(const state of [initialState(),draft(61)]){
    const before=structuredClone(state),result=quickSim(state,831);
    assert.deepEqual(state,before);
    assert.deepEqual(quickSim(state,831),result);
    assert.equal(result.phase,'results');
    assert.equal(result.tournament.round,11);
    assert.equal(result.tournament.teams.length,50);
    assert.equal(result.tournament.teams.reduce((sum,team)=>sum+team.mp,0),550);
    assert.equal(result.tournament.teams.reduce((sum,team)=>sum+team.bp,0),1100);
    assert.ok(validSave(JSON.parse(JSON.stringify(result))));
    for(const id of state.squad.filter(Boolean)){
      assert.ok(result.squad.includes(id));
      assert.equal(result.traits[id],state.traits[id]);
      assert.deepEqual(result.profiles[id],state.profiles[id]);
    }
    assert.strictEqual(quickSim(result,12),result);
    assert.strictEqual(completeDraft(result),result);
  }
});

test('draft rejects forged offers, occupied slots and repeated players',()=>{
  let s=initialState();
  assert.strictEqual(selectPlayer(s,PLAYERS[0].id,0),s);
  s.offer=createOffer(s.squad,random(3));
  const picked=s.offer.players[0];s=selectPlayer(s,picked,0);
  assert.ok(!canDraft(PLAYERS.find(p=>p.id===picked),s.squad));
  s.offer=createOffer(s.squad,random(4));
  assert.strictEqual(selectPlayer(s,s.offer.players[0],0),s);
  assert.strictEqual(selectPlayer(s,picked,1),s);
});

test('country-year rolls always reveal the complete top five in source order',()=>{
  const s=draft(17);
  s.squad[4]=null;
  for(let seed=0;seed<100;seed++){
    const offer=createOffer(s.squad,random(seed));
    const nation=NATIONS.find(n=>n.id===offer.nation);
    assert.deepEqual(offer.players,nation.players);
    assert.equal(offer.players.length,5);
    assert.ok(offer.players.some(id=>canDraft(PLAYERS.find(p=>p.id===id),s.squad)));
    assert.deepEqual(offer.players.map(id=>PLAYERS.find(p=>p.id===id).rank),[1,2,3,4,5]);
  }
});

test('early estimates and modern country-year versions are independently rollable',()=>{
  for(const id of ['USA-1932','USA-1934','HUN-1938','USA-2022','USA-2026']){
    const index=NATIONS.findIndex(n=>n.id===id);
    assert.ok(index>=0);
    const squad=Array(5).fill(null),weights=NATIONS.map(n=>offerWeight(n,squad));
    const ticket=(weights.slice(0,index).reduce((sum,w)=>sum+w,0)+weights[index]/2)/weights.reduce((sum,w)=>sum+w,0);
    const offer=createOffer(squad,()=>ticket);
    assert.equal(offer.nation,id);
    assert.deepEqual(offer.players,NATIONS[index].players);
  }
});

test('the same person cannot be drafted from two different years',()=>{
  const caruana=PLAYERS.filter(p=>p.fideId==='2020009');
  assert.ok(caruana.some(p=>p.year===2022)&&caruana.some(p=>p.year===2026));
  const picked=caruana.find(p=>p.year===2022),other=caruana.find(p=>p.year===2026);
  const squad=[picked.id,null,null,null,null];
  assert.equal(canDraft(other,squad),false);
  const state={...initialState(),squad,offer:{nation:other.nation,players:NATIONS.find(n=>n.id===other.nation).players}};
  assert.strictEqual(selectPlayer(state,other.id,1),state);
});

test('historical identity links prevent duplicate former champions without merging later namesakes',()=>{
  const early=PLAYERS.find(p=>p.nation==='URS-1970'&&p.name.includes('Korchnoi'));
  const later=PLAYERS.find(p=>p.nation==='SUI-2000'&&p.name.includes('Korchnoi'));
  assert.ok(early&&later);
  assert.equal(early.personId,later.personId);
  assert.equal(canDraft(later,[early.id,null,null,null,null]),false);
  const champion=PLAYERS.find(p=>p.nation==='URS-1954'&&p.name.includes('Petrosian'));
  const namesake=PLAYERS.find(p=>p.fideId==='13301616');
  assert.ok(champion&&namesake);
  assert.notEqual(champion.personId,namesake.personId);
});

test('saved offers retain disabled top-five players and reject altered rankings or catalogue releases',()=>{
  const s=initialState();
  const usa=NATIONS.find(n=>n.id==='USA-2026');
  s.offer={nation:usa.id,players:[...usa.players],traits:rollTraits(usa.players.map(playerById),random(1)),profiles:rollProfiles(usa.players.map(playerById),random(2))};
  assert.ok(validSave(s));
  assert.equal(validSave({...s,catalogueRelease:'old-data'}),false);
  assert.equal(validSave({...s,offer:{...s.offer,players:s.offer.players.slice(0,3)}}),false);
  assert.equal(validSave({...s,offer:{...s.offer,players:[...s.offer.players].reverse()}}),false);
});

test('a tournament requires five unique players and accepts an elite squad without a budget',()=>{
  assert.throws(()=>startTournament([null,null,null,null,null],'Bad'));
  assert.throws(()=>startTournament(Array(5).fill(PLAYERS[0].id),'Bad'));
  const people=new Set();
  const elite=[...PLAYERS].sort((a,b)=>b.rating-a.rating).filter(p=>{if(people.has(p.personId))return false;people.add(p.personId);return true;}).slice(0,5).map(p=>p.id);
  let state=initialState();
  for(const [slot,id] of elite.entries()){
    assert.ok(canDraft(playerById(id),state.squad));
    const nation=NATIONS.find(n=>n.id===playerById(id).nation),candidates=nation.players.map(playerById);
    state=selectPlayer({...state,offer:{nation:nation.id,players:[...nation.players],traits:rollTraits(candidates,random(slot)),profiles:rollProfiles(candidates,random(slot))}},id,slot);
    assert.equal(state.squad[slot],id);
  }
  assert.ok(validSave(state));
  assert.equal(startTournament(elite,'Elite').teams.length,50);
});

test('the field contains 49 all-time opponents, separate Russia and USSR, mixed eras and qualifying B teams',()=>{
  const s=draft(12),t=startTournament(s.squad,'All-time',12,s.traits,s.profiles);
  assert.equal(t.teams.length,50);
  assert.deepEqual(t.teams.slice(1).map(team=>team.id),OPPONENTS.map(team=>team.id));
  assert.ok(OPPONENTS.some(team=>team.code==='RUS'));
  assert.ok(OPPONENTS.some(team=>team.code==='URS'));
  assert.ok(OPPONENTS.some(team=>team.division==='B'));
  const players=OPPONENTS.flatMap(team=>team.players.map(id=>PLAYERS.find(p=>p.id===id)));
  assert.equal(new Set(players.map(p=>p.personId)).size,players.length);
  const usa=OPPONENTS.find(team=>team.code==='USA'&&team.division==='A').players.map(id=>PLAYERS.find(p=>p.id===id));
  assert.ok(usa.some(p=>p.name.includes('Fischer')));
  assert.ok(usa.some(p=>p.name.includes('Caruana')));
  assert.ok(new Set(usa.map(p=>p.year)).size>1);
  const state={...s,teamName:t.teams[0].name,phase:'tournament',tournament:t};
  assert.ok(validSave(state));
  for(const mutate of [
    copy=>copy.teams[1].players.reverse(),
    copy=>copy.teams[1].players[0]=copy.teams[2].players[0],
    copy=>copy.teams[1].rating++,
    copy=>copy.teams[1].id=copy.teams[2].id,
    copy=>copy.teams[1].id='USA-2026',
  ]){const forged=structuredClone(t);mutate(forged);assert.equal(validSave({...state,tournament:forged}),false);}
});

test('board probabilities are normalized, unbiased in expectation and reward strength',()=>{
  assert.equal(ELO_SCALE,320);
  for(let diff=-1200;diff<=1200;diff+=25)for(const shift of [-0.24,-0.16,0,0.16,0.24])for(const white of [true,false]){
    const p=boardProbabilities(2700+diff,2700,white,shift);
    assert.ok([p.win,p.draw,p.loss].every(v=>v>=0&&v<=1));
    assert.ok(Math.abs(p.win+p.draw+p.loss-1)<1e-10);
    assert.ok(Math.abs(p.win+p.draw/2-1/(1+10**(-(diff+(white?28:-28))/ELO_SCALE)))<1e-10);
    const opposite=boardProbabilities(2700,2700+diff,!white,shift);
    assert.ok(Math.abs(p.win-opposite.loss)<1e-10&&Math.abs(p.draw-opposite.draw)<1e-10);
  }
  assert.ok(boardProbabilities(2850,2550).win>boardProbabilities(2550,2850).win);
  assert.ok(boardProbabilities(2700,2700,true).win>boardProbabilities(2700,2700,false).win);
  const advantage=[true,false,true,false].map(white=>boardProbabilities(2800,2720,white));
  assert.ok(expectedMatchPoints(advantage)>1.55&&expectedMatchPoints(advantage)<1.56);
  assert.ok(advantage.every(p=>p.win>p.loss&&p.loss>0));
});

const tournamentCount=Number(process.env.TOURNAMENT_COUNT||(process.env.FULL_TEST||process.env.CI?100:5));
test(`${tournamentCount} full Olympiads preserve scoring and pair every team once per round without rematches`,()=>{
  for(let seed=0;seed<tournamentCount;seed++){
    const s=draft(seed);let t=startTournament(s.squad,'Test Team',seed,s.traits,s.profiles);
    for(let round=1;round<=11;round++){
      t=simulateRound(t);
      assert.equal(t.round,round);
      assert.equal(t.teams.reduce((sum,x)=>sum+x.mp,0),50*round);
      assert.equal(t.teams.reduce((sum,x)=>sum+x.bp,0),100*round);
      assert.ok(t.teams.every(team=>team.history.length===round&&new Set(team.history.map(h=>h.opponent)).size===round&&team.w+team.d+team.l===round));
      assert.equal(new Set(t.rounds.at(-1).flatMap(m=>[m.a,m.b])).size,50);
      assert.ok(validSave({...s,teamName:t.teams[0].name,phase:round===11?'results':'tournament',tournament:t}));
    }
    assert.strictEqual(simulateRound(t),t);
    const rankings=standings(t);
    assert.equal(rankings.length,50);
    assert.ok(rankings.every((x,i)=>i===0||rankings[i-1].mp>=x.mp));
  }
});

test('same draft and seed produce the same tournament',()=>{
  const s=draft(83);
  const play=()=>{let t=startTournament(s.squad,'Repeatable',54321,s.traits,s.profiles);for(let i=0;i<11;i++)t=simulateRound(t);return t;};
  assert.deepEqual(play(),play());
});

test('substitutions preserve pairings, standings order, colours and conditions throughout the event',()=>{
  for(const seed of [5,12,36]){
    const s=completeDraft(initialState(),random(seed));let t=startTournament(s.squad,s.teamName,seed,s.traits,s.profiles);
    for(let round=0;round<11;round++){
      const fixtures=roundFixtures(t),ranks=standings(t).map(team=>team.id),before=structuredClone(t);
      const baseRound=simulateRound(t).rounds.at(-1);
      for(let board=0;board<4;board++){
        const rotated=rotateReserve(t,board);
        assert.deepEqual(roundFixtures(rotated),fixtures);
        assert.deepEqual(standings(rotated).map(team=>team.id),ranks);
        const changed=simulateRound(rotated).rounds.at(-1);
        assert.deepEqual(changed.filter(m=>m.a!=='YOU'&&m.b!=='YOU'),baseRound.filter(m=>m.a!=='YOU'&&m.b!=='YOU'));
      }
      assert.deepEqual(t,before);
      t=simulateRound(applyRecommendedLineup(t));
    }
  }
});

test('colour allocation responds to individual history and keeps two whites per team',()=>{
  const s=draft(17);let t=startTournament(s.squad,s.teamName,469720421,s.traits,s.profiles);
  const records=new Map();
  for(let round=0;round<11;round++){
    t=simulateRound(applyRecommendedLineup(t));
    for(const match of t.rounds.at(-1)){
      assert.equal(match.boards.filter(board=>board.white).length,2);
      for(const board of match.boards)for(const [id,white] of [[`${match.a}:${board.a.id}`,board.white],[`${match.b}:${board.b.id}`,!board.white]]){
        const record=records.get(id)||{white:0,black:0};record[white?'white':'black']++;records.set(id,record);
      }
    }
  }
  const botvinnikTeam=t.teams.find(team=>team.id!=='YOU'&&team.players.some(id=>playerById(id).personId==='chessmetrics:15154'));
  const botvinnikId=botvinnikTeam.players.find(id=>playerById(id).personId==='chessmetrics:15154');
  const botvinnik=records.get(`${botvinnikTeam.id}:${botvinnikId}`);
  assert.ok(botvinnik.white>0&&botvinnik.black>0);
  assert.ok(Math.abs(botvinnik.white-botvinnik.black)<=3);
  const corrupt=structuredClone(t);corrupt.teams[0].seedingRating++;
  assert.equal(validSave({...s,phase:'results',tournament:corrupt}),false);
  assert.equal(validSave({...s,phase:'results',tournament:t,rulesVersion:RULES_VERSION.split('/').slice(0,2).join('/')}),false);
});

test('reserve rotates into active boards and sitting out recovers fatigue only after the round',()=>{
  const s=draft(3);let t=startTournament(s.squad,'Rested',20,s.traits,s.profiles);
  for(let i=0;i<5;i++)t=simulateRound(t);
  const id=t.squad[0],reserve=t.squad[4];
  assert.equal(t.streaks[id],5);
  const match=t.rounds.at(-1).find(m=>m.a==='YOU'||m.b==='YOU');
  const player=match.boards.map(b=>match.a==='YOU'?b.a:b.b).find(p=>p.id===id);
  assert.equal(player.fatigue,profileFatigue(s.traits[id],player.fatigueLoad));
  assert.equal(player.rating,playerById(id).rating-player.fatigue+player.traitBonus+player.styleBonus+player.formBonus+player.performance);
  const beforeRest=t.loads[id];
  t=rotateReserve(t,0);
  assert.equal(t.loads[id],beforeRest);
  assert.equal(t.squad[4],id);
  assert.ok(t.squad.slice(0,4).includes(reserve));
  t=simulateRound(t);
  assert.equal(t.streaks[id],0);
  assert.equal(t.loads[id],Math.max(0,beforeRest-30));
  assert.equal(t.streaks[reserve],1);
});

test('every manual board permutation preserves fixtures, readiness and unrelated matches',()=>{
  const s=draft(94);let t=startTournament(s.squad,s.teamName,94,s.traits,s.profiles);
  for(let round=0;round<3;round++)t=simulateRound(t);
  const before=structuredClone(t),fixtures=roundFixtures(t),ranks=standings(t).map(team=>team.id),preview=previewRound(t);
  const reference=simulateRound(t),unrelated=reference.rounds.at(-1).filter(m=>m.a!=='YOU'&&m.b!=='YOU');
  const permutations=xs=>xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(rest=>[x,...rest])):[[]];
  const originalPlayers=preview.boards.map(b=>preview.a==='YOU'?b.a:b.b);
  for(const order of permutations(t.squad.slice(0,4))){
    const changed=setBoardOrder(t,order),forecast=previewRound(changed),own=changed.teams.find(team=>team.id==='YOU');
    assert.deepEqual(changed.squad,[...order,t.squad[4]]);
    assert.deepEqual(own.lineup,changed.squad);assert.deepEqual(own.players,t.teams[0].players);
    assert.deepEqual(changed.loads,t.loads);assert.deepEqual(changed.streaks,t.streaks);
    assert.deepEqual(changed.teams.map(team=>team.forms),t.teams.map(team=>team.forms));
    assert.deepEqual(roundFixtures(changed),fixtures);assert.deepEqual(standings(changed).map(team=>team.id),ranks);
    assert.deepEqual(forecast.boards.map(b=>(forecast.a==='YOU'?b.a:b.b).id),order);
    for(const board of forecast.boards){const p=forecast.a==='YOU'?board.a:board.b,original=originalPlayers.find(other=>other.id===p.id);assert.deepEqual([p.performance,p.form,p.fatigueLoad],[original.performance,original.form,original.fatigueLoad]);}
    const played=simulateRound(changed),actual=played.rounds.at(-1).find(m=>m.a==='YOU'||m.b==='YOU');
    assert.deepEqual(actual.boards.map(({score,...b})=>b).map(b=>[b.a.id,b.b.id,b.probabilities]),forecast.boards.map(b=>[b.a.id,b.b.id,b.probabilities]));
    assert.deepEqual(played.rounds.at(-1).filter(m=>m.a!=='YOU'&&m.b!=='YOU'),unrelated);
    assert.ok(validSave({...s,phase:'tournament',tournament:played}));
  }
  assert.deepEqual(t,before);
  for(const order of [null,[],t.squad,[...t.squad.slice(0,3),t.squad[0]],[...t.squad.slice(0,3),t.squad[4]],[...t.squad.slice(0,3),'unknown']])assert.strictEqual(setBoardOrder(t,order),t);
});

test('manual orders persist through reserve changes, round play, saves and completion',()=>{
  const s=draft(95);let t=startTournament(s.squad,s.teamName,95,s.traits,s.profiles);
  for(let round=0;round<11;round++){
    t=setBoardOrder(t,[t.squad[3],t.squad[0],t.squad[1],t.squad[2]]);
    const order=[...t.squad],resting=round%4;
    t=rotateReserve(t,resting);
    assert.deepEqual(t.squad,order.map((id,i)=>i===resting?order[4]:i===4?order[resting]:id));
    const ready=JSON.parse(JSON.stringify({...s,phase:'tournament',tournament:t}));assert.ok(validSave(ready));
    const preview=previewRound(t);t=simulateRound(ready.tournament);
    const match=t.rounds.at(-1).find(m=>m.a==='YOU'||m.b==='YOU');
    assert.deepEqual(match.boards.map(b=>(match.a==='YOU'?b.a:b.b).id),t.squad.slice(0,4));
    assert.deepEqual(match.boards.map(b=>b.probabilities),preview.boards.map(b=>b.probabilities));
    assert.ok(validSave({...s,phase:round===10?'results':'tournament',tournament:t}));
  }
  assert.strictEqual(setBoardOrder(t,[...t.squad.slice(0,4)].reverse()),t);
  assert.strictEqual(rotateReserve(t,0),t);
});

test('recommendations preserve chosen board slots and use the current order in their cache',()=>{
  const s=draft(96),original=startTournament(s.squad,s.teamName,96,s.traits,s.profiles);
  const t=setBoardOrder(original,[original.squad[3],original.squad[1],original.squad[0],original.squad[2]]);
  const forecast=previewRound(t),side=forecast.a==='YOU'?'a':'b',opponent=previewTeams(t).find(team=>team.id===(side==='a'?forecast.b:forecast.a));
  const own=t.teams[0],matchup={opponent,boards:forecast.boards,side};
  const candidates=order=>order.map((_,i)=>{const lineup=[...order];[lineup[i],lineup[4]]=[lineup[4],lineup[i]];return lineup;});
  for(const order of [original.squad,t.squad]){
    const choice=planLineup(own,1,matchup,order),score=lineupExpectation(own,choice,matchup);
    assert.ok(candidates(order).some(lineup=>JSON.stringify(lineup)===JSON.stringify(choice)));
    for(const lineup of candidates(order))assert.ok(score>=lineupExpectation(own,lineup,matchup)-1e-12);
    choice[0]='changed';assert.notEqual(planLineup(own,1,matchup,order)[0],'changed');
  }
  const before=structuredClone(t),recommended=recommendedLineup(t);
  assert.ok(candidates(t.squad).some(lineup=>JSON.stringify(lineup)===JSON.stringify(recommended)));
  assert.deepEqual(applyRecommendedLineup(t).squad,recommended);assert.deepEqual(t,before);
});

test('era-balanced rules resume current saves and reject earlier rules without mutating them',()=>{
  const s=draft(97),before=structuredClone(s);assert.strictEqual(restoreSave(s),s);
  for(const rulesVersion of [RULES_VERSION.replace('olympiad-8','olympiad-7'),RULES_VERSION.replace('era-balanced-1','source-ratings-v1')]){
    const legacy={...s,rulesVersion};assert.equal(restoreSave(legacy),null);assert.equal(validSave(legacy),false);
  }
  assert.deepEqual(s,before);
  let t=startTournament(s.squad,s.teamName,97,s.traits,s.profiles);
  for(let round=0;round<3;round++)t=simulateRound(t);
  const current={...s,phase:'tournament',tournament:t};assert.ok(validSave(current));
  assert.ok(restoreSave(JSON.parse(JSON.stringify(current))));
  assert.equal(restoreSave({...current,catalogueRelease:'old-catalogue'}),null);
  while(t.round<11)t=simulateRound(t);
  const completed={...current,phase:'results',tournament:t};assert.strictEqual(restoreSave(completed),completed);
  assert.equal(restoreSave({...completed,rulesVersion:completed.rulesVersion.replace('olympiad-8','olympiad-7')}),null);
});

test('save validation rejects corrupt and incompatible browser data',()=>{
  assert.ok(validSave(initialState()));
  const previousRules={...initialState(),rulesVersion:RULES_VERSION.replace(/career-traits-\d+/,'career-traits-1')};
  assert.notEqual(previousRules.rulesVersion,RULES_VERSION);
  assert.equal(validSave(previousRules),false);
  assert.equal(validSave({...initialState(),rulesVersion:RULES_VERSION.replace(/squad-profiles-\d+/,'squad-profiles-3')}),false);
  assert.equal(validSave({...initialState(),rulesVersion:RULES_VERSION.replace(/olympiad-\d+/,'olympiad-4')}),false);
  for(const broken of [null,{},[],{...initialState(),version:9},{...initialState(),squad:['invalid',null,null,null,null]},{...initialState(),rerolls:-1},{...initialState(),phase:'results'},{...initialState(),offer:{nation:'IND',players:['fake']}}]) assert.equal(validSave(broken),false);
});

test('every team updates active and reserve fatigue and retains partial recovery across the Olympiad',()=>{
  const s=draft(18);let t=startTournament(s.squad,s.teamName,55,s.traits,s.profiles),partialRecovery=false;
  const played=new Map(t.teams.map(team=>[team.id,new Set()]));
  for(let round=0;round<11;round++){
    t=applyRecommendedLineup(t);
    const before=structuredClone(t),planned=previewTeams(t);
    assert.deepEqual(t,before);
    t=simulateRound(t);
    for(const team of t.teams){
      const previous=before.teams.find(p=>p.id===team.id);
      assert.deepEqual(team.lineup,planned.find(p=>p.id===team.id).lineup);
      for(const id of team.players){
        const playing=team.lineup.slice(0,4).includes(id);
        assert.equal(team.loads[id],nextFatigue(previous.loads[id],playing,team.profiles[id]));
        if(playing)played.get(team.id).add(id);
        else {assert.equal(team.streaks[id],0);if(team.loads[id]>0)partialRecovery=true;}
      }
    }
  }
  assert.ok(partialRecovery);
  // A much weaker fifth player can correctly remain on the bench.
  assert.ok([...played.values()].every(players=>players.size>=4&&players.size<=5));
  assert.ok([...played.values()].some(players=>players.size===5));
  assert.ok(validSave({...s,phase:'results',tournament:t}));
  assert.strictEqual(applyRecommendedLineup(t),t);
  assert.deepEqual(previewTeams(t),t.teams);
});

test('reserve planning can rest a strong tired player before the reserve overtakes them',()=>{
  // Fixed game ratings and neutral profiles isolate the planning horizon.
  const ids=['LEGENDS-1:chessmetrics:19593','ARM-2012:fide:13300474','AZE-2018:fide:13401319','URS-1948:chessmetrics:63804','URS-1978:fide:600024'];
  const team={players:ids,lineup:sortBoards(ids),traits:Object.fromEntries(ids.map(id=>[id,null])),
    profiles:Object.fromEntries(ids.map(id=>[id,{style:'universal',stamina:3,consistency:3,form:0}])),
    forms:Object.fromEntries(ids.map(id=>[id,0])),loads:Object.fromEntries(ids.map((id,i)=>[id,[18,58,39,5,4][i]]))};
  const before=structuredClone(team),immediate=planLineup(team,1)[4],planned=planLineup(team,3)[4];
  assert.equal(immediate,ids[4]);assert.equal(planned,ids[1]);
  assert.ok(playerById(planned).rating-profileFatigue(null,team.loads[planned])>playerById(immediate).rating-profileFatigue(null,team.loads[immediate]));
  assert.deepEqual(team,before);
});


test('traits roll once per offer, survive selection and JSON reload, and reroll only on a new offer',()=>{
  const squad=initialState().squad;
  const nation=NATIONS.find(n=>n.players.some(id=>!careerProfile(playerById(id))));
  const nationRoll=(NATIONS.indexOf(nation)+0.5)/NATIONS.length;
  const rng=traitRoll=>{let first=true;return ()=>{if(first){first=false;return nationRoll;}return traitRoll;};};
  const empty=createOffer(squad,rng(0)),full=createOffer(squad,rng(0.9));
  assert.deepEqual(empty.players,full.players);
  const id=empty.players.find(id=>!careerProfile(playerById(id))&&canDraft(playerById(id),squad));
  assert.ok(id);assert.equal(empty.traits[id],null);assert.notEqual(full.traits[id],null);
  let s={...initialState(),offer:empty};
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  s=selectPlayer(s,id,0);
  assert.equal(s.traits[id],null);
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  assert.equal(validSave({...s,traits:{}}),false);
  assert.equal(validSave({...s,rulesVersion:'old-rules'}),false);
  assert.equal(s.rulesVersion,RULES_VERSION);
});

test('the forecast is pure, matches the next round, and both sides keep seeded traits',()=>{
  const s=draft(6),t=startTournament(s.squad,'Preview',44,s.traits,s.profiles),before=structuredClone(t);
  const preview=previewRound(t);
  assert.deepEqual(previewRound(t),preview);assert.deepEqual(t,before);
  const next=simulateRound(t),match=next.rounds[0].find(m=>m.a==='YOU'||m.b==='YOU');
  assert.equal(match.a,preview.a);assert.equal(match.b,preview.b);
  match.boards.forEach((board,i)=>{const copy=structuredClone(board);delete copy.score;delete copy.a.afterForm;delete copy.b.afterForm;delete copy.a.afterFatigue;delete copy.b.afterFatigue;assert.deepEqual(copy,preview.boards[i]);});
  for(const team of next.teams)assert.deepEqual(team.traits,t.teams.find(x=>x.id===team.id).traits);
  assert.deepEqual(simulateRound(JSON.parse(JSON.stringify(t))),next);
  assert.equal(validSave({...s,teamName:t.teams[0].name,phase:'tournament',tournament:next}),true);
});

test('AI teams use the same fatigue rule and can rest a tired starter',()=>{
  const s=draft(7);let t=startTournament(s.squad,'Parity',3,s.traits,s.profiles),rested=false,penalized=false;
  for(let i=0;i<11;i++){
    t=simulateRound(t);
    for(const match of t.rounds.at(-1))for(const board of match.boards)for(const [p,id] of [[board.a,match.a],[board.b,match.b]])if(id!=='YOU'){
      assert.equal(p.rating,p.baseRating-p.fatigue+p.traitBonus+p.styleBonus+p.formBonus+p.performance);
      if(p.fatigue>0)penalized=true;
    }
    if(t.teams.slice(1).some(team=>team.lineup[4]!==team.players[4]))rested=true;
  }
  assert.ok(penalized);assert.ok(rested);assert.equal(previewRound(t),null);
  assert.ok(validSave({...s,teamName:t.teams[0].name,phase:'results',tournament:t}));
});

test('save validation rejects changed career traits, effect data, contexts and trait assignments',()=>{
  const s=draft(4),t=simulateRound(startTournament(s.squad,'Integrity',4,s.traits,s.profiles));
  const state={...s,teamName:t.teams[0].name,phase:'tournament',tournament:t};
  for(const mutate of [
    copy=>delete copy.traits[copy.squad[0]],
    copy=>copy.traits[copy.squad[0]]='unknown',
    copy=>copy.tournament.teams[1].traits[copy.tournament.teams[1].players[0]]='unknown',
    copy=>copy.tournament.rounds[0][0].boards[0].a.rating++,
    copy=>copy.tournament.rounds[0][0].boards[0].a.baseRating++,
    copy=>copy.tournament.rounds[0][0].boards[0].context.kind='invented',
    copy=>copy.tournament.rounds[0][0].boards[0].probabilities.draw=3,
    copy=>copy.tournament.streaks[copy.squad[0]]=-1,
  ]){const copy=structuredClone(state);mutate(copy);assert.equal(validSave(copy),false);}
  const fixed=t.teams.find(team=>team.players.some(id=>careerProfile(playerById(id))));
  const id=fixed.players.find(id=>careerProfile(playerById(id))),copy=structuredClone(state);
  copy.tournament.teams.find(team=>team.id===fixed.id).traits[id]=null;
  assert.equal(validSave(copy),false);
});


test('every AI player retains both their old trait and new profile throughout the Olympiad',()=>{
  const s=draft(72);let t=startTournament(s.squad,'Full profiles',89,s.traits,s.profiles);
  for(const team of t.teams.slice(1))for(const id of team.players){
    const player=playerById(id),career=careerProfile(player);
    if(career){
      assert.equal(team.traits[id],career.trait,player.name);
      for(const [key,value] of Object.entries(fixedProfile(player)))assert.equal(team.profiles[id][key],value,player.name);
    }
  }
  const before=t.teams.map(team=>({traits:team.traits,profiles:team.profiles}));
  for(let round=0;round<11;round++){
    const preview=previewRound(t);t=simulateRound(t);
    assert.deepEqual(t.teams.map(team=>({traits:team.traits,profiles:team.profiles})),before);
    for(const match of t.rounds.at(-1))for(const board of match.boards)for(const [p,teamId] of [[board.a,match.a],[board.b,match.b]]){
      const team=t.teams.find(team=>team.id===teamId),profile=team.profiles[p.id];
      assert.equal(p.trait,team.traits[p.id]);
      assert.equal(p.stamina,profile.stamina);assert.equal(p.style,profile.style);assert.equal(p.consistency,profile.consistency);
      assert.equal(p.fatigue,profileFatigue(p.trait,p.fatigueLoad));
      assert.equal(p.performance,performanceSwing(p.consistency,random(performanceSeed(t.seed,round,teamId,p.id))));
      assert.equal(Object.hasOwn(p,'captainId'),false);assert.equal(Object.hasOwn(p,'captainBonus'),false);
      assert.equal(team.forms[p.id],p.afterForm);assert.equal(team.loads[p.id],p.afterFatigue);
    }
    const match=t.rounds.at(-1).find(m=>m.a==='YOU'||m.b==='YOU');
    for(let i=0;i<4;i++)assert.equal(match.boards[i].a.rating,preview.boards[i].a.rating);
    assert.ok(validSave({...s,teamName:t.teams[0].name,phase:round===10?'results':'tournament',tournament:t}));
  }
});

test('lineup management preserves readiness and neither team receives a captain bonus',()=>{
  const s=draft(21),t=startTournament(s.squad,s.teamName,99,s.traits,s.profiles);
  assert.equal(Object.hasOwn(s,'captain'),false);
  assert.ok(t.teams.every(team=>!Object.hasOwn(team,'captain')&&Object.values(team.profiles).every(p=>!Object.hasOwn(p,'captaincy'))));
  const before=previewRound(t),rotated=rotateReserve(t,0),after=previewRound(rotated);
  const own=m=>m.boards.map(board=>m.a==='YOU'?board.a:board.b);
  for(const player of own(before)){
    const retained=own(after).find(p=>p.id===player.id);
    if(retained)assert.deepEqual([retained.form,retained.performance,retained.fatigueLoad],[player.form,player.performance,player.fatigueLoad]);
  }
  assert.deepEqual(rotated.loads,t.loads);
  const played=simulateRound(rotated);
  for(const match of played.rounds[0])for(const board of match.boards)for(const player of [board.a,board.b]){
    assert.equal(Object.hasOwn(player,'captainId'),false);
    assert.equal(Object.hasOwn(player,'captainBonus'),false);
    assert.equal(Object.hasOwn(player,'captaincy'),false);
    assert.equal(player.rating,player.baseRating-player.fatigue+player.formBonus+player.performance+player.styleBonus+player.traitBonus);
  }
  const state={...s,phase:'tournament',tournament:played};
  assert.ok(validSave(JSON.parse(JSON.stringify(state))));
  assert.equal(validSave({...state,captain:s.squad[0]}),false);
});

test('form and fatigue histories survive rest, reload and reserve rotation',()=>{
  let s=draft(57),t=startTournament(s.squad,s.teamName,51,s.traits,s.profiles);
  const reserve=t.squad[4],form=t.teams[0].forms[reserve];
  t=simulateRound(t);assert.equal(t.teams[0].forms[reserve],restedForm(form));
  t=rotateReserve(t,0);s={...s,phase:'tournament',tournament:t};
  const before=JSON.parse(JSON.stringify(s));assert.ok(validSave(before));
  const next=simulateRound(before.tournament);
  assert.deepEqual(next,simulateRound(s.tournament));
  for(const mutate of [
    copy=>copy.profiles[copy.squad[0]].stamina=6,
    copy=>copy.captain='fake',
    copy=>copy.tournament.teams[1].captain='fake',
    copy=>copy.tournament.teams[1].forms[copy.tournament.teams[1].players[0]]=3,
    copy=>copy.tournament.rounds[0][0].boards[0].a.performance++,
    copy=>copy.tournament.rounds[0][0].boards[0].a.styleBonus++,
    copy=>copy.tournament.rounds[0][0].boards[0].a.captainBonus=12,
    copy=>copy.tournament.rounds[0][0].boards[0].a.captainId=copy.squad[0],
    copy=>copy.profiles[copy.squad[0]].captaincy=5,
    copy=>copy.tournament.rounds[0][0].boards[0].a.afterForm=3,
    copy=>copy.tournament.loads[copy.squad[0]]=101,
    copy=>copy.tournament.teams[1].loads[copy.tournament.teams[1].players[0]]++,
    copy=>copy.tournament.rounds[0][0].boards[0].a.fatigueLoad++,
    copy=>copy.tournament.rounds[0][0].boards[0].a.afterFatigue++,
  ]){const copy=structuredClone(before);mutate(copy);assert.equal(validSave(copy),false);}
});


test('match-aware planning selects a lower-rated specialist and maximises final-round chances without daily swings',()=>{
  assert.equal(expectedMatchPoints(Array(4).fill({win:1,draw:0,loss:0})),2);
  assert.equal(expectedMatchPoints(Array(4).fill({win:0,draw:1,loss:0})),1);
  assert.equal(expectedMatchPoints(Array(4).fill({win:0,draw:0,loss:1})),0);
  const unprofiled=PLAYERS.filter(p=>!careerProfile(p)&&p.rating>=2600&&p.rating<=2620);
  const lower=unprofiled[0],higher=unprofiled.find(p=>p.personId!==lower.personId&&p.rating>lower.rating&&p.rating<=lower.rating+10);
  assert.ok(higher);
  const stars=[],seen=new Set();
  for(const player of [...PLAYERS].sort((a,b)=>b.rating-a.rating))if(!seen.has(player.personId)){stars.push(player.id);seen.add(player.personId);if(stars.length===3)break;}
  const ids=[...stars,higher.id,lower.id],traits=rollTraits(ids.map(playerById),random(4)),profiles=rollProfiles(ids.map(playerById),random(8));
  traits[lower.id]='preparation';traits[higher.id]=null;
  profiles[lower.id]={style:'universal',stamina:3,consistency:3,form:0};profiles[higher.id]={style:'universal',stamina:3,consistency:3,form:0};
  const t=startTournament(ids,'Specialists',4,traits,profiles),team=t.teams[0],opponent=t.teams[1];
  team.players.forEach(id=>{team.forms[id]=0;});opponent.players.forEach(id=>{opponent.forms[id]=0;});
  const matchup={opponent,side:'a',boards:Array.from({length:4},(_,i)=>({white:i%2===0,context:{kind:'theory',ending:null,timePressure:false}}))};
  const before=structuredClone(team),lineup=planLineup(team,1,matchup);
  assert.equal(lineup[4],higher.id);
  const score=lineupExpectation(team,lineup,matchup);
  for(const reserve of ids){const candidate=sortBoards([...ids.filter(id=>id!==reserve),reserve]);assert.ok(score>=lineupExpectation(team,candidate,matchup)-1e-12);}
  assert.deepEqual(team,before);
  lineup[0]='modified';assert.notEqual(planLineup(team,1,matchup)[0],'modified');
});


test('competitive offers retain every snapshot and respond to already-drafted leaders',()=>{
  const squad=Array(5).fill(null),weights=NATIONS.map(n=>offerWeight(n,squad));
  assert.ok(weights.every(weight=>Number.isFinite(weight)&&weight>0));
  const leaders=NATIONS.map(n=>Math.max(...n.players.map(id=>playerById(id).rating)));
  const expectedLeader=leaders.reduce((sum,rating,i)=>sum+rating*weights[i],0)/weights.reduce((sum,w)=>sum+w,0);
  assert.ok(expectedLeader>leaders.reduce((a,b)=>a+b,0)/leaders.length);
  const usa=NATIONS.find(n=>n.id==='USA-2026');
  assert.ok(offerWeight(usa,[usa.players[0],null,null,null,null])<=offerWeight(usa,squad));
});

test('automatic picks use complete profiles and never reroll an existing offer',()=>{
  const s={...initialState(),offer:createOffer(Array(5).fill(null),random(261))};
  const expected=rankedCandidates(s.offer,s.squad)[0],before=structuredClone(s);
  const finished=completeDraft(s,random(119));
  assert.equal(finished.squad.includes(expected),true);
  assert.equal(finished.traits[expected],s.offer.traits[expected]);
  assert.deepEqual(finished.profiles[expected],s.offer.profiles[expected]);assert.deepEqual(s,before);
  const p={rating:2650},base={style:'universal',stamina:1,consistency:3,form:0};
  assert.ok(draftValue(p,null,{...base,stamina:5})>draftValue(p,null,base));
});
