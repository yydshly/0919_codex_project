/* Real browser acceptance against a dedicated subprocess and temporary SQLite file. */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {spawn} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'evidence', 'restore');

function personal(state) {
  return {
    settings: Object.fromEntries(['name', 'goal', 'focus', 'view', 'configured'].map(k => [k, state.settings[k]])),
    projects: [...state.projects].sort((a, b) => a.id.localeCompare(b.id)).map(p => ({id: p.id, note: p.note, status: p.status})),
    tasks: state.tasks.map(t => Object.fromEntries(['id', 'projectId', 'title', 'due', 'done'].map(k => [k, t[k]]))),
  };
}

function metadata(state) {
  return state.projects.map(p => Object.fromEntries(Object.entries(p).filter(([key]) => !['note', 'status', 'version'].includes(key))));
}

(async () => {
  fs.mkdirSync(output, {recursive: true});
  const temporaryRoot = path.resolve(os.tmpdir());
  const temporary = fs.mkdtempSync(path.join(temporaryRoot, 'speckit-restore-'));
  const backupFile = path.join(temporary, 'exported-a.json');
  fs.writeFileSync(backupFile, '{}', 'utf8');
  const port = await new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const selected = listener.address().port;
      listener.close(() => resolve(selected));
    });
  });
  const base = 'http://127.0.0.1:' + port;
  const child = spawn(process.env.PYTHON_BIN || 'python', [
    path.join(root, 'app', 'server.py'), '--port', String(port),
    '--db', path.join(temporary, 'restore.sqlite3'), '--demo-backup', backupFile,
  ], {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
  let serverError = '';
  child.stderr.on('data', chunk => { serverError = (serverError + chunk.toString()).slice(-12000); });
  child.on('error', error => { serverError = error.message; });
  let browser;
  const checks = [];
  const pageErrors = [];
  const screenshots = [];
  let backupA, stateB, page;

  async function check(id, title, action) {
    try {
      const evidence = await action();
      checks.push({id, title, status: 'passed', ...(evidence ? {evidence} : {})});
    } catch (error) {
      checks.push({id, title, status: 'failed', error: error.message, detail: error.stack});
      throw error;
    }
  }

  async function request(route, method = 'GET', body) {
    const response = await fetch(base + route, {
      method, headers: {'Content-Type': 'application/json', Origin: base},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`${method} ${route}: non-JSON response ${response.status}: ${text.slice(0, 160)}`); }
    return {status: response.status, data};
  }

  async function successful(route, method = 'GET', body) {
    const result = await request(route, method, body);
    assert.ok(result.status >= 200 && result.status < 300, `${method} ${route}: ${result.status} ${JSON.stringify(result.data)}`);
    return result.data;
  }

  const readState = () => successful('/api/state');

  async function waitForText(selector, text) {
    await page.waitForFunction(({selector, text}) => document.querySelector(selector)?.textContent === text, {selector, text});
  }

  async function previewSelected() {
    await page.locator('#preview-backup').click();
    await page.locator('#preview-section').waitFor({state: 'visible'});
    assert.match(await page.locator('#preview-comparison').textContent(), /A版/);
  }

  async function submitAndWait(button, endpoint, expectedStatus) {
    const responsePromise = page.waitForResponse(response => response.url() === base + endpoint && response.request().method() === 'POST');
    await page.locator(button).click();
    const response = await responsePromise;
    assert.equal(response.status(), expectedStatus, `${endpoint} returned ${response.status()}: ${await response.text()}`);
    return response.json();
  }

  try {
    await check('SETUP', '真实独立服务启动，A版由API导出后再修改为B版', async () => {
      let ready = false;
      for (let attempt = 0; attempt < 120; attempt++) {
        if (child.exitCode !== null || serverError.includes('ENOENT')) break;
        try {
          if ((await fetch(base + '/api/state')).ok) { ready = true; break; }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 80));
      }
      assert.ok(ready, 'Temporary server did not start: ' + serverError);
      const initial = await readState();
      const project = initial.projects.find(item => item.id === '014-spec-kit');
      assert.ok(project, 'Real catalog must contain Spec Kit');
      await successful('/api/settings', 'PUT', {
        ...initial.settings, name: 'A版 · 备份里的研究空间', goal: '把研究目标写进可恢复的个人备份',
        focus: ['AI 编程'], view: 'focus', configured: true,
      });
      await successful('/api/projects/' + project.id, 'PUT', {
        version: project.version, note: 'A版：先约定恢复规则，再验证。\n<script>window.restoreInjected = true</script>', status: 'active',
      });
      const task = await successful('/api/tasks', 'POST', {projectId: project.id, title: 'A版：检查恢复结果', due: '2026-10-01'});
      backupA = await successful('/api/export.json');
      assert.equal(backupA.schemaVersion, 1);
      assert.equal(backupA.projects.length, 16);
      fs.writeFileSync(backupFile, JSON.stringify(backupA, null, 2), 'utf8');
      const current = await readState();
      await successful('/api/settings', 'PUT', {
        ...current.settings, name: 'B版 · 当前正在使用的空间', goal: '这是导出之后的新目标', focus: [], view: 'all',
      });
      const currentProject = current.projects.find(item => item.id === project.id);
      await successful('/api/projects/' + project.id, 'PUT', {
        version: currentProject.version, note: 'B版：记录了导出之后的新判断，恢复前要先核对。', status: 'decided',
      });
      await successful('/api/tasks/' + task.id, 'PUT', {version: task.version, done: true});
      await successful('/api/tasks', 'POST', {projectId: project.id, title: '仅B版存在：保留当前工作线索', due: ''});
      stateB = await readState();
      assert.equal(stateB.tasks.length, 2);
      browser = await chromium.launch({headless: true});
      page = await browser.newPage({viewport: {width: 1440, height: 1050}});
      page.setDefaultTimeout(12000);
      page.on('pageerror', error => pageErrors.push(error.message));
    });

    await check('CURRENT', '恢复页真实显示当前B版并标明独立演示空间', async () => {
      await page.goto(base + '/restore');
      await waitForText('#current-name', stateB.settings.name);
      await page.locator('#demo-load').waitFor({state: 'visible'});
      assert.match(await page.locator('#current-note').textContent(), /B版/);
      assert.match(await page.locator('#demo-banner').textContent(), /演示/);
      assert.equal(await page.locator('#apply-backup').isEnabled(), false);
      assert.equal(await page.locator('#undo-restore').isEnabled(), false);
      assert.deepEqual(await readState(), stateB);
    });

    await check('PREVIEW', '加载真实A版备份并预览，数据库仍为B版且文字不执行脚本', async () => {
      await page.locator('#demo-load').click();
      await previewSelected();
      const comparison = await page.locator('#preview-comparison').textContent();
      assert.ok(comparison.includes(backupA.settings.name));
      assert.ok(comparison.includes(stateB.settings.name));
      assert.ok(comparison.includes('<script>window.restoreInjected = true</script>'));
      assert.equal(await page.locator('#preview-comparison script').count(), 0);
      assert.equal(await page.evaluate(() => window.restoreInjected), undefined);
      assert.deepEqual(await readState(), stateB);
    });

    await check('TRUSTED-PROJECT', '伪造其他项目名称不能冒充预览中的Spec Kit个人结论', async () => {
      const forged = structuredClone(backupA);
      const unrelated = forged.projects.find(item => item.id !== '014-spec-kit');
      unrelated.name = 'Spec Kit · 伪造的其他项目名称';
      unrelated.note = '错误项目结论';
      await page.locator('#backup-file').setInputFiles({
        name: 'forged-metadata.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(forged)),
      });
      await previewSelected();
      const expectedNote = backupA.projects.find(item => item.id === '014-spec-kit').note;
      assert.equal(await page.locator('#preview-comparison .incoming .comparison-note p').textContent(), expectedNote);
      assert.ok(!(await page.locator('#preview-comparison .incoming .comparison-note').textContent()).includes('错误项目结论'));
      assert.deepEqual(await readState(), stateB);
      await page.locator('#demo-load').click();
      await previewSelected();
    });

    await check('CONFIRM', '确认复选框控制提交，键盘可勾选和取消且尚未写入', async () => {
      const confirmation = page.locator('#confirm-replace');
      assert.equal(await confirmation.isChecked(), false);
      assert.equal(await page.locator('#apply-backup').isEnabled(), false);
      await confirmation.focus();
      await page.keyboard.press('Space');
      assert.equal(await confirmation.isChecked(), true);
      assert.equal(await page.locator('#apply-backup').isEnabled(), true);
      await page.keyboard.press('Space');
      assert.equal(await confirmation.isChecked(), false);
      assert.equal(await page.locator('#apply-backup').isEnabled(), false);
      assert.deepEqual(await readState(), stateB);
    });

    await check('LAYOUT', '1440px桌面与390px手机预览均无整页横向溢出', async () => {
      for (const width of [1440, 390]) {
        await page.setViewportSize({width, height: width === 1440 ? 1050 : 844});
        await page.evaluate(() => window.scrollTo(0, 0));
        const dimensions = await page.evaluate(() => ({viewport: innerWidth, content: document.documentElement.scrollWidth}));
        assert.ok(dimensions.content <= dimensions.viewport, JSON.stringify(dimensions));
        const filename = width === 1440 ? 'restore-desktop.png' : 'restore-mobile.png';
        await page.screenshot({path: path.join(output, filename), fullPage: true});
        screenshots.push('evidence/restore/' + filename);
      }
      await page.setViewportSize({width: 1440, height: 1050});
    });

    await check('CANCEL', '取消预览清除确认状态且不改变当前B版', async () => {
      await page.locator('#confirm-replace').check();
      await page.locator('#cancel-preview').click();
      await page.locator('#preview-section').waitFor({state: 'hidden'});
      assert.equal(await page.locator('#confirm-replace').isChecked(), false);
      assert.equal(await page.locator('#apply-backup').isEnabled(), false);
      assert.deepEqual(await readState(), stateB);
    });

    await check('RESTORE', '明确确认后真实恢复A版，替换任务并保留全部目录事实', async () => {
      await previewSelected();
      await page.locator('#confirm-replace').check();
      await submitAndWait('#apply-backup', '/api/restore/apply', 200);
      await waitForText('#current-name', backupA.settings.name);
      await page.locator('#result-section').waitFor({state: 'visible'});
      assert.match(await page.locator('#result-title').textContent(), /恢复成功/);
      const state = await readState();
      assert.deepEqual(personal(state), personal(backupA));
      assert.deepEqual(metadata(state), metadata(stateB));
      assert.equal(state.tasks.length, 1);
      assert.ok(state.revision > stateB.revision);
      assert.equal((await successful('/api/restore/status')).available, true);
      await page.reload();
      await waitForText('#current-name', backupA.settings.name);
      assert.equal(await page.locator('#undo-restore').isEnabled(), true);
    });

    await check('UNDO', '撤销弹窗可取消，确认后真实回到B版且不可重复撤销', async () => {
      const restored = await readState();
      await page.locator('#undo-restore').click();
      await page.locator('#undo-dialog').waitFor({state: 'visible'});
      await page.locator('#undo-cancel').click();
      await page.locator('#undo-dialog').waitFor({state: 'hidden'});
      assert.deepEqual(await readState(), restored);
      await page.locator('#undo-restore').click();
      await submitAndWait('#undo-confirm', '/api/restore/undo', 200);
      await waitForText('#current-name', stateB.settings.name);
      assert.deepEqual(personal(await readState()), personal(stateB));
      assert.equal((await successful('/api/restore/status')).available, false);
      assert.equal(await page.locator('#undo-restore').isEnabled(), false);
      await page.reload();
      await waitForText('#current-name', stateB.settings.name);
    });

    await check('HTTP-SIZE', '精确5MiB备份连同请求信封可预览恢复撤销，多1字节返回413', async () => {
      const before = await readState();
      const limit = 5 * 1024 * 1024;
      const boundary = structuredClone(backupA);
      boundary.padding = '';
      boundary.padding = 'x'.repeat(limit - Buffer.byteLength(JSON.stringify(boundary), 'utf8'));
      const backupBytes = Buffer.byteLength(JSON.stringify(boundary), 'utf8');
      assert.equal(backupBytes, limit);
      const previewRequest = {backup: boundary};
      const previewBytes = Buffer.byteLength(JSON.stringify(previewRequest), 'utf8');
      assert.ok(previewBytes > limit);
      const preview = await request('/api/restore/preview', 'POST', previewRequest);
      assert.equal(preview.status, 200, JSON.stringify(preview.data));
      assert.deepEqual(await readState(), before);
      const applyRequest = {backup: boundary, revision: preview.data.revision, digest: preview.data.digest, confirmed: true};
      const applyBytes = Buffer.byteLength(JSON.stringify(applyRequest), 'utf8');
      assert.ok(applyBytes > limit && applyBytes <= limit + 1024);
      const applied = await request('/api/restore/apply', 'POST', applyRequest);
      assert.equal(applied.status, 200, JSON.stringify(applied.data));
      assert.deepEqual(personal(await readState()), personal(backupA));
      const undone = await request('/api/restore/undo', 'POST', {undoId: applied.data.undoId, confirmed: true});
      assert.equal(undone.status, 200, JSON.stringify(undone.data));
      const afterUndo = await readState();
      assert.deepEqual(personal(afterUndo), personal(before));
      assert.deepEqual(metadata(afterUndo), metadata(before));
      boundary.padding += 'x';
      assert.equal(Buffer.byteLength(JSON.stringify(boundary), 'utf8'), limit + 1);
      const oversized = await request('/api/restore/preview', 'POST', {backup: boundary});
      assert.equal(oversized.status, 413, JSON.stringify(oversized.data));
      assert.deepEqual(await readState(), afterUndo);
      return {backupBytes, previewRequestBytes: previewBytes, applyRequestBytes: applyBytes,
        oversizedBackupBytes: limit + 1, previewStatus: preview.status, applyStatus: applied.status,
        undoStatus: undone.status, oversizedStatus: oversized.status};
    });

    await check('CONFLICT', '预览后另一次API编辑触发真实409，保留新数据与所选备份', async () => {
      await page.locator('#demo-load').click();
      await previewSelected();
      const current = await readState();
      await successful('/api/settings', 'PUT', {...current.settings, name: 'B版 · 另一页面刚保存的新名称'});
      const newer = await readState();
      await page.locator('#confirm-replace').check();
      await submitAndWait('#apply-backup', '/api/restore/apply', 409);
      await page.locator('#restore-error').waitFor({state: 'visible'});
      assert.match(await page.locator('#restore-error').textContent(), /重新.*预览|预览.*重新/);
      assert.deepEqual(await readState(), newer);
      assert.equal(await page.locator('#apply-backup').isEnabled(), false);
      assert.equal(await page.locator('#preview-backup').isEnabled(), true);
      await page.locator('#refresh-current').click();
      await waitForText('#current-name', newer.settings.name);
    });

    await check('FILE-CHANGE', '更换文件清除旧预览与已勾选确认，合法文件仍可重新预览', async () => {
      await previewSelected();
      await page.locator('#confirm-replace').check();
      await page.locator('#backup-file').setInputFiles(backupFile);
      await page.locator('#preview-section').waitFor({state: 'hidden'});
      assert.equal(await page.locator('#confirm-replace').isChecked(), false);
      assert.equal(await page.locator('#apply-backup').isEnabled(), false);
      await previewSelected();
      await page.locator('#cancel-preview').click();
    });

    await check('INVALID-FILE', '损坏JSON文件和错误版本文件明确拒绝，不改数据', async () => {
      const before = await readState();
      await page.locator('#backup-file').setInputFiles({name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"settings":')});
      await page.locator('#restore-error').waitFor({state: 'visible'});
      assert.match(await page.locator('#restore-error').textContent(), /JSON/);
      assert.equal(await page.locator('#preview-backup').isEnabled(), false);
      await page.locator('#backup-file').setInputFiles({
        name: 'unsupported.json', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({...backupA, schemaVersion: 99})),
      });
      await submitAndWait('#preview-backup', '/api/restore/preview', 400);
      await page.locator('#restore-error').waitFor({state: 'visible'});
      assert.equal(await page.locator('#apply-backup').isEnabled(), false);
      assert.deepEqual(await readState(), before);
    });

    await check('INVALID-REQUEST', '非法恢复请求、畸形JSON和缺少确认返回400且不写入', async () => {
      const before = await readState();
      assert.equal((await request('/api/restore/preview', 'POST', {backup: {...backupA, schemaVersion: true}})).status, 400);
      const malformed = await fetch(base + '/api/restore/preview', {
        method: 'POST', headers: {'Content-Type': 'application/json', Origin: base}, body: '{"backup":',
      });
      assert.equal(malformed.status, 400);
      const preview = await successful('/api/restore/preview', 'POST', {backup: backupA});
      assert.equal((await request('/api/restore/apply', 'POST', {
        backup: backupA, revision: preview.revision, digest: preview.digest, confirmed: false,
      })).status, 400);
      assert.deepEqual(await readState(), before);
    });

    await check('UNDO-CONFLICT', '恢复后出现新任务时真实撤销409，保护新增任务', async () => {
      await page.locator('#demo-load').click();
      await previewSelected();
      await page.locator('#confirm-replace').check();
      await submitAndWait('#apply-backup', '/api/restore/apply', 200);
      await waitForText('#current-name', backupA.settings.name);
      const restoredState = await readState();
      await successful('/api/tasks', 'POST', {projectId: '014-spec-kit', title: '恢复之后新增，撤销不可覆盖', due: '', restoreEpoch: restoredState.restoreEpoch});
      const newer = await readState();
      await page.locator('#undo-restore').click();
      await submitAndWait('#undo-confirm', '/api/restore/undo', 409);
      await page.locator('#restore-error').waitFor({state: 'visible'});
      assert.deepEqual(await readState(), newer);
      assert.equal(await page.locator('#undo-restore').isEnabled(), false);
    });

    await check('BUILD-RECORD', '开发记录五个步骤展示可与磁盘原文件核对的真实产物', async () => {
      const evidence = await successful('/api/restore-evidence');
      const files = new Map(evidence.artifacts.map(item => [item.key, item]));
      const expected = ['restore-spec', 'restore-plan', 'restore-tasks', 'restore-code', 'restore-verification'];
      await page.goto(base + '/restore-build');
      await page.locator('#build-steps button').first().waitFor();
      assert.equal(await page.locator('#build-steps button').count(), 5);
      for (let index = 0; index < expected.length; index++) {
        await page.locator('#build-steps button').nth(index).click();
        const artifact = files.get(expected[index]);
        assert.ok(artifact, 'Missing required real artifact: ' + expected[index]);
        assert.equal(await page.locator('#build-source').textContent(), artifact.source);
        assert.equal(await page.locator('#build-content').textContent(), artifact.content);
        const localPath = path.resolve(root, artifact.source);
        assert.ok(localPath.startsWith(root + path.sep), 'Evidence source must remain inside project');
        const bytes = fs.readFileSync(localPath);
        const source = (bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString('utf16le') : bytes.toString('utf8')).replace(/^\uFEFF/, '');
        assert.equal(artifact.content, source);
        assert.ok((await page.locator('#build-role').textContent()).length > 15);
        assert.ok((await page.locator('#build-decision').textContent()).length > 15);
      }
      assert.match(await page.locator('.process-end').textContent(), /没有内置.*备份恢复/);
      for (const width of [1440, 390]) {
        await page.setViewportSize({width, height: 1050});
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Build record overflow at ' + width);
      }
    });

    await check('NO-SCRIPT-ERRORS', '整个真实操作流程没有未处理的浏览器脚本异常', async () => {
      assert.deepEqual(pageErrors, []);
    });
  } catch (error) {
    if (!checks.some(item => item.status === 'failed')) {
      checks.push({id: 'HARNESS', title: '独立验收环境', status: 'failed', error: error.message});
    }
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (child.exitCode === null) {
      child.kill();
      await new Promise(resolve => {
        if (child.exitCode !== null) return resolve();
        const timeout = setTimeout(resolve, 3000);
        child.once('exit', () => { clearTimeout(timeout); resolve(); });
      });
    }
    const report = {
      suite: '真实浏览器 / 备份恢复 / 独立演示 / 版本冲突', completedAt: new Date().toISOString(),
      checks, passed: checks.filter(item => item.status === 'passed').length,
      failed: checks.filter(item => item.status === 'failed').length, screenshots,
      scope: '真实server.py子进程与临时SQLite；样本通过真实导出API生成；不读取或修改个人空间',
    };
    fs.writeFileSync(path.join(output, 'browser-verification.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
    const cleanupPath = path.resolve(temporary);
    assert.ok(path.dirname(cleanupPath) === temporaryRoot && path.basename(cleanupPath).startsWith('speckit-restore-'), 'Unsafe temporary cleanup path');
    fs.rmSync(cleanupPath, {recursive: true, force: true});
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
