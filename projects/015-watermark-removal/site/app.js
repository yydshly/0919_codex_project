'use strict';

const COMMIT = '902dc1a268d29d50d291ac2a30150abb9574311a';
document.querySelectorAll('[data-source]').forEach(link => {
  link.href = `https://github.com/zuruoke/watermark-removal/blob/${COMMIT}/${link.dataset.source}`;
  link.target = '_blank';
  link.rel = 'noreferrer';
});

const stages = [
  {title:'一张带水印的图片',copy:'输入图片中，水印覆盖了一部分山脉和湖面。模型需要图片之外的另一份信息：哪些位置需要修复。',detail:'读取图片并转换为 RGB。默认入口不会自动识别水印的位置。',tag:'INPUT IMAGE / 带水印的输入'},
  {title:'告诉模型，哪里需要修复',copy:'白色代表待修复区域，黑色代表保留区域。遮罩只描述位置，不包含水印下面原本的内容。',detail:'主入口加载预设 mask.png；本图用简化矩形演示遮罩，真实模板可以沿水印形状绘制。',tag:'BINARY MASK / 白色 = 待修复'},
  {title:'把选中的输入隐藏起来',copy:'用遮罩把指定区域从网络输入中隐藏。留下的山脉、天空和湖面，为预测提供周围环境信息。',detail:'X = I × (1 − M)。这里把缺口画成深色方便观察；实际是在归一化空间中置零。',tag:'INCOMPLETE INPUT / 缺损图像'},
  {title:'先补出大致结构和颜色',copy:'第一阶段利用周围信息，生成大致的山体轮廓与湖面色块，为下一阶段提供一个初稿。',detail:'门控卷积 + 下采样 + 空洞卷积 + 上采样。示意中的模糊色块由程序绘制，并非模型推理。',tag:'COARSE PREDICTION / 第一阶段'},
  {title:'再参考纹理，完善细节',copy:'第二阶段同时生成结构、参考可见区域纹理。两条分支的特征融合后，解码出更细致的预测。',detail:'橙色框标出可参考区域。真实注意力在特征空间中计算相似度，不是直接复制这几个框。',tag:'REFINED PREDICTION / 第二阶段'},
  {title:'只把预测填回指定区域',copy:'将预测内容放入遮罩内，其他位置保留原图。视觉上可以更连续，但新内容不一定等于被遮挡的真实内容。',detail:'Y = P × M + I × (1 − M)。此图是人为设定的教学输出，不能用来评估这个模型的画质。',tag:'COMPOSITED OUTPUT / 合成示意'}
];
const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d');
const repair = {x:330,y:232,w:350,h:102};
let stage = 0;

