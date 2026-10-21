import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createOfflineWorker} from '../scripts/offline-worker.mjs';
import {BROWSER_ASSETS} from '../scripts/browser-assets.mjs';
const directory=new URL('../dist/',import.meta.url),html=readFileSync(new URL('index.html',directory),'utf8'),catalogueText='{"metadata":{"release":"test"}}';
function environment(scope='https://chess.test/repo/',corrupt=false){
  const handlers={},data=new Map(),responses=new Map([[scope,html],[new URL('catalog.json',scope).href,catalogueText],...BROWSER_ASSETS.map(name=>[new URL(name,scope).href,readFileSync(new URL(name,directory))])]);
  let connected=true,claimed=false,activated=false;
  const caches={keys:async()=>[...data.keys()],delete:async key=>data.delete(key),open:async key=>{
    if(!data.has(key))data.set(key,new Map());const cache=data.get(key);
    return {put:async(url,response)=>cache.set(String(url),response.clone()),match:async url=>cache.get(String(url))?.clone()};
  }};
  const source=createOfflineWorker({directory,html,catalogueURL:'./catalog.json',catalogueText});
  runInNewContext(source,{self:{registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{activated=true;}},caches,crypto:webcrypto,URL,Request,Uint8Array,fetch:async req=>{
    if(!connected)throw new Error('Offline');const body=responses.get(req.url);return new Response(corrupt&&req.url.endsWith('engine.js')?'mismatched release':body,{status:body===undefined?404:200});
  }});
  const lifecycle=async name=>{let promise;handlers[name]({waitUntil:p=>promise=p});await promise;};
  const request=async(url,method='GET')=>{let response;handlers.fetch({request:new Request(url,{method}),respondWith:p=>response=p});return response?await response:null;};
  return {handlers,lifecycle,request,data,source,disconnect:()=>connected=false,get claimed(){return claimed;},get activated(){return activated;}};
}
test('one complete verified cohort serves the app, catalogue and assets offline under root and repository paths',async()=>{
  for(const scope of ['https://chess.test/','https://chess.test/repo/']){
    const e=environment(scope);e.data.set('another-app',new Map());e.data.set(`11-0-0-offline:${new URL(scope).pathname}:old`,new Map());
    await e.lifecycle('install');assert.equal(e.activated,false);await e.lifecycle('activate');assert.equal(e.claimed,true);assert.equal(e.data.size,2);assert.ok(e.data.has('another-app'));e.disconnect();
    for(const name of ['', 'index.html','app.js','engine.js','catalog.json','fonts/manrope.ttf'])assert.equal((await e.request(new URL(name,scope))).status,200,name);
    assert.equal(await (await e.request(new URL('catalog.json',scope))).text(),catalogueText);
    assert.equal(await e.request(new URL('missing/nested/page',scope)),null);assert.equal(await e.request('https://other.test/app.js'),null);
    e.handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(e.activated,true);
  }
});
test('a corrupt release never publishes a partial offline cache',async()=>{
  const e=environment(undefined,true);e.data.set('other-release',new Map());
  await assert.rejects(e.lifecycle('install'),/release changed/);assert.deepEqual([...e.data.keys()],['other-release']);
});
test('worker versions are reproducible and change with catalogue bytes or HTML',()=>{
  const worker=createOfflineWorker({directory,html,catalogueURL:'./catalog.json',catalogueText});
  assert.equal(worker,createOfflineWorker({directory,html,catalogueURL:'./catalog.json',catalogueText}));
  assert.notEqual(worker,createOfflineWorker({directory,html:html+' ',catalogueURL:'./catalog.json',catalogueText}));
  assert.notEqual(worker,createOfflineWorker({directory,html,catalogueURL:'./catalog.json',catalogueText:catalogueText+' '}));
  assert.ok(worker.includes(createHash('sha256').update(catalogueText).digest('hex')));assert.ok(!worker.includes("JSON.parse('__OFFLINE_CONFIG__')"));
});
