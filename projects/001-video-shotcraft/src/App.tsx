import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Player, Thumbnail, type PlayerRef } from '@remotion/player';
import { COMMIT, FPS, REPO, shots, sourceUrl, type DemoProps, type Shot } from './shots';
import { Reel, REEL_DURATION, reelShots } from './Reel';

type IconName = 'play' | 'pause' | 'arrow' | 'search' | 'reset' | 'previous' | 'next' | 'expand' | 'layers' | 'film' | 'code' | 'check' | 'external' | 'download';
function Icon({name, size = 18}: {name: IconName; size?: number}) {
  const paths: Record<IconName, React.ReactNode> = {
    play: <path d="m9 5 11 7-11 7Z"/>, pause: <><path d="M8 5v14M16 5v14"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>, search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
    reset: <><path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/></>, previous: <path d="M6 5v14m12-14-9 7 9 7Z"/>,
    next: <path d="M18 5v14M6 5l9 7-9 7Z"/>, expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5"/>,
    layers: <><path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></>,
    film: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4M17 9h4m-4 6h4"/></>,
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>, check: <path d="m5 12 4 4L19 6"/>,
    external: <path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const LinkOut = ({href, children}: {href: string; children: React.ReactNode}) => <a href={href} target="_blank" rel="noreferrer">{children}<Icon name="external" size={14}/></a>;

function Preview({shot, reel, inputProps}: {shot: Shot; reel: boolean; inputProps: DemoProps}) {
  const ref = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const duration = reel ? REEL_DURATION : shot.duration;
  const key = reel ? 'reel' : shot.id;
  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    const update = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
    const play = () => setPlaying(true);
    const pause = () => setPlaying(false);
    setFrame(player.getCurrentFrame());
    setPlaying(player.isPlaying());
    player.addEventListener('frameupdate', update);
    player.addEventListener('play', play);
    player.addEventListener('pause', pause);
    player.addEventListener('ended', pause);
    return () => {
      player.removeEventListener('frameupdate', update);
      player.removeEventListener('play', play);
      player.removeEventListener('pause', pause);
      player.removeEventListener('ended', pause);
    };
  }, [key]);
  const seek = (value: number) => {ref.current?.pause(); ref.current?.seekTo(Math.min(duration - 1, Math.max(0, value)));};
  const toggle = () => ref.current?.toggle();
  return <section className="preview" aria-label="镜头播放器">
    <div className="preview-top"><span><i className="live-dot"/> {reel ? '精选镜头串片' : '实时镜头预览'}</span><span className="mono">1920 × 1080 <b>·</b> 30 FPS <b>·</b> 无声演示</span></div>
    <div className="stage">
      <Player key={key} ref={ref} component={reel ? Reel : shot.component} inputProps={reel ? {} : inputProps}
        durationInFrames={duration} compositionWidth={1920} compositionHeight={1080} fps={FPS}
        style={{width: '100%'}} autoPlay={!reduced} loop={loop} playbackRate={speed}
        initialFrame={reduced && !reel ? shot.thumbnail : 0} clickToPlay doubleClickToFullscreen
        errorFallback={() => <div className="player-error">镜头加载失败。请刷新页面，或打开下方上游样片画廊。</div>}/>
    </div>
    <div className="transport">
      <div className="transport-row">
        <div className="transport-buttons">
          <button className="play-button" onClick={toggle} aria-label={playing ? '暂停' : '播放'} title={playing ? '暂停' : '播放'}><Icon name={playing ? 'pause' : 'play'}/></button>
          <button className="icon-button" onClick={() => seek(frame - 1)} aria-label="上一帧" title="上一帧"><Icon name="previous" size={17}/></button>
          <button className="icon-button" onClick={() => seek(frame + 1)} aria-label="下一帧" title="下一帧"><Icon name="next" size={17}/></button>
          <span className="timecode mono">{(frame / FPS).toFixed(2)} <span>/ {(duration / FPS).toFixed(2)} s</span></span>
        </div>
        <div className="transport-options">
          <label className="sr-only" htmlFor="speed">播放速度</label>
          <select id="speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1× 速度</option><option value="1.5">1.5×</option><option value="2">2×</option></select>
          <button className={`icon-button ${loop ? 'enabled' : ''}`} onClick={() => setLoop(!loop)} aria-label="循环播放" aria-pressed={loop} title="循环播放"><Icon name="reset" size={17}/></button>
          <button className="icon-button" onClick={() => ref.current?.requestFullscreen()} aria-label="全屏预览" title="全屏预览"><Icon name="expand" size={17}/></button>
        </div>
      </div>
      <input className="seekbar" type="range" min="0" max={duration - 1} value={frame} onChange={e => seek(Number(e.target.value))} aria-label="播放进度" aria-valuetext={`第 ${frame} 帧，共 ${duration} 帧`} style={{'--progress': `${frame / (duration - 1) * 100}%`} as CSSProperties}/>
      <div className="frame-ruler mono"><span>000</span><span>FRAME {String(frame).padStart(3, '0')}</span><span>{duration - 1}</span></div>
    </div>
    <div className="beat-strip">
      <span className="beat-label">{reel ? '镜头顺序' : '关键时刻'}</span>
      {reel ? reelShots.map((s, i) => <button key={s.id} onClick={() => seek(reelShots.slice(0, i).reduce((n, item) => n + item.duration, 0))}><span className="mono">0{i + 1}</span> {s.name}</button>)
        : shot.beats.map(beat => <button key={beat.frame} onClick={() => seek(beat.frame)}><span className="mono">{String(beat.frame).padStart(3, '0')}f</span> {beat.label}</button>)}
    </div>
  </section>;
}

