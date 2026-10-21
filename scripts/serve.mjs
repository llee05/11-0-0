import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {gzipSync} from 'node:zlib';
import {openDatabase} from '../server/sqlite.mjs';
import {readCatalogue} from '../server/catalog.mjs';
import {createOfflineWorker} from './offline-worker.mjs';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.PORT||4173);
const db=openDatabase();
const catalogue=await readCatalogue(db);
const catalogueJson=JSON.stringify(catalogue),catalogueGzip=gzipSync(catalogueJson);
const offlineWorker=createOfflineWorker({directory:new URL('../dist/',import.meta.url),html:await readFile(resolve(root,'index.html'),'utf8'),catalogueURL:'/api/catalog',catalogueText:catalogueJson});
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
    if(url.pathname==='/sw.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:offlineWorker);return;}
    if(url.pathname==='/api/catalog'){
      const compressed=String(req.headers['accept-encoding']).includes('gzip');
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-cache',Vary:'Accept-Encoding',...(compressed?{'Content-Encoding':'gzip'}:{})});
      res.end(req.method==='HEAD'?undefined:compressed?catalogueGzip:catalogueJson);return;
    }
    const path=resolve(root,'.'+decodeURIComponent(url.pathname).replace(/\/$/,'/index.html'));
    if(!path.startsWith(root.endsWith(sep)?root:root+sep)) {res.writeHead(403).end();return;}
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'})[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
  } catch {res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`11–0–0 is ready at http://localhost:${port} · ${catalogue.metadata.snapshotCount} draft offers from SQLite`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
