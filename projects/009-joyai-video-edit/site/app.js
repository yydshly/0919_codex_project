'use strict';
const cases = [
  {id:'case01',title:'城堡贵族风格',type:'整体外观',prompt:'将人物、发型和室内环境变成英式城堡贵族风格。',english:'Transform the people, hairstyles, and interior into a British castle aristocratic style.',observations:['服装、发型与室内风格是否一起改变','人物动作和画面构图是否保持连贯'],application:'影视概念预览 / 广告视觉提案',original:'dbb9b6de-9d63-4879-8418-96610eac79b3'},
  {id:'case02',title:'水彩画风格',type:'风格转换',prompt:'将视频转换成水彩晕染风格。',english:'Turn the video into a watercolor wash style.',observations:['水彩笔触是否在运动中保持稳定','原始场景的轮廓与运动是否保留'],application:'短视频风格化 / 创意片头',original:'a20dea9d-715f-45b6-ae1d-b8c694983910'},
  {id:'case03',title:'毛色与配饰',type:'多处局部修改',prompt:'将所有狗变成白色，戴上彩色帽子，并将墨镜改成亮粉色。',english:'Make all dogs white, add colorful hats, and turn the sunglasses hot pink.',observations:['多个修改目标是否同时满足','帽子与墨镜是否跟随主体运动'],application:'创意广告 / 娱乐内容变体',original:'8412d011-9b08-46c8-820e-ab59e97773d4'},
  {id:'case04',title:'羽绒服换装',type:'服装与配饰',prompt:'给女孩穿上棕色羽绒服，戴上蓝色棒球帽。',english:'Dress the girl in a brown down jacket and blue baseball cap.',observations:['衣服边缘是否随身体自然变化','人物面部与周围环境是否稳定'],application:'服装搭配预览 / 电商创意测试',original:'5ae898bd-ee26-4a63-9342-72430c28b82f'},
  {id:'case05',title:'移除两侧主体',type:'对象移除',prompt:'移除两侧穿粉色衣服的两只白猫。',english:'Remove the two white cats in pink clothes on both sides.',observations:['指定对象是否消失且没有明显残影','被遮挡的背景与中间主体是否合理'],application:'画面清理 / 构图方案预览',original:'8e1874b8-755c-4bb0-914d-155110501076'}
];
const $ = id => document.getElementById(id);
const source = $('source-video'), edited = $('edited-video');
const playButton = $('play'), timeline = $('timeline'), status = $('media-status');
let active = 0, duration = 0, ready = false, playing = false, loadingVersion = 0, playVersion = 0;
// These small local previews are loaded as blobs so seeking also works on
// static servers without HTTP byte-range support (e.g. python http.server).
const mediaCache = new Map();
function mediaURL(path) {
  if (!mediaCache.has(path)) {
    mediaCache.set(path, fetch(path).then(response => {
      if (!response.ok) throw new Error(`Media HTTP ${response.status}`);
      return response.blob();
    }).then(blob => URL.createObjectURL(blob)).catch(error => {
      mediaCache.delete(path); throw error;
    }));
  }
  return mediaCache.get(path);
}
const formatTime = seconds => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;

function pause() {
  playVersion++;
  playing = false;
  source.pause(); edited.pause();
  playButton.textContent = '播放对比';
}
function updateTime() {
  timeline.value = duration ? Math.min(1000, source.currentTime/duration*1000) : 0;
  $('time').textContent = `${formatTime(source.currentTime || 0)} / ${formatTime(duration || 0)}`;
}
function seek(seconds) {
  if (!ready) return;
  const target = Math.max(0, Math.min(seconds, duration));
  source.currentTime = target;
  edited.currentTime = target;
  updateTime();
}
async function play() {
  if (!ready) return;
  if (source.currentTime >= duration - .06) seek(0);
  edited.currentTime = source.currentTime;
  const version = ++playVersion;
  try {
    await Promise.all([source.play(), edited.play()]);
    if (version !== playVersion) return;
    playing = true;
    playButton.textContent = '暂停对比';
    status.hidden = true;
  } catch (error) {
    if (version !== playVersion) return;
    pause();
    status.textContent = '播放未成功，请再点一次播放，或查看官方原片。';
    status.hidden = false;
  }
}

