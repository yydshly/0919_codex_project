const $ = selector => document.querySelector(selector);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
let currentState = null;
let backup = null;
let preview = null;
let undoStatus = { available: false, undoId: null, demo: false };
let busy = false;
let selectionGeneration = 0;

function element(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = String(text);
  return item;
}

async function api(path, method = 'GET', body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    const error = new Error('连接中断，尚未确认操作结果。请重新读取当前记录，再继续操作。');
    error.uncertain = true;
    throw error;
  }
  let payload;
  try { payload = await response.json(); }
  catch {
    const error = new Error('未能读取服务响应，请重新读取当前记录。');
    error.uncertain = true;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(payload.error || '操作失败，所选文件已保留，请稍后重试。');
    error.status = response.status;
    throw error;
  }
  return payload;
}

function message(text = '', error = false) {
  const target = $(error ? '#restore-error' : '#restore-notice');
  target.textContent = text;
  target.hidden = !text;
}

function clearMessages() {
  message();
  message('', true);
}

function setStep(index) {
  ['#step-select', '#step-preview', '#step-confirm'].forEach((selector, position) => {
    const item = $(selector);
    item.classList.toggle('complete', position < index);
    if (position === index) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}

function updateControls() {
  $('#backup-file').disabled = busy;
  $('#demo-load').disabled = busy;
  $('#preview-backup').disabled = busy || !backup || !currentState;
  $('#confirm-replace').disabled = busy || !preview;
  $('#apply-backup').disabled = busy || !preview || !$('#confirm-replace').checked;
  $('#cancel-preview').disabled = busy;
  $('#refresh-current').disabled = busy;
  $('#undo-restore').disabled = busy || !undoStatus.available;
  $('#undo-confirm').disabled = busy || !undoStatus.available;
  $('#undo-cancel').disabled = busy;
}

function setBusy(value, button) {
  busy = value;
  updateControls();
  if (button) button.setAttribute('aria-busy', String(value));
}

function invalidatePreview() {
  preview = null;
  $('#confirm-replace').checked = false;
  $('#preview-section').hidden = true;
  setStep(0);
  updateControls();
}

function summarize(state) {
  return {
    name: state.settings.name,
    notes: state.projects.filter(project => typeof project.note === 'string' && project.note.trim()).length,
    tasks: state.tasks.length
  };
}

function specKitNote(state) {
  const known = currentState?.projects?.find(item => /spec[-\s]?kit/i.test(item.id));
  const project = state?.projects?.find(item => item.id === known?.id);
  return project?.note || '还没有填写个人结论。';
}

function countItem(count, label) {
  const item = element('div');
  item.append(element('strong', '', count), element('span', '', label));
  return item;
}

function renderCurrent() {
  const summary = summarize(currentState);
  $('#current-name').textContent = summary.name;
  $('#current-counts').replaceChildren(countItem(summary.notes, '条个人结论'), countItem(summary.tasks, '项全部任务'));
  $('#current-note').textContent = specKitNote(currentState);
}

function renderStatus(status) {
  undoStatus = status;
  $('#demo-banner').hidden = !status.demo;
  $('#demo-load').hidden = !status.demo;
  $('.space-label').textContent = status.demo ? '独立演示空间' : '我的工作空间';
  $('#undo-status').textContent = status.available
    ? '最近一次恢复可以撤销。撤销后，回到该次恢复前的个人记录。'
    : '当前没有可撤销的恢复；未曾恢复、已经撤销或之后有新编辑时，均不可撤销。';
  updateControls();
}

function comparisonSide(label, summary, state, incoming) {
  const card = element('article', 'comparison-side' + (incoming ? ' incoming' : ''));
  const counts = element('div', 'comparison-counts');
  counts.append(countItem(summary.notes, '条个人结论'), countItem(summary.tasks, '项全部任务'));
  const note = element('div', 'comparison-note');
  note.append(element('span', '', 'Spec Kit · 个人结论'), element('p', '', specKitNote(state)));
  card.append(element('p', 'comparison-label', label), element('h3', '', summary.name), counts, note);
  return card;
}

function renderComparison(target, before, after, beforeSummary, afterSummary, labels) {
  target.replaceChildren(
    comparisonSide(labels[0], beforeSummary || summarize(before), before, false),
    comparisonSide(labels[1], afterSummary || summarize(after), after, true)
  );
}

function validateFileBackup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('备份必须是一个完整的 JSON 对象。所选文件已保留。');
  if (Array.isArray(value.tasks) && value.tasks.length > 1000) throw new Error('备份最多支持 1,000 项任务，当前文件超出限制。所选文件已保留。');
  return value;
}

async function readFile() {
  const generation = ++selectionGeneration;
  const file = $('#backup-file').files[0];
  backup = null;
  invalidatePreview();
  clearMessages();
  $('#result-section').hidden = true;
  if (!file) { $('#file-summary').textContent = '尚未选择备份。'; return; }
  $('#file-summary').textContent = file.name + ' · ' + (file.size / 1024).toFixed(1) + ' KiB';
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error('文件超过 5 MiB，无法预览。请使用大小符合限制的完整备份。');
    const content = await file.text();
    if (generation !== selectionGeneration) return;
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { throw new Error('文件不是有效的 JSON 备份，未修改任何记录。请检查文件内容或选择其他备份。'); }
    backup = validateFileBackup(parsed);
    $('#file-summary').textContent += ' · 已选择，请预览核对内容。';
  } catch (error) {
    if (generation !== selectionGeneration) return;
    message(error.message, true);
  }
  updateControls();
}

