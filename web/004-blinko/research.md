# 004 · Blinko · Markdown 笔记记录软件

**Blinko 就是一款支持 Markdown 的笔记记录软件。** 它可以保存文字、链接、待办和附件，再围绕已有记录提供整理、检索、总结、润色及 AI 问答。它的主要价值在于把记录和后续处理串成完整的使用流程。

[返回总索引](../) · [上游仓库](https://github.com/blinkospace/blinko) · [官方文档](https://docs.blinko.space/) · [Web 部署效果与研究](https://yydshly.github.io/0919_codex_project/004-blinko/)

## 项目信息

| 项目 | 内容 |
| --- | --- |
| 研究编号 | 004 |
| 上游版本 | 1.8.8 |
| 上游 Commit | `b2586d03fddb796252f050a96922879bf4a41fad` |
| 许可证 | GPL-3.0，见上游 LICENSE |
| 技术栈 | React / Vite / TypeScript / Bun / Express / tRPC / Prisma / PostgreSQL / Mastra / LibSQL |
| 本地环境 | Windows，Node.js 22.15.0，Bun 1.2.8，PostgreSQL 18 |
| 研究日期 | 2026-09-20 |

## 实际部署效果

![Blinko 本地实际部署界面：Markdown 编辑器、笔记卡片、分层标签和图片附件](cover.png)

上图于 2026-09-20 从我们运行的 Blinko Web 实例直接截图，包含上游欢迎示例和本地验证笔记。首页图览与 Web 展示页使用同一张原始实拍图，没有用概念图替代运行结果。

- 顶部编辑器：用 Markdown 记录文字、列表、代码等内容。
- 左侧导航与标签：按闪念、笔记、待办、归档及标签组织记录。
- 中间笔记卡片：查看已保存内容、图片及附件。
- 右上角搜索：找回记录；AI 语义检索需额外配置模型。

本次已验证登录、笔记保存、读取、关键词搜索和附件显示。AI 模型未配置，截图不代表已验证 AI 问答、语义检索或自动整理。

## 我们对产品的理解

### 记录是中心，AI 是围绕记录的增强能力

| 环节 | 产品能力 | 本次验证情况 |
| --- | --- | --- |
| 记录 | Markdown 文字、链接、待办、图片和文档附件 | 已验证笔记保存及示例附件显示 |
| 组织 | 标签、分类、引用、归档与回顾 | 已查看导航、标签和笔记列表；未逐项测试 |
| 找回 | 关键词检索、AI 语义检索 | 已验证关键词检索；AI 检索未配置 |
| 加工 | 总结、润色、扩写、自动标签、基于笔记问答 | 源码和文档确认能力；未运行 AI 推理 |
| 扩展 | 工具调用、插件、API、MCP、Webhook | 已用 API 验证笔记读写；其他集成未测试 |

“输入任意信息后汇总处理”可以作为直观理解，但需要两点修正：能够保存附件，不等于 AI 自动理解所有文件；文档要提取文字，图片要经过视觉模型。AI 问答通常先检索相关笔记，再把选中的内容交给模型，并非每次汇总整个笔记库。

### 与 ReflectFlow 的关系

我们认为两者在“记录信息 → 整理与找回 → 基于记录加工”这一层存在明显重叠。Blinko 可作为笔记编辑、标签、卡片展示、检索和 AI 接入的实现参考。

本次没有对 ReflectFlow 做功能审计，因此不把两者描述为功能完全等同。引导反思、长期追踪、行动建议及反馈闭环是否构成差异，需要另行对照 ReflectFlow 的实际流程；这些是后续比较维度，不是本次已确认的产品能力。

## 技术原理

Blinko 的核心是记录内容，以及围绕记录开展组织、检索和加工。Blinko 类型适合零碎想法，Note 类型适合长期资料；提供 Markdown、标签、引用、待办和附件等能力。

AI 检索采用 RAG：把笔记和提取出的附件文字分块，调用 Embedding 模型生成向量；提问时检索相近内容，再把相关笔记交给语言模型回答。业务记录存入 PostgreSQL，向量索引使用独立的 LibSQL 文件库。它还通过 Agent 工具调用实现新建、修改、搜索笔记等操作，并支持 MCP 集成。

AI 功能需要自行配置模型服务。普通笔记运行不需要模型 API Key；使用云端模型时，参与处理的内容会发往该模型服务。

保存时：原文入库 → 内容提取与分块 → Embedding 向量化 → 保存向量及笔记关联。

提问时：问题向量化 → 相似度检索 → 读取相关笔记 → 连同问题交给语言模型 → 返回答案。这是检索增强生成，不是用笔记重新训练模型。

当前 `queryVector` 主流程使用余弦相似度、Top K 和分数阈值；尽管官方文档提及重排序，我们检查的该主流程没有实际调用重排序。业务数据使用 PostgreSQL / Prisma，向量索引使用 LibSQL；前端是 React / Vite，服务端是 Bun / Express / tRPC，AI 编排使用 Mastra 和 AI SDK。

源码依据：[笔记及附件索引](https://github.com/blinkospace/blinko/blob/b2586d03fddb796252f050a96922879bf4a41fad/server/aiServer/index.ts)、[模型和检索实现](https://github.com/blinkospace/blinko/blob/b2586d03fddb796252f050a96922879bf4a41fad/server/aiServer/aiModelFactory.ts)、[数据模型](https://github.com/blinkospace/blinko/blob/b2586d03fddb796252f050a96922879bf4a41fad/prisma/schema.prisma)。

## Web 展示页

本研究集的 Web 页面展示产品理解、真实部署截图及验证范围。源码位于 `site/`，在仓库根目录执行 `python projects/004-blinko/scripts/build_web.py` 后输出到 `web/004-blinko/`，随现有 GitHub Pages 工作流发布。

GitHub Pages 托管的是静态研究展示页。完整 Blinko 应用需要运行后端和数据库，本次实例运行在本机，不通过 Pages 暴露账户或笔记服务。

2026-09-20 已发布并验证：页面与原始截图均返回 HTTP 200，Pages 构建和部署成功。

## 本地运行

本实例使用独立数据库目录与项目内 Bun，不依赖 Docker，也不启动或修改机器原有的 PostgreSQL Windows 服务。

在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File projects/004-blinko/start.ps1
```

访问 [本地 Blinko](http://127.0.0.1:1111)。已创建本地管理员 `blinko`，随机密码保存在被 Git 忽略的 `.local/blinko/local-account.json`。

停止应用和它的独立数据库：

```powershell
powershell -ExecutionPolicy Bypass -File projects/004-blinko/stop.ps1
```

停止保留数据。当前为源码开发运行方式，没有设置开机自启。应用和数据库仅监听本机地址，端口分别为 1111、5544。

### 文件位置

以下路径相对于仓库根目录：

| 路径 | 内容 |
| --- | --- |
| `.local/blinko/upstream/` | 上游源码和依赖，独立 Git 克隆 |
| `.local/blinko/upstream/.env` | 随机生成的数据库凭据、会话密钥与本地配置 |
| `.local/blinko/runtime/package/bin/bun.exe` | 项目专用 Bun 1.2.8 |
| `.local/blinko/postgres-data/` | 独立 PostgreSQL 数据库 |
| `.local/blinko/upstream/server/.blinko/` | 从 server 目录运行时的附件、向量等应用数据 |
| `.local/blinko/server.stdout.log`、`server.stderr.log` | 应用日志 |
| `.local/blinko/postgres.log` | 数据库日志 |

`.local/` 已被根目录 `.gitignore` 排除，凭据、用户数据与嵌套源码仓库不会进入研究集版本控制。迁移或备份时，需要同时保存数据库和 `.blinko` 应用数据；普通复制数据库目录前应先停止本实例。

## 复现与改动记录

详见 [复现笔记](notes.md)。本地源码改动保存在 notes 下的补丁中。

## 来源与许可

本目录的运行说明和脚本用于复现 [blinkospace/blinko](https://github.com/blinkospace/blinko)。上游源码保存在 `.local/`，保留原始 Git 历史、LICENSE 和作者信息。补丁基于上游源码，遵循其 GPL-3.0 许可。
