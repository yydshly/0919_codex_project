# Implementation Plan: 开源项目收藏夹

**Branch**: no Git branch created; feature id `001-resource-shelf` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-resource-shelf/spec.md`

## Summary
构建一个中文本地收藏夹，并把真实开发文档接入现有 Spec Kit 说明页。采用原生 HTML/CSS/JavaScript、浏览器本地存储、Blob 下载；无服务器、账号或第三方前端依赖。由 Codex 读取 Spec Kit 1.0.9 的技能执行本工作流。

## Technical Context

**Language/Version**: HTML5, CSS, JavaScript ES2022; build Python 3.10+.
**Primary Dependencies**: 无生产依赖；验证复用工作区现有 Playwright + Chromium。
**Storage**: localStorage，专属键 `spec-kit-repo-shelf:v1`，版本化 JSON。
**Testing**: Playwright 用户行为断言、下载文件解析、刷新、存储异常注入、响应式检查。
**Target Platform**: 现代桌面及手机浏览器，HTTP 静态预览；320px 起。
**Project Type**: 静态单页应用 + 开发证据查看器。
**Performance Goals**: 面向几十至数百条个人收藏；不承诺大数据吞吐，过滤在本机完成。
**Constraints**: 相对资源路径；不联网获取仓库内容；读取和写入均捕获错误；用户文本用 textContent 渲染。
**Scale/Scope**: 三个用户故事、一个收藏页、一个实际流程查看页、十二项需求。

## Constitution Check

- Real work: CLI 初始化和辅助脚本有实际日志；文档由代理按安装技能产出，明确署名与来源。PASS。
- Local data: 用户记录只写专属 localStorage 键；导出由用户点击；无远程写入。PASS。
- Verifiable journeys: 建立对应需求的实际浏览器验证。PASS。
- Recoverable actions: 保存后才更新界面；删除记录仅保存最近一条供撤销；损坏数据不覆盖。PASS。
- Simplicity/accessibility: 原生三文件页面，无运行时库，明确表单标签，移动布局。PASS。

Phase 0 研究前和 Phase 1 设计后均通过。无未决技术问题。

## Project Structure

### Documentation (this feature)
```text
specs/001-resource-shelf/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/ui-and-export.md
  checklists/requirements.md
  tasks.md
```

### Source Code (practice project root)
```text
app/
  index.html
  style.css
  app.js
  store.js
tests/
  acceptance.cjs
```

Integration in parent `projects/014-spec-kit/`:
```text
site/live.html              实际执行流程及产物查看器
site/live.js                查看构建时嵌入的真实文件
site/live.css
scripts/build_web.py       复制 app 到 web/014-spec-kit/app，打包证据到 evidence
notes/live-run/             CLI 日志、过程说明、实际测试结果
```

**Structure Decision**: 收藏夹与既有教学示例分开，清楚标注实际产物。证据查看器只打包明确列出的开发文件，不读取用户存储、环境变量或认证资料。

## Implementation Decisions

- 提供三条初始示例，首次成功写入后才显示为已保存；存储空数组时不得重新播种。
- 仓库 URL 限定 github.com 的 owner/repo，统一 HTTPS，去掉尾斜杠、.git、查询与片段，owner/repo 小写作为去重键。
- 存储模块在每次变更前重读、构造新集合、保存成功后返回；DOM 仅在成功后更新。
- 搜索与状态过滤只改变视图。导出调用完整数据集合。
- 最近删除只保存该记录及位置，撤销插入到最新集合，不恢复旧数组。
- 监听 storage 事件；无事务性并发保证。
- 原始存储损坏时锁定写操作，提供原始文本导出，不提供自动清空按钮。
- 页面以表单、数量摘要、搜索/筛选、卡片列表构成；状态成功提示与错误区域分开。
- 在功能实现完成后执行 converge，根据真实检查发现追加任务，不故意植入缺陷制造成功故事。
