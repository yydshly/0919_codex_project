"""Keep the Pireel card in the research gallery aligned with its guide page."""
from pathlib import Path


root = Path(__file__).resolve().parents[3]
home = root / 'web/index.html'
page = home.read_text(encoding='utf-8')
marker = '<a class="card" href="./016-pireel/">'
card = '''<a class="card" href="./016-pireel/"><div class="visual" style="background:#e9e8e0"><img style="object-fit:cover;object-position:top" src="./016-pireel/pireel-overview-preview.png" alt="Pireel 能力全景图：素材、剪辑、动态图文、依赖和实现原理" loading="lazy"></div><div class="body"><small>RESEARCH 016 · VIDEO EDITING</small><h2>Pireel · 视频编辑能力全览</h2><p>把视频、图片、声音和动态图文组织成可修改的时间线，再由浏览器导出成片。页面说明所需依赖、实现原理和适用场景。</p><p style="margin-top:12px">附原版 Studio 实测：Blinko 介绍 45 秒剪成 28 秒，添加动态文字并保留中文讲解；自动剪辑模型尚未接入。</p><div class="open">查看全景图与真实案例 <span>↗</span></div></div></a>'''
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
