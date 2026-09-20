# 多个 Web 演示的部署约定

已通过 GitHub Actions 发布到 GitHub Pages，2026-09-20 验证总入口、Shotcraft 子页面与 MP4 地址均返回 HTTP 200。

## 公网地址

- [演示总入口](https://yydshly.github.io/0919_codex_project/)
- [001 · Video Shotcraft](https://yydshly.github.io/0919_codex_project/001-video-shotcraft/)

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
3. 使用 Node.js 22，在 Shotcraft 子项目执行 `npm ci` 和 `npm run build:web`。
4. 上传整个 `web/` 目录，由 GitHub Pages 发布。
5. 验证总入口、子页面、静态资源和交互，检查部署任务结果。

本地更新后同样运行 `npm run build:web`，将静态文件一并提交。CI 会从源码重新构建，MP4 使用仓库中已实测的预渲染版本；网页不会在线渲染或自动更新视频。

新增子项目时，需要更新总入口并为对应项目添加构建步骤；现有工作流只自动构建 Shotcraft。浏览器路由优先使用 hash 路由，以免子页面刷新返回 404。

GitHub Pages 提供静态托管。需要服务端的子项目另行部署后端。

参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
