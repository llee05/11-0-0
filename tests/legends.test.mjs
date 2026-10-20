import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectLegends} from '../server/legends.mjs';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue,LEGENDS_DATA} from '../server/catalog.mjs';
import {configureCatalogue,NATIONS,PLAYERS,initialState,createOffer,offerWeight,canDraft,selectPlayer,completeDraft,random,quickSim,validSave,restoreSave} from '../dist/engine.js';
import {snapshotRun,validRun} from '../dist/run-history.js';

const db=openDatabase(':memory:');
const catalogue=await readCatalogue(db);db.close();configureCatalogue(catalogue);

test('Legends are eight source-ranked fives with actual dates, no inferred federations or repeated people',()=>{
  const groups=selectLegends(LEGENDS_DATA),legends=catalogue.nations.filter(n=>n.kind==='legends');
  assert.equal(LEGENDS_DATA.length,43);assert.equal(groups.length,8);assert.equal(legends.length,8);
  const ids=legends.flatMap(n=>n.players),players=ids.map(id=>PLAYERS.find(p=>p.id===id));
  assert.equal(new Set(players.map(p=>p.personId)).size,40);
  for(const p of players){
    assert.equal(p.federation,null);assert.ok(p.estimated);assert.ok(p.year<1927);
    assert.ok(/^\d{4}-\d{2}-01$/.test(p.source.date));assert.ok(p.source.url.includes(p.source.date.slice(0,7).replace('-','')));
    const source=LEGENDS_DATA.find(s=>s.sourceSha256===p.source.sha256);
    assert.ok(source.players.some(row=>row.sourcePlayerId===p.personId&&row.sourceRating===p.rawRating&&row.sourceMonth===p.source.date.slice(0,7)));
  }
  assert.ok(players.some(p=>p.name==='Paul Morphy'&&p.source.date==='1859-06-01'&&p.rawRating===2743));
  assert.ok(players.some(p=>p.name==='Adolf Anderssen'));
  assert.ok(catalogue.opponents.every(o=>!o.code.startsWith('LEG')&&o.players.every(id=>!ids.includes(id))));
  assert.equal(catalogue.metadata.countryCount,49);
  assert.deepEqual(catalogue.metadata.missingYears,[1944,1930,1928,1927]);
  assert.deepEqual(selectLegends([...LEGENDS_DATA].reverse()),groups);
  const corrupt=structuredClone(LEGENDS_DATA);corrupt[0].players[0].worldRank=2;
  assert.throws(()=>selectLegends(corrupt),/Invalid/);
});

test('Legends use normal weighted rolls, canonical exclusions, deterministic play and independent reports',()=>{
  const nation=NATIONS.find(n=>n.kind==='legends'&&n.players.some(id=>PLAYERS.find(p=>p.id===id).name==='Frank Marshall'));
  const weights=NATIONS.map(n=>offerWeight(n,[])),index=NATIONS.indexOf(nation);
  const ticket=(weights.slice(0,index).reduce((a,b)=>a+b,0)+weights[index]/2)/weights.reduce((a,b)=>a+b,0);
  let first=true;const offer=createOffer([],()=>{if(first){first=false;return ticket;}return 0.5;});
  assert.equal(offer.nation,nation.id);assert.deepEqual(offer.players,nation.players);
  const marshall=PLAYERS.find(p=>p.nation===nation.id&&p.name==='Frank Marshall'),later=PLAYERS.find(p=>p.offerKind==='country'&&p.name==='Frank Marshall');
  assert.equal(marshall.personId,later.personId);assert.equal(canDraft(later,[marshall.id,null,null,null,null]),false);
  const picked=selectPlayer({...initialState(),offer},marshall.id,0),draft=completeDraft(picked,random(1926));
  assert.equal(draft.squad[0]===marshall.id||draft.squad.includes(marshall.id),true);
  const game=quickSim(picked,1926);
  assert.deepEqual(game,quickSim(picked,1926));assert.ok(validSave(game));assert.ok(restoreSave(JSON.parse(JSON.stringify(game))));
  const report=snapshotRun(game,'2026-10-21T00:00:00Z');assert.ok(validRun(report));
  assert.equal(report.squad.find(p=>p.id===marshall.id).source.date,marshall.source.date);
  assert.ok(readFileSync(new URL('../drizzle/0001_panoramic_living_mummy.sql',import.meta.url),'utf8').includes('source_id'));
});
