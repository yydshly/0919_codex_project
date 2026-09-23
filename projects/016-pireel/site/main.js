import './story.js';
import './style.css';
import './guide.css';
import { gsap } from 'gsap';
import { render, components } from '../vendor/studio-kit/index.ts';
import { editedDuration, editedToSrc, spans, splitAtEdited, deleteAtEdited, removeSrcRanges } from '../vendor/studio-engine/trim.ts';
import { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, canEncodeVideo } from 'mediabunny';

const $ = (id) => document.getElementById(id);
if(['127.0.0.1','localhost'].includes(location.hostname)){
  const studioLink=document.querySelector('.title-actions a');
  studioLink.href='http://127.0.0.1:5192/';studioLink.textContent='打开本机原版 Studio ↗';
}
const presets = {
  title: { name:'标题开场', glyph:'T', code:'TITLE', fields:{title:'主标题',sub:'补充说明'}, props:{variant:'hero',title:'让想法成为画面',sub:'Pireel · 人与 AI 共同剪辑'} },
  metric: { name:'重点数字', glyph:'%', code:'METRIC', fields:{value:'显示数字',label:'数字标签',note:'补充说明'}, props:{variant:'hero-number',value:'47%',label:'让重点被看见',note:'示例数字 · 可在右侧自由修改',trend:'up',surface:'none'} },
  comparison: { name:'方案对比', glyph:'⇄', code:'COMPARISON', fields:{aLabel:'左侧名称',aValue:'左侧内容',bLabel:'右侧名称',bValue:'右侧内容'}, props:{variant:'columns',aLabel:'原始素材',aValue:'12 秒',bLabel:'精简版本',bValue:'10 秒',winner:'b',note:'用剪辑组织表达 · 示例对比',surface:'none'} },
  chart: { name:'动态图表', glyph:'▥', code:'CHART', fields:{title:'图表标题',unit:'单位'}, rows:'series', props:{variant:'bars',title:'一份素材，多种表达',unit:'%',series:[{label:'讲解',value:65},{label:'演示',value:45},{label:'短片',value:80}],surface:'none'} },
  steps: { name:'步骤讲解', glyph:'≡', code:'STEPS', fields:{}, rows:'items', props:{variant:'list',items:[{text:'导入素材',note:'视频、图片或音频'},{text:'组织表达',note:'剪辑、图形与字幕'},{text:'交付成片',note:'预览、调整与导出'}],surface:'none'} },
  lowerThird: { name:'人物字幕条', glyph:'▰', code:'LOWER THIRD', fields:{title:'人物 / 主题',subtitle:'身份 / 说明'}, props:{variant:'color-block',title:'Pireel Studio',subtitle:'为人与 AI Agent 设计的剪辑工作台'} }
};
const makeScene = (kind, start, end, name) => ({id:crypto.randomUUID(),kind,srcStart:start,srcEnd:end,sceneStart:start,sceneEnd:end,name,props:structuredClone(presets[kind].props)});
const initial = () => [makeScene('title',0,4,'产品开场'),makeScene('metric',4,8,'突出重点'),makeScene('steps',8,12,'操作讲解')];
let clips=initial(), selected=clips[0].id, at=1.4, playing=false, timeline=null, mounted='', history=[], ratio='wide', accent='#ff784f', busy=false;
const dimensions={wide:[960,540],portrait:[540,960],square:[720,720]};
const duration=()=>editedDuration(clips);
const selectedClip=()=>clips.find(c=>c.id===selected);
const right=(base,srcStart,srcEnd)=>({...base,id:crypto.randomUUID(),srcStart,srcEnd});
function status(text){$('status').textContent=text;}
function checkpoint(){history.push({clips:structuredClone(clips),selected,at,ratio,accent});if(history.length>40)history.shift();$('undo').disabled=false;}
function tokenStyle(w,h,color){return `position:relative;width:${w}px;height:${h}px;overflow:hidden;background:#171c26;color:#f2f4f8;font-family:'Segoe UI','Microsoft YaHei',sans-serif;--sk-fg:#f2f4f8;--sk-muted:#a4acba;--sk-accent:${color};--sk-accent-2:#8fb5ff;--sk-panel:#171c26;--sk-panel-2:#272e3c;--sk-line:#47505e;--sk-radius:0px;--sk-shadow:none;--sk-font-head:'Segoe UI','Microsoft YaHei',sans-serif;--sk-font-num:'Segoe UI','Microsoft YaHei',sans-serif;`;}
function mount(root,clip,id,w,h,color){
  const result=render(clip.kind,id,clip.props,{box:{w,h},canvas:{w,h},lang:'zh-CN',durationSec:clip.sceneEnd-clip.sceneStart});
  root.style.cssText=tokenStyle(w,h,color);
  root.innerHTML=`<style>#${id},#${id} *{box-sizing:border-box}</style><div style="position:absolute;left:30px;top:20px;font-size:12px;letter-spacing:2px;color:#8994a6">PIREEL / MOTION STUDY</div><div id="${id}" style="position:absolute;inset:0">${result.html}</div>`;
  const tl=gsap.timeline({paused:true});
  // The only executable animation text comes from the pinned upstream renderer.
  new Function('tl',result.timeline)(tl);
  return tl;
}
function fit(){const [w,h]=dimensions[ratio],area=document.querySelector('.preview-area'),scale=Math.max(0,Math.min((area.clientWidth-42)/w,(area.clientHeight-42)/h));$('viewport').style.width=`${w*scale}px`;$('viewport').style.height=`${h*scale}px`;$('stage').style.transform=`scale(${scale})`;$('stage').style.position='absolute';}
function frame(){
  const total=duration(); at=Math.max(0,Math.min(at,total));
  const hit=editedToSrc(clips,Math.min(at,Math.max(0,total-0.00001)));
  if(hit){const clip=clips[hit.index],key=JSON.stringify([clip,ratio,accent]);if(mounted!==key){timeline?.kill();timeline=mount($('stage'),clip,'live-block',...dimensions[ratio],accent);mounted=key;fit();}timeline.seek(Math.max(0,hit.src-clip.sceneStart),false);$('scene-name').textContent=clip.name;}
  else{timeline?.kill();timeline=null;mounted='';$('stage').style.cssText=tokenStyle(...dimensions[ratio],accent);$('stage').innerHTML='<div class="empty">时间线为空 · 恢复示例以继续</div>';fit();$('scene-name').textContent='空时间线';}
  $('time').textContent=`${format(at)} / ${format(total)}`;$('seek').value=at;$('seek').max=total||1;$('dimension').textContent=dimensions[ratio].join(' × ');
  document.querySelectorAll('[data-ratio]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ratio===ratio)));
  document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===accent)));
  $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'暂停':'播放');
}
function format(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${(s%60).toFixed(1).padStart(4,'0')}`;}
function renderTracks(){
  $('tracks').replaceChildren();const total=duration();
  for(const sp of spans(clips)){const c=sp.clip,b=document.createElement('button');b.className='clip'+(c.id===selected?' selected':'');b.style.flex=String(c.srcEnd-c.srcStart);b.title=`${c.name} · ${(c.srcEnd-c.srcStart).toFixed(1)} 秒`;b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(c.id===selected));const text=document.createElement('div');text.textContent=c.name;const small=document.createElement('small');small.textContent=`${(c.srcEnd-c.srcStart).toFixed(1)}s`;text.append(small);b.append(text);b.onclick=()=>{if(busy)return;playing=false;selected=c.id;at=Math.min(sp.editedEnd-.001,sp.editedStart+.9);refresh();};$('tracks').append(b);}
  $('ruler').replaceChildren();for(let i=0;i<5;i++){const s=document.createElement('span');s.textContent=`${(total*i/4).toFixed(1)}s`;$('ruler').append(s);}
  $('clip-count').textContent=`${clips.length} 个片段 · ${total.toFixed(1)} 秒`;
  $('delete').disabled=!clips.length||busy;$('split').disabled=!clips.length||busy;$('play').disabled=!clips.length||busy;$('export').disabled=!clips.length||busy;$('undo').disabled=!history.length||busy;
}
function fields(){
  $('fields').replaceChildren();const c=selectedClip();if(!c){$('params').textContent='[]';return;}
  const spec=presets[c.kind];
  function field(label,node){const el=document.createElement('label');el.className='field';el.append(document.createTextNode(label),node);$('fields').append(el);}
  for(const [key,label] of Object.entries(spec.fields)){const input=document.createElement('input');input.value=c.props[key]??'';input.maxLength=components[c.kind].jsonSchema.properties?.[key]?.maxLength??60;input.addEventListener('change',()=>{if(busy)return;checkpoint();c.props[key]=input.value;frame();params();status('文字已更新，导出会使用当前内容。');});field(label,input);}
  const variants=components[c.kind].jsonSchema.properties?.variant?.enum??[];
  if(variants.length){const select=document.createElement('select');const names={'hero':'居中开场','section':'章节标题','outro':'结束引导','hero-number':'主视觉数字','split-editorial':'分栏数字','badge':'徽章数字','columns':'分栏','versus':'大字对比','bars':'条形图','donut':'环形图','list':'编号列表','pipeline':'横向流程','timeline':'纵向时间线','color-block':'强调色块','clean-bar':'简洁白条','accent-underline':'强调下划线','kicker':'主题标签','soft-pill':'圆角胶囊','stack-bars':'双层字幕'};variants.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=names[v]??v;select.append(o);});select.value=c.props.variant;select.onchange=()=>{if(busy)return;checkpoint();c.props.variant=select.value;frame();params();};field('呈现方式',select);}
  if(spec.rows){const input=document.createElement('textarea');input.rows=4;input.value=c.props[spec.rows].map(r=>spec.rows==='series'?`${r.label} | ${r.value}`:`${r.text} | ${r.note}`).join('\n');input.onchange=()=>{if(busy)return;const lines=input.value.split('\n').filter(s=>s.trim()).slice(0,6);if(!lines.length){status('请至少保留一行内容。');fields();return;}const rows=lines.map(line=>{const [a,b='']=line.split('|').map(s=>s.trim());return spec.rows==='series'?{label:a,value:Number(b)}:{text:a,note:b};});if(spec.rows==='series'&&rows.some(r=>!Number.isFinite(r.value)||r.value<0)){status('图表数值需要是大于或等于 0 的数字。');fields();return;}checkpoint();c.props[spec.rows]=rows;frame();params();};field(spec.rows==='series'?'数据：名称 | 数值':'步骤：标题 | 说明',input);}
  params();
}
function params(){$('params').textContent=JSON.stringify(selectedClip()?.props??{},null,2);}
function refresh(){renderTracks();fields();frame();document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('active',b.dataset.kind===selectedClip()?.kind));}
Object.entries(presets).forEach(([kind,spec])=>{const b=document.createElement('button');b.className='preset';b.dataset.kind=kind;b.innerHTML=`<span class="glyph">${spec.glyph}</span><span><b>${spec.name}</b><small>${spec.code}</small></span>`;b.onclick=()=>{if(busy)return;checkpoint();playing=false;let c=selectedClip();if(!c){c=makeScene(kind,0,6,spec.name);clips=[c];selected=c.id;}c.kind=kind;c.props=structuredClone(spec.props);c.name=spec.name;const sp=spans(clips).find(s=>s.clip.id===c.id);at=Math.min(sp.editedEnd-.001,sp.editedStart+1.4);refresh();status(`已应用「${spec.name}」。在右侧修改内容，或播放查看动画。`);};$('presets').append(b);});
$('play').onclick=()=>{playing=!playing;if(playing&&at>=duration()-.01)at=0;frame();};
$('restart').onclick=()=>{at=0;frame();};
$('seek').oninput=()=>{playing=false;at=Number($('seek').value);const hit=editedToSrc(clips,at);if(hit)selected=clips[hit.index].id;refresh();};
$('split').onclick=()=>{if(busy)return;const result=splitAtEdited(clips,at,right);if(result.clips===clips){status('把播放位置移到片段中间，再点击拆分。');return;}checkpoint();clips=result.clips;playing=false;refresh();status(`已在 ${at.toFixed(2)} 秒拆分；内容与总时长保持一致。`);};
$('delete').onclick=()=>{if(busy)return;const sp=spans(clips).find(s=>s.clip.id===selected);if(!sp)return;checkpoint();clips=deleteAtEdited(clips,(sp.editedStart+sp.editedEnd)/2).clips;selected=clips[Math.min(sp.index,clips.length-1)]?.id??'';at=Math.min(sp.editedStart,duration());playing=false;refresh();status('已删除选中片段，后续内容自动前移。可以撤销。');};
$('undo').onclick=()=>{if(busy||!history.length)return;({clips,selected,at,ratio,accent}=history.pop());playing=false;refresh();status('已撤销上一步修改。');};
$('reset').onclick=()=>{if(busy)return;checkpoint();clips=initial();selected=clips[0].id;at=1.4;playing=false;refresh();status('已恢复 12 秒初始示例。');};
document.querySelectorAll('[data-ratio]').forEach(b=>b.onclick=()=>{if(busy)return;checkpoint();ratio=b.dataset.ratio;frame();status('已按新画幅重新计算图形布局。');});
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{if(busy)return;checkpoint();accent=b.dataset.color;frame();});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('download-project').onclick=()=>download(new Blob([JSON.stringify({format:'pireel-lab-demo-v1',upstream:'b824ee23ff1667c45232930366cf1ef5c85318c4',note:'实验工程；不是 Pireel V2 工程格式',ratio,accent,clips},null,2)],{type:'application/json'}),'pireel-lab-project.json');
const words=[['先整理素材',0,3],['停顿',3,5],['再突出重点',5,8],['最后导出成片',8,12]];
words.forEach(([text])=>{const s=document.createElement('span');s.textContent=text;if(text==='停顿')s.className='pause';$('transcript').append(s);});
let cut=false;
$('remove-pause').onclick=()=>{cut=!cut;const sample=[{srcStart:0,srcEnd:12}];const result=cut?removeSrcRanges(sample,[[3,5]],right).clips:sample;$('cut-result').textContent=`12.0 秒 → ${editedDuration(result).toFixed(1)} 秒${cut?' · 已删除素材 3–5 秒':''}`;document.querySelector('#transcript .pause').classList.toggle('removed',cut);$('remove-pause').textContent=cut?'恢复示例停顿':'演示：删除停顿';};

async function raster(root,w,h){
  const node=root.cloneNode(true);node.removeAttribute('id');node.style.transform='none';node.style.position='relative';node.style.left='0';node.style.top='0';node.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(node)}</foreignObject></svg>`;
  const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();return img;
}
async function exportVideo(){
  if(busy||!clips.length)return;
  busy=true;playing=false;const snapshot=structuredClone(clips),[w,h]=dimensions[ratio],color=accent,total=editedDuration(snapshot),fps=24;
  const disabledBefore=new Map();document.querySelectorAll('.workbench button,.workbench input,.workbench select,.workbench textarea,#export').forEach(el=>{disabledBefore.set(el,el.disabled);el.disabled=true;});
  let output,rig,root;const original=$('export').textContent;
  try{
    const codec=(await canEncodeVideo('avc',{width:w,height:h}))?'avc':(await canEncodeVideo('vp9',{width:w,height:h}))?'vp9':null;
    if(!codec)throw new Error('此浏览器没有可用的视频编码器，请使用新版 Chrome 或 Edge。');
    const isMp4=codec==='avc',target=new BufferTarget();output=new Output({format:isMp4?new Mp4OutputFormat():new WebMOutputFormat(),target});
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
    const source=new CanvasSource(canvas,{codec,bitrate:2_500_000});output.addVideoTrack(source,{frameRate:fps});await output.start();
    root=document.createElement('div');document.body.append(root);let id='';
    for(let i=0;i<Math.ceil(total*fps);i++){
      const sec=i/fps,hit=editedToSrc(snapshot,sec),c=snapshot[hit.index];
      if(id!==c.id){rig?.kill();rig=mount(root,c,'export-block',w,h,color);root.style.position='fixed';root.style.left='-20000px';root.style.top='0';id=c.id;}
      rig.seek(Math.max(0,hit.src-c.sceneStart),false);
      const img=await raster(root,w,h);ctx.fillStyle='#171c26';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0);await source.add(sec,Math.min(1/fps,total-sec));
      if(i%12===0){const progress=Math.round(i/(total*fps)*100);$('export').textContent=`导出中 ${progress}%`;status(`正在逐帧合成 ${w} × ${h} 静音短片，请保持页面打开。`);await new Promise(r=>setTimeout(r,0));}
    }
    await output.finalize();const ext=isMp4?'mp4':'webm';download(new Blob([target.buffer],{type:`video/${ext}`}),`pireel-lab-${w}x${h}.${ext}`);status(`已导出 ${total.toFixed(1)} 秒 ${w} × ${h} ${ext.toUpperCase()} 静音短片。`);
  }catch(error){if(output)try{await output.cancel();}catch{}status(`导出未完成：${error.message}`);}
  finally{rig?.kill();root?.remove();busy=false;disabledBefore.forEach((value,el)=>el.disabled=value);$('export').textContent=original;refresh();}
}
$('export').onclick=exportVideo;
new ResizeObserver(fit).observe(document.querySelector('.preview-area'));
let last=performance.now();function tick(now){if(playing&&!busy){at+=Math.min((now-last)/1000,.1);if(at>=duration()){at=duration();playing=false;}frame();}last=now;requestAnimationFrame(tick);}refresh();requestAnimationFrame(tick);
