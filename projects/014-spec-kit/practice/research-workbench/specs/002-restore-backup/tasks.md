# Tasks: 备份恢复

## Phase 1: Setup
- [x] T001 在tests/test_restore.py建立预览、恢复、撤销、无效输入、并发版本和事务回滚验收，先执行未实现基线并保存evidence/restore/。

## Phase 2: Foundation
- [x] T002 在app/storage.py增加持久全局revision；所有普通写入递增；旧数据库从最大行版本初始化。

## Phase 3: US1 预览
- [x] T003 [US1] 在app/restore.py校验schemaVersion整数1、16项目ID恰好一次、唯一UUID任务0..1000项、Settings名称1..40/目标0..200/关注0..8、note0..2000、任务title1..120与真实日期。
- [x] T004 [US1] 在app/server.py增加只读预览API和5MiB专用上限；在app/public/restore.html与restore.js提供文件选择、预览和摘要。

## Phase 4: US2 恢复
- [x] T005 [US2] 在app/restore.py实现确认校验、digest/revision核验、快照与全量个人字段事务替换；元数据保留且所有行使用新版本。
- [x] T006 [US2] 在app/public/restore.js实现明确确认、更换文件清除预览和错误提示；成功刷新展示恢复结果。

## Phase 5: US3 撤销
- [x] T007 [US3] 在app/restore.py实现持久单次撤销、后续写入拒绝和原子回滚；在restore.js提供撤销及重启后的可用状态。

## Phase 6: US4 真实演示
- [x] T008 [US4] 在app/public/restore-build.html、restore-build.js展示真实阶段文件与本轮验证；标明Skill负责规程、AI负责业务实现。
- [x] T009 [US4] 建立独立演示数据库与真实导出的A版样本、当前B版示例；供加载、恢复与撤销，不触碰个人空间。

## Phase 7: Verification
- [x] T010 在tests/restore-browser.cjs实际运行预览→恢复→撤销、冲突与390/1440px体验；保存真实报告与截图。
- [x] T011 更新README和原页面入口；运行converge对照11项FR及3项SC，保存实际结论。

## Dependencies & Parallel Work
T001→T002→T003/T005/T007；后端和界面按已确定接口分别实施，不同时修改同一文件。UI与存储测试由两个代理独立实施，根代理实现后端和集成。

## Delivery Strategy
先完成只读预览，再加入确认和撤销。导入首版5MiB/1000任务上限明确显示，不静默截断更大备份。