function path(points, fill) {
  ctx.beginPath();
  points.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
}
function scene(alternative=false) {
  const sky=ctx.createLinearGradient(0,0,0,370);
  sky.addColorStop(0,'#c6d3ba');sky.addColorStop(1,'#e9dfbb');
  ctx.fillStyle=sky;ctx.fillRect(0,0,1000,550);
  ctx.fillStyle='#efe3ba';ctx.beginPath();ctx.arc(754,108,37,0,Math.PI*2);ctx.fill();
  path([[0,233],[94,176],[143,199],[278,93],[417,230],[531,140],[675,247],[781,167],[903,236],[1000,201],[1000,385],[0,385]],'#8da89c');
  path([[150,207],[278,93],[369,182],[292,144],[265,167],[245,144]],'#d5d9be');
  path([[0,293],[99,239],[198,277],[345,186],[484,293],[585,227],[706,305],[843,249],[1000,308],[1000,410],[0,410]],'#527b70');
  path([[268,238],[345,186],[425,249],[352,216]],'#91ac90');
  path([[0,350],[121,286],[220,329],[326,297],[428,329],[552,280],[652,330],[811,299],[1000,345],[1000,422],[0,422]],'#365f53');
  const lake=ctx.createLinearGradient(0,338,0,550);lake.addColorStop(0,'#76a399');lake.addColorStop(1,'#335f59');
  path([[0,358],[258,347],[505,355],[763,343],[1000,366],[1000,550],[0,550]],lake);
  ctx.save();ctx.globalAlpha=.24;
  path([[40,360],[278,514],[480,357]],'#274c46');
  path([[586,355],[754,441],[882,352]],'#b5c4a0');ctx.restore();
  for(let i=0;i<70;i++){
    const y=365+i*2.6,x=(i*137)%1000,w=20+(i*31)%110;
    ctx.strokeStyle=i%3===0?'#9fc0a173':'#bdd0ab38';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y-.6);ctx.stroke();
  }
  path([[0,438],[82,423],[151,460],[254,487],[279,550],[0,550]],'#244c40');
  path([[828,520],[899,469],[951,481],[1000,455],[1000,550],[772,550]],'#294c3f');
  for(let i=0;i<10;i++){const x=8+i*15,y=406+Math.sin(i)*10;ctx.fillStyle='#224839';ctx.fillRect(x-2,y,4,68);path([[x,y-62],[x-20,y+7],[x+20,y+7]],'#294e3e');path([[x,y-37],[x-24,y+27],[x+24,y+27]],'#294e3e');}
  if(alternative){path([[330,286],[396,251],[458,276],[521,246],[610,291],[680,261],[680,334],[330,334]],'#537c6b');path([[330,319],[422,300],[497,321],[579,294],[680,319],[680,334],[330,334]],'#3e6859');}
}
function drawStage(){
  ctx.clearRect(0,0,1000,550);scene();
  const {x,y,w,h}=repair;
  if(stage===0){ctx.save();ctx.translate(505,283);ctx.rotate(-.09);ctx.font='600 44px Segoe UI, sans-serif';ctx.textAlign='center';ctx.fillStyle='#fffef0a8';ctx.fillText('WATERMARK',0,15);ctx.strokeStyle='#fffef07d';ctx.lineWidth=2;ctx.strokeRect(-158,-30,316,60);ctx.restore();}
  if(stage===1){ctx.fillStyle='#202823';ctx.fillRect(0,0,1000,550);ctx.fillStyle='#f8f8ed';ctx.fillRect(x,y,w,h);ctx.font='15px Consolas, monospace';ctx.fillStyle='#a5b3a2';ctx.fillText('0 / KEEP',50,465);ctx.fillStyle='#435447';ctx.fillText('1 / REPAIR',444,291);}
  if(stage===2){ctx.fillStyle='#1c302c';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#92a995';ctx.setLineDash([5,6]);ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);ctx.fillStyle='#bfd0b5';ctx.font='14px Consolas, monospace';ctx.fillText('MASKED REGION',443,289);}
  if(stage===3){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.filter='blur(17px)';scene(true);ctx.restore();ctx.strokeStyle='#dfa079';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);}
  if(stage>=4){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();scene(true);ctx.restore();}
  if(stage===4){ctx.strokeStyle='#f5bd8e';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);const refs=[[200,260],[720,285],[450,375]];refs.forEach(([rx,ry])=>{ctx.strokeRect(rx,ry,63,45);ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(rx+32,ry+22);ctx.lineTo(505,283);ctx.stroke();ctx.setLineDash([]);});}
  if(stage===5){ctx.strokeStyle='#e0dda287';ctx.lineWidth=1.5;ctx.setLineDash([6,7]);ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);}
}
function selectStage(index){
  stage=Math.max(0,Math.min(5,index));const current=stages[stage];
  document.querySelector('#stage-title').textContent=current.title;
  document.querySelector('#stage-copy').textContent=current.copy;
  document.querySelector('#stage-detail').textContent=current.detail;
  document.querySelector('#stage-number').textContent=`STEP 0${stage+1} / 06`;
  document.querySelector('#stage-progress').textContent=`0${stage+1} — 06`;
  document.querySelector('#image-tag').textContent=current.tag;
  canvas.setAttribute('aria-label',`教学插画，步骤 ${stage+1}：${current.title}。${current.copy}`);
  document.querySelectorAll('[data-stage]').forEach(button=>{const active=Number(button.dataset.stage)===stage;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
  document.querySelector('#previous').disabled=stage===0;
  document.querySelector('#next').disabled=stage===5;
  drawStage();
}
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>selectStage(Number(button.dataset.stage))));
document.querySelector('#previous').addEventListener('click',()=>selectStage(stage-1));
document.querySelector('#next').addEventListener('click',()=>selectStage(stage+1));
document.querySelector('.lab-description').setAttribute('aria-live','polite');

