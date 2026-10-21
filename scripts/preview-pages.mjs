// Static-only preview. No SQLite, API handler or fallback to maintained source.
import {createServer} from 'node:http';
import {access,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';

const cloudflare=process.argv.includes('--cloudflare');
const target=cloudflare?'cloudflare':'pages';
const root=fileURLToPath(new URL(`../release/${target}/`,import.meta.url));
const base=process.env.PAGES_BASE_PATH||(cloudflare?'/':'/11-0-0/');
const port=Number(process.env.PORT||(cloudflare?4175:4174));
if(!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(base)||base.split('/').some(part=>part==='.'||part==='..')){
  throw new Error('PAGES_BASE_PATH must be / or a repository path such as /11-0-0/.');
}
try{await access(resolve(root,'index.html'));}
catch{throw new Error(`No static release found. Run npm run build:${target} first.`);}
const types={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
    if(base!=='/'&&url.pathname===base.slice(0,-1)){
      res.writeHead(308,{Location:base+url.search}).end();return;
    }
    if(!url.pathname.startsWith(base)){res.writeHead(404).end('Not found');return;}
    const relative=decodeURIComponent(url.pathname.slice(base.length));
    const path=resolve(root,relative+(relative.endsWith('/')||!relative?'index.html':''));
    if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`11–0–0 ${cloudflare?'Cloudflare':'GitHub'} Pages preview: http://localhost:${port}${base}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
