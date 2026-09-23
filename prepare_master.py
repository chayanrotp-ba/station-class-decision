from pathlib import Path
import json,re,math
base=Path(__file__).parent
src=Path(r'C:\Users\chaya\.codex\attachments\a67bb549-f502-441b-a395-55700b32c4bb\ข้อความที่วาง.txt')
records=[l.split('\t') for l in src.read_text(encoding='utf-8-sig').splitlines() if l.strip()][1:]
data=json.loads((base/'analysis/data.json').read_text(encoding='utf-8'))
def norm(x):return re.sub(r'\s+|[.ฯ]','',x).replace('สำนักงาน','').replace('องค์การบริหารส่วนตำบล','อบต')
matched=[];used=set()
for n,row in enumerate(records,2):
 name,prov,amp,tam,lat,lon,utm=row[:7]
 candidates=[s for s in data['stations'] if s['province']==prov and norm(s['name'])==norm(name)]
 method='ชื่อและจังหวัด'
 if len(candidates)!=1:
  candidates=[s for s in data['stations'] if s['province']==prov and abs(s['lat']-float(lat))<0.00002]
  method='จังหวัดและละติจูดตรงกัน'
 if len(candidates)!=1:
  print('UNMATCHED',n,name,[(s['id'],s['name']) for s in candidates]);continue
 r=candidates[0];assert r['id'] not in used;used.add(r['id'])
 r.update(masterName=name,masterSourceRow=n,masterUTM=utm,providedLat=lat,providedLon=lon,matchMethod=method)
 diffs=[]
 try:
  if abs(float(lat)-r['lat'])>0.000001 or abs(float(lon)-r['lon'])>0.000001:diffs.append('พิกัดรายการแนบต่างจาก Excel; ใช้ Excel บนแผนที่')
 except ValueError:diffs.append('รูปแบบพิกัดในรายการแนบไม่ถูกต้อง; ใช้ Excel บนแผนที่')
 if name.strip()!=r['name'].strip():diffs.append('ชื่อใน Master ใช้ตามรายการแนบ; เก็บชื่อ Excel ไว้อ้างอิง')
 r['masterNotes']=diffs
 matched.append(r)
 print(n,r['id'],name,'Excel',r['lat'],r['lon'],';'.join(diffs))
assert len(matched)==85 and len(used)==85,(len(records),len(matched))
(base/'analysis/master-data.json').write_text(json.dumps({'stations':matched,'summary':data['summary']},ensure_ascii=False,indent=2),encoding='utf-8')
(base/'analysis/master-input.tsv').write_text('\n'.join('\t'.join(r) for r in records),encoding='utf-8')
print('MATCHED',len(matched),'COORD DIFF',sum(any('พิกัด' in n for n in r['masterNotes']) for r in matched))
