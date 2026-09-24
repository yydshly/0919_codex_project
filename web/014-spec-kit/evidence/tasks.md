# Tasks: 开源项目收藏夹

Input: spec.md、plan.md、research.md、data-model.md、contracts/ui-and-export.md。
Tests: spec FR-011 明确要求实际浏览器验证；先编写验收，再实现功能。

## Phase 1: Setup
- [x] T001 建立 app/、tests/，在 ../../scripts/build_web.py 增加收藏页及真实证据的构建路径。

## Phase 2: Foundational
- [x] T002 编写 tests/acceptance.cjs，覆盖 FR-001..012，并在实现前记录失败基线。
- [x] T003 在 app/store.js 建立版本化存储，捕获读取/写入/结构错误，失败不覆盖原内容；专属键为 spec-kit-repo-shelf:v1。

## Phase 3: User Story 1 - 收藏与保存 (P1)
Goal: 添加后刷新仍可查看。Independent test: 新增、刷新、重复与非法输入、读取/保存失败。
- [x] T004 [US1] 在 app/index.html 与 app/style.css 建立带标签的表单与初始示例列表。
- [x] T005 [US1] 在 app/store.js 实现名称“1..80字符”、备注“最多300字符”、标签“最多6个，每个1..20字符”、状态“pending 或 reviewed”，GitHub URL 归一化去重。
- [x] T006 [US1] 在 app/app.js 连接新增与渲染，用户文本用 textContent；写成功才显示保存并清空表单；失败保留输入。
- [x] T007 [US1] 运行 tests/acceptance.cjs 的 US1 分组，核对 FR-001/002/003/008/009。

## Phase 4: User Story 2 - 查找与进度 (P2)
Goal: 名称、备注、标签搜索与状态筛选组合。Independent test: 状态切换持久化、无匹配、跨标签页同步。
- [x] T008 [US2] 在 app/app.js 实现搜索、状态过滤、完整数量摘要和清除筛选。
- [x] T009 [US2] 在 app/store.js 与 app/app.js 实现状态切换和 storage 事件同步，保留未提交表单。
- [x] T010 [US2] 运行 tests/acceptance.cjs 的 US2 分组，核对 FR-004/005/012。

## Phase 5: User Story 3 - 导出与整理 (P3)
Goal: 导出完整记录、删除可撤销。Independent test: 筛选后导出全量、删除后新增再撤销、删除全部再刷新。
- [x] T011 [US3] 在 app/app.js 实现 JSON 全量下载与损坏原始存储文本下载。
- [x] T012 [US3] 在 app/store.js 与 app/app.js 实现删除与最近一次撤销；仅恢复被删除条目，不回滚整个数组。
- [x] T013 [US3] 运行 tests/acceptance.cjs 的 US3 分组，核对 FR-006/007/009。

## Phase 6: Polish & Evidence
- [x] T014 在 ../../site/live.html、../../site/live.js、../../site/live.css 建立真实产物查看器；从实际文件构建，不伪造执行结果。
- [x] T015 在 ../../site/index.html 接入真实演示，更新 ../../README.md 与研究说明的验证范围。
- [x] T016 运行 tests/acceptance.cjs 完整验证和手机/桌面视觉检查，将结果记录到 ../../notes/live-run/verification.json，核对 FR-010/011。

## Dependencies & Execution Order
T001 → T002 → T003 → US1 → US2 → US3 → T014..T016。测试和证据不需要外部服务。
US2/US3 可用保存好的集合独立验收；实现顺序仍采用串行，因为共享 app.js/store.js。

## Parallel Opportunities
US1 的样式排版与数据层可以分开；US2 的测试场景检查可与静态文案检查分开；US3 的导出契约阅读可与撤销交互审阅分开。当前主代理串行实现，规划研究已使用独立研究代理。

## Implementation Strategy
先完成可收藏、可刷新保留的 MVP；再增加查找、状态、导出和撤销；最后呈现真实流程文档并进行收敛检查。仅在验证完成后标记任务完成。

## Phase 7: Convergence
- [x] T017 修复 app/index.html 的名称与备注输入静默截断行为，使用 app/store.js 的明确长度校验；保留完整失败输入，并让 tests/acceptance.cjs 的 US1-09 通过。来源 FR-001 与 Edge Cases 的“不截断后偷偷保存”（partial，MEDIUM；实际测试已复现）。
