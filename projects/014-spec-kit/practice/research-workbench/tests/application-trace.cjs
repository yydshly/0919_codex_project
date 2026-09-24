const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {spawn}=require('child_process');const fs=require('fs'),os=require('os'),path=require('path'),net=require('net'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),before=process.env.TRACE_PHASE==='before';
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'speckit-trace-'));
 const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p))})});
 const base='http://127.0.0.1:'+port;const child=spawn(process.env.PYTHON_BIN||'python',[path.join(root,'app/server.py'),'--port',String(port),'--db',path.join(tmp,'test.sqlite3')],{windowsHide:true,stdio:'ignore'});
 let browser;const checks=[];
 async function check(id,title,fn){try{await fn();checks.push({id,title,status:'passed'})}catch(e){checks.push({id,title,status:'failed',error:e.message});throw e}}
 try{
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/state')).ok)break}catch{}await new Promise(r=>setTimeout(r,80))}
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1050}});const first=await context.newPage(),second=await context.newPage();
  await check('FR008-FIRST-SETUP','两个真实页面首次定制：冲突后保留草稿并提供重新读取',async()=>{
   await first.goto(base);await second.goto(base);await first.getByLabel('空间名称').fill('页面A未提交的草稿');await second.getByLabel('空间名称').fill('页面B已保存的空间');await second.getByRole('button',{name:'完成定制，进入工作台'}).click();await second.getByRole('heading',{name:'页面B已保存的空间',exact:true}).waitFor();
   await first.getByRole('button',{name:'完成定制，进入工作台'}).click();await first.getByText('这条记录已在另一页面更新',{exact:false}).waitFor();assert.equal(await first.getByLabel('空间名称').inputValue(),'页面A未提交的草稿');
   await first.screenshot({path:path.join(root,'evidence',before?'conflict-before.png':'conflict-after.png')});
   assert.equal(await first.getByRole('button',{name:'重新读取设置',exact:true}).isVisible(),true,'规格FR-008要求重新读取，但首次定制冲突时入口仍隐藏');
   first.once('dialog',d=>d.accept());await first.getByRole('button',{name:'重新读取设置'}).click();await first.waitForFunction(()=>document.querySelector('[name=name]').value==='页面B已保存的空间');await first.getByRole('button',{name:'关闭设置'}).click();
  });
  if(!before){
   await check('FR011-TRACE','3个场景×6个步骤均显示实际Skill与产物片段',async()=>{
    await first.goto(base+'/process');await first.locator('[data-case]').first().waitFor();
    for(let c=0;c<3;c++){await first.locator('[data-case]').nth(c).click();for(let s=0;s<6;s++){await first.locator('[data-step]').nth(s).click();const all=(await first.locator('#rule-snippet').textContent())+(await first.locator('#result-snippet').textContent());assert.ok(!/尚未加载|未找到指定/.test(all),`missing case ${c} step ${s}`);assert.ok(all.length>70)}}
    await first.locator('[data-case]').first().click();await first.locator('[data-step]').nth(1).click();await first.getByRole('button',{name:'查看完整文件',exact:true}).click();assert.ok((await first.locator('#artifact').textContent()).includes('Each requirement must be testable'));
    for(const width of [1440,390]){await first.setViewportSize({width,height:1050});await first.evaluate(()=>scrollTo(0,0));assert.ok(await first.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await first.screenshot({path:path.join(root,'evidence',width===1440?'application-trace.png':'application-trace-mobile.png'),fullPage:false})}
   });
   await check('SC004-KEYBOARD','键盘完成设置、访问项目详情并保存研究记录',async()=>{
    await first.setViewportSize({width:1440,height:1050});await first.goto(base+'/?inspect=customization');await first.getByLabel('空间名称').waitFor();await first.getByLabel('空间名称').focus();await first.keyboard.press('Control+A');await first.keyboard.type('Keyboard workspace');
    async function reach(name){for(let i=0;i<150;i++){if(await first.evaluate(n=>document.activeElement?.textContent===n,name)){await first.keyboard.press('Enter');return}await first.keyboard.press('Tab')}throw Error('Keyboard cannot reach '+name)}
    await reach('保存空间设置');await first.getByRole('heading',{name:'Keyboard workspace',exact:true}).waitFor();await reach('研究详情');await first.getByLabel('我的应用判断').waitFor();await first.getByLabel('跟进状态',{exact:true}).focus();await first.keyboard.press('Tab');assert.equal(await first.evaluate(()=>document.activeElement.getAttribute('aria-label')),'我的应用判断');await first.keyboard.type('Keyboard note');await reach('保存研究记录');await first.getByText('研究记录已保存',{exact:true}).waitFor();await reach('×');
   });
  }
 }finally{
  if(browser)await browser.close();child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));
  const report={completedAt:new Date().toISOString(),phase:before?'before-fix':'after-fix',checks,passed:checks.filter(c=>c.status==='passed').length,failed:checks.filter(c=>c.status==='failed').length,scope:'独立临时数据库；两个真实浏览器页面；不使用个人空间'};
  fs.writeFileSync(path.join(root,'evidence',before?'trace-before-fix.json':'trace-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));fs.rmSync(tmp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
