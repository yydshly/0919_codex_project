# Web 演示目录

多个静态演示的汇总位置。每个演示使用与研究项目相同的 `NNN-slug/` 子目录；总入口为 `index.html`。

已发布：[演示总入口](https://yydshly.github.io/0919_codex_project/) · [001 · Video Shotcraft](https://yydshly.github.io/0919_codex_project/001-video-shotcraft/)。源码存放在对应研究子项目中，构建和发布方式参见[部署约定](../docs/deployment.md)。

构建：在 `projects/001-video-shotcraft/` 中执行 `npm ci`、`npm run build:web`。

已发布：[002 · BrightBean Studio 研究页](https://yydshly.github.io/0919_codex_project/002-brightbean-studio/)，包含完整能力摘要、平台矩阵、接入引导图、发布流程与架构解读，2026-09-20 已验证线上访问和交互。构建命令（仓库根目录）：`python projects/002-brightbean-studio/scripts/build_web.py`。也可在 5184 端口启动同一目录预览。

本地访问：在仓库根目录执行 `python -m http.server 5183 --bind 127.0.0.1 --directory web`，打开 `http://127.0.0.1:5183/`。不要直接双击 HTML 文件，浏览器需要通过 HTTP 加载构建后的模块。

003 · 大模型教材与群体模拟：新增两个仓库的能力对比研究页，含六个章节解读和五步行动教学示意。构建：`python projects/003-llm-foundations-agent-kernel/scripts/build_web.py`。本地预览：`http://127.0.0.1:5185/003-llm-foundations-agent-kernel/`。已发布并验证：[003 在线研究页](https://yydshly.github.io/0919_codex_project/003-llm-foundations-agent-kernel/)。

004 · Blinko：Markdown 笔记记录软件的部署研究页，包含真实运行截图、界面引导、能力理解、ReflectFlow 比较边界和 RAG 原理。构建：`python projects/004-blinko/scripts/build_web.py`。该页为静态展示，完整应用需运行后端与数据库。

已发布并验证：[004 在线研究页](https://yydshly.github.io/0919_codex_project/004-blinko/) · [真实部署截图](https://yydshly.github.io/0919_codex_project/004-blinko/cover.png)。
