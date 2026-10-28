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
    assert.equal(catalogue.nations.length,474);
    assert.equal(catalogue.players.length,2370);
    assert.ok(catalogue.nations.every(n=>n.players.length===5&&n.source.sha256.length===64));
    assert.ok(catalogue.nations.every(n=>n.code!=='FID'));
    const usa=year=>catalogue.players.filter(p=>p.nation===`USA-${year}`);
    assert.deepEqual(usa(2026).map(p=>p.rawRating),[2810,2795,2753,2738,2729]);
    assert.deepEqual(usa(2022).map(p=>p.rawRating),[2792,2772,2772,2752,2708]);
    for(const [year,ratings,date] of [
      [1972,[2785,2565,2560,2555,2545],'1972-07-01'],
      [2004,[2652,2623,2623,2621,2616],'2004-01-01'],
      [2024,[2804,2788,2757,2752,2725],'2024-01-01'],
    ]){
      assert.deepEqual(usa(year).map(p=>p.rawRating),ratings);
      assert.equal(catalogue.nations.find(n=>n.id===`USA-${year}`).source.date,date);
    }
    assert.ok(!usa(2022).some(p=>p.name.includes('Nakamura')));
    assert.equal(usa(2026)[1].personId,usa(2022)[0].personId);
    for(const nation of catalogue.nations){
      const players=nation.players.map(id=>catalogue.players.find(p=>p.id===id));
      assert.deepEqual(players.map(p=>p.rank),[1,2,3,4,5]);
      assert.ok(players.every((p,i)=>!i||players[i-1].rawRating>=p.rawRating));
      assert.equal(nation.adjustment,0);
      assert.ok(players.every(p=>p.rating===p.rawRating+p.eraAdjustment));
      assert.ok(players.some(p=>p.rawRating>2650));
    }
    assert.deepEqual(catalogue.metadata.belowCutoffYears,[1930,1928,1927]);
    assert.equal(usa(2000).length,0);
    assert.deepEqual(JSON.parse(readFileSync(new URL('../data/fide-snapshots.json',import.meta.url))).snapshots.find(s=>s.year===2000).countries.find(c=>c.federation==='USA').players.map(p=>p.rawRating),[2647,2644,2601,2599,2596]);
    assert.deepEqual(catalogue.metadata.missingYears,[1944,1930,1928,1927]);
    assert.equal(catalogue.metadata.requestedYears.length,51);
    assert.deepEqual(catalogue.metadata.years,catalogue.metadata.requestedYears.filter(y=>![1944,1930,1928,1927].includes(y)));
    assert.deepEqual(catalogue.metadata.years.filter(y=>y>=1972),Array.from({length:28},(_,i)=>2026-i*2));
    const early=catalogue.players.filter(p=>p.nation==='USA-1932');
    assert.equal(early.length,5);
    assert.ok(early.every(p=>p.estimated&&p.rating===p.rawRating+p.eraAdjustment));
    assert.deepEqual(catalogue.opponents,buildAllTimeTeams(catalogue.nations,catalogue.players).slice(0,49));
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
    for(const name of ['Boris Gelfand','Zurab Azmaiparashvili','Lembit Oll'])assert.ok(editions(name).length,name);
    assert.equal(new Set(editions('Boris Gelfand').map(p=>p.personId)).size,1);
    assert.equal(new Set(editions('Zurab Azmaiparashvili').map(p=>p.personId)).size,1);
    assert.ok(editions('Lembit Oll').every(p=>p.personId==='historical:oll lembit'));
    assert.ok(editions('Gyula Sax').every(p=>p.personId==='fide:700029'));
    const sokolovs=players.filter(p=>p.name.includes('Andrei')&&p.name.includes('Sokolov'));
    assert.ok(sokolovs.some(p=>p.personId==='fide:627089'));
    assert.ok(sokolovs.some(p=>p.personId==='fide:11600306')); // The surviving 1994 source names him Andrei (2) Sokolov.
    const fieldPeople=opponents.flatMap(t=>t.players.map(id=>players.find(p=>p.id===id).personId));
    assert.equal(new Set(fieldPeople).size,245);
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
  // Ladva's real snapshots no longer pass the country cutoff. Keep the reused
  // ID regression with a test-only stronger leader, without editing source data.
  const estonia=structuredClone(dataset.snapshots.find(s=>s.year===2018));
  estonia.countries=estonia.countries.filter(c=>c.federation==='EST');
  estonia.countries[0].players[0].rawRating=2700;
  const earlier=structuredClone(dataset.snapshots.find(s=>s.year===1994));
  earlier.countries=earlier.countries.filter(c=>c.federation==='EST');
  earlier.countries[0].players[0].rawRating=2700;
  const seed=buildSeed({...dataset,snapshots:[reference,estonia,earlier]},federations);
  assert.equal(seed.people.find(p=>p.name==='Marco Codenotti').id,'fide:800015');
  assert.equal(seed.people.find(p=>p.name==='Fernando Braga').id,'fide:811408');
  assert.equal(seed.people.find(p=>p.name==='Ottomar Ladva').id,'fide:4500024');
  assert.equal(seed.people.find(p=>p.name==='Lembit Oll').id,'historical:oll lembit');
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

