import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BROWSER_ASSETS} from './browser-assets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function createOfflineWorker({directory,html,catalogueURL,catalogueText}){
  const entries=[{url:'./',sha256:hash(html)},...BROWSER_ASSETS.map(name=>({url:`./${name}`,sha256:hash(readFileSync(new URL(name,directory)))})),{url:catalogueURL,sha256:hash(catalogueText)}];
  const config={version:hash(JSON.stringify(entries)).slice(0,24),entries};
  return readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8').replace("JSON.parse('__OFFLINE_CONFIG__')",JSON.stringify(config));
}
