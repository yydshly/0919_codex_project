const platforms = [
  {name:'Facebook', sub:'', key:'facebook 脸书', symbol:'F', comments:true, dm:true, analytics:true, note:'项目列出发布、评论、私信和统计四项能力。接入仍需 Meta 开发者凭证与对应账号权限，不代表所有账号或内容形式都可用。'},
  {name:'Instagram', sub:'经 Facebook 连接', key:'instagram ins 照片', symbol:'I', comments:true, dm:true, analytics:true, note:'通过 Facebook Login 接入的 Instagram 连接方式，需要满足其专业账号与关联要求。支持矩阵列出四项能力，实际以授权范围为准。'},
  {name:'Instagram Direct', sub:'直接连接', key:'instagram ins direct 直接', symbol:'I', comments:true, dm:true, analytics:true, note:'使用 Instagram Login 直接连接专业账号，无需关联 Facebook Page。它与上一行属于同一个平台的两种接入方式。'},
  {name:'LinkedIn', sub:'个人账号', key:'linkedin 领英 个人', symbol:'in', comments:true, dm:false, analytics:true, note:'个人账号和公司账号分别实现。README 列出发布、评论和统计，但评论与统计可能需要受限权限及审核；不提供私信管理。'},
  {name:'LinkedIn', sub:'公司账号', key:'linkedin 领英 公司 企业', symbol:'in', comments:true, dm:false, analytics:true, note:'面向公司账号的接入，需具备相应管理资格和 API 权限。与个人账号同属 LinkedIn，因此不重复计为一个平台。'},
  {name:'TikTok', sub:'海外短视频', key:'tiktok 短视频', symbol:'T', comments:false, dm:false, analytics:true, note:'支持发布与数据统计，当前矩阵没有评论和私信能力。TikTok 不是国内抖音；上传被接收后还可能需要转码和结果确认。'},
  {name:'YouTube', sub:'视频平台', key:'youtube 油管 视频', symbol:'Y', comments:true, dm:false, analytics:true, note:'支持发布、评论和统计，不提供私信管理。实际上传与取数受 Google 授权、账号资格和 API 配额等条件影响。'},
  {name:'Pinterest', sub:'视觉内容', key:'pinterest 图片 视觉', symbol:'P', comments:false, dm:false, analytics:true, note:'项目支持发布与统计，当前矩阵没有评论和私信能力。内容类型与素材规格仍需符合平台接口要求。'},
  {name:'Threads', sub:'文字社交', key:'threads 文字 社交', symbol:'@', comments:true, dm:false, analytics:true, note:'支持发布、评论和统计。它使用单独的 Threads 应用身份与授权配置，不能直接把 Facebook 的凭证配置照搬过来。'},
  {name:'Bluesky', sub:'社交社区', key:'bluesky 蓝天', symbol:'B', comments:true, dm:false, analytics:false, note:'支持发布和评论。当前项目矩阵没有私信与统计能力；这描述的是本项目接入范围，不是平台本身有没有这些功能。'},
  {name:'Google Business Profile', sub:'谷歌商家资料', key:'google business profile 谷歌 商家', symbol:'G', comments:false, dm:false, analytics:true, note:'用于商家资料相关内容发布与统计。此表的“评论”对应上游 Comments 一列，不把商家评价与帖子评论自动视为同一能力。'},
  {name:'Mastodon', sub:'长毛象', key:'mastodon 长毛象', symbol:'M', comments:true, dm:false, analytics:false, note:'支持发布和评论。当前矩阵未提供私信和数据统计；接入条件还取决于所连接的实例及授权。'},
  {name:'DEV.to', sub:'开发者社区', key:'dev.to devto 开发者 技术文章', symbol:'D', comments:false, dm:false, analytics:false, note:'面向开发者社区的内容发布，可使用个人 API key 连接。当前矩阵只列出发布，未列出评论、私信或统计。'}
];

const rows = document.querySelector('#platform-rows');
const detail = document.querySelector('#platform-detail');
let filter = 'all';
let selected = 0;

function showDetail(index) {
  selected = index;
  const platform = platforms[index];
  detail.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = platform.name + (platform.sub ? ' · ' + platform.sub : '');
  const note = document.createElement('p');
  note.textContent = platform.note;
  detail.append(title, note);
  rows.querySelectorAll('tr').forEach(row => {
    const active = Number(row.dataset.index) === index;
    row.classList.toggle('chosen', active);
    row.querySelector('button').setAttribute('aria-pressed', String(active));
  });
}

