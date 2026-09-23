# Web 演示目录

## 008 · VideoCaptioner

已发布：[字幕与配音研究页](https://yydshly.github.io/0919_codex_project/008-videocaptioner/) · [完整引导图 SVG](https://yydshly.github.io/0919_codex_project/008-videocaptioner/capability-map.svg)。从输入、识别、断句、校正和翻译，到字幕、成片与配音输出，说明模型接入、Python / FFmpeg 等依赖、时间戳能力和使用价值。构建：`python projects/008-videocaptioner/scripts/build_web.py`。本次实测硬字幕合成，识别、翻译和配音尚未作质量验证。

多个静态演示的汇总位置。每个演示使用与研究项目相同的 `NNN-slug/` 子目录；总入口为 `index.html`。

已发布：[演示总入口](https://yydshly.github.io/0919_codex_project/) · [001 · Video Shotcraft](https://yydshly.github.io/0919_codex_project/001-video-shotcraft/)。源码存放在对应研究子项目中，构建和发布方式参见[部署约定](../docs/deployment.md)。

构建：在 `projects/001-video-shotcraft/` 中执行 `npm ci`、`npm run build:web`。

已发布：[002 · BrightBean Studio 研究页](https://yydshly.github.io/0919_codex_project/002-brightbean-studio/)，包含完整能力摘要、平台矩阵、接入引导图、发布流程与架构解读，2026-09-20 已验证线上访问和交互。构建命令（仓库根目录）：`python projects/002-brightbean-studio/scripts/build_web.py`。也可在 5184 端口启动同一目录预览。

本地访问：在仓库根目录执行 `python -m http.server 5183 --bind 127.0.0.1 --directory web`，打开 `http://127.0.0.1:5183/`。不要直接双击 HTML 文件，浏览器需要通过 HTTP 加载构建后的模块。

003 · 大模型教材与群体模拟：新增两个仓库的能力对比研究页，含六个章节解读和五步行动教学示意。构建：`python projects/003-llm-foundations-agent-kernel/scripts/build_web.py`。本地预览：`http://127.0.0.1:5185/003-llm-foundations-agent-kernel/`。已发布并验证：[003 在线研究页](https://yydshly.github.io/0919_codex_project/003-llm-foundations-agent-kernel/)。

004 · Blinko：Markdown 笔记记录软件的部署研究页，包含真实运行截图、界面引导、能力理解、ReflectFlow 比较边界和 RAG 原理。构建：`python projects/004-blinko/scripts/build_web.py`。该页为静态展示，完整应用需运行后端与数据库。

已发布并验证：[004 在线研究页](https://yydshly.github.io/0919_codex_project/004-blinko/) · [真实部署截图](https://yydshly.github.io/0919_codex_project/004-blinko/cover.png)。

## 006 · Leak Check 理解与产品探索

源码：`projects/006-leak-check/site/`；构建：`python projects/006-leak-check/scripts/build_web.py`；输出：`web/006-leak-check/`。引导图使用已经完成的探索全景图，提供 SVG 放大查看与高清 PNG 下载。摘要同时说明原库能力、分轮关联原理、数据来源边界、邮件盘点探索和对我们的意义。

发布范围为静态研究网页与拾迹原型。公网不运行邮箱连接后端，不提供真实个人信息查询；拾迹仅可体验示例与本地文件分析。新增邮箱适配及真实账号验证仍暂缓。

2026-09-23 已发布并验证：[006 在线研究页](https://yydshly.github.io/0919_codex_project/006-leak-check/)。研究页、全景图、文档和静态原型已确认可访问；在线演示元信息已填写。[发布验证记录](../projects/006-leak-check/notes/publication.md)。

## 007 · 电子书链接目录

简明说明网页，解释个人维护的书目与外链目录、文件结构、采集流程和我们认为直接价值较低的原因。构建：`python projects/007-ebook-treasure-chest/scripts/build_web.py`。
