const STORAGE_KEY='station-class-copy-v1';
const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}};
let saved=load();
function editableNodes(section){
  if(section.id==='map')return [...section.querySelectorAll('.section-head .eyebrow,.section-head h2,.section-head p')];
  if(section.id==='stations'||section.id==='class-c')return [...section.querySelectorAll('.section-head .eyebrow,.section-head h2,.section-head p')];
  return [...section.querySelectorAll('h1,h2,h3,p,.label,.rule-result,.eyebrow')].filter(node=>!node.id&&!node.closest('dialog,table,.cutoffs,.filters,.source-gallery,.c-list')&&!node.querySelector('a,button,input,select,textarea'));
}
function setEditing(section,on){
  editableNodes(section).forEach(node=>{node.contentEditable=on?'true':'false';node.classList.toggle('copy-editable',on);});
  section.querySelector('.copy-edit-start').hidden=on;section.querySelector('.copy-edit-save').hidden=!on;section.querySelector('.copy-edit-cancel').hidden=!on;
}
function restore(section){editableNodes(section).forEach(node=>{const key=node.dataset.copyKey;node.textContent=Object.hasOwn(saved,key)?saved[key]:node.dataset.copyOriginal;});}
for(const section of document.querySelectorAll('main > section')){
  const nodes=editableNodes(section);if(!nodes.length)continue;
  nodes.forEach((node,index)=>{const key=`${section.id}:copy:${index}`;node.dataset.copyKey=key;node.dataset.copyOriginal=node.textContent;if(Object.hasOwn(saved,key))node.textContent=saved[key];});
  section.classList.add('copy-editor-section');
  const actions=document.createElement('div');actions.className='copy-edit-actions';
  actions.innerHTML='<button class="outline copy-edit-start" type="button" aria-label="แก้ข้อความในส่วนนี้">✎ แก้คำ</button><button class="outline copy-edit-save" type="button" hidden>บันทึกคำ</button><button class="outline copy-edit-cancel" type="button" hidden>ยกเลิก</button>';
  actions.querySelector('.copy-edit-start').onclick=()=>setEditing(section,true);
  actions.querySelector('.copy-edit-cancel').onclick=()=>{restore(section);setEditing(section,false);};
  actions.querySelector('.copy-edit-save').onclick=()=>{for(const node of editableNodes(section))saved[node.dataset.copyKey]=node.textContent.trim();localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));setEditing(section,false);};
  section.prepend(actions);
}
