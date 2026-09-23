from pathlib import Path
import json,collections
b=Path(__file__).parent
w=json.loads((b/'analysis/workbook.json').read_text(encoding='utf-8'))
names=list(w)
a=next(k for k in w if k.endswith('ประเภท A'))
c=next(k for k in w if k.endswith('ทางเลือก'))
rows=[]
for sheet in [a,c]:
 for rr in w[sheet]['rows'][1:]:
  v=rr['cells']
  if not isinstance(v.get('M'),(int,float)) or not isinstance(v.get('D'),str):continue
  rows.append(dict(id=len(rows)+1,name=v['C'].strip(),province=v['D'].strip(),district=v['E'].strip(),subdistrict=v['F'].strip(),status=v['B'],zone=v['J'],score=v['M'],primary=v.get('K',''),secondary=v.get('L',''),lat=v['G'],lon=v['H'],reason=v.get('R','') if sheet==c else '',source=sheet,row=rr['row'],oldA=sheet==a,scores={'N':v['N'],'O':v['O'],'P':v['P'],'Q':v['Q']}))
groups=collections.defaultdict(list)
for r in rows:groups[r['province']].append(r)
ties=[]
for province,rs in groups.items():
 eligible=[r for r in rs if r['zone']=='แดง'] or [r for r in rs if r['zone']=='ส้ม']
 top=max(r['score'] for r in eligible)
 winners=[r for r in eligible if r['score']==top]
 if len(winners)>1:ties.append({'province':province,'ids':[r['id'] for r in winners]})
 # preserve an existing A in a tie; otherwise avoid hidden selection
 winner=next((r for r in winners if r['oldA']),winners[0])
 for r in rs:r['class']='A' if r is winner else ('C' if r['score']<40 else 'B')
changes=[{k:r[k] for k in ['id','name','province','score','zone','oldA','class']} for r in rows if r['oldA']!=(r['class']=='A')]
summary={'total':len(rows),'provinces':len(groups),'classes':dict(collections.Counter(r['class'] for r in rows)),'zones':dict(collections.Counter(r['zone'] for r in rows)),'statuses':dict(collections.Counter(r['status'] for r in rows)),'ties':ties,'changes':changes,'scenarios':[]}
for t in [70,60,50,40]:
 chosen=[r for r in rows if r['class']=='A' or (r['class']=='B' and r['score']>t)]
 summary['scenarios'].append({'cutoff':t,'A':sum(r['class']=='A' for r in chosen),'B':sum(r['class']=='B' for r in chosen),'total':len(chosen),'primary':sum(r['status']=='หลัก' for r in chosen),'reserve':sum(r['status']=='สำรอง' for r in chosen),'pendingB':sum(r['class']=='B' and r['score']<=t for r in rows)})
print(json.dumps(summary,ensure_ascii=False,indent=2))
print('C reasons:',sum(bool(r['reason']) for r in rows if r['class']=='C'),'/',sum(r['class']=='C' for r in rows))
print('Exact boundaries:',[(r['name'],r['score']) for r in rows if r['score'] in [40,50,60,70]])
for sheet in w:
 if 'ประเภท B' not in sheet:continue
 t=int(sheet.split('>')[1][:2]);records=[r for r in w[sheet]['rows'][1:] if isinstance(r['cells'].get('M'),(int,float))]
 marked=[r for r in records if isinstance(r['cells'].get('A'),(int,float))]
 print(sheet,'rows',len(records),'marked',len(marked),'by score',sum(r['cells']['M']>t for r in records),'disagree',[(r['row'],r['cells'].get('C'),r['cells']['M'],r['cells'].get('A')) for r in records if (r['cells']['M']>t)!=isinstance(r['cells'].get('A'),(int,float))])
(b/'analysis/data.json').write_text(json.dumps({'stations':rows,'summary':summary},ensure_ascii=False,indent=2),encoding='utf-8')
