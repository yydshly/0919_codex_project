# Blinko 复现笔记

## 环境与安装

- 上游提交：`b2586d03fddb796252f050a96922879bf4a41fad`，package.json 版本 1.8.8。
- 机器没有 Docker、全局 Bun；已有 PostgreSQL 18 工具，但原 Windows 服务处于停止状态。
- 使用 npm 官方注册表的 `@oven/bun-windows-x64@1.2.8` 包安装项目专用 Bun；不修改系统 PATH。
- 使用 `initdb` 创建 `.local/blinko/postgres-data`，数据库名和角色名为 `blinko`，SCRAM 密码随机生成，仅监听 `127.0.0.1:5544`。
- 凭据写入被 Git 忽略的上游 `.env`，没有使用上游示例中的默认密码。

安装依赖时在上游根目录运行 `bun install --ignore-scripts`，运行 `npm.cmd rebuild sqlite3 --foreground-scripts` 安装 Windows 原生绑定，然后显式运行 `bun x --no-install prisma generate`、`bun x --no-install prisma migrate deploy` 生成 Prisma 客户端、应用数据库迁移。后端从 `server` 目录运行 `bun --env-file ../.env index.ts`，通过 Vite 提供前端。

## 本地补丁

- [loopback-only.patch](https://github.com/yydshly/0919_codex_project/blob/main/projects/004-blinko/notes/loopback-only.patch)：服务监听地址从固定 `0.0.0.0` 改为读取 `HOST`，默认 `127.0.0.1`。本实例 `.env` 同时配置 `HOST` 和 `TAURI_DEV_HOST` 为 `127.0.0.1`。

- 上游示例附件复制使用相对路径，源码从 server 目录启动时会找错目录；start.ps1 会补齐缺失的示例文件，保留已有文件。

## 验证结果

- 数据库 30 项迁移全部成功。
- LibSQL 内存数据库查询成功，Sharp 0.34.1 正常加载。
- 首页和版本接口返回 HTTP 200，版本接口返回 1.8.8。
- 浏览器成功显示中文登录页，管理员登录成功，主界面展示已保存的验证笔记；刷新后仍可读。
- 通过公开 API 创建验证笔记（ID 8），读取内容一致，关键词搜索能找到该笔记。
- 示例图片经认证请求返回 HTTP 200。
- 首次注册自动生成上游示例笔记，本次另保留一条清楚标注的本地验证笔记。
- 重复执行 start.ps1 可识别已运行实例，不重复启动。
- AI 模型未配置，未验证 AI 推理。
- 本地账号及随机密码仅保存在 .local/blinko/local-account.json，没有写入受版本控制的文件。

## 功能边界

没有配置任何云端或本地 AI 模型，因此基础笔记和 AI 功能应分别验证；本次运行不代表完成 Embedding、RAG、视觉识别或 MCP 集成验证。
