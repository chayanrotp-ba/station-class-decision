import fs from 'node:fs/promises';

const masterPath=new URL('./master-data.json',import.meta.url);
const sourcePath=new URL('./spatial-reasons.tsv',import.meta.url);
const parseTsv=text=>{const rows=[];let row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const char=text[i],next=text[i+1];if(char==='"'){if(quoted&&next==='"'){value+='"';i++;}else quoted=!quoted;continue;}if(!quoted&&char==='\t'){row.push(value);value='';continue;}if(!quoted&&(char==='\n'||char==='\r')){if(char==='\r'&&next==='\n')i++;row.push(value);if(row.some(cell=>cell!==''))rows.push(row);row=[];value='';continue;}value+=char;}if(value||row.length){row.push(value);rows.push(row);}return rows;};
const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
const rows=parseTsv(await fs.readFile(sourcePath,'utf8'));
if(rows[0]?.[0]!=='สถานที่')throw Error('ไม่พบหัวตารางสถานที่ในไฟล์เหตุผลเชิงพื้นที่');
const reasons=new Map(rows.slice(1).filter(row=>row[0]&&row[1]).map(row=>[normalize(row[0]),normalize(row[1])]));
const master=JSON.parse(await fs.readFile(masterPath,'utf8'));
const unmatched=[];
for(const station of master.stations){const reason=reasons.get(normalize(station.name))||reasons.get(normalize(station.masterName));station.spatialReason=reason||'';if(!reason)unmatched.push(station.name);}
await fs.writeFile(masterPath,JSON.stringify(master,null,2)+'\n');
console.log(`Matched ${master.stations.length-unmatched.length}/${master.stations.length} station reasons`);
if(unmatched.length)console.log('Unmatched: '+unmatched.join(' | '));
