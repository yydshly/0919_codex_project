# Quickstart

个人空间 /restore 页面可选择其自己导出的JSON文件。先预览、阅读替换范围，再勾选确认并恢复；无后续新编辑时可撤销。

本次另启动 http://127.0.0.1:5217/restore 独立演示空间。演示备份中的示例结论为A版，当前演示空间是B版；加载样本→预览→恢复后为A版→撤销后回B版。页面和数据均明确标记演示用途，不改5215个人空间。

测试：`python tests/test_restore.py`；配置PLAYWRIGHT_MODULE和PYTHON_BIN后运行 `node tests/restore-browser.cjs`。两者使用临时数据库，失败基线和最终报告存evidence/restore/。