function Inspector({shot, inputProps, setProps}: {shot: Shot; inputProps: DemoProps; setProps: (v: DemoProps) => void}) {
  return <aside className="inspector">
    <div className="inspector-heading"><span className="eyebrow">SHOT NOTES</span><span className="verified"><Icon name="check" size={13}/> 真实源码</span></div>
    <span className="category-tag" style={{color: shot.color}}>{shot.category}</span>
    <h2>{shot.name}</h2><p className="intro-copy">{shot.intro}</p>
    <div className="tags">{shot.tags.map(t => <span key={t}>{t}</span>)}</div>
    <div className="note-section"><h3>适合表达什么</h3><p>{shot.use}</p></div>
    <div className="note-section"><h3>画面为什么会动</h3><p>{shot.principle}</p></div>
    {shot.id === 'blur-slide' && <div className="edit-box"><h3>换成你的文案 <span>本地适配</span></h3>
      <label>主标题<input value={inputProps.headline ?? 'Your headline goes here'} maxLength={28} onChange={e => setProps({...inputProps, headline: e.target.value})}/></label>
      <label>副标题<input value={inputProps.subtitle ?? 'Short supporting subtitle for placeholders'} maxLength={42} onChange={e => setProps({...inputProps, subtitle: e.target.value})}/></label>
      <small>中文可用空格分组，例如「让 创意 自己 动起来」。</small>
    </div>}
    {shot.id === 'counter-confetti' && <div className="edit-box"><h3>换成你的数据 <span>本地适配</span></h3>
      <label>目标数字<input type="number" min={1} max={99999} value={inputProps.target ?? 1000} onChange={e => setProps({...inputProps, target: Math.min(99999, Math.max(1, Number(e.target.value) || 1))})}/></label>
      <label>指标名称<input value={inputProps.metric ?? 'METRIC THIS WEEK'} maxLength={22} onChange={e => setProps({...inputProps, metric: e.target.value})}/></label>
    </div>}
    <p className="caveat">{shot.caveat}</p>
    <div className="source-links"><LinkOut href={sourceUrl(`references/shots/${shot.path}.md`)}>阅读镜头配方</LinkOut><LinkOut href={`${REPO}/tree/${COMMIT}/demos/${shot.path}`}>查看源码</LinkOut></div>
  </aside>;
}

