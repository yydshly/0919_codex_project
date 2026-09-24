const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const project = path.resolve(__dirname, '../../..');
const url = process.env.SPEC_KIT_APP_URL || 'http://127.0.0.1:5214/014-spec-kit/app/';
const KEY='spec-kit-repo-shelf:v1';
const group=process.env.TEST_GROUP;
const report={startedAt:new Date().toISOString(),url,runner:'Playwright / Chromium',scope:'独立测试浏览器；未操作用户收藏',checks:[]};
let browser;
async function test(id,requirements,title,run,setup){
  if(group && !id.startsWith(group)) return;
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000);
  const start=Date.now();
  try{
    if(setup)await setup(page,context);
    const response=await page.goto(url);
    assert.equal(response.status(),200,'收藏页必须真实存在并可访问');
    await page.getByRole('heading',{name:'开源项目收藏夹',exact:true}).waitFor();
    await run(page,context);
    assert.deepEqual(errors,[]);
    report.checks.push({id,requirements,title,status:'passed',durationMs:Date.now()-start});
  }catch(error){report.checks.push({id,requirements,title,status:'failed',error:error.message,durationMs:Date.now()-start});}
  finally{await context.close();}
}
const count=page=>page.locator('.repo-card').count();
const records=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).repositories,KEY);
async function add(page,name='我的测试项目',link='https://github.com/example/test-project',notes='验证持久化的独有备注',tags='开发,资料'){
  await page.getByLabel('项目名称',{exact:true}).fill(name);
  await page.getByLabel('GitHub 仓库链接',{exact:true}).fill(link);
  await page.getByLabel('标签',{exact:true}).fill(tags);
  await page.getByLabel('备注',{exact:true}).fill(notes);
  await page.getByRole('button',{name:'保存项目',exact:true}).click();
}
async function downloadData(page,button){const event=page.waitForEvent('download');await button.click();const download=await event;const content=fs.readFileSync(await download.path(),'utf8');return {content,filename:download.suggestedFilename()};}
(async()=>{
 browser=await chromium.launch({headless:true});
 await test('US1-01',['FR-001','FR-003','FR-009'],'添加、刷新后字段完整保留',async p=>{assert.equal(await count(p),3);await add(p);assert.equal(await count(p),4);await p.reload();const item=(await records(p)).find(r=>r.name==='我的测试项目');assert.equal(item.notes,'验证持久化的独有备注');assert.deepEqual(item.tags,['开发','资料']);assert.equal(item.status,'pending');assert.equal(item.sample,false);});
 await test('US1-02',['FR-002'],'大小写、.git、尾斜杠和查询参数不造成重复',async p=>{await add(p,'重复','https://github.com/GITHUB/SPEC-KIT.git/?from=test#readme');assert.equal(await count(p),3);assert.match(await p.locator('#error').innerText(),/已收藏/);assert.equal(await p.getByLabel('项目名称',{exact:true}).inputValue(),'重复');});
 await test('US1-03',['FR-001','FR-002'],'非法主机、脚本协议、子路径、账号信息与空名称被拒绝',async p=>{for(const link of ['https://example.com/a/b','javascript:alert(1)','https://github.com/a/b/issues','https://u:p@github.com/a/b']){await add(p,'非法链接',link);assert.equal(await count(p),3);assert(await p.locator('#error').isVisible());}await add(p,'   ');assert.equal(await count(p),3);});
 await test('US1-04',['FR-001'],'标签长度和数量限制',async p=>{await add(p,'过多标签',undefined,'','1,2,3,4,5,6,7');assert.match(await p.locator('#error').innerText(),/6/);assert.equal(await count(p),3);await add(p,'过长标签',undefined,'','a'.repeat(21));assert.match(await p.locator('#error').innerText(),/20/);});
 await test('US1-05',['FR-008'],'写入失败保留输入与既有记录',async p=>{await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError')};});await add(p,'不能丢掉的输入');assert.equal(await count(p),3);assert.equal(await p.getByLabel('项目名称',{exact:true}).inputValue(),'不能丢掉的输入');assert.match(await p.locator('#error').innerText(),/未保存/);assert.equal((await records(p)).length,3);});
 await test('US1-06',['FR-008'],'损坏存储不被覆盖，原始内容可下载',async p=>{assert.match(await p.locator('#storage-error').innerText(),/恢复|损坏/);assert(await p.getByRole('button',{name:'保存项目',exact:true}).isDisabled());assert.equal(await p.evaluate(key=>localStorage.getItem(key),KEY),'{broken');const data=await downloadData(p,p.getByRole('button',{name:'导出原始数据',exact:true}));assert.equal(data.content,'{broken');},async p=>{await p.addInitScript(key=>localStorage.setItem(key,'{broken'),KEY);});
 await test('US1-07',['FR-008'],'浏览器禁止读取存储时明确提示',async p=>{assert(await p.locator('#storage-error').isVisible());assert.match(await p.locator('#storage-error').innerText(),/存储|浏览器/);},async p=>{await p.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('Blocked','SecurityError')};});});
 await test('US1-08',['FR-001'],'输入的 HTML 按文字显示',async p=>{await add(p,'<img src=x onerror=alert(1)>',undefined,'<script>window.bad=1</script>');assert.equal(await p.locator('.repo-card img,.repo-card script').count(),0);assert.equal(await p.evaluate(()=>window.bad),undefined);assert.equal(await count(p),4);});
 await test('US1-09',['FR-001'],'超长名称与备注明确报错，不悄悄截断后保存',async p=>{await add(p,'a'.repeat(81));assert.equal(await count(p),3,'超长名称不得保存');assert.equal(await p.getByLabel('项目名称',{exact:true}).inputValue().then(v=>v.length),81);assert.match(await p.locator('#error').innerText(),/80/);await add(p,'备注超限',undefined,'b'.repeat(301));assert.equal(await count(p),3);assert.equal(await p.getByLabel('备注',{exact:true}).inputValue().then(v=>v.length),301);assert.match(await p.locator('#error').innerText(),/300/);});
 await test('US2-01',['FR-004','FR-005'],'名称、备注、标签搜索与状态筛选组合，修改状态可刷新保留',async p=>{await add(p);for(const query of ['我的测试','独有备注','资料']){await p.getByLabel('搜索收藏').fill(query);assert.equal(await count(p),1);}await p.locator('.repo-card').getByRole('button',{name:'标为已研究',exact:true}).click();await p.getByRole('button',{name:'待研究',exact:true}).click();assert.equal(await count(p),0);await p.getByRole('button',{name:'已研究',exact:true}).click();assert.equal(await count(p),1);await p.reload();assert.equal((await records(p)).find(r=>r.name==='我的测试项目').status,'reviewed');await p.getByLabel('搜索收藏').fill('sPeC kIt');assert.equal(await count(p),1);});
 await test('US2-02',['FR-004','FR-008'],'无匹配时可清除筛选',async p=>{await p.getByLabel('搜索收藏').fill('不存在的独特搜索词');assert.equal(await count(p),0);assert.match(await p.locator('#empty').innerText(),/没有匹配/);await p.getByRole('button',{name:'清除筛选',exact:true}).click();assert.equal(await count(p),3);});
 await test('US2-03',['FR-012'],'其他标签页更新会同步，未提交输入保留',async(p,c)=>{const second=await c.newPage();await second.goto(url);await second.getByLabel('项目名称',{exact:true}).fill('还没保存');await add(p);await second.waitForFunction(()=>document.querySelectorAll('.repo-card').length===4);assert.equal(await second.getByLabel('项目名称',{exact:true}).inputValue(),'还没保存');});
 await test('US3-01',['FR-006'],'筛选后导出仍包含所有记录和完整字段',async p=>{await add(p);await p.getByLabel('搜索收藏').fill('我的测试');assert.equal(await count(p),1);const data=await downloadData(p,p.getByRole('button',{name:/导出全部/}));const result=JSON.parse(data.content);assert.equal(result.repositories.length,4);assert.equal(result.schemaVersion,1);assert(result.exportedAt);assert.deepEqual(result.repositories,await records(p));assert.match(data.filename,/resource-shelf-.*\.json/);});
 await test('US3-02',['FR-007'],'删除后新增再撤销，旧记录和新记录均保留',async p=>{const name=await p.locator('.repo-card h3').first().innerText();await p.locator('.repo-card').first().getByRole('button',{name:'移除',exact:true}).click();assert.equal(await count(p),2);await add(p);await p.getByRole('button',{name:'撤销移除',exact:true}).click();assert.equal(await count(p),4);assert((await records(p)).some(r=>r.name===name));assert((await records(p)).some(r=>r.name==='我的测试项目'));});
 await test('US3-03',['FR-008','FR-009'],'清空全部后刷新，不重新出现示例',async p=>{while(await count(p))await p.locator('.repo-card').first().getByRole('button',{name:'移除',exact:true}).click();await p.reload();assert.equal(await count(p),0);assert.match(await p.locator('#empty').innerText(),/还没有收藏/);});
 await test('US3-04',['FR-007','FR-008'],'移除保存失败不删除既有条目',async p=>{await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('blocked')};});await p.locator('.repo-card').first().getByRole('button',{name:'移除',exact:true}).click();assert.equal(await count(p),3);assert.match(await p.locator('#error').innerText(),/未保存/);});
 await test('UI-01',['FR-010'],'320/390/768/1440宽度无溢出，键盘操作可用',async p=>{for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:1000});const size=await p.evaluate(()=>[innerWidth,document.documentElement.scrollWidth]);assert(size[1]<=size[0]+1,`overflow at ${width}`);if(width===1440)await p.screenshot({path:path.join(project,'assets/resource-shelf-cover.png'),fullPage:true});if(width===390)await p.screenshot({path:path.join(project,'assets/resource-shelf-mobile.png'),fullPage:true});}await p.getByRole('button',{name:'已研究',exact:true}).focus();await p.keyboard.press('Enter');assert.equal(await p.getByRole('button',{name:'已研究',exact:true}).getAttribute('aria-pressed'),'true');});
 await test('UI-02',['FR-011'],'实际流程页展示原文，所有产物链接可访问',async p=>{
   await p.goto(new URL('../live.html',url).href);
   const source=fs.readFileSync(path.join(project,'practice/resource-shelf/specs/001-resource-shelf/spec.md'),'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
   assert.equal(await p.evaluate(()=>window.SPEC_KIT_EVIDENCE.artifacts.spec.content),source);
   for(let index=0;index<5;index++){
     await p.locator(`[data-stage="${index}"]`).click();
     const buttons=p.locator('[data-artifact]');
     for(let i=0;i<await buttons.count();i++){
       await buttons.nth(i).click();
       assert((await p.locator('#artifact-content').textContent()).length>30);
       const href=await p.locator('#artifact-download').getAttribute('href');
       const response=await p.request.get(new URL(href,p.url()).href);assert.equal(response.status(),200);
     }
   }
   for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:1000});const size=await p.evaluate(()=>[innerWidth,document.documentElement.scrollWidth]);assert(size[1]<=size[0]+1,`evidence overflow at ${width}`);}
   await p.evaluate(()=>window.scrollTo(0,0));await p.emulateMedia({reducedMotion:'reduce'});await p.screenshot({path:path.join(project,'assets/live-run-cover.png')});
 });
 report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(c=>c.status==='passed').length;report.failed=report.checks.length-report.passed;report.status=report.failed?'failed':'passed';
 const output=path.join(project,'notes/live-run',process.env.BASELINE?'06-baseline.json':group?`verification-${group}.json`:'verification.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close()});
