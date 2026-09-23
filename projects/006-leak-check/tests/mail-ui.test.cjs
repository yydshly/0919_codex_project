const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const base = process.env.MAIL_TRAIL_URL || 'http://127.0.0.1:5196/006-leak-check/mail-trail/';
  const project = path.resolve(__dirname, '..');
  const output = path.join(project, 'assets');
  const { demoMbox } = await import(pathToFileURL(path.join(project, 'site/mail-trail/demo.mjs')));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto(base);
  await page.locator('#demo-button').click();
  await page.waitForSelector('.platform-row');
  assert.equal(await page.locator('.platform-row').count(), 8);
  assert.equal(await page.locator('#metric-mails').innerText(), '14');
  assert.equal(await page.locator('#metric-registration').innerText(), '5');
  assert.match(await page.locator('#coverage-summary').innerText(), /3 封未形成账号线索/);
  await page.screenshot({ path: path.join(output, 'mail-trail-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '确认使用过', exact: true }).click();
  assert.equal(await page.locator('#metric-confirmed').innerText(), '1');
  await page.locator('#review-filter').selectOption('confirmed');
  assert.equal(await page.locator('.platform-row').count(), 1);
  await page.getByRole('button', { name: '恢复待确认', exact: true }).click();
  assert.equal(await page.locator('.platform-row').count(), 0);
  await page.locator('#review-filter').selectOption('all');
  await page.locator('[data-filter="verification"]').click();
  assert.equal(await page.locator('.platform-row').count(), 1);
  assert.match(await page.locator('#detail-panel').innerText(), /验证码不等于完成注册/);
  await page.locator('[data-filter="all"]').click();
  await page.locator('#search-input').fill('notion');
  assert.equal(await page.locator('.platform-row').count(), 1);
  await page.locator('#search-input').fill('no-such-platform');
  assert.equal(await page.locator('.platform-row').count(), 0);
  await page.locator('#search-input').fill('');
  await page.locator('#help-button').click();
  assert.equal(await page.locator('#help-dialog').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.locator('#rules-button').click();
  assert.equal(await page.locator('#rules-dialog').isVisible(), true);
  await page.locator('[data-close="rules-dialog"]').click();

  // A real file-input import must traverse the Worker parser rather than the demo path.
  await page.locator('#file-input').setInputFiles({ name: 'sample.mbox', mimeType: 'application/mbox', buffer: Buffer.from(demoMbox) });
  await page.waitForFunction(() => document.getElementById('dataset-badge').textContent === '文件导入');
  assert.equal(await page.locator('.platform-row').count(), 8);
  assert.equal(await page.locator('#metric-confirmed').innerText(), '0');
  await page.getByRole('button', { name: '与我无关', exact: true }).click();
  const exportEvent = page.waitForEvent('download');
  await page.locator('#export-button').click();
  const exported = await exportEvent;
  const csv = fs.readFileSync(await exported.path(), 'utf8');
  assert.match(csv, /与我无关/);
  assert.match(csv, /本地导入/);
  assert.equal(csv.split('\r\n').length, 9);
  assert.ok(!csv.includes('If this was you, no action is needed'));
  await page.locator('#file-input').setInputFiles({ name: 'invalid.eml', mimeType: 'message/rfc822', buffer: Buffer.from('not a mail') });
  await page.waitForFunction(() => document.getElementById('notice').textContent.includes('没有读到有效邮件'));
  assert.equal(await page.locator('.platform-row').count(), 8);
  await page.locator('#file-input').setInputFiles({ name: 'too-large.mbox', mimeType: 'application/mbox', buffer: Buffer.alloc(25 * 1024 * 1024 + 1) });
  await page.waitForFunction(() => document.getElementById('notice').textContent.includes('超过 25 MB'));
  assert.equal(await page.locator('.platform-row').count(), 8);

  // Exactly the maximum is complete; only an actual excess produces a truncation notice.
  const limitMail = 'From reader@example.test Tue Sep 22 09:30:00 2026\nMessage-ID: <limit@example.test>\nFrom: Test <hello@limit.example>\nTo: reader@example.test\nSubject: Your account has been created\nContent-Type: text/plain; charset=utf-8\n\nYour account has been created successfully.\n\n';
  await page.locator('#file-input').setInputFiles({ name: 'exact-limit.mbox', mimeType: 'application/mbox', buffer: Buffer.from(limitMail.repeat(3000)) });
  await page.waitForFunction(() => document.querySelector('.platform-name')?.textContent === 'limit.example');
  assert.equal(await page.locator('#notice').isVisible(), false);
  assert.match(await page.locator('#metric-mails-note').innerText(), /2999/);
  await page.locator('#file-input').setInputFiles({ name: 'over-limit.mbox', mimeType: 'application/mbox', buffer: Buffer.from(limitMail.repeat(3001)) });
  await page.waitForFunction(() => document.getElementById('notice').textContent.includes('超出部分未分析'));

  // Potentially active markup stays inert and unknown dates are not invented.
  const malicious = 'From: Evil <hello@unknown.example>\nTo: reader@example.test\nSubject: =HYPERLINK("https://example.test") <img src=x onerror="window.pwned=1"> Your account has been created\nMIME-Version: 1.0\nContent-Type: text/html; charset=utf-8\n\n<p>Your account has been created successfully.</p><script>window.pwned=1</script><img src="https://tracker.example/pixel"><p>&lt;img src=x onerror=window.pwned=2&gt;</p>';
  await page.locator('#file-input').setInputFiles({ name: 'unsafe.eml', mimeType: 'message/rfc822', buffer: Buffer.from(malicious) });
  await page.waitForFunction(() => document.querySelector('.platform-name')?.textContent === 'unknown.example');
  assert.match(await page.locator('#detail-panel').innerText(), /日期未知/);
  await page.locator('.evidence summary').click();
  assert.equal(await page.locator('#detail-panel img').count(), 0);
  assert.equal(await page.evaluate(() => window.pwned), undefined);
  const unsafeDownload = page.waitForEvent('download');
  await page.locator('#export-button').click();
  const unsafeCsv = fs.readFileSync(await (await unsafeDownload).path(), 'utf8');
  assert.match(unsafeCsv, /"'=HYPERLINK/);

  // Marketing-only import must have a meaningful zero-results state.
  const promo = 'From: News <news@canva.com>\nSubject: Weekly newsletter\nContent-Type: text/plain; charset=utf-8\n\nYour weekly inspiration and template sale.';
  await page.locator('#file-input').setInputFiles({ name: 'promo.eml', mimeType: 'message/rfc822', buffer: Buffer.from(promo) });
  await page.waitForFunction(() => document.getElementById('platform-list').textContent.includes('这些邮件中未发现'));
  assert.equal(await page.locator('#metric-platforms').innerText(), '0');
  assert.equal(await page.locator('#export-button').isDisabled(), true);

  // Drag and drop follows the same path; use a synthetic local File only.
  await page.locator('#drop-zone').evaluate((zone, mbox) => {
    const transfer = new DataTransfer(); transfer.items.add(new File([mbox], 'drag.mbox', { type: 'application/mbox' }));
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
  }, demoMbox);
  await page.waitForFunction(() => document.querySelectorAll('.platform-row').length === 8);
  await page.locator('#clear-button').click();
  assert.equal(await page.locator('.platform-row').count(), 0);
  assert.equal(await page.locator('#metric-mails').innerText(), '0');
  await page.locator('#demo-button').click();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, 'mail-trail-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: '查看 哔哩哔哩 的邮件证据', exact: true }).click();
  await page.getByRole('button', { name: '确认使用过', exact: true }).click();
  assert.equal(await page.locator('#metric-confirmed').innerText(), '1');
  await page.reload();
  await page.waitForFunction(() => document.getElementById('metric-mails').textContent === '0');
  assert.equal(await page.locator('#metric-confirmed').innerText(), '0');
  assert.equal(await page.locator('#dataset-badge').innerText(), '尚未连接');
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.deepEqual(errors, []);
  assert.ok(requests.every(url => url.startsWith(base) || url.startsWith(new URL('/api/mail-trail/', base).href) || url.startsWith('blob:')), 'Unexpected remote/network request');
  await browser.close();
  console.log(JSON.stringify({ status: 'passed', checks: ['demo with deduplication', 'real MBOX and EML imports through worker', 'confirmation/reset/exclusion', 'signal/status/search filters', 'CSV export and formula escaping', 'invalid and oversized file preservation', 'HTML/XSS and remote tracking isolation', 'unknown dates', 'empty results', 'drag/drop', 'clear', 'reload clears state', 'no browser storage', 'no external requests', 'no runtime errors'], widths: [1440, 1024, 768, 390, 320] }, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