const steps = [
  {name: '理解产品', artifact: '产品简报', title: '先决定要讲什么', description: '从产品页面、主要功能和目标观众中提炼一条主线。确定观众看完后应该记住什么，再选择模板或自由创作。', detail: '输入：产品网址、演示页面、功能与受众。', path: 'references/pipeline.md', chips: ['产品定位', '受众与场景', '品牌视觉']},
  {name: '采集素材', artifact: '截图 + 坐标', title: '让真实界面成为镜头素材', description: '用浏览器采集高清整页截图和元素切片，同时记录它们的布局坐标。镜头里的卡片因此能够从界面中浮起，再精确归位。', detail: '输出：页面底板、透明元素图、layout.json。', path: 'assets/scripts/capture-template.mjs', chips: ['真实页面', '高清切片', '元素位置']},
  {name: '编排镜头', artifact: '分镜 + 配方', title: '把效果变成一段有目的的叙事', description: '镜头卡描述适用场景、能量与时长。先搭建「开场 → 功能 → 成果 → 收尾」，再为每个信息点选择动作。', detail: '配方给出意图；参考源码保留调校后的时值和缓动。', path: 'references/shots/ui-entrance/card-stack.md', chips: ['镜头目的', '注意力顺序', '停留预算']},
  {name: '逐帧合成', artifact: 'Remotion 工程', title: '帧号决定这一刻的全部画面', description: 'React 组件根据当前帧号计算位置、旋转、透明度和模糊。多段镜头在时间线上拼接，固定随机种子让同一帧可以重复得到。', detail: '核心关系：画面 = f（帧号，素材，参数）。', path: 'assets/lib/PageCam.tsx', chips: ['关键帧插值', 'CSS / SVG', '确定性渲染']},
  {name: '声音与验收', artifact: '音效 + 检查', title: '动作、音乐和阅读节奏一起落定', description: '按音乐节拍安排切点，在动作落定处放置音效。静帧检查负责找穿帮，正常速度回看负责检查节奏与可读性。', detail: '本展示仅验证无声镜头；配乐、卡点与独立成片审查尚未实测。', path: 'references/sound-design.md', chips: ['节拍对齐', '音效落点', '视觉检查']},
  {name: '可编辑交付', artifact: '视频 + 工程', title: '交付之后，还能继续精修', description: '上游工作台依据工程清单拆分镜头、字幕和声音轨。时间和图层可调整；文案、颜色等内容能否编辑，取决于组件是否开放对应参数。', detail: '不会把任意 MP4 自动还原为图层。剪映导出在上游仅有 Mac 实测记录。', path: 'references/workbench.md', chips: ['多轨时间线', '参数面板', '工程导出']},
];

function Workflow() {
  const [selected, setSelected] = useState(0);
  const step = steps[selected];
  return <section className="content-page">
    <div className="section-intro"><span className="eyebrow">FROM PRODUCT TO FILM</span><h2>附带制作方法：把素材组织成片。</h2><p>以下是上游提供的流程与工具说明；本次仅实测精选动效和无声串片，完整流程尚未跑通。</p></div>
    <div className="pipeline">{steps.map((s, i) => <button key={s.name} className={selected === i ? 'selected' : ''} aria-pressed={selected === i} onClick={() => setSelected(i)}><span className="mono">0{i + 1}</span><strong>{s.name}</strong><small>{s.artifact}</small><Icon name="arrow" size={16}/></button>)}</div>
    <div className="pipeline-detail"><div className="big-step mono">0{selected + 1}<span>/ 06</span></div><div><span className="eyebrow">{step.artifact}</span><h3>{step.title}</h3><p>{step.description}</p><div className="tags">{step.chips.map(c => <span key={c}>{c}</span>)}</div><div className="detail-foot">{step.detail}</div><LinkOut href={sourceUrl(step.path)}>查看对应实现</LinkOut></div></div>
    <div className="roles"><article><Icon name="layers"/><h3>Shotcraft 提供制作经验</h3><p>镜头配方、代码组件、素材、完整模板与验收方法，让 Agent 有可执行的制作依据。</p></article><article><Icon name="code"/><h3>Agent 负责理解与实施</h3><p>选择镜头、适配产品、编排分镜、修改代码并检查结果，需要外部编码 Agent 执行。</p></article><article><Icon name="film"/><h3>Remotion 负责画面与渲染</h3><p>把 React 场景变成逐帧画面，在浏览器中预览，并通过渲染流程输出视频文件。</p></article></div>
  </section>;
}

