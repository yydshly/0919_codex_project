"""Add this guide to shared navigation without regenerating other project entries."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
entry = ROOT / "web/index.html"
text = entry.read_text(encoding="utf-8")
if 'href="./014-spec-kit/"' not in text:
    marker = '</div><p>源库：'
    if marker not in text:
        raise SystemExit("Shared gallery closing marker changed; inspect before integrating.")
    card = '''<a class="card" href="./014-spec-kit/"><div class="visual"><img src="./014-spec-kit/cover.png" alt="Spec Kit 中文能力说明页：职责图解、可切换案例和五步开发流程" loading="lazy"></div><div class="body"><small>RESEARCH 014 · AI DEVELOPMENT</small><h2>Spec Kit · 看懂 AI 开发流程</h2><p>从“做一个记账工具”开始，点击查看需求、方案、任务、实现和检查分别产出什么。</p><p style="margin-top:12px">三个场景、15 个教学步骤，讲清你、Spec Kit 和 AI 的分工；含能力边界、底层原理与适用性选择。教学示例未调用上游模型。</p><div class="open">用具体例子看懂能力 <span>↗</span></div></div></a>'''
    entry.write_text(text.replace(marker, card + marker, 1), encoding="utf-8")

workflow = ROOT / '.github/workflows/pages.yml'
text = workflow.read_text(encoding='utf-8')
if 'projects/014-spec-kit/scripts/build_web.py' not in text:
    marker = '      - uses: actions/setup-node@v6'
    if marker not in text:
        raise SystemExit('Pages workflow insertion point changed; inspect before integrating.')
    step = '      - name: Build Spec Kit interactive guide\n        run: python projects/014-spec-kit/scripts/build_web.py\n'
    workflow.write_text(text.replace(marker, step + marker, 1), encoding='utf-8')

readme = ROOT / 'web/README.md'
text = readme.read_text(encoding='utf-8')
if '## 014 · Spec Kit' not in text:
    text += '''

## 014 · Spec Kit

中文交互能力说明页，提供三个场景、15 个开发步骤，以及职责图解、能力边界、实现原理和适用性选择。源码位于 `projects/014-spec-kit/site/`。

构建：`python projects/014-spec-kit/scripts/build_web.py`。预览：`python -m http.server 5214 --bind 127.0.0.1 --directory web`，打开 <http://127.0.0.1:5214/014-spec-kit/>。桌面与移动端交互已验证；未安装上游工具或发布公网。
'''
    readme.write_text(text, encoding='utf-8')
print('Integrated Spec Kit guide with gallery, Pages build, and web documentation.')
