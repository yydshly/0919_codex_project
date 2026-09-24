# Data Model

- Settings: id=workspace; name字符串1..40字符；goal字符串0..200字符；focus去重标签列表0..8个且必须来自目录；view=all/focus；configured布尔；version正整数。
- Project: id原目录slug；name、summary、tags、source、originalStatus、snapshotAt来自快照不可编辑；note字符串0..2000字符；status=pending/active/decided；version正整数。
- Task: id服务生成UUID；projectId已存在项目；title字符串1..120字符；due空或合法YYYY-MM-DD；done布尔；version正整数。
- 所有字符串先trim，再检查长度，不静默截断；用户文本按纯文本呈现。
- PUT设置/项目/任务与DELETE任务必须带当前version。SQL事务内条件更新，旧version返回409且不改数据。成功version+1。
- 状态互相可转换；完成任务可重开；删除任务必须在UI确认。
- SQLite初始化只插入缺少的初始记录，不覆盖用户字段；目录快照文件只读。

## Storage
三个表分别存JSON内容与version；单次请求独立连接。使用参数化SQL、事务和忙等待。读取响应将版本合并回记录。
