import urllib.request,urllib.parse,json
base='https://gis-portal.disaster.go.th/arcgis/rest/services/Map116/'
for name in ['DPM_TH_Province_DSS','DPM_TH_Amphoe_DSS']:
 for fmt in ['json','geojson']:
  params={'f':fmt,'where':"PROV_NAM_T='สตูล'",'outFields':'PROV_CODE,PROV_NAM_T','outSR':'4326','returnGeometry':'true','maxAllowableOffset':'.002'}
  url=base+name+'/FeatureServer/1/query?'+urllib.parse.urlencode(params)
  with urllib.request.urlopen(url,timeout=25) as r:d=json.load(r)
  print(name,fmt,'count',len(d.get('features',[])),'error',d.get('error'),'attrs',[(f.get('properties',f.get('attributes')),list((f.get('geometry')or{}).keys())) for f in d.get('features',[])])
  if fmt=='geojson':open('analysis/gis/satun-'+name+'.json','w',encoding='utf8').write(json.dumps(d,ensure_ascii=False))