async function refreshCurrent() {
  const [state, status] = await Promise.all([api('/api/state'), api('/api/restore/status')]);
  currentState = state;
  renderCurrent();
  renderStatus(status);
}

$('#backup-file').addEventListener('change', readFile);
$('#confirm-replace').addEventListener('change', () => {
  setStep($('#confirm-replace').checked ? 2 : 1);
  updateControls();
});

$('#demo-load').addEventListener('click', async () => {
  const button = $('#demo-load');
  clearMessages();
  invalidatePreview();
  $('#result-section').hidden = true;
  setBusy(true, button);
  try {
    const selected = validateFileBackup(await api('/api/demo-backup'));
    selectionGeneration++;
    backup = selected;
    $('#backup-file').value = '';
    $('#file-summary').textContent = '独立演示备份 · 已加载，请点击“预览备份”查看与当前演示记录的差异。';
    message('示例已加载。当前演示数据尚未改变。');
  } catch (error) { message(error.message, true); }
  finally { setBusy(false, button); }
});

$('#preview-backup').addEventListener('click', async () => {
  if (!backup) return;
  const button = $('#preview-backup');
  clearMessages();
  invalidatePreview();
  $('#result-section').hidden = true;
  setBusy(true, button);
  try {
    const result = await api('/api/restore/preview', 'POST', { backup });
    const state = await api('/api/state');
    if (state.revision !== result.revision) {
      const error = new Error('当前记录刚刚发生变化，请点击“预览备份”重新核对。未修改任何记录。');
      error.status = 409;
      throw error;
    }
    currentState = state;
    renderCurrent();
    preview = result;
    renderComparison($('#preview-comparison'), state, backup, result.current, result.incoming, ['当前记录 · 恢复前', '备份内容 · 恢复后']);
    $('#preview-section').hidden = false;
    setStep(1);
    message('预览完成，当前记录尚未改变。核对替换范围后，再勾选确认。');
    $('#preview-title').focus();
  } catch (error) {
    invalidatePreview();
    message(error.message, true);
  } finally { setBusy(false, button); }
});

$('#cancel-preview').addEventListener('click', () => {
  invalidatePreview();
  clearMessages();
  message('已取消预览，当前记录没有改变。所选备份已保留。');
  $('#preview-backup').focus();
});

