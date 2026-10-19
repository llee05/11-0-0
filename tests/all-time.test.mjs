import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAllTimeTeams} from '../server/all-time.mjs';

function fixture(code,ratings,year=2026){
  const nation={id:`${code}-${year}`,code,name:code,flag:'⚑',year};
  return {nation,players:ratings.map((rating,i)=>({id:`${nation.id}:${i}`,personId:`${code}:${i}`,name:`${code} ${i}`,rating,year,federation:code,nation:nation.id}))};
}

test('A and B teams use distinct best editions and compete by starting-board strength',()=>{
  const a=fixture('AAA',Array.from({length:15},(_,i)=>2850-i*20));
  const b=fixture('BBB',[2700,2690,2680,2670,2660]);
  const teams=buildAllTimeTeams([a.nation,b.nation],[...a.players,...b.players]);
  assert.deepEqual(teams.map(t=>t.id),['alltime:AAA:A','alltime:AAA:B','alltime:BBB:A']);
  assert.deepEqual(teams[0].players,a.players.slice(0,5).map(p=>p.id));
  assert.deepEqual(teams[1].players,a.players.slice(5,10).map(p=>p.id));
  assert.equal(teams[0].rating,2820);
  assert.equal(new Set(teams.flatMap(t=>t.players)).size,15);
});

test('transferred players use one federation at their best edition, with deterministic latest-year ties',()=>{
  const r=fixture('RUS',[2800,2790,2780,2770,2760,2750]);
  const u=fixture('URS',[2795,2785,2775,2765,2755,2745],1990);
  u.players[0].personId=r.players[0].personId;
  const older={...r.players[0],id:'RUS-2022:0',rating:2800,year:2022};
  const players=[...u.players,...r.players,older];
  const nations=[u.nation,r.nation];
  const teams=buildAllTimeTeams(nations,players);
  assert.deepEqual(new Set(teams.map(t=>t.code)),new Set(['RUS','URS']));
  assert.ok(teams.find(t=>t.code==='RUS').players.includes(r.players[0].id));
  assert.ok(!teams.flatMap(t=>t.players).includes(u.players[0].id));
  assert.ok(!teams.flatMap(t=>t.players).includes(older.id));
  assert.deepEqual(buildAllTimeTeams([...nations].reverse(),[...players].reverse()),teams);
});

test('field ranking uses exact board totals before display rounding and excludes incomplete or weak teams',()=>{
  const a=fixture('AAA',[2750,2750,2750,2749,2600]);
  const b=fixture('BBB',[2750,2750,2750,2750,2600]);
  const c=fixture('CCC',[2500,2490,2480,2470,2460]);
  const d=fixture('DDD',[2800,2790,2780,2770]);
  const groups=[a,b,c,d];
  const teams=buildAllTimeTeams(groups.map(g=>g.nation),groups.flatMap(g=>g.players));
  assert.deepEqual(teams.map(t=>t.id),['alltime:BBB:A','alltime:AAA:A']);
  assert.equal(teams[0].rating,teams[1].rating);
});