function Research() {
  return <section className="content-page research">
    <div className="section-intro"><span className="eyebrow">RESEARCH / 001</span><h2>补充动效素材，新增能力有限。</h2><p>我们的判断：与已研究的 TalkCraft、Vibe Motion 在动效层明显重叠，适合按需取用，独立研究优先级较低。</p></div>
    <div className="research-grid"><article className="research-thesis"><Icon name="layers" size={28}/><h3>核心是 Remotion 动效素材合集</h3><p>包含可运行的镜头代码、动态预览、调参配方，另外附带 Agent 制作指引、模板与交付工具。底层由 React 描述画面，根据帧号计算位置、透明度和旋转，再由 Remotion 预览与渲染。</p><blockquote>画面 = f（帧号，素材，参数）</blockquote><p>主要价值在挑选更合适的镜头实现、真实页面切片与运镜方法，以及现成的节奏参数和失败经验。完整产品适配仍需要素材、品牌与叙事工作。</p></article>
    <article className="verified-list"><h3>这次展示覆盖了什么</h3><ul><li><Icon name="check"/>8 个上游镜头在本地实时运行</li><li><Icon name="check"/>逐帧定位、倍速与关键时刻跳转</li><li><Icon name="check"/>2 个镜头开放内容参数编辑</li><li><Icon name="check"/>6 段镜头连续播放并导出 MP4</li></ul><p>本次未复现：完整产品素材采集、配乐卡点、上游工作台、剪映工程导出。此页是能力研究展台，不是上游完整编辑器。</p></article></div>
    <div className="capability-table"><h3>与以前研究的项目重叠在哪里</h3><p>文字、卡片、数字、转场、参数化和逐帧渲染属于共同能力。下面是各项目的侧重点，并非彼此独有的能力。</p><table><thead><tr><th>项目 / 源库</th><th>主要侧重点</th><th>与本库的关系</th></tr></thead><tbody>
      <tr><td><LinkOut href={REPO}>video-shotcraft</LinkOut></td><td>产品宣传、真实界面切片、镜头配方</td><td>本次作为补充素材库收录</td></tr>
      <tr><td><LinkOut href="https://github.com/Vincentwei1021/video-talkcraft">video-talkcraft</LinkOut></td><td>口播内容、词级时间戳与画面同步</td><td>同样使用 Remotion；动效素材与编排方法重叠</td></tr>
      <tr><td><LinkOut href="https://github.com/vibe-motion">vibe-motion 项目组</LinkOut></td><td>更广泛的 2D / 3D 动画工程与制作指引</td><td>2D Remotion 部分重叠，另有 Three.js 等路线</td></tr>
    </tbody></table></div>
    <div className="research-grid"><article className="research-thesis"><h3>对我们的实际价值</h3><p>已有类似项目的研究积累后，再建一个效果画廊的边际价值较低。保留质量较好的镜头源码、参数与素材采集方法，在有具体视频需求时调用即可。</p><p>下一次有价值的验证，是用自己的产品做一支 20–30 秒短片，记录素材替换、调参、渲染和修改所花时间，再判断是否提高效率。</p></article><article className="verified-list"><h3>已有研究与判断边界</h3><p><LinkOut href="https://yydshly.github.io/0914_codex_project/003-video-talkcraft/">回看 TalkCraft 研究</LinkOut></p><p><LinkOut href="https://yydshly.github.io/0914_codex_project/004-vibe-motion/">回看 Vibe Motion 研究</LinkOut></p><p>比较依据是此前研究记录与本次源码实测，没有做同一制作任务的横向性能或效率测评。8 个镜头能运行，不等于完整生产流程更强，也不能证明成片质量更高。</p></article></div>
    <div className="source-record"><div><span className="eyebrow">SOURCE SNAPSHOT</span><h3>来源与验证边界</h3><p>研究日期：2026-09-20 · 固定提交：<code>{COMMIT.slice(0, 7)}</code>。</p><p>上游 README 记载 157 张镜头卡、214 条动态预览；不同目录的统计口径略有差异，本页仅选取 8 个示例。动画与演示素材来源于 Vincentwei1021/video-shotcraft；文案与数字镜头有明确标记的本地参数化改动。</p><p>上游代码使用 Apache-2.0；Remotion 和其他依赖适用各自许可。演示中的界面与指标均为上游示例。</p></div><div className="source-list"><LinkOut href={`${REPO}/tree/${COMMIT}`}>固定版本仓库</LinkOut><LinkOut href="https://vincentwei1021.github.io/video-shotcraft/">完整样片画廊</LinkOut><LinkOut href={sourceUrl('references/workbench.md')}>上游工作台说明</LinkOut><LinkOut href="https://www.remotion.dev/docs/the-fundamentals">Remotion 技术原理</LinkOut><a href="./licenses/video-shotcraft-LICENSE.txt" target="_blank" rel="noreferrer">上游许可证 <Icon name="external" size={14}/></a></div></div>
  </section>;
}

