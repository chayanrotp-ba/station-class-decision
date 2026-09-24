import fs from 'node:fs/promises';
import path from 'node:path';

const out = '.pages-dist';
const central = 'https://station-class-decision.chayanrot-ja.chatgpt.site/';
await fs.mkdir(out,{recursive:true});
// Explicit allowlist: never copy Worker, hosting metadata, D1/R2, or local data.
for (const file of ['index.html','app.css','report.css','common.js','map.js','text-editor.js','master.html','master.js','vendor','sources']) {
  await fs.cp(path.join('dist/client',file),path.join(out,file),{recursive:true});
}
await fs.copyFile('analysis/master-data.json',out+'/stations.json');
await fs.copyFile('web/pages-api.js',out+'/pages-api.js');
let common = await fs.readFile(out+'/common.js','utf8');
common = common.replace(/export async function api[\s\S]*?\nexport function mountGallery/,"export {api} from './pages-api.js?v=20260924';\nexport function mountGallery");
await fs.writeFile(out+'/common.js',common);
let map = await fs.readFile(out+'/map.js','utf8');
map = map.replaceAll(central+'master.html?station=','master.html?station=');
await fs.writeFile(out+'/map.js',map);
let html = await fs.readFile(out+'/index.html','utf8');
html = html.replaceAll('href="'+central+'master.html"','href="master.html"');
await fs.writeFile(out+'/index.html',html);
await fs.writeFile(out+'/.nojekyll','');
console.log('Built public read-only Pages site in '+out);
