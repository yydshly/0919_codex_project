// Simulated service responses exercise the UI. No real credentials/mailboxes are used.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const base = 'http://127.0.0.1:5196/006-leak-check/mail-trail/';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto(base);
  await page.waitForFunction(() => document.getElementById('connection-status').textContent.includes('已就绪'));
  assert.equal(await page.locator('.platform-row').count(), 0);
  await page.screenshot({ path: path.resolve(__dirname, '../assets/mail-connection-desktop.png'), fullPage: true });
  const raw = Buffer.from('From: GitHub <noreply@github.com>\nTo: reader@qq.com\nSubject: Your account has been created\nDate: Sat, 12 Mar 2022 09:30:00 GMT\nContent-Type: text/plain; charset=utf-8\n\nYour account has been created successfully.').toString('base64');
  let scanCount = 0, cancelCount = 0, statusCalls = 0, behavior = 'success';
  await page.route('**/api/mail-trail/scan', async route => {
    scanCount++;
    const request = route.request();
    assert.equal(request.method(), 'POST');
    assert.ok(request.headers()['x-mailtrail-token']);
    assert.equal(request.postDataJSON().authorizationCode, 'FAKE-CODE-ONLY');
    if (behavior === 'slow-start') await new Promise(resolve => setTimeout(resolve, 400));
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ jobId: 'test-job' }) });
  });
  await page.route('**/api/mail-trail/status?*', route => {
    statusCalls++;
    const result = behavior === 'failure' ? { status: 'failed', error: '授权失败，请检查授权码。' }
      : behavior === 'running' ? { status: 'running', scanned: 2, total: 10 }
      : { status: 'complete', scanned: 1, total: 1, skipped: 0, warnings: [], email: 'reader@qq.com', scope: 'INBOX', limit: 1000, messages: [{ fileName: 'inbox-1.eml', raw }] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
  });
  await page.route('**/api/mail-trail/cancel', route => {
    cancelCount++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"cancelled"}' });
  });
  async function authorize() {
    await page.locator('#mailbox-email').fill('reader@qq.com');
    await page.locator('#connect-button').click();
    await page.locator('#authorization-code').fill('FAKE-CODE-ONLY');
    await page.locator('#authorize-button').click();
  }
  await authorize();
  await page.waitForFunction(() => document.getElementById('dataset-badge').textContent === '邮箱读取');
  assert.equal(await page.locator('.platform-row').count(), 1);
  assert.match(await page.locator('#dataset-description').innerText(), /reader@qq.com.*收件箱/);
  assert.equal(await page.locator('#authorization-code').inputValue(), '');
  assert.equal(await page.locator('#connect-dialog').isVisible(), false);
  assert.equal(cancelCount, 1);
  assert.match(await page.locator('#connection-status').innerText(), /连接已断开/);

  // Failed authentication must retain an existing report, re-enable controls, and erase the code.
  behavior = 'failure';
  await authorize();
  await page.waitForFunction(() => document.getElementById('notice').textContent.includes('授权失败'));
  assert.equal(await page.locator('.platform-row').count(), 1);
  assert.equal(await page.locator('#connect-button').isEnabled(), true);
  assert.equal(await page.locator('#authorization-code').inputValue(), '');

  behavior = 'running';
  await authorize();
  await page.waitForFunction(() => document.getElementById('progress-text').textContent.includes('2 / 10'));
  await page.locator('#cancel-button').click();
  assert.equal(await page.locator('#progress').isVisible(), false);
  assert.equal(await page.locator('.platform-row').count(), 1);

  // A cancellation during scan creation must clean up the returned job rather than orphan it.
  behavior = 'slow-start';
  const cancelBefore = cancelCount;
  await authorize();
  await page.locator('#cancel-button').click();
  await page.waitForTimeout(600);
  assert.ok(cancelCount > cancelBefore);
  assert.equal(await page.locator('.platform-row').count(), 1);

  // Unsupported OAuth providers get an honest boundary, never a password dialog or fake success.
  const callsBefore = scanCount;
  await page.locator('#mailbox-email').fill('reader@gmail.com');
  await page.locator('#connect-button').click();
  assert.match(await page.locator('#notice').innerText(), /尚未配置/);
  assert.equal(await page.locator('#connect-dialog').isVisible(), false);
  assert.equal(scanCount, callsBefore);
  await page.locator('#clear-button').click();
  await page.locator('#mailbox-email').fill('');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => document.getElementById('connection-status').textContent.includes('已就绪'));
  await page.screenshot({ path: path.resolve(__dirname, '../assets/mail-connection-mobile.png'), fullPage: true });
  await page.locator('#mailbox-email').fill('reader@qq.com');
  await page.locator('#connect-button').click();
  assert.equal(await page.locator('#connect-dialog').isVisible(), true);
  assert.ok(await page.evaluate(() => document.getElementById('connect-dialog').scrollWidth <= innerWidth));
  await page.locator('#authorization-code').fill('FAKE-CODE-ONLY');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('connect-dialog').open);
  assert.equal(await page.locator('#authorization-code').inputValue(), '');
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.ok(requests.every(url => url.startsWith('http://127.0.0.1:5196/')));
  assert.ok(requests.every(url => !url.includes('FAKE-CODE')));
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(JSON.stringify({ status: 'passed', service: 'actual local config; simulated scan results', realMailboxAccess: false, checks: ['connection-first empty state', 'credential POST only', 'automatic parsing from received messages', 'credential field clearing', 'purge after completion', 'failed authorization preserves report', 'cancel including in-flight start', 'honest unsupported provider', 'responsive layout', 'no browser persistence', 'no external browser requests'], scanCount, statusCalls, cancelCount }, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