function selectCase(index) {
  const item = cases[index];
  active = index;
  const version = ++loadingVersion;
  pause(); ready = false; duration = 0;
  playButton.disabled = true; $('restart').disabled = true; timeline.disabled = true;
  timeline.value = 0; $('time').textContent = '0:00 / 0:00';
  status.textContent = '正在加载官方预览…'; status.hidden = false;
  $('case-count').textContent = `CASE ${String(index+1).padStart(2,'0')} / 05`;
  $('case-title').textContent = item.title;
  $('prompt-cn').textContent = item.prompt;
  $('prompt-en').textContent = item.english;
  $('application').textContent = item.application;
  $('original-link').href = `https://github.com/user-attachments/assets/${item.original}`;
  $('observations').replaceChildren(...item.observations.map(text => {
    const li = document.createElement('li'); li.textContent = text; return li;
  }));
  [...$('case-list').children].forEach((button,i) => {
    button.classList.toggle('active', i===index);
    button.setAttribute('aria-pressed', String(i===index));
  });
  let loaded = 0;
  [source, edited].forEach(async (video,i) => {
    video.onloadeddata = null; video.onerror = null;
    video.removeAttribute('src'); video.load();
    video.onloadeddata = () => {
      if (version !== loadingVersion) return;
      loaded++;
      if (loaded === 2) {
        duration = Math.min(source.duration, edited.duration);
        if (!Number.isFinite(duration) || duration <= 0) return;
        ready = true; playButton.disabled = false; timeline.disabled = false; $('restart').disabled = false;
        status.hidden = true; updateTime();
      }
    };
    video.onerror = () => {
      if (version !== loadingVersion) return;
      pause(); ready = false; playButton.disabled = true; timeline.disabled = true; $('restart').disabled = true;
      status.textContent = '预览加载失败，请刷新重试，或点击下方“查看官方原片”。'; status.hidden = false;
    };
    video.poster = `media/${item.id}_${i ? 'edited' : 'source'}.jpg`;
    video.preload = 'auto';
    video.playbackRate = Number($('speed').value);
    try {
      const url = await mediaURL(`media/${item.id}_${i ? 'edited' : 'source'}.mp4`);
      if (version !== loadingVersion) return;
      video.src = url;
      video.load();
    } catch (error) {
      if (version === loadingVersion) video.onerror();
    }
  });
  const hash = `#${item.id}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

cases.forEach((item,index) => {
  const button = document.createElement('button');
  button.className = 'case-card'; button.type = 'button';
  const img = document.createElement('img');
  img.src = `media/${item.id}_edited.jpg`; img.alt = ''; img.width = 59; img.height = 48;
  const label = document.createElement('span');
  const name = document.createElement('strong'); name.textContent = item.title;
  const type = document.createElement('small'); type.textContent = `${String(index+1).padStart(2,'0')} / ${item.type}`;
  label.append(name,type); button.append(img,label);
  button.addEventListener('click', () => selectCase(index));
  $('case-list').append(button);
});
playButton.addEventListener('click', () => playing ? pause() : play());
$('restart').addEventListener('click', () => { seek(0); play(); });
timeline.addEventListener('input', () => { pause(); seek(Number(timeline.value)/1000*duration); });
$('speed').addEventListener('change', () => {
  source.playbackRate = Number($('speed').value); edited.playbackRate = source.playbackRate;
});
function setMode(wipe) {
  $('stage').classList.toggle('wipe',wipe);
  $('wipe-control').hidden = !wipe;
  $('side-mode').classList.toggle('selected',!wipe); $('wipe-mode').classList.toggle('selected',wipe);
  $('side-mode').setAttribute('aria-pressed',String(!wipe)); $('wipe-mode').setAttribute('aria-pressed',String(wipe));
}
$('side-mode').addEventListener('click',()=>setMode(false));
$('wipe-mode').addEventListener('click',()=>setMode(true));
$('wipe-range').addEventListener('input',event => $('stage').style.setProperty('--split',`${event.target.value}%`));
source.addEventListener('ended',()=> { pause(); updateTime(); });
edited.addEventListener('ended',()=> { pause(); updateTime(); });
document.addEventListener('visibilitychange',()=> { if(document.hidden) pause(); });
function frame() {
  if (playing && ready) {
    if (source.currentTime >= duration - .04) { pause(); seek(duration); }
    else if (Math.abs(source.currentTime - edited.currentTime) > .09 && !edited.seeking) edited.currentTime = source.currentTime;
    updateTime();
  }
  requestAnimationFrame(frame);
}
window.addEventListener('hashchange',()=> {
  const index = cases.findIndex(item => `#${item.id}` === location.hash);
  if (index >= 0 && index !== active) selectCase(index);
});
const initial = cases.findIndex(item => `#${item.id}` === location.hash);
// Preserve section deep links while initializing the first preview.
const initialHash = location.hash;
selectCase(initial < 0 ? 0 : initial);
if (initialHash && initial < 0) { history.replaceState(null,'',initialHash); document.getElementById(initialHash.slice(1))?.scrollIntoView(); }
requestAnimationFrame(frame);

