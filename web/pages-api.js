// GitHub Pages is read-only. No credentials or private station overrides are published.
const source = 'https://gis-portal.disaster.go.th/arcgis/rest/services/';
const layers = {major:'04Hydro_MajorStream/FeatureServer/0',minor:'04Hydro_MinorStream/FeatureServer/0',province:'Map116/DPM_TH_Province_DSS/FeatureServer/1',district:'Map116/DPM_TH_Amphoe_DSS/FeatureServer/1',subdistrict:'Map116/DPM_TH_Tambon_DSS/FeatureServer/1',mask:'Hosted/Province_Gray/FeatureServer/0'};
let stations;
async function read(url, signal) {
  const response = await fetch(url, {signal});
  if (!response.ok) throw Error('บริการชั้นข้อมูลตอบกลับ ' + response.status);
  const data = await response.json();
  if (data.error) throw Error(data.error.message || 'โหลดชั้นข้อมูลไม่สำเร็จ');
  return data;
}
export async function api(path, options = {}) {
  if (options.method && options.method !== 'GET') throw Error('กรุณาเปิดเว็บส่วนกลางเพื่อแก้ไขข้อมูล');
  if (path.startsWith('/api/stations')) {
    stations ??= read(new URL('stations.json', import.meta.url)).then(data => data.stations.map(s => ({...s,displayName:s.masterName||s.name,notes:'',photoCount:null,photos:[]})));
    const data = await stations;
    if (path === '/api/stations') return {stations:data,storage:'public-source'};
    const station = data.find(s => s.id === Number(path.split('/').pop()));
    if (!station) throw Error('ไม่พบจุดติดตั้ง');
    return station;
  }
  const url = new URL(path, location.origin), key = url.pathname.split('/').pop();
  if (!layers[key]) throw Error('ไม่พบชั้นข้อมูล');
  const params = url.searchParams, province = params.get('province'), offset = Number(params.get('offset')||0);
  const q = new URLSearchParams({f:'geojson',where:'1=1',outFields:'*',outSR:'4326',returnGeometry:'true',resultRecordCount:'1000',resultOffset:String(offset),maxAllowableOffset:params.get('tolerance')||'0.001'});
  if (province && province !== 'all' && ['province','district','subdistrict'].includes(key)) q.set('where', `PROV_NAM_T='${province.replaceAll("'","''")}'`);
  if (params.has('bbox')) {
    const [xmin,ymin,xmax,ymax] = params.get('bbox').split(',').map(Number);
    q.set('geometry',JSON.stringify({xmin,ymin,xmax,ymax,spatialReference:{wkid:4326}}));
    q.set('geometryType','esriGeometryEnvelope');q.set('inSR','4326');q.set('spatialRel','esriSpatialRelIntersects');
  }
  const data = await read(source + layers[key] + '/query?' + q, options.signal);
  if (!Array.isArray(data.features)) throw Error('รูปแบบชั้นข้อมูลไม่ถูกต้อง');
  const count = data.features.length;
  if (key === 'province' && offset === 0 && (!province || province === 'all' || province === 'สตูล') && !data.features.some(f=>f.properties?.PROV_NAM_T==='สตูล')) {
    const sq = new URLSearchParams({f:'geojson',where:"PROV_NAM_T='สตูล'",outFields:'PROV_NAM_T',outSR:'4326',returnGeometry:'true',maxAllowableOffset:q.get('maxAllowableOffset')});
    const satun = await read(source + layers.district + '/query?' + sq, options.signal);
    if (!satun.features?.length) throw Error('ไม่มีข้อมูลขอบเขตสตูล');
    data.features.push({type:'Feature',properties:{PROV_NAM_T:'สตูล',fallback:true,boundary_source:'ขอบเขตอำเภอ ปภ. '+satun.features.length+' แห่ง'},geometry:{type:'MultiPolygon',coordinates:satun.features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[])}});
  }
  return {...data,nextOffset:(data.exceededTransferLimit||data.properties?.exceededTransferLimit)?offset+count:null};
}
