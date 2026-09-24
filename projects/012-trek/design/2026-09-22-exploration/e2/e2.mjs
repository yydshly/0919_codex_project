import {makeComposition, auditComposition} from './core.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names = {'bell-tower':'钟楼','drum-tower':'鼓楼',pagoda:'大雁塔',terracotta:'兵马俑'};
const faultLabels = {normal:'正常合成',shift:'鼓楼偏离锚点',swap:'钟鼓楼素材互换',missing:'遗漏鼓楼',oversize:'鼓楼意外放大'};
const faultNotes = {normal:'查看正常素材绑定与矩形位置。',shift:'只把鼓楼素材向东挪动 140 px；原始地理锚点不动。',swap:'地名与锚点保持原位，故意交换钟鼓楼的素材文件。程序检查的是登记绑定，不能识别建筑画错。',missing:'从合成中漏掉鼓楼。其真实锚点仍保留，完整性检查应发现缺失。',oversize:'只把鼓楼素材框扩大为设置值的 3 倍，检查尺寸与重叠候选。'};
const state = {selected:'bell-tower',size:84,fault:'normal',debug:false,zoom:1};
let input, references, manifest, composition, audit, exportURL;

async function getJSON(path) {const response = await fetch(path,{cache:'no-cache'}); if (!response.ok) throw new Error(`${path}：HTTP ${response.status}`); return response.json();}
function list(items) {return (items ?? []).map(item => `<li>${esc(item)}</li>`).join('');}
function sourceLink(url,label) {return /^https?:\/\//.test(url ?? '') ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>` : esc(label);}

function selectPlace(id) {if (!references?.places.some(p => p.id === id)) return; const focused=document.activeElement; const focusRegion=focused?.closest('#place-tabs')?'#place-tabs':focused?.closest('#plot')?'#plot':null; state.selected=id; renderReference(); renderAnchor(); if(composition) renderCanvas(); if(focusRegion)document.querySelector(`${focusRegion} [data-place="${id}"]`)?.focus({preventScroll:true});}

function renderReference() {
  const ref=references.places.find(p=>p.id===state.selected), asset=manifest?.assets?.find(a=>a.placeId===state.selected);
  $('#place-tabs').innerHTML=references.places.map(p=>`<button type="button" data-place="${esc(p.id)}" aria-pressed="${p.id===state.selected}">${esc(names[p.id] ?? p.name)}</button>`).join('');
  const photo=$('#reference-image'); photo.src=ref.src; photo.alt=ref.alt; photo.style.objectPosition=ref.position ?? 'center';
  $('#photo-era').textContent=ref.caption.includes('·')?ref.caption.split('·').slice(1).join('·').trim():'历史实拍';
  $('#reference-credit').innerHTML=`<p><strong>${esc(ref.caption)}</strong></p><p>${esc(ref.credit)} · ${sourceLink(ref.licenseUrl,ref.license)} · ${sourceLink(ref.sourceUrl,'原始来源')}</p>`;
  $('#reference-name').textContent=ref.name;
  $('#reference-observations').innerHTML=list(ref.observations);
  $('#reference-limits').innerHTML=list(ref.limits);
  const img=$('#asset-image'), pending=$('#asset-pending');
  img.hidden=!asset; pending.hidden=!!asset;
  if(asset){img.src=asset.src; img.alt=`参考${ref.name}实拍生成的插画候选${state.selected==='terracotta'?'，用于表示坑内军阵主题':''}`;}
  else{img.removeAttribute('src');pending.textContent='生成素材尚未就绪，照片参考已保留。';}
  img.onerror=()=>{img.hidden=true;pending.hidden=false;pending.textContent='素材图像暂未读取成功；请检查生成记录后刷新。';};
  const alpha=asset?.alpha?.hasTransparency;
  $('#asset-caption').innerHTML=asset?`<p><strong>${state.selected==='terracotta'?'内部军阵主题符号，不代表园区或外立面':'参考照片生成的独立景观插画'}</strong></p><p>${esc(asset.width)} × ${esc(asset.height)} px · ${alpha===true?'已记录透明通道':alpha===false?'没有透明像素':'透明情况待登记'} · <a href="${esc(asset.src)}" target="_blank">查看原素材 ↗</a></p>`:'<p>本次实验将保留原始生成图像和生成记录。</p>';
  const review=asset?.visualReview, status=review?.status ?? 'pending';
  const labels={pending:'待审查','not-reviewed':'待审查',candidate:'候选，待进一步验证','reviewed-with-limitations':'已检查，存在限制','needs-revision':'需修订',reviewed:'已查看，范围有限',partial:'部分满足，仍待修订',pass:'人工审查记录',fail:'未通过外形审查'};
  const statusLabel=labels[status] ?? status;
  const rejected=manifest?.rejectedCandidates?.filter(candidate=>candidate.placeId===state.selected)??[];
  $('#visual-review').innerHTML=`<p class="small-label">生成之后，逐项看结果</p><h3>视觉审查<span class="review-status ${!review?'pending':''}">${esc(statusLabel)}</span></h3>${review?.observations?.length?`<ul class="review-list">${list(review.observations)}</ul>`:'<p class="review-limit">尚未登记人工视觉结论。文件已生成、程序绑定通过，都不能代替外形审查。</p>'}${review?.limitations?.length?`<div class="review-limit">仍有这些限制<ul>${list(review.limitations)}</ul></div>`:''}<details><summary>本素材需要满足的参考约束</summary><ul>${list(ref.candidateChecks)}</ul></details>${rejected.length?`<details class="rejected-candidate"><summary>首版为何拒收？查看失败候选与修订</summary>${rejected.map(candidate=>`<div class="rejected-content"><a href="${esc(candidate.src)}" target="_blank"><img src="${esc(candidate.src)}" alt="已拒收的大雁塔首版，塔层数和高砖台有误" loading="lazy"></a><div><span class="rejected-badge">已拒收 · 不参与合成</span><p>${esc(candidate.reason)}。</p><p>上方现用素材为修订版；首稿留作技术探索的对照证据。</p><a href="data/generation-log.json" target="_blank" class="text-link">查看修订提示与生成记录 ↗</a></div></div>`).join('')}</details>`:''}`;
}

function renderAnchor(){
  const p=input?.places.find(p=>p.id===state.selected); if(!p)return;
  $('#selected-anchor').innerHTML=`<h3>${esc(p.name)}</h3><span class="anchor-id">${esc(p.id)}</span><p class="coordinate">${p.lon.toFixed(7)}° E<br>${p.lat.toFixed(7)}° N</p><p class="anchor-meaning">WGS84 · ${p.role==='site-center'?'景区范围中心':'建筑中心'}<br>地点中心，不代表已核实入口。</p><span class="text-link">${sourceLink(p.sourceUrl,'查看坐标来源')}</span>`;
}

function renderCanvas(){
  const c=composition;if(!c)return;
  const colliding=new Set(audit.overlaps.flatMap(o=>[o.a,o.b]));
  const frames=c.frames.map(f=>{
    let grid=''; for(let i=1;i<4;i++){const x=f.x+f.width*i/4,y=f.y+f.height*i/4;grid+=`<path class="geo-grid" d="M${x} ${f.y+38}V${f.y+f.height}M${f.x} ${y}H${f.x+f.width}"/>`;}
    const scaleMeters=f.kind==='locator'?10000:f.id.includes('lintong')?1000:500;
    const scaleWidth=Math.min(f.width-55,scaleMeters*f.scale);
    const actualMeters=scaleWidth/f.scale;
    const scaleText=actualMeters>=1000?`${(actualMeters/1000).toFixed(actualMeters%1000?1:0)} km`:`${Math.round(actualMeters)} m`;
    return `<g><rect class="geo-frame" x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" rx="6"/>${grid}<text class="geo-title" x="${f.x+16}" y="${f.y+27}">${esc(f.title)}</text><path class="scale-line" d="M${f.x+16} ${f.y+f.height-22}v5h${scaleWidth}v-5"/><text class="scale-label" x="${f.x+16}" y="${f.y+f.height-29}">${scaleText}</text>${f.kind==='locator'?`<text class="geo-caption" x="${f.x+f.width-18}" y="${f.y+f.height-15}" text-anchor="end">实际相对方位</text>`:''}</g>`;
  }).join('');
  const locator=c.frames.filter(f=>f.kind==='locator').flatMap(f=>f.nodes.map(n=>{const label=names[n.id]??n.shortName;const sameArea=n.id==='bell-tower'||n.id==='drum-tower'; const dx=n.id==='drum-tower'?-9:8,dy=n.id==='bell-tower'?17:n.id==='drum-tower'?-11:-9;return`<g class="map-node ${state.selected===n.id?'selected':''}" role="button" tabindex="0" data-place="${esc(n.id)}" aria-label="选择${esc(label)}的定位点"><circle class="selection-ring" cx="${n.x}" cy="${n.y}" r="10"/><circle class="anchor" cx="${n.x}" cy="${n.y}" r="4"/><text class="locator-label" x="${n.x+dx}" y="${n.y+dy}" text-anchor="${sameArea&&dx<0?'end':'start'}">${esc(label)}</text></g>`;})).join('');
  const placements=c.placements.map(p=>{
    const a=c.anchors.find(a=>a.placeId===p.placeId), selected=p.placeId===state.selected;
    const registered=manifest.assets.find(asset=>asset.id===p.assetId);
    const mismatched=registered?.placeId!==p.placeId;
    const debug=state.debug?`<rect class="material-box ${colliding.has(p.placeId)?'collision':''} ${selected?'selected':''}" x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}"/><path class="anchor-cross" d="M${a.x-7} ${a.y}h14M${a.x} ${a.y-7}v14"/><circle class="anchor" cx="${a.x}" cy="${a.y}" r="3"/>${Math.hypot(p.center.x-a.x,p.center.y-a.y)>1?`<path class="displacement" d="M${a.x} ${a.y}L${p.center.x} ${p.center.y}"/>`:''}`:'';
    const yLabel=p.y+p.height+19;
    const alignmentNote=Math.hypot(p.center.x-a.x,p.center.y-a.y)>1?'故障：素材框中心偏离地理锚点':'地理锚点与素材框中心对齐';
    return`<g class="map-node ${selected?'selected':''}" role="button" tabindex="0" data-place="${esc(p.placeId)}" aria-label="选择${esc(names[p.placeId])}${mismatched?'，当前注入了错误素材':''}"><title>${esc(names[p.placeId])} · ${mismatched?'故障：载入'+names[registered.placeId]+'素材':alignmentNote}</title><rect class="selection-ring" x="${p.x-5}" y="${p.y-5}" width="${p.width+10}" height="${p.height+10}" rx="5"/><image href="${esc(p.src)}" x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" preserveAspectRatio="xMidYMid meet"/>${debug}<text class="node-label" x="${p.center.x}" y="${yLabel}" text-anchor="middle">${esc(names[p.placeId])}</text>${p.placeId==='terracotta'?`<text class="node-subtitle" x="${p.center.x}" y="${yLabel+16}" text-anchor="middle">内部主题符号</text>`:''}${mismatched?`<text class="fault-tag" x="${p.center.x}" y="${p.y-13}" text-anchor="middle">误绑${esc(names[registered.placeId])}素材</text>`:''}</g>`;
  }).join('');
  const missing=c.anchors.filter(a=>!c.placements.some(p=>p.placeId===a.placeId)).map(a=>`<g role="button" tabindex="0" class="map-node" data-place="${esc(a.placeId)}" aria-label="${esc(names[a.placeId])}素材缺失"><circle class="anchor" cx="${a.x}" cy="${a.y}" r="4"/><text class="fault-tag" x="${a.x}" y="${a.y-15}" text-anchor="middle">${esc(names[a.placeId])}素材缺失</text></g>`).join('');
  $('#plot').innerHTML=`<svg viewBox="0 0 ${c.width} ${c.height}" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="真实坐标上的四地标素材合成"><text class="geo-caption" x="20" y="23">E1 地理骨架 × E2 生成素材 · 图面不是导航地图</text><text class="geo-caption" x="1180" y="23" text-anchor="end">北 ↑</text>${frames}${locator}${placements}${missing}</svg>`;
  $('#plot').classList.toggle('zoomed',state.zoom===2);
}

function renderAudit(){
  const failure=audit.checks.filter(c=>!c.pass);
  $('#metrics').innerHTML=[
    ['已放置素材',`${composition.placements.length} / 4`,'每一份绑定一个地点',composition.placements.length!==4?'danger':''],
    ['最大锚点偏移',`${Number.isFinite(audit.maxAnchorErrorPx)?audit.maxAnchorErrorPx.toFixed(1):'—'} px`,'按素材框中心回算',audit.maxAnchorErrorPx>1e-6?'danger':''],
    ['矩形重叠候选',`${audit.overlaps.length} 对`,'不等于实际主体遮挡',audit.overlaps.length?'warning':''],
    ['真实主体可见率','尚未实测','90% 为待验证目标','warning']
  ].map(([label,value,note,cl])=>`<div class="metric"><span>${label}</span><strong class="${cl}">${value}</strong><small>${note}</small></div>`).join('');
  $('#audit-summary').textContent=audit.pass?'登记绑定与矩形布局检查通过':`发现 ${failure.length} 项检查异常`;
  $('#audit-summary').className=audit.pass?'':'danger';
  $('#audit-checks').innerHTML=audit.checks.map(check=>`<li class="${check.pass?'':'failed'}"><span class="check-icon" aria-hidden="true">${check.pass?'✓':'×'}</span><details><summary>${esc(check.label)}<span class="sr-only">：${check.pass?'通过':'异常'}</span></summary><p>${esc(check.detail)}</p></details></li>`).join('');
}

function refreshComposition(){
  $('#size-output').textContent=`${state.size} px`;
  $('#fault-note').textContent=faultNotes[state.fault];
  if(!input || !manifest?.assets?.length)return;
  try {composition=makeComposition(input,manifest,{size:state.size,fault:state.fault});audit=auditComposition(input,manifest,composition);renderCanvas();renderAudit();$('#export').disabled=false;}
  catch(error){composition=null;audit=null;$('#plot').innerHTML=`<div class="plot-error"><strong>暂停合成，等待完整素材记录</strong><p>${esc(error.message)}</p></div>`;$('#audit-summary').textContent='素材记录未通过输入检查';$('#audit-checks').innerHTML='';$('#metrics').innerHTML='';$('#export').disabled=true;}
}

function activatePlace(event){const target=event.target.closest('[data-place]');if(target)selectPlace(target.dataset.place);}
$('#place-tabs').addEventListener('click',activatePlace);
document.querySelectorAll('[data-background]').forEach(button=>button.addEventListener('click',()=>{const dark=button.dataset.background==='dark';$('.asset-stage').classList.toggle('dark-background',dark);document.querySelectorAll('[data-background]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
$('#plot').addEventListener('click',activatePlace);
$('#plot').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest('[data-place]')){event.preventDefault();activatePlace(event);}});
$('#asset-size').addEventListener('input',event=>{state.size=Number(event.target.value);refreshComposition();});
$('#fault').addEventListener('change',event=>{state.fault=event.target.value;refreshComposition();});
function displayMode(debug){state.debug=debug;$('#clean-mode').setAttribute('aria-pressed',String(!debug));$('#debug-mode').setAttribute('aria-pressed',String(debug));renderCanvas();}
$('#clean-mode').addEventListener('click',()=>displayMode(false));$('#debug-mode').addEventListener('click',()=>displayMode(true));
document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{state.zoom=Number(button.dataset.zoom);document.querySelectorAll('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.zoom)===state.zoom)));$('#plot').classList.toggle('zoomed',state.zoom===2);$('#scroll-hint').textContent=state.zoom===2?'已放大显示 2 倍，可在画布内左右滚动；坐标和素材尺寸没有改变。':'小屏可在画布内左右滑动，放大只改变显示尺寸。';}));
$('#reset').addEventListener('click',()=>{state.size=84;state.fault='normal';state.zoom=1;$('#asset-size').value='84';$('#fault').value='normal';document.querySelectorAll('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.zoom==='1')));$('#scroll-hint').textContent='小屏可在画布内左右滑动，放大只改变显示尺寸。';$('#plot-scroll').scrollTo({left:0,top:0});displayMode(false);refreshComposition();});
$('#export').addEventListener('click',()=>{
  if(!composition||!audit)return;
  const payload={exportedAt:new Date().toISOString(),experiment:'E2',selectedPlaceId:state.selected,display:{debug:state.debug,zoom:state.zoom},composition,audit};
  const json=JSON.stringify(payload,null,2);if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  $('#download-json').href=exportURL;$('#download-json').download=`xian-e2-${state.fault}-${state.size}px.json`;$('#export-preview').textContent=json;$('#export-description').textContent=`${faultLabels[state.fault]} · ${state.size} px · ${audit.pass?'登记与布局检查通过':'包含检查异常'} · 不代表产品已验收`;
  $('#export-dialog').showModal();
});
$('#close-export').addEventListener('click',()=>$('#export-dialog').close());
$('#export-dialog').addEventListener('click',event=>{if(event.target===$('#export-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
window.addEventListener('pagehide',()=>{if(exportURL)URL.revokeObjectURL(exportURL);});

const results=await Promise.allSettled([getJSON('../e1/data/input.json'),getJSON('data/references.json'),getJSON('data/asset-manifest.json')]);
if(results[0].status==='fulfilled')input=results[0].value;
if(results[1].status==='fulfilled')references=results[1].value;
if(results[2].status==='fulfilled')manifest=results[2].value;
if(references){renderReference();renderAnchor();}
else{$('#reference-credit').textContent='参考图记录暂时无法读取。';$('#asset-pending').textContent='请刷新后再试。';}
if(!input||!manifest){$('#plot').innerHTML='<div class="plot-error"><strong>合成素材尚未完整就绪</strong><p>参考照片可先检查；生成图像与记录齐备后，刷新即可操作合成。</p></div>';}
else refreshComposition();
const method=manifest?.generation?.method;
if(manifest?.generation?.fullLogFile)$('#generation-log-link').href=manifest.generation.fullLogFile;
$('#generation-summary').textContent=manifest?`生成方式：${method ?? '见生成记录'}。模型名称${manifest.generation?.model?'：'+manifest.generation.model:'未由工具返回，保持未登记'}。文件状态：素材候选；每张生成图均受参考照片和人工审查范围限制。`:'生成记录待写入。本页不将未知模型、未审查外形或可见率填为通过。';
