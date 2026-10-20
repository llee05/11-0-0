import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rankEquivalent,RATING_RULESET} from '../dist/rating-rules.js';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue,LEGENDS_DATA} from '../server/catalog.mjs';
import {configureCatalogue,initialState,completeDraft,random,startTournament,previewRound,simulateRound,validSave,sortBoards} from '../dist/engine.js';
import {snapshotRun,validRun} from '../dist/run-history.js';

const db=openDatabase(':memory:');const catalogue=await readCatalogue(db);db.close();configureCatalogue(catalogue);
const fide=JSON.parse(readFileSync(new URL('../data/fide-snapshots.json',import.meta.url)));
const historical=JSON.parse(readFileSync(new URL('../data/historical-snapshots.json',import.meta.url)));
const reference=fide.snapshots.find(s=>s.year===2026).reference.top100Ratings;
const periods=new Map([...fide.snapshots,...historical.snapshots].map(p=>[p.year,p]));

test('all SQL editions use the shared capped rank mapping and retain their original source rating',()=>{
  assert.equal(catalogue.metadata.normalization,RATING_RULESET);
  for(const p of catalogue.players){
    let distribution;
    if(p.offerKind==='legends')distribution=LEGENDS_DATA.find(s=>s.sourceSha256===p.source.sha256).players.map(row=>row.sourceRating);
    else{
      const period=periods.get(p.year),nation=period.countries.find(c=>c.federation===p.federation);
      assert.equal(p.rawRating,nation.players[p.rank-1].rawRating);
      distribution=period.reference.top100Ratings;
    }
    assert.equal(p.rating,rankEquivalent(p.rawRating,distribution,reference),p.id);
    assert.equal(p.eraAdjustment,p.rating-p.rawRating);assert.ok(Math.abs(p.eraAdjustment)<=150);
    if(p.year===2026)assert.equal(p.eraAdjustment,0);
  }
  for(const [name,source,game] of [['Paul Morphy',2743,2840],['José Capablanca',2873,2840],['Emanuel Lasker',2858,2840]]){
    const p=catalogue.players.find(p=>p.name===name&&p.offerKind==='legends');
    assert.equal(p.rawRating,source);assert.equal(p.rating,game);
  }
  const forged=structuredClone(catalogue);forged.players[0].eraAdjustment++;
  assert.throws(()=>configureCatalogue(forged),/era-balanced/);
  configureCatalogue(catalogue);
});

test('both sides forecast and simulate the same adjusted bases, and saves reject forged source or era values',()=>{
  const draft=completeDraft(initialState(),random(1843));
  const t=startTournament(draft.squad,draft.teamName,1843,draft.traits,draft.profiles),forecast=previewRound(t),next=simulateRound(t);
  const played=next.rounds[0].find(m=>m.a==='YOU'||m.b==='YOU');
  assert.deepEqual(played.boards.map(b=>b.probabilities),forecast.boards.map(b=>b.probabilities));
  for(const b of played.boards)for(const p of [b.a,b.b]){
    assert.equal(p.baseRating,p.rawRating+p.eraAdjustment);
    assert.equal(p.rating,p.baseRating+p.traitBonus+p.styleBonus+p.formBonus+p.performance-p.fatigue);
  }
  const state={...draft,phase:'tournament',tournament:next};assert.ok(validSave(state));
  for(const key of ['rawRating','eraAdjustment']){
    const forged=structuredClone(state);forged.tournament.rounds[0][0].boards[0].a[key]++;
    assert.equal(validSave(forged),false);
  }
  assert.deepEqual(t.squad,sortBoards(t.squad));
  let done=t;while(done.round<11)done=simulateRound(done);
  const report=snapshotRun({...draft,phase:'results',tournament:done},'2026-10-21T00:00:00Z');
  assert.equal(report.ratingRules,RATING_RULESET);assert.ok(validRun(report));
  const forged=structuredClone(report);forged.squad[0].eraAdjustment++;
  assert.equal(validRun(forged),false);
});
