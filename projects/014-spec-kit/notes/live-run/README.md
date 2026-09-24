# 本次真实执行记录

日期：2026-09-22。场景：为开源项目研究工作制作一个可实际使用的本机收藏夹。

## 真实与示例的区分

- `site/index.html` 中原有三种可切换案例仍为预先编写的教学示例。
- 新增 `site/live.html` 展示本次真正执行的过程，`practice/resource-shelf/app/` 是实际成品源码。
- 官方 CLI 实际运行并输出版本、初始化、规划、任务模板与前置检查结果。业务文档和代码由 Codex 在本会话按初始化生成的技能执行产生。
- 没有把 `$speckit-*` 当作终端命令执行；它们是代理技能，已逐份读取并依其步骤执行。
- 没有启动或假装启动额外的 AI 编码会话。规划阶段按技能要求使用一个独立研究代理检查本机存储方案。

## 环境与复查

官方包 `specify-cli==1.0.9`，Python 3.12.14，安装在研究工作区 `.local/spec-kit-runtime/`。依赖缓存也在 `.local/` 内。安装来源为官方 PyPI 发行通道。没有修改全局 Python 环境或父仓库分支。

实际运行顺序：

1. `specify version`，输出 `01-version.txt`。
2. 在 `practice/` 下执行 `specify init resource-shelf --integration codex --integration-options=--skills --script py --non-interactive --ignore-agent-tools`，输出 `02-init.txt`。
3. 读取并执行初始化生成的 `speckit-constitution`、`speckit-specify` 技能。运行模板解析脚本，写项目原则和需求，检查16项需求质量标准通过。
4. 按 `speckit-plan` 运行 `setup_plan.py --json`，输出 `03-setup-plan.txt`，产出计划及设计文档。
5. 按 `speckit-tasks` 运行 `setup_tasks.py --json`，输出 `04-setup-tasks.txt`，拆分16项初始任务。
6. 按 `speckit-implement` 运行前置检查，输出 `05-prerequisites.txt`，实现前编写测试。`06-baseline.json` 记录未实现时首页返回404的实际失败，不代表业务缺陷。
7. 实现收藏、搜索、状态、导出、撤销及存储异常处理，实际浏览器验收结果在 `verification.json`。
8. 按 `speckit-converge` 对照原始需求和当前代码审阅；详见 `convergence.md`。

所有测试均在独立浏览器上下文运行，不读写用户收藏。查看器仅打包显式白名单里的开发文件，不扫描认证或用户目录。每份文件带 SHA-256 用于核对构建时来源。

## 能力边界

本例证明该版本的初始化和辅助脚本可运行，生成的技能可指导一个小型工具开发；不构成 Spec Kit 能保证质量或提高效率的基准测试。应用没有账号、跨设备同步、联网仓库验证或导入功能。localStorage 的读改写不提供同时并发事务保证。
