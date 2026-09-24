# Data Model

- Backup: schemaVersion严格整数1；settings对象；projects数组恰好当前16个ID；tasks数组0..1000个唯一ID。
- Settings: name字符串1..40字符，goal字符串0..200字符，focus当前标签数组0..8且去重，view=all/focus，configured布尔。
- Project personal fields: id当前ID，note字符串0..2000字符，status=pending/active/decided。
- Task: id合法UUID且唯一，projectId当前ID，title字符串1..120字符，due空或合法YYYY-MM-DD，done布尔。
- 输入必须已经满足限制；只对字段trim规范化，不截断。所有原记录version忽略，不采纳备份内部控制状态。
- control单例: revision正整数，restoreEpoch非负整数（仅恢复和撤销递增），undo为null或{undoId,before,appliedRevision}；恢复快照只含个人字段，不含control自身。
- Digest: 规范化备份JSON的SHA256，不含不使用的元数据和旧version。
- 恢复和撤销后的行version为新的全局revision。普通既有记录version继续+1，global revision总是同步递增且初始不少于最大行version。
