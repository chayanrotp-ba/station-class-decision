import urllib.request,json,concurrent.futures
from pathlib import Path
root='https://gis-portal.disaster.go.th'
paths={'major':'/arcgis/rest/services/04Hydro_MajorStream/FeatureServer/0','minor':'/arcgis/rest/services/04Hydro_MinorStream/FeatureServer','province':'/arcgis/rest/services/Map116/DPM_TH_Province_DSS/FeatureServer/1','district':'/arcgis/rest/services/Map116/DPM_TH_Amphoe_DSS/FeatureServer/1','subdistrict':'/arcgis/rest/services/Map116/DPM_TH_Tambon_DSS/FeatureServer/1','mask-item':'/portal/sharing/rest/content/items/6972854493074d108fd7421c09a7ce3b','mask-data':'/portal/sharing/rest/content/items/6972854493074d108fd7421c09a7ce3b/data'}
out=Path('analysis/gis');out.mkdir(parents=True,exist_ok=True)
def inspect(pair):
 name,p=pair
 try:
  with urllib.request.urlopen(root+p+'?f=json',timeout=25) as r:data=json.load(r)
  (out/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
  print(name,json.dumps({k:v for k,v in data.items() if k in ['name','type','url','layers','title','error','maxRecordCount','supportedQueryFormats','objectIdField','fields','operationalLayers']},ensure_ascii=False))
 except Exception as e:print(name,type(e).__name__,str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:list(pool.map(inspect,paths.items()))
