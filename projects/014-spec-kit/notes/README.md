# 研究依据

研究日期：2026-09-22。读取的上游 main 提交为 `b9e7389d1414cfefe3964917a7ca48cd99503815`。网页中的仓库源码链接固定到该提交；在线文档可能继续更新。

## 能力与依据

| 判断 | 依据 |
| --- | --- |
| CLI 安装脚本、共享模板与 AI 适配文件 | `src/specify_cli/__init__.py` |
| 需求阶段产生可验证的行为和成功标准 | `templates/commands/specify.md` |
| 项目原则独立于业务实现 | `templates/commands/constitution.md` |
| 规划阶段输出研究、数据模型、接口约定与验证指南 | `templates/commands/plan.md` |
| 实现阶段读取任务、设计材料并执行工作 | `templates/commands/implement.md` |
| analyze 检查 spec、plan、tasks 的一致性 | `templates/commands/analyze.md` |
| converge 对照当前代码找缺口，仅追加剩余任务 | `templates/commands/converge.md` |
| 当前任务模板中的测试按需求可选，不能假设自动覆盖 | `templates/tasks-template.md` |
| 故障修复与想法评估作为可选扩展独立使用 | `README.md` |

固定版本：[上游代码](https://github.com/github/spec-kit/tree/b9e7389d1414cfefe3964917a7ca48cd99503815)。

在线文档：[已有项目接入](https://github.github.io/spec-kit/guides/existing-projects.html)、[工具适配](https://github.github.io/spec-kit/reference/integrations.html)。

## 内容处理

- 使用自主编写的案例说明输入、输出与决策，不展示伪造的真实生成记录。
- 不给出未经实测的效率、成本或质量提升百分比。
- 适用性选择是基于流程成本与工作方式的判断。
- 网页使用短命令名称解释阶段，不把特定工具的命令写法误认为通用终端命令。
- 没有运行上游 CLI、模型或业务系统；只对本次制作的说明页进行浏览器验证。

## 研究集接入

已添加网页总入口、构建步骤与本项目元信息。根 README 的自动同步命令执行时被其他子项目 `projects/012-trek/project.json` 缺失阻止，没有修改其他项目来绕过校验；该元信息补齐后可运行 `python scripts/project.py sync` 和 `python scripts/project.py check`。
