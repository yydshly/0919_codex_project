const scenarios = {
  budget: {
    request: '“帮我做一个记账工具，能知道每个月钱花在哪里。”',
    stages: [
      { title:'把“记账工具”说具体', description:'AI 按模板整理功能与边界。先确认你想得到的结果，避免做到一半才发现理解不同。', file:'spec.md', doc:'个人记账 · 需求说明', rows:[['要有的功能','录入收入和支出，按月份、分类查看合计。'],['首版的边界','只给自己用，暂不接银行、不做家庭共享。'],['怎样算完成','新增一笔 28 元餐饮支出，当月餐饮合计增加 28 元。']], decision:'是否需要多设备同步？是否支持删除和修改？关键选择先写清楚。' },
      { title:'确定这件事怎么实现', description:'AI 结合需求、现有项目和你的限制，制定技术方案，记录选择的理由。', file:'plan.md', doc:'个人记账 · 实施方案', rows:[['使用方式','做成浏览器中的小工具，手机也能访问页面。'],['记录结构','每笔记录包含金额、收支类型、分类和日期。'],['本例选择','先存到当前浏览器；换设备不会自动同步，需要说明备份方式。']], decision:'确认“只存在当前浏览器”是否能接受，别等做完才要求云同步。' },
      { title:'拆成能逐项完成的任务', description:'AI 把方案拆成具体工作，标出依赖关系与对应文件。任务清单帮助后续工作接着做。', file:'tasks.md', doc:'个人记账 · 任务清单', rows:[['T001','建立收支记录的数据结构与保存功能。'],['T002','制作金额、分类、日期的录入表单。'],['T003','实现月度筛选与分类合计。'],['T004','按本例要求，测试小数金额、删除记录后的统计。']], decision:'确认顺序与范围。本例明确要求测试；安装工具并不代表测试会自动充分覆盖。', caption:'任务会依实际项目标明文件位置；这里为简化节选。' },
      { title:'让 AI 按任务修改代码', description:'在接入的 AI 编程工具中执行实现指令。AI 读取需求与方案，完成任务、运行要求的检查并记录进度。', file:'代码文件 + tasks.md', doc:'个人记账 · 实现过程示意', rows:[['已做','录入表单、记录保存和月度合计。'],['待做','删除记录后，统计结果需要重新计算。'],['要检查','刷新页面后记录是否保留？金额相加是否准确？']], decision:'打开实际页面试用，确认交互和结果符合你的使用习惯。', caption:'这是教学状态，不代表本网页已实际生成或测试记账工具。' },
      { title:'对照需求，找出还没做完的', description:'AI 用完成度检查指令对照当前代码。发现缺口后追加任务，再回到实现阶段补做。', file:'tasks.md · 追加任务', doc:'个人记账 · 剩余工作', rows:[['检查依据','删除记录后，该月份和分类的金额应该同步减少。'],['发现缺口','假设记录已删除，但页面的合计仍保留旧值。'],['追加任务','T005：修复统计更新，按原场景重新验证。']], decision:'以实际行为和测试证据验收。任务打勾、AI 说完成，都不能单独证明没有问题。', caption:'converge 找缺口并追加任务；implement 负责实际补做。' }
    ]
  },
  gallery: {
    request:'“我的图片太多了，帮我做一个能按日期整理的工具。”',
    stages:[
      {title:'“整理图片”到底指什么？',description:'AI 把模糊的“整理”展开成具体行为，写明哪些事情包含在首版里。',file:'spec.md',doc:'图片整理 · 需求说明',rows:[['要有的功能','选择一批图片，按日期分组，查看缩略图。'],['首版的边界','整理分类和预览，不修改、移动或删除原始文件。'],['怎样算完成','没有拍摄日期的图片，进入“日期未知”分组。']],decision:'按拍摄日期还是文件日期分组？这些日期不一定相同。'},
      {title:'把图片处理方式定下来',description:'AI 研究可用方案，把文件读取、日期来源和预览方式写进计划。',file:'plan.md',doc:'图片整理 · 实施方案',rows:[['读取方式','由用户主动选择图片，在浏览器内处理。'],['日期策略','尝试读取拍摄信息；没有日期时进入未知分组。'],['预览策略','生成缩略图用于浏览，保留原图不变。']],decision:'是否接受首版只支持常见图片格式？需要明确格式和大小限制。'},
      {title:'把功能拆成连续的小步',description:'先解决导入，再处理分组，最后展示。每个任务都对应已确认的需求。',file:'tasks.md',doc:'图片整理 · 任务清单',rows:[['T001','加入文件选择与格式校验。'],['T002','读取日期并构建分组结果。'],['T003','实现缩略图网格和分组切换。'],['T004','验证缺少日期、重复选择和无法读取的图片。']],decision:'确认错误图片应该如何提示，是否允许跳过后继续整理。'},
      {title:'逐项实现导入与浏览',description:'AI 根据计划编写代码，并针对本例约定的异常情况运行检查。',file:'代码文件 + tasks.md',doc:'图片整理 · 实现过程示意',rows:[['已做','导入图片、日期分组、缩略图展示。'],['待做','增加没有拍摄日期的样本检查。'],['要检查','异常图片是否会让其他图片无法显示？']],decision:'用自己的几种图片试用，确认分类结果符合预期。',caption:'本页没有读取你的图片；展示的是预先编写的教学案例。'},
      {title:'检查那些容易漏掉的情况',description:'AI 对照需求与代码找出缺口，把剩余工作追加到清单中。',file:'tasks.md · 追加任务',doc:'图片整理 · 剩余工作',rows:[['检查依据','无拍摄日期的图片必须仍然可以浏览。'],['发现缺口','假设程序跳过了这类图片，用户看不到它们。'],['追加任务','T005：补上“日期未知”分组并验证样本。']],decision:'确保正常图片和异常图片都得到约定的处理，再结束这个功能。',caption:'检查命令本身不修代码；追加任务交给实现阶段。'}
    ]
  },
  export: {
    request:'“给现有网站的订单列表加一个导出表格的功能。”',
    stages:[
      {title:'先说清楚导出哪些内容',description:'对已有项目，AI 需要同时明确新增行为与应保持的现有行为。',file:'spec.md',doc:'订单导出 · 需求说明',rows:[['要有的功能','导出当前筛选条件下的订单为 CSV 文件。'],['兼容边界','沿用现有登录权限；不改变已有列表接口。'],['怎样算完成','导出的订单与筛选结果一致，包含全部符合条件的记录。']],decision:'导出当前一页，还是筛选后的全部记录？这是两个不同需求。'},
      {title:'沿用已有项目的规则',description:'AI 阅读现有代码和约定，优先复用已有筛选、权限判断及数据获取方式。',file:'plan.md',doc:'订单导出 · 实施方案',rows:[['复用能力','复用现有订单查询和权限检查。'],['输出内容','统一日期、金额与列名，导出 CSV。'],['异常处理','明确无结果、请求失败以及大数据量的处理方式。']],decision:'确认允许导出的字段，哪些内部信息不应出现在表格里。'},
      {title:'把兼容要求也放进任务',description:'任务覆盖新增功能，也覆盖“不影响原有行为”的验证。',file:'tasks.md',doc:'订单导出 · 任务清单',rows:[['T001','实现受权限限制的导出数据查询。'],['T002','生成 CSV，并正确处理逗号和换行。'],['T003','添加导出按钮、进度及失败提示。'],['T004','验证筛选一致、权限隔离和原列表功能。']],decision:'确认验收需要哪些测试账号和订单样本。'},
      {title:'围绕现有代码完成修改',description:'AI 按清单修改项目，运行约定的检查。你可以同时审阅代码和需求文档。',file:'代码文件 + tasks.md',doc:'订单导出 · 实现过程示意',rows:[['已做','导出按钮和 CSV 文件生成。'],['待做','补上不同用户权限的验证。'],['要检查','一个用户是否只能导出自己有权查看的订单？']],decision:'用实际筛选条件打开导出的文件，核对行数、字段与权限。',caption:'案例没有连接真实订单系统，也不会下载用户数据。'},
      {title:'验证“增加功能”没有破坏约定',description:'AI 对照范围、方案和任务，检查漏做或与原约定冲突的部分。',file:'tasks.md · 追加任务',doc:'订单导出 · 剩余工作',rows:[['检查依据','所有导出都必须沿用现有权限规则。'],['发现缺口','假设导出查询漏传当前用户的权限条件。'],['追加任务','T005：补齐权限过滤并用不同账号验证。']],decision:'兼容和权限检查通过后，再按项目原有发布流程上线。',caption:'Spec Kit 的完成度结论不能替代真实测试或发布验证。'}
    ]
  }
};
const steps=[['说清需求','明确做什么','specify'],['制定方案','确定怎么做','plan'],['拆分任务','变成待办清单','tasks'],['开始实现','让 AI 按清单做','implement'],['检查遗漏','对照需求补做','converge']];
const fitContent={
  product:['适合尝试完整流程','让下一次迭代有据可查。','长期工具会不断加功能、修问题。留下需求与技术决策，可以减少每次重新解释和来回返工。','挑一个范围清楚的小功能，走一遍“需求 → 方案 → 任务 → 实现 → 检查”。'],
  feature:['适合从一个功能开始','在现有项目上，小步接入。','不需要先把整个系统重新写成说明书。明确新增功能，以及不能改变的现有行为，再规划实现。','用“订单导出”这样的独立改动试用；先阅读现有代码、测试与项目约定。'],
  small:['完整流程通常偏重','直接完成小修改更省事。','改文案、调颜色或修一个明确的小错误，通常不需要先生成多份文档。可保留简单的需求和验证要求。','直接说明修改位置、预期效果和验收方式；复杂起来后再引入结构化流程。'],
  idea:['可选：想法评估扩展','先判断是否值得投入。','评估扩展帮助整理问题、研究证据、形成方案并做决定。它是独立入口，需要按需安装；不必先走开发流程。','说清谁有这个问题、现在如何解决、需要什么证据，再决定继续、补充信息或停止。']
};
let selectedCase='budget', selectedStep=0;
const byId=id=>document.getElementById(id);
function render(){
  const example=scenarios[selectedCase], stage=example.stages[selectedStep];
  byId('request-text').textContent=example.request;
  byId('stage-kicker').textContent=`STEP 0${selectedStep+1} / ${steps[selectedStep][0]}`;
  byId('stage-command').textContent=steps[selectedStep][2];
  byId('stage-title').textContent=stage.title;
  byId('stage-description').textContent=stage.description;
  byId('file-name').textContent=stage.file;
  const body=byId('document-body'); body.replaceChildren();
  const heading=document.createElement('p'); heading.className='doc-title';heading.textContent=stage.doc;body.append(heading);
  const list=document.createElement('ul');list.className='doc-rows';
  stage.rows.forEach(([label,description])=>{const li=document.createElement('li');const bullet=document.createElement('span');bullet.className='bullet';bullet.textContent=selectedStep===2?'□':'—';const text=document.createElement('span');const strong=document.createElement('strong');strong.textContent=label+'：';text.append(strong,document.createTextNode(description));li.append(bullet,text);list.append(li)});body.append(list);
  if(stage.caption){const caption=document.createElement('p');caption.className='doc-caption';caption.textContent=stage.caption;body.append(caption)}
  byId('human-input').textContent=stage.decision;
  byId('step-count').textContent=`0${selectedStep+1} / 05`;
  byId('next-step').textContent=selectedStep===4?'回到第一步 ↺':'看下一步 →';
  document.querySelectorAll('[data-case]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.case===selectedCase)));
  document.querySelectorAll('[data-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.step)===selectedStep)));
}
steps.forEach(([title,subtitle],index)=>{const button=document.createElement('button');button.type='button';button.dataset.step=index;button.setAttribute('aria-controls','stage-title');button.innerHTML=`<span class="step-number">0${index+1}</span><span><strong>${title}</strong><small>${subtitle}</small></span><span class="step-arrow" aria-hidden="true">↗</span>`;button.addEventListener('click',()=>{selectedStep=index;render()});document.querySelector('.step-list').append(button)});
document.querySelectorAll('[data-case]').forEach(button=>button.addEventListener('click',()=>{selectedCase=button.dataset.case;render()}));
byId('next-step').addEventListener('click',()=>{selectedStep=(selectedStep+1)%5;render()});
function selectFit(key){const [label,title,text,start]=fitContent[key];byId('fit-label').textContent=label;byId('fit-title').textContent=title;byId('fit-text').textContent=text;byId('fit-start').textContent=start;document.querySelectorAll('[data-fit]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.fit===key)))}
document.querySelectorAll('[data-fit]').forEach(button=>button.addEventListener('click',()=>selectFit(button.dataset.fit)));
render();selectFit('product');
