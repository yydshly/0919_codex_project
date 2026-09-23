import { parseMailFile, analyzeMessages } from './core.mjs';
import { demoMbox } from './demo.mjs';
import { initializeConnection } from './connection.mjs';

const $ = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const signalLabels = { registration: '注册线索', usage: '使用记录', verification: '仅验证请求' };
const reviewLabels = { pending: '待确认', confirmed: '确认使用过', excluded: '与我无关' };
const descriptions = {
  registration: '发现账号创建或注册成功相关邮件。请核对是否属于你；这不代表账号现在仍然有效。',
  usage: '发现登录或账号服务使用相关邮件。可以作为历史使用线索，无法据此确认注册时间。',
  verification: '只发现验证或操作请求。收到验证码不等于完成注册，也不能证明是你发起的操作。'
};
let report = { platforms: [], stats: { total: 0, duplicates: 0, ignored: 0 } };
let review = new Map(), selected = null, filter = 'all', mode = 'empty', worker = null, job = 0;
let mailbox = null, busy = false;
const dateLabel = value => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '日期未知';
const statusFor = id => review.get(id) || 'pending';
function icon(platform) {
  const tones = { 'github.com': ['github', 'G'], 'notion.so': ['notion', 'N'], 'figma.com': ['figma', 'F'], 'canva.com': ['canva', 'C'], 'spotify.com': ['spotify', 'S'], 'zhihu.com': ['zhihu', '知'], 'bilibili.com': ['bilibili', '哔'] };
  const [tone, letter] = tones[platform.domain] || ['', platform.name?.charAt(0).toUpperCase() || '?'];
  return `<span class="platform-icon" data-tone="${tone}" aria-hidden="true">${escapeHtml(letter)}</span>`;
}
function showNotice(message, error = false) {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', error);
  $('notice').hidden = !message;
}
function getVisible() {
  const query = $('search-input').value.trim().toLowerCase();
  const state = $('review-filter').value;
  return report.platforms.filter(platform => (filter === 'all' || platform.signal === filter) && (state === 'all' || statusFor(platform.id) === state) && (!query || [platform.name, platform.domain, ...platform.evidence.map(mail => mail.to)].join(' ').toLowerCase().includes(query)));
}
function render() {
  const stats = report.stats;
  const platforms = report.platforms;
  $('metric-mails').textContent = Math.max(0, stats.total - stats.duplicates).toLocaleString();
  $('metric-mails-note').textContent = stats.duplicates ? `已合并 ${stats.duplicates} 封重复邮件` : '去重后的邮件数量';
  $('metric-platforms').textContent = platforms.length;
  $('metric-registration').textContent = platforms.filter(p => p.signal === 'registration').length;
  $('metric-confirmed').textContent = platforms.filter(p => statusFor(p.id) === 'confirmed').length;
  $('export-button').disabled = !platforms.length || busy;
  for (const button of document.querySelectorAll('[data-filter]')) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    button.querySelector('span').textContent = button.dataset.filter === 'all' ? platforms.length : platforms.filter(p => p.signal === button.dataset.filter).length;
  }
  const visible = getVisible();
  if (!visible.some(p => p.id === selected)) selected = visible[0]?.id || null;
  $('result-count').textContent = `${visible.length} 个平台线索`;
  $('platform-list').innerHTML = visible.length ? visible.map(platform => {
    const status = statusFor(platform.id);
    return `<button type="button" class="platform-row${selected === platform.id ? ' selected' : ''}" data-platform="${escapeHtml(platform.id)}" aria-pressed="${selected === platform.id}" aria-label="查看 ${escapeHtml(platform.name)} 的邮件证据">${icon(platform)}<span class="platform-main"><span class="platform-name-line"><span class="platform-name">${escapeHtml(platform.name)}</span><span class="badge ${platform.signal}">${signalLabels[platform.signal]}</span></span><span class="platform-domain">${escapeHtml(platform.domain)}${platform.recognized ? '' : ' · 平台待识别'}</span><span class="platform-meta">${platform.evidence.length} 封证据 · 最近 ${dateLabel(platform.lastSeen)}</span></span><span class="platform-side"><span class="review-status ${status}">${reviewLabels[status]}</span><span class="chevron" aria-hidden="true">›</span></span></button>`;
  }).join('') : `<div class="empty"><span class="empty-symbol" aria-hidden="true">⌕</span><strong>${platforms.length ? '没有符合筛选的平台' : stats.total ? '这些邮件中未发现可识别的平台线索' : '连接邮箱，开始自动盘点'}</strong><p>${platforms.length ? '试试其他关键词，或调整线索与确认状态筛选。' : stats.total ? '部分语言或邮件模板可能未被识别。未发现线索，不代表没有账号。' : '输入邮箱并授权读取，系统会自动整理历史邮件。也可以先体验示例。'}</p></div>`;
  $('coverage-summary').textContent = stats.total ? `去重后 ${Math.max(0, stats.total - stats.duplicates)} 封邮件，${stats.ignored || 0} 封未形成账号线索${stats.duplicates ? `；合并 ${stats.duplicates} 封重复邮件` : ''}。` : '尚未分析邮件。';
  renderDetail();
}
function renderDetail() {
  const platform = report.platforms.find(p => p.id === selected);
  if (!platform) {
    $('detail-panel').innerHTML = '<div class="empty"><span class="empty-symbol" aria-hidden="true">≡</span><strong>邮件是判断的依据</strong><p>选择一个平台，在这里查看相关邮件和识别原因。</p></div>';
    return;
  }
  const status = statusFor(platform.id);
  const evidence = [...platform.evidence].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  $('detail-panel').innerHTML = `<div class="detail-eyebrow"><span>线索详情 / EVIDENCE</span><span>${platform.evidence.length} 封邮件</span></div><div class="detail-platform">${icon(platform)}<div><h3>${escapeHtml(platform.name)}</h3><p>${escapeHtml(platform.domain)}${platform.recognized ? '' : ' · 未匹配平台名录'}</p></div></div><p class="detail-interpretation">${descriptions[platform.signal]}${platform.recognized ? '' : ' 该发件域名尚未识别，请自行核对平台名称。'}</p><dl class="dates"><div><dt>最早相关邮件</dt><dd>${dateLabel(platform.firstSeen)}</dd></div><div><dt>最近相关邮件</dt><dd>${dateLabel(platform.lastSeen)}</dd></div></dl><div class="evidence-heading">邮件证据 <span>发件信息未经真实性核验</span></div><div class="timeline">${evidence.map(mail => `<article class="evidence"><time${mail.date ? ` datetime="${escapeHtml(mail.date)}"` : ''}>${dateLabel(mail.date)} <span class="badge ${mail.kind}">${signalLabels[mail.kind]}</span></time><h4>${escapeHtml(mail.subject || '（无主题）')}</h4><p class="sender">发件：${escapeHtml(mail.senderEmail || mail.from)}</p><p class="reason">${escapeHtml(mail.reason)}</p><details><summary>查看正文摘录</summary><pre>${escapeHtml((mail.text || '（无可读取的文本正文）').slice(0, 1800))}${mail.text?.length > 1800 ? '\n…（摘录已截断）' : ''}</pre><p class="mail-meta">收件：${escapeHtml(mail.to || '未提供')}<br>来源：${escapeHtml(mail.fileName || '邮件文件')}</p></details></article>`).join('')}</div><div class="confirm-area"><p>${status === 'pending' ? '这个平台，你使用过吗？' : status === 'confirmed' ? '✓ 你已确认使用过' : '你已标记：与我无关'}</p><div class="confirm-actions">${status !== 'confirmed' ? '<button class="button primary" data-review="confirmed">确认使用过</button>' : ''}${status !== 'excluded' ? '<button class="button secondary" data-review="excluded">与我无关</button>' : ''}${status !== 'pending' ? '<button class="text-button" data-review="pending">恢复待确认</button>' : ''}</div><p class="confirm-note">你的确认独立于系统线索；不会登录或注销这些平台账号。${mode === 'demo' ? '当前操作仅针对虚构示例。' : ''}</p></div>`;
}
function replaceReport(next, nextMode, description, warnings = []) {
  report = next; mode = nextMode; review = new Map(); selected = null; filter = 'all';
  $('search-input').value = ''; $('review-filter').value = 'all';
  $('dataset-badge').textContent = mode === 'demo' ? '示例模式' : mode === 'empty' ? '尚未连接' : mode === 'mailbox' ? '邮箱读取' : '文件导入';
  $('dataset-badge').classList.toggle('real', mode === 'import' || mode === 'mailbox');
  $('dataset-description').textContent = description;
  const uniqueWarnings = [...new Set(warnings)];
  showNotice(uniqueWarnings.slice(0, 5).join('；') + (uniqueWarnings.length > 5 ? `；另有 ${uniqueWarnings.length - 5} 项提示，请分批导入检查。` : ''));
  render();
}
function loadDemo() {
  const parsed = parseMailFile(demoMbox, '拾迹虚构示例.mbox');
  replaceReport(analyzeMessages(parsed.messages), 'demo', '以下为虚构邮件，连接邮箱后替换为你的分析结果。', parsed.warnings);
}
function setBusy(nextBusy) {
  busy = nextBusy;
  $('progress').hidden = !busy;
  for (const id of ['demo-button', 'import-button', 'help-import', 'connect-button', 'authorize-button', 'mailbox-email']) $(id).disabled = busy;
  $('file-input').disabled = busy;
  $('export-button').disabled = busy || !report.platforms.length;
  $('drop-zone').setAttribute('aria-busy', String(busy));
}
function cancelImport() {
  job++; worker?.terminate(); worker = null;
  if (mailbox?.active) mailbox.cancel();
  setBusy(false);
}
function analyzeInputs(inputs, currentJob, options) {
  worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (currentJob !== job) return;
    if (data.type === 'progress') {
      $('progress-text').textContent = `正在识别平台线索：${data.current} / ${data.total} 份邮件…`;
      return;
    }
    worker?.terminate(); worker = null; setBusy(false);
    if (data.type === 'error') return showNotice(`无法分析邮件：${data.message} 本次结果未更改。`, true);
    if (!data.report.stats.total && !options.allowEmpty) return showNotice(`没有读到有效邮件。${data.warnings.slice(0, 3).join('；')} 本次结果未更改。`, true);
    replaceReport(data.report, options.mode, options.description, [...(options.warnings || []), ...data.warnings]);
  };
  worker.onerror = () => {
    if (currentJob !== job) return;
    worker?.terminate(); worker = null; setBusy(false);
    showNotice('邮件分析未完成，请重试或减少本次读取数量。本次结果未更改。', true);
  };
  worker.postMessage({ files: inputs }, inputs.map(file => file.buffer));
}
async function importFiles(fileList) {
  if (worker || $('file-input').disabled) return;
  const files = [...fileList];
  if (!files.length) return;
  if (files.length > 200) return showNotice('每批最多选择 200 个文件，请分批导入。每次会替换结果，分批请分别导出。', true);
  if (files.some(file => !/\.(eml|mbox)$/i.test(file.name))) return showNotice('请选择 .eml 或 .mbox 邮件文件；压缩包和其他格式暂不支持。本次结果未更改。', true);
  if (files.reduce((size, file) => size + file.size, 0) > 25 * 1024 * 1024) return showNotice('这批邮件超过 25 MB，请拆分文件或减少数量后重试。分批请分别导出，每次导入会替换结果。本次结果未更改。', true);
  if (files.every(file => file.size === 0)) return showNotice('选择的文件没有内容，请重新选择。本次结果未更改。', true);
  const currentJob = ++job;
  setBusy(true); showNotice(''); $('progress-text').textContent = '正在读取本地邮件文件…';
  try {
    const inputs = [];
    for (const file of files) {
      inputs.push({ name: file.name, buffer: await file.arrayBuffer() });
      if (currentJob !== job) return;
    }
    analyzeInputs(inputs, currentJob, { mode: 'import', description: `${files.length} 个本地文件 · 本次导入已替换之前的结果，刷新后清除。` });
  } catch {
    if (currentJob !== job) return;
    worker?.terminate(); worker = null; setBusy(false);
    showNotice('无法读取所选文件，请重新选择。本次结果未更改。', true);
  } finally { $('file-input').value = ''; }
}
function download(contents, type, name) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
function exportReport() {
  const rows = [['数据类型', '平台', '发件域名', '系统线索', '用户确认', '最早相关邮件（非注册时间）', '最近相关邮件', '证据邮件数', '邮件主题与识别依据']];
  for (const platform of report.platforms) rows.push([mode === 'demo' ? '虚构示例' : mode === 'mailbox' ? '邮箱自动读取' : '本地导入', platform.name, platform.domain, signalLabels[platform.signal], reviewLabels[statusFor(platform.id)], dateLabel(platform.firstSeen), dateLabel(platform.lastSeen), platform.evidence.length, platform.evidence.map(mail => `${mail.subject}：${mail.reason}`).join(' | ')]);
  download('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8', `拾迹-${mode === 'demo' ? '示例-' : ''}平台线索-${new Date().toISOString().slice(0, 10)}.csv`);
  showNotice('已导出全部平台线索及确认状态（不受当前筛选影响）；导出文件不包含完整邮件正文。');
}

