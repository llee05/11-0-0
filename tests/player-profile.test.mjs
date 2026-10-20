import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLES,SWINGS,fixedProfile,rollProfile,rollProfiles,validProfile,validProfiles,profileFatigue,performanceSwing,styleEffect,captainBonus,bestCaptain,nextForm,restedForm,performanceSeed} from '../dist/player-profile.js';
import {random} from '../dist/engine.js';

const unknown={id:'u',personId:'unprofiled',rating:2600};
test('profiles roll bounded attributes and form, while signature presets stay fixed across editions',()=>{
  const magnus={id:'magnus-2026',personId:'fide:1503014'};
  const expected=fixedProfile(magnus);
  assert.equal(expected.stamina,5);
  for(let seed=0;seed<100;seed++){
    assert.ok(validProfile(rollProfile(unknown,random(seed)),unknown));
    const profile=rollProfile(magnus,random(seed));
    assert.ok(validProfile(profile,magnus));
    for(const key of Object.keys(expected))assert.equal(profile[key],expected[key]);
    assert.deepEqual(fixedProfile({...magnus,id:'magnus-2014'}),expected);
  }
  assert.equal(rollProfile(unknown,()=>0).form,-2);
  assert.equal(rollProfile(unknown,()=>0.999).form,2);
  const map=rollProfiles([unknown],random(1));assert.ok(validProfiles(['u'],map,()=>unknown));
  for(const profile of [{...map.u,stamina:0},{...map.u,captaincy:6},{...map.u,consistency:1.5},{...map.u,form:3},{...map.u,style:'made-up'},{...map.u,extra:true}])assert.equal(validProfile(profile,unknown),false);
  assert.equal(validProfiles(['u'],{},()=>unknown),false);
  assert.equal(validProfile({...rollProfile(magnus,()=>0),stamina:1},magnus),false);
});
test('stamina delays fatigue and the existing grinder resistance still applies',()=>{
  assert.equal(profileFatigue(null,2,{stamina:1}),8);
  assert.equal(profileFatigue(null,4,{stamina:3}),8);
  assert.equal(profileFatigue(null,5,{stamina:5}),0);
  assert.equal(profileFatigue(null,6,{stamina:5}),8);
  assert.equal(profileFatigue('grinder',6,{stamina:5}),4);
  assert.equal(profileFatigue(null,99,{stamina:5}),40);
});
test('only one captain supplies a bounded team bonus, with half influence from the reserve',()=>{
  const lineup=['a','b','c','d','e'],profiles=Object.fromEntries(lineup.map(id=>[id,{captaincy:3}]));
  profiles.e.captaincy=5;
  assert.equal(bestCaptain(lineup,profiles,()=>unknown),'e');
  assert.equal(captainBonus('e',lineup,profiles,'a'),6);
  assert.equal(captainBonus('e',lineup,profiles,'e'),0);
  const rotated=['e','b','c','d','a'];
  assert.equal(captainBonus('e',rotated,profiles,'b'),12);
  assert.equal(captainBonus('b',lineup,profiles,'a'),6);
});
test('styles have symmetric rules, consistency narrows daily swings and form evolves around expectations',()=>{
  for(const a of STYLES)for(const b of STYLES)for(const kind of ['sharp','quiet','technical','theory']){
    const effect=styleEffect(a.id,b.id,{kind});
    assert.ok(Math.abs(effect.bonus)<=16&&Math.abs(effect.draw)<=0.04);
  }
  for(let c=1;c<=5;c++){
    assert.equal(performanceSwing(c,()=>0),-SWINGS[c]);
    assert.equal(performanceSwing(c,()=>0.99999),SWINGS[c]);
    assert.equal(performanceSwing(c,()=>0.5),0);
  }
  assert.equal(nextForm(0,1,0.5),1);assert.equal(nextForm(0,0,0.5),-1);
  assert.equal(nextForm(0,0.5,0.2),1);assert.equal(nextForm(0,0.5,0.8),-1);
  assert.equal(nextForm(0,0.5,0.5),0);assert.equal(nextForm(2,1,0.1),2);
  assert.equal(nextForm(-2,0,0.9),-2);assert.equal(restedForm(-2),-1);assert.equal(restedForm(2),1);
  assert.equal(performanceSeed(1,2,'YOU','p'),performanceSeed(1,2,'YOU','p'));
  assert.notEqual(performanceSeed(1,2,'YOU','p'),performanceSeed(1,3,'YOU','p'));
  assert.notEqual(performanceSeed(1,2,'YOU','p'),performanceSeed(1,2,'AI','p'));
});
