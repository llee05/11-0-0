import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildHistoricalSnapshots} from '../server/historical.mjs';
const observations=JSON.parse(readFileSync(new URL('../data/historical-observations.json',import.meta.url)));
const audit=JSON.parse(readFileSync(new URL('../data/historical-affiliations.json',import.meta.url)));

test('1927 Soviet five comes from the independent rating order and has a complete higher-rank audit',()=>{
  const result=buildHistoricalSnapshots(observations,audit);
  const snapshot=result.snapshots[0];
  assert.equal(snapshot.source.type,'historical-estimate');
  assert.equal(snapshot.reference.top100Median,2511.5);
  assert.deepEqual(snapshot.countries[0].players.map(p=>[p.name,p.rawRating]),[['Peter Romanovsky',2627],['Boris Verlinsky',2611],['Fedor Bohatirchuk',2598],['Ilya Rabinovich',2577],['Grigory Levenfish',2570]]);
  assert.deepEqual(result,JSON.parse(readFileSync(new URL('../data/historical-snapshots.json',import.meta.url))));
});

test('an unaudited stronger player prevents publication of a historical country five',()=>{
  const incomplete=structuredClone(audit);
  incomplete.affiliations=incomplete.affiliations.filter(row=>row.sourcePlayerId!=='chessmetrics:129344');
  assert.throws(()=>buildHistoricalSnapshots(observations,incomplete),/Unaudited higher-ranked player: Sándor Takács/);
  const unsourced=structuredClone(audit);unsourced.affiliations[0].sources=[];
  assert.throws(()=>buildHistoricalSnapshots(observations,unsourced),/Unaudited higher-ranked player/);
});

test('two-year historical coverage retains an explicit gap instead of inventing a wartime roster',()=>{
  assert.equal(observations.length,23);
  const result=buildHistoricalSnapshots(observations,audit);
  assert.equal(result.snapshots.length,22);
  assert.deepEqual(result.snapshots.map(s=>s.year),[1927,...Array.from({length:22},(_,i)=>1928+i*2)].filter(y=>y!==1944));
  assert.equal(audit.unpublishedPeriods[0].year,1944);
  const usa=result.snapshots.find(s=>s.year===1932).countries[0];
  assert.deepEqual(usa.players.map(p=>p.name),['Isaac Kashdan','Al Horowitz','Frank Marshall','Alexander Kevitz','Abraham Kupchik']);
  const incomplete=structuredClone(audit);incomplete.affiliations=incomplete.affiliations.filter(r=>!(r.year===1932&&r.sourcePlayerId==='chessmetrics:72398'));
  assert.throws(()=>buildHistoricalSnapshots(observations,incomplete),/Unaudited higher-ranked player: Salo Landau/);
});

test('historical imports reject incomplete or contradictory country evidence and corrupted ranks',()=>{
  const fewer=structuredClone(audit);fewer.affiliations=fewer.affiliations.filter(row=>row.sourcePlayerId!=='chessmetrics:75152');
  assert.throws(()=>buildHistoricalSnapshots(observations,fewer),/Fewer than five/);
  const conflict=structuredClone(audit);conflict.affiliations.push(conflict.affiliations[0]);
  assert.throws(()=>buildHistoricalSnapshots(observations,conflict),/Contradictory/);
  const corrupted=structuredClone(observations);corrupted[0].players.reverse();
  assert.throws(()=>buildHistoricalSnapshots(corrupted,audit),/invalid top-100/);
  const duplicate=structuredClone(audit);duplicate.targets.push(duplicate.targets[0]);
  assert.throws(()=>buildHistoricalSnapshots(observations,duplicate),/Duplicate historical country/);
});

test('1952–1970 national fives follow complete higher-rank audits and keep emigration cases unresolved',()=>{
  const result=buildHistoricalSnapshots(observations,audit);
  const five=(year,code)=>result.snapshots.find(s=>s.year===year).countries.find(c=>c.federation===code)?.players.map(p=>p.name);
  assert.equal(audit.targets.length,54);
  assert.deepEqual(five(1960,'YUG'),['Svetozar Gligoric','Borislav Ivkov','Aleksandar Matanovic','Andrija Fuderer','Petar Trifunovic']);
  assert.deepEqual(five(1954,'ARG'),['Miguel Najdorf','Julio Bolbochán','Erich Eliskases','Herman Pilnik','Oscar Panno']);
  assert.deepEqual(five(1960,'USA'),['Bobby Fischer','Samuel Reshevsky','William Lombardy','Pal Benko','Larry Evans']);
  assert.equal(result.snapshots.find(s=>s.year===1968).countries.find(c=>c.federation==='CSR').players.find(p=>p.name==='Lubomir Kavalek').personId,'historical:kavalek lubomir');
  const row=(year,id)=>audit.affiliations.find(r=>r.year===year&&r.sourcePlayerId===id);
  // Defection years record exclusions only, not a guessed national affiliation.
  for(const [year,id,excluded] of [[1958,'chessmetrics:10653','HUN'],[1970,'chessmetrics:63226','USA']]){
    assert.equal(row(year,id).countryCode,null);assert.ok(row(year,id).excludedCountryCodes.includes(excluded));
  }
  const missing=structuredClone(audit);missing.affiliations=missing.affiliations.filter(r=>!(r.year===1960&&r.sourcePlayerId==='chessmetrics:10653'));
  assert.throws(()=>buildHistoricalSnapshots(observations,missing),/Unaudited higher-ranked player: Pal Benko \(1960\)/);
});
