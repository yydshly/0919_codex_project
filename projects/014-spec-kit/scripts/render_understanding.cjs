const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('path');
const fs=require('fs');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1680,height:3520},deviceScaleFactor:2});
  const root=path.resolve(__dirname,'..');
  await page.setContent('<style>body{margin:0}svg{display:block}</style>'+fs.readFileSync(path.join(root,'assets/understanding-map.svg'),'utf8'));
  await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.locator('text').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,box:n.getBBox(),right:Number(n.dataset.maxRight||1616)})).filter(v=>v.box.x+v.box.width>v.right||v.box.y+v.box.height>3500));
  if(overflow.length)throw new Error(JSON.stringify(overflow));
  await page.screenshot({path:path.join(root,'assets/understanding-map.png'),fullPage:true,timeout:60000});
  // Build the published copy after the new high-resolution image exists.
  require('child_process').execFileSync(process.env.PYTHON_BIN||'python',[path.join(root,'scripts/build_web.py')],{windowsHide:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:950});
    await page.goto('http://127.0.0.1:5214/014-spec-kit/overview.html');
    await page.waitForFunction(()=>document.querySelector('img').naturalWidth>0);
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Page overflow '+width);
    await page.getByRole('button',{name:'放大阅读'}).click();
    if(await page.getByRole('button',{name:'适应屏幕'}).getAttribute('aria-pressed')!=='true')throw new Error('zoom failed');
    await page.getByRole('button',{name:'适应屏幕'}).click();
    await page.getByLabel('定位图中章节').selectOption('07');
    const positioned=await page.locator('#canvas').evaluate(n=>{const expected=Math.min(2371*n.querySelector('img').clientWidth/1680,n.scrollHeight-n.clientHeight);return Math.abs(n.scrollTop-expected)<3});
    if(!positioned)throw new Error('section navigation failed');
  }
  if(errors.length)throw new Error(errors.join('\n'));
  await browser.close();
  fs.writeFileSync(path.join(root,'assets/understanding-verification.json'),JSON.stringify({completedAt:new Date().toISOString(),poster:{width:3360,height:7040},textBounds:'passed',widths:[1440,390],zoom:'passed',sectionNavigation:'passed',browserErrors:errors},null,2));
  console.log('Poster text bounds, desktop/mobile layout and zoom passed.');
})().catch(e=>{console.error(e);process.exit(1)});
