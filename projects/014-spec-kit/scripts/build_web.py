"""Build the dependency-free Spec Kit guide into the shared web directory."""
from pathlib import Path
import shutil
import json
import hashlib

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
DESTINATION = ROOT / "web" / PROJECT.name

def build_evidence():
    practice = PROJECT / "practice" / "resource-shelf"
    specs = practice / "specs" / "001-resource-shelf"
    run = PROJECT / "notes" / "live-run"
    files = [
        ("version", run / "01-version.txt", "版本检查", "Spec Kit CLI 实际输出。"),
        ("init", run / "02-init.txt", "初始化日志", "实际执行 specify init，生成 Codex 技能及模板。"),
        ("input", run / "input.md", "场景输入", "用户原始请求与代理为真实演示选定的具体范围。"),
        ("constitution", practice / ".specify/memory/constitution.md", "项目原则", "Codex 按 speckit-constitution 技能完成的项目原则。"),
        ("spec", specs / "spec.md", "需求原文", "Codex 按 speckit-specify 技能产出，作为本次实现的依据。"),
        ("requirements", specs / "checklists/requirements.md", "需求检查", "实施前的需求质量检查，不是软件测试结果。"),
        ("plan", specs / "plan.md", "技术方案", "运行规划脚本后，Codex 按 speckit-plan 完成的实际方案。"),
        ("research", specs / "research.md", "设计决策", "记录本地存储、去重、撤销及导出方式的选择依据。"),
        ("model", specs / "data-model.md", "数据模型", "实际使用的字段、约束与状态变化。"),
        ("contracts", specs / "contracts/ui-and-export.md", "交互与导出约定", "实现前约定的用户行为和输出格式。"),
        ("setup-plan", run / "03-setup-plan.txt", "规划脚本输出", "Spec Kit setup_plan.py 的实际输出。"),
        ("tasks", specs / "tasks.md", "实际任务清单", "实施任务及当前完成标记；收敛检查发现的工作追加在末尾。"),
        ("baseline", run / "06-baseline.json", "实现前基线", "第一次实际测试：收藏页尚未实现，返回404；不是编造的业务缺陷。"),
        ("length-before", run / "08-length-before-fix.json", "修复前的真实失败", "完成度检查发现长文本静默截断；新增验收在修复前实际失败。"),
        ("app-source", practice / "app/app.js", "页面逻辑", "按任务实现的实际 JavaScript 源文件。"),
        ("store-source", practice / "app/store.js", "保存逻辑", "实际执行的校验、持久化、状态切换和撤销代码。"),
        ("setup-tasks", run / "04-setup-tasks.txt", "任务脚本输出", "Spec Kit setup_tasks.py 返回的实际模板和文档列表。"),
        ("prerequisites", run / "05-prerequisites.txt", "前置检查", "实施前由官方辅助脚本检查实际存在的文件。"),
        ("verification", run / "verification.json", "实际验收报告", "浏览器真实操作产生的结果，不由展示页预设通过状态。"),
        ("convergence", run / "convergence.md", "完成度检查", "Codex 按安装生成的 speckit-converge 技能对照需求与代码检查。"),
        ("quickstart", specs / "quickstart.md", "复查方式", "启动、操作和重复验证本项目的方法。"),
        ("test-source", practice / "tests/acceptance.cjs", "验收脚本", "实际运行的自动化浏览器测试，可复查断言。"),
    ]
    destination = DESTINATION / "evidence"
    destination.mkdir(exist_ok=True)
    artifacts = {}
    for key, source, label, description in files:
        if not source.is_file():
            continue
        filename = key + source.suffix
        shutil.copy2(source, destination / filename)
        artifacts[key] = dict(name=source.name, label=label, description=description,
                              content=source.read_text(encoding="utf-8-sig"),
                              href="./evidence/" + filename,
                              source=str(source.relative_to(PROJECT)).replace("\\", "/"),
                              sha256=hashlib.sha256(source.read_bytes()).hexdigest())
    report_path = run / "verification.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else None
    payload = dict(artifacts=artifacts, verification=report)
    (DESTINATION / "evidence.js").write_text(
        "window.SPEC_KIT_EVIDENCE=" + json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c") + ";\n",
        encoding="utf-8")

def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for source in (PROJECT / "site").iterdir():
        if source.is_file():
            shutil.copy2(source, DESTINATION / source.name)
    app = PROJECT / "practice" / "resource-shelf" / "app"
    if app.is_dir():
        shutil.copytree(app, DESTINATION / "app", dirs_exist_ok=True)
        build_evidence()
    cover = PROJECT / "assets" / "cover.png"
    if cover.is_file():
        shutil.copy2(cover, DESTINATION / cover.name)
    for name in ("understanding-map.svg", "understanding-map.png"):
        source = PROJECT / "assets" / name
        if source.is_file():
            shutil.copy2(source, DESTINATION / name)
    # Publish only the selected, anonymized development artifacts used by this guide.
    restore = PROJECT / "practice/research-workbench"
    published = DESTINATION / "evidence" / "restore"
    published.mkdir(parents=True, exist_ok=True)
    for name, source in (
        ("spec.md", restore / "specs/002-restore-backup/spec.md"),
        ("plan.md", restore / "specs/002-restore-backup/plan.md"),
        ("tasks.md", restore / "specs/002-restore-backup/tasks.md"),
        ("storage-verification.json", restore / "evidence/restore/storage-verification.json"),
        ("browser-verification.json", restore / "evidence/restore/browser-verification.json"),
    ):
        if source.is_file():
            shutil.copy2(source, published / name)
    workbench = PROJECT / "practice/research-workbench/evidence/product-desktop.png"
    if workbench.is_file():
        shutil.copy2(workbench, DESTINATION / "workbench-product.png")
    print(f"Built {DESTINATION.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
