# 快速验证指南

在研究仓库根目录构建：
`python projects/014-spec-kit/scripts/build_web.py`

用标准静态服务运行 web 目录：
`python -m http.server 5214 --bind 127.0.0.1 --directory web`

访问 `/014-spec-kit/app/`，添加仓库、刷新、搜索和切换状态。搜索后点击导出全部，核对下载数量不受过滤影响。删除一条、添加另一条、撤销，核对两条都存在。

自动检查：设置 PLAYWRIGHT_MODULE 指向现有 Playwright 模块，然后运行：
`node projects/014-spec-kit/practice/resource-shelf/tests/acceptance.cjs`

预期：实际新增保存和刷新一致；重复/非法输入被拒绝；导出全量；撤销不丢新记录；存储失败有提示；320/390/768/1440宽度无溢出。完整结果保存到 `notes/live-run/verification.json`。

仅用测试创建的独立浏览器上下文，不修改用户浏览器中的记录。
