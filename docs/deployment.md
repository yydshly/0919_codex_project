# 多个 Web 演示的部署约定

已接入 `001-video-shotcraft` 静态演示与总入口，并配置 `.github/workflows/pages.yml`；首次发布结果待验证。

## 一个站点，多个子路径

GitHub Pages 每个仓库对应一个项目站点，可在站点下通过不同子目录承载多个静态演示。计划使用以下路径：

```text
https://yydshly.github.io/0919_codex_project/
https://yydshly.github.io/0919_codex_project/001-example-project/
https://yydshly.github.io/0919_codex_project/002-another-project/
```

以上为未来公网地址示例；当前已有本地演示，尚未部署对应公网地址。

## 源码与发布文件

- 研究说明与演示源码放在 `projects/NNN-slug/` 下。
- 各项目分别安装依赖、构建，保留各自的依赖锁定文件。
- 将可发布的静态文件汇总到 `web/NNN-slug/`，后续统一上传整个 `web/` 目录。
- `web/index.html` 是演示总入口，已收录 `001-video-shotcraft`。该演示通过子项目内的 `npm run build:web` 构建并同步。
- 部署成功且地址验证可访问后，再填写对应 `project.json` 的 `demo` 并同步首页。

## 部署流程

1. 确认演示可以输出 HTML、CSS、JavaScript 等静态文件。
2. 将资源基础路径设置为 `/0919_codex_project/NNN-slug/`，或使用适合该框架的相对路径配置。
3. 需要浏览器路由时，优先使用 hash 路由；其他方案需单独处理刷新页面的 404。
4. 添加 GitHub Actions 构建与 Pages 发布流程，在仓库 Settings → Pages 中选择 GitHub Actions。
5. 验证首页、各演示、静态资源及直接访问子页面的行为，再更新索引。

GitHub Pages 提供静态托管。需要服务端、数据库或私密 API 密钥的子项目，后端应单独部署，前端不得包含秘密配置。

参考：[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。