// Supplementary official stills: preserve the whole screenshot, including its source/result labels.
const effectDialog = $('effect-dialog');
let effectOpener = null;
document.querySelectorAll('.effect-image').forEach(button => {
  button.addEventListener('click', () => {
    effectOpener = button;
    pause();
    $('reference-video').pause();
    const img = button.querySelector('img');
    $('effect-dialog-title').textContent = button.dataset.title;
    $('effect-dialog-image').src = img.src;
    $('effect-dialog-image').alt = img.alt;
    $('effect-dialog-original').href = img.src;
    effectDialog.showModal();
  });
});
$('close-effect-dialog').addEventListener('click', () => effectDialog.close());
effectDialog.addEventListener('click', event => { if (event.target === effectDialog) effectDialog.close(); });
effectDialog.addEventListener('close', () => effectOpener?.focus({preventScroll:true}));
$('jump-multi-edit').addEventListener('click', () => {
  selectCase(2);
  $('comparison').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  playButton.focus({preventScroll:true});
});

// The official 30-second compilation is also a local Blob for reliable seeking.
const referenceVideo = $('reference-video');
const referenceButton = $('reference-load');
referenceVideo.controls = false;
referenceVideo.querySelector('source').removeAttribute('src');
referenceVideo.load();
referenceButton.addEventListener('click', async () => {
  referenceButton.disabled = true;
  $('reference-status').textContent = '正在加载官方换装视频…';
  try {
    const url = await mediaURL('live/reference-outfits.mp4');
    await new Promise((resolve, reject) => {
      referenceVideo.onloadeddata = resolve;
      referenceVideo.onerror = () => reject(new Error('Reference video failed to decode'));
      referenceVideo.src = url;
      referenceVideo.load();
    });
    referenceVideo.controls = true;
    referenceButton.hidden = true;
    $('reference-status').textContent = '官方效果合集 · 可暂停、拖动进度或全屏查看。';
    try { await referenceVideo.play(); }
    catch { $('reference-status').textContent = '视频已就绪，请点击播放器中的播放按钮。'; }
  } catch (error) {
    $('reference-status').textContent = '加载失败，请重试，或打开左侧的官方视频链接。';
    referenceButton.textContent = '重新加载换装视频';
  } finally {
    referenceButton.disabled = false;
  }
});
referenceVideo.addEventListener('play', pause);
source.addEventListener('play', () => referenceVideo.pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) referenceVideo.pause(); });
