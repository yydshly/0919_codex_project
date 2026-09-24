# 研库 · 定制开源项目研究工作台

本次按 Spec Kit 1.0.9 的实际安装技能开发的个人本地产品。16个项目来自当前研究目录的真实元数据快照。

## 使用

在此目录运行：

```powershell
python app/server.py --port 5215 --db F:/codex_project/0919_codex_project/.local/research-workbench.sqlite3
```

打开 http://127.0.0.1:5215 ，第一次进入会显示定制表单。填写空间名称、研究目标、关注方向和默认视图，保存后开始使用。

建议体验：搜索 Spec Kit → 研究详情 → 写应用判断并添加下一步 → 回到目录选择2..3项比较 → 研究待办 → 导出完整备份或报告。

http://127.0.0.1:5215/process 展示本次真实输入、规格、技术方案、开发任务、源码与验收记录。Skills 由 Codex 在本次会话读取并执行；网页不会调用模型现场生成新软件。

过程页已增加3个具体功能×6个阶段的应用追踪：原始需求 → Skill原文 → 本次规格/方案/任务 → 代码 → 验收。还记录了首次定制冲突缺少重读入口的真实复现、T015修复及双页面回归；见[evidence/convergence-followup.md](evidence/convergence-followup.md)。

## 实际定制范围

名称、目标、关注方向、默认视图可再次修改。个人结论、进度和任务保存于SQLite。退出浏览器或重启服务不丢失已提交数据。首版为本机单用户工具，无云同步和登录；第二轮已加入备份恢复；初始研究目录不可在界面中新增或删除。

## 实际执行与验证

- 先执行官方CLI初始化，再运行模板解析、setup_plan、setup_tasks与check_prerequisites。
- 按安装生成的constitution/specify/plan/tasks/implement/converge技能逐阶段执行。
- 计划阶段按技能要求使用一个只读研究代理，研究SQLite事务与本地服务边界。
- 实现前运行API验收，保留服务文件尚未存在的失败基线，不伪装为业务缺陷。
- API测试使用临时SQLite并实际重启服务；浏览器测试使用另一份临时数据库。均不操作用户数据。
- 最终结果见evidence/api-verification.json与browser-verification.json；具体范围见tests/。
- 开发中发现Windows对未读完的大请求体可能重置连接，修正错误响应前的有界读取。两个浏览器测试定位问题也保留原失败报告，不当作产品缺陷。
- 官方任务脚本首次受Windows默认GBK输出编码影响失败；仅为该次运行设置UTF-8后成功，未修改官方脚本。

## 文件入口

- [规格](specs/001-custom-workbench/spec.md)
- [计划](specs/001-custom-workbench/plan.md)
- [任务](specs/001-custom-workbench/tasks.md)
- [后端](app/server.py) / [保存逻辑](app/storage.py) / [界面](app/public/app.js)
- [服务端验收](evidence/api-verification.json) / [浏览器验收](evidence/browser-verification.json)

运行 `python tests/test_api.py`；设置PLAYWRIGHT_MODULE后运行 `node tests/browser.cjs`。可设置PYTHON_BIN选择Python 3.12。服务使用标准库，本次最终验收使用Python 3.12.14。

初始化得到的上游技能和模板沿用Spec Kit MIT许可；副本见项目上层原实战目录中的SPEC-KIT-LICENSE。

## 第二轮实战：从备份恢复研究记录

本轮以同一产品的新功能执行specify→plan→tasks→implement→converge，完整文件位于specs/002-restore-backup/。不把成品的配置表单当成Spec Kit本身；Skills组织开发，业务逻辑由AI写入真实代码。

- 成品功能：http://127.0.0.1:5215/restore
- 实际步骤与本轮原文件：http://127.0.0.1:5215/restore-build
- 独立演示：http://127.0.0.1:5217/restore（独立数据库，清楚标记样本）
- 演示路径：加载演示备份→预览（当前仍B）→勾选并确认（成为A）→撤销（回B）。

文件与内容最多5MiB，最多1000任务，须与当前16项目目录一致；个人记录全量替换，目录名称/摘要/来源不采用备份值。撤销保留到恢复后的下一次写入之前，服务重启不丢失。导出仍可包含超过恢复上限的数据，超限备份不能在本版导入，不会静默截断。

用新的数据库文件创建演示（脚本拒绝覆盖已有文件），再启动独立服务：

```powershell
python scripts/create_restore_demo.py --db F:/codex_project/0919_codex_project/.local/research-restore-demo.sqlite3
python app/server.py --port 5217 --db F:/codex_project/0919_codex_project/.local/research-restore-demo.sqlite3 --demo-backup evidence/restore/demo-backup.json
```

运行`python tests/test_restore.py`及`node tests/restore-browser.cjs`，后者沿用PLAYWRIGHT_MODULE与PYTHON_BIN设置。报告在evidence/restore/。实现前18项基线因模块尚未创建而失败，只证明验收早于实现，不能证明每条业务断言都单独失败过。
