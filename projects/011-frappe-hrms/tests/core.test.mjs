import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, balance, approvedDays, createRequest, transition, payrollRows, calculatePayroll, loadState } from '../site/core.mjs';

test('approved annual leave updates balance but not salary; cancellation reverses it', () => {
  const s = initialState(); transition(s, 1, '已批准');
  assert.equal(balance(s, 'HR-001'), 6);
  assert.equal(approvedDays(s, 'HR-001', '年假'), 2);
  assert.equal(payrollRows(s)[0].pay, 18000);
  transition(s, 1, '已撤销'); assert.equal(balance(s, 'HR-001'), 8);
  assert.throws(() => transition(s, 1, '已批准'));
});
test('unpaid leave deducts money and invalidates previous snapshots', () => {
  const s = initialState(); calculatePayroll(s); transition(s, 2, '已批准');
  assert.notEqual(s.payroll.revision, s.revision);
  assert.equal(s.payroll.rows[2].pay, 12000);
  calculatePayroll(s); assert.equal(s.payroll.rows[2].deduction, 545.45);
  assert.equal(s.payroll.rows[2].pay, 11454.55);
  transition(s, 2, '已撤销'); calculatePayroll(s); assert.equal(s.payroll.rows[2].pay, 12000);
});
test('rejection has no effect on balance or salary and cannot be approved later', () => {
  const s = initialState(); transition(s, 3, '已拒绝');
  assert.equal(balance(s, 'HR-006'), 5); assert.equal(s.revision, 0);
  assert.throws(() => transition(s, 3, '已批准'));
});
test('approval rechecks annual balance, even when pending requests were individually valid', () => {
  const s = initialState(); const input = { employee: 'HR-006', type: '年假', days: 5, reason: '休息' };
  const a = createRequest(s, input); const b = createRequest(s, input);
  transition(s, a.id, '已批准'); assert.throws(() => transition(s, b.id, '已批准'), /余额不足/);
  assert.equal(b.status, '待审批'); assert.equal(balance(s, 'HR-006'), 0);
});
test('invalid employee, type, days and reason do not create records', () => {
  const s = initialState(); const input = { employee: 'HR-001', type: '年假', days: 1, reason: '休息' };
  for (const patch of [{ employee: 'x' }, { type: 'other' }, { days: -1 }, { days: NaN }, { days: 0.2 }, { days: 6 }, { reason: ' ' }, { reason: 'x'.repeat(81) }]) assert.throws(() => createRequest(s, { ...input, ...patch }));
  assert.equal(s.requests.length, 3);
});
test('monthly leave cannot exceed demo workdays', () => {
  const s = initialState();
  for (let i = 0; i < 4; i++) transition(s, createRequest(s, { employee: 'HR-004', type: '无薪假', days: 5, reason: '测试' }).id, '已批准');
  const next = createRequest(s, { employee: 'HR-004', type: '无薪假', days: 5, reason: '测试' });
  assert.throws(() => transition(s, next.id, '已批准'), /累计/);
});
test('browser persistence restores approvals, pending and revoked records without order-dependent balance errors', () => {
  const s = initialState();
  const first = createRequest(s, { employee: 'HR-006', type: '年假', days: 5, reason: '申请一' });
  const second = createRequest(s, { employee: 'HR-006', type: '年假', days: 5, reason: '申请二' });
  transition(s, second.id, '已批准'); transition(s, second.id, '已撤销'); transition(s, first.id, '已批准');
  calculatePayroll(s);
  const restored = loadState({ getItem: () => JSON.stringify(s) });
  assert.equal(restored.requests.length, 5); assert.equal(balance(restored, 'HR-006'), 0);
  assert.equal(restored.payroll, null); assert.equal(restored.nextId, 6);
});
test('corrupt browser state and unavailable storage fall back to initial data', () => {
  for (const source of ['garbage', '{}', JSON.stringify({ ...initialState(), requests: [{ id: 1, employee: 'unknown' }] })]) assert.deepEqual(loadState({ getItem: () => source }), initialState());
  assert.deepEqual(loadState({ getItem: () => { throw new Error('blocked'); } }), initialState());
});
