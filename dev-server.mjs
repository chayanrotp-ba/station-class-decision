import {Miniflare} from 'miniflare';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const root=path.resolve('dist/client'),port=Number(process.env.PORT||8765),persist=path.resolve(process.env.STATION_DATA_PATH||'.local-data');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png','.pdf':'application/pdf','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
export async function createRuntime(dataPath=persist){
 return new Miniflare({modules:true,scriptPath:path.resolve('dist/server/index.js'),compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],d1Persist:path.join(dataPath,'d1'),r2Buckets:['BUCKET'],r2Persist:path.join(dataPath,'r2'),serviceBindings:{
  ASSETS:async request=>{
   let pathname=decodeURIComponent(new URL(request.url).pathname);if(pathname==='/')pathname='/index.html';
   const filename=path.resolve(root,'.'+pathname);
   if(!filename.startsWith(root+path.sep))return new Response('Not found',{status:404});
   try{return new Response(await fs.readFile(filename),{headers:{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'}});}
   catch{return new Response('Not found',{status:404});}
  }
 }});
}
export async function migrate(mf){const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)').run();const files=(await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();for(const file of files){if(await db.prepare('SELECT name FROM local_migrations WHERE name=?').bind(file).first())continue;const sql=await fs.readFile('drizzle/'+file,'utf8');for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();await db.prepare('INSERT INTO local_migrations (name) VALUES (?)').bind(file).run();}}
if(process.argv[1]===new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1').replaceAll('/',path.sep)||process.argv[1]?.endsWith('dev-server.mjs')){
 const mf=await createRuntime();await migrate(mf);const server=http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview-user');const response=await mf.dispatchFetch(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body){for await(const chunk of response.body)res.write(chunk);}res.end();}catch(e){console.error(e.message);res.writeHead(500);res.end('Preview error');}});server.listen(port,'127.0.0.1',()=>console.log(`Local preview: http://127.0.0.1:${port}/ (local storage: ${persist})`));const stop=()=>{server.close();void mf.dispose().then(()=>process.exit());};process.on('SIGINT',stop);process.on('SIGTERM',stop);
}