test('the source cutoff excludes 2650, includes 2651 and retains all five source ratings',()=>{
  const dataset=JSON.parse(readFileSync(new URL('../data/fide-snapshots.json',import.meta.url)));
  const federations=JSON.parse(readFileSync(new URL('../data/federations.json',import.meta.url)));
  const reference=structuredClone(dataset.snapshots.find(s=>s.year===2026));
  const usa=reference.countries.find(c=>c.federation==='USA');
  const ratings=[2650,2400,2300,2200,2100];
  usa.players.forEach((p,i)=>p.rawRating=ratings[i]);
  reference.countries=[usa];
  assert.equal(buildSeed({...dataset,snapshots:[reference]},federations).snapshots.length,0);
  usa.players[0].rawRating=2651;
  const seed=buildSeed({...dataset,snapshots:[reference]},federations);
  assert.equal(seed.snapshots.length,1);
  assert.equal(seed.metadata.minimumTopRating,2650);
  assert.equal(seed.metadata.minimumTopRatingInclusive,false);
  assert.deepEqual(seed.editions.map(p=>p.rating),[2651,2400,2300,2200,2100]);
  assert.ok(seed.editions.every(p=>p.rating===p.raw_rating));
  assert.equal(seed.periods[0].adjustment,0);
});

test('era adjustments cannot admit a country below the source cutoff or exclude one above it',()=>{
  const dataset=JSON.parse(readFileSync(new URL('../data/fide-snapshots.json',import.meta.url)));
  const federations=JSON.parse(readFileSync(new URL('../data/federations.json',import.meta.url)));
  const reference=structuredClone(dataset.snapshots.find(s=>s.year===2026));reference.countries=[];
  const period=structuredClone(dataset.snapshots.find(s=>s.year===2000));
  const country=period.countries.find(c=>c.federation==='USA');period.countries=[country];
  country.players.forEach((p,i)=>p.rawRating=[2650,2400,2300,2200,2100][i]);
  period.reference.top100Ratings=reference.reference.top100Ratings.map(r=>r-100);
  const observations={...dataset,snapshots:[reference,period]};
  assert.equal(buildSeed(observations,federations).snapshots.length,0);
  country.players[0].rawRating=2651;
  const boosted=buildSeed(observations,federations);
  assert.equal(boosted.snapshots.length,1);assert.ok(boosted.editions[0].rating>2651);
  period.reference.top100Ratings=reference.reference.top100Ratings.map(r=>r+100);
  const reduced=buildSeed(observations,federations);
  assert.equal(reduced.snapshots.length,1);assert.ok(reduced.editions[0].rating<2650);
  assert.deepEqual(reduced.editions.map(p=>p.raw_rating),[2651,2400,2300,2200,2100]);
});
