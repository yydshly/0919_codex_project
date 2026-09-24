# 恢复与复看说明

归档编号：`2026-09-22-v1-185446`。所有操作均在本机；本次归档没有覆盖或替换运行中的网页与数据库。

## 1. 直接复看网页

工作区内的冻结快照已保留，在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File projects/012-trek/archives/2026-09-22-v1-185446/start_preview.ps1
```

打开 `http://127.0.0.1:15213/#atlas`。预览只返回当时的行程，不调用现有 TREK 写接口。实时道路功能请继续使用原演示 `http://127.0.0.1:5213`。

## 2. 备份在哪里

工作区：`F:/codex_project/0919_codex_project/`。

本地备份目录：`.local/backups/trek/2026-09-22-v1-185446/`。

```text
2026-09-22-v1-185446.zip   完整压缩备份，含下面的 snapshot 和 manifest
manifest.json            每个文件的大小及 SHA-256
backup-receipt.json      压缩包与数据库校验回执
snapshot/
  project/               原项目源码、图片、脚本、研究文档及元数据
  web/012-trek/          原静态网页输出
  upstream/              TREK 固定版本源码、编译输出和本地配置
  runtime/travel.db      SQLite 一致性备份，包含已提交 WAL 数据
  runtime/xian-state.json
  runtime/saved-plan.json
  runtime/.encryption_key
  runtime/.jwt_secret
  evidence/              归档说明、截图和预览脚本
  planning/              归档之后新增的下一阶段规划，与旧原型分开保存
```

完整备份含本地演示的账户数据库、配置与密钥，只作本机恢复，不放入公开网页或上传共享资料。依赖安装目录、日志、浏览器配置及在线地图服务没有打包。原项目已有图片来源与许可一同保存。

## 3. 从 ZIP 重建快照

先将 ZIP 解压到新的空目录，核对包内 `manifest.json` 中每个文件的 SHA-256。压缩包整体哈希记录在本目录的 `backup-receipt.json`。解压根目录下应能看到 `snapshot/project/site/xian/index.html` 与 `manifest.json`。

如果只是本机 `.local` 快照丢失，将经过校验的 `snapshot/` 放回上述备份目录，即可重新运行只读预览。已有快照时先另存，避免覆盖后续资料。

## 4. 恢复完整运行能力

建议恢复到独立工作目录，保留以下相对结构：

| 快照内路径 | 恢复工作目录中的路径 |
| --- | --- |
| `project/` | `projects/012-trek/` |
| `web/012-trek/` | `web/012-trek/` |
| `upstream/` | `.local/trek-extracted/TREK-b98787f83698f3beee1b9a8475121c52f0caf07c/` |
| `runtime/travel.db` | 上述上游目录的 `server/data/travel.db` |
| `runtime/.encryption_key`、`runtime/.jwt_secret` | 上述上游目录的 `server/data/`，保持原名 |
| `runtime/xian-state.json` | `.local/xian-demo/state.json` |
| `evidence/` | `projects/012-trek/archives/2026-09-22-v1-185446/` |
| `planning/xian-product-replan.md` | `projects/012-trek/notes/xian-product-replan.md`（单独的下一阶段规划） |

恢复数据库前需停止目标实例；在新目录恢复时，确认目标不存在旧数据库的 `-wal/-shm` 文件。不要将单独复制的旧 WAL/SHM 配到备份数据库上。

沿用快照 README 记录的 Node 24.19 与 Python 环境，在上游根目录按锁文件安装依赖（`npm ci`，并按原说明重建 `better-sqlite3`）。已有 `server/dist/` 和 `server/public/` 随快照保存；需要重建时遵循快照 README 的流程。平台、运行时或依赖环境变化时，需重新编译验证。

原启动脚本固定使用回环端口 `3212/5213`。独立恢复实例启动前先停用占用这些端口的旧实例，或在恢复副本内一致调整上游、适配器及链接端口，不能同时误连到现有演示。

然后运行恢复副本的 `scripts/start_xian.ps1`，使用 `scripts/verify_xian.py --saved` 核实读取到西安 trip 3 与三日安排；同时检查京都既有场景。用户浏览器中尚未保存到服务器的临时操作不在数据库备份内。

## 5. 本次验证范围

- 使用 SQLite 在线备份接口创建数据库备份，并运行完整性检查。
- 压缩后逐一重读文件并校验 SHA-256。
- 比较当前 `site/` 与冻结副本的文件集合和哈希，确认网页没有被规划修改。
- 启动只读归档预览，检查冻结页面、行程读取与禁止保存的行为。

未进行覆盖当前实例的破坏性恢复；未宣称外部地图和票务网站已离线保存。冻结源码、数据库与运行材料的完整性验证不等于在任意新机器上已完成重装测试。
