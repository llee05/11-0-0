import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYERS,NATIONS,OPPONENTS,initialState,createOffer,selectPlayer,random,spent,canAfford,startTournament,simulateRound,standings,rotateReserve,boardProbabilities,validSave,configureCatalogue,previewRound,playerById,setCaptain,RULES_VERSION} from '../dist/engine.js';

import {rollTraits,signatureProfile} from '../dist/traits.js';
import {rollProfiles,profileFatigue,performanceSeed,performanceSwing,restedForm} from '../dist/player-profile.js';
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
    const available=s.offer.players.filter(id=>canAfford(PLAYERS.find(p=>p.id===id),s.squad));
    const id=available[Math.floor(rng()*available.length)];
    s=selectPlayer(s,id,i);
    assert.equal(s.squad.filter(Boolean).length,i+1);
  }
  return s;
}

test('the entire player pool has unique identities and valid nations',()=>{
  assert.equal(PLAYERS.length,3610);
  assert.equal(new Set(PLAYERS.map(p=>p.id)).size,PLAYERS.length);
  assert.ok(PLAYERS.every(p=>NATIONS.some(n=>n.id===p.nation)&&p.cost>0));
});

test('1,000 random drafts can finish within budget with no duplicates or dead ends',()=>{
  for(let seed=0;seed<1000;seed++){
    const s=draft(seed);
    assert.ok(spent(s.squad)<=100);
    assert.equal(new Set(s.squad).size,5);
    assert.equal(createOffer(s.squad),null);
    assert.ok(validSave(s));
  }
});

test('draft rejects forged offers, occupied slots and repeated players',()=>{
  let s=initialState();
  assert.strictEqual(selectPlayer(s,PLAYERS[0].id,0),s);
  s.offer=createOffer(s.squad,random(3));
  const picked=s.offer.players[0];s=selectPlayer(s,picked,0);
  assert.ok(!canAfford(PLAYERS.find(p=>p.id===picked),s.squad));
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
    assert.ok(offer.players.some(id=>canAfford(PLAYERS.find(p=>p.id===id),s.squad)));
    assert.deepEqual(offer.players.map(id=>PLAYERS.find(p=>p.id===id).rank),[1,2,3,4,5]);
  }
});

test('early estimates and modern country-year versions are independently rollable',()=>{
  for(const id of ['URS-1927','USA-1930','HUN-1938','USA-2022','USA-2026']){
    const index=NATIONS.findIndex(n=>n.id===id);
    assert.ok(index>=0);
    const offer=createOffer([null,null,null,null,null],()=> (index+0.5)/NATIONS.length);
    assert.equal(offer.nation,id);
    assert.deepEqual(offer.players,NATIONS[index].players);
  }
});

test('the same person cannot be drafted from two different years',()=>{
  const caruana=PLAYERS.filter(p=>p.fideId==='2020009');
  assert.ok(caruana.some(p=>p.year===2022)&&caruana.some(p=>p.year===2026));
  const picked=caruana.find(p=>p.year===2022),other=caruana.find(p=>p.year===2026);
  const squad=[picked.id,null,null,null,null];
  assert.equal(canAfford(other,squad),false);
  const state={...initialState(),squad,offer:{nation:other.nation,players:NATIONS.find(n=>n.id===other.nation).players}};
  assert.strictEqual(selectPlayer(state,other.id,1),state);
});

