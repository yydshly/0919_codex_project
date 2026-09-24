# Research

按speckit-plan委派只读技术研究，结合现有storage.py确定以下决策。

## Decision: 单调全局revision
Reason: 备份中的旧version如果重新写回，会使恢复前的旧页面重新获得合法版本，出现ABA误覆盖。全局revision在所有写操作中递增，恢复/撤销后的所有行版本使用新revision。
Alternative: 仅比较时间戳可能重复；每行重置为1存在ABA；单独前端提示无法约束并发请求。

## Decision: 只读预览与原子恢复
Reason: preview只验证并返回revision+内容digest；apply在BEGIN IMMEDIATE内重新验证并比对revision，再统一替换个人字段。任何异常整个事务回滚。
Alternative: 逐条调用已有API会出现部分恢复；前端比较后再分别写入有竞争窗口。

## Decision: 持久撤销记录
Reason: 同一事务保存恢复前规范快照、应用revision与唯一undoId；新编辑使undo失效，重启后仍能判断。
Alternative: 内存撤销重启丢失，直接恢复旧备份可能覆盖新编辑。

## Decision: 严格兼容范围
Reason: 本工具已有固定目录；拒绝缺失/未知项目和重复任务，只恢复个人字段，当前来源事实不受上传内容影响。
Alternative: 静默跳过未知内容会造成“恢复成功但丢记录”的误解。

参考：Python sqlite3事务文档 https://docs.python.org/3.12/library/sqlite3.html ，SQLite事务语义 https://www.sqlite.org/lang_transaction.html 。SQLite保护与验证代码是本次产品实现，Spec Kit提供规划研究与规格核对的方法。
