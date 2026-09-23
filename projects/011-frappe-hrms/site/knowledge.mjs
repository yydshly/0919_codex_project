import { knowledgeGroups, roleExamples, timeExample } from './knowledge-data.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source = path => `https://github.com/frappe/hrms/blob/version-16/${path}`;
const count = () => knowledgeGroups.reduce((sum, group) => sum + group.items.length, 0);

function roleDetail(index) {
  const role = roleExamples[index];
  const format = value => esc(Array.isArray(value) ? value.join('、') : value);
  return `<div><span>数据范围</span><strong>${format(role.scope)}</strong></div><div><span>允许的操作</span><strong>${format(role.actions)}</strong></div><div><span>需要限制</span><strong>${format(role.limits)}</strong></div>`;
}

export function knowledgePage() {
  return `<section class="knowledge-hero"><div><div class="eyebrow">FRAPPE HR / 能力与实现全景</div><h1>从管理业务，到构建企业软件。</h1><p>把我们的理解连成一张图：它能做什么，如何实现，我们可以学到什么。</p></div><div class="knowledge-actions"><a class="button primary" href="map.html" target="_blank" rel="noopener">放大看总览图 ↗</a><a class="button" href="capability-map.svg" download="frappe-hr-capability-map.svg">下载总览图 ↓</a></div></section>
  <div class="knowledge-context"><span><i></i>官方 v16 源码研究</span><span>6 组能力 · ${count()} 个学习维度</span><a href="runtime/README.md" target="_blank" rel="noopener">真实系统的本机运行说明 ↗</a><small>远端网页展示研究内容</small></div>
  <section class="cap-map" aria-labelledby="map-title"><div class="map-caption"><h2 id="map-title">一张图，看懂系统的价值</h2><span>横向读关联，纵向看全貌</span></div>
    <div class="map-columns"><span>能力领域</span><span>业务 · 解决什么问题</span><span>技术 · 如何实现</span><span>学习 · 可以复用什么</span></div>
    ${knowledgeGroups.map((group, index) => `<div class="map-lane"><button class="map-topic" data-knowledge-group="${esc(group.id)}" aria-label="展开${esc(group.title)}的详细分析"><span class="map-number">0${index+1}</span><strong>${esc(group.title)}</strong><small>${esc(group.tagline)}</small><span class="map-read">展开 ${group.items.length} 项 ↗</span></button><div class="map-cell business"><small>业务能力</small><p>${esc(group.business)}</p></div><div class="map-cell technology"><small>技术实现</small><p>${esc(group.technical)}</p></div><div class="map-cell learning"><small>值得学习</small><p>${esc(group.learning)}</p></div></div>`).join('')}
    <div class="map-foundation"><span><b>HRMS</b> 人事与薪酬业务</span><span>↓ 业务扩展</span><span><b>ERPNext</b> 企业基础与财务</span><span>↓ 共享框架</span><span><b>Frappe</b> 模型、权限、接口、任务</span></div>
    <div class="map-takeaway"><strong>核心价值</strong><span>让不同角色，在规则与权限内协作，并得到可追溯的业务结果。</span></div>
  </section>
  <div class="knowledge-section-heading"><div><div class="eyebrow">TWO ESSENTIAL IDEAS</div><h2>两个不能漏掉的设计</h2></div><span>权限决定“谁能做” · 时间决定“何时适用”</span></div>
  <div class="concept-grid"><section class="concept-panel"><div class="concept-heading"><span class="concept-mark">01</span><h3>权限是业务能力的边界</h3></div><p class="concept-intro">同一套数据，按身份、范围、动作和字段分配能力。</p><div class="role-selector" aria-label="选择角色示例">${roleExamples.map((role,index)=>`<button type="button" data-knowledge-role="${index}" aria-pressed="${index===0}">${esc(role.name)}</button>`).join('')}</div><div class="role-detail" id="knowledge-role-detail" aria-live="polite">${roleDetail(0)}</div><div class="concept-callout">有操作权限，还要通过状态、日期、额度等业务校验。</div><p class="concept-boundary">角色示意，需配置数据范围与工作流；本次仅以管理员验证，未完成其他角色的权限测试。</p></section>
  <section class="concept-panel"><div class="concept-heading"><span class="concept-mark">02</span><h3>时间决定规则何时适用</h3></div><p class="concept-intro">操作时间、生效时间、结算期间，是三个不同概念。</p><div class="time-rail"><div><i></i><span>录入调薪</span><strong>${esc(timeExample.recorded)}</strong></div><span class="time-arrow">→</span><div><i></i><span>新工资生效</span><strong>${esc(timeExample.effective)}</strong></div></div><div class="time-periods">${timeExample.periods.map(period=>`<div><span>${esc(period.period)}</span><strong>¥${Number(period.salary).toLocaleString('zh-CN')}</strong><small>${esc(period.note)}</small></div>`).join('')}</div><div class="concept-callout">按生效日期选用规则，避免用“当前值”误算历史期间。</div><p class="concept-boundary">概念示例，不改变真实系统数据。跨月、月中调薪及已提交单据的修正，需要单独定义处理策略。</p></section></div>
  <div class="knowledge-section-heading"><div><div class="eyebrow">FROM SOURCE TO UNDERSTANDING</div><h2>完整理解，逐项展开</h2></div><span>业务 → 技术 → 学习价值 → 实现边界</span></div>
  <section class="knowledge-details" aria-label="完整能力分析">${knowledgeGroups.map((group,index)=>`<details id="knowledge-${esc(group.id)}" class="knowledge-group"><summary><span class="detail-number">0${index+1}</span><span><strong>${esc(group.title)}</strong><small>${esc(group.items.map(item=>item.title).join(' · '))}</small></span><span class="detail-count">${group.items.length} 项</span></summary><div class="knowledge-items">${group.items.map(item=>`<article class="knowledge-item"><h3>${esc(item.title)}</h3><dl><div><dt>业务问题</dt><dd>${esc(item.business)}</dd></div><div><dt>技术实现</dt><dd>${esc(item.technical)}</dd></div><div><dt>学习价值</dt><dd>${esc(item.learning)}</dd></div></dl>${item.example?`<p class="item-example"><b>例如</b>${esc(item.example)}</p>`:''}${item.boundary?`<p class="item-boundary"><b>边界</b>${esc(item.boundary)}</p>`:''}${item.sourcePath?`<a class="item-source" href="${source(item.sourcePath)}" target="_blank" rel="noopener">查看 v16 源码依据 ↗</a>`:''}</article>`).join('')}</div></details>`).join('')}</section>
  <section class="evidence-panel"><div><div class="eyebrow">VERIFIED LOCALLY</div><h2>我们已经验证到哪一步？</h2><p>已运行官方 HRMS 16.19.0，导入 6 位虚拟员工，验证请假影响计薪与工资结果。</p><div class="verified-flow"><span>基本工资 <b>¥12,000</b></span><span>→ 无薪假 <b>1 天</b></span><span>→ 计薪 <b>21 / 22 天</b></span><span>→ 净工资 <b>¥11,454.55</b></span></div><p class="evidence-boundary">示例未计算个税、社保；默认圆整额另为 11,455 元。这里展示可复用的设计，不承诺所有接口幂等、所有操作防篡改或全部业务离线可用。真实上线还需验证权限、并发、恢复与地区薪税规则。</p><a href="runtime/README.md" target="_blank">查看本地运行与验证说明 ↗</a></div><a class="evidence-image" href="real-hrms-payroll.png" target="_blank" aria-label="放大真实系统工资单截图"><img src="real-hrms-payroll.png" alt="官方工资单显示周予安净工资 11,454.55 元" loading="lazy"></a></section>
  <div class="learning-priority"><strong>建议学习顺序</strong><span>数据建模</span><i>→</i><span>权限边界</span><i>→</i><span>流程与时间</span><i>→</i><span>规则计算</span><i>→</i><span>失败处理与演进</span></div>`;
}

document.addEventListener('click', event => {
  const group = event.target.closest('[data-knowledge-group]');
  if (group) {
    const detail = document.getElementById(`knowledge-${group.dataset.knowledgeGroup}`);
    if (!detail) return;
    detail.open = true;
    detail.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'});
    detail.querySelector('summary').focus({preventScroll:true});
  }
  const role = event.target.closest('[data-knowledge-role]');
  if (role) {
    document.querySelectorAll('[data-knowledge-role]').forEach(button => button.setAttribute('aria-pressed', String(button === role)));
    document.getElementById('knowledge-role-detail').innerHTML = roleDetail(Number(role.dataset.knowledgeRole));
  }
});