test('historical identity links prevent duplicate former champions without merging later namesakes',()=>{
  const early=PLAYERS.find(p=>p.nation==='URS-1970'&&p.name.includes('Korchnoi'));
  const later=PLAYERS.find(p=>p.year===2002&&p.name.includes('Korchnoi'));
  assert.ok(early&&later);
  assert.equal(early.personId,later.personId);
  assert.equal(canAfford(later,[early.id,null,null,null,null]),false);
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

test('a tournament requires five unique affordable players',()=>{
  assert.throws(()=>startTournament([null,null,null,null,null],'Bad'));
  assert.throws(()=>startTournament(Array(5).fill(PLAYERS[0].id),'Bad'));
  const expensive=[...PLAYERS].sort((a,b)=>b.rating-a.rating).slice(0,5).map(p=>p.id);
  assert.throws(()=>startTournament(expensive,'Bad'));
});

test('the field contains 31 all-time opponents, separate Russia and USSR, mixed eras and qualifying B teams',()=>{
  const s=draft(12),t=startTournament(s.squad,'All-time',12,s.traits,s.profiles,s.captain);
  assert.equal(t.teams.length,32);
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
  for(let diff=-900;diff<=900;diff+=25)for(const shift of [-0.16,0,0.16]){
    const p=boardProbabilities(2700+diff,2700,true,shift);
    assert.ok([p.win,p.draw,p.loss].every(v=>v>=0&&v<=1));
    assert.ok(Math.abs(p.win+p.draw+p.loss-1)<1e-10);
    assert.ok(Math.abs(p.win+p.draw/2-1/(1+10**(-(diff+28)/400)))<1e-10);
  }
  assert.ok(boardProbabilities(2850,2550).win>boardProbabilities(2550,2850).win);
  assert.ok(boardProbabilities(2700,2700,true).win>boardProbabilities(2700,2700,false).win);
});

test('100 full Olympiads preserve scoring and pair every team once per round without rematches',()=>{
  for(let seed=0;seed<100;seed++){
    const s=draft(seed);let t=startTournament(s.squad,'Test Team',seed,s.traits,s.profiles,s.captain);
    for(let round=1;round<=11;round++){
      t=simulateRound(t);
      assert.equal(t.round,round);
      assert.equal(t.teams.reduce((sum,x)=>sum+x.mp,0),32*round);
      assert.equal(t.teams.reduce((sum,x)=>sum+x.bp,0),64*round);
      assert.ok(t.teams.every(team=>team.history.length===round&&new Set(team.history.map(h=>h.opponent)).size===round&&team.w+team.d+team.l===round));
      assert.equal(new Set(t.rounds.at(-1).flatMap(m=>[m.a,m.b])).size,32);
      assert.ok(validSave({...s,teamName:t.teams[0].name,phase:round===11?'results':'tournament',tournament:t}));
    }
    assert.strictEqual(simulateRound(t),t);
    const rankings=standings(t);
    assert.equal(rankings.length,32);
    assert.ok(rankings.every((x,i)=>i===0||rankings[i-1].mp>=x.mp));
  }
});

test('same draft and seed produce the same tournament',()=>{
  const s=draft(83);
  const play=()=>{let t=startTournament(s.squad,'Repeatable',54321,s.traits,s.profiles,s.captain);for(let i=0;i<11;i++)t=simulateRound(t);return t;};
  assert.deepEqual(play(),play());
});

test('reserve rotates into active boards and resting resets fatigue',()=>{
  const s=draft(3);let t=startTournament(s.squad,'Rested',20,s.traits,s.profiles,s.captain);
  for(let i=0;i<5;i++)t=simulateRound(t);
  const id=t.squad[0],reserve=t.squad[4];
  assert.equal(t.streaks[id],5);
  const match=t.rounds.at(-1).find(m=>m.a==='YOU'||m.b==='YOU');
  const player=match.boards.map(b=>match.a==='YOU'?b.a:b.b).find(p=>p.id===id);
  assert.equal(player.fatigue,profileFatigue(s.traits[id],4,s.profiles[id]));
  assert.equal(player.rating,playerById(id).rating-player.fatigue+player.traitBonus+player.styleBonus+player.formBonus+player.performance+player.captainBonus);
  t=rotateReserve(t,0);
  assert.equal(t.squad[4],id);
  assert.ok(t.squad.slice(0,4).includes(reserve));
  t=simulateRound(t);
  assert.equal(t.streaks[id],0);
  assert.equal(t.streaks[reserve],1);
});

test('save validation rejects corrupt and incompatible browser data',()=>{
  assert.ok(validSave(initialState()));
  for(const broken of [null,{},[],{...initialState(),version:9},{...initialState(),squad:['invalid',null,null,null,null]},{...initialState(),rerolls:-1},{...initialState(),phase:'results'},{...initialState(),offer:{nation:'IND',players:['fake']}}]) assert.equal(validSave(broken),false);
});


test('traits roll once per offer, survive selection and JSON reload, and reroll only on a new offer',()=>{
  const squad=initialState().squad;
  const nation=NATIONS.find(n=>n.players.some(id=>!signatureProfile(playerById(id))));
  const nationRoll=(NATIONS.indexOf(nation)+0.5)/NATIONS.length;
  const rng=traitRoll=>{let first=true;return ()=>{if(first){first=false;return nationRoll;}return traitRoll;};};
  const empty=createOffer(squad,rng(0)),full=createOffer(squad,rng(0.9));
  assert.deepEqual(empty.players,full.players);
  const id=empty.players.find(id=>!signatureProfile(playerById(id))&&canAfford(playerById(id),squad));
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
  const s=draft(6),t=startTournament(s.squad,'Preview',44,s.traits,s.profiles,s.captain),before=structuredClone(t);
  const preview=previewRound(t);
  assert.deepEqual(previewRound(t),preview);assert.deepEqual(t,before);
  const next=simulateRound(t),match=next.rounds[0].find(m=>m.a==='YOU'||m.b==='YOU');
  assert.equal(match.a,preview.a);assert.equal(match.b,preview.b);
  match.boards.forEach((board,i)=>{const copy=structuredClone(board);delete copy.score;delete copy.a.afterForm;delete copy.b.afterForm;assert.deepEqual(copy,preview.boards[i]);});
  for(const team of next.teams)assert.deepEqual(team.traits,t.teams.find(x=>x.id===team.id).traits);
  assert.deepEqual(simulateRound(JSON.parse(JSON.stringify(t))),next);
  assert.equal(validSave({...s,teamName:t.teams[0].name,phase:'tournament',tournament:next}),true);
});

test('AI teams use the same fatigue rule and can rest a tired starter',()=>{
  const s=draft(7);let t=startTournament(s.squad,'Parity',3,s.traits,s.profiles,s.captain),rested=false,penalized=false;
  for(let i=0;i<11;i++){
    t=simulateRound(t);
    for(const match of t.rounds.at(-1))for(const board of match.boards)for(const [p,id] of [[board.a,match.a],[board.b,match.b]])if(id!=='YOU'){
      assert.equal(p.rating,p.baseRating-p.fatigue+p.traitBonus+p.styleBonus+p.formBonus+p.performance+p.captainBonus);
      if(p.fatigue>0)penalized=true;
    }
    if(t.teams.slice(1).some(team=>team.lineup[4]!==team.players[4]))rested=true;
  }
  assert.ok(penalized);assert.ok(rested);assert.equal(previewRound(t),null);
  assert.ok(validSave({...s,teamName:t.teams[0].name,phase:'results',tournament:t}));
});

test('save validation rejects changed signatures, effect data, contexts and trait assignments',()=>{
  const s=draft(4),t=simulateRound(startTournament(s.squad,'Integrity',4,s.traits,s.profiles,s.captain));
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
  const fixed=t.teams.find(team=>team.players.some(id=>signatureProfile(playerById(id))));
  const id=fixed.players.find(id=>signatureProfile(playerById(id))),copy=structuredClone(state);
  copy.tournament.teams.find(team=>team.id===fixed.id).traits[id]=null;
  assert.equal(validSave(copy),false);
});


test('every AI player retains both their old trait and new profile throughout the Olympiad',()=>{
  const s=draft(72);let t=startTournament(s.squad,'Full profiles',89,s.traits,s.profiles,s.captain);
  const before=t.teams.map(team=>({traits:team.traits,profiles:team.profiles}));
  for(let round=0;round<11;round++){
    const preview=previewRound(t);t=simulateRound(t);
    assert.deepEqual(t.teams.map(team=>({traits:team.traits,profiles:team.profiles})),before);
    for(const match of t.rounds.at(-1))for(const board of match.boards)for(const [p,teamId] of [[board.a,match.a],[board.b,match.b]]){
      const team=t.teams.find(team=>team.id===teamId),profile=team.profiles[p.id];
      assert.equal(p.trait,team.traits[p.id]);
      assert.equal(p.stamina,profile.stamina);assert.equal(p.style,profile.style);assert.equal(p.consistency,profile.consistency);
      assert.equal(p.fatigue,profileFatigue(p.trait,p.streak,profile));
      assert.equal(p.performance,performanceSwing(p.consistency,random(performanceSeed(t.seed,round,teamId,p.id))));
      assert.ok(team.players.includes(p.captainId));assert.ok(p.captainBonus>=0&&p.captainBonus<=12);
      assert.equal(team.forms[p.id],p.afterForm);
    }
    const match=t.rounds.at(-1).find(m=>m.a==='YOU'||m.b==='YOU');
    for(let i=0;i<4;i++)assert.equal(match.boards[i].a.rating,preview.boards[i].a.rating);
    assert.ok(validSave({...s,teamName:t.teams[0].name,phase:round===10?'results':'tournament',tournament:t}));
  }
});

test('captain selection persists, never stacks leaders, and cannot reroll readiness',()=>{
  let s=draft(21);const chosen=s.squad[4];
  s=setCaptain(s,chosen);assert.equal(s.captain,chosen);assert.ok(validSave(s));
  let t=startTournament(s.squad,s.teamName,99,s.traits,s.profiles,s.captain);
  s={...s,phase:'tournament',tournament:t};
  assert.equal(t.teams[0].captain,chosen);
  const before=previewRound(t),old=structuredClone(s);
  s=setCaptain(s,t.squad[0]);
  assert.equal(s.tournament.teams[0].captain,t.squad[0]);assert.equal(old.tournament.teams[0].captain,chosen);
  const after=previewRound(s.tournament);
  const own=m=>m.boards.map(board=>m.a==='YOU'?board.a:board.b);
  assert.deepEqual(own(before).map(p=>[p.id,p.form,p.performance]),own(after).map(p=>[p.id,p.form,p.performance]));
  assert.ok(own(after).every(p=>p.captainId===s.captain));
  assert.equal(own(after).find(p=>p.id===s.captain).captainBonus,0);
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  assert.strictEqual(setCaptain(s,'invalid'),s);
  const finished={...s,phase:'results'};assert.strictEqual(setCaptain(finished,chosen),finished);
});

test('form and fatigue histories survive rest, reload and changes of captain',()=>{
  let s=draft(57),t=startTournament(s.squad,s.teamName,51,s.traits,s.profiles,s.captain);
  const reserve=t.squad[4],form=t.teams[0].forms[reserve];
  t=simulateRound(t);assert.equal(t.teams[0].forms[reserve],restedForm(form));
  t=rotateReserve(t,0);s=setCaptain({...s,phase:'tournament',tournament:t},t.squad[4]);
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
    copy=>copy.tournament.rounds[0][0].boards[0].a.captainBonus++,
    copy=>copy.tournament.rounds[0][0].boards[0].a.afterForm=3,
  ]){const copy=structuredClone(before);mutate(copy);assert.equal(validSave(copy),false);}
});
