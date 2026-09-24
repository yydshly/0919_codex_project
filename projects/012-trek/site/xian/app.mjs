import { DEFAULT_PROFILE, DEFAULT_SELECTION, rankPlaces, makePlan, dayWarnings, amapUrl, formatDuration } from './core.mjs';
import { createAtlas } from './atlas.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const draftKey = 'changan-first-visit-v1';
const state = { profile:structuredClone(DEFAULT_PROFILE), selected:new Set(DEFAULT_SELECTION), plan:null, day:0, page:'discover', filter:'all', query:'', focus:null, dirty:false, pending:false, tripId:null, revision:0, saving:false };
let data, places, byId, map, pins, routeLine, routeRequest=0, toastTimer, atlas;
let photos={};
const areaNames = {center:'古城与市区',south:'城南 · 雁塔',east:'临潼 · 城外'};

function renderAtlas(){atlas?.render({selected:state.selected,plan:state.plan,profile:state.profile,focusId:state.focus,pending:state.pending});}
function photoMarkup(place,style='detail') {
  const photo=photos[place.id];if(!photo?.src)return '';
  return `<figure class="place-photo ${style}-photo"><img src="${esc(photo.src)}" alt="${esc(photo.alt||place.name)}" loading="lazy" decoding="async" style="object-position:${esc(photo.position||'50% 50%')}">${style==='detail'?`<figcaption>${esc(photo.caption||place.name)}<small>图片：${esc(photo.credit)} · <a href="${esc(photo.licenseUrl||photo.sourceUrl)}" target="_blank" rel="noreferrer">${esc(photo.license)}</a> · <a href="${esc(photo.sourceUrl)}" target="_blank" rel="noreferrer">查看来源 ↗</a></small></figcaption>`:style==='card'?`<figcaption>${photo.kind==='dish-photo'?'菜品实拍参考 · 非门店出品':'景点实拍'}</figcaption>`:style==='stop'&&photo.kind==='dish-photo'?'<figcaption>菜品参考<br>非门店出品</figcaption>':''}</figure>`;
}
function showRealPosition(id){
  state.filter='all';state.query='';$('#search').value='';
  document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter==='all');b.setAttribute('aria-pressed',b.dataset.filter==='all');});
  switchPage('discover');focusPlace(id);document.querySelector('.map-panel').scrollIntoView({block:'start',behavior:'smooth'});
  setTimeout(()=>{if(map){map.invalidateSize();map.setView([byId.get(id).lat,byId.get(id).lng],14);}},0);
}
function openCurrentPlan(){if(!state.plan||state.pending)createPlan();else{switchPage('plan');fitMap();}$('#plan-view').scrollIntoView({block:'start',behavior:'smooth'});}

