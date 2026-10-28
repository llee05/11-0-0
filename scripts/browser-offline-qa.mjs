// Run against local SQL hosting or either static release, at root or a subpath.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const chromium=pw.chromium||pw.default?.chromium;
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_PATH||['/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/chromium-browser'].find(p=>existsSync(p));
const browser=await chromium.launch({...(executablePath?{executablePath}:{}),headless:true,args:['--no-sandbox']});
try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const home=new URL(process.env.QA_URL||'http://localhost:4173/');
  await page.goto(home.href);await page.getByRole('button',{name:'Quick draft'}).click();
  const saved=await page.evaluate(()=>localStorage.getItem('11-0-0:save:v4'));
  await page.getByRole('button',{name:'Saves & offline'}).click();
  await context.setOffline(true);await page.getByRole('button',{name:'Make available offline'}).click();
  await page.getByRole('button',{name:'Make available offline'}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('[data-action="enable-offline"]').disabled);
  assert.ok(!(await page.locator('#offline-status').textContent()).includes('available offline on this device'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('11-0-0:save:v4')),saved);
  await context.setOffline(false);await page.getByRole('button',{name:'Make available offline'}).click();
  await page.waitForFunction(()=>document.querySelector('#offline-status')?.textContent.includes('available offline on this device'),{},{timeout:35000});
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await page.keyboard.press('Escape');await context.setOffline(true);await page.reload();
  await page.getByRole('button',{name:'Enter the Olympiad'}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('11-0-0:save:v4')),saved);
  await page.getByRole('button',{name:'Enter the Olympiad'}).click();await page.getByRole('button',{name:'Preview next match'}).click();
  assert.equal(await page.locator('.match-forecast article').count(),4);
  await page.getByLabel('Board 1',{exact:true}).selectOption(await page.getByLabel('Board 2',{exact:true}).inputValue());
  await page.locator('#dialog [data-action="plan-play"]').click();
  await page.getByRole('button',{name:'Play round 2'}).waitFor();await page.getByRole('button',{name:'Auto-rotate & finish'}).click();
  await page.getByRole('button',{name:'Copy result'}).waitFor();assert.equal(await page.locator('.player-scoreboard tbody tr').count(),5);
  await page.getByRole('button',{name:'Full standings',exact:true}).click();assert.equal(await page.locator('.standings-row.full').count(),50);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('11-0-0:save:v4'))?.phase==='results'&&JSON.parse(localStorage.getItem('11-0-0:best-runs:v1'))?.runs.length===1);
  await page.reload();await page.getByRole('button',{name:'Copy result'}).waitFor();
  await page.getByRole('button',{name:'Best runs',exact:true}).click();assert.equal(await page.locator('.run-card').count(),1);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Saves & offline'}).click();assert.match(await page.locator('#offline-status').textContent(),/available offline/);
  await context.setOffline(false);assert.deepEqual(errors,[]);
  console.log(`Offline QA passed: ${home.href} · complete cached release, draft restore, board changes, 50-team tournament, reports and reloads without a connection.`);
}finally{await browser.close();}
