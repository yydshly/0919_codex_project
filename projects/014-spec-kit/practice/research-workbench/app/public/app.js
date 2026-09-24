const $=s=>document.querySelector(s);
const labels={pending:'待研究',active:'研究中',decided:'已形成结论'};
let data,view='catalog',focusOnly=false,selection=new Set(),editing=null,settingsVersion=0,settingsInitial='',noteInitial='',toastTimer;
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function button(text,fn,cls=''){const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4200)}
async function api(path,method='GET',body){const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});let payload;try{payload=await response.json()}catch{throw new Error('服务暂时不可用，请稍后重试')}if(!response.ok){const error=new Error(payload.error||'操作失败，输入已保留');error.status=response.status;throw error}return payload}
async function submit(form,error,fn){const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);error.textContent='';try{await fn()}catch(e){error.textContent=e.message;if(e.status===409&&form.id==='settings-form')$('#settings-reload').hidden=false}finally{buttons.forEach(b=>b.disabled=false)}}
function statusBadge(status){return node('span','status '+status,labels[status])}
function safeLink(url,label){const a=node('a','',label);try{const parsed=new URL(url);if(['https:','http:'].includes(parsed.protocol)){a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer'}}catch{}return a}
function empty(target,title,detail,action){target.replaceChildren();const wrap=node('div','empty');wrap.append(node('h3','',title),node('p','',detail));if(action)wrap.append(action);target.append(wrap)}
function currentProject(id){return data.projects.find(p=>p.id===id)}
function updateProject(value){data.projects=data.projects.map(p=>p.id===value.id?value:p)}
function settingsValues(){const f=$('#settings-form');return {name:f.elements.name.value,goal:f.elements.goal.value,view:f.elements.view.value,focus:[...f.querySelectorAll('input[type=checkbox]:checked')].map(n=>n.value),configured:true,version:settingsVersion}}
function settingsDirty(){return JSON.stringify(settingsValues())!==settingsInitial}
function noteValues(){const f=$('#note-form');return {note:f.elements.note.value,status:f.elements.status.value,version:editing?.version}}
function detailDirty(){return JSON.stringify(noteValues())!==noteInitial||$('#task-form').elements.title.value!==''||$('#task-form').elements.due.value!==''}
function closeSettings(){if(!data.settings.configured)return;if(settingsDirty()&&!confirm('设置尚未保存，确认放弃这些修改？'))return;$('#settings-dialog').close()}
function closeDetail(){if(detailDirty()&&!confirm('还有未保存的输入，确认放弃这些修改？'))return;$('#detail-dialog').close()}

function render(){
 $('#workspace-name').textContent=data.settings.name;$('#workspace-goal').textContent=data.settings.goal||'为下一次产品决策，留下一份有依据的判断。';
 $('#snapshot').textContent='目录快照 '+data.snapshotAt.slice(0,10);
 const metrics=[['项目已收录',data.projects.length],['正在研究',data.projects.filter(p=>p.status==='active').length],['形成结论',data.projects.filter(p=>p.status==='decided').length],['待完成行动',data.tasks.filter(t=>!t.done).length]];
 $('#metrics').replaceChildren(...metrics.map(([label,count])=>{const n=node('div','metric');n.append(node('strong','',String(count)),node('span','',label));return n}));
 for(const id of ['catalog','compare','tasks'])$('#'+id+'-view').hidden=view!==id;
 document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
 $('#page-label').textContent={catalog:'项目目录',compare:'项目比较',tasks:'研究待办'}[view];
 $('#focus-toggle').setAttribute('aria-pressed',String(focusOnly));
 renderCatalog();renderComparison();renderBoard();
 $('#compare-bar').hidden=!selection.size||view!=='catalog';$('#compare-count').textContent=`已选择 ${selection.size} / 3 个项目`;
}
function renderCatalog(){
 const query=$('#search').value.trim().toLowerCase(),status=$('#status-filter').value;
 const projects=data.projects.filter(p=>(status==='all'||p.status===status)&&(!focusOnly||p.tags.some(t=>data.settings.focus.includes(t)))&&[p.name,p.summary,...p.tags].join(' ').toLowerCase().includes(query));
 $('#result-count').textContent=`显示 ${projects.length} / ${data.projects.length} 个项目`+(focusOnly?' · 我的关注方向':'');
 const container=$('#projects');container.replaceChildren();
 if(!projects.length){empty(container,'没有找到匹配项目',focusOnly&&!data.settings.focus.length?'还没有设置关注方向，可以先定制空间或查看全部。':'试试其他关键词，或者清除当前筛选。',button('清除筛选',clearFilters));return}
 for(const p of projects){
  const card=node('article','project-card'),top=node('div','card-top');top.append(node('span','project-icon',p.name.slice(0,1)),statusBadge(p.status));
  const tags=node('div','tags');tags.append(...p.tags.slice(0,3).map(t=>node('span','tag',t)));
  const foot=node('div','card-foot');const selected=selection.has(p.id);foot.append(button('研究详情',()=>openDetail(p.id)),button(selected?'已加入比较':'加入比较',()=>toggleCompare(p.id),selected?'selected':''));
  card.append(top,node('h3','',p.name),node('p','card-summary',p.summary),tags,foot);container.append(card);
 }
}
function clearFilters(){$('#search').value='';$('#status-filter').value='all';focusOnly=false;render()}
function toggleCompare(id){if(selection.has(id))selection.delete(id);else if(selection.size>=3){toast('最多比较 3 个项目');return}else selection.add(id);render()}
function go(next){view=next;render()}
function renderComparison(){
 const container=$('#comparison');container.replaceChildren();
 if(selection.size<2){empty(container,'先选出你想比较的项目','回到项目目录选择 2–3 项，即可并列比较。',button('返回项目目录',()=>go('catalog')));return}
 const grid=node('div','compare-grid');
 for(const id of selection){const p=currentProject(id),card=node('article','compare-item');card.append(node('h3','',p.name));const dl=node('dl');
  for(const [label,value] of [['能力与研究摘要',p.summary],['方向标签',p.tags.join(' / ')],['原研究状态',p.originalStatus],['我的跟进进度',labels[p.status]],['我的应用判断',p.note||'尚未填写，可在研究详情中补充。']])dl.append(node('dt','',label),node('dd','',value));
  card.append(dl,safeLink(p.source,'查看源库 ↗'));grid.append(card);
 }container.append(grid);
}
function taskRow(task){
 const row=node('div','task-row'+(task.done?' done':'')),copy=node('div','task-copy');copy.append(node('strong','',task.title),node('small','',currentProject(task.projectId).name+(task.due?' · '+task.due:'')));
 const toggle=button(task.done?'重新打开':'标为完成',async()=>{toggle.disabled=true;try{const changed=await api('/api/tasks/'+task.id,'PUT',{done:!task.done,version:task.version});data.tasks=data.tasks.map(t=>t.id===changed.id?changed:t);render();if(editing)renderDetailTasks()}catch(e){toast(e.message);toggle.disabled=false}});
 const remove=button('删除',async()=>{if(!confirm('确认删除任务“'+task.title+'”？'))return;remove.disabled=true;try{await api('/api/tasks/'+task.id,'DELETE',{version:task.version});data.tasks=data.tasks.filter(t=>t.id!==task.id);render();if(editing)renderDetailTasks()}catch(e){toast(e.message);remove.disabled=false}});
 row.append(copy,toggle,remove);return row;
}
function renderBoard(){const board=$('#board');board.replaceChildren();for(const done of [false,true]){const col=node('section','board-column'),tasks=data.tasks.filter(t=>t.done===done);col.append(node('h3','',`${done?'已经完成':'等待行动'} · ${tasks.length}`));if(!tasks.length)col.append(node('p','form-note',done?'完成的行动会出现在这里。':'在项目详情中，为研究添加下一步。'));else col.append(...tasks.map(taskRow));board.append(col)}}
function renderDetailTasks(){$('#detail-tasks').replaceChildren(...data.tasks.filter(t=>t.projectId===editing.id).map(taskRow))}
function openDetail(id){
 editing={...currentProject(id)};$('#detail-title').textContent=editing.name;$('#detail-summary').textContent=editing.summary;
 $('#detail-meta').replaceChildren(safeLink(editing.source,'查看原始项目 ↗'),node('span','', '原研究状态：'+editing.originalStatus));
 const form=$('#note-form');form.elements.note.value=editing.note;form.elements.status.value=editing.status;noteInitial=JSON.stringify(noteValues());$('#task-form').reset();$('#note-error').textContent='';$('#task-error').textContent='';renderDetailTasks();if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
}
function openSettings(){
 const s=data.settings,f=$('#settings-form');settingsVersion=s.version;f.elements.name.value=s.name;f.elements.goal.value=s.goal;f.elements.view.value=s.view;
 const tags=[...new Set(data.projects.flatMap(p=>p.tags))].sort();$('#focus-options').replaceChildren(...tags.map(tag=>{const label=node('label'),input=document.createElement('input');input.type='checkbox';input.value=tag;input.checked=s.focus.includes(tag);input.addEventListener('change',()=>{if(f.querySelectorAll('input[type=checkbox]:checked').length>8){input.checked=false;toast('最多关注 8 个方向')}});label.append(input,node('span','',tag));return label}));
 $('#settings-close').hidden=!s.configured;$('#settings-reload').hidden=!s.configured;$('#settings-save').textContent=s.configured?'保存空间设置':'完成定制，进入工作台';$('#settings-error').textContent='';settingsInitial=JSON.stringify(settingsValues());if(!$('#settings-dialog').open)$('#settings-dialog').showModal();
}
async function refresh(){data=await api('/api/state');render();$('#error-banner').hidden=true}
document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.nav)));
$('#search').addEventListener('input',renderCatalog);$('#status-filter').addEventListener('change',renderCatalog);
$('#focus-toggle').addEventListener('click',()=>{focusOnly=!focusOnly;render()});$('#clear-compare').addEventListener('click',()=>{selection.clear();render()});$('#compare-show').addEventListener('click',()=>go('compare'));
$('#refresh').addEventListener('click',()=>refresh().then(()=>toast('已读取最新保存的记录')).catch(e=>toast(e.message)));
$('#settings-open').addEventListener('click',()=>{if(data)openSettings()});$('#settings-close').addEventListener('click',closeSettings);$('#detail-close').addEventListener('click',closeDetail);
$('#settings-dialog').addEventListener('cancel',e=>{e.preventDefault();closeSettings()});$('#detail-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDetail()});
$('#settings-reload').addEventListener('click',async()=>{if(settingsDirty()&&!confirm('重新读取会放弃当前设置草稿，是否继续？'))return;try{await refresh();openSettings()}catch(e){$('#settings-error').textContent=e.message}});
$('#note-reload').addEventListener('click',async()=>{if(detailDirty()&&!confirm('重新读取会放弃当前输入，是否继续？'))return;try{const id=editing.id;await refresh();openDetail(id)}catch(e){$('#note-error').textContent=e.message}});
$('#settings-form').addEventListener('submit',e=>{e.preventDefault();submit(e.target,$('#settings-error'),async()=>{data.settings=await api('/api/settings','PUT',settingsValues());focusOnly=data.settings.view==='focus';render();$('#settings-dialog').close();toast('空间已保存，开始你的研究')})});
$('#note-form').addEventListener('submit',e=>{e.preventDefault();submit(e.target,$('#note-error'),async()=>{const p=await api('/api/projects/'+editing.id,'PUT',noteValues());editing={...p};updateProject(p);e.target.elements.note.value=p.note;noteInitial=JSON.stringify(noteValues());render();toast('研究记录已保存')})});
$('#task-form').addEventListener('submit',e=>{e.preventDefault();submit(e.target,$('#task-error'),async()=>{const f=e.target;const t=await api('/api/tasks','POST',{projectId:editing.id,title:f.elements.title.value,due:f.elements.due.value,restoreEpoch:data.restoreEpoch});data.tasks.push(t);f.reset();render();renderDetailTasks();toast('下一步任务已添加')})});
window.addEventListener('beforeunload',e=>{if(($('#detail-dialog').open&&detailDirty())||($('#settings-dialog').open&&settingsDirty())){e.preventDefault();e.returnValue=''}});
try{data=await api('/api/state');focusOnly=data.settings.view==='focus';render();if(!data.settings.configured)openSettings();else{const inspect=new URLSearchParams(location.search).get('inspect');if(inspect==='customization')openSettings();else if(inspect==='compare'){go('catalog');toast('从目录选择 2–3 项，点击“查看比较”')}else if(inspect==='notes')openDetail(data.projects.find(p=>p.id.includes('spec-kit'))?.id||data.projects[0].id)}}catch(e){$('#error-banner').textContent=e.message+'。请确认本地服务正在运行后刷新页面。';$('#error-banner').hidden=false}
