# 技术研究与决策

研究方式：主代理阅读工作区现有静态页及验证脚本；按 speckit-plan 的研究步骤由独立研究代理评估浏览器存储、去重、导出与恢复边界。以下为决策，非性能实测。

## 本机存储
Decision: localStorage + 版本化专属键，先保存再更新界面。
Rationale: 当前只有个人少量文本，能复用研究集静态托管。读取、解析、写入都可能失败，需要明确提示。
Alternatives: 服务器数据库增加账号和部署成本；IndexedDB 事务更适合大量数据或强并发，超出此次范围。

## 归一化与去重
Decision: 仅接受 GitHub 仓库主页；owner/repo 比较不区分大小写；去掉 .git、尾斜杠和查询片段。
Rationale: 同一仓库常有不同复制形式。拒绝子页面避免把 issue 页面误当一个新仓库。
Alternatives: 联网调用 GitHub API 可验证仓库存在，但引入网络、限流与隐私边界，此次不做。

## 完整备份与撤销
Decision: 导出所有记录；撤销仅将最近删除的单条插回当前集合。
Rationale: 筛选是显示条件，不能悄悄缩小备份；恢复旧数组会丢掉期间新收藏。

## 跨标签页和失败恢复
Decision: storage 事件同步、修改前重读；损坏存储保持原样并提供原始导出；写失败保留表单。
Rationale: 明确显示当前状态，降低旧页面覆盖风险。localStorage 读改写无事务，不承诺同时写入强一致性。

## 验证环境
Decision: 复用已安装 Playwright，在新浏览器上下文运行。
Rationale: 实际操作 DOM、刷新和下载，既验证行为也不触碰用户数据。

## 官方平台依据
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
