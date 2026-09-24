# Implementation Plan: 研库定制工作台

**Branch**: 未新建分支；脚本返回的001-custom-workbench是目录定位值 | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

## Summary
用已有16项研究数据，开发可定制、可保存、可比较并可导出结论的个人本地工作台。产品与真实制作过程分开呈现。

## Technical Context
**Language/Version**: Python 3.12 标准库；浏览器原生 JavaScript ES modules、HTML、CSS。
**Primary Dependencies**: 运行时零第三方依赖；验收用已有 Playwright/Chromium。
**Storage**: SQLite；settings、projects、tasks各记录有version，条件更新避免旧编辑静默覆盖。
**Testing**: Python unittest/API验收 + Playwright真实浏览器；临时独立数据库与端口，不操作用户数据库。
**Target Platform**: Windows 本机浏览器；390px与1440px。
**Project Type**: 本地单用户 Web 应用。
**Performance Goals**: 16项目录及少量任务的交互响应；不宣称互联网服务容量。
**Constraints**: 仅绑定127.0.0.1；静态资源与证据文件白名单；不公开数据库，不发送外部数据。
**Scale/Scope**: 16项目、一个空间、最多3项比较、中文界面。

## Constitution Check
设计前：五项原则均通过。真实数据由快照脚本提取；保存先提交后显示；独立测试数据库；需求先定义；范围限制明确。
设计后：保留相同检查；本次无例外。并发保护使用每记录version；失败必须保留表单。

## Project Structure
- specs/001-custom-workbench/: spec、plan、research、data-model、contracts、quickstart、tasks。
- app/server.py: HTTP、白名单资源、JSON API、导出。
- app/storage.py: 验证、SQLite持久化、版本条件更新。
- app/public/: index.html、style.css、app.js、process.html、process.js。
- app/catalog.json: 来源当前16项元数据的快照。
- scripts/snapshot_catalog.py: 可复现快照；不读取用户数据。
- tests/test_api.py、tests/browser.cjs: 独立验收。
- evidence/: 实际输入、脚本输出、报告、截图。
- .local/research-workbench.sqlite3（工作区根目录）: 用户数据库，忽略提交。

**Structure Decision**: 一个本地服务同时提供网页和API，无构建框架；单一存储模块集中验证与事务。研究来源与个人字段分开。

## Implementation Strategy
按故事依次实现：首次定制与目录 → 比较 → 结论和待办 → 导出与制作过程。测试先写，执行基线再实现。避免前端全量覆盖服务端状态；写操作仅更新一条记录并带版本。
