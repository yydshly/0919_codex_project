import {validateInput, buildLayout, auditLayout, haversine} from './core.mjs';
const $ = s => document.querySelector(s);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let input, mode='continuous', footprint=84, fault='normal', selected='bell-tower', current=null, exportUrl=null;
const labelOffsets = {'bell-tower':[13,33], 'drum-tower':[-12,-30], pagoda:[14,27], terracotta:[-18,-25]};
const explain = {
  normal:'正常数据通过输入检查后，才进行布局。图面允许更换表达方式，真实地理锚点不能被偷偷移动。',
  swapped:'仅把鼓楼的经度与纬度交换。纬度超过有效范围，必须停止布局，不能猜测并自动修正。',
  'missing-crs':'仅删除鼓楼的坐标系声明。系统无法确认能否与其他点合用，因此停止布局。',
  gcj:'将鼓楼记录标成 GCJ-02，模拟收到不同坐标系的数据。本实验没有转换器，因此拒绝混用；不伪造偏移数值。',
  'flip-drum':'输入坐标保持不变，故意把输出中的鼓楼移到东侧。图仍然能画出来，但锚点偏移与方向检查应失败。',
};
function candidate(){const c=structuredClone(input);const d=c.places.find(p=>p.id==='drum-tower');if(fault==='swapped')[d.lon,d.lat]=[d.lat,d.lon];if(fault==='missing-crs')delete d.crs;if(fault==='gcj')d.crs='GCJ-02';return c;}
function drawFrame(f, layout, audit){
  const isLocator=f.kind==='locator', cx=f.x+f.width/2, cy=f.y+f.height/2;
  let markup=`<g><rect class="geo-frame" x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" rx="8"/>`;
  for(let n=1;n<5;n++){const x=f.x+f.width*n/5,y=f.y+f.height*n/5;markup+=`<path class="geo-grid" d="M${x} ${f.y+34}V${f.y+f.height-30}M${f.x+12} ${y}H${f.x+f.width-12}"/>`;}
  markup+=`<text class="geo-title" x="${f.x+17}" y="${f.y+25}">${esc(f.title)}</text>`;
  if(isLocator){
    for(const panel of layout.frames.filter(p=>p.kind==='primary')){
      const x=cx+((panel.bounds.minX+panel.bounds.maxX)/2-(f.bounds.minX+f.bounds.maxX)/2)*f.scale;
      const y=cy-((panel.bounds.minY+panel.bounds.maxY)/2-(f.bounds.minY+f.bounds.maxY)/2)*f.scale;
      const w=(panel.bounds.maxX-panel.bounds.minX)*f.scale,h=(panel.bounds.maxY-panel.bounds.minY)*f.scale;
      markup+=`<rect class="locator-outline" x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}"/>`;
    }
  }
  for(const n of f.nodes){
    const collides=audit.collisions.some(c=>c.frameId===f.id&&(c.a===n.id||c.b===n.id));
    if(!isLocator)markup+=`<rect class="material ${collides?'collision':''} ${selected===n.id?'selected':''}" x="${n.x-footprint/2}" y="${n.y-footprint/2}" width="${footprint}" height="${footprint}" rx="3"/>`;
  }
  for(const n of f.nodes){
    const [ox,oy]=labelOffsets[n.id];
    const dx=isLocator?ox*.5:ox,dy=isLocator?oy*.7:oy;
    const ax=dx<0?'end':'start';
    markup+=`<g class="map-node" data-place="${n.id}" role="button" tabindex="0" aria-label="选择${esc(n.shortName)}，${esc(f.title)}"><title>${esc(n.name)} · ${esc(f.title)}</title><path class="leader" d="M${n.x} ${n.y}L${n.x+dx*.75} ${n.y+dy*.75}"/><circle class="anchor" cx="${n.x}" cy="${n.y}" r="${isLocator?4:6}"/><text class="${isLocator?'map-label':'node-label'}" x="${n.x+dx}" y="${n.y+dy}" text-anchor="${ax}">${esc(n.shortName)}</text></g>`;
  }
  const targetMeters=Math.min(130,f.width*.3)/f.scale;
  const power=10**Math.floor(Math.log10(targetMeters));
  const bar=[1,2,5,10].map(n=>n*power).filter(n=>n<=targetMeters).at(-1)||power;
  const bx=f.x+18,by=f.y+f.height-18,len=bar*f.scale;
  markup+=`<path class="scale-line" d="M${bx} ${by-5}v5h${len}v-5"/><text class="scale-label" x="${bx}" y="${by-10}">${bar>=1000?bar/1000+' km':bar+' m'}</text>`;
  markup+=`<text class="geo-caption" x="${f.x+f.width-14}" y="${f.y+f.height-18}" text-anchor="end">北 ↑</text></g>`;
  return markup;
}
function renderPlot(layout,audit){
  $('#plot').innerHTML=`<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" aria-labelledby="plot-title plot-description"><title id="plot-title">${mode==='continuous'?'连续全域图':'城区放大与独立分区图'}</title><desc id="plot-description">四处地点由真实坐标投影。方框表示素材占位，点表示地理锚点；可点选地点查看坐标。不是道路地图或生成插画。</desc><text class="geo-caption" x="20" y="23">地理骨架 / 素材占位诊断 · 非生成插画</text>${layout.frames.map(f=>drawFrame(f,layout,audit)).join('')}</svg>`;
  $('#plot-wrap').setAttribute('tabindex','0');
  $('#plot-wrap').setAttribute('aria-label','地理布局画布，窄屏可横向滚动查看完整图幅');
}
function renderPlace(c){
  const p=c.places.find(p=>p.id===selected);
  $('#place-buttons').innerHTML=input.places.map(p=>`<button type="button" data-place="${p.id}" aria-pressed="${selected===p.id}">${esc(p.shortName)}</button>`).join('');
  $('#place-info').innerHTML=`<h3>${esc(p.shortName)}</h3><code>${esc(p.id)}</code><div class="coordinates">经度 ${p.lon.toFixed(7)}<br>纬度 ${p.lat.toFixed(7)}</div><p class="meaning">${esc(p.crs||'坐标系缺失')} · ${p.role==='site-center'?'景区范围中心':'建筑中心'}<br>实际入口仍待核实${fault!=='normal'&&p.id==='drum-tower'?'<br><span class="danger">当前为故障测试样本</span>':''}</p><a class="text-link" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">查看原始地图记录 ↗</a>`;
}
function renderComparison(){
  $('#comparison-rows').innerHTML=['continuous','split'].map(m=>{
    const a=auditLayout(input,buildLayout(input,m,{footprint}));
    return `<tr><td>${m==='continuous'?'A · 连续全域':'B · 分区放大'}</td><td>${a.minSeparationPx.toFixed(1)} px</td><td class="${a.collisions.length?'warning':''}">${a.collisions.length} 对</td><td>${a.pass?'通过':'失败'}</td></tr>`;
  }).join('');
  $('caption').textContent=`正常输入与正常输出 · 同为 ${footprint} px 正方形占位；不同图幅间不比较像素距离`;
}
function metric(label,value,note,cls=''){return `<div class="metric"><span>${label}</span><strong class="${cls}">${value}</strong><small>${note}</small></div>`;}
function render(){
  const c=candidate(),valid=validateInput(c);
  current=null;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  $('#size-output').textContent=footprint+' px';$('#fault-explanation').textContent=explain[fault];$('#export-status').textContent='';
  renderPlace(c);renderComparison();
  $('#layout-note').textContent=mode==='continuous'?'A：全域采用一个比例。相邻地标被压缩，素材可能遮挡；缩小素材可缓解遮挡，但会影响辨认。':'B：每个图幅内部保持比例，全域定位图说明真实关系。图幅之间的位置是排版，不能据此判断方向和距离。窄屏可横向查看。';
  $('#export-layout').disabled=!valid.valid;
  if(!valid.valid){
    $('#plot').innerHTML=`<div class="plot-error"><strong>输入未通过，停止布局。</strong><p>${esc(valid.errors.map(e=>e.message).join('；'))}</p><p>在下方选择“正常数据”即可恢复实验。</p></div>`;
    $('#metrics').innerHTML=metric('输入状态','已拦截','未生成坐标布局','danger')+metric('主图内最近锚点','—','输入无效，不计算')+metric('占位重叠','—','输入无效，不计算')+metric('投影锚点偏移','—','输入无效，不计算');
    $('#audit-summary').innerHTML='<span class="danger">已拦截输入故障</span><small>未进入投影和画图，不能把无效数据画成正常效果。</small>';
    $('#audit-checks').innerHTML=valid.errors.map(e=>`<li class="failed"><span class="check-icon">×</span><span>${esc(e.message)}<br><code>${esc(e.path)}</code></span></li>`).join('');
    return;
  }
  const layout=buildLayout(c,mode,{footprint,fault:fault==='flip-drum'?'flip-drum':null}),audit=auditLayout(c,layout);
  current={input:c,layout,audit};renderPlot(layout,audit);
  $('#metrics').innerHTML=metric('与输入坐标的一致性',audit.pass?'通过':'未通过','仅验证布局自洽',audit.pass?'':'danger')+metric('主图内最近锚点',audit.minSeparationPx.toFixed(1)+' px','基准画布像素，不是实际距离')+metric('素材占位重叠',audit.collisions.length+' 对',`${footprint} × ${footprint} px 正方形`,audit.collisions.length?'warning':'')+metric('投影锚点最大偏移',audit.maxAnchorErrorPx.toFixed(2)+' px','相对输入计算值',audit.maxAnchorErrorPx>1e-6?'danger':'');
  $('#audit-summary').innerHTML=`<span class="${audit.pass?'':'danger'}">${audit.pass?'地理布局检查通过':'输出故障已发现：布局未通过'}</span><small>${audit.collisions.length?'另有素材占位重叠；地理一致性和画面可读性分别检查。':'当前主图没有素材方框重叠；定位小图不参与素材占位统计。'}</small>`;
  $('#audit-checks').innerHTML=audit.checks.map(check=>`<li class="${check.pass?'':'failed'}" title="${esc(check.detail)}"><span class="check-icon">${check.pass?'✓':'×'}</span><span>${esc(check.label)}</span></li>`).join('');
}
function selectPlace(id,focus=false){selected=id;render();if(focus)$(`#place-buttons [data-place="${id}"]`).focus();}
document.addEventListener('click',event=>{const b=event.target.closest('[data-mode]');if(b&&input){mode=b.dataset.mode;render();}const p=event.target.closest('[data-place]');if(p&&input)selectPlace(p.dataset.place,p.closest('#place-buttons')!==null);});
$('#plot').addEventListener('keydown',e=>{const p=e.target.closest('[data-place]');if(p&&['Enter',' '].includes(e.key)){e.preventDefault();selectPlace(p.dataset.place,true);}});
$('#footprint').addEventListener('input',e=>{footprint=Number(e.target.value);if(input)render();});
$('#fault').addEventListener('change',e=>{fault=e.target.value;if(input)render();});
$('#reset').addEventListener('click',()=>{fault='normal';footprint=84;$('#fault').value='normal';$('#footprint').value='84';if(input)render();});
$('#export-layout').addEventListener('click',()=>{
  if(!current)return;
  const payload={experiment:'E1',exportedAt:new Date().toISOString(),state:{mode,footprint,fault},meaning:'诊断样本；检查通过仅代表布局与输入一致，非已核实地图或导航依据',...current};
  if(exportUrl)URL.revokeObjectURL(exportUrl);
  const json=JSON.stringify(payload,null,2);exportUrl=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const a=$('#download-json');a.href=exportUrl;a.download=`e1-${mode}-${fault}-${footprint}px.json`;
  $('#export-preview').textContent=json;
  $('#export-description').textContent=`${a.download} · ${current.audit.pass?'布局检查通过':'故障样本：布局检查未通过'}`;
  $('#export-status').textContent='当前记录已准备，可在预览中下载 JSON。';
  $('#export-dialog').showModal();
});
$('#close-export').addEventListener('click',()=>$('#export-dialog').close());
try{
  const response=await fetch('data/input.json');if(!response.ok)throw Error('地点样本未加载');input=await response.json();
  const v=validateInput(input);if(!v.valid)throw Error(v.errors.map(e=>e.message).join('；'));
  const bell=input.places.find(p=>p.id==='bell-tower');
  $('#distances').innerHTML=['drum-tower','pagoda','terracotta'].map((id,i)=>{const p=input.places.find(p=>p.id===id),d=haversine(bell,p);return `<div><dt>钟楼 → ${esc(p.shortName)}<small>${['西偏北','南偏东','东北'][i]}</small></dt><dd>${d<1000?d.toFixed(0): (d/1000).toFixed(2)} <small>${d<1000?'米':'公里'}</small></dd></div>`;}).join('');
  render();
}catch(error){$('#plot').innerHTML=`<div class="plot-error"><strong>实验暂未加载</strong><p>${esc(error.message)}</p></div>`;$('#export-layout').disabled=true;}
