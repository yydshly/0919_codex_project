# 多个 Web 演示的部署约定

已通过 GitHub Actions 发布到 GitHub Pages，2026-09-20 验证总入口、Shotcraft 子页面与 MP4 地址均返回 HTTP 200。

## 公网地址

- [演示总入口](https://yydshly.github.io/0919_codex_project/)
- [001 · Video Shotcraft](https://yydshly.github.io/0919_codex_project/001-video-shotcraft/)
- [002 · BrightBean Studio](https://yydshly.github.io/0919_codex_project/002-brightbean-studio/) · [接入引导图](https://yydshly.github.io/0919_codex_project/002-brightbean-studio/#guide)

同一仓库的多个演示使用 `NNN-slug/` 子路径，编号与研究目录对应。

## 源码与发布文件

- 研究说明与演示源码放在 `projects/NNN-slug/`，保留各自的依赖锁定文件。
- 可发布的静态文件汇总到 `web/NNN-slug/`；`web/index.html` 是演示总入口。
- Shotcraft 使用相对资源路径，并将 Remotion 纹理路径解析到当前子目录，支持仓库站点的多级路径。
- 部署成功且验证可访问后，填写对应 `project.json` 的 `demo`，运行 `python scripts/project.py sync` 更新索引。

## 发布流程

仓库 Pages 发布源已设置为 GitHub Actions。工作流见 [pages.yml](../.github/workflows/pages.yml)。

1. 推送到 `main` 或手动触发 **Deploy research demos**。
2. 校验项目元信息与 README 索引。
3. 构建 BrightBean 研究页：`python projects/002-brightbean-studio/scripts/build_web.py`；使用 Node.js 22，在 Shotcraft 子项目执行 `npm ci` 和 `npm run build:web`。
4. 上传整个 `web/` 目录，由 GitHub Pages 发布。
5. 验证总入口、子页面、静态资源和交互，检查部署任务结果。

本地更新后同样运行 `npm run build:web`，将静态文件一并提交。CI 会从源码重新构建，MP4 使用仓库中已实测的预渲染版本；网页不会在线渲染或自动更新视频。

新增子项目时，需要更新总入口并为对应项目添加构建步骤；现有工作流自动构建 Shotcraft 与 BrightBean 研究页。BrightBean 源码位于 `projects/002-brightbean-studio/site/`，输出至 `web/002-brightbean-studio/`，无第三方前端依赖；已于 2026-09-20 发布并验证页面、图像、文档与交互。浏览器路由优先使用 hash 路由，以免子页面刷新返回 404。

GitHub Pages 提供静态托管。需要服务端的子项目另行部署后端。

参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 003 · 大模型教材与群体模拟

源码：`projects/003-llm-foundations-agent-kernel/site/`；构建：`python projects/003-llm-foundations-agent-kernel/scripts/build_web.py`；输出：`web/003-llm-foundations-agent-kernel/`。现有工作流已增加该构建步骤。2026-09-20 已发布并验证 [003 在线研究页](https://yydshly.github.io/0919_codex_project/003-llm-foundations-agent-kernel/)、总览 PNG / SVG、产品方向文档与交互；元信息的 `demo` 已填写。

## 004 · Blinko 笔记记录软件

源码：`projects/004-blinko/site/`；构建：`python projects/004-blinko/scripts/build_web.py`；输出：`web/004-blinko/`。工作流会构建此页。

页面使用本次部署的真实截图作为封面和引导图，整理笔记软件定位、与 ReflectFlow 的重叠、RAG 原理与验证范围。GitHub Pages 仅提供研究和部署效果展示；完整 Blinko 服务仍在本机运行，没有向公网开放数据库或登录服务。

2026-09-20 已成功部署并验证 [004 在线研究页](https://yydshly.github.io/0919_codex_project/004-blinko/) 和真实截图（HTTP 200）；元信息的 `demo` 已填写。

## 006 · Leak Check 理解与产品探索

源码：`projects/006-leak-check/site/`；构建：`python projects/006-leak-check/scripts/build_web.py`；输出：`web/006-leak-check/`。引导图使用已经完成的探索全景图，提供 SVG 放大查看与高清 PNG 下载。摘要同时说明原库能力、分轮关联原理、数据来源边界、邮件盘点探索和对我们的意义。

发布范围为静态研究网页与拾迹原型。公网不运行邮箱连接后端，不提供真实个人信息查询；拾迹仅可体验示例与本地文件分析。新增邮箱适配及真实账号验证仍暂缓。

2026-09-23 已发布并验证：[006 在线研究页](https://yydshly.github.io/0919_codex_project/006-leak-check/)。研究页、全景图、文档和静态原型已确认可访问；在线演示元信息已填写。[发布验证记录](../projects/006-leak-check/notes/publication.md)。
