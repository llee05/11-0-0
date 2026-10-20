// Focused hosting checks; use browser-qa.mjs for the complete gameplay flow.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const home=new URL(process.env.QA_URL||'http://localhost:4174/11-0-0/');
assert.ok(home.pathname.endsWith('/'),'QA_URL must end with /');
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage(),requests=[],responses=[],errors=[];
  page.on('request',request=>requests.push(new URL(request.url())));
  page.on('response',response=>responses.push(response.status()));
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(home.href);await page.getByRole('button',{name:'Quick draft'}).waitFor();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('meta[name="catalogue-url"]').getAttribute('content'),'./catalog.json');
  assert.ok(requests.some(url=>url.pathname===home.pathname+'catalog.json'));
  assert.ok(requests.every(url=>url.origin===home.origin&&url.pathname.startsWith(home.pathname)),requests.map(url=>url.href).join('\n'));
  assert.ok(responses.every(status=>status===200));assert.deepEqual(errors,[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

  for(const asset of ['catalog.json','app.js','engine.js','traits.js','player-profile.js','styles.css','favicon.svg','king.svg','knight.svg','fonts/manrope.ttf','fonts/dm-sans.ttf','fonts/manrope-LICENSE.txt','fonts/dm-sans-LICENSE.txt']){
    const response=await context.request.get(new URL(asset,home).href);
    assert.equal(response.status(),200,asset);
    if(asset==='catalog.json')assert.match(response.headers()['content-type'],/^application\/json/);
    if(asset.endsWith('.js'))assert.match(response.headers()['content-type'],/^(?:text|application)\/javascript/);
  }
  for(const path of ['/api/catalog',home.pathname+'api/catalog',home.pathname+'.openai/hosting.json',home.pathname+'server/index.js',home.pathname+'data/fide-snapshots.json']){
    assert.equal((await context.request.get(new URL(path,home).href)).status(),404,path);
  }
  if(home.pathname!=='/'){
    assert.equal((await context.request.get(new URL('/catalog.json',home).href)).status(),404);
    const redirect=await context.request.get(home.href.slice(0,-1),{maxRedirects:0});
    assert.equal(redirect.status(),308);assert.equal(redirect.headers().location,home.pathname);
  }

  await page.getByRole('button',{name:'Quick draft'}).click();
  assert.equal(await page.locator('.squad-slot.filled').count(),5);
  const saved=await page.evaluate(()=>localStorage.getItem('11-0-0:save:v4'));
  const catalogueURL=new URL('catalog.json',home).href;
  // Missing and malformed exports preserve saves and recover via the retry link.
  for(const [status,body] of [[503,'Unavailable'],[200,'{"metadata":null}']]){
    await page.route(catalogueURL,route=>route.fulfill({status,contentType:'application/json',body}));
    await page.reload();await page.getByRole('heading',{name:'The archive is taking a moment.'}).waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('11-0-0:save:v4')),saved);
    await page.unroute(catalogueURL);
    await page.getByRole('link',{name:'Try again'}).click();
    await page.locator('.squad-slot.filled').first().waitFor();
    assert.equal(await page.locator('.squad-slot.filled').count(),5);
    assert.equal(await page.evaluate(()=>localStorage.getItem('11-0-0:save:v4')),saved);
  }
  assert.deepEqual(errors,['Catalogue unavailable','Invalid rating catalogue.']);
  console.log(`Pages QA passed: ${home.href} · relative assets, JSON catalogue, no API/backend, mobile layout, save preservation and catalogue retry.`);
}finally{await browser.close();}
