import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAITS, SIGNATURE_PROFILES, rollTrait, rollTraits, signatureProfile, validTraits, fatiguePenalty, matchContext, validContext, matchupEffects} from '../dist/traits.js';
import {random} from '../dist/engine.js';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
const db = openDatabase(':memory:');
const {players} = await readCatalogue(db);
db.close();

test('curated profiles identify real catalogue people, across editions and without namesake leakage', () => {
  assert.equal(SIGNATURE_PROFILES.length, 28);
  assert.equal(new Set(SIGNATURE_PROFILES.map(p => p.personId)).size, 28);
  for (const profile of SIGNATURE_PROFILES) {
    const editions = players.filter(p => p.personId === profile.personId);
    assert.ok(editions.length, profile.name);
    for (const p of editions) assert.equal(rollTrait(p, () => { throw Error('Do not reroll signatures'); }), profile.trait);
    assert.ok(profile.source.startsWith('https://') && profile.reason.length > 30);
  }
  const modern = players.find(p => p.personId === 'fide:13301616');
  assert.ok(modern);
  assert.equal(signatureProfile(modern), undefined);
  assert.equal(signatureProfile({personId:'historical:petrosian tigran'}).trait, 'prophylaxis');
});

test('unprofiled players can roll every trait or none, with a 25 percent empty interval', () => {
  const p = {id:'unknown', personId:'unknown'};
  assert.equal(rollTrait(p, () => 0), null);
  assert.equal(rollTrait(p, () => 0.249999), null);
  for (let i = 0; i < TRAITS.length; i++) assert.equal(rollTrait(p, () => 0.25 + (i + 0.5) * 0.75 / TRAITS.length), TRAITS[i].id);
  const rolls = rollTraits([p], () => 0);
  assert.ok(validTraits([p.id], rolls, () => p));
  for (const invalid of [{}, {unknown:undefined}, {unknown:'made-up'}, {unknown:null, extra:null}, []]) assert.equal(validTraits([p.id], invalid, () => p), false);
  const fixed = players.find(p => signatureProfile(p));
  assert.equal(validTraits([fixed.id], {[fixed.id]:null}, () => fixed), false);
});

test('all matchup effects are finite, bounded and symmetric across traits and contexts', () => {
  const ids = [null, ...TRAITS.map(t => t.id)];
  for (const kind of ['theory','sharp','quiet','technical']) for (const timePressure of [false,true]) for (const ending of kind === 'technical' ? ['rook','minor'] : [null]) {
    const c = {kind, timePressure, ending}; assert.ok(validContext(c));
    for (const a of ids) for (const b of ids) for (const difference of [-300,0,300]) {
      const effects = matchupEffects(a,b,c,2600+difference,2600);
      const reverse = matchupEffects(b,a,c,2600,2600+difference);
      assert.deepEqual(effects.a, reverse.b);
      for (const e of [effects.a,effects.b]) assert.ok(Number.isFinite(e.bonus) && Math.abs(e.bonus)<=40 && Math.abs(e.draw)<=0.08);
    }
  }
  const rng = random(32);
  for (let i=0;i<100;i++) assert.ok(validContext(matchContext(rng)));
});

test('traits enable a lower-rated specialist to overtake a higher-rated player in a favorable condition', () => {
  const c = {kind:'technical', ending:'rook', timePressure:false};
  const effects = matchupEffects('rook',null,c,2600,2620);
  assert.equal(effects.a.bonus,36);
  assert.ok(2600+effects.a.bonus > 2620+effects.b.bonus);
  assert.equal(matchupEffects('rook','prophylaxis',c,2600,2620).a.bonus,18);
  assert.equal(matchupEffects('rook',null,{...c,ending:'minor'},2600,2620).a.bonus,0);
  assert.equal(fatiguePenalty(null,5),16);
  assert.equal(fatiguePenalty('grinder',5),8);
  assert.equal(fatiguePenalty(null,30),40);
});
