import './story.css';
const section=document.createElement('section');
section.className='story'; section.id='case';
section.innerHTML=`
<div class="story-heading"><div><span class="eyebrow">一个具体任务 / 一条真正导出的视频</span><h1>把啰嗦的介绍，剪成能发给同事的短片。</h1><p>场景：你发现了 Blinko 笔记软件，想用半分钟讲清楚它能做什么。本例验证裁切、动态图文和音画导出。</p><p class="overview-link"><a href="#summary">先看 Pireel 能力摘要 ↑</a> · <a href="./pireel-overview.svg" target="_blank" rel="noreferrer">查看完整全景图 ↗</a></p></div><span class="verified">✓ 原版 Pireel 实际剪辑并导出</span></div>
<div class="story-layout"><div class="story-player">
<div class="story-tabs" role="group" aria-label="选择对比视频"><button data-version="after" aria-pressed="true">剪后成片 <b>28 秒</b></button><button data-version="before" aria-pressed="false">剪前素材 <b>45 秒</b></button><span>有中文解说 · 请打开声音</span></div>
<video id="story-video" controls playsinline preload="metadata" poster="./story/after-poster.png" src="./story/after.mp4" aria-label="Blinko 产品介绍剪辑前后对比"></video>
<div class="story-controls"><button id="story-play" class="primary">▶ 播放 28 秒成片</button><a id="story-download" href="./story/after.mp4" download="Blinko-产品介绍-Pireel剪辑.mp4">下载当前视频 ↓</a><span id="story-status" role="status">先看结果，再点右侧步骤查看差别。</span></div>
</div><aside class="story-steps"><span class="eyebrow">PIREEL 在这里做了什么？</span><h2>同一份素材，4 个编辑动作。</h2>
<button data-jump="before:0"><span class="step-no">01</span><span><b>去掉拖沓开场</b><small>删除原片 0–9 秒：“稍等一下，我先想想……”</small></span><em>听原片 ↗</em></button>
<button data-jump="after:1"><span class="step-no">02</span><span><b>开门见山，加产品标题</b><small>直接进入功能介绍，叠加动态文字。</small></span><em>看成片 ↗</em></button>
<button data-jump="after:9.7"><span class="step-no">03</span><span><b>让重点更好记</b><small>标签、搜索出现时，各自配上文字提示。</small></span><em>看成片 ↗</em></button>
<button data-jump="after:21.7"><span class="step-no">04</span><span><b>用行动提示收尾</b><small>保留完整总结，删除原片最后 8 秒废话。</small></span><em>看成片 ↗</em></button>
</aside></div>
<div class="story-metrics"><div><strong>45 → 28 <small>秒</small></strong><span>篇幅缩短约 38%</span></div><div><strong>4 <small>段动态文字</small></strong><span>标题、标签、搜索、结尾</span></div><div><strong>画面 + 声音</strong><span>合成为一个可播放的 MP4 文件</span></div></div>
<div class="story-cut"><div><b>剪前</b><span>45 秒</span></div><div class="cut-track"><span class="discard" style="flex:9">开场废话 9s</span><span style="flex:9">记录 9s</span><span style="flex:6">标签 6s</span><span style="flex:6">搜索 6s</span><span style="flex:7">总结 7s</span><span class="discard" style="flex:8">结尾废话 8s</span></div><div><b>剪后</b><span>28 秒</span></div><div class="cut-track"><span style="flex:9">记录 9s</span><span style="flex:6">标签 6s</span><span style="flex:6">搜索 6s</span><span style="flex:7">总结 7s</span></div></div>
<div class="story-meaning"><article><h2>所以，它对你有什么用？</h2><p>你以后研究一个新工具，可以把已有录屏、图片和讲解交给这套工作台，剪成产品介绍、操作教程或发布短片。已有素材不用重新拍，文字和时长可以继续改。</p></article><article><h2>它在底层做了什么？</h2><p>把原片的 <b>9–37 秒</b>映射到成片的 <b>0–28 秒</b>；在指定时刻显示文字图层；最后由浏览器把画面和音频编码为视频。Agent 接入后也可以调用工具修改这些编辑数据。</p></article></div>
<details class="story-source"><summary>素材来源与实测范围</summary><p>输入素材使用本项目已有的真实 Blinko 部署截图，配合本机合成的中文讲解制作；它是专为演示准备的素材，不是用户提供的原始录屏。截图的局部放大已经存在于原片中。</p><p>本次裁掉开头和结尾、添加四段动态图文、移动文字位置以及 MP4 导出，均在本机运行的原版 Pireel Studio 完成。未接入 AI 自动剪辑、自动转写、配音服务或云项目。本次演示中的解说由外部预先准备。</p><p><a href="./story/studio.png" target="_blank">查看真实工作台截图 ↗</a> · <a href="./story/manifest.json" target="_blank">查看原片片段清单 ↗</a> · <a href="https://github.com/pireel/pireel/tree/b824ee23ff1667c45232930366cf1ef5c85318c4" target="_blank" rel="noreferrer">对应上游源码 ↗</a></p></details>`;
document.querySelector('#guide').after(section);
const video=document.querySelector('#story-video');
let version='after';
async function showVersion(next,time=0,play=false){
  video.pause();version=next;
  const duration=next==='after'?28:45;
  document.querySelectorAll('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.version===next)));
  document.querySelector('#story-play').textContent=`▶ 播放 ${duration} 秒${next==='after'?'成片':'原片'}`;
  const link=document.querySelector('#story-download');link.href=`./story/${next}.mp4`;link.download=`Blinko-${next==='after'?'Pireel剪后':'剪前素材'}.mp4`;
  const source=new URL(`./story/${next}.mp4`,location.href).href;
  if(video.src!==source){video.poster=`./story/${next}-poster.png`; video.src=source;video.load();await new Promise((resolve,reject)=>{video.addEventListener('loadedmetadata',resolve,{once:true});video.addEventListener('error',reject,{once:true});});}
  video.currentTime=time;
  document.querySelector('#story-status').textContent=next==='after'?'Pireel 实际导出 · 28 秒 · 保留声音并叠加动态文字':'剪前输入 · 45 秒 · 留意开头的废话和结尾的重复表达';
  if(play){try{await video.play();}catch{document.querySelector('#story-status').textContent='请点击视频上的播放按钮。';}}
}
document.querySelectorAll('[data-version]').forEach(b=>b.addEventListener('click',()=>showVersion(b.dataset.version)));
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{const [v,t]=b.dataset.jump.split(':');showVersion(v,Number(t),true);video.scrollIntoView({behavior:'smooth',block:'center'});}));
document.querySelector('#story-play').addEventListener('click',()=>showVersion(version,0,true));
