const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
const root=path.resolve(__dirname,'..');
const assert=require('assert/strict');
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'research-workbench-'));
 const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p))})});
 const base='http://127.0.0.1:'+port;
 const child=spawn(process.env.PYTHON_BIN||'python',[path.join(root,'app/server.py'),'--port',String(port),'--db',path.join(tmp,'test.sqlite3')],{windowsHide:true,stdio:'ignore'});
 const checks=[];let browser;
 async function check(id,title,fn){try{await fn();checks.push({id,title,status:'passed'})}catch(e){checks.push({id,title,status:'failed',error:e.message});throw e}}
 try{
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/state')).ok)break}catch{}await new Promise(r=>setTimeout(r,80))}
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await check('US1','真实定制、进入与刷新保存',async()=>{
   await page.goto(base);await page.getByLabel('空间名称').waitFor();await page.screenshot({path:path.join(root,'evidence/customization.png')});await page.getByLabel('空间名称').fill('我的 AI 产品研究室');await page.getByLabel('研究目标').fill('寻找能用于真实产品的开源能力');
   await page.getByRole('button',{name:'完成定制，进入工作台'}).click();await page.getByRole('heading',{name:'我的 AI 产品研究室',exact:true}).waitFor();await page.reload();
   await page.getByRole('heading',{name:'我的 AI 产品研究室',exact:true}).waitFor();assert.equal(await page.locator('.project-card').count(),16);
  });
  await check('US2-A','真实目录搜索与清除筛选',async()=>{
   await page.getByLabel('搜索项目').fill('Spec Kit');assert.equal(await page.locator('.project-card').count(),1);
   await page.getByLabel('搜索项目').fill('no-such-project-000');await page.getByText('没有找到匹配项目').waitFor();await page.getByRole('button',{name:'清除筛选'}).click();assert.equal(await page.locator('.project-card').count(),16);
  });
  await check('US2-B','三项比较与第四项上限',async()=>{
   for(let i=0;i<4;i++)await page.locator('.project-card').nth(i).getByRole('button',{name:'加入比较'}).click();
   await page.getByText('最多比较 3 个项目').waitFor();await page.getByRole('button',{name:'查看比较'}).click();assert.equal(await page.locator('.compare-item').count(),3);
   await page.getByRole('button',{name:'项目目录',exact:true}).click();
  });
  await check('US3-A','个人结论与待办持久化、完成和重开',async()=>{
   await page.locator('.project-card').first().getByRole('button',{name:'研究详情'}).click();await page.getByLabel('我的应用判断').fill('用于真实产品验证 <script>test</script>');await page.getByLabel('跟进状态',{exact:true}).selectOption('active');await page.getByRole('button',{name:'保存研究记录'}).click();
   await page.getByLabel('下一步任务').fill('验证可复用能力');await page.getByRole('button',{name:'添加任务',exact:true}).click();await page.getByRole('button',{name:'关闭详情'}).click();await page.reload();
   await page.getByRole('button',{name:'研究待办',exact:true}).click();await page.getByText('验证可复用能力',{exact:true}).waitFor();await page.getByRole('button',{name:'标为完成'}).click();await page.getByRole('button',{name:'重新打开'}).click();
  });
  await check('US4','搜索后仍导出全部数据',async()=>{
   await page.getByRole('button',{name:'项目目录',exact:true}).click();await page.getByLabel('搜索项目').fill('Spec Kit');
   const wait=page.waitForEvent('download');await page.getByRole('link',{name:'下载完整备份'}).click();const download=await wait;const file=path.join(tmp,'export.json');await download.saveAs(file);const json=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(json.projects.length,16);assert.equal(json.tasks.length,1);assert.equal(json.settings.name,'我的 AI 产品研究室');await page.getByLabel('搜索项目').fill('');
  });
  await check('ERROR','保存失败保留输入且可重试',async()=>{
   await page.getByRole('button',{name:'定制空间'}).click();await page.getByLabel('空间名称').fill('保存失败草稿');await page.route('**/api/settings',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'暂时无法保存，请重试'})}));await page.getByRole('button',{name:'保存空间设置'}).click();assert.equal(await page.getByLabel('空间名称').inputValue(),'保存失败草稿');await page.getByText('暂时无法保存，请重试').waitFor();await page.unroute('**/api/settings');await page.getByLabel('空间名称').fill('我的 AI 产品研究室');await page.getByRole('button',{name:'保存空间设置'}).click();
  });
  await check('UI','桌面与手机无整页溢出、键盘可用',async()=>{
   await page.locator('#toast').evaluate(n=>n.hidden=true);
   for(const width of [1440,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(root,'evidence',width===1440?'product-desktop.png':'product-mobile.png'),fullPage:false})}
   await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement.tagName),'BODY');assert.deepEqual(errors,[]);
  });
  await check('CUSTOM','关注方向、默认视图与长名称校验真实生效',async()=>{
   await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'定制空间'}).click();await page.getByLabel('空间名称').fill('字'.repeat(41));await page.getByRole('button',{name:'保存空间设置'}).click();await page.getByText('空间名称需为 1–40 个字符').waitFor();assert.equal((await page.getByLabel('空间名称').inputValue()).length,41);
   await page.getByLabel('空间名称').fill('我的 AI 产品研究室');await page.getByRole('checkbox',{name:'AI 编程',exact:true}).check();await page.getByLabel('默认展示').selectOption('focus');await page.getByRole('button',{name:'保存空间设置'}).click();await page.reload();await page.locator('.project-card').first().waitFor();assert.ok(await page.locator('.project-card').count()<16);assert.ok((await page.locator('#projects').textContent()).includes('Spec Kit'));await page.getByRole('button',{name:'只看关注方向'}).click();
  });
  await check('CONFLICT','真实旧版本冲突保留草稿并支持重新读取',async()=>{
   await page.locator('.project-card').first().getByRole('button',{name:'研究详情'}).click();await page.getByLabel('我的应用判断').fill('当前页面未提交的草稿');
   await page.evaluate(async()=>{const s=await(await fetch('/api/state')).json();const p=s.projects[0];await fetch('/api/projects/'+p.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:'另一个页面已保存',status:'active',version:p.version})})});
   await page.getByRole('button',{name:'保存研究记录'}).click();await page.getByText('这条记录已在另一页面更新',{exact:false}).waitFor();assert.equal(await page.getByLabel('我的应用判断').inputValue(),'当前页面未提交的草稿');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'重新读取项目'}).click();await page.waitForFunction(()=>document.querySelector('[name=note]').value==='另一个页面已保存');await page.getByRole('button',{name:'关闭详情'}).click();
  });
  await check('DELETE','删除可取消、确认后持久移除',async()=>{
   await page.getByRole('button',{name:'研究待办',exact:true}).click();page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'删除',exact:true}).click();await page.locator('#board').getByText('验证可复用能力',{exact:true}).waitFor();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'删除',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#board .task-row').length===0);await page.reload();await page.getByRole('button',{name:'研究待办',exact:true}).click();assert.equal(await page.locator('#board .task-row').count(),0);
  });
  await check('PROCESS','真实产物可读取且明确执行角色',async()=>{
   await page.goto(base+'/process');await page.getByRole('heading',{name:'从定制需求，到真实产品'}).waitFor();await page.getByRole('button',{name:'需求规格'}).click();await page.getByText('Feature Specification: 研库',{exact:false}).waitFor();assert.ok((await page.locator('#artifact').textContent()).includes('FR-013'));
  });
 }finally{
  if(browser)await browser.close();child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));
  const report={completedAt:new Date().toISOString(),checks,passed:checks.filter(c=>c.status==='passed').length,failed:checks.filter(c=>c.status==='failed').length,scope:'独立服务与临时SQLite，不操作用户数据'};
  fs.writeFileSync(path.join(root,'evidence/browser-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));fs.rmSync(tmp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
