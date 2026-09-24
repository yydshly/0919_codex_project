const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const project = path.resolve(__dirname, '..');
const url = process.env.SPEC_KIT_PREVIEW_URL || 'http://127.0.0.1:5214/014-spec-kit/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const report = { url, cases: 0, steps: 0, recommendations: 0, widths: [], errors };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.status() >= 400 && response.url().includes('/014-spec-kit/')) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(url, { waitUntil: 'networkidle' });
    const names = { budget: '个人记账', gallery: '图片整理', export: '订单导出' };
    const commands = ['specify', 'plan', 'tasks', 'implement', 'converge'];
    for (const [key, name] of Object.entries(names)) {
      await page.locator(`[data-case="${key}"]`).click();
      for (let step = 0; step < 5; step++) {
        await page.locator(`[data-step="${step}"]`).click();
        assert.equal(await page.locator('#stage-command').innerText(), commands[step]);
        assert.match(await page.locator('#document-body').innerText(), new RegExp(name));
        assert.equal(await page.locator('.step-list [aria-pressed="true"]').count(), 1);
        assert.equal(await page.locator('#step-count').innerText(), `0${step + 1} / 05`);
        assert((await page.locator('#human-input').innerText()).length > 10);
        report.steps++;
      }
      await page.locator('#next-step').click();
      assert.equal(await page.locator('#stage-command').innerText(), 'specify');
      await page.locator('#next-step').click();
      assert.equal(await page.locator('#stage-command').innerText(), 'plan');
      report.cases++;
    }
    const fitLabels = { product:'适合尝试完整流程', feature:'适合从一个功能开始', small:'完整流程通常偏重', idea:'可选：想法评估扩展' };
    for (const [key,label] of Object.entries(fitLabels)) {
      await page.locator(`[data-fit="${key}"]`).click();
      assert.equal(await page.locator('#fit-label').innerText(), label);
      assert.equal(await page.locator('.fit-options [aria-pressed="true"]').count(), 1);
      report.recommendations++;
    }
    await page.locator('.technical summary').click();
    assert(await page.locator('.technical-content').isVisible());
    await page.locator('.technical summary').click();
    await page.locator('[data-case="budget"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-case="budget"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-step="0"]').click();
    await page.locator('[data-fit="product"]').click();
    fs.mkdirSync(path.join(project,'assets'), { recursive:true });
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0,0));
      const size = await page.evaluate(() => ({ viewport:innerWidth, page:document.documentElement.scrollWidth }));
      assert(size.page <= size.viewport + 1, `Horizontal overflow at ${width}: ${JSON.stringify(size)}`);
      for (const step of [0,2,4]) {
        await page.locator(`[data-step="${step}"]`).click();
        assert(await page.locator('#next-step').isVisible());
      }
      await page.locator('[data-step="0"]').click();
      await page.evaluate(() => window.scrollTo(0,0));
      await page.emulateMedia({ reducedMotion:'reduce' });
      if (width === 1440) await page.screenshot({ path:path.join(project,'assets','cover.png') });
      if (width === 390) await page.screenshot({ path:path.join(project,'assets','mobile.png'),fullPage:true });
      report.widths.push(width);
    }
    await page.setViewportSize({ width:1440, height:1050 });
    await page.locator('#demo').scrollIntoViewIfNeeded();
    await page.screenshot({ path:path.join(project,'assets','walkthrough.png') });
    await page.goto(new URL('../',url).href);
    const galleryEntry = page.locator('a.card[href="./014-spec-kit/"]');
    assert.equal(await galleryEntry.count(),1);
    await galleryEntry.click();
    assert.match(await page.title(),/Spec Kit/);
    report.galleryNavigation='passed';
    assert.deepEqual(errors,[]);
    report.result='passed';
    fs.mkdirSync(path.join(project,'notes'),{recursive:true});
    fs.writeFileSync(path.join(project,'notes','verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
