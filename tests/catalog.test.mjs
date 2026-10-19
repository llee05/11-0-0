import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/sqlite.mjs';
import { readCatalogue, buildSeed, seedStatements } from '../server/catalog.mjs';

test('SQLite persists sourced top-five country snapshots and reopens without duplicating them',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'olympiad-db-'));
  let db;
  try{
    const filename=join(directory,'catalogue.sqlite');db=openDatabase(filename);
    const catalogue=await readCatalogue(db);
    assert.equal(catalogue.nations.length,1569);
    assert.equal(catalogue.players.length,7845);
    assert.ok(catalogue.nations.every(n=>n.players.length===5&&n.source.sha256.length===64));
    assert.ok(catalogue.nations.every(n=>n.code!=='FID'));
    const usa=year=>catalogue.players.filter(p=>p.nation===`USA-${year}`);
    assert.deepEqual(usa(2026).map(p=>p.rawRating),[2810,2795,2753,2738,2729]);
    assert.deepEqual(usa(2022).map(p=>p.rawRating),[2792,2772,2772,2752,2708]);
    assert.ok(!usa(2022).some(p=>p.name.includes('Nakamura')));
    assert.equal(usa(2026)[1].personId,usa(2022)[0].personId);
    for(const nation of catalogue.nations){
      const players=nation.players.map(id=>catalogue.players.find(p=>p.id===id));
      assert.deepEqual(players.map(p=>p.rank),[1,2,3,4,5]);
      assert.ok(players.every((p,i)=>!i||players[i-1].rawRating>=p.rawRating));
      assert.ok(players.every(p=>p.rating===Math.round(p.rawRating+nation.adjustment)));
    }
    assert.ok(!catalogue.metadata.missingYears.includes(1927));
    assert.deepEqual(catalogue.metadata.missingYears,[]);
    assert.deepEqual(catalogue.metadata.years,catalogue.metadata.requestedYears);
    const early=catalogue.players.filter(p=>p.nation==='URS-1927');
    assert.ok(early.every(p=>p.estimated&&p.rating===p.rawRating+153));
    db.close();db=openDatabase(filename);
    assert.deepEqual(await readCatalogue(db),catalogue);
    assert.throws(()=>db.sqlite.prepare('DELETE FROM rating_sources').run());
  }finally{db?.close();rmSync(directory,{recursive:true,force:true});}
});

test('a new catalogue release replaces stale database rows atomically',async()=>{
  const db=openDatabase(':memory:');
  try{
    const dataset=JSON.parse(readFileSync(new URL('../data/fide-snapshots.json',import.meta.url)));
    const federations=JSON.parse(readFileSync(new URL('../data/federations.json',import.meta.url)));
    const seed=buildSeed({...dataset,snapshots:dataset.snapshots.filter(s=>s.year===2026)},federations);
    db.sqlite.exec('BEGIN');
    for(const {sql,params} of seedStatements(seed,'test-release'))db.sqlite.prepare(sql).run(...params);
    db.sqlite.exec('COMMIT');
    const catalogue=await readCatalogue(db);
    assert.equal(catalogue.metadata.release,'test-release');
    assert.ok(catalogue.nations.every(n=>n.year===2026));
    assert.ok(catalogue.players.every(p=>p.year===2026));
  }finally{db.close();}
});
