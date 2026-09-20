const chapters = [
  {tag:'CHAPTER 01 / 基础原理',title:'语言模型基础',lead:'理解语言模型怎样处理文字、生成内容，以及怎样评估回答表现。',example:'同一个问题可能得到不同措辞的回答。理解采样，有助于解释这种差异；评测则帮助判断结果是否满足任务要求。',mechanism:'以常见自回归模型为例：文字被切成 token，经网络处理后预测下一个 token，再反复生成。流畅不代表事实正确。',fit:'适合：理解生成过程、采样与评测，而不只看回答是否像人写的。'},
  {tag:'CHAPTER 02 / 模型架构',title:'大语言模型',lead:'了解大模型的架构路线，包括编码器、编码器—解码器、解码器及非 Transformer 架构。',example:'阅读模型介绍时，可以理解“Decoder-only”是在描述模型结构，而不是一个质量等级。',mechanism:'架构决定信息如何表示与处理；数据、训练方式和任务同样影响最终表现，不能只凭架构名称判断效果。',fit:'适合：建立技术地图、阅读论文与理解模型说明。'},
  {tag:'CHAPTER 03 / 建议先读',title:'Prompt 工程',lead:'通过任务说明、背景、示例和输出约束，帮助模型理解你要什么。',example:'让 AI 整理会议记录时，提供“决定 / 负责人 / 截止时间”的样例，并要求缺失项写“未提及”。',mechanism:'改变当前输入和上下文；通常不更新模型参数，也不等于永久学会你的习惯。',fit:'适合：写作、提取信息、分类、规范输出格式。'},
  {tag:'CHAPTER 04 / 任务适配',title:'参数高效微调',lead:'通过训练较少的参数，让已有模型适应特定任务，减少相对全量微调的训练负担。',example:'有一批经过检查的行业分类样例，可以用于训练并评估一个更稳定的分类模型；仍需保留独立测试样例。',mechanism:'LoRA 是其中一种方法：冻结原有权重，训练较小的低秩矩阵来表达参数更新。它需要数据、训练与效果验证。',fit:'适合：任务明确、有训练样例，并且基础方案已经过评估的场景。'},
  {tag:'CHAPTER 05 / 进阶研究',title:'模型编辑',lead:'研究怎样有针对性地修正模型中的特定知识或行为，并尽量控制对其他能力的影响。',example:'研究者可以尝试修改一条事实关联，再检查相关问法是否一起改变，以及不相关知识是否受到影响。',mechanism:'不同方法可能附加参数，或定位并修改内部参数。这是研究方向，不能视作一键修复所有错误。',fit:'适合：知识更新、编辑效果与副作用相关的研究。'},
  {tag:'CHAPTER 06 / 建议接着读',title:'检索增强生成 · RAG',lead:'先从外部资料中检索相关内容，再让模型结合这些内容生成回答。',example:'询问公司报销制度时，先找到最新的制度段落，再根据段落回答并提供出处。',mechanism:'为生成过程补充可检索的外部知识。检索不准、资料过期或模型理解错误，仍然可能造成错误答案。',fit:'适合：个人文档、企业知识库与需要参考资料的问答。'}
];
const detail = document.querySelector('#chapter-detail');
document.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => {
  const chapter = chapters[Number(button.dataset.chapter)];
  document.querySelectorAll('[data-chapter]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
  detail.querySelector('.detail-eyebrow').textContent=chapter.tag;
  detail.querySelector('h3').textContent=chapter.title;
  detail.querySelector('.detail-lead').textContent=chapter.lead;
  detail.querySelector('.example p').textContent=chapter.example;
  detail.querySelector('.mechanism p').textContent=chapter.mechanism;
  detail.querySelector('.takeaway').textContent=chapter.fit;
}));
const steps = [
  ['学生获得当前环境信息','例如：现在是午餐时间，食堂 A 排队较长，食堂 B 距离较远。可见信息由场景中的感知逻辑提供。','场景插件'],
  ['角色根据身份与目标选择行动','例如：一位赶课的学生决定前往食堂 B。模型结合角色状态与可见信息提出行动，不代表行动已经执行。','模型 + 决策逻辑'],
  ['系统按场景规则检查行动','例如：检查目的地是否存在、是否开放、角色是否有资格进入。规则需要开发者定义，不能自动保证符合现实。','行为校验'],
  ['执行允许的行动，改变环境状态','例如：把角色移动到目的地，并更新位置或队列信息。具体如何执行，由场景的动作与环境逻辑实现。','动作 + 环境'],
  ['其他角色感知到变化，继续决策','例如：队列变长后，后来者重新选择食堂。重复这些过程，就能观察设定条件下的群体互动。','群体反馈']
];
const stepContent = document.querySelector('#step-content');
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
  const index=Number(button.dataset.step), step=steps[index];
  document.querySelectorAll('[data-step]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  stepContent.querySelector('.step-index').textContent=String(index+1).padStart(2,'0');
  stepContent.querySelector('h4').textContent=step[0];
  stepContent.querySelector('p').textContent=step[1];
  stepContent.querySelector('.responsibility').textContent=step[2];
}));
const navigation = [...document.querySelectorAll('nav a')];
const sections = navigation.map(link=>document.querySelector(link.getAttribute('href')));
let scheduled=false;
function updateNavigation(){
  const current = [...sections].reverse().find(section=>section.getBoundingClientRect().top<=180)||sections[0];
  navigation.forEach(link=>{
    const active=link.getAttribute('href')==='#'+current.id;
    link.classList.toggle('active',active);
    if(active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
  });
  scheduled=false;
}
window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateNavigation);}},{passive:true});
updateNavigation();