$('platform-list').addEventListener('click', event => {
  const button = event.target.closest('[data-platform]');
  if (!button) return;
  selected = button.dataset.platform;
  const scroll = $('platform-list').scrollTop;
  render(); $('platform-list').scrollTop = scroll;
  const active = [...document.querySelectorAll('[data-platform]')].find(el => el.dataset.platform === selected);
  active?.focus({ preventScroll: true });
  if (matchMedia('(max-width:720px)').matches) $('detail-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('detail-panel').addEventListener('click', event => {
  const button = event.target.closest('[data-review]');
  if (!button || !selected) return;
  const state = button.dataset.review, current = selected;
  review.set(selected, state); render();
  const name = report.platforms.find(p => p.id === current)?.name || '';
  showNotice(`已将 ${name} 标记为“${reviewLabels[state]}”。${mode === 'demo' ? '这是虚构示例中的操作。' : '确认状态仅保留至本次页面关闭或刷新。'}`);
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; render(); }));
$('search-input').addEventListener('input', render);
$('review-filter').addEventListener('change', render);
$('demo-button').addEventListener('click', loadDemo);
$('import-button').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', event => { const files = [...event.target.files]; event.target.value = ''; importFiles(files); });
$('cancel-button').addEventListener('click', () => { const wasConnected = mailbox?.active; cancelImport(); showNotice(wasConnected ? '已请求停止读取，邮箱连接正在释放。之前的结果保持不变。' : '已停止本次分析，之前的结果保持不变。'); });
$('clear-button').addEventListener('click', () => { cancelImport(); replaceReport({ platforms: [], stats: { total: 0, duplicates: 0, ignored: 0 } }, 'empty', '本次邮件和确认记录已清除。可以连接邮箱开始新盘点。'); });
$('export-button').addEventListener('click', exportReport);
$('download-example').addEventListener('click', () => download(demoMbox, 'application/mbox;charset=utf-8', '拾迹虚构示例.mbox'));
$('help-button').addEventListener('click', () => $('help-dialog').showModal());
$('rules-button').addEventListener('click', () => $('rules-dialog').showModal());
$('help-import').addEventListener('click', () => { $('help-dialog').close(); $('file-input').click(); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
for (const name of ['dragenter', 'dragover']) $('drop-zone').addEventListener(name, event => { event.preventDefault(); $('drop-zone').classList.add('dragover'); });
$('drop-zone').addEventListener('dragleave', event => { if (!$('drop-zone').contains(event.relatedTarget)) $('drop-zone').classList.remove('dragover'); });
$('drop-zone').addEventListener('drop', event => { event.preventDefault(); $('drop-zone').classList.remove('dragover'); importFiles(event.dataTransfer.files); });
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
replaceReport(report, 'empty', '连接你的邮箱后，这里会显示真实分析结果。');
mailbox = initializeConnection({
  onStart() { setBusy(true); showNotice(''); $('progress-text').textContent = '正在连接邮箱…'; },
  onProgress(message) { $('progress-text').textContent = message; },
  onError(message) { setBusy(false); showNotice(message, true); },
  onCancelled() { setBusy(false); showNotice('读取已停止，之前的分析结果保持不变。'); },
  onResult(result) {
    try {
      const inputs = (result.messages || []).map(message => {
        const raw = atob(message.raw);
        const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
        return { name: message.fileName, buffer: bytes.buffer };
      });
      setBusy(true);
      analyzeInputs(inputs, ++job, { mode: 'mailbox', allowEmpty: true, warnings: result.warnings || [], description: `${result.email} · 收件箱，本次检查 ${result.scanned || 0} 封，跳过 ${result.skipped || 0} 封 · 连接已断开` });
    } catch {
      setBusy(false); showNotice('读取结果无法解析，请重试；之前的分析结果保持不变。', true);
    }
  }
});
