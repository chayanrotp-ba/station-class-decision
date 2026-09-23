import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRuntime,migrate} from '../dev-server.mjs';
const dataPath=await fs.mkdtemp(path.resolve('.test-data-'));let mf=await createRuntime(dataPath);await migrate(mf);
const request=async(p,init={},auth=true)=>{const headers=new Headers(init.headers);if(auth)headers.set('oai-authenticated-user-id','test-user');if(!['GET','HEAD'].includes(init.method||'GET')&&!headers.has('Origin'))headers.set('Origin','https://test.local');if(init.body instanceof FormData){const encoded=new Request('https://test.local'+p,{method:'POST',body:init.body});headers.set('Content-Type',encoded.headers.get('Content-Type'));init={...init,body:await encoded.arrayBuffer()};}return mf.dispatchFetch('https://test.local'+p,{...init,headers});};
const parse=async r=>{assert.equal(r.status,200);return r.json();};
try{
 assert.equal((await request('/api/stations',{},false)).status,401);
 let r=await parse(await request('/api/stations'));assert.equal(r.stations.length,85);assert.equal(r.stations.filter(s=>s.masterNotes.some(n=>n.includes('พิกัด'))).length,10);
 const id=40;const original=await parse(await request('/api/stations/'+id));assert.equal(original.lon,100.235827);
 const body={displayName:'ทดสอบชื่อสถานี',notes:'ทดสอบการบันทึกถาวร',revision:0};
 r=await parse(await request('/api/stations/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));assert.equal(r.revision,1);
 assert.equal((await request('/api/stations/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status,409);
 assert.equal((await request('/api/stations/'+id,{method:'PUT',headers:{Origin:'https://other.local'},body:'{}'})).status,403);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6L1sAAAAASUVORK5CYII=','base64');
 const uploaded=[];for(const name of ['first.png','second.png']){const f=new FormData();f.set('file',new File([png],name,{type:'image/png'}));const upload=await request('/api/stations/'+id+'/photos',{method:'POST',body:f});const uploadedData=await upload.json();assert.equal(upload.status,201,JSON.stringify(uploadedData));r=uploadedData;uploaded.push(r.photos.at(-1).id);}
 assert.equal(r.photos.length,2);assert.deepEqual(r.photos.map(p=>p.filename),['first.png','second.png']);
 let file=await request(r.photos[0].url);assert.equal(file.status,200);assert.equal(file.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);
 const f=new FormData();f.set('file',new File(['<svg onload="alert(1)">'],'bad.svg',{type:'image/svg+xml'}));assert.equal((await request('/api/stations/'+id+'/photos',{method:'POST',body:f})).status,415);
 assert.equal((await request('/api/stations/999/photos',{method:'POST',body:f})).status,404);
 const tooLarge=new FormData();tooLarge.set('file',new File([new Uint8Array(10*1024*1024+1)],'large.png',{type:'image/png'}));assert.equal((await request('/api/stations/'+id+'/photos',{method:'POST',body:tooLarge})).status,413);
 await mf.dispose();mf=await createRuntime(dataPath);await migrate(mf);
 r=await parse(await request('/api/stations/'+id));assert.equal(r.displayName,body.displayName);assert.equal(r.notes,body.notes);assert.equal(r.photos.length,2);assert.equal(r.lon,original.lon);assert.equal(r.score,original.score);assert.equal(r.class,original.class);
 await parse(await request('/api/photos/'+uploaded[0],{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({caption:'ภาพด้านหน้า'})}));
 await parse(await request('/api/photos/'+uploaded[1],{method:'DELETE'}));r=await parse(await request('/api/stations/'+id));assert.equal(r.photos.length,1);assert.equal(r.photos[0].caption,'ภาพด้านหน้า');assert.equal((await request('/api/photos/'+uploaded[1]+'/file')).status,404);
 const bucket=await mf.getR2Bucket('BUCKET');assert.equal((await bucket.list()).objects.length,1);
 assert.equal((await request('/api/gis/unknown')).status,404);assert.equal((await request('/api/gis/major')).status,400);
 console.log('PASS: auth, CSRF, 85 master rows, Excel coordinates, optimistic concurrency, 2 image uploads, binary retrieval, captions, deletion, validation, D1/R2 persistence across runtime restart.');
}finally{await mf.dispose();if(dataPath.startsWith(path.resolve('.test-data-')))await fs.rm(dataPath,{recursive:true,force:true});}
