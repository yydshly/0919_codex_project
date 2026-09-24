const $=s=>document.querySelector(s);
const scenarios=[
 {id:'customization',name:'空间定制',why:'把“可定制”落实为明确的字段、限制、保存行为和验收方式。',fr:'**FR-001**',task:'T005',taskCount:2,plan:'**Storage**',code:'value.update(name=string',codeKey:'store',test:'"id": "CUSTOM"',behavior:'名称、目标、关注方向与默认视图真实改变工作台，并保存到本机。',limit:'40字、200字、8个标签是本次产品设计；Spec Kit 要求把这些约束明确写下。'},
 {id:'compare',name:'最多 3 项比较',why:'把“支持比较”落实为人数上限、少选指引、具体任务与可运行的检查。',fr:'**FR-004**',task:'T008',taskCount:1,plan:'**Scale/Scope**',code:'function toggleCompare',codeKey:'ui',test:'"id": "US2-B"',behavior:'在目录中选择项目，第4次加入会提示上限，原先3项仍保留。',limit:'Spec Kit 没有提供比较组件；3项上限和界面由 AI 根据本次规格实现。'},
 {id:'notes',name:'编辑冲突保留草稿',why:'把“不要丢数据”落实为旧版本拒绝、表单保留和重新读取入口。',fr:'**FR-008**',task:'T009',taskCount:1,plan:'**Storage**',code:"if version != old['version']",codeKey:'store',test:'"id": "CONFLICT"',behavior:'旧版本保存会被拒绝，当前页面的未提交文字保留，可重新读取。',limit:'版本检查、数据库事务和草稿处理是本次实现；Skill 提供对照需求查缺口的方法。'},
];
const steps=[
 {name:'原始需求',title:'先区分用户原话与代理补充',summary:'用户要求真实演示，具体选择“研究工作台”的范围由代理结合上下文提出。',ruleKey:'input',needle:'用户原文',count:1,ruleTitle:'用户实际输入',ruleExplain:'这一句是开发起点，并没有列出下面所有业务细节。',resultKey:'input',resultNeedle:'代理提出的首版',resultCount:2,resultTitle:'本次采用的场景',resultExplain:'先确定要开发什么，后续再把它写成可检查的规则。'},
 {name:'写规格',title:'Skill 要求：把需求写到能够验证',summary:'speckit-specify 规定提取功能要求、边界和验收条件。AI按这个结构写出本项目的规格。',ruleKey:'skill-specify',needle:'Generate Functional Requirements',count:3,ruleTitle:'speckit-specify · 官方技能原文',ruleExplain:'关键要求：每一条需求必须可测试。',resultKey:'spec',resultTitle:'spec.md · 本次实际规格',resultExplain:'把模糊意图变成明确的产品要求，后续编码和验收使用同一条要求。'},
 {name:'定方案',title:'Skill 要求：结合规格形成实现方案',summary:'speckit-plan 读取规格与项目原则，指导研究技术选择、数据规则和接口约定。',ruleKey:'skill-plan',needle:'Fill Technical Context',count:6,ruleTitle:'speckit-plan · 官方技能原文',ruleExplain:'官方脚本创建方案模板；具体技术取舍由 AI 完成。',resultKey:'plan',resultTitle:'plan.md · 本次实际方案',resultExplain:'本地服务、SQLite和版本检查是这次选择的方案，不是库替我们内置的业务能力。'},
 {name:'拆任务',title:'Skill 要求：把约束带进可执行任务',summary:'speckit-tasks 要求按用户故事组织任务，把数据约束逐字带入任务，减少实现时临时猜测。',ruleKey:'skill-tasks',needle:'For each field with constraints',count:1,ruleTitle:'speckit-tasks · 官方技能原文',ruleExplain:'约束必须进入任务，任务应能独立实施与验证。',resultKey:'tasks',resultTitle:'tasks.md · 实际开发任务',resultExplain:'这里已经指向具体文件，说明要实现什么及应遵守哪些约束。'},
 {name:'写代码',title:'Skill 要求：按任务实现，再对照规格验证',summary:'speckit-implement 指导读取任务、按依赖执行和检查。代码由 AI 实际编写。',ruleKey:'skill-implement',needle:'Check that implemented features match',count:3,ruleTitle:'speckit-implement · 官方技能原文',ruleExplain:'检查实现是否匹配原始规格，而不是只看按钮是否存在。',resultTitle:'产品代码 · 实际实现位置',resultExplain:'这段代码直接执行前面约定的规则。你可以打开完整源文件复核。'},
 {name:'核对结果',title:'Skill 要求：用实现与证据核对完成度',summary:'speckit-converge 对照需求、方案和任务寻找缺口；有缺口就追加任务，修复仍由实现阶段完成。',ruleKey:'skill-converge',needle:'completion claims are not evidence',count:4,ruleTitle:'speckit-converge · 官方技能原文',ruleExplain:'任务打勾不能作为证据，要检查当前行为。',resultKey:'browser',resultTitle:'实际浏览器验收记录',resultExplain:'这些结果由浏览器操作产生；流程本身不自动保证功能正确。'},
];
try{
 const response=await fetch('/api/evidence');if(!response.ok)throw new Error('读取制作记录失败');const data=await response.json();
 $('#reports').replaceChildren();
 for(const [key,label] of [['api','服务端验收'],['browser','浏览器验收']]){const report=data.reports[key],span=document.createElement('span');span.textContent=report?`${label}：${report.passed} 通过 / ${key==='api'?report.failures.length:report.failed} 失败`:`${label}：尚未执行`;$('#reports').append(span)}
 const followup=data.reports.trace;$('#fix-status').textContent=followup?`本次验证：${followup.passed} 通过 / ${followup.failed} 失败 · ${followup.completedAt}`:'修复前已复现；修复后验证记录尚未载入。';
 function show(item){$('#artifact-title').textContent=item.label;$('#source').textContent=item.source;$('#artifact').textContent=item.content;$('#download').href=item.url;document.querySelectorAll('#artifacts button').forEach(b=>b.classList.toggle('active',b.dataset.key===item.key))}
 for(const item of data.artifacts){const b=document.createElement('button');b.textContent=item.label;b.dataset.key=item.key;b.addEventListener('click',()=>show(item));$('#artifacts').append(b)}
 if(data.artifacts.length)show(data.artifacts[0]);
 const files=new Map(data.artifacts.map(a=>[a.key,a]));let chosen=0,stage=1;
 function excerpt(key,needle,count=1){const item=files.get(key);if(!item)return '文件尚未加载，请确认本地服务已更新。';const lines=item.content.split(/\r?\n/);const start=lines.findIndex(line=>line.includes(needle));if(start<0)return '此版本未找到指定片段，请查看完整文件。';return item.source+'\n\n'+lines.slice(start,start+count).map((line,i)=>`${start+i+1}  ${line}`).join('\n')}
 function original(key){const item=files.get(key);if(item){show(item);$('#archive').scrollIntoView({behavior:'smooth',block:'start'})}}
 function renderTrace(){
  const scenario=scenarios[chosen],step=steps[stage];
  document.querySelectorAll('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.case)===chosen)));
  document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.step)===stage?'step':'false'));
  $('#case-reason').textContent=scenario.why;$('#step-counter').textContent=`步骤 ${stage+1} / ${steps.length}`;$('#trace-title').textContent=step.title;$('#trace-summary').textContent=step.summary;
  $('#rule-kicker').textContent=stage===0?'这次的输入':'SPEC KIT 的规定';$('#rule-title').textContent=step.ruleTitle;$('#rule-explanation').textContent=step.ruleExplain;$('#rule-snippet').textContent=excerpt(step.ruleKey,step.needle,step.count);$('#rule-original').onclick=()=>original(step.ruleKey);
  const key=stage===4?scenario.codeKey:step.resultKey;
  const needle=[step.resultNeedle,scenario.fr,scenario.plan,scenario.task,scenario.code,scenario.test][stage];
  const count=stage===3?scenario.taskCount:stage===5?5:step.resultCount||1;
  $('#result-title').textContent=step.resultTitle;$('#result-explanation').textContent=step.resultExplain;$('#result-snippet').textContent=excerpt(key,needle,count);$('#result-original').onclick=()=>original(key);
  $('#trace-boundary').textContent=scenario.limit;$('#product-behavior').textContent=scenario.behavior;$('#product-link').href='/?inspect='+scenario.id;$('#trace-next').textContent=stage===5?'回到原始需求 ↺':'继续下一步 →';
 }
 scenarios.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.name;b.dataset.case=String(i);b.addEventListener('click',()=>{chosen=i;renderTrace()});$('#trace-cases').append(b)});
 steps.forEach((s,i)=>{const b=document.createElement('button');b.textContent=`${i+1} / ${s.name}`;b.dataset.step=String(i);b.addEventListener('click',()=>{stage=i;renderTrace()});$('#trace-steps').append(b)});
 $('#trace-next').addEventListener('click',()=>{stage=(stage+1)%steps.length;renderTrace()});renderTrace();
}catch(e){$('#artifact').textContent=e.message;$('#artifact-title').textContent='暂时无法读取'}
