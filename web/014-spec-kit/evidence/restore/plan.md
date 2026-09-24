# Implementation Plan: 备份恢复

**Date**: 2026-09-22 | **Spec**: [spec.md](spec.md) | **Feature Directory**: 002-restore-backup

## Summary
在原产品加入独立/restore页面和预览、确认恢复、撤销API。以单调全局revision阻止预览过期和恢复后的旧页面误写；事务保存恢复前快照并替换个人字段。

## Technical Context
Language: Python 3.12标准库、原生JS。Storage: 既有SQLite，新增control表存revision、restoreEpoch与最近恢复的undo记录。Tests: unittest存储/API回归、Playwright真实浏览器、独立演示数据库。
Limits: 5MiB备份文件与内容（请求额外容纳1KiB控制字段）、1000任务、16项固定目录；普通API仍64KiB。本地同源、无第三方通信。

## Constitution Check
五项原则均通过：先规格再代码；真实报告；事务保护与独立用户数据；中文界面与有限范围；原项目事实不从上传备份覆盖。设计后复核无例外。

## Project Structure
- app/storage.py: 初始化control表；所有写操作同事务递增revision；state返回revision。
- app/restore.py: 备份字段验证、规范化、摘要/digest、preview/apply/undo服务。
- app/server.py: /api/restore/preview、/apply、/undo、/status，静态restore页面与可选--demo-backup固定样本。
- app/public/restore.html、restore.js: 选择文件→预览差异→确认→撤销。
- app/public/restore-build.html、restore-build.js: 本轮真实开发阶段与证据展示。
- tests/test_restore.py、tests/restore-browser.cjs: 真实验证。
- evidence/restore/: 阶段产物、失败基线、最终报告、演示样本与截图。
- .local/research-restore-demo.sqlite3: 与个人工作台完全分开的演示数据库。

## Design Decisions
1. 复用Store事务上下文；BEGIN IMMEDIATE内核验revision并完成所有替换，失败自动回滚。
2. 上传元数据只取项目ID与个人note/status；其余来源事实沿用当前数据库。拒绝项目集合不一致和重复任务ID。
3. 新增control.revision持久单调递增。普通写入更新revision；restore/undo所有行version用新的revision，避免旧版本再次合法。
4. preview返回规范化内容digest和当前revision，不写任何数据库。apply重新验证上传、比对digest与revision，并原子保存undo快照。
5. 最近undo信息保存在control中；只有当前revision等于appliedRevision时允许撤销，完成后清除undo。重启不丢记录。
6. 专用演示服务仅接受明确的--demo-backup文件参数，个人服务不提供示例加载；演示数据明示可试验。

## Complexity Tracking
新增一个验证模块而非引入框架。数据库control是并发与撤销必要状态；无需恢复作业队列或云存储。

## 实现时边界复核
- restoreEpoch仅在恢复/撤销时递增，新增任务须携带当前代际；旧客户端缺省0仅在首次恢复前兼容。
- 入站备份最多1000任务；内部撤销快照不受入站数量限制，保留全部原任务。
- 5MiB限备份内容，HTTP信封额外1KiB；界面按原始文件字节限制。
- 展示备份的Spec Kit结论时，以可信当前目录ID定位，不信任上传名称。
