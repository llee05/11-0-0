import test from 'node:test';
import assert from 'node:assert/strict';
import {rankEquivalent} from '../scripts/audit-era-ratings.mjs';

test('rank-equivalent study keeps ties equal, interpolates ratings and preserves observed tail gaps',()=>{
  const source=[2700,2600,2600,2500],reference=[2800,2750,2700,2600],before=[...source];
  assert.equal(rankEquivalent(2600,source,reference),2725);
  assert.equal(rankEquivalent(2650,source,reference),2763);
  assert.equal(rankEquivalent(2400,source,reference),2500);
  assert.deepEqual(source,before);
});

test('rank-equivalent study caps changes, remains monotone and preserves its own reference scale',()=>{
  const source=[2700,2600,2500],reference=[2800,2750,2700];let previous=-Infinity;
  for(let r=2200;r<=3000;r++){
    const value=rankEquivalent(r,source,reference);assert.ok(value>=previous);assert.ok(Math.abs(value-r)<=150);previous=value;
    assert.equal(rankEquivalent(r,reference,reference),r);
    assert.equal(rankEquivalent(r,source,reference,0),r);
  }
  assert.throws(()=>rankEquivalent(2600,[],reference));
  assert.throws(()=>rankEquivalent(2600,source,[2800]));
});
