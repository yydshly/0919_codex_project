'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const video = $('#video');
let segments = [], mode = 'preview', active = -1;
const format = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
function notice(text) { const el = $('#notice'); el.textContent = text; el.hidden = false; clearTimeout(notice.timer); notice.timer = setTimeout(() => el.hidden = true, 4500); }
function update() {
  const time = video.currentTime || 0;
  $('#time').textContent = `${format(time)} / ${format(Number.isFinite(video.duration) ? video.duration : 38)}`;
  $('#seek').value = time;
  const index = segments.findIndex(s => time >= s.start && time < s.end);
  if (index !== active) {
    active = index;
    $$('.segment').forEach((el, i) => { el.classList.toggle('active', i === index); el.setAttribute('aria-current', i === index ? 'true' : 'false'); });
  }
  const caption = $('#caption'); caption.replaceChildren();
  if (mode !== 'preview' || index < 0) return;
  const layout = $('#layout').value;
  for (const lang of ['zh', 'en']) {
    if (layout === 'both' || layout === lang) {
      const line = document.createElement('span'); line.className = lang; line.textContent = segments[index][lang]; caption.append(line);
    }
  }
}
$('#play').addEventListener('click', async () => { if (video.paused) { try { await video.play(); } catch { notice('播放暂时不可用，请重新点击播放。'); } } else video.pause(); });
video.addEventListener('play', () => { $('#play').textContent = 'Ⅱ'; $('#play').setAttribute('aria-label', '暂停样片'); });
video.addEventListener('pause', () => { $('#play').textContent = '▶'; $('#play').setAttribute('aria-label', '播放样片'); });
video.addEventListener('timeupdate', update);
video.addEventListener('loadedmetadata', () => { $('#seek').max = Number.isFinite(video.duration) ? video.duration : 38; update(); });
video.addEventListener('error', () => notice('视频加载失败。请检查连接，或使用页面下方的样片下载链接。'));
$('#seek').addEventListener('input', e => { video.currentTime = +e.target.value; update(); });
$('#restart').addEventListener('click', () => { video.currentTime = 0; update(); });
$('#fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('#monitor').requestFullscreen) await $('#monitor').requestFullscreen(); else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); else notice('当前浏览器不支持全屏。'); } catch { notice('当前浏览器无法进入全屏。'); } });
$('#layout').addEventListener('change', update);
$('#style').addEventListener('change', e => $('#caption').className = `caption ${e.target.value}`);
$$('[data-mode]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode === mode) return;
  const current = video.currentTime, playing = !video.paused;
  mode = button.dataset.mode;
  $$('[data-mode]').forEach(b => { const selected = b === button; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
  video.pause();
  video.src = mode === 'preview' ? 'media/input.mp4' : 'media/captioned.mp4';
  video.addEventListener('loadedmetadata', async () => { video.currentTime = Math.min(current, video.duration); update(); if (playing) { try { await video.play(); } catch { /* User can resume with the play control. */ } } }, {once:true});
  $('#layout').disabled = $('#style').disabled = mode === 'rendered';
  $('#monitor-label').textContent = mode === 'preview' ? '浏览器字幕布局预览' : '上游代码实际烧录 · MP4';
  $('#mode-note').textContent = mode === 'preview' ? '布局和样式仅改变网页预览。' : '字幕已写入画面，样式以成片为准。';
  $('#media-note').textContent = mode === 'preview' ? '原创无声教学画面 + 上游字幕测试样例。字幕内容取自上游文件，未在本次调用模型翻译。' : '本次调用 VideoCaptioner 的 synthesize 命令生成。无声样片仅验证字幕烧录，不代表识别、翻译或配音质量。';
  update();
}));
async function loadSubtitles() {
  try {
    const response = await fetch('subtitles.json'); if (!response.ok) throw Error('HTTP'); segments = await response.json();
    const list = $('#segments'); list.replaceChildren();
    for (const s of segments) {
      const button = document.createElement('button'); button.className = 'segment'; button.setAttribute('aria-label', `${format(s.start)} ${s.zh}`);
      for (const [className, text] of [['seg-meta', `${String(s.id).padStart(2,'0')}   ${format(s.start)} — ${format(s.end)}`], ['zh', s.zh], ['en', s.en]]) {
        const span = document.createElement('span'); span.className = className; span.textContent = text; button.append(span);
      }
      button.addEventListener('click', () => { video.currentTime = s.start; update(); }); list.append(button);
    }
    update();
  } catch { $('#segments').textContent = '字幕列表暂时无法加载。你仍可播放实际烧录成片，或下载 SRT。'; }
}
loadSubtitles();

const upstream = 'https://github.com/WEIFENG2333/VideoCaptioner/blob/95842ecb5618c0b6a548a336bdfb0eb859bdb501/';
const steps = [
  {name:'语音识别',title:'先听清说了什么',input:'视频或音频文件',body:'先提取音轨，再调用所选语音识别引擎，得到文字及其出现的时间。长音频可分块处理；本地与云端路径的语言、硬件和网络要求不同。',output:'文字 + 时间戳',note:'词级时间信息有助于后续断句；精度取决于引擎和录音。',source:'videocaptioner/core/asr/transcribe.py'},
  {name:'语义断句',title:'让一屏字幕读得完',input:'识别文字与时间轴',body:'模型根据语义和长度限制拆分句子。程序检查内容是否发生意外变化、每段是否超长，并反馈修正，再匹配回原时间轴。失败时也有规则处理路径。',output:'长度合适的字幕片段',note:'“断句”改变字幕分段，目标是保留原意和时间对应。',source:'videocaptioner/core/split/split.py'},
  {name:'文字校正',title:'修正识别留下的错误',input:'已分段的原语言字幕',body:'按批次调用大模型修正文句、标点和识别错误；保留字幕编号以便对应原时间轴。失败的批次可保留原文，人工仍需核对术语、人名与数字。',output:'校正后的原语言字幕',note:'模型可能误改正确文本，不能把“优化”理解为准确性保证。',source:'videocaptioner/core/optimize/optimize.py'},
  {name:'字幕翻译',title:'把意思带到另一种语言',input:'字幕、目标语言与术语提示',body:'可选必应、谷歌或大模型翻译。大模型按字幕批次处理上下文；反思模式要求初译、分析不自然的表达、再改写，并校验返回的条目编号与结构。',output:'译文 / 双语字幕',note:'本页译文来自上游测试文件，未进行本次模型翻译。',source:'videocaptioner/core/translate/llm_translator.py'},
  {name:'字幕配音',title:'按时间轴把字幕读出来',input:'带时间轴的字幕与音色设置',body:'逐片段调用语音合成服务，测量时长，再按策略调整语速并放回时间轴。可将生成音轨替换或混入视频原声。多说话人依赖标签与音色映射。',output:'配音音轨 / 配音视频',note:'不能由此推断自动人物识别、口型同步或原声分离能力。',source:'videocaptioner/core/dubbing/pipeline.py'},
  {name:'视频合成',title:'交付一份能播放的成片',input:'原视频、字幕，或新音轨',body:'通过 FFmpeg 等工具完成媒体处理。软字幕以轨道嵌入；硬字幕根据样式渲染后写入画面。硬字幕显示稳定，后续修改则需要重新生成成片。',output:'字幕文件 / 带字幕 MP4',note:'本页“实际烧录成片”已经运行上游 synthesize 生成。',source:'videocaptioner/cli/commands/synthesize.py'}
];
function selectStep(i, focus=false) {
  $$('.steps button').forEach((b,j)=>{b.classList.toggle('selected',j===i);b.setAttribute('aria-selected',String(j===i));b.tabIndex=j===i?0:-1;if(focus&&j===i)b.focus();});
  const s=steps[i], panel=$('#step-panel'); panel.setAttribute('aria-labelledby',`step-${i}`);
  panel.innerHTML = `<div><small>INPUT / 输入</small><h3>${s.title}</h3><p>${s.input}</p></div><div><small>METHOD / 实现</small><p>${s.body}</p><a href="${upstream+s.source}" target="_blank" rel="noreferrer">查看对应源码 ↗</a></div><div class="step-output"><small>OUTPUT / 结果</small><strong>${s.output}</strong><p>${s.note}</p></div>`;
}
steps.forEach((s,i)=>{const b=document.createElement('button');b.id=`step-${i}`;b.setAttribute('role','tab');b.setAttribute('aria-controls','step-panel');b.innerHTML=`<span>0${i+1}</span>${s.name}`;b.addEventListener('click',()=>selectStep(i));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%steps.length;if(e.key==='ArrowLeft')next=(i+steps.length-1)%steps.length;if(e.key==='Home')next=0;if(e.key==='End')next=steps.length-1;if(next!==undefined){e.preventDefault();selectStep(next,true);}});$('#step-tabs').append(b);});
selectStep(0);
$$('[data-shot]').forEach(b=>b.addEventListener('click',()=>{const image=`media/upstream-${b.dataset.shot}.png`;$('#app-shot').src=image;$('#app-shot').alt=`上游文档截图：VideoCaptioner ${b.textContent}界面`;$('#shot-link').href=image;$$('[data-shot]').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});}));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){$$('nav a').forEach(a=>a.classList.toggle('active',a.hash===`#${e.target.id}`));}}},{rootMargin:'-8% 0px -60% 0px'});
  $$('main > section').forEach(s=>observer.observe(s));
}
