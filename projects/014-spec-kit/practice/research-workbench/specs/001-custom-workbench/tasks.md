# Tasks: 定制研究工作台

依据spec.md、plan.md、data-model.md及contracts/api.md；测试为FR-013明确要求。

## Phase 1: Setup
- [x] T001 提取当前16项真实元数据到app/catalog.json，记录来源和快照时间；实现scripts/snapshot_catalog.py。
- [x] T002 在tests/test_api.py、tests/browser.cjs先建立API/浏览器验收，记录未实现基线到evidence/。

## Phase 2: Foundation
- [x] T003 在app/storage.py实现三个表、逐请求连接与显式事务；version正整数，旧版本409，错误不提交。
- [x] T004 在app/server.py实现固定本地Host/Origin、JSON 64KiB限制、静态和证据白名单、异常响应。

## Phase 3: US1 定制与目录
- [x] T005 [US1] 在app/storage.py实现Settings：name字符串1..40字符、goal字符串0..200字符、focus去重标签列表0..8个、view=all/focus；验证不截断。
- [x] T006 [US1] 在app/public/index.html、style.css、app.js实现定制表单与设置修改；保存成功再进入主界面，失败保留输入。

## Phase 4: US2 查找比较
- [x] T007 [US2] 在app/public/app.js实现16项真实项目卡片、来源、名称/摘要/标签搜索与组合筛选，清除恢复全部。
- [x] T008 [US2] 在app/public/app.js实现2..3项比较与第四项拒绝、局部横向滚动及空状态。

## Phase 5: US3 结论与任务
- [x] T009 [US3] 在app/storage.py和app/public/app.js实现note字符串0..2000字符、status=pending/active/decided；每项目版本冲突提示并保留输入。
- [x] T010 [US3] 在app/storage.py和app/public/app.js实现Task title字符串1..120字符、due空或合法YYYY-MM-DD、done布尔，完成/重开与确认删除。

## Phase 6: US4 导出与过程
- [x] T011 [US4] 在app/server.py实现完整快照JSON与Markdown附件导出，不受页面筛选影响。
- [x] T012 [US4] 在app/public/process.html、process.js实现实际输入/规格/方案/任务/源码/验收查看与下载；缺失报告显示未执行。

## Phase 7: Polish & Validation
- [x] T013 运行tests/test_api.py、tests/browser.cjs验证保存、冲突、重启、错误、导出与390/1440px；保留实际报告与截图到evidence/。
- [x] T014 更新README.md及现有研究网页入口，启动本地产品；按Spec Kit converge核对并保存会话结论副本。

## Dependencies
T001/T002 → T003/T004 → US1 → US2 → US3 → US4 → T013/T014。
US2比较与US3结论业务独立，但当前单代理按顺序避免同一app.js并行写入。

## Parallel Opportunities
测试文档与静态样式可独立准备；本次不额外并行修改。计划阶段只读技术研究已按技能要求委派。

## Implementation Strategy
MVP为US1：定制并真实保存。之后逐故事交付；数据规则集中在服务端，界面复用错误处理。

## Phase 8: Convergence
- [x] T015 修复app/public/app.js首次定制冲突时隐藏重新读取入口的问题；按FR-008保留草稿并允许用户确认后重新读取，新增tests/application-trace.cjs双页面回归（partial，HIGH）。

本次补充说明：T002的实际未实现基线是API服务文件不存在的失败；未记录浏览器业务逐项失败基线。原任务标记不能单独作为验证证据。
