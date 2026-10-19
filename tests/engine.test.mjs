import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYERS,NATIONS,initialState,createOffer,selectPlayer,random,spent,canAfford,startTournament,simulateRound,standings,rotateReserve,boardProbabilities,validSave,configureCatalogue} from '../dist/engine.js';

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
  assert.equal(PLAYERS.length,7785);
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

test('the same person cannot be drafted from two different years',()=>{
  const caruana=PLAYERS.filter(p=>p.fideId==='2020009');
  assert.ok(caruana.some(p=>p.year===2022)&&caruana.some(p=>p.year===2026));
  const picked=caruana.find(p=>p.year===2022),other=caruana.find(p=>p.year===2026);
  const squad=[picked.id,null,null,null,null];
  assert.equal(canAfford(other,squad),false);
  const state={...initialState(),squad,offer:{nation:other.nation,players:NATIONS.find(n=>n.id===other.nation).players}};
  assert.strictEqual(selectPlayer(state,other.id,1),state);
});

test('saved offers retain disabled top-five players and reject altered rankings or catalogue releases',()=>{
  const s=initialState();
  const usa=NATIONS.find(n=>n.id==='USA-2026');
  s.offer={nation:usa.id,players:[...usa.players]};
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

test('board probabilities are normalized, unbiased in expectation and reward strength',()=>{
  for(let diff=-900;diff<=900;diff+=25){
    const p=boardProbabilities(2700+diff,2700);
    assert.ok([p.win,p.draw,p.loss].every(v=>v>=0&&v<=1));
    assert.ok(Math.abs(p.win+p.draw+p.loss-1)<1e-10);
    assert.ok(Math.abs(p.win+p.draw/2-1/(1+10**(-(diff+28)/400)))<1e-10);
  }
  assert.ok(boardProbabilities(2850,2550).win>boardProbabilities(2550,2850).win);
  assert.ok(boardProbabilities(2700,2700,true).win>boardProbabilities(2700,2700,false).win);
});

test('100 full Olympiads preserve scoring and pair every team once per round without rematches',()=>{
  for(let seed=0;seed<100;seed++){
    const s=draft(seed);let t=startTournament(s.squad,'Test Team',seed);
    for(let round=1;round<=11;round++){
      t=simulateRound(t);
      assert.equal(t.round,round);
      assert.equal(t.teams.reduce((sum,x)=>sum+x.mp,0),32*round);
      assert.equal(t.teams.reduce((sum,x)=>sum+x.bp,0),64*round);
      assert.ok(t.teams.every(team=>team.history.length===round&&new Set(team.history.map(h=>h.opponent)).size===round&&team.w+team.d+team.l===round));
      assert.equal(new Set(t.rounds.at(-1).flatMap(m=>[m.a,m.b])).size,32);
      assert.ok(validSave({...s,phase:round===11?'results':'tournament',tournament:t}));
    }
    assert.strictEqual(simulateRound(t),t);
    const rankings=standings(t);
    assert.equal(rankings.length,32);
    assert.ok(rankings.every((x,i)=>i===0||rankings[i-1].mp>=x.mp));
  }
});

test('same draft and seed produce the same tournament',()=>{
  const s=draft(83);
  const play=()=>{let t=startTournament(s.squad,'Repeatable',54321);for(let i=0;i<11;i++)t=simulateRound(t);return t;};
  assert.deepEqual(play(),play());
});

test('reserve rotates into active boards and resting resets fatigue',()=>{
  const s=draft(3);let t=startTournament(s.squad,'Rested',20);
  for(let i=0;i<5;i++)t=simulateRound(t);
  const id=t.squad[0],reserve=t.squad[4];
  assert.equal(t.streaks[id],5);
  const match=t.rounds.at(-1).find(m=>m.a==='YOU'||m.b==='YOU');
  const player=match.boards.map(b=>match.a==='YOU'?b.a:b.b).find(p=>p.id===id);
  assert.equal(player.rating,PLAYERS.find(p=>p.id===id).rating-8);
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
