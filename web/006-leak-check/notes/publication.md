# 网页发布与验证

日期：2026-09-23。[返回项目](../research.md)

已通过现有 GitHub Actions / GitHub Pages 发布到：

- [研究网页](https://yydshly.github.io/0919_codex_project/006-leak-check/)
- [完整探索全景图](https://yydshly.github.io/0919_codex_project/006-leak-check/assets/understanding-map.svg)
- [高清 PNG](https://yydshly.github.io/0919_codex_project/006-leak-check/assets/understanding-map.png)
- [拾迹静态原型](https://yydshly.github.io/0919_codex_project/006-leak-check/mail-trail/)

## 内容与发布范围

首屏、项目索引及 README 同步说明：原库在已有 SQLite 个人信息库中精确匹配，提取共同标识，默认两轮查表后聚合脱敏；不实时搜索全网、不包含作者真实数据。我们的探索确认数据来源才是关键，转向用户授权后的邮件账号盘点。原库提供有限实现参考，独立原型的真实整理价值仍待验证。

引导图与研究集封面使用已经完成的探索全景图，支持查看 SVG 大图和下载高清 PNG。当前仍暂停新增邮箱适配和真实账号验证。

GitHub Pages 只承载静态内容。拾迹可体验示例、在浏览器内分析导入文件；没有部署邮箱连接后端，也没有公开真实个人信息查询服务、授权码或邮件数据。

## 已完成验证

- 首次发布提交：`8e43b680226513017e618992719aa1a4d16bfc1f`。
- [发布任务](https://github.com/yydshly/0919_codex_project/actions/runs/35817172863)已成功，项目索引检查通过。
- 线上首页、样式、脚本、SVG、PNG、研究与规划文档、原型入口及主要模块共 12 项资源返回 HTTP 200；文本按换行归一化后与本次构建一致，PNG 与本地文件一致。
- 总入口包含更新后的 006 摘要与全景图封面。
- 本地桌面与 390 像素手机布局检查通过；公网页面已打开并确认首屏四项摘要和引导图正常显示。
- 该发布通过独立副本完成，只包含 006 项目及对应索引、文档和构建步骤；其他未发布项目保留在原工作区。

既有解析与模拟连接测试结果不代表真实邮箱已验证，本次发布也没有扩大产品能力。