$('#apply-backup').addEventListener('click', async () => {
  if (!preview || !backup || !$('#confirm-replace').checked) return;
  const button = $('#apply-backup');
  const before = currentState;
  const request = { backup, revision: preview.revision, digest: preview.digest, confirmed: true };
  clearMessages();
  setBusy(true, button);
  try {
    const result = await api('/api/restore/apply', 'POST', request);
    currentState = result.state;
    renderCurrent();
    renderStatus({ ...undoStatus, available: true, undoId: result.undoId });
    invalidatePreview();
    setStep(3);
    $('#result-title').textContent = '恢复成功，记录已找回';
    $('#result-copy').textContent = '空间配置、个人结论、跟进状态和全部任务已一并恢复。原始研究目录和来源保持原样。';
    renderComparison($('#result-comparison'), before, currentState, null, null, ['恢复前', '当前记录 · 已恢复']);
    $('#result-section').hidden = false;
    message('恢复成功。若之后没有新编辑，可以撤销最近一次恢复。');
    $('#result-title').focus();
  } catch (error) {
    if (error.status === 409 || error.uncertain) invalidatePreview();
    message(error.status === 409 ? error.message + ' 所选备份已保留，请点击“预览备份”重新核对。' : error.message, true);
  } finally { setBusy(false, button); }
});

$('#refresh-current').addEventListener('click', async () => {
  const button = $('#refresh-current');
  clearMessages();
  invalidatePreview();
  setBusy(true, button);
  try {
    await refreshCurrent();
    $('#result-section').hidden = true;
    message('已读取最新记录。所选备份已保留，恢复前请重新预览。');
  } catch (error) { message(error.message, true); }
  finally { setBusy(false, button); }
});

$('#undo-restore').addEventListener('click', () => {
  if (!undoStatus.available) return;
  $('#undo-error').textContent = '';
  $('#undo-dialog').showModal();
});
$('#undo-cancel').addEventListener('click', () => $('#undo-dialog').close());
$('#undo-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('#undo-confirm').addEventListener('click', async () => {
  if (!undoStatus.available) return;
  const button = $('#undo-confirm');
  const before = currentState;
  $('#undo-error').textContent = '';
  clearMessages();
  setBusy(true, button);
  try {
    const result = await api('/api/restore/undo', 'POST', { undoId: undoStatus.undoId, confirmed: true });
    currentState = result.state;
    renderCurrent();
    renderStatus({ ...undoStatus, available: false, undoId: null });
    invalidatePreview();
    $('#undo-dialog').close();
    $('#result-title').textContent = '已撤销，回到恢复前的记录';
    $('#result-copy').textContent = '空间配置、个人结论、跟进状态和全部任务已回到最近一次恢复之前。这次撤销已完成，不可重复执行。';
    renderComparison($('#result-comparison'), before, currentState, null, null, ['撤销前', '当前记录 · 已撤销']);
    $('#result-section').hidden = false;
    message('已撤销最近一次恢复。');
    $('#result-title').focus();
  } catch (error) {
    if (error.status === 409 || error.uncertain) {
      invalidatePreview();
      renderStatus({ ...undoStatus, available: false, undoId: null });
      $('#undo-dialog').close();
      message(error.message + (error.status === 409 ? ' 请重新读取当前记录；未覆盖新的编辑。' : ' 请重新读取当前记录，确认撤销结果。'), true);
    } else $('#undo-error').textContent = error.message;
  } finally { setBusy(false, button); }
});

setBusy(true);
try { await refreshCurrent(); }
catch (error) {
  $('#current-name').textContent = '暂时无法读取空间';
  $('#current-note').textContent = '重新读取后，可查看当前结论。';
  $('#undo-status').textContent = '尚未获取撤销状态，请重新读取当前记录。';
  message(error.message, true);
} finally { setBusy(false); }
