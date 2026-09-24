const evidence=window.SPEC_KIT_EVIDENCE;
const $=id=>document.getElementById(id);
const stages=[
 {title:'工具确实安装并运行了。',meaning:'在工作区的独立环境安装官方 specify-cli 1.0.9，并实际初始化一个 Codex 技能项目。版本检查、初始化输出和辅助脚本日志都保留下来。',impact:'得到的是可执行的工作指令、文档模板与辅助脚本。业务需求和代码仍由 Codex 按流程完成。',files:['version','init','input','constitution']},
 {title:'把“收藏项目”变成明确要求。',meaning:'按安装生成的需求技能，形成三个用户场景、12 项功能要求和可验证的成功标准。',impact:'提前明确：重复仓库不能重复保存；刷新后应保留；搜索后的导出仍包含全部收藏。',files:['spec','requirements']},
 {title:'先确定存储与恢复方案。',meaning:'运行规划辅助脚本，按技能产出技术计划、数据模型和接口约定；对本地存储失败、删除撤销等边界做了研究。',impact:'采用“写入成功后再更新界面”。删除撤销只恢复一条记录，避免覆盖期间新增的项目。',files:['plan','research','model','contracts','setup-plan']},
 {title:'把约定变成可执行的工作。',meaning:'按任务技能拆出 16 项初始工作，再按实现技能编写测试与页面代码。下方清单来自实际文件，包含完成标记与收敛检查追加项。',impact:'先写验收脚本、记录未实现时的失败基线；实现后运行同一套行为检查，而不是只看页面能否打开。',files:['tasks','baseline','app-source','store-source','setup-tasks','prerequisites']},
 {title:'打开浏览器，实际操作和核对。',meaning:'在独立测试环境中添加项目、刷新、切换状态、下载并解析导出文件，还模拟存储失败。随后按完成度技能对照需求、方案和代码检查。',impact:'确实发现了“超长输入被截断后保存”的遗漏，追加 T017 并修复。可对照修复前失败记录与最终通过报告。',files:['verification','convergence','length-before','quickstart','test-source']}
];
let selected=0;
function chooseFile(key){
 const file=evidence?.artifacts[key];
 if(!file){$('artifact-name').textContent='该记录尚未生成';$('artifact-content').textContent='当前构建还没有包含这份产物。';$('artifact-download').hidden=true;$('artifact-description').textContent='请以实际文件与已完成步骤为准。';return;}
 $('artifact-download').hidden=false;$('artifact-name').textContent=file.name;$('artifact-content').textContent=file.content;$('artifact-download').href=file.href;$('artifact-description').textContent=file.description;
 document.querySelectorAll('[data-artifact]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.artifact===key)));
}
function chooseStage(index){selected=index;const stage=stages[index];$('stage-eyebrow').textContent=`STEP 0${index} / 实际执行`;$('stage-name').textContent=stage.title;$('stage-meaning').textContent=stage.meaning;$('stage-impact').textContent=stage.impact;
 const group=$('artifact-buttons');group.replaceChildren();stage.files.forEach(key=>{const file=evidence?.artifacts[key];if(!file)return;const button=document.createElement('button');button.type='button';button.dataset.artifact=key;button.textContent=file.label;button.addEventListener('click',()=>chooseFile(key));group.append(button);});
 document.querySelectorAll('[data-stage]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.stage)===selected)));$('artifact-details').open=false;chooseFile(stage.files[0]);
}
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>chooseStage(Number(button.dataset.stage))));
if(evidence){
 const report=evidence.verification;
 $('test-summary').textContent=report?`${report.passed} 项通过 / ${report.failed} 项失败`:'尚无验证结果';
 $('test-time').textContent=report?`执行时间：${new Date(report.finishedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}（北京时间）`:'尚无验证时间';
 (report?.checks??[]).forEach(check=>{const item=document.createElement('div');item.className='test-item'+(check.status==='passed'?'':' failed');const icon=document.createElement('span');icon.textContent=check.status==='passed'?'✓':'×';const text=document.createElement('div');text.textContent=check.title;const small=document.createElement('small');small.textContent=check.id+' · '+check.requirements.join(' / ');text.append(small);item.append(icon,text);$('test-list').append(item);});
 chooseStage(0);
}else{$('test-summary').textContent='验证资料加载失败';$('stage-name').textContent='请重新构建或刷新页面。';}
