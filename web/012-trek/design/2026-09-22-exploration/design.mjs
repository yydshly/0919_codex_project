const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const archive = '../../v1.html';
const screenRoot = '../../assets/';
const steps = [
  {id:'places',label:'可信地点',title:'先确定“有哪些地方”。',question:'地点身份、坐标和资料，是否有可靠依据？',description:'景点精确到馆区，餐厅精确到分店。保留来源和核实时间；景区中心与实际入口分开记录。',input:'景区官方资料、地图地点记录、实拍与建筑参考。',output:'有固定编号、坐标系、来源和状态的地点记录。',check:'同名地点不混用，坐标语义明确，未知入口保持待核实。',current:'V1 已有 13 个地点及来源；部分坐标是范围中心。',route:'discover',link:'对照现有景点资料'},
  {id:'layout',label:'地理骨架',title:'先定地理关系，再安排画面。',question:'哪些位置必须保持，哪些区域需要放大或分图？',description:'将真实坐标转换到明确的图幅布局。城区密集位置与远郊地点可以分图呈现，保留每处调整的依据。',input:'地点坐标、城市范围、可使用的河流与道路参考。',output:'版本化的图幅、地理锚点、投影／布局规则与允许偏移。',check:'方位、片区归属和远近关系可核对；跨图幅不比较像素距离。',current:'V1 图稿有方位问题，手工热点不能替代地理校准。',route:'atlas',link:'对照归档导览图'},
  {id:'material',label:'景观素材',title:'用真实参考，生成可辨认的地标。',question:'画出的建筑，是否真能代表这个地点？',description:'先选资料充分、形态差异明显的少量地标。生成统一风格的素材，逐一检查外形与参考的对应关系。',input:'有来源与使用范围的实拍、建筑资料、统一风格约束。',output:'与地点编号绑定的素材、参考清单与生成记录。',check:'来源、模型和实际提示词可追溯；外形未验收时不标为完成。',current:'旧城景工坊有素材实验；当前页面使用旧图与实拍。',route:'atlas',link:'对照插画与实拍'},
  {id:'compose',label:'受控合成',title:'让景观落在有依据的位置。',question:'画面润色后，位置和素材身份还能否保持？',description:'程序按已确定的锚点合成素材，再处理背景衔接。名称由程序添加；任何整图再生成或润色都需要重新检查。',input:'地理骨架、景观素材、图层次序和遮挡规则。',output:'图稿版本、素材放置记录、实际输出与校验报告。',check:'发现漏画、错位、串用与严重遮挡；地理、外形和审美分别验收。',current:'旧实验位置校验有基础，完整生成流程尚未接入 V1。',route:'atlas',link:'查看当前图稿基线'},
  {id:'binding',label:'地图关联',title:'用一个编号，连接两种位置。',question:'点图和点地图，是否始终指向同一处地点？',description:'插画使用画面锚点和热点；真实地图使用地理坐标。二者共享地点编号，分别维护，切换视图时保留选择。',input:'地点编号、图稿版本、热点范围、真实坐标与入口记录。',output:'插画、地图和详情之间的一致选择状态。',check:'不会错连同名地点；缺失入口不冒充导航到门口。',current:'V1 已有热点到资料、地图和行程的基础联动。',route:'discover',link:'对照现有真实地图'},
  {id:'guidance',label:'出行引导',title:'让兴趣，接上实际行动。',question:'用户能否确认费用、预约与到达方式？',description:'为同一地点维护票种、费用、开放、官方预约和到达信息。动态资料与图稿分开更新，过期和未知有明确状态。',input:'官方票务与开放资料、已核实入口、地图与路线服务。',output:'可行动的地点资料卡，以及收藏和安排入口。',check:'资料有来源和核实时间；实时余票、订票和支付不在首阶段范围。',current:'V1 有预约和费用提示；结构化资料与入口核实尚待补齐。',route:'plan',link:'对照现有行程与指引'},
];
const pages = [
  {id:'atlas',name:'一图识西安',image:'01-atlas.png',title:'从已有插画，走向有地理依据的图稿。',existing:'7 个地标可点击，支持缩放与片区探索；点选后查看实拍和资料。',next:'将地图数据纳入生成前的布局约束，保存生成与校验记录。当前图稿不作为地理正确性的证明。',caption:'V1 实际截图 · 西安旧图与景点详情'},
  {id:'discover',name:'景点与地图',image:'02-discover.png',title:'继续沿用真实地点和地图基础。',existing:'13 个精选地点有坐标和来源，地图可拖动、缩放并查看地点；有外部地图入口。',next:'完善图与地图的双向选择，补齐门点，区分景区中心与可到达入口。',caption:'V1 用户当前窄屏与滚动位置截图 · 真实地图'},
  {id:'plan',name:'我的行程',image:'03-plan.png',title:'让安排承接已选地点。',existing:'V1 原完整演示支持分日安排、换序、预约备选、道路查询和 TREK 保存。归档预览只读，保存禁用，路线查询需打开原完整演示。',next:'行程承接导览选择，先完善费用、预约和到达信息；保留三日安排作为可复用能力。',caption:'V1 全页截图 · 首日行程及地图'},
  {id:'about',name:'原产品目标',image:'04-about.png',title:'保留历史定位，记录本次转向。',existing:'原型侧重首访推荐、三日安排和与 TREK 的连接。原产品说明原样保留。',next:'新一轮优先研究真实数据生成导览图、地点关联与出行引导。本页和技术文档记录拟议方案。',caption:'V1 实际截图 · 原产品目标与地图'},
];
let currentStep = 0, currentPage = 0, places = [], sources = [], photos = {};
function renderStep(index, focus=false){
  currentStep=index;
  $('#pipeline').innerHTML=steps.map((s,i)=>`<button type="button" role="tab" id="step-${s.id}" aria-controls="step-panel" aria-selected="${i===index}" tabindex="${i===index?0:-1}" data-step="${i}"><span>0${i+1}</span>${s.label}</button>`).join('');
  const s=steps[index];$('#step-panel').setAttribute('aria-labelledby',`step-${s.id}`);
  $('#step-panel').innerHTML=`<div><p class="eyebrow">生成设计 / 0${index+1}</p><h3>${s.title}</h3><p class="step-question">${s.question}</p><p>${s.description}</p><span class="status ${s.id==='layout'?'partial':'research'}">${s.id==='layout'?'E1 四点布局小样已执行':'拟议设计 · 待实验'}</span>${s.id==='layout'?'<p style="margin-top:14px"><a class="text-link" href="e1/">打开 E1：切换全域与分区图，查看检查结果 ↗</a></p>':''}</div><div><dl class="step-io"><div><dt>输入</dt><dd>${s.input}</dd></div><div><dt>产出</dt><dd>${s.output}</dd></div><div><dt>验证</dt><dd>${s.check}</dd></div></dl><div class="baseline-reference">已有基础：${s.current}<br><a href="${archive}#${s.route}" target="_blank" rel="noopener">${s.link} ↗</a></div></div>`;
  if(['material','compose'].includes(s.id)){
    const badge=$('#step-panel .status');badge.className='status partial';badge.textContent='E2 已有生成与合成候选 · 视觉验收待完成';
    badge.insertAdjacentHTML('afterend','<p style="margin-top:14px"><a class="text-link" href="e2/">打开 E2：实拍、生成素材与地理合成对比 ↗</a></p>');
  }
  if(focus)$(`#step-${s.id}`).focus();
}
function renderBaseline(index, focus=false){
  currentPage=index;const p=pages[index];p.image='v1-public-placeholder.svg';p.caption='V1 原图仅保存在本地；这里展示研究结论';
  $('#baseline-tabs').innerHTML=pages.map((p,i)=>`<button type="button" role="tab" id="baseline-${p.id}" aria-controls="baseline-panel" aria-selected="${i===index}" tabindex="${i===index?0:-1}" data-page="${i}">${p.name}</button>`).join('');
  $('#baseline-panel').setAttribute('aria-labelledby',`baseline-${p.id}`);
  $('#baseline-panel').innerHTML=`<figure class="baseline-image"><a href="${screenRoot+p.image}" target="_blank" rel="noopener" aria-label="查看 V1 公开说明图"><img src="${screenRoot+p.image}" alt="${p.caption}" loading="lazy"></a><figcaption>${p.caption} · 点击查看公开说明图</figcaption></figure><div class="baseline-notes"><h3>${p.title}</h3><h4><span class="status partial">归档已实现</span></h4><p>${p.existing}</p><h4><span class="status research">本轮设计要推进</span></h4><p>${p.next}</p><div class="actions"><a class="primary" href="${archive}#${p.id}" target="_blank" rel="noopener">打开 V1 公开摘要 ↗</a><button class="secondary" type="button" data-embed>本页展开公开摘要</button></div></div>`;
  if(!$('#embedded-archive').hidden)$('#archive-frame').src=archive+'#'+p.id;
  if(focus)$(`#baseline-${p.id}`).focus();
}
function onTabsKey(event, count, current, render){
  const key=event.key;if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;
  event.preventDefault();let n=current;if(key==='ArrowLeft')n=(current+count-1)%count;if(key==='ArrowRight')n=(current+1)%count;if(key==='Home')n=0;if(key==='End')n=count-1;render(n,true);
}
function renderPlace(id){
  const p=places.find(p=>p.id===id);if(!p)return;const photo=photos[id];
  const isFood=p.kind==='food';
  const picture=photo?`<img src="assets/${esc(photo.src.split('/').pop())}" alt="${esc(photo.alt)}">`:'';
  const source=sources.find(s=>s.id===p.sourceIds[0]);
  $('#place-record').innerHTML=`<div class="place-record-body"><div class="place-heading">${picture}<div><h3>${esc(p.name)}</h3><p>V1 地点编号 <code>${esc(p.id)}</code></p></div></div><dl class="data-rows"><div><dt>现有地理坐标</dt><dd>${p.lat}, ${p.lng}<br>${esc(p.coordinateAccuracy)}</dd></div><div><dt>现有插画关联</dt><dd>${isFood?'图外餐厅入口；V1 未在画面上设置对应热点。':'手工热点关联同一地点编号，尚无生成布局追溯。'}</dd></div><div><dt>具体入口</dt><dd>待独立核实，不能从中心坐标推断。</dd></div><div><dt>${isFood?'参考消费':'结构化票价'}</dt><dd>待补充可核实记录。${esc(p.priceNote)}</dd></div></dl><p class="source-caption">地点样本复制自 V1，记录核实日 2026-09-22。${source?`<a href="${esc(source.url)}" target="_blank" rel="noopener">查看地点资料来源 ↗</a>`:''}</p>${photo?`<p class="source-caption">${esc(photo.caption)} · ${esc(photo.credit)} · <a href="${esc(photo.licenseUrl)}" target="_blank" rel="noopener">${esc(photo.license)}</a> · <a href="${esc(photo.sourceUrl)}" target="_blank" rel="noopener">图片来源 ↗</a></p>`:''}</div>`;
}
$('#pipeline').addEventListener('click',event=>{const b=event.target.closest('[data-step]');if(b)renderStep(Number(b.dataset.step),true);});
$('#pipeline').addEventListener('keydown',event=>onTabsKey(event,steps.length,currentStep,renderStep));
$('#baseline-tabs').addEventListener('click',event=>{const b=event.target.closest('[data-page]');if(b)renderBaseline(Number(b.dataset.page),true);});
$('#baseline-tabs').addEventListener('keydown',event=>onTabsKey(event,pages.length,currentPage,renderBaseline));
$('#baseline-panel').addEventListener('click',event=>{if(!event.target.closest('[data-embed]'))return;$('#embedded-archive').hidden=false;$('#archive-frame').src=archive+'#'+pages[currentPage].id;$('#embedded-archive').scrollIntoView({behavior:'smooth',block:'start'});});
$('#close-embed').addEventListener('click',()=>{$('#embedded-archive').hidden=true;$('#archive-frame').removeAttribute('src');$('#baseline-panel [data-embed]').focus();});
$('#place-select').addEventListener('change',event=>renderPlace(event.target.value));
$('#open-document').addEventListener('click',async()=>{const dialog=$('#document-dialog');$('#document-text').textContent='正在读取设计文档…';dialog.showModal();try{const r=await fetch('TECHNICAL-DESIGN.md');if(!r.ok)throw new Error('文档暂不可用，请从项目目录查看。');$('#document-text').textContent=await r.text();}catch(e){$('#document-text').textContent=e.message;}});
$('#close-document').addEventListener('click',()=>$('#document-dialog').close());
renderStep(0);renderBaseline(0);
try{const [data,images]=await Promise.all([fetch('data/baseline-places.json').then(r=>{if(!r.ok)throw Error('地点数据未加载');return r.json();}),fetch('data/baseline-photos.json').then(r=>{if(!r.ok)throw Error('图片资料未加载');return r.json();})]);places=data.places;sources=data.sources;photos=images.photos;renderPlace($('#place-select').value);}catch(e){$('#place-record').innerHTML=`<p class="error">${esc(e.message)}。可通过归档对照区查看现有资料。</p>`;}
