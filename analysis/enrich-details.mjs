import fs from 'node:fs/promises';

const masterPath=new URL('./master-data.json',import.meta.url);
const workbookPath=new URL('./workbook.json',import.meta.url);
const master=JSON.parse(await fs.readFile(masterPath,'utf8'));
const workbook=JSON.parse(await fs.readFile(workbookPath,'utf8'));
const fieldFor=header=>{
 const text=String(header||'').replaceAll('\n',' ').trim();
 if(text.includes('SLOPE_DEG'))return 'slopeDeg';
 if(text.includes('LOCAL_RELIEF_90M_M'))return 'localRelief90m';
 if(text.includes('รหัสสถานีใกล้เคียง'))return 'nearestStationCode';
 if(text.includes('ชื่อสถานีใกล้เคียง'))return 'nearestStationName';
 if(text.includes('ระยะห่างสถานีใกล้เคียง'))return 'nearestStationDistanceKm';
 if(text.includes('คะเเนนระดับความสูง DEM'))return 'demElevationScore';
 if(text.includes('ความสูง DEM (m) สถานีใกล้เคียง'))return 'nearestDemElevationM';
 if(text.includes('ความสูง DEM (m) ของสถานีตัวแทนและสถานีใกล้เคียง'))return 'demElevationDifferenceM';
 if(text==='ความสูง DEM (m)')return 'demElevationScore';
 return null;
};

for(const station of master.stations){
 const sheet=workbook[station.source];
 const header=sheet?.rows.find(row=>row.row===1)?.cells||{};
 const row=sheet?.rows.find(item=>item.row===station.row)?.cells||{};
 const details={};
 for(const [column,label] of Object.entries(header)){
  const key=fieldFor(label),value=row[column];
  if(key&&value!==undefined&&value!==null&&value!=='')details[key]=value;
 }
 station.details=details;
}

await fs.writeFile(masterPath,JSON.stringify(master,null,2)+'\n');
console.log(`Added source details to ${master.stations.length} stations`);
