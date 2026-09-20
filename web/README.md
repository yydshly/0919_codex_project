# Web 演示目录

多个静态演示的汇总位置。每个演示使用与研究项目相同的 `NNN-slug/` 子目录；总入口为 `index.html`。

已发布：[演示总入口](https://yydshly.github.io/0919_codex_project/) · [001 · Video Shotcraft](https://yydshly.github.io/0919_codex_project/001-video-shotcraft/)。源码存放在对应研究子项目中，构建和发布方式参见[部署约定](../docs/deployment.md)。

构建：在 `projects/001-video-shotcraft/` 中执行 `npm ci`、`npm run build:web`。

本地访问：在仓库根目录执行 `python -m http.server 5183 --bind 127.0.0.1 --directory web`，打开 `http://127.0.0.1:5183/`。不要直接双击 HTML 文件，浏览器需要通过 HTTP 加载构建后的模块。