export function App() {
  const [page, setPage] = useState('lab');
  const [selected, setSelected] = useState(shots[0]);
  const [filter, setFilter] = useState('全部镜头');
  const [query, setQuery] = useState('');
  const [reel, setReel] = useState(false);
  const [propsByShot, setPropsByShot] = useState<Record<string, DemoProps>>({});
  const categories = ['全部镜头', ...new Set(shots.map(s => s.category))];
  const visible = shots.filter(s => (filter === '全部镜头' || s.category === filter) && `${s.name} ${s.id} ${s.tags.join(' ')} ${s.use}`.toLowerCase().includes(query.toLowerCase().trim()));
  const choose = (shot: Shot) => {setSelected(shot); setReel(false); document.getElementById('workspace')?.scrollIntoView({block: 'start', behavior: 'instant'});};
  return <div className="app-shell">
    <a className="skip-link" href="#main">跳到主要内容</a>
    <header className="site-header"><a className="brand" href="#" onClick={e => {e.preventDefault(); setPage('lab');}}><img src="./favicon.svg" width="34" height="34" alt=""/><span>Shotcraft <b>Lab</b></span></a><div className="header-divider"/><span className="project-id">开源项目研究 <span className="mono">/ 001</span></span><div className="header-right"><span className="research-label"><i/> 能力实测</span><LinkOut href={REPO}>video-shotcraft</LinkOut></div></header>
    <main id="main">
      <div className="page-heading"><div><div className="eyebrow">VIDEO SHOTCRAFT / CAPABILITY EXPLORER</div><h1>Remotion 动效素材合集<span>。</span></h1><p>与 TalkCraft、Vibe Motion 动效能力重叠；按需复用镜头源码与调参经验，新增能力有限。</p></div><button className="primary-button" onClick={() => {setPage('lab'); setReel(true);}}><Icon name="play" size={17}/> 播放精选串片 <span className="mono">{(REEL_DURATION / FPS).toFixed(1)}s</span></button></div>
      <div className="main-nav"><nav aria-label="展示内容">{[{id: 'lab', icon: 'film', label: '镜头实验室'}, {id: 'workflow', icon: 'layers', label: '制作流程'}, {id: 'research', icon: 'code', label: '理解与价值'}].map(tab => <button key={tab.id} aria-current={page === tab.id ? 'page' : undefined} className={page === tab.id ? 'active' : ''} onClick={() => setPage(tab.id)}><Icon name={tab.icon as IconName} size={17}/>{tab.label}{tab.id === 'lab' && <span className="nav-count">08</span>}</button>)}</nav><span className="nav-note"><i/> 基于上游真实 Remotion 组件</span></div>
      {page === 'lab' && <>
        <div id="workspace" className="workspace"><Preview shot={selected} reel={reel} inputProps={propsByShot[selected.id] ?? {}}/>
          {reel ? <aside className="inspector reel-inspector"><span className="eyebrow">THE SELECTED REEL</span><h2>从单个镜头，到一段表达。</h2><p className="intro-copy">6 段真实镜头连续播放，观察开场、信息汇入、标题与成果如何交接。</p><div className="reel-list">{reelShots.map((s, i) => <div key={s.id}><span className="mono">0{i + 1}</span><strong>{s.name}</strong><small>{(s.duration / FPS).toFixed(1)}s</small></div>)}</div><p className="caveat">这是为研究编排的无声串片，保留上游示例内容，未接入配乐与完整制作工作台。</p><button className="secondary-button" onClick={() => setReel(false)}>返回单镜头拆解 <Icon name="arrow" size={16}/></button><a className="reel-download" href="./media/showcase.mp4" download="shotcraft-showcase.mp4"><Icon name="download" size={15}/> 下载串片 · MP4 / 540p</a></aside>
          : <Inspector shot={selected} inputProps={propsByShot[selected.id] ?? {}} setProps={value => setPropsByShot({...propsByShot, [selected.id]: value})}/>}
        </div>
        <section className="library" aria-label="精选镜头库"><div className="library-title"><div><h2>精选镜头 <span className="mono">/ 08</span></h2><p>覆盖界面、文字、数据与转场，点击即可在上方播放。</p></div><label className="search"><Icon name="search" size={17}/><input aria-label="搜索镜头" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索镜头或用途…"/>{query && <button aria-label="清空搜索" onClick={() => setQuery('')}>×</button>}</label></div>
          <div className="filter-row"><div className="filters">{categories.map(category => <button key={category} aria-pressed={filter === category} className={filter === category ? 'selected' : ''} onClick={() => setFilter(category)}>{category}{category === '全部镜头' && <span>8</span>}</button>)}</div><span className="result-count mono">{String(visible.length).padStart(2, '0')} 个镜头</span></div>
          <div className="shot-grid">{visible.map(shot => <button key={shot.id} className={`shot-card ${!reel && selected.id === shot.id ? 'selected' : ''}`} aria-label={`预览${shot.name}`} aria-pressed={!reel && selected.id === shot.id} onClick={() => choose(shot)}>
            <div className="shot-thumbnail" aria-hidden="true"><Thumbnail component={shot.component} inputProps={propsByShot[shot.id] ?? {}} compositionWidth={1920} compositionHeight={1080} durationInFrames={shot.duration} fps={FPS} frameToDisplay={shot.thumbnail} style={{width: '100%'}}/><span className="duration mono">{(shot.duration / FPS).toFixed(1)}s</span><span className="thumb-play"><Icon name="play" size={18}/></span>{!reel && selected.id === shot.id && <span className="current-label"><i/> 当前预览</span>}</div><div className="shot-card-info"><span className="shot-number mono">{String(shots.indexOf(shot) + 1).padStart(2, '0')}</span><div><h3>{shot.name}</h3><span>{shot.category}</span></div><Icon name="arrow" size={16}/></div>
          </button>)}</div>
          {visible.length === 0 && <div className="empty-state"><Icon name="search" size={30}/><h3>没有匹配的镜头</h3><p>试试「标题」「卡片」或「数据」，也可以清除筛选。</p><button className="secondary-button" onClick={() => {setQuery(''); setFilter('全部镜头');}}>查看全部镜头</button></div>}
        </section>
        <div className="explore-banner"><div><Icon name="layers" size={28}/><div><h3>类似的库以前研究过，这次留下什么？</h3><p>对照 TalkCraft 与 Vibe Motion，说明能力重叠、复用价值和验证边界。</p></div></div><button className="text-button" onClick={() => {setPage('research'); window.scrollTo(0,0);}}>查看理解与价值 <Icon name="arrow"/></button></div>
      </>}
      {page === 'workflow' && <Workflow/>}{page === 'research' && <Research/>}
    </main>
    <footer><div><span className="footer-brand">Shotcraft Lab</span><span>项目研究 001 · 2026.09</span></div><span>镜头来源 <a href={REPO} target="_blank" rel="noreferrer">Vincentwei1021/video-shotcraft ↗</a><b>·</b> 本页为独立研究展示</span></footer>
  </div>;
}
