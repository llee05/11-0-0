import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveStore} from '../dist/browser-saves.js';
const fixture=()=>{const values=new Map([['save','original']]);let writes=0;return {storage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);writes++;}},get writes(){return writes;}};};
const sharedLock=()=>{let tail=Promise.resolve();return fn=>{const result=tail.then(fn);tail=result.catch(()=>{});return result;};};
test('a second tab cannot overwrite a newer save, including simultaneous queued writes',async()=>{
  const f=fixture(),lock=sharedLock(),a=createSaveStore(f.storage,'save','original',lock),b=createSaveStore(f.storage,'save','original',lock);
  const results=await Promise.all([a.write('first'),b.write('stale')]);
  assert.equal(results[0].ok,true);assert.equal(results[1].conflict,true);assert.equal(f.storage.getItem('save'),'first');
  assert.equal(b.changed(),true);b.adopt('first');assert.equal((await b.write('adopted')).ok,true);
  assert.equal(a.changed(),true);
});
test('read-only renders make no writes and queued actions preserve their order',async()=>{
  const f=fixture(),store=createSaveStore(f.storage,'save','original',sharedLock());
  await store.write('original');assert.equal(f.writes,0);
  await Promise.all([store.write('draft'),store.write('round 1'),store.write('round 2')]);await store.flush();
  assert.equal(f.storage.getItem('save'),'round 2');assert.equal(store.raw,'round 2');assert.equal(f.writes,3);
});
test('storage errors are reported and do not corrupt the expected base or block later writes',async()=>{
  const f=fixture();let fail=true;const storage={...f.storage,setItem:(key,value)=>{if(fail)throw new Error('Quota');f.storage.setItem(key,value);}};
  const store=createSaveStore(storage,'save','original');await assert.rejects(store.write('new'),/Quota/);assert.equal(store.raw,'original');
  fail=false;assert.equal((await store.write('new')).ok,true);
  f.storage.setItem('save',null);assert.equal((await store.write('old')).conflict,true);
});
