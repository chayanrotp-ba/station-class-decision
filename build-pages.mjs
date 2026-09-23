import fs from 'node:fs/promises';
import path from 'node:path';

const out = '.pages-dist';
const central = 'https://station-class-decision.chayanrot-ja.chatgpt.site/';
await fs.mkdir(out,{recursive:true});
// Explicit allowlist: never copy Worker, hosting metadata, D1/R2, or local data.
for (const file of ['index.html','app.css','report.css','common.js','map.js','vendor','sources']) {
  await fs.cp(path.join('dist/client',file),path.join(out,file),{recursive:true});
}
await fs.copyFile('analysis/master-data.json',out+'/stations.json');
await fs.copyFile('web/pages-api.js',out+'/pages-api.js');
let common = await fs.readFile(out+'/common.js','utf8');
common = common.replace(/export async function api[\s\S]*?\nexport function mountGallery/,"export {api} from './pages-api.js';\nexport function mountGallery");
await fs.writeFile(out+'/common.js',common);
let map = await fs.readFile(out+'/map.js','utf8');
map = map.replaceAll('master.html?station=',central+'master.html?station=');
map = map.replace("mountGallery(el('map-gallery'),detail.photos)","mountGallery(el('map-gallery'),detail.photos,{empty:'รูปภาพและข้อมูลแก้ไขเก็บอยู่บนเว็บส่วนกลาง เปิดผ่านปุ่มด้านล่าง (ต้องมีสิทธิ์เข้าใช้งาน)'})");
map = map.replace('`มีรูปแล้ว ${stations.filter(s=>s.photoCount>0).length} / 85 จุด`',"'ข้อมูลต้นฉบับ Excel • รูปภาพเปิดบนเว็บส่วนกลาง'");
await fs.writeFile(out+'/map.js',map);
let html = await fs.readFile(out+'/index.html','utf8');
html = html.replaceAll('href="master.html"','href="'+central+'master.html"');
html = html.replace('ภาพดาวเทียม ArcGIS • คลิกจุดเพื่อดูสถานที่และรูปภาพ','ภาพดาวเทียม ArcGIS • คลิกจุดเพื่อดูสถานที่ และเปิดรูปบนเว็บส่วนกลาง');
html = html.replace('ดูพิกัด Class และรูปสถานที่<br>เพิ่มรูปได้จากเมนู Master','ดูพิกัดและ Class จาก Excel<br>รูปภาพและ Master เปิดบนเว็บส่วนกลาง');
html = html.replace('<section id="map"','<div class="notice" style="margin:24px auto;max-width:1400px;padding:18px">เว็บสาธารณะสำหรับดูรายงานและแผนที่จากเอกสารต้นทาง • การแก้ไข Master และรูปภาพเก็บใน <a href="'+central+'master.html">เว็บส่วนกลาง ↗</a> (ต้องมีสิทธิ์เข้าใช้งาน) และไม่ซิงก์มายังหน้านี้</div><section id="map"');
await fs.writeFile(out+'/index.html',html);
await fs.writeFile(out+'/master.html',`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>เปิด Master ส่วนกลาง</title><link rel="stylesheet" href="report.css"><main style="max-width:800px;margin:80px auto;padding:24px"><h1>ข้อมูล Master และรูปภาพส่วนกลาง</h1><p>การแก้ไขและรูปภาพจัดเก็บที่เว็บส่วนกลาง ต้องมีสิทธิ์เข้าใช้งาน</p><p><a id="central" href="${central}master.html">เปิด Master และรูปภาพ ↗</a></p><a href="index.html#map">กลับแผนที่</a></main><script>const id=new URL(location.href).searchParams.get('station');if(id&&/^\\d+$/.test(id))document.getElementById('central').href+='?station='+id;</script></html>`);
await fs.writeFile(out+'/.nojekyll','');
console.log('Built public read-only Pages site in '+out);
