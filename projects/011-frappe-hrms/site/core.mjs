// Original educational model. This is not the Frappe payroll engine.
export const employees = [
  { id: 'HR-001', name: '林知夏', initials: '林', department: '产品设计', role: '产品设计师', salary: 18000, leave: 8, color: 'purple', joined: '2024-03-18' },
  { id: 'HR-002', name: '陈屿', initials: '陈', department: '研发中心', role: '前端工程师', salary: 22000, leave: 10, color: 'blue', joined: '2023-08-07' },
  { id: 'HR-003', name: '周予安', initials: '周', department: '市场运营', role: '内容运营', salary: 12000, leave: 6, color: 'orange', joined: '2025-01-13' },
  { id: 'HR-004', name: '许嘉宁', initials: '许', department: '研发中心', role: '后端工程师', salary: 24000, leave: 10, color: 'green', joined: '2023-06-12' },
  { id: 'HR-005', name: '宋一禾', initials: '宋', department: '产品设计', role: '产品经理', salary: 20000, leave: 8, color: 'pink', joined: '2024-05-20' },
  { id: 'HR-006', name: '陆远', initials: '陆', department: '市场运营', role: '市场专员', salary: 10000, leave: 5, color: 'cyan', joined: '2025-11-03' },
];
export const PERIOD = '2026 年 9 月';
export const WORK_DAYS = 22;
export const STORAGE_KEY = 'frappe-hr-capability-demo-v1';
export function initialState() {
  return { version: 1, nextId: 4, revision: 0, payroll: null,
    requests: [
      { id: 1, employee: 'HR-001', type: '年假', days: 2, reason: '休息调整', status: '待审批' },
      { id: 2, employee: 'HR-003', type: '无薪假', days: 1, reason: '处理个人事务', status: '待审批' },
      { id: 3, employee: 'HR-006', type: '年假', days: 0.5, reason: '家庭安排', status: '待审批' },
    ], events: [{ text: '演示工作区已准备：6 名虚拟员工、3 笔待审批申请。', time: '初始数据' }] };
}
export function employeeById(id) { return employees.find(e => e.id === id); }
export function approvedDays(state, id, type) {
  return state.requests.filter(r => r.employee === id && r.status === '已批准' && r.type === type).reduce((s, r) => s + r.days, 0);
}
export function balance(state, id) { return employeeById(id).leave - approvedDays(state, id, '年假'); }
function record(state, text) {
  state.events.unshift({ text, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) });
  state.events = state.events.slice(0, 30);
}
export function createRequest(state, input) {
  const { employee, type, reason } = input;
  const days = Number(input.days);
  if (!employeeById(employee)) throw new Error('请选择有效员工。');
  if (!['年假', '无薪假'].includes(type)) throw new Error('请选择年假或无薪假。');
  if (!Number.isFinite(days) || days < 0.5 || days > 5 || days * 2 !== Math.floor(days * 2)) throw new Error('请输入 0.5–5 天，以半天为单位。');
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 80) throw new Error('请填写 1–80 字的请假事由。');
  if (type === '年假' && days > balance(state, employee)) throw new Error('申请天数超过当前年假余额。');
  const request = { id: state.nextId++, employee, type, days, reason: reason.trim(), status: '待审批' };
  state.requests.unshift(request);
  record(state, `${employeeById(employee).name}提交了 ${days} 天${type}申请。`);
  return request;
}
export function transition(state, id, status) {
  const request = state.requests.find(r => r.id === id);
  if (!request) throw new Error('申请不存在。');
  if (!(request.status === '待审批' && ['已批准', '已拒绝'].includes(status)) && !(request.status === '已批准' && status === '已撤销')) throw new Error('申请状态已变化，请刷新后重试。');
  if (status === '已批准') {
    if (request.type === '年假' && request.days > balance(state, request.employee)) throw new Error('年假余额不足，无法批准。');
    const total = approvedDays(state, request.employee, '年假') + approvedDays(state, request.employee, '无薪假');
    if (total + request.days > WORK_DAYS) throw new Error('本月累计请假超过演示计薪天数。');
  }
  request.status = status;
  if (['已批准', '已撤销'].includes(status)) state.revision++;
  record(state, `${employeeById(request.employee).name}的 ${request.days} 天${request.type}${status}。${status === '已批准' || status === '已撤销' ? '假期台账与考勤已同步。' : ''}`);
}
export function payrollRows(state) {
  return employees.map(e => {
    const unpaid = approvedDays(state, e.id, '无薪假');
    const deduction = Math.round(e.salary / WORK_DAYS * unpaid * 100) / 100;
    return { ...e, unpaid, deduction, pay: Math.round((e.salary - deduction) * 100) / 100 };
  });
}
export function calculatePayroll(state) {
  state.payroll = { revision: state.revision, rows: payrollRows(state) };
  record(state, '已按当前批准的请假数据重新试算 6 位员工的工资。');
  return state.payroll;
}
export function loadState(storage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!value || value.version !== 1 || !Array.isArray(value.requests) || !Number.isInteger(value.nextId)) return initialState();
    // Validate records independently so pending/revoked requests do not consume balance.
    const restored = initialState();
    restored.requests = []; restored.events = []; restored.nextId = 1;
    const ids = new Set();
    for (const item of value.requests) {
      if (!Number.isInteger(item.id) || item.id < 1 || ids.has(item.id)) throw new Error('Invalid ID');
      ids.add(item.id);
      const validation = initialState();
      const request = createRequest(validation, item);
      if (!['待审批', '已批准', '已拒绝', '已撤销'].includes(item.status)) throw new Error('Invalid status');
      restored.requests.push({ ...request, id: item.id, status: item.status });
    }
    for (const e of employees) {
      if (balance(restored, e.id) < 0 || approvedDays(restored, e.id, '年假') + approvedDays(restored, e.id, '无薪假') > WORK_DAYS) throw new Error('Invalid totals');
    }
    restored.requests.sort((a, b) => b.id - a.id);
    restored.nextId = Math.max(0, ...ids) + 1;
    // Recreated snapshots have to match the approved-data revision.
    restored.payroll = null;
    restored.events = [{ text: '已恢复本浏览器的演示申请；工资可按当前数据重新试算。', time: '重新打开' }];
    return restored;
  } catch { return initialState(); }
}
