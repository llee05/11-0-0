import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/sqlite.mjs';
import { readCatalogue, buildSeed, seedStatements } from '../server/catalog.mjs';
import {buildAllTimeTeams} from '../server/all-time.mjs';

test('SQLite persists sourced top-five country snapshots and reopens without duplicating them',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'olympiad-db-'));
  let db;
  try{
    const filename=join(directory,'catalogue.sqlite');db=openDatabase(filename);
    const catalogue=await readCatalogue(db);
    assert.equal(catalogue.nations.length,722);
    assert.equal(catalogue.players.length,3610);
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
      assert.equal(nation.adjustment,0);
      assert.ok(players.every(p=>p.rating===p.rawRating));
      assert.ok(players.some(p=>p.rawRating>2500));
    }
    assert.ok(!catalogue.metadata.missingYears.includes(1927));
    assert.deepEqual(catalogue.metadata.missingYears,[]);
    assert.deepEqual(catalogue.metadata.years,catalogue.metadata.requestedYears);
    const early=catalogue.players.filter(p=>p.nation==='URS-1927');
    assert.ok(early.every(p=>p.estimated&&p.rating===p.rawRating));
    assert.deepEqual(catalogue.opponents,buildAllTimeTeams(catalogue.nations,catalogue.players).slice(0,31));
    db.close();db=openDatabase(filename);
    assert.deepEqual(await readCatalogue(db),catalogue);
    assert.throws(()=>db.sqlite.prepare('DELETE FROM rating_sources').run());
  }finally{db?.close();rmSync(directory,{recursive:true,force:true});}
});

test('sourced identity links handle transfers while preserving namesakes and reused IDs',async()=>{
  const db=openDatabase(':memory:');
  try{
    const {players,opponents}=await readCatalogue(db);
    const editions=name=>players.filter(p=>p.name===name);
    for(const name of ['Boris Gelfand','Zurab Azmaiparashvili','Lembit Oll','Ottomar Ladva','Fernando Braga'])assert.ok(editions(name).length,name);
    assert.equal(new Set(editions('Boris Gelfand').map(p=>p.personId)).size,1);
    assert.equal(new Set(editions('Zurab Azmaiparashvili').map(p=>p.personId)).size,1);
    assert.ok(editions('Lembit Oll').every(p=>p.personId==='historical:oll lembit'));
    assert.ok(editions('Ottomar Ladva').every(p=>p.personId==='fide:4500024'));
    assert.ok(editions('Fernando Braga').every(p=>p.personId==='fide:811408'));
    const sokolovs=editions('Andrei Sokolov');
    assert.ok(sokolovs.some(p=>p.personId==='fide:627089'));
    assert.ok(sokolovs.some(p=>p.personId==='fide:11600306'));
    const fieldPeople=opponents.flatMap(t=>t.players.map(id=>players.find(p=>p.id===id).personId));
    assert.equal(new Set(fieldPeople).size,155);
  }finally{db.close();}
});

test('a name-qualified historic ID link never captures an unrelated modern player',()=>{
  const dataset=JSON.parse(readFileSync(new URL('../data/fide-snapshots.json',import.meta.url)));
  const federations=JSON.parse(readFileSync(new URL('../data/federations.json',import.meta.url)));
  const reference=structuredClone(dataset.snapshots.find(s=>s.year===2026));
  reference.countries=reference.countries.filter(c=>['ITA','ARG'].includes(c.federation));
  for(const country of reference.countries){
    // Test observations deliberately reuse ID 800015 under two source names.
    country.players[0]={...country.players[0],name:country.federation==='ITA'?'Codenotti, Marco':'Braga, Fernando',fideId:'800015',rawRating:2700};
    country.players.slice(1).forEach((p,i)=>p.rawRating=2500-i*100);
  }
  const seed=buildSeed({...dataset,snapshots:[reference]},federations);
  assert.equal(seed.people.find(p=>p.name==='Marco Codenotti').id,'fide:800015');
  assert.equal(seed.people.find(p=>p.name==='Fernando Braga').id,'fide:811408');
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

test('the cutoff is strictly above 2500 and retains all five unadjusted source ratings',()=>{
  const dataset=JSON.parse(readFileSync(new URL('../data/fide-snapshots.json',import.meta.url)));
  const federations=JSON.parse(readFileSync(new URL('../data/federations.json',import.meta.url)));
  const reference=structuredClone(dataset.snapshots.find(s=>s.year===2026));
  const usa=reference.countries.find(c=>c.federation==='USA');
  const ratings=[2500,2400,2300,2200,2100];
  usa.players.forEach((p,i)=>p.rawRating=ratings[i]);
  reference.countries=[usa];
  assert.equal(buildSeed({...dataset,snapshots:[reference]},federations).snapshots.length,0);
  usa.players[0].rawRating=2501;
  const seed=buildSeed({...dataset,snapshots:[reference]},federations);
  assert.equal(seed.snapshots.length,1);
  assert.deepEqual(seed.editions.map(p=>p.rating),[2501,2400,2300,2200,2100]);
  assert.ok(seed.editions.every(p=>p.rating===p.raw_rating));
  assert.equal(seed.periods[0].adjustment,0);
});
