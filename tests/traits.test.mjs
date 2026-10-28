import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAITS, CAREER_PROFILES, traitById, rollTrait, rollTraits, careerProfile, validTraits, matchContext, validContext, matchupEffects} from '../dist/traits.js';
import {fixedProfile, rollProfile, validProfile} from '../dist/player-profile.js';
import {random} from '../dist/engine.js';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
import sourceRatings from '../data/fide-snapshots.json' with {type:'json'};
const db = openDatabase(':memory:');
const {players} = await readCatalogue(db);
db.close();

test('curated profiles identify sourced people, across editions and without namesake leakage', () => {
  assert.equal(CAREER_PROFILES.length, 116);
  assert.equal(new Set(CAREER_PROFILES.map(p => p.personId)).size, CAREER_PROFILES.length);
  for (const profile of CAREER_PROFILES) {
    const editions = players.filter(p => p.personId === profile.personId);
    if(!editions.length){
      // Raising the country cutoff can remove every playable edition of a
      // sourced player; their curated trait and preset still remain valid.
      assert.ok(sourceRatings.snapshots.some(s=>s.countries.some(c=>c.players.some(p=>`fide:${p.fideId}`===profile.personId))),profile.name);
      editions.push({personId:profile.personId});
    }
    assert.ok(traitById(profile.trait), profile.name);
    const preset = fixedProfile(editions[0]);
    for (const p of editions) {
      assert.equal(rollTrait(p, () => { throw Error('Do not reroll career traits'); }), profile.trait);
      assert.deepEqual(fixedProfile(p), preset);
      for (const formRoll of [0, 0.999]) {
        const rolled = rollProfile(p, () => formRoll);
        assert.deepEqual(rolled, {...preset, form:formRoll === 0 ? -2 : 2});
        assert.ok(validProfile(rolled, p));
      }
    }
    assert.ok(profile.source.startsWith('https://') && profile.reason.length > 30);
  }
  const modern = players.find(p => p.personId === 'fide:13301616');
  assert.ok(modern);
  assert.equal(careerProfile(modern), undefined);
  assert.equal(careerProfile({personId:'historical:petrosian tigran'}).trait, 'prophylaxis');
});

test('elite catalogue editions and recognizable historical players have fixed career traits', () => {
  // A coverage floor for future catalogue updates, not an automatic assignment rule.
  for (const p of players.filter(p => p.rawRating >= 2750)) assert.ok(careerProfile(p), `${p.name} ${p.year}`);
  for (const personId of ['fide:4168119', 'fide:12573981', 'fide:13401319', 'fide:738590', 'fide:4102142',
    'chessmetrics:63804', 'chessmetrics:16711', 'historical:reshevsky samuel h', 'fide:2000032', 'fide:703303', 'fide:400041']) {
    assert.ok(careerProfile({personId}), personId);
  }
});

test('unprofiled players can roll every trait or none, with a 25 percent empty interval', () => {
  const p = {id:'unknown', personId:'unknown'};
  assert.equal(rollTrait(p, () => 0), null);
  assert.equal(rollTrait(p, () => 0.249999), null);
  for (let i = 0; i < TRAITS.length; i++) assert.equal(rollTrait(p, () => 0.25 + (i + 0.5) * 0.75 / TRAITS.length), TRAITS[i].id);
  const rolls = rollTraits([p], () => 0);
  assert.ok(validTraits([p.id], rolls, () => p));
  for (const invalid of [{}, {unknown:undefined}, {unknown:'made-up'}, {unknown:null, extra:null}, []]) assert.equal(validTraits([p.id], invalid, () => p), false);
  const fixed = players.find(p => careerProfile(p));
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
      for (const e of [effects.a,effects.b]) assert.ok(Number.isFinite(e.bonus) && Math.abs(e.bonus)<=80 && Math.abs(e.draw)<=0.08);
    }
  }
  const rng = random(32);
  for (let i=0;i<100;i++) assert.ok(validContext(matchContext(rng)));
});

test('traits enable a lower-rated specialist to overtake a higher-rated player in a favorable condition', () => {
  const c = {kind:'technical', ending:'rook', timePressure:false};
  const effects = matchupEffects('rook',null,c,2600,2620);
  assert.equal(effects.a.bonus,80);
  assert.ok(2600+effects.a.bonus > 2620+effects.b.bonus);
  assert.equal(matchupEffects('rook','prophylaxis',c,2600,2620).a.bonus,40);
  assert.equal(matchupEffects('rook',null,{...c,ending:'minor'},2600,2620).a.bonus,0);
});


test('specialist peaks can overcome a meaningful rating gap and remain conditional',()=>{
  const sharp={kind:'sharp',ending:null,timePressure:false},quiet={...sharp,kind:'quiet'};
  assert.ok(2600+matchupEffects('attacker',null,sharp,2600,2650).a.bonus>2650);
  assert.ok(matchupEffects('attacker',null,quiet,2600,2650).a.bonus<0);
  assert.equal(matchupEffects('sacrificer',null,sharp,2600,2650).a.bonus,80);
  assert.equal(matchupEffects('sacrificer',null,sharp,2650,2600).a.bonus,64);
  assert.ok(matchupEffects('practical',null,{...quiet,timePressure:true},2600,2600).a.bonus>0);
  let previous=-Infinity;
  for(let rating=2450;rating<=2850;rating+=0.5){
    const effective=rating+matchupEffects('defender',null,quiet,rating,2650).a.bonus;
    assert.ok(effective>=previous);previous=effective;
  }
});

test('small defender penalties survive JSON saves without negative zero',()=>{
  const effects=matchupEffects('defender',null,{kind:'quiet',ending:null,timePressure:false},2711,2650);
  assert.equal(effects.a.bonus,0);
  assert.deepEqual(JSON.parse(JSON.stringify(effects)),effects);
});