const patchData={water:{name:'湖面',weights:['0.82','0.12','0.06'],note:'湖面特征获得较高权重，山坡和天空贡献较小。'},hill:{name:'山坡',weights:['0.08','0.87','0.05'],note:'目标变为山坡时，山体结构对应的参考特征权重更高。'},sky:{name:'天空',weights:['0.14','0.07','0.79'],note:'目标变为天空时，平滑的天空特征贡献更大。'}};
document.querySelectorAll('[data-patch]').forEach(button=>button.addEventListener('click',()=>{
  const chosen=patchData[button.dataset.patch];
  document.querySelector('#query-text').textContent=`≈ ${chosen.name}`;
  document.querySelector('#attention-note').textContent=chosen.note;
  document.querySelectorAll('[data-patch]').forEach((other,i)=>{const selected=other===button;other.classList.toggle('selected',selected);other.setAttribute('aria-pressed',String(selected));other.querySelector('b').textContent=chosen.weights[i];});
}));
document.querySelector('#gate-slider').addEventListener('input',event=>{
  const percent=Number(event.target.value),gate=percent/100;
  document.querySelector('#gate-value').textContent=gate.toFixed(2);
  document.querySelector('#gate-output').textContent=(.8*gate).toFixed(2);
  document.querySelector('#gate-percent').textContent=`${percent}%`;
  document.querySelector('#signal-bar').style.width=`${percent}%`;
});

const modes={training:`<div class="mode-flow"><div>完整图片<small>作为正确答案</small></div><span>→</span><div>随机遮罩<small>矩形 + 笔刷形状</small></div><span>→</span><div>生成网络补画<small>粗修 + 精修</small></div><span>→</span><div>损失与更新<small>调整网络参数</small></div></div><div class="loss-grid"><div><h3>L1 重建损失 · 尽量接近原图</h3><p>比较两个阶段预测与完整图片的像素差异，约束内容和颜色。代码中两阶段都计算这一项。</p></div><div><h3>对抗损失 · 让纹理更自然</h3><p>带谱归一化的 PatchGAN 判别器区分真图与修复图，hinge 损失推动生成结果更像真实图像。</p></div></div><p class="mode-note">仓库包含训练图与损失实现，但没有完整训练入口。图示说明代码中的学习机制，不代表我们已复现训练过程。</p>`,inference:`<div class="mode-flow"><div>图片 + 遮罩<small>指定修复位置</small></div><span>→</span><div>加载模型权重<small>已有训练结果</small></div><span>→</span><div>生成网络前向计算<small>粗修 + 精修</small></div><span>→</span><div>合成与保存<small>输出修复图片</small></div></div><div class="loss-grid"><div><h3>无需每次重新训练</h3><p>main.py 从 checkpoint 读取参数并赋值给网络，调用 build_server_graph 进行推理。</p></div><div><h3>不运行训练判别器</h3><p>日常使用只需生成网络预测，再按遮罩合成。没有自动水印检测，也没有逐图的对抗训练循环。</p></div></div><p class="mode-note">此说明网页没有加载模型。实际使用需准备旧版依赖、预训练权重，以及与图片位置对齐的遮罩。</p>`};
function setMode(mode){document.querySelector('#mode-panel').innerHTML=modes[mode];document.querySelectorAll('[data-mode]').forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
const sectionLinks=[...document.querySelectorAll('nav a')];
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){sectionLinks.forEach(link=>{const current=link.hash===`#${entry.target.id}`;link.classList.toggle('active',current);if(current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}});},{rootMargin:'-5% 0px -65% 0px',threshold:0});
document.querySelectorAll('main>section, #examples, #understanding').forEach(section=>observer.observe(section));
selectStage(0);setMode('training');

