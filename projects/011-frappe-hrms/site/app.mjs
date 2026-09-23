import { employees, WORK_DAYS, STORAGE_KEY, initialState, employeeById, approvedDays, balance, createRequest, transition, payrollRows, calculatePayroll, loadState } from './core.mjs';
import { knowledgePage } from './knowledge.mjs';

const $ = s => document.querySelector(s);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = value => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(value);
let state;
try { state = loadState(localStorage); } catch { state = initialState(); }
let route = 'overview';
let leaveFilter = '全部';
let employeeQuery = '';
let employeeDepartment = '全部部门';
let architectureIndex = 0;
let toastTimeout;
let focusBeforeDialog;
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18m-5 5h5v4h-5z"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12a20 20 0 0 0 18 0M12 12v4"/>',
  star: '<path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z"/>',
  book: '<path d="M12 6c-3-3-6-3-9-2v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-3-1-6-1-9 2Zm0 0v15"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
};
function icon(name, size = 19) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.layers}</svg>`; }
const pages = [
  ['map', '能力与价值全景', 'layers'],
  ['overview', '工作台总览', 'grid'], ['employees', '员工档案', 'people'], ['leave', '请假审批', 'calendar'],
  ['attendance', '考勤台账', 'clock'], ['payroll', '工资试算', 'wallet'], ['capabilities', '完整能力', 'layers'], ['architecture', '原理与价值', 'code'],
];
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { notify('浏览器无法保存，本次操作仍在当前页面生效。'); } }
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 4200); }
function avatar(e) { return `<span class="avatar ${e.color}">${e.initials}</span>`; }
function person(e) { return `<div class="person">${avatar(e)}<div><strong>${e.name}</strong><small>${e.department}</small></div></div>`; }
function badge(status) { return `<span class="badge ${{ '待审批': 'pending', '已批准': 'approved', '已拒绝': 'rejected', '已撤销': 'neutral' }[status] || 'neutral'}">${escape(status)}</span>`; }
function button(label, action, primary = false, extra = '') { return `<button type="button" class="button ${primary ? 'primary' : ''}" data-action="${action}" ${extra}>${label}</button>`; }
function heading(title, description, actions = '', eyebrow = '') { return `<div class="heading-row"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`; }
function metric(label, value, unit, note, symbol) { return `<div class="metric"><div class="metric-label">${label}<span class="metric-icon">${icon(symbol, 16)}</span></div><div class="metric-value">${value}<span>${unit}</span></div><div class="metric-note">${note}</div></div>`; }
function note(text, title = '关于这个演示') { return `<div class="tip-card">${icon('info')}<div><strong>${title}</strong>${text}</div></div>`; }
function pendingCount() { return state.requests.filter(r => r.status === '待审批').length; }
function go(next) { if (location.hash === `#${next}`) render(); else location.hash = next; }
function updateNav() { $('#navigation').innerHTML = pages.map(([id, title, symbol]) => `<a href="#${id}" class="nav-item ${route === id ? 'active' : ''}" ${route === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${title}</span>${id === 'leave' && pendingCount() ? `<span class="nav-count">${pendingCount()}</span>` : ''}</a>`).join(''); $('#page-label').textContent = pages.find(p => p[0] === route)[1]; }
function requestsTable(requests, compact = false) {
  if (!requests.length) return '<div class="empty-state">暂无符合条件的申请。你可以新建一笔请假，体验完整流程。</div>';
  return `<div class="table-scroll"><table><thead><tr><th>员工</th><th>请假类型</th><th>天数</th>${compact ? '' : '<th>事由</th><th>状态</th>'}<th>操作</th></tr></thead><tbody>${requests.map(r => `<tr><td>${person(employeeById(r.employee))}</td><td>${r.type}</td><td class="number">${r.days} 天</td>${compact ? '' : `<td>${escape(r.reason)}</td><td>${badge(r.status)}</td>`}<td>${r.status === '待审批' ? `<button class="action-link" data-action="review" data-id="${r.id}" aria-label="审核${employeeById(r.employee).name}的${r.type}申请">查看审批 →</button>` : r.status === '已批准' ? `<button class="action-link" data-action="cancel-request" data-id="${r.id}">撤销审批</button>` : '<span class="text-muted">已结束</span>'}</td></tr>`).join('')}</tbody></table></div>`;
}
function overview() {
  const approved = state.requests.filter(r => r.status === '已批准').length;
  const payrollReady = state.payroll && state.payroll.revision === state.revision;
  const sum = payrollRows(state).reduce((s, e) => s + e.pay, 0);
  return heading('每一件人事工作，都有迹可循。', '从一笔请假开始，看看员工、考勤和薪酬如何连接。', button(`${icon('plus', 17)} 新建请假`, 'new-request', true), 'PEOPLE OPERATIONS / 人事工作台') +
    `<div class="metrics">${metric('在职员工', '6', '人', '3 个部门 · 全部为虚拟档案', 'people')}${metric('待审批申请', pendingCount(), '笔', `${approved} 笔已批准 · 可直接操作`, 'calendar')}${metric('已批准请假', state.requests.filter(r => r.status === '已批准').reduce((s, r) => s + r.days, 0), '天', '自动联动假期余额与考勤', 'clock')}${metric('本月模拟应发', (sum / 10000).toFixed(2), '万元', '仅演示基本工资与无薪假扣款', 'wallet')}</div>` +
    `<section class="flow-panel"><div class="flow-head"><div><h2>体验一次完整的人事数据流转</h2><p>批准一笔无薪假，再到工资试算中查看扣款变化。</p></div><span class="flow-caption">可操作的业务联动</span></div><div class="flow-steps">${[['employees', '员工档案', '统一维护人员信息', true], ['leave', '请假审批', approved ? `${approved} 笔申请已批准` : pendingCount() + ' 笔申请待处理', approved > 0], ['attendance', '考勤台账', approved ? '已同步批准记录' : '审批后自动同步', approved > 0], ['payroll', '工资试算', payrollReady ? '计算结果已更新' : '按考勤重新计算', payrollReady]].map(([id, title, sub, done], i) => `<button class="flow-step ${done ? 'is-done' : ''}" data-action="navigate" data-route="${id}"><span class="step-number">${done ? icon('check', 15) : `0${i + 1}`}</span><span><strong>${title}</strong><small>${sub}</small></span></button>`).join('')}</div></section>` +
    `<div class="two-columns"><div><section class="panel"><div class="panel-heading"><h2>待办审批 <span class="count">${pendingCount()}</span></h2><a href="#leave">查看全部 →</a></div>${requestsTable(state.requests.filter(r => r.status === '待审批').slice(0, 4), true)}<div class="table-subtitle">批准后，相关员工的假期余额与考勤记录会同步更新。</div></section>${note('这里模拟 Frappe HR 的业务关系。完整系统还包括招聘、入职、绩效、培训与报销，可在“完整能力”中探索。', '从一条流程，理解一整套系统')}</div><div class="right-column"><section class="panel"><div class="panel-heading"><h2>团队分布</h2><span class="text-muted"><small>6 人</small></span></div><div class="panel-body">${['研发中心', '产品设计', '市场运营'].map((d, i) => `<div class="dept-row"><div class="dept-line"><span>${d}</span><span>2 人 / 33.3%</span></div><div class="bar"><span style="width:33.3%;background:${['#5b86e5', '#97aff0', '#c0cff0'][i]}"></span></div></div>`).join('')}</div><div class="department-footer">档案是请假、考勤、工资的共同基础</div></section><section class="panel"><div class="panel-heading"><h2>最近动态</h2>${icon('clock', 16)}</div><div class="panel-body">${state.events.slice(0, 3).map(e => `<div class="activity-item"><span class="activity-line"></span><div>${escape(e.text)}<small>${escape(e.time)}</small></div></div>`).join('')}</div></section></div></div>`;
}
function employeeCards() {
  const filtered = employees.filter(e => (employeeDepartment === '全部部门' || employeeDepartment === e.department) && `${e.name}${e.id}${e.role}`.toLowerCase().includes(employeeQuery.toLowerCase()));
  return filtered.length ? filtered.map(e => `<article class="employee-card"><div class="employee-top">${avatar(e)}<span class="badge approved">在职</span></div><h2>${e.name}</h2><p>${e.role} · ${e.department}</p><div class="employee-fields"><div><span>员工编号</span>${e.id}</div><div><span>年假剩余</span><strong class="text-blue">${balance(state, e.id)} 天</strong></div><div><span>入职日期</span>${e.joined}</div><div><span>基本月薪 · 模拟</span>${money(e.salary)}</div></div><button class="action-link" data-action="employee-detail" data-employee="${e.id}">查看关联记录 →</button></article>`).join('') : '<div class="empty-state">没有找到匹配的员工，请调整姓名或部门筛选。</div>';
}
function employeePage() { return heading('员工档案', '人员信息只维护一次，后续流程使用同一份档案。') + `<div class="toolbar"><input class="input" id="employee-search" aria-label="搜索员工" placeholder="搜索姓名、编号或岗位" value="${escape(employeeQuery)}"><select id="department" aria-label="筛选部门">${['全部部门', '研发中心', '产品设计', '市场运营'].map(d => `<option ${employeeDepartment === d ? 'selected' : ''}>${d}</option>`).join('')}</select><span class="text-muted"><small>共 6 位虚拟员工</small></span></div><div class="employee-grid" id="employee-grid">${employeeCards()}</div>` + note('本页用于展示统一员工档案及关联查询。新增员工、调动、晋升、入离职办理是上游系统能力，本演示没有实现完整生命周期管理。'); }
function leavePage() { return heading('请假审批', '批准申请，让假期余额、考勤与工资规则一起发生变化。', button(`${icon('plus', 17)} 新建请假`, 'new-request', true)) + `<div class="notice">本演示的申请统一计入 2026 年 9 月；以天数展示联动，不模拟日期重叠校验。年假只扣假期余额，无薪假影响工资。</div><div class="toolbar"><div class="segmented" aria-label="审批状态筛选">${['全部', '待审批', '已批准', '已拒绝', '已撤销'].map(s => `<button class="${s === leaveFilter ? 'selected' : ''}" data-action="filter-leave" data-filter="${s}" aria-pressed="${s === leaveFilter}">${s}</button>`).join('')}</div></div><section class="panel">${requestsTable(state.requests.filter(r => leaveFilter === '全部' || r.status === leaveFilter))}</section>` + note('可以批准、拒绝申请，也可以撤销已批准的申请。撤销后，年假余额和考勤会恢复；已生成的工资试算会提示需要重新计算。', '试试看：流程支持反向恢复'); }
function attendancePage() {
  return heading('考勤台账', '查看审批记录如何变成可供核薪使用的数据。', '<a class="button" href="#leave">前往请假审批 →</a>') + `<div class="notice">演示基数固定为 22 天。蓝色表示假定出勤，紫色表示已批准年假，橙色表示已批准无薪假。本页没有接入打卡设备。</div><div class="attend-legend"><span><b></b>假定出勤</span><span><b class="paid"></b>带薪年假</span><span><b class="unpaid"></b>无薪假</span></div><section class="panel"><div class="panel-heading"><h2>2026 年 9 月 · 汇总</h2><span class="badge approved">与审批记录实时联动</span></div><div class="table-scroll"><table><thead><tr><th>员工</th><th>假定出勤</th><th>年假</th><th>无薪假</th><th>计薪天数</th><th>天数分布</th></tr></thead><tbody>${employees.map(e => { const paid = approvedDays(state, e.id, '年假'); const unpaid = approvedDays(state, e.id, '无薪假'); return `<tr><td>${person(e)}</td><td>${WORK_DAYS - paid - unpaid} 天</td><td>${paid} 天</td><td class="${unpaid ? 'text-orange' : 'text-muted'}">${unpaid} 天</td><td>${WORK_DAYS - unpaid} 天</td><td><div class="attendance-bar" aria-label="假定出勤${WORK_DAYS - paid - unpaid}天，年假${paid}天，无薪假${unpaid}天"><span class="present" style="width:${(WORK_DAYS - paid - unpaid) / WORK_DAYS * 100}%"></span><span class="paid" style="width:${paid / WORK_DAYS * 100}%"></span><span class="unpaid" style="width:${unpaid / WORK_DAYS * 100}%"></span></div></td></tr>`; }).join('')}</tbody></table></div></section>` + note('上游还可以接收 Employee Checkin 打卡记录，并结合班次和自动考勤规则生成 Attendance；本演示仅实现批准请假后的汇总关系。', '真实系统还会处理打卡与班次');
}
function payrollPage() {
  const snapshot = state.payroll;
  const stale = snapshot && snapshot.revision !== state.revision;
  const rows = snapshot ? snapshot.rows : payrollRows(state);
  return heading('工资试算', '把审批产生的考勤变化，转换为一张能解释的工资单。', button(`${icon('reset', 16)} ${snapshot ? '重新计算' : '生成工资试算'}`, 'calculate', true)) +
    `<div class="notice ${stale ? 'warning' : ''}">${stale ? '审批数据已变化，下方仍是上一次试算结果。请点击“重新计算”更新工资单。' : snapshot ? '已按当前批准的请假记录生成试算结果。可查看每位员工的工资明细。' : '下方为实时预估。点击“生成工资试算”保存当前计算结果并查看工资明细。'}</div><div class="salary-total"><div><span>${snapshot ? '已生成试算' : '实时预估'} · 6 位员工</span><strong>${money(rows.reduce((s, e) => s + e.pay, 0))}</strong></div><div class="salary-formula">基本工资 − 基本工资 ÷ 22 × 无薪假天数<br><small class="text-muted">教学简化公式 · 不含个税、社保、公积金及其他项目</small></div></div><section class="panel"><div class="table-scroll"><table><thead><tr><th>员工</th><th>基本工资</th><th>无薪假</th><th>模拟扣款</th><th>模拟应发</th><th>明细</th></tr></thead><tbody>${rows.map(e => `<tr><td>${person(e)}</td><td class="number">${money(e.salary)}</td><td>${e.unpaid} 天</td><td class="number ${e.deduction ? 'text-orange' : 'text-muted'}">${money(e.deduction)}</td><td class="number"><strong>${money(e.pay)}</strong></td><td><button class="action-link" data-action="payslip" data-employee="${e.id}" ${!snapshot ? 'disabled' : ''}>查看工资单</button></td></tr>`).join('')}</tbody></table></div><div class="table-subtitle">本演示不产生真实工资单、不提交会计凭证、不发起银行付款。</div></section>` + note('真实 Frappe HR 支持工资组件、条件和公式、工资结构分配、税额计算与批量核薪，并能关联 ERPNext 会计记录。地区薪税规则需要单独核对和配置。', '真实薪酬引擎比这个示例更完整');
}
const modules = [
  { title: '员工生命周期', symbol: 'people', intro: '把员工从入职、调动、晋升到离职的记录连起来。', scenario: '新员工即将入职，人事需要协调资料、设备、培训和各部门任务。', flow: '入职模板 → 入职任务 → 员工档案 → 调动 / 晋升 → 离职交接', value: '减少跨部门遗漏，保留连续的人事记录。', doc: 'employee-lifecycle-management', demo: 'employees' },
  { title: '招聘与面试', symbol: 'briefcase', intro: '管理招聘需求、职位、候选人、面试反馈和录用。', scenario: '一个岗位有多位候选人、多轮面试，需要统一跟进进度与评价。', flow: '招聘需求 → 职位发布 → 候选人 → 面试与反馈 → Offer', value: '把散落在表格和聊天中的招聘进度集中起来。', doc: 'recruitment' },
  { title: '请假与考勤', symbol: 'calendar', intro: '管理假期额度、审批、打卡与班次，生成考勤记录。', scenario: '员工轮班且经常请假，月底需要把审批和出勤数据对应起来。', flow: '假期政策 / 班次 → 申请或打卡 → 审批 / 自动考勤 → 考勤台账', value: '让考勤与假期余额使用一致的数据。', doc: 'attendance', demo: 'leave' },
  { title: '薪酬与工资单', symbol: 'wallet', intro: '配置工资结构与计算规则，批量生成工资单。', scenario: '员工工资由基本工资、补贴、奖金和扣款组成，并受到计薪天数影响。', flow: '工资组件 → 工资结构 → 员工分配 → 批量计算 → 工资单与记账', value: '减少重复计算，并保留可解释的工资明细。', doc: 'payroll-management', demo: 'payroll' },
  { title: '报销与预支', symbol: 'wallet', intro: '从费用申请、多级审批到 ERPNext 财务记录。', scenario: '员工出差前申请预支，回来后提交费用并核销。', flow: '员工预支 → 费用申请 → 审批 → 核销 / 支付记录', value: '把申请和账务连接起来，减少对账工作。', doc: 'expense-claim' },
  { title: '目标与绩效', symbol: 'star', intro: '按考评周期记录目标、自评、反馈和绩效结果。', scenario: '团队进行季度考评，需要把目标进度与多方反馈放在一起。', flow: '考评周期 → 目标 / 关键结果领域 → 自评与反馈 → 考评结果', value: '让绩效讨论有连续记录，而不仅靠期末印象。', doc: 'appraisal' },
  { title: '培训与发展', symbol: 'book', intro: '维护培训计划、培训活动、结果及反馈。', scenario: '新员工培训或技能提升项目需要跟踪参与情况和结果。', flow: '培训计划 → 培训活动 → 结果记录 → 反馈', value: '沉淀培训过程，帮助了解员工发展情况。', doc: 'training-program' },
  { title: '移动员工自助', symbol: 'people', intro: '员工在手机上请假、打卡，主管查看并处理申请。', scenario: '外勤员工和主管不常坐在电脑前，需要随时处理日常事务。', flow: '手机端 → 登录员工身份 → 发起 / 审批 → 数据同步', value: '减少依赖人事代办，缩短日常处理链路。', doc: 'introduction' },
  { title: '扩展与系统集成', symbol: 'code', intro: '利用自定义字段、工作流和接口适配企业流程。', scenario: '企业想保留现有消息平台或打卡设备，同时使用统一的人事后台。', flow: '外部应用 → 身份与权限 → API → 业务单据 → 后续流程', value: '在已有业务模型上增加适配能力；具体接口对接需要开发。', doc: 'introduction' },
];
function capabilitiesPage() { return heading('一套系统，贯穿员工全生命周期。', '点击模块，了解实际场景、业务流程与使用价值。') + `<div class="notice">标有“可交互体验”的模块包含本地模拟。其余卡片是官方能力说明，尚未逐项验证。页面内操作是教学模拟；真实系统可从独立入口打开。</div><div class="module-grid">${modules.map((m, i) => `<article class="module-card"><span class="module-icon">${icon(m.symbol, 22)}</span><h2>${m.title}</h2><p>${m.intro}</p><button class="action-link" data-action="module" data-id="${i}">${m.demo ? '可交互体验 · ' : ''}了解使用场景 →</button></article>`).join('')}</div>`; }
const architecture = [
  ['业务界面', '员工端与管理端', '从同一套数据，面向不同角色提供入口。', '管理端使用 Frappe Desk 的标准表单与列表；仓库中的员工前端使用 Vue、Ionic 和 Frappe UI，并配置了 PWA 支持。', '员工提交请假、主管审批、人事查询记录，最终都操作相关业务单据。这个实验室是独立编写的教学界面。', 'https://github.com/frappe/hrms/blob/version-16/frontend/package.json', '前端依赖配置'],
  ['业务模型与规则', 'DocType + Python', '先定义一张业务单据，再规定它如何变化。', 'DocType 定义字段、数据关联和界面元信息。Python 控制器在校验、提交和取消等事件中执行业务规则。', 'Leave Application 校验假期余额和日期重叠；批准并提交后更新考勤与假期台账；取消时执行对应恢复逻辑。', 'https://github.com/frappe/hrms/blob/version-16/hrms/hr/doctype/leave_application/leave_application.py', '请假控制器源码'],
  ['通用服务', 'Frappe Framework', '把权限、接口和后台任务作为共用基础。', 'Frappe 提供身份验证、角色权限、数据库访问与 REST API。后台工作进程处理异步任务，调度器执行定期工作。', 'HRMS 配置自动考勤、面试提醒等定时任务。外部系统可以经授权接口接入，具体对接逻辑需开发。', 'https://docs.frappe.io/framework/user/en/api/rest', 'Frappe API 文档'],
  ['企业数据与财务', 'ERPNext + 数据服务', '让人事与薪资可以关联企业账务。', 'HRMS 当前声明依赖 ERPNext，复用相关基础资料与财务能力。仓库开发部署示例包括 MariaDB、Redis 和 Frappe 服务。', 'Payroll Entry 批量生成工资单，并可创建相关会计凭证。部署需要匹配的 Frappe、ERPNext 与 HRMS 版本。', 'https://github.com/frappe/hrms/blob/version-16/hrms/hooks.py', '依赖与事件配置'],
];
function archDetail() { const a = architecture[architectureIndex]; return `<div class="eyebrow">LAYER 0${architectureIndex + 1}</div><h2>${a[2]}</h2><p>${a[3]}</p><div class="arch-example">${a[4]}</div><a href="${a[5]}" target="_blank" rel="noreferrer">${a[6]} ↗</a>`; }
function architecturePage() { return heading('理解原理，也判断它是否适合你。', 'Frappe 提供技术基础，ERPNext 提供关联业务能力，HRMS 实现人事与薪酬流程。') + `<div class="architecture"><div class="arch-nav">${architecture.map((a, i) => `<button class="arch-node ${i === architectureIndex ? 'active' : ''}" data-action="architecture" data-id="${i}" aria-pressed="${i === architectureIndex}"><span class="step-number">0${i + 1}</span><span>${a[0]}<small>${a[1]}</small></span></button>`).join('')}</div><div class="arch-detail">${archDetail()}</div></div><div class="section-space"><h2>对你意味着什么？</h2><div class="scenario-grid"><article class="scenario"><h3>管理自己的团队</h3><p>当人员、考勤和核薪散落在多个表格中，可以评估用统一流程减少重复录入。只有简单通讯录需求时，整套系统可能过重。</p></article><article class="scenario"><h3>开发企业软件</h3><p>复用业务模型，把投入放在行业规则和现有系统适配上。二次开发需要同时理解 Frappe 与 ERPNext。</p></article><article class="scenario"><h3>构建 AI 业务助手</h3><p>可以在接口上增加查询假期、整理待办或准备申请草稿的助手。需要额外开发，并按操作人的权限访问业务数据。</p></article></div></div>${note('本页为独立教学界面；已在本机另行运行官方 HRMS 16.19.0。正式使用需完成组织、权限、假期及工资规则配置，并验证地区薪税适配。上游采用 GPL-3.0；对外分发修改版时应核对许可要求。', '部署与使用边界')}<div class="source-list"><a href="https://github.com/frappe/hrms" target="_blank" rel="noreferrer">上游仓库 ↗</a><a href="https://docs.frappe.io/hr/introduction" target="_blank" rel="noreferrer">官方功能文档 ↗</a><a href="https://docs.frappe.io/framework/user/en/basics/doctypes" target="_blank" rel="noreferrer">DocType 原理 ↗</a><a href="research.md" target="_blank">本项目研究说明 ↗</a><button class="action-link" data-action="reset">重置本地演示数据</button></div>`; }
function render() {
  const next = location.hash.slice(1) || 'map';
  route = pages.some(p => p[0] === next) ? next : 'overview';
  updateNav();
  $('#content').innerHTML = ({ map: knowledgePage, overview, employees: employeePage, leave: leavePage, attendance: attendancePage, payroll: payrollPage, capabilities: capabilitiesPage, architecture: architecturePage })[route]();
  document.title = `${pages.find(p => p[0] === route)[1]} · Frappe HR 能力实验室`;
}
function openDialog(title, body, footer = '') {
  focusBeforeDialog = document.activeElement;
  $('#dialog-content').innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="close" data-action="close" aria-label="关闭对话框">×</button></div>${body}${footer ? `<div class="dialog-footer">${footer}</div>` : ''}`;
  $('#dialog').setAttribute('aria-labelledby', 'dialog-title');
  $('#dialog').showModal();
}
function closeDialog() { $('#dialog').close(); }
$('#dialog').addEventListener('close', () => { if (focusBeforeDialog?.isConnected) focusBeforeDialog.focus(); else $('#content').focus({ preventScroll: true }); });
function newRequest() {
  openDialog('新建请假申请', `<form id="request-form"><div class="dialog-body"><p>申请统一计入 2026 年 9 月。提交后可在请假审批中处理。</p><div class="form-field"><label for="request-employee">员工</label><select id="request-employee" name="employee">${employees.map(e => `<option value="${e.id}">${e.name} · ${e.department}</option>`).join('')}</select></div><div class="form-field"><label for="request-type">请假类型</label><select id="request-type" name="type"><option>年假</option><option>无薪假</option></select><small id="leave-hint">当前年假余额 ${balance(state, employees[0].id)} 天；年假不扣工资。</small></div><div class="form-field"><label for="request-days">请假天数</label><input id="request-days" name="days" type="number" min="0.5" max="5" step="0.5" value="1" required><small>每笔 0.5–5 天；此演示不选择具体日期。</small></div><div class="form-field"><label for="request-reason">请假事由</label><textarea id="request-reason" name="reason" rows="2" maxlength="80" placeholder="例如：处理个人事务" required></textarea></div><div class="form-error" id="form-error" role="alert"></div></div><div class="dialog-footer">${button('取消', 'close')}<button type="submit" class="button primary">提交申请</button></div></form>`);
}
function review(id) {
  const r = state.requests.find(r => r.id === id); const e = employeeById(r.employee);
  const impact = r.type === '年假' ? `年假余额从 ${balance(state, e.id)} 天变为 ${balance(state, e.id) - r.days} 天；工资不变。` : `增加 ${r.days} 天无薪假；按简化公式新增模拟扣款 ${money(e.salary / WORK_DAYS * r.days)}。`;
  openDialog('审批请假申请', `<div class="dialog-body">${person(e)}<div class="detail-pair"><span>申请期间</span>2026 年 9 月</div><div class="detail-pair"><span>类型 / 天数</span>${r.type} / ${r.days} 天</div><div class="detail-pair"><span>事由</span>${escape(r.reason)}</div><div class="notice section-space">批准后的变化：${impact}</div><div class="form-error" id="form-error" role="alert"></div></div>`, `${button('拒绝', 'decision', false, `data-id="${id}" data-status="已拒绝"`)}${button('批准申请', 'decision', true, `data-id="${id}" data-status="已批准"`)}`);
}
function showEmployee(id) {
  const e = employeeById(id); const linked = state.requests.filter(r => r.employee === id);
  openDialog(`${e.name}的关联记录`, `<div class="dialog-body">${person(e)}<div class="detail-pair"><span>岗位</span>${e.role}</div><div class="detail-pair"><span>年假余额</span>${balance(state, id)} 天</div><div class="detail-pair"><span>已批准无薪假</span>${approvedDays(state, id, '无薪假')} 天</div><h3 class="section-space">本月请假申请</h3>${linked.length ? linked.map(r => `<div class="detail-pair"><span>${r.type} · ${r.days} 天</span>${badge(r.status)}</div>`).join('') : '<p class="section-space">本月暂无请假申请。</p>'}</div>`, button('关闭', 'close'));
}
function showPayslip(id) {
  const e = state.payroll?.rows.find(e => e.id === id); if (!e) return;
  const stale = state.payroll.revision !== state.revision;
  openDialog(`${e.name} · 模拟工资单`, `<div class="dialog-body"><p>2026 年 9 月 · ${e.id}</p>${stale ? '<div class="notice warning">此工资单已过期，请关闭后重新计算。</div>' : ''}<div class="detail-pair"><span>基本工资</span>${money(e.salary)}</div><div class="detail-pair"><span>固定计算基数</span>${WORK_DAYS} 天</div><div class="detail-pair"><span>已批准无薪假</span>${e.unpaid} 天</div><div class="detail-pair"><span>无薪假扣款</span>−${money(e.deduction)}</div><div class="payroll-result"><span>模拟应发</span><strong>${money(e.pay)}</strong></div><p class="section-space">公式：${e.salary} − ${e.salary} ÷ ${WORK_DAYS} × ${e.unpaid}。不含个税、社保、公积金；此金额不是实发工资。</p></div>`, button('关闭', 'close'));
}
function showModule(index) { const m = modules[index]; openDialog(m.title, `<div class="dialog-body"><div class="eyebrow">使用场景</div><p>${m.scenario}</p><div class="eyebrow section-space">业务流程</div><div class="arch-example">${m.flow}</div><div class="eyebrow">实际价值</div><p>${m.value}</p><a href="https://docs.frappe.io/hr/${m.doc}" target="_blank" rel="noreferrer">查看官方文档 ↗</a>${!m.demo ? '<p class="section-space">此模块仅作能力说明，未在本演示中实现业务操作。</p>' : ''}</div>`, m.demo ? button('进入交互体验 →', 'module-navigate', true, `data-route="${m.demo}"`) : button('了解了', 'close')); }
document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('#content').focus(); return; }
  const target = event.target.closest('[data-action]'); if (!target) return;
  const { action } = target.dataset; const id = Number(target.dataset.id);
  try {
    if (action === 'new-request') newRequest();
    else if (action === 'close') closeDialog();
    else if (action === 'navigate') go(target.dataset.route);
    else if (action === 'review') review(id);
    else if (action === 'employee-detail') showEmployee(target.dataset.employee);
    else if (action === 'filter-leave') { leaveFilter = target.dataset.filter; render(); document.querySelector(`[data-filter="${leaveFilter}"]`)?.focus({ preventScroll: true }); }
    else if (action === 'decision') { transition(state, id, target.dataset.status); persist(); closeDialog(); render(); notify(target.dataset.status === '已批准' ? '申请已批准，假期余额与考勤已同步。' : '申请已拒绝，假期与工资不受影响。'); }
    else if (action === 'cancel-request') { openDialog('撤销这笔审批？', '<div class="dialog-body"><p>撤销后将恢复相关假期余额和考勤。已有工资试算需要重新计算。</p></div>', button('保留审批', 'close') + button('确认撤销', 'confirm-cancel', true, `data-id="${id}"`)); }
    else if (action === 'confirm-cancel') { transition(state, id, '已撤销'); persist(); closeDialog(); render(); notify('审批已撤销，相关台账已恢复。'); }
    else if (action === 'calculate') { calculatePayroll(state); persist(); render(); document.querySelector('[data-action="calculate"]')?.focus({ preventScroll: true }); notify('工资试算已更新，可以查看每位员工的计算明细。'); }
    else if (action === 'payslip') showPayslip(target.dataset.employee);
    else if (action === 'module') showModule(id);
    else if (action === 'module-navigate') { closeDialog(); go(target.dataset.route); }
    else if (action === 'architecture') { architectureIndex = id; render(); document.querySelector(`[data-action="architecture"][data-id="${id}"]`)?.focus({ preventScroll: true }); }
    else if (action === 'reset') openDialog('重置本地演示数据？', '<div class="dialog-body"><p>本浏览器中的申请、审批和工资试算将恢复到最初的虚拟数据。</p></div>', button('取消', 'close') + button('确认重置', 'confirm-reset', true));
    else if (action === 'confirm-reset') { state = initialState(); leaveFilter = '全部'; employeeQuery = ''; employeeDepartment = '全部部门'; persist(); closeDialog(); go('overview'); notify('已恢复初始演示数据。'); }
  } catch (error) { if ($('#dialog').open && $('#form-error')) $('#form-error').textContent = error.message; else notify(error.message); }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'request-form') return;
  event.preventDefault();
  try { createRequest(state, Object.fromEntries(new FormData(event.target))); persist(); leaveFilter = '待审批'; closeDialog(); go('leave'); notify('请假申请已提交，可以继续体验审批。'); } catch (error) { $('#form-error').textContent = error.message; }
});
document.addEventListener('input', event => {
  if (event.target.id === 'employee-search') { employeeQuery = event.target.value; $('#employee-grid').innerHTML = employeeCards(); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'department') { employeeDepartment = event.target.value; $('#employee-grid').innerHTML = employeeCards(); }
  if (['request-type', 'request-employee'].includes(event.target.id)) $('#leave-hint').textContent = $('#request-type').value === '年假' ? `当前年假余额 ${balance(state, $('#request-employee').value)} 天；年假不扣工资。` : '无薪假不扣年假余额；批准后会影响工资试算。';
});
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'instant' }); $('#content').focus({ preventScroll: true }); });
render();
