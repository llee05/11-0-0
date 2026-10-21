import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
import {configureCatalogue,initialState,quickSim} from '../dist/engine.js';
import {snapshotRun} from '../dist/run-history.js';
import {serializeBackup,parseBackup,MAX_BACKUP_SIZE} from '../dist/portable-save.js';
const db=openDatabase(':memory:');configureCatalogue(await readCatalogue(db));db.close();
const game=quickSim(initialState(),33),run=snapshotRun(game),backup=serializeBackup(game,[run]);
test('portable backups round-trip the active game and independent reports without modifying either',()=>{
  const before=structuredClone(game),parsed=parseBackup(backup);assert.deepEqual(game,before);assert.deepEqual(parsed.game,game);assert.deepEqual(parsed.runs,[run]);assert.equal(parsed.compatible,true);
  const report=parseBackup(serializeBackup(null,[run]));assert.equal(report.hasGame,false);assert.deepEqual(report.runs,[run]);
});
test('reports remain importable when the active game uses older rules or another catalogue',()=>{
  for(const field of ['rulesVersion','catalogueRelease']){
    const file=JSON.parse(backup);file.game[field]='retired';const parsed=parseBackup(JSON.stringify(file));assert.equal(parsed.game,null);assert.equal(parsed.hasGame,true);assert.deepEqual(parsed.runs,[run]);
  }
});
test('malformed, oversized and forged backups fail before any browser storage change',()=>{
  for(const raw of ['{','null','{}', ' '.repeat(MAX_BACKUP_SIZE+1)])assert.throws(()=>parseBackup(raw));
  for(const mutate of [f=>f.runs[0].rounds.pop(),f=>f.game.tournament.teams.pop(),f=>f.version=2,f=>f.exportedAt='bad',f=>delete f.game]){
    const file=JSON.parse(backup);mutate(file);assert.throws(()=>parseBackup(JSON.stringify(file)));
  }
});
