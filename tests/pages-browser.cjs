const {chromium}=require('C:/Users/chaya/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'), fs=require('node:fs/promises'), path=require('node:path'), assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!pathname.startsWith('/station-class-decision/')){res.writeHead(404).end();return;}const name=pathname.slice('/station-class-decision/'.length)||'index.html',file=path.resolve('.pages-dist',name);if(!file.startsWith(path.resolve('.pages-dist')+path.sep)){res.writeHead(403).end();return;}const bytes=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1450,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.PAGES_URL||`http://127.0.0.1:${server.address().port}/station-class-decision/`;
 await page.goto(base);await page.waitForFunction(()=>window.stationMap?.markers().size===85);
 assert.equal(await page.locator('#station-table tr').count(),85);
 assert(await page.locator('[data-layer="district"]').isChecked());
 assert.equal(await page.locator('.leaflet-control-zoom-in').getAttribute('title'),'ขยายแผนที่');
 assert.equal(await page.locator('.leaflet-control-zoom-out').getAttribute('title'),'ย่อแผนที่');
 await page.waitForFunction(()=>document.querySelectorAll('.province-label').length===20,{},{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#state-district').textContent.includes('รายการ'),{},{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#map-storage-status').textContent.includes('มีรูปแล้ว'));
 await page.selectOption('#map-province','เชียงราย');await page.waitForFunction(()=>window.stationMap.markers().size===5);
 await page.selectOption('#map-class','A');assert.equal(await page.locator('.station-marker').count(),1);
 await page.selectOption('#map-class','all');
 await page.evaluate(()=>window.stationMap.openStation(40));await page.getByText('ยังไม่มีรูปภาพของจุดนี้',{exact:true}).waitFor();
 assert.equal(await page.locator('#map-detail a.outline').getAttribute('href'),'master.html?station=40');
 const latlng=await page.evaluate(()=>window.stationMap.markers().get(40).getLatLng());assert.equal(latlng.lat,19.961848);assert.equal(latlng.lng,100.235827);
 await page.waitForFunction(()=>[...document.querySelectorAll('.leaflet-tile')].some(i=>i.complete&&i.naturalWidth>0),{},{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#mask-status').textContent.includes('76 จังหวัด'),{},{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#state-province').textContent.includes('รายการ'),{},{timeout:60000});
 await page.locator('#map').scrollIntoViewIfNeeded();await page.screenshot({path:'analysis/qa-pages.png'});
 const apiResults=await page.evaluate(async()=>{const {api}=await import('./pages-api.js');const results={};for(const k of ['district','subdistrict','major','minor']){const data=await api('/api/gis/'+k+'?province=เชียงราย&bbox=100.20,19.94,100.28,19.99&tolerance=0.001&offset=0');results[k]=data.features.length;}return results;});
 assert(apiResults.district>0);assert(apiResults.subdistrict>0);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto(new URL('master.html?station=40',base).href);await page.locator('#display-name').waitFor();const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6L1sAAAAASUVORK5CYII=','base64');await page.setInputFiles('#photo-files',{name:'public-photo.png',mimeType:'image/png',buffer:image});await page.locator('#upload-photos').click();await page.getByText('บันทึก 1 รูปในเบราว์เซอร์นี้แล้ว เปิดดูจากแผนที่ได้ทันที',{exact:true}).waitFor();assert.equal(await page.locator('#master-gallery img').count(),1);await page.reload();await page.locator('#display-name').waitFor();assert.equal(await page.locator('#master-gallery img').count(),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,base,markers:85,provinceLabels:20,districtDefault:true,zoomControls:true,mask:77,apiResults,publicMaster:true,photoUpload:true,coordinateAccuracy:true,mobile:true,errors}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
