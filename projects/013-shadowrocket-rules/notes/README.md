# 研究依据与验证范围

[返回项目说明](../README.md)

研究日期：2026-09-22。build SHA：`ff8ecea54bb71deaab5ef13bfd466e7da03a50fa`；release SHA：`1df281947ae906e6dd8440bb540eff11312aa74f`。GitHub API 返回 release 提交时间为 2026-09-21T23:04:19Z。

## 证据映射

| 结论 | 文件 | 证据 |
| --- | --- | --- |
| 提供多种分流配置 | readme.md | 规则列表、使用方法、常见问题 |
| 广告列表并非完整移植 | factory/ad.py | 跳过含 `$`、`##` 项；提取域名/IP，去重并排序 |
| 通过模板拼装配置 | factory/build_confs.py | getRulesStringFromFile 与模板占位符替换 |
| 代理例外可能先于广告规则 | factory/template/sr_cnip_ad.txt | manual_proxy → manual_reject → ad → GEOIP → FINAL |
| 自动构建与懒人配置同步 | .github/workflows/main.yml | 调用 auto_build.sh；同步 LOWERTOP 的两个配置 |
| 构建步骤 | factory/auto_build.sh | ad.py → gfwlist.py → build_confs.py |
| HTTPS 重写属于另一层功能 | factory/template/sr_foot.txt | URL Rewrite 与 MITM 段 |
| 策略组 | release/lazy_group.conf | Proxy Group 与按服务分流规则 |

固定源码根路径：https://github.com/Johnshall/Shadowrocket-ADBlock-Rules-Forever/tree/ff8ecea54bb71deaab5ef13bfd466e7da03a50fa

## 明确区分

- 已做：阅读源文件，创建本地技术说明页。
- 教学示意：合成域名、无冲突样本、简化决策。不是实际网络检测。
- 未做：上游规则的真机执行、广告过滤覆盖率测试、节点与地区可用性测试、耗电和性能基准。
- 对“少维护、少切换”的价值判断来自系统职责分析，不是实测收益。
- 自动构建时间的 README 与工作流存在差异，已在页面标出。
- 不引用 README 的 O(1) 说法作为客户端全引擎的证明。

## 网页验证

- 本地 HTTP 页面返回 200。
- 检查全部 20 种模式 / 请求类型组合，结果与教学设计一致。
- 390、768、1024、1440 像素宽度无页面级横向溢出；配置表允许容器内横向滚动。
- 折叠说明、章节导航、所有源码链接的生成均通过检查；未出现 JavaScript 运行错误。
- 检查桌面首页、请求处理区域和手机视图截图；封面为实际网页截图。
- 本项目元信息、封面和构建产物一致性验证通过；git diff --check 通过。
- 同一工作区其他项目同时创建时出现 011 编号重复，本项目改用未占用的 013，已同步自身所有路径。
- 总 README 自动同步曾受其他子项目缺少 README 和重复编号阻塞；网页总入口与本项目构建步骤已接入。没有修改其他子项目来绕过全局检查。
