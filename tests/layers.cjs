const {chromium}=require('C:/Users/chaya/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{const b=await chromium.launch({headless:true,channel:'msedge'});const p=await b.newPage({viewport:{width:1500,height:1050}});try{
 await p.goto('http://127.0.0.1:8765/');await p.waitForFunction(()=>window.stationMap?.markers().size===85);
 await p.selectOption('#map-class','selected');
 for(const [t,n] of [[70,29],[60,37],[50,55],[40,71]]){await p.locator(`[data-cutoff="${t}"]`).click();assert.equal(await p.evaluate(()=>window.stationMap.markers().size),n);assert.equal(await p.locator('#selected-total').textContent(),String(n));}
 await p.selectOption('#map-class','all');await p.selectOption('#map-province','เชียงราย');
 await p.evaluate(()=>window.stationMap.map.setView([19.961848,100.235827],11,{animate:false}));
 for(const id of ['district','subdistrict','minor'])await p.locator(`[data-layer="${id}"]`).check();
 await p.waitForFunction(()=>['province','district','subdistrict','major','minor'].every(id=>document.querySelector('#state-'+id).textContent.includes('รายการ')),{},{timeout:60000});
 const states=await p.locator('#layer-controls').innerText();assert(!states.includes('โหลดไม่สำเร็จ'));
 await p.waitForFunction(()=>document.querySelector('#mask-status').textContent.includes('ซ่อนพื้นที่อื่น'));
 const mask=await p.locator('#mask-status').textContent();await p.locator('#map-mask').uncheck();assert.equal(await p.locator('#mask-status').textContent(),'');
 await p.locator('#map-mask').check();await p.waitForFunction(()=>document.querySelector('#mask-status').textContent.includes('ซ่อนพื้นที่อื่น'));
 await p.locator('#map').scrollIntoViewIfNeeded();await p.screenshot({path:'analysis/qa-all-layers.png'});
 const coverage=await p.evaluate(async()=>{const a=await fetch('/api/gis/province?tolerance=0.002').then(r=>r.json()),b=await fetch('/api/gis/mask?tolerance=0.002').then(r=>r.json());const names=[...new Set([...a.features,...b.features].map(f=>f.properties.PROV_NAM_T||f.properties.prov_nam_t))];const source=JSON.parse(document.querySelector('#report-data').textContent).stations;return {province:a.features.length,gray:b.features.length,merged:names.length,missingTarget:[...new Set(source.map(s=>s.province))].filter(n=>!names.includes(n))};});
 assert.deepEqual(coverage.missingTarget,[]);fs.writeFileSync('analysis/qa-layers.json',JSON.stringify({passed:true,states,mask,coverage},null,2));console.log(JSON.stringify({passed:true,states,mask,coverage}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
