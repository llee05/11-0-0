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

test('historical imports reject incomplete or contradictory country evidence and corrupted ranks',()=>{
  const fewer=structuredClone(audit);fewer.affiliations=fewer.affiliations.filter(row=>row.sourcePlayerId!=='chessmetrics:75152');
  assert.throws(()=>buildHistoricalSnapshots(observations,fewer),/Fewer than five/);
  const conflict=structuredClone(audit);conflict.affiliations.push(conflict.affiliations[0]);
  assert.throws(()=>buildHistoricalSnapshots(observations,conflict),/Contradictory/);
  const corrupted=structuredClone(observations);corrupted[0].players.reverse();
  assert.throws(()=>buildHistoricalSnapshots(corrupted,audit),/invalid top-100/);
});
