from pathlib import Path
import json, openpyxl
from pypdf import PdfReader

base=Path(__file__).parent
out=base/'analysis'
out.mkdir(exist_ok=True)
src=Path(r'C:\Users\chaya\Downloads')
wb=openpyxl.load_workbook(src/'จัด Class สถานีตรวจวัด 85 จุด (1).xlsx',data_only=True)
wf=openpyxl.load_workbook(src/'จัด Class สถานีตรวจวัด 85 จุด (1).xlsx',data_only=False)
result={}
for ws in wb:
    rows=[]
    for row in ws:
        cells={c.column_letter:c.value for c in row if c.value is not None}
        if cells: rows.append({'row':row[0].row,'cells':cells})
    result[ws.title]={'rows':rows,'max_row':ws.max_row,'max_column':ws.max_column,'merged':[str(r) for r in ws.merged_cells.ranges]}
    print(ws.title,ws.max_row,ws.max_column)
(out/'workbook.json').write_text(json.dumps(result,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
formulas={ws.title:[{'cell':c.coordinate,'formula':c.value,'cached':wb[ws.title][c.coordinate].value} for row in ws for c in row if c.data_type=='f'] for ws in wf}
(out/'formulas.json').write_text(json.dumps(formulas,ensure_ascii=False,indent=2),encoding='utf-8')
reader=PdfReader(src/'Site Candidate (2).pdf')
pages=[p.extract_text() for p in reader.pages]
(out/'pdf-pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'pdf.txt').write_text('\n\n'.join(f'=== PAGE {i+1} ===\n{t}' for i,t in enumerate(pages)),encoding='utf-8')
print('PDF pages:',len(pages))
