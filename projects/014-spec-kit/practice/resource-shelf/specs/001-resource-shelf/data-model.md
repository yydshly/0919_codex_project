# 数据模型

## Collection
- schemaVersion: 固定整数1；未知版本按不可写处理。
- updatedAt: 有效 ISO 日期时间。
- repositories: Repository 数组；id 与 canonicalKey 不重复。

## Repository
- id: 非空唯一字符串。
- name: 必填，去首尾空白后1..80字符。
- url: 归一化的 https://github.com/owner/repo。
- canonicalKey: owner/repo 的小写值，仅做去重。
- tags: 最多6个，每个1..20字符，去空白且去重。
- notes: 字符串，最多300字符，可为空。
- status: pending 或 reviewed。
- createdAt、updatedAt: 有效 ISO 日期时间。
- sample: boolean，初始示例为true，用户新增为false。

## 状态变化
新增 -> pending；pending <-> reviewed；删除 -> 从集合移除；撤销 -> 插回最新集合。
所有变更必须先保存成功才能替换内存集合。存储失败时原集合不变。

## RecentlyDeleted
保存单条 Repository 和原下标，仅当前页面内存有效；新删除替换上一条；刷新后不保留。