function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200); }
async function api(path, options={}) {
  const response = await fetch(path,{...options,signal:AbortSignal.timeout(22000)});
  const body = await response.json().catch(()=>({error:'服务暂不可用，请通过 5213 端口打开完整体验。'}));
  if (!response.ok || body.ok===false) throw new Error(body.error || '请求未完成，请重试。');
  return body;
}
function persist() {
  try { localStorage.setItem(draftKey,JSON.stringify({profile:state.profile,selected:[...state.selected],plan:state.plan,dirty:state.dirty,pending:state.pending,tripId:state.tripId})); }
  catch { $('#save-help').textContent='浏览器未允许本地草稿，请使用保存旅行或导出文本保留修改。'; }
}
function validPlan(plan) {
  return plan && Array.isArray(plan.days) && plan.days.length===3 && plan.days.every(day=>typeof day.title==='string' && Array.isArray(day.stops) && day.stops.every(stop=>byId.has(stop.placeId)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(stop.time)));
}
function normalizeProfile(profile={}) {
  return {...DEFAULT_PROFILE,party:['couple','parents','family'].includes(profile.party)?profile.party:'couple',pace:profile.pace==='relaxed'?'relaxed':'balanced',interests:Array.isArray(profile.interests)?profile.interests.filter(i=>['history','food','walk'].includes(i)):['history','food'],museumBooked:profile.museumBooked===true,days:3};
}
function restore() {
  try {
    const draft=JSON.parse(localStorage.getItem(draftKey));
    if(!draft) return false;
    state.profile=normalizeProfile(draft.profile);
    if(Array.isArray(draft.selected)) state.selected=new Set(draft.selected.filter(id=>byId.has(id)));
    if(validPlan(draft.plan)) state.plan=draft.plan;
    state.dirty=draft.dirty===true;state.pending=draft.pending===true;state.tripId=Number.isInteger(draft.tripId)?draft.tripId:null;
    return true;
  } catch { return false; }
}
function markDirty({pending=false}={}) { state.revision++;state.dirty=true;state.pending=state.pending||pending;persist();renderSave(); }
function renderSave() {
  $('#save-state').textContent=state.dirty?'有未保存的调整':state.tripId?'已保存到 TREK':'浏览器中的旅行草稿';
  $('#save-state').classList.toggle('saved',!!state.tripId&&!state.dirty);
  $('#save-plan').disabled=state.saving||state.pending||!state.plan||!state.plan.days.some(d=>d.stops.length);
  if(state.pending) $('#save-help').textContent='地点或偏好已经改变，请点击“按当前偏好重新安排”后再保存。';
  else $('#save-help').textContent=state.tripId&&!state.dirty?'已从 TREK 读回并确认保存。你可以继续调整，或打开原版查看。':'保存会写入本地 TREK 的专属西安旅行；未保存的调整只留在当前浏览器。';
  $('#trek-link').hidden=!state.tripId;
  if(state.tripId) $('#trek-link').href=`http://127.0.0.1:3212/trips/${state.tripId}`;
  renderAtlas();
}
function renderProfile() {
  const parties={couple:'两人同行',parents:'带父母',family:'亲子家庭'};
  const labels={history:'历史',food:'美食',walk:'街区散步'};
  $('#profile-summary').textContent=`${parties[state.profile.party]} · ${state.profile.interests.map(i=>labels[i]).join('与')||'随心探索'}`;
  $('#pace-summary').textContent=state.profile.pace==='relaxed'?'轻松慢游':'节奏适中';
  $('#party').value=state.profile.party;$('#pace').value=state.profile.pace;
  document.querySelectorAll('[name=interest]').forEach(input=>input.checked=state.profile.interests.includes(input.value));
  $('#museum-booked').checked=state.profile.museumBooked;
  $('#recommendation-note').textContent=state.profile.party==='parents'||state.profile.pace==='relaxed'?'轻松优先：地点按体力与兴趣重新排序，生成行程时减少每天安排，留出休息。':state.profile.party==='family'?'亲子优先：增加历史故事与户外体验的权重；每个地点仍由你决定是否加入。':'为首次到访精选，历史与美食按你的兴趣排序。已预选一组经典地点，可自由增减。';
}
function shownPlaces() {
  return rankPlaces(places,state.profile).filter(p=>(state.filter==='all'||state.filter===p.kind||state.filter==='saved'&&state.selected.has(p.id))&&(!state.query||[p.name,p.subtitle,p.reason,...p.tags].join(' ').toLowerCase().includes(state.query.toLowerCase())));
}
function renderCatalog() {
  const shown=shownPlaces();
  $('#place-count').textContent=`${places.filter(p=>p.kind==='sight').length} 个景点 · ${places.filter(p=>p.kind==='food').length} 家餐厅`;
  $('#selected-count').textContent=state.selected.size;$('#nav-count').textContent=state.selected.size;
  $('#catalog').innerHTML=shown.length?shown.map(p=>`<article class="place-card ${state.focus===p.id?'highlight':''}">${photos[p.id]?.src?`<button class="photo-open" data-detail="${p.id}" aria-label="查看${esc(p.name)}的图片与详情">${photoMarkup(p,'card')}</button>`:''}<div class="card-top"><span class="place-area">${areaNames[p.area]}</span><span class="kind-tag ${p.kind==='food'?'food':''}">${p.kind==='food'?'值得吃':'值得去'}</span></div><div class="card-body"><button class="card-open" data-detail="${p.id}"><h3>${esc(p.name)}</h3><p class="subtitle">${esc(p.subtitle)}</p></button><p class="card-reason">${esc(p.reason.replace(/^编辑推荐：/,''))}</p><div class="card-tags">${p.tags.slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="card-meta"><span>预计 ${formatDuration(p.duration)}</span><button class="add-button ${state.selected.has(p.id)?'added':''}" data-add="${p.id}" aria-label="${state.selected.has(p.id)?'移除':'加入'}${esc(p.name)}" aria-pressed="${state.selected.has(p.id)}">${state.selected.has(p.id)?'✓ 已加入':'＋ 想去'}</button></div>${p.id==='shaanxi-museum'||p.id==='terracotta'?'<p class="reserve-mark">需先确认官方预约</p>':''}</div></article>`).join(''):'<p class="empty">没有匹配的地点。试试其他关键词，或切换分类。</p>';
  renderAtlas();
}
function togglePlace(id) {
  if(!byId.has(id))return;
  state.selected.has(id)?state.selected.delete(id):state.selected.add(id);
  markDirty({pending:!!state.plan});renderCatalog();renderPins();
  toast(state.selected.has(id)?'已加入心动地点，可重新生成行程。':'已从心动地点移除。');
}
function createPlan() {
  if(!state.selected.size){toast('先选一个你想去的地方。');return;}
  state.plan=makePlan(places,[...state.selected],state.profile);state.pending=false;state.day=0;
  markDirty();switchPage('plan');renderPlan();fitMap();toast('三日安排已生成，可以换序、移除或查看道路路线。');
}
function renderPlan() {
  if(!state.plan)return;
  $('#day-tabs').innerHTML=state.plan.days.map((d,i)=>`<button data-day="${i}" class="${i===state.day?'active':''}" aria-pressed="${i===state.day}">DAY 0${i+1}<strong>${esc(d.title)}</strong></button>`).join('');
  const day=state.plan.days[state.day];
  $('#map-selection').innerHTML=`<span class="eyebrow">DAY 0${state.day+1} / ${day.stops.length} STOPS</span><h3>${esc(day.title)}</h3><p>${day.stops.map(s=>esc(byId.get(s.placeId).name)).join(' → ')||'这一天留给自由安排。'}</p>`;
  const minutes=day.stops.reduce((n,s)=>n+byId.get(s.placeId).duration,0);
  $('#day-intro').innerHTML=`<h3>${esc(day.title)}</h3><p>${day.stops.length} 个停留点 · 游玩与用餐预计 ${formatDuration(minutes)}，另留交通、排队与休息时间</p>`;
  $('#timeline').innerHTML=day.stops.length?day.stops.map((s,i)=>{
    const p=byId.get(s.placeId);
    return `<article class="stop-row"><div class="stop-time"><label><span class="sr-only">${esc(p.name)}开始时间</span><input type="time" data-time="${i}" value="${s.time}" aria-label="${esc(p.name)}开始时间"></label></div><div class="stop-main">${photoMarkup(p,'stop')}<h4>${esc(p.name)}</h4><p>${esc(p.subtitle)} · 预计 ${formatDuration(p.duration)}</p><p>${esc(p.id==='tang-night'?'傍晚街区散步，演出以当日公告为准。':p.reservation)}</p><div class="stop-actions"><button data-up="${i}" ${i===0?'disabled':''}>↑ 提前</button><button data-down="${i}" ${i===day.stops.length-1?'disabled':''}>↓ 稍后</button><button data-remove="${i}">移除</button><button data-detail="${p.id}">看详情</button><a href="${esc(amapUrl(p))}" target="_blank" rel="noreferrer">在高德打开 ↗</a></div></div></article>`;
  }).join(''):'<p class="empty">这一天先留白。去发现页选些同一区域的地点，再重新安排。</p>';
  $('#day-warning').innerHTML=dayWarnings(state.plan,state.day,places).map(w=>`<div>${esc(w)}</div>`).join('');
  $('#booking-explainer').textContent=state.profile.museumBooked?'你已手动确认预约。请核对实际日期、入馆时段与闭馆公告；本产品不核验订单。':'选中陕历博但未确认预约时，安排兴庆宫公园作为备选；它位于市区东城，需要另留前往城南的交通时间。';
  renderSave();renderPins();resetRoute();
}
function swapStop(index,delta) {
  const stops=state.plan.days[state.day].stops;const next=index+delta;
  if(!stops[next])return;
  [stops[index].placeId,stops[next].placeId]=[stops[next].placeId,stops[index].placeId];
  markDirty();renderPlan();
}
function switchPage(page,updateHash=true) {
  if(!['atlas','discover','plan','about'].includes(page))page='atlas';
  if(page==='plan'&&!state.plan){if(!state.selected.size){toast('请先选择地点。');return;}state.plan=makePlan(places,[...state.selected],state.profile);markDirty();}
  state.page=page;
  for(const name of ['atlas','discover','plan','about'])$(`#${name}-view`).hidden=name!==page;
  $('#detail-workspace').hidden=page==='atlas';document.body.dataset.page=page;
  document.querySelectorAll('[data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===page));
  if(updateHash)history.replaceState(null,'',`#${page}`);
  if(page==='plan')renderPlan();else{renderPins();resetRoute();if(page==='atlas')renderAtlas();}
  $('#map-title').textContent=page==='plan'?`DAY 0${state.day+1} · 地点与路线`:'心动的地方，都在这里。';
  if(map&&page!=='atlas')setTimeout(()=>{map.invalidateSize();fitMap();},0);
}
function mapPoints() { return state.page==='plan'&&state.plan?state.plan.days[state.day].stops.map(s=>byId.get(s.placeId)):shownPlaces(); }
function renderPins() {
  if(!map)return;pins.clearLayers();
  mapPoints().forEach((p,i)=>{
    const icon=L.divIcon({className:`number-pin ${p.kind==='food'?'food':''} ${state.selected.has(p.id)?'selected':''} ${state.focus===p.id?'focus':''}`,html:String(i+1),iconSize:[28,28],iconAnchor:[14,14]});
    const marker=L.marker([p.lat,p.lng],{icon,title:p.name,alt:p.name}).addTo(pins);
    marker.bindTooltip(esc(p.name),{direction:'top'});marker.on('click',()=>focusPlace(p.id));
  });
}
function fitMap() {
  if(!map)return;const shown=mapPoints();
  if(shown.length)map.fitBounds(shown.map(p=>[p.lat,p.lng]),{padding:[36,36],maxZoom:14});
}
function focusPlace(id) {
  const p=byId.get(id);if(!p)return;state.focus=id;
  $('#map-selection').innerHTML=`<span class="eyebrow">${areaNames[p.area]}</span><h3>${esc(p.name)}</h3><p>${esc(p.reason.replace(/^编辑推荐：/,''))}</p><div class="selection-actions"><button data-detail="${id}">详情与预约提示</button><a target="_blank" rel="noreferrer" href="${esc(amapUrl(p))}">在高德打开 ↗</a><button data-add="${id}">${state.selected.has(id)?'移出心动':'加入心动'}</button></div>`;
  if(map)map.setView([p.lat,p.lng],Math.max(map.getZoom(),13));renderPins();renderCatalog();
}
function initMap() {
  if(!window.L){$('#map').textContent='地图组件加载失败，请刷新后重试。';return;}
  map=L.map('map',{scrollWheelZoom:false}).setView([34.258,108.96],12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'}).addTo(map);
  pins=L.layerGroup().addTo(map);renderPins();fitMap();
}
function resetRoute() {
  routeRequest++;if(routeLine&&map)map.removeLayer(routeLine);routeLine=null;
  $('#load-route').disabled=false;$('#load-route').textContent='查看当天道路路线';
  $('#route-status').classList.remove('error');
  $('#route-status').textContent=state.page==='plan'?'按当前地点顺序查询真实道路。时间不含实时路况、游玩或排队。':'生成行程后，查看当天实际道路路线与距离。';
}
async function loadRoute() {
  if(state.page!=='plan'){switchPage('plan');fitMap();}
  if(!state.plan)return;
  const ids=state.plan.days[state.day].stops.map(s=>s.placeId);
  if(ids.length<2){toast('当天至少需要两个地点才能查询串联路线。');return;}
  const mode=$('#travel-mode').value,request=++routeRequest;
  $('#load-route').disabled=true;$('#load-route').textContent='正在查询…';$('#route-status').textContent='正在向 OSRM 查询实际道路…';
  try{
    const route=await api(`/api/route?ids=${encodeURIComponent(ids.join(','))}&mode=${mode}`);
    if(request!==routeRequest)return;
    if(routeLine&&map)map.removeLayer(routeLine);
    if(map){routeLine=L.polyline(route.coordinates,{color:'#376848',weight:4,opacity:.85}).addTo(map);map.fitBounds(routeLine.getBounds(),{padding:[30,30]});}
    $('#route-status').textContent=`${mode==='walking'?'步行':'驾车'}道路约 ${(route.distance/1000).toFixed(1)} 公里 · 约 ${formatDuration(Math.round(route.duration/60))}（无实时路况）。来源：OSRM / OpenStreetMap；景区中心可能与入口有差异。${mode==='walking'&&route.distance>10000?'距离较长，建议分段乘车。':''}`;
    $('#route-status').classList.remove('error');
  }catch(error){if(request===routeRequest){$('#route-status').textContent=`道路查询未完成：${error.message} 地图仍可查看真实地点，可在高德打开目的地。`;$('#route-status').classList.add('error');}}
  finally{if(request===routeRequest){$('#load-route').disabled=false;$('#load-route').textContent='重新查询道路路线';}}
}
function sourcesList(ids) { return (ids?data.sources.filter(s=>ids.includes(s.id)):data.sources).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ↗</a><small>核实于 ${esc(s.checkedAt)}</small></li>`).join(''); }
function openDialog(title,body) {
  const dialog=$('#detail-dialog');dialog.innerHTML=`<div class="dialog-header"><h2 id="detail-title">${esc(title)}</h2><button data-close>关闭</button></div><div class="dialog-content">${body}</div>`;
  if(!dialog.open)dialog.showModal();
}
function showDetail(id) {
  const p=byId.get(id);if(!p)return;focusPlace(id);
  openDialog(p.name,`${photoMarkup(p)}<p>${esc(p.subtitle)}</p><p>${esc(p.reason)}</p><h3>怎样安排</h3><p>规划停留 ${formatDuration(p.duration)}（编辑估计）。${esc(p.practical)}</p><h3>预约与费用</h3><p>${esc(p.reservation)}</p><p>${esc(p.priceNote)}</p>${p.foodType?`<h3>吃什么</h3><p>${esc(p.foodType)}</p>`:''}<h3>在哪里</h3><p>${esc(p.address)}</p><p class="source-note">${esc(p.coordinateAccuracy)}。导航使用高德坐标转换；到达前请确认入口或店铺当前营业状态。</p><h3>信息依据</h3><ul class="source-list">${sourcesList(p.sourceIds)}</ul><div class="dialog-actions"><button class="primary" data-add="${id}" data-close>${state.selected.has(id)?'移出心动地点':'加入心动地点'}</button><button class="secondary" data-real-position="${id}" data-close>查看真实位置</button><a class="secondary" href="${esc(amapUrl(p))}" target="_blank" rel="noreferrer">在高德打开 ↗</a></div>`);
}
function showSources(){openDialog('地点依据与使用说明',`<p>这版包含 13 个经过整理的真实地点。地址与地理对象有来源，推荐理由、体力等级、停留时长和编排规则属于编辑判断。</p><p>地图由 Leaflet 与 OpenStreetMap 提供；道路由 OSRM 查询，未接入实时交通。没有编造评分、门票余量、营业状态或餐厅订位。</p><p class="source-note">本地演示服务连接 TREK 原版。浏览器草稿和原版数据库保存是两个明确状态；点击“保存这趟旅行”后才写入数据库。</p><ul class="source-list">${sourcesList()}</ul>`);}
async function savePlan() {
  if(!state.plan||state.pending||state.saving)return;
  const revision=state.revision;state.saving=true;
  const button=$('#save-plan');button.disabled=true;button.textContent='正在保存并核验…';
  try {
    const payload={title:state.plan.title,profile:{...state.profile,selectedIds:[...state.selected]},days:state.plan.days.map(d=>({title:d.title,stops:d.stops.map(s=>({placeId:s.placeId,time:s.time}))}))};
    const result=await api('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!result.tripId||!validPlan(result.plan))throw new Error('返回结果不完整，暂未确认保存。');
    state.tripId=result.tripId;
    if(state.revision===revision){state.plan=result.plan;state.dirty=false;toast('已保存到 TREK，并从原版数据库读回确认。');}
    else toast('上一版已保存；保存期间的新调整仍保留，请再次保存。');
    persist();renderSave();
  }catch(error){$('#save-help').textContent=`保存未完成：${error.message} 你的浏览器草稿仍保留。`;toast('保存未完成，草稿仍在当前浏览器。');}
  finally{state.saving=false;button.disabled=state.pending||!state.plan?.days.some(d=>d.stops.length);button.textContent='保存这趟旅行';}
}
function exportPlan(){
  if(!state.plan)return;const lines=[state.plan.title,'游玩时间为规划估计；出发前确认预约、营业及交通。',''];
  state.plan.days.forEach((d,i)=>{lines.push(`第${i+1}天 · ${d.title}`);d.stops.forEach(s=>{const p=byId.get(s.placeId);lines.push(`${s.time} ${p.name}（预计${formatDuration(p.duration)}）`,p.address,amapUrl(p));});lines.push(...dayWarnings(state.plan,i,places),'');});
  const sourceIds=new Set(state.plan.days.flatMap(d=>d.stops.flatMap(s=>byId.get(s.placeId).sourceIds)));
  lines.push('地点依据（信息核实于 '+data.updatedAt+'）',...data.sources.filter(s=>sourceIds.has(s.id)).map(s=>`${s.title}\n${s.url}`));
  const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='长安初见-三日行程.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出行程文本。');
}
function bindEvents(){
  const mobileNav=document.createElement('div');mobileNav.className='mobile-actions';mobileNav.innerHTML='<button class="secondary" id="mobile-atlas">城市导览图</button><button class="secondary" id="mobile-map">真实地图</button><button class="primary" id="mobile-plan">三日行程</button>';document.body.append(mobileNav);
  $('#mobile-atlas').onclick=()=>{switchPage('atlas');$('#atlas-view').scrollIntoView({block:'start',behavior:'smooth'});};
  $('#mobile-map').onclick=()=>{if(state.page==='atlas')switchPage('discover');document.querySelector('.map-panel').scrollIntoView({block:'start',behavior:'smooth'});if(map)map.invalidateSize();};
  $('#mobile-plan').onclick=openCurrentPlan;
  document.addEventListener('click',event=>{
    const b=event.target.closest('button,a');if(!b)return;
    if(b.dataset.page){event.preventDefault();switchPage(b.dataset.page);fitMap();}
    if(b.dataset.add)togglePlace(b.dataset.add);
    if(b.dataset.detail)showDetail(b.dataset.detail);
    if(b.dataset.realPosition)showRealPosition(b.dataset.realPosition);
    if(b.hasAttribute('data-close'))$('#detail-dialog').close();
    if(b.dataset.filter){state.filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b);});renderCatalog();renderPins();fitMap();}
    if(b.dataset.day!==undefined){state.day=Number(b.dataset.day);renderPlan();$('#map-title').textContent=`DAY 0${state.day+1} · 地点与路线`;fitMap();}
    if(b.dataset.up!==undefined)swapStop(Number(b.dataset.up),-1);
    if(b.dataset.down!==undefined)swapStop(Number(b.dataset.down),1);
    if(b.dataset.remove!==undefined){state.plan.days[state.day].stops.splice(Number(b.dataset.remove),1);markDirty();renderPlan();fitMap();}
  });
  $('#search').addEventListener('input',e=>{state.query=e.target.value.trim();renderCatalog();renderPins();});
  $('#profile-toggle').onclick=()=>{const hidden=!$('#preferences').hidden;$('#preferences').hidden=hidden;$('#profile-toggle').setAttribute('aria-expanded',!hidden);};
  $('#apply-profile').onclick=()=>{state.profile={...state.profile,party:$('#party').value,pace:$('#pace').value,interests:[...document.querySelectorAll('[name=interest]:checked')].map(i=>i.value)};markDirty({pending:!!state.plan});renderProfile();renderCatalog();renderPins();$('#preferences').hidden=true;$('#profile-toggle').setAttribute('aria-expanded','false');toast('推荐已更新。现有行程可点击重新安排后应用。');};
  $('#museum-booked').onchange=e=>{state.profile.museumBooked=e.target.checked;markDirty({pending:!!state.plan});$('#booking-explainer').textContent='预约设置已改变，请重新安排，让行程应用这个选择。';};
  $('#timeline').addEventListener('change',e=>{if(e.target.dataset.time===undefined||!e.target.value)return;const stops=state.plan.days[state.day].stops;stops[Number(e.target.dataset.time)].time=e.target.value;stops.sort((a,b)=>a.time.localeCompare(b.time));markDirty();renderPlan();});
  $('#build-plan').onclick=createPlan;$('#regenerate').onclick=createPlan;
  $('#open-plan').onclick=()=>{switchPage('plan');fitMap();$('#plan-view').scrollIntoView({block:'start',behavior:'smooth'});};
  $('#back-discover').onclick=()=>{switchPage('discover');fitMap();};
  $('#fit-map').onclick=fitMap;$('#load-route').onclick=loadRoute;$('#travel-mode').onchange=resetRoute;
  $('#save-plan').onclick=savePlan;$('#export-plan').onclick=exportPlan;
  $('#show-sources').onclick=showSources;$('#footer-sources').onclick=showSources;
  window.addEventListener('hashchange',()=>{switchPage(location.hash.slice(1),false);fitMap();});
}
async function init(){
  try{
    const response=await fetch('./places.json');if(!response.ok)throw new Error('地点资料未加载');data=await response.json();places=data.places;byId=new Map(places.map(p=>[p.id,p]));
    try{const photoResponse=await fetch('./photos.json');if(photoResponse.ok)photos=(await photoResponse.json()).photos||{};}catch{}
    restore();
    atlas=createAtlas({container:$('#atlas-view'),places,photos,onAdd:id=>{state.focus=id;togglePlace(id);},onDetail:showDetail,onPlan:openCurrentPlan,onNavigate:showRealPosition,onProfile:()=>{$('#preferences').hidden=false;$('#profile-toggle').setAttribute('aria-expanded','true');$('#preferences').scrollIntoView({block:'start',behavior:'smooth'});}});
    renderProfile();renderCatalog();initMap();bindEvents();renderSave();
    const requestedPage=location.hash.slice(1)||'atlas';
    switchPage(requestedPage==='plan'&&!state.plan?'atlas':requestedPage,false);
    const initialRevision=state.revision;
    $('#updated-label').textContent=`地点核实 ${data.updatedAt} · 出发前复核`;
    try{
      const saved=await api('/api/plan');
      if(saved.tripId&&validPlan(saved.plan)){
        state.tripId=saved.tripId;
        if(state.revision===initialRevision&&!state.dirty){state.plan=saved.plan;state.profile=normalizeProfile(saved.plan.profile);state.selected=new Set(saved.plan.profile.selectedIds||saved.plan.days.flatMap(d=>d.stops.map(s=>s.placeId)));state.pending=false;state.dirty=false;renderProfile();renderCatalog();if(state.page==='plan')renderPlan();renderPins();}
        persist();renderSave();
      }
    }catch{ $('#save-help').textContent='后台暂不可用，地点、地图和浏览器草稿仍可使用。完整保存体验请打开 http://127.0.0.1:5213/。'; }
    switchPage(location.hash.slice(1)||'atlas',false);if(state.page!=='atlas')fitMap();
  }catch(error){$('#catalog').innerHTML=`<p class="empty">加载未完成：${esc(error.message)}。请刷新重试。</p>`;}
}
init();
