import BASE from '../analysis/master-data.json';
import {database} from './db.js';
const MAX_IMAGE=10*1024*1024;
const BASE_URL='https://gis-portal.disaster.go.th/arcgis/rest/services/';
const GIS={major:'04Hydro_MajorStream/FeatureServer/0',minor:'04Hydro_MinorStream/FeatureServer/0',flow:'Map116/DPM_FLOW_DIRECTION_DSS/FeatureServer/0',province:'Map116/DPM_TH_Province_DSS/FeatureServer/1',district:'Map116/DPM_TH_Amphoe_DSS/FeatureServer/1',subdistrict:'Map116/DPM_TH_Tambon_DSS/FeatureServer/1',mask:'Hosted/Province_Gray/FeatureServer/0',rainfall:'Hosted/Rainfall_data_freq2/FeatureServer/0',risk:'Hosted/Tambon_DDPM_Prov_risk/FeatureServer/0'};
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function fail(msg,status=400){const e=new Error(msg);e.status=status;throw e;}
function baseStation(id){const r=BASE.stations.find(r=>r.id===Number(id));if(!r)fail('ไม่พบจุดติดตั้ง',404);return r;}
async function boundedBody(request,max){if(Number(request.headers.get('Content-Length'))>max)fail('ไฟล์หรือข้อมูลใหญ่เกินขนาดที่รองรับ',413);const chunks=[];let size=0;const reader=request.body?.getReader();if(!reader)return new Uint8Array();try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();fail('ไฟล์หรือข้อมูลใหญ่เกินขนาดที่รองรับ',413);}chunks.push(value);}}finally{reader.releaseLock();}const data=new Uint8Array(size);let off=0;for(const c of chunks){data.set(c,off);off+=c.length;}return data;}
async function readJSON(req){try{return JSON.parse(new TextDecoder().decode(await boundedBody(req,20000)));}catch(e){if(e.status)throw e;fail('รูปแบบข้อมูลไม่ถูกต้อง');}}
const photoPublic=p=>({id:p.id,stationId:p.station_id,filename:p.filename,caption:p.caption,size:p.size,createdAt:p.created_at,url:'/api/photos/'+p.id+'/file'});
async function getStation(db,id){const base=baseStation(id);const master=await db.first('SELECT * FROM station_master WHERE station_id=?',base.id);const photos=await db.all('SELECT * FROM station_photos WHERE station_id=? ORDER BY created_at,id',base.id);return {...base,displayName:master?.display_name??base.masterName,notes:master?.notes??'',revision:master?.revision??0,updatedAt:master?.updated_at??null,photos:photos.map(photoPublic)};}
function imageType(b){if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';if([137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))return 'image/png';const t=new TextDecoder().decode(b.slice(0,12));if(t.startsWith('RIFF')&&t.slice(8)==='WEBP')return 'image/webp';return null;}
async function gis(request,key){
 if(!GIS[key])fail('ไม่พบชั้นข้อมูล',404);
 const url=new URL(request.url),q=new URLSearchParams({f:'geojson',where:'1=1',outFields:'*',outSR:'4326',returnGeometry:'true',resultRecordCount:'1000',resultOffset:'0'});
 const prov=url.searchParams.get('province'),provinceList=(url.searchParams.get('provinces')||'').split('|').filter(Boolean),scoped=['province','district','subdistrict','flow','risk','rainfall'];if(prov&&prov!=='all'&&!BASE.stations.some(s=>s.province===prov))fail('จังหวัดไม่ถูกต้อง');if(scoped.includes(key)){const names=prov&&prov!=='all'?[prov]:provinceList;if(names.length){if(names.some(name=>!BASE.stations.some(s=>s.province===name)))fail('จังหวัดไม่ถูกต้อง');const field=key==='rainfall'?'prov_nam_t':'PROV_NAM_T',safe=names.map(name=>`'${name.replace(/'/g,"''")}'`).join(',');q.set('where',`${field} IN (${safe})`);}}
 const bbox=url.searchParams.get('bbox');if(bbox){const b=bbox.split(',').map(Number);if(b.length!==4||!b.every(Number.isFinite)||b[0]<-180||b[2]>180||b[1]<-90||b[3]>90||b[0]>=b[2]||b[1]>=b[3])fail('ขอบเขตไม่ถูกต้อง');q.set('geometry',JSON.stringify({xmin:b[0],ymin:b[1],xmax:b[2],ymax:b[3],spatialReference:{wkid:4326}}));q.set('geometryType','esriGeometryEnvelope');q.set('inSR','4326');q.set('spatialRel','esriSpatialRelIntersects');}
 if(['major','minor'].includes(key)&&!bbox)fail('กรุณาระบุขอบเขตแผนที่');
 const offset=Number(url.searchParams.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>20000)fail('ลำดับหน้าไม่ถูกต้อง');q.set('resultOffset',String(offset));
 const tolerance=Number(url.searchParams.get('tolerance')||0.001);if(!Number.isFinite(tolerance)||tolerance<0.000001||tolerance>0.05)fail('ความละเอียดไม่ถูกต้อง');q.set('maxAllowableOffset',String(tolerance));
 let res;try{res=await fetch(BASE_URL+GIS[key]+'/query?'+q,{signal:AbortSignal.timeout(20000),cf:{cacheTtl:300,cacheEverything:true}});}catch{fail('ติดต่อชั้นข้อมูล ปภ. ไม่สำเร็จ กรุณาลองใหม่',502);}
 if(!res.ok)fail('บริการชั้นข้อมูล ปภ. ตอบกลับ '+res.status,502);
 const data=JSON.parse(new TextDecoder().decode(await boundedBody(res,12*1024*1024)));
 if(data.error)fail('บริการ ปภ.: '+(data.error.message||'ไม่สามารถโหลดข้อมูล'),502);
 if(!Array.isArray(data.features))fail('รูปแบบชั้นข้อมูลไม่ถูกต้อง',502);
 // The supplied province service has no Satun record. Preserve the official
 // district geometries as a MultiPolygon and explicitly disclose the fallback.
 if(key==='province'&&(!prov||prov==='all'||prov==='สตูล')&&!data.features.some(f=>f.properties?.PROV_NAM_T==='สตูล')){
  const satunQ=new URLSearchParams({f:'geojson',where:"PROV_NAM_T='สตูล'",outFields:'PROV_NAM_T',outSR:'4326',returnGeometry:'true',maxAllowableOffset:String(tolerance)});
  const satunRes=await fetch(BASE_URL+GIS.district+'/query?'+satunQ,{signal:AbortSignal.timeout(20000),cf:{cacheTtl:300,cacheEverything:true}});
  if(!satunRes.ok)fail('โหลดขอบเขตอำเภอสำหรับสตูลไม่สำเร็จ',502);
  const satun=JSON.parse(new TextDecoder().decode(await boundedBody(satunRes,5*1024*1024)));
  if(satun.error||!satun.features?.length)fail('ยังไม่มีขอบเขตสตูลจากบริการ ปภ.',502);
  const coordinates=satun.features.flatMap(f=>f.geometry?.type==='Polygon'?[f.geometry.coordinates]:f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[]);
  data.features.push({type:'Feature',properties:{PROV_NAM_T:'สตูล',boundary_source:'ขอบเขตอำเภอ ปภ. '+satun.features.length+' แห่ง',fallback:true},geometry:{type:'MultiPolygon',coordinates}});
  data.sourceNote='สตูลใช้ขอบเขตอำเภอ '+satun.features.length+' แห่ง เพราะชั้นจังหวัดไม่มีรายการสตูล';
 }
 return json({...data,source:BASE_URL+GIS[key],nextOffset:data.exceededTransferLimit||data.properties?.exceededTransferLimit?offset+data.features.length:null});
}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 try{
  const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'กรุณาเข้าสู่ระบบเพื่อจัดการข้อมูล'},401);
  if(!['GET','HEAD'].includes(request.method)){const origin=request.headers.get('Origin');if(!origin||origin!==url.origin)fail('ไม่อนุญาตคำขอจากเว็บไซต์อื่น',403);}
  const g=path.match(/^\/api\/gis\/([a-z]+)$/);if(g&&request.method==='GET')return await gis(request,g[1]);
  const db=database(env);
  if(path==='/api/stations'&&request.method==='GET'){
   const [masters,photos]=await Promise.all([db.all('SELECT * FROM station_master'),db.all('SELECT station_id,COUNT(*) AS count FROM station_photos GROUP BY station_id')]);
   return json({stations:BASE.stations.map(s=>{const m=masters.find(m=>m.station_id===s.id);return {...s,displayName:m?.display_name??s.masterName,notes:m?.notes??'',revision:m?.revision??0,photoCount:photos.find(p=>p.station_id===s.id)?.count??0};}),storage:'server'});
  }
  const sm=path.match(/^\/api\/stations\/(\d+)$/);
  if(sm){const b=baseStation(sm[1]);if(request.method==='GET')return json(await getStation(db,b.id));
   if(request.method==='PUT'){
    const data=await readJSON(request);if(typeof data.displayName!=='string'||!data.displayName.trim()||data.displayName.length>250||typeof data.notes!=='string'||data.notes.length>6000||!Number.isInteger(data.revision)||data.revision<0)fail('กรุณาตรวจชื่อสถานที่และหมายเหตุ');
    const current=await db.first('SELECT revision FROM station_master WHERE station_id=?',b.id);if((current?.revision??0)!==data.revision)fail('ข้อมูลถูกแก้ไขจากหน้าต่างอื่น กรุณาโหลดข้อมูลใหม่ก่อนบันทึก',409);
    const timestamp=new Date().toISOString();let result;
    if(current)result=await db.run('UPDATE station_master SET display_name=?,notes=?,revision=revision+1,updated_at=?,updated_by=? WHERE station_id=? AND revision=?',data.displayName.trim(),data.notes,timestamp,user,b.id,data.revision);
    else result=await db.run('INSERT INTO station_master (station_id,display_name,notes,revision,updated_at,updated_by) VALUES (?,?,?,1,?,?) ON CONFLICT(station_id) DO NOTHING',b.id,data.displayName.trim(),data.notes,timestamp,user);
    if(!result.meta.changes)fail('ข้อมูลถูกแก้ไขจากหน้าต่างอื่น กรุณาโหลดใหม่',409);return json(await getStation(db,b.id));
   }
  }
  const upload=path.match(/^\/api\/stations\/(\d+)\/photos$/);
  if(upload&&request.method==='POST'){
   const b=baseStation(upload[1]);if(!env.BUCKET)throw new Error('STORAGE_UNAVAILABLE');
   const bytes=await boundedBody(request,MAX_IMAGE+65536);
   let form;try{form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')||''},body:bytes}).formData();}catch{fail('ข้อมูลรูปภาพไม่ถูกต้อง');}
   const file=form.get('file'),caption=String(form.get('caption')||'');
   if(!file||typeof file==='string'||file.size===0)fail('กรุณาเลือกรูปภาพ');if(file.size>MAX_IMAGE)fail('รูปภาพต้องไม่เกิน 10 MB',413);if(caption.length>500)fail('คำอธิบายต้องไม่เกิน 500 ตัวอักษร');
   const content=new Uint8Array(await file.arrayBuffer()),type=imageType(content);if(!type)fail('รองรับไฟล์ JPEG, PNG และ WebP เท่านั้น',415);
   const id=crypto.randomUUID(),key=`station/${b.id}/${id}`,created=new Date().toISOString();
   await env.BUCKET.put(key,content,{httpMetadata:{contentType:type},customMetadata:{stationId:String(b.id)}});
   try{await db.run('INSERT INTO station_photos (id,station_id,object_key,filename,content_type,size,caption,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?)',id,b.id,key,file.name.slice(0,250),type,file.size,caption,created,user);}catch(e){await env.BUCKET.delete(key);throw e;}
   return json(await getStation(db,b.id),201);
  }
  const pm=path.match(/^\/api\/photos\/([0-9a-f-]{36})(\/file)?$/);
  if(pm){const photo=await db.first('SELECT * FROM station_photos WHERE id=?',pm[1]);if(!photo)fail('ไม่พบรูปภาพ',404);
   if(pm[2]&&request.method==='GET'){const object=await env.BUCKET.get(photo.object_key);if(!object)fail('ไม่พบไฟล์รูปภาพในพื้นที่จัดเก็บ',404);return new Response(object.body,{headers:{'Content-Type':photo.content_type,'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=300','Content-Disposition':'inline'}});}
   if(!pm[2]&&request.method==='DELETE'){await env.BUCKET.delete(photo.object_key);await db.run('DELETE FROM station_photos WHERE id=?',photo.id);return json({deleted:true});}
   if(!pm[2]&&request.method==='PATCH'){const data=await readJSON(request);if(typeof data.caption!=='string'||data.caption.length>500)fail('คำอธิบายต้องไม่เกิน 500 ตัวอักษร');await db.run('UPDATE station_photos SET caption=? WHERE id=?',data.caption,photo.id);return json({saved:true});}
  }
  return json({error:'ไม่พบรายการหรือวิธีเรียกใช้ไม่ถูกต้อง'},404);
 }catch(e){if(!e.status)console.error(JSON.stringify({event:'request_failed',path,message:e.message}));return json({error:e.status?e.message:'ไม่สามารถบันทึกหรือโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'},e.status||503);}
}};
