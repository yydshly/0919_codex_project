import * as store from './store.js';
const $=id=>document.getElementById(id);
let collection=null,filter='all',deleted=null;
function tell(message){$('notice').textContent=message;$('notice').hidden=false;$('error').hidden=true;}
function error(message){$('error').textContent=message;$('error').hidden=false;$('notice').hidden=true;}
function lock(message){$('storage-error').textContent=message;$('storage-error').hidden=false;$('form-fields').disabled=true;$('export').disabled=true;$('export-raw').hidden=false;$('list').replaceChildren();$('result-count').textContent='存储需要处理，暂不显示可修改列表';$('empty').hidden=true;}
function ready(){ $('storage-error').hidden=true;$('form-fields').disabled=false;$('export').disabled=false;$('export-raw').hidden=true; }
function textElement(tag,text,className){const element=document.createElement(tag);element.textContent=text;if(className)element.className=className;return element;}
function action(text,handler,className){const button=textElement('button',text,className);button.type='button';button.addEventListener('click',handler);return button;}
function update(run,success){try{collection=run();ready();render();tell(success);return true;}catch(e){error(e.message);return false;}}
function render(){
  const rows=collection?.repositories??[];
  $('total').textContent=rows.length;$('pending').textContent=rows.filter(r=>r.status==='pending').length;$('reviewed').textContent=rows.filter(r=>r.status==='reviewed').length;
  $('export').textContent=`导出全部 ${rows.length} 个 ↓`;
  const query=$('search').value.trim().toLocaleLowerCase();
  const shown=rows.filter(r=>(filter==='all'||r.status===filter)&&[r.name,r.notes,...r.tags].join(' ').toLocaleLowerCase().includes(query));
  $('result-count').textContent=`显示 ${shown.length} / ${rows.length} 个项目`;
  const fragment=document.createDocumentFragment();
  for(const row of shown){
    const card=document.createElement('article');card.className='repo-card';card.dataset.id=row.id;
    const top=textElement('div','','card-top'),title=document.createElement('div');title.append(textElement('h3',row.name));
    const link=textElement('a',row.url.replace('https://','')+' ↗','repo-url');link.href=row.url;link.target='_blank';link.rel='noopener noreferrer';title.append(link);
    top.append(title,textElement('span',row.status==='reviewed'?'已研究':'待研究','status'+(row.status==='reviewed'?' done':'')));card.append(top);
    card.append(textElement('p',row.notes||'还没有备注，可以先打开仓库看看。'));
    const bottom=textElement('div','','card-bottom'),tags=textElement('div','','tags');row.tags.forEach(tag=>tags.append(textElement('span',tag,'tag')));if(row.sample)tags.append(textElement('span','初始示例','sample'));
    const buttons=textElement('div','','card-actions');
    buttons.append(action(row.status==='pending'?'标为已研究':'改为待研究',()=>update(()=>store.toggle(row.id),'研究状态已保存。')));
    buttons.append(action('移除',()=>{
      try{const result=store.remove(row.id);collection=result.collection;deleted=result.result;render();tell('项目已移除，可撤销最近一次移除。');}
      catch(e){error(e.message);}
    },'remove'));
    bottom.append(tags,buttons);card.append(bottom);fragment.append(card);
  }
  $('list').replaceChildren(fragment);
  $('empty').hidden=shown.length>0;$('empty-title').textContent=rows.length?'没有匹配的项目':'还没有收藏';$('empty-text').textContent=rows.length?'试试其他关键词，或清除当前筛选。':'从左侧表单添加第一个值得研究的项目。';$('clear-filters').hidden=!rows.length;
  $('undo-panel').hidden=!deleted;
  if(deleted)$('undo-text').textContent=`已移除「${deleted.item.name}」`;
  document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status===filter)));
}
$('add-form').addEventListener('submit',event=>{event.preventDefault();const fields={name:$('name').value,url:$('url').value,tags:$('tags').value,notes:$('notes').value};if(update(()=>store.add(fields),'项目已保存到本浏览器。')){$('add-form').reset();$('name').focus();}});
$('search').addEventListener('input',render);
document.querySelectorAll('[data-status]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.status;render();}));
$('clear-filters').addEventListener('click',()=>{$('search').value='';filter='all';render();});
$('undo').addEventListener('click',()=>{if(!deleted)return;try{collection=store.restore(deleted);deleted=null;render();tell('已恢复项目，期间新增的收藏保持不变。');}catch(e){error(e.message);}});
function download(content,filename,type){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').addEventListener('click',()=>{try{const current=store.read();const rows=current?.repositories??[];download(JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),repositories:rows},null,2),`resource-shelf-${new Date().toISOString().slice(0,10)}.json`,'application/json;charset=utf-8');tell(`已导出全部 ${rows.length} 个项目，不受当前筛选影响。`);}catch(e){error(e.message);}});
$('export-raw').addEventListener('click',()=>{try{const raw=store.rawValue();if(raw===null)throw new Error('没有可导出的原始数据。');download(raw,'resource-shelf-recovery.txt','text/plain;charset=utf-8');}catch(e){error(e.message);}});
window.addEventListener('storage',event=>{if(event.key!==store.KEY&&event.key!==null)return;try{collection=store.read()??{schemaVersion:1,updatedAt:new Date().toISOString(),repositories:[]};ready();render();tell('已同步其他标签页保存的收藏。');}catch(e){lock(e.message);}});
try{collection=store.initialize();ready();render();}catch(e){lock(e.message);}
