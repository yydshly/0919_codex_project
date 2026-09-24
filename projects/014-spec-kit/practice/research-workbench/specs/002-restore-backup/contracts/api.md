# Restore Contracts

既有Origin/Host/JSON限制沿用。备份内容上限5MiB，restore请求体额外容纳1KiB控制字段，其他写接口保持64KiB。

| API | 输入与输出 |
| --- | --- |
| POST /api/restore/preview | {backup} → {revision,digest,current,incoming,scope}；无写入 |
| POST /api/restore/apply | {backup,revision,digest,confirmed:true} → {undoId,state} |
| GET /api/restore/status | {available,undoId,demo}；可撤销取决于当前revision |
| POST /api/restore/undo | {undoId,confirmed:true} → {state} |
| GET /api/demo-backup | 仅配置--demo-backup的演示服务返回明确样本，否则404 |
| GET /api/restore-evidence | 本功能白名单规格、方案、任务与报告，无用户数据 |

新增任务POST /api/tasks携带state.restoreEpoch，恢复或撤销后旧代际返回409。

400字段/格式/未确认错误；409预览过期、digest不一致或撤销不可用；413超过体积；其他存储错误保留原样。
UI更换文件清除预览、确认复选框和旧按钮；确认恢复按钮仅在有效预览并勾选“我确认替换上述个人记录”后可用。失败不会当作成功。
