"""Keep the Pireel card in the research gallery aligned with its guide page."""
from pathlib import Path


root = Path(__file__).resolve().parents[3]
home = root / 'web/index.html'
page = home.read_text(encoding='utf-8')
marker = '<a class="card" href="./016-pireel/">'
card = '''<a class="card" href="./016-pireel/"><div class="visual" style="background:#e9e8e0"><img style="object-fit:cover;object-position:top" src="./016-pireel/pireel-overview-preview.png" alt="Pireel 能力全景图：素材、剪辑、动态图文、依赖和实现原理" loading="lazy"></div><div class="body"><small>RESEARCH 016 · VIDEO EDITING</small><h2>Pireel · 视频编辑能力全览</h2><p>用可编辑时间线裁切视频、叠加图文、混合声音并导出；工程记录编辑决定，浏览器负责画面与编码。</p><p style="margin-top:12px">接入 Agent 后，AI 也能修改同一工程。对我们既是剪辑工具候选，也是开发 AI 视频编辑产品的实现参考。</p><div class="open">查看能力摘要、全景图与实测 <span>↗</span></div></div></a>'''
if marker in page:
    start = page.index(marker)
    end = page.index('</a>', start) + len('</a>')
    page = page[:start] + card + page[end:]
else:
    anchor = '</div><p>源库：'
    if anchor not in page:
        raise RuntimeError('Gallery structure changed; inspect before inserting.')
    page = page.replace(anchor, card + anchor, 1)
home.write_text(page, encoding='utf-8')
print('Pireel gallery card updated.')
