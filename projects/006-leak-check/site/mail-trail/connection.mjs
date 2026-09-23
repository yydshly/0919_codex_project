// Credentials are sent only to the same-origin loopback service and kept out of URLs/storage.
export function initializeConnection(hooks) {
  const $ = id => document.getElementById(id);
  let config = null, currentJob = null, active = false, generation = 0, controller = null;
  const api = '/api/mail-trail/';
  const statusText = text => { $('connection-status').textContent = text; };
  const connectionError = text => { $('connect-error').textContent = text; $('connect-error').hidden = !text; };
  async function request(path, options = {}) {
    const response = await fetch(api + path, { cache: 'no-store', credentials: 'same-origin', ...options, headers: { ...(config?.token ? { 'X-MailTrail-Token': config.token } : {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
    let data;
    try { data = await response.json(); } catch { throw new Error('本机邮箱连接服务未启动。当前可以体验示例或导入邮件文件。'); }
    if (!response.ok) throw new Error(data.error || '邮箱连接未完成，请检查授权和连接服务。');
    return data;
  }
  async function discover() {
    if (!['127.0.0.1', 'localhost'].includes(location.hostname)) {
      statusText('自动连接需使用本机版本；当前页面可体验示例或导入文件。');
      return false;
    }
    try {
      const response = await request('config');
      if (!response.token || !Array.isArray(response.providers)) throw new Error('连接服务暂不可用。');
      config = response;
      statusText('连接服务已就绪 · 授权后自动读取，无需导出邮件');
      return true;
    } catch {
      config = null;
      statusText('本机连接服务未启动；当前可体验示例或导入文件。');
      return false;
    }
  }
  async function cleanup(jobId) {
    if (!jobId || !config) return;
    try { await request('cancel', { method: 'POST', body: JSON.stringify({ jobId }) }); } catch { /* The service also expires unfinished jobs. */ }
  }
  async function cancel() {
    const cancellingGeneration = ++generation;
    active = false; controller?.abort(); controller = null;
    const id = currentJob; currentJob = null;
    $('authorization-code').value = '';
    statusText('正在停止读取并释放邮箱连接…');
    if (id) await cleanup(id);
    if (cancellingGeneration === generation) statusText('已请求停止读取，连接正在释放；稍后可重新授权盘点。');
  }
  $('email-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (active) return;
    const email = $('mailbox-email').value.trim();
    const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
    if (['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) {
      hooks.onError('Gmail / Outlook 需要邮箱官方的授权登录。目前尚未配置这两种接入，不能用密码或授权码代替。当前可连接 QQ / 网易邮箱。');
      return;
    }
    if (!config && !await discover()) {
      hooks.onError('本机邮箱连接服务尚未启动，当前无法自动读取。请启动产品的本机服务后重试；文件导入仍可使用。');
      return;
    }
    const provider = config.providers.find(item => item.available && item.domains.includes(domain));
    if (!provider) { hooks.onError('这个邮箱服务尚未接入。当前自动连接支持 QQ、163、126 与 yeah 邮箱。'); return; }
    $('connect-account').textContent = `${provider.name} · ${email}`;
    $('provider-help').href = ['qq.com', 'foxmail.com'].includes(domain) ? 'https://help.mail.qq.com/detail/106/985' : 'https://help.mail.163.com/';
    connectionError(''); $('authorization-code').value = '';
    $('connect-dialog').showModal();
  });
  $('connect-dialog').addEventListener('cancel', () => { $('authorization-code').value = ''; });
  $('connect-dialog').addEventListener('close', () => { $('authorization-code').value = ''; });
  $('authorization-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (active) return;
    const email = $('mailbox-email').value.trim();
    let authorizationCode = $('authorization-code').value.trim();
    if (!authorizationCode) return connectionError('请先填写邮箱提供的客户端授权码。');
    const thisGeneration = ++generation;
    active = true; controller = new AbortController();
    hooks.onStart(); connectionError('');
    statusText('正在授权并连接邮箱…');
    try {
      // Close immediately so the sensitive input is cleared regardless of request outcome.
      const pending = request('scan', { method: 'POST', body: JSON.stringify({ email, authorizationCode, limit: Number($('scan-limit').value) }) });
      authorizationCode = ''; $('authorization-code').value = ''; $('connect-dialog').close();
      const started = await pending;
      if (thisGeneration !== generation) { await cleanup(started.jobId); return; }
      currentJob = started.jobId;
      if (!currentJob) throw new Error('连接服务没有返回读取任务，请重试。');
      while (thisGeneration === generation) {
        const result = await request(`status?jobId=${encodeURIComponent(currentJob)}`, { signal: controller.signal });
        if (thisGeneration !== generation) return;
        if (result.status === 'failed') throw new Error(result.error || '邮箱授权失败，请检查 IMAP 是否开启及授权码是否有效。');
        if (result.status === 'cancelled') { hooks.onCancelled(); return; }
        if (result.status === 'complete') {
          active = false;
          statusText('读取已完成，邮箱连接已断开。结果在本机内存中处理，不写入文件。');
          hooks.onResult(result);
          return;
        }
        const progress = result.total ? `正在读取收件箱：${result.scanned || 0} / ${result.total} 封${result.skipped ? `，跳过 ${result.skipped} 封` : ''}` : '正在连接邮箱并读取收件箱列表…';
        statusText(progress); hooks.onProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    } catch (error) {
      if (thisGeneration !== generation) return;
      statusText('连接未完成；已有分析结果保持不变。');
      hooks.onError(error.name === 'AbortError' ? '已取消邮箱连接。' : error.message || '邮箱连接失败，请稍后重试。');
    } finally {
      if (thisGeneration === generation) {
        active = false;
        const id = currentJob; currentJob = null; controller = null;
        await cleanup(id);
      }
    }
  });
  window.addEventListener('pagehide', () => {
    if (currentJob && config) fetch(api + 'cancel', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-MailTrail-Token': config.token }, body: JSON.stringify({ jobId: currentJob }), keepalive: true }).catch(() => {});
  });
  discover();
  return { cancel, get active() { return active; } };
}