function renderPlatforms() {
  const query = document.querySelector('#platform-search').value.trim().toLocaleLowerCase();
  const visible = platforms.map((platform,index) => ({platform,index})).filter(({platform}) =>
    (filter === 'all' || platform[filter]) && `${platform.name} ${platform.sub} ${platform.key}`.toLocaleLowerCase().includes(query)
  );
  rows.replaceChildren();
  for (const {platform,index} of visible) {
    const row = document.createElement('tr');
    row.dataset.index = index;
    const nameCell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'platform-button';
    button.setAttribute('aria-label', `查看 ${platform.name} ${platform.sub} 接入说明`);
    const symbol = document.createElement('b');
    symbol.className = 'platform-symbol';
    symbol.setAttribute('aria-hidden','true');
    symbol.textContent = platform.symbol;
    const label = document.createElement('span');
    label.textContent = platform.name;
    if (platform.sub) {
      const sub = document.createElement('small');
      sub.textContent = platform.sub;
      label.append(sub);
    }
    const arrow = document.createElement('span');
    arrow.className = 'row-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden','true');
    button.append(symbol,label,arrow);
    button.addEventListener('click', () => showDetail(index));
    nameCell.append(button);
    row.append(nameCell);
    for (const supported of [true,platform.comments,platform.dm,platform.analytics]) {
      const cell = document.createElement('td');
      const mark = document.createElement('span');
      mark.className = supported ? 'yes' : 'no';
      mark.textContent = supported ? '●' : '—';
      mark.setAttribute('aria-label',supported ? '支持' : '未列出');
      cell.append(mark);
      row.append(cell);
    }
    rows.append(row);
  }
  document.querySelector('#result-count').textContent = `显示 ${visible.length} / 13 种接入方式`;
  document.querySelector('#empty-results').hidden = visible.length > 0;
  detail.hidden = visible.length === 0;
  if (visible.length) showDetail(visible.some(item => item.index === selected) ? selected : visible[0].index);
}

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => {
    const active = item === button;
    item.classList.toggle('selected',active);
    item.setAttribute('aria-pressed',String(active));
  });
  renderPlatforms();
}));
document.querySelector('#platform-search').addEventListener('input',renderPlatforms);
renderPlatforms();

const steps = [
  {label:'01 / COMPOSE', title:'先保存共同内容，再准备平台版本。', text:'上传视频、填写介绍，并选好三个目标账号。可以给 YouTube 设置单独标题，给 TikTok 和 Instagram 调整文案。', insight:'内容可以复用；每个目标账号都有自己的发布记录。', statuses:[['草稿',''],['草稿',''],['草稿','']], note:'此处展示结构关系，不会上传素材或创建真实帖子。'},
  {label:'02 / SCHEDULE', title:'审核通过后，分别安排发布时间。', text:'按工作区规则完成检查或审核，再设置目标账号的时间。一个账号今天发布，另一个明天发布，也可以属于同一份内容。', insight:'要求审核的工作区，不能通过 AI 接口绕过必需审核直接排期。', statuses:[['已排期',''],['已排期',''],['已排期','']], note:'示例假设所有目标均已完成必要审核，具体时间可分别设置。'},
  {label:'03 / DISPATCH', title:'后台发现到期内容，调用官方接口。', text:'后台检查到期记录，认领任务并标记为发布中。平台模块准备各自需要的请求，上传文件或提供素材地址。', insight:'界面不需要一直打开，但服务器与后台任务进程需要持续工作。', statuses:[['发布中','waiting'],['上传处理中','waiting'],['发布中','waiting']], note:'固定版本每 15 秒扫描发布任务；不保证三个平台同一秒上线。'},
  {label:'04 / RECONCILE', title:'三个账号，可以有三个不同结果。', text:'YouTube 可能已上线，TikTok 仍在处理，Instagram 则因权限失败。系统分别记录状态，再继续确认或处理可重试错误。', insight:'无法确定是否已经发布时，先核对平台状态，避免盲目重复上传。', statuses:[['已发布','success'],['等待确认','waiting'],['权限失败','error']], note:'这是解释部分成功的模拟情境，不是一次真实发布结果。'},
  {label:'05 / LEARN', title:'将平台可提供的数据带回工作台。', text:'对成功发布的内容同步指标、评论等。人工或外部 AI 可以据此复盘；没有取得权限或尚未成功发布的目标，不能假定已有完整数据。', insight:'不同平台提供的指标不同，不能把所有播放、曝光与互动直接当作同一口径。', statuses:[['可同步指标','success'],['示例：已确认上线','success'],['仍需处理','error']], note:'示例假设 TikTok 随后确认成功；平台指标也可能存在延迟。'}
];

function renderStep(index) {
  const step = steps[index];
  document.querySelector('#step-label').textContent = step.label;
  document.querySelector('#step-title').textContent = step.title;
  document.querySelector('#step-text').textContent = step.text;
  document.querySelector('#step-insight').textContent = step.insight;
  document.querySelector('#example-note').textContent = step.note;
  const board = document.querySelector('#example-statuses');
  board.replaceChildren();
  ['YouTube','TikTok','Instagram'].forEach((name,i) => {
    const row = document.createElement('div');
    row.className = 'example-row';
    const icon = document.createElement('b');
    icon.className = `platform-symbol ${name.toLowerCase()}`;
    icon.textContent = name[0];
    icon.setAttribute('aria-hidden','true');
    const label = document.createElement('span');
    label.textContent = name;
    const state = document.createElement('span');
    state.className = `state-badge ${step.statuses[i][1]}`;
    state.textContent = step.statuses[i][0];
    row.append(icon,label,state);
    board.append(row);
  });
  document.querySelectorAll('[data-step]').forEach(button => {
    const active = Number(button.dataset.step) === index;
    button.classList.toggle('selected',active);
    button.setAttribute('aria-pressed',String(active));
  });
}
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click',() => renderStep(Number(button.dataset.step))));
renderStep(0);

const navLinks = [...document.querySelectorAll('.sidebar nav a')];
const sections = [...document.querySelectorAll('main > section')];
function markSection() {
  const offset = window.innerWidth <= 900 ? 150 : 120;
  let active = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= offset) active = section;
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5) active = sections.at(-1);
  for (const link of navLinks) {
    const selected = link.hash === '#' + active.id;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  }
}
let queued = false;
window.addEventListener('scroll',() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { markSection(); queued = false; });
},{passive:true});
window.addEventListener('resize',markSection);
markSection();