// Published DeepFill files are displayed unchanged; no inference happens here.
const sampleCases = {
  1: {kicker:'CASE 01 / 文字水印 + 栏杆', title:'水印去掉了，背景怎么补？', description:'原图右上有黑色文字，人物周围有栏杆。作者用遮罩标出这些区域，再由模型补画海面、植被和局部衣物。', observe:'拖动分界线，观察右上角海面，以及画面下方栏杆原来的位置。', limit:'栏杆附近补画的海浪与边缘局部偏软。这张样例没有提供“同场景无水印真图”，不能据此认定恢复了真实像素。', alt:'海边合影的文字水印与栏杆清理'},
  2: {kicker:'CASE 02 / 人物移除 + 砖墙纹理', title:'路人消失了，砖缝还连续吗？', description:'作者遮住左侧背景路人，用周围的砖墙、台阶与地面填补空缺。前景三位毕业生仍保留在照片中。', observe:'先看左侧路人的消失，再看原位置的砖块排列，以及靠近台阶的水平线。', limit:'修复处砖纹明显更模糊，部分排列不够自然。重复纹理与直线结构，仍可能暴露修复痕迹。', alt:'毕业照移除左侧背景路人'},
  3: {kicker:'CASE 03 / 多处移除 + 自然纹理', title:'一次修多个区域，效果会一致吗？', description:'作者标出步道上多位行人及中间骑滑板车的人物，模型分别补画沙地、步道与相邻边缘。右侧人物未被选中。', observe:'比较左下方的人群位置、中间滑板车位置，以及沙地与步道交界处。', limit:'原人群附近的沙纹和地面出现明显模糊、纹理变化。选区较多时，各处修复的自然程度并不一致。', alt:'沙滩步道上多位行人的移除'},
  4: {kicker:'CASE 04 / 大面积人物移除', title:'遮挡越大，补画越需要猜测。', description:'作者把合影右侧的大面积人物轮廓设为待修区，模型结合周围环境补出树木、水面、步道和地面。', observe:'重点检查右侧树木与水岸交界，以及原人物腿部覆盖的铺装地面。', limit:'主体移除后背景较连贯，但补画区域的树木、地面细节偏软。这不能证明被遮挡处原来就长这样。', alt:'合影中右侧大面积干扰人物的移除'}
};
let activeSample=1, compareKind='raw', sampleRequest=0;
const photoSlider=document.querySelector('#photo-slider');
const comparison=document.querySelector('#photo-compare');
const samplePath=(id,kind)=>`./samples/case${id}_${kind}.png`;
function setPhotoSplit(value){
  const split=Math.max(0,Math.min(100,Number(value)));
  photoSlider.value=String(split);
  comparison.style.setProperty('--split',`${split}%`);
  comparison.classList.toggle('all-after',split===0);
  comparison.classList.toggle('all-before',split===100);
  photoSlider.setAttribute('aria-valuetext',`左侧${compareKind==='raw'?'原图':'遮罩输入'} ${split}%，右侧结果 ${100-split}%`);
  document.querySelectorAll('[data-split]').forEach(button=>{const selected=Number(button.dataset.split)===split;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
}
function setCompareKind(kind){
  compareKind=kind;
  const label=kind==='raw'?'原始照片':'遮罩后的输入';
  document.querySelector('#sample-before').src=samplePath(activeSample,kind);
  document.querySelector('#sample-before').alt=`${label}：${sampleCases[activeSample].alt}`;
  document.querySelector('#before-label').textContent=label;
  document.querySelectorAll('[data-compare]').forEach(button=>{const selected=button.dataset.compare===kind;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  setPhotoSplit(photoSlider.value);
}
async function selectSample(id){
  const request=++sampleRequest;
  const resolution=document.querySelector('#sample-resolution');
  resolution.textContent='正在载入官方图片…';
  comparison.setAttribute('aria-busy','true');
  try {
    await Promise.all(['raw','input','output'].map(kind=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=samplePath(id,kind);})));
    if(request!==sampleRequest)return;
    activeSample=id;const item=sampleCases[id];
    document.querySelector('#sample-output').src=samplePath(id,'output');
    document.querySelector('#sample-output').alt=`官方修复结果：${item.alt}`;
    for(const key of ['kicker','title','description','observe','limit'])document.querySelector(`#sample-${key}`).textContent=item[key];
    document.querySelector('#sample-source').href=`https://github.com/JiahuiYu/generative_inpainting/blob/3a5324373ba52c68c79587ca183bc10b9e57b783/examples/places2/case${id}_output.png`;
    for(const kind of ['raw','input','output']){
      document.querySelector(`#evidence-${kind}`).src=samplePath(id,kind);
      document.querySelector(`#${kind}-file`).href=samplePath(id,kind);
    }
    document.querySelector('#mask-file').href=samplePath(id,'mask');
    document.querySelectorAll('[data-sample]').forEach(button=>{const selected=Number(button.dataset.sample)===id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    setCompareKind(compareKind);setPhotoSplit(50);
    resolution.textContent='680 × 512 · 原始 PNG';
  } catch {
    if(request===sampleRequest)resolution.textContent='图片未能载入，请重新选择样例。';
  } finally {
    if(request===sampleRequest)comparison.removeAttribute('aria-busy');
  }
}
photoSlider.addEventListener('input',event=>setPhotoSplit(event.target.value));
document.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>selectSample(Number(button.dataset.sample))));
document.querySelectorAll('[data-compare]').forEach(button=>button.addEventListener('click',()=>setCompareKind(button.dataset.compare)));
document.querySelectorAll('[data-split]').forEach(button=>button.addEventListener('click',()=>setPhotoSplit(button.dataset.split)));
setPhotoSplit(50);
