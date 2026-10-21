import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
import {configureCatalogue,quickSim,initialState} from '../dist/engine.js';
import {snapshotRun} from '../dist/run-history.js';
import {tournamentStory} from '../dist/tournament-story.js';
const db=openDatabase(':memory:');configureCatalogue(await readCatalogue(db));db.close();
const run=snapshotRun(quickSim(initialState(),793));
test('the story reconstructs ranks and player totals without changing the archived report',()=>{
  const before=structuredClone(run),story=tournamentStory(run);
  assert.deepEqual(run,before);assert.equal(story.ranks.length,11);
  assert.equal(story.ranks.at(-1).rank,run.rank);assert.equal(story.ranks.at(-1).mp,run.summary.mp);
  assert.equal(story.players.length,5);assert.equal(story.players.reduce((sum,p)=>sum+p.games,0),44);
  assert.equal(story.players.reduce((sum,p)=>sum+p.points,0),run.summary.bp);
  for(const p of story.players){assert.equal(p.w+p.d+p.l,p.games);assert.equal(p.points,p.w+p.d/2);assert.ok(p.expected>=0&&p.expected<=p.games);}
  const scores=run.rounds.map(r=>r.match.a==='YOU'?r.match.points:4-r.match.points);
  assert.equal(Math.abs(story.closest.points-2),Math.min(...scores.map(s=>Math.abs(s-2))));
  if(story.upset){assert.ok(story.upset.win<0.5);const m=run.rounds[story.upset.round-1].match,b=m.boards[story.upset.board-1];assert.equal(m.a==='YOU'?b.score:1-b.score,1);}
});
test('missing historical probabilities produce no invented expectation or upset',()=>{
  const legacy=structuredClone(run);for(const r of legacy.rounds)for(const b of r.match.boards)delete b.probabilities;
  const story=tournamentStory(legacy);assert.equal(story.upset,null);assert.ok(story.players.every(p=>p.expected===null||p.games===0));
});
