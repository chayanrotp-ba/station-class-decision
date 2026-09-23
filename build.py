from pathlib import Path
import json
base=Path(__file__).parent
data=json.loads((base/'analysis/data.json').read_text(encoding='utf-8'))
html=(base/'index.template.html').read_text(encoding='utf-8')
html=html.replace('__REPORT_DATA__',json.dumps(data,ensure_ascii=False).replace('</','<\\/'))
(base/'dist/index.html').write_text(html,encoding='utf-8')
print('Built dist/index.html')
