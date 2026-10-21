import test from 'node:test';
import assert from 'node:assert/strict';
import {indexPeople,searchPeople} from '../dist/player-explorer.js';
const nations=[{id:'URS-1960',name:'Soviet Union'},{id:'FRA-2026',name:'France'}];
const editions=[
  {id:'old',personId:'one',name:'André Example',year:1960,rating:2700,nation:'URS-1960',federation:'URS'},
  {id:'new',personId:'one',name:'Andre Example',year:2026,rating:2750,nation:'FRA-2026',federation:'FRA'},
  {id:'namesake',personId:'two',name:'Andre Example',year:2026,rating:2600,nation:'FRA-2026',federation:'FRA'},
  {id:'legend',personId:'three',name:'Early Great',year:1859,rating:2840,offerKind:'legends',federation:null},
];
test('canonical search links aliases and editions without merging namesakes or modifying observations',()=>{
  const before=structuredClone(editions),people=indexPeople(editions,nations);
  assert.deepEqual(editions,before);assert.equal(people.length,3);
  assert.equal(searchPeople(people,{query:'ANDRÉ'}).length,2);
  assert.deepEqual(searchPeople(people,{query:'soviet 1960'}).map(p=>p.id),['one']);
  assert.deepEqual(people.find(p=>p.id==='one').editions.map(e=>e.id),['new','old']);
  assert.equal(searchPeople(people,{query:'<script>'}).length,0);
});
test('era and federation filters must match the same observed edition',()=>{
  const people=indexPeople(editions,nations);
  assert.equal(searchPeople(people,{country:'URS',era:'fide'}).length,0);
  assert.deepEqual(searchPeople(people,{era:'legends'}).map(p=>p.id),['three']);
  assert.equal(searchPeople(people,{country:'FRA',era:'fide'}).length,2);
  assert.equal(searchPeople(people,{query:'no match'}).length,0);
});
