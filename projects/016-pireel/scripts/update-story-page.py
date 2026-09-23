from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
p=root/'site/index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('Pireel Lab · 把剪辑交给指令，把决定留给你','Pireel 实例 · 45 秒介绍如何剪成 28 秒短片')
s=s.replace('<a href="#understand">能力与原理</a>','<a href="#case">看真实案例</a>')
if 'advanced-lab' not in s:
    s=s.replace('<div class="page-title">','<details class="advanced-lab"><summary>继续探索：组件实验室、参数编辑与实现原理</summary>\n<div class="page-title">',1)
    s=s.replace('<footer>','</details>\n<footer>')
p.write_text(s,encoding='utf-8')
p=root/'site/main.js'
s=p.read_text(encoding='utf-8')
if "import './story.js'" not in s:s="import './story.js';\n"+s
s=s.replace('scale=Math.min((area.clientWidth-42)/w,(area.clientHeight-42)/h)','scale=Math.max(0,Math.min((area.clientWidth-42)/w,(area.clientHeight-42)/h))')
p.write_text(s,encoding='utf-8')
p=root/'project.json';j=json.loads(p.read_text(encoding='utf-8'));j['summary']='用 Blinko 产品介绍实测原版 Pireel：45 秒剪成 28 秒，添加动态标题、保留中文声音，并提供原片成片对比。';p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
