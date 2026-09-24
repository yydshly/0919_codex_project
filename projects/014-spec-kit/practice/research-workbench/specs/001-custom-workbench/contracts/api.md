# API and UI Contracts

同源JSON请求；变更请求必须Content-Type: application/json，Origin必须精确匹配服务启动时固定的本地地址，Host同样检查固定允许值。请求上限64KiB。

| Route | Contract |
| --- | --- |
| GET /api/state | settings,projects,tasks,snapshotAt |
| PUT /api/settings | name,goal,focus,view,configured=true,version → settings |
| PUT /api/projects/{id} | note,status,version → project |
| POST /api/tasks | projectId,title,due → task |
| PUT /api/tasks/{id} | done,version → task |
| DELETE /api/tasks/{id} | version → deleted:true |
| GET /api/export.json | schemaVersion,exportedAt,全量state；附件下载 |
| GET /api/report.md | 全量空间目标、项目、个人结论及待办，Markdown附件 |
| GET /api/evidence | 白名单阶段原文及实际测试报告；无报告显示未执行 |

400字段错误；404缺少记录/路径；409旧版本冲突；500存储或服务错误。JSON错误含error字段；客户端保留输入并提供重新读取入口。
源库链接仅http/https；新窗口使用noopener。所有用户文字textContent。
退出有改动的表单必须确认丢弃；成功保存后可无确认关闭。比较最多3项且不写入全量用户数据。
只服务app/public明确文件及证据白名单；任何数据库、目录穿越、脚本路径不可访问。
