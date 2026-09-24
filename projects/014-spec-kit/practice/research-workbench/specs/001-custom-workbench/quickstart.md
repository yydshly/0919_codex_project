# Quickstart

从此项目目录运行 `python app/server.py --port 5215 --db F:/codex_project/0919_codex_project/.local/research-workbench.sqlite3`。
访问 http://127.0.0.1:5215 ，完成空间名称、目标、关注方向与默认视图定制。

验证旅程：
1. 命名“我的 AI 产品研究室”，关注AI相关标签，进入空间并刷新。
2. 搜索Spec Kit，打开详情写个人结论，添加“评估下一个产品是否需要规格流程”任务。
3. 清空搜索，选择2..3项比较，查看真实摘要和个人结论。
4. 在研究待办中完成/重开任务，再查看项目详情。
5. 导出全部JSON与Markdown，核对未被搜索截断。
6. 打开制作过程，对照需求、方案、任务和实际报告。

API验收：`python -m unittest discover -s tests -p test_api.py -v`。
浏览器验收：配置PLAYWRIGHT_MODULE为现有运行时，再运行 `node tests/browser.cjs`。自动启动独立测试服务与临时数据库；关闭后不触碰用户数据。

本地预览不是公网部署。停止服务后页面不可用，数据仍在指定SQLite文件中。首次定制只写用户数据库，不改变源研究目录。
