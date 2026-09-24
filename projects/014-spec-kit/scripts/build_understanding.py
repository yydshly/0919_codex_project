"""Render our revised Spec Kit understanding as an editable, text-exact SVG."""
from pathlib import Path
from html import escape
import json
ROOT=Path(__file__).resolve().parents[1]
W,H=1680,3520
INK,MUTED,GREEN,CREAM='#193c32','#4d6259','#dcebdc','#f3f3ed'
PURPLE,AMBER='#e9e4f3','#f7ebd0'
p=[]
def rect(x,y,w,h,fill='#fff',r=16):
 p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"/>')
def text(x,y,s,size=23,color=INK,weight=400,right=1616):
 p.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" data-max-right="{right}">{escape(s)}</text>')
def lines(x,y,ss,size=23,step=35,color=MUTED,right=1616):
 for i,s in enumerate(ss):text(x,y+i*step,s,size,color,right=right)
def section(y,n,label,note=''):
 rect(64,y-29,48,38,INK,8);text(76,y-2,n,22,'#fff',600);text(128,y,label,29,INK,650)
 if note:text(1038,y-1,note,19,MUTED)
def card(x,y,w,h,label,ss,fill='#fff',size=23):
 rect(x,y,w,h,fill);text(x+24,y+41,label,27,INK,650,right=x+w-24);lines(x+24,y+80,ss,size,34,right=x+w-24)
def arrow(x1,y1,x2,y2):
 p.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="#668579" stroke-width="2" fill="none" marker-end="url(#arrow)"/>')
def link(x,y,label,url):
 p.append(f'<a href="{escape(url,quote=True)}" target="_blank">');text(x,y,label,20,MUTED);p.append('</a>')
p.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">')
p.append('<title id="title">Spec Kit：我们的完整理解与接入方式</title><desc id="desc">图解能力、三方职责、五步流程、Skills与脚本和工作流原理、用户参与、目标、价值场景、项目接入、真实验证与边界。此次22项存储和17项浏览器检查通过；先前自主选择需求不等于默认无需用户参与。</desc>')
p.append('<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L7 4 L0 8" fill="none" stroke="#668579" stroke-width="1.5"/></marker></defs><g font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">')
rect(0,0,W,H,CREAM,0);rect(0,0,W,244,INK,0)
text(64,53,'014 / GITHUB 研究集                         OUR UNDERSTANDING · 修订于 2026.09.22',20,'#bed4c5')
text(64,119,'Spec Kit：从一个想法，到可验收的产品',47,'#fff',700)
text(64,166,'你决定目标与关键取舍  ·  Spec Kit 提供规程与编排能力  ·  编码 AI 和工具实际执行',26,'#e0eddf')
text(64,210,'可以从一句想法开始；自动推进多少，取决于授权、需求清晰度、所用流程与执行环境。',24,'#bed4c5')
section(299,'01','先分清：谁在做什么？','流程工具包，不是独立的大模型')
card(64,325,502,185,'你 · 产品目标与判断',['提出用户、问题、范围与限制','决定重要取舍，审阅阶段结果','验收做出的产品是否符合需要'])
card(589,325,502,185,'Spec Kit · 开发过程的支撑',['用 Skills 说明各阶段怎么做','用模板、文件衔接输入与产物','用脚本及可选工作流组织执行'],GREEN)
card(1114,325,502,185,'编码 AI + 工具 · 执行者',['理解需求，研究并作出设计','写文档与代码、运行测试','依据结果修复和继续迭代'])
text(82,550,'流程提示不能替代产品判断；脚本能检查前置条件，业务是否正确仍需要真实验证。',24)
section(610,'02','能力主线：把想法连接到实现与验收')
rect(64,637,1552,48,'#e2e9df',10)
text(84,669,'先约定项目原则 constitution：质量、测试、已有架构与边界；每个功能再走下面的流程。',23)
stages=[('1  明确需求','specify · 按需 clarify','用户行为、范围、验收','产物：spec.md'),('2  制定方案','plan','技术选择、数据与接口','产物：plan.md 等'),('3  拆分任务','tasks','工作顺序、依赖、交付','产物：tasks.md'),('4  实际开发','implement','AI 按任务实现并验证','产物：代码与检查结果'),('5  核对完成','converge','对照规格找未完成项','产物：缺口与追加任务')]
for i,(label,command,a,b) in enumerate(stages):
 x=64+i*315;rect(x,705,292,162);text(x+19,744,label,26,INK,650,right=x+278);text(x+19,778,command,20,MUTED,right=x+278);lines(x+19,815,[a,b],21,31,right=x+278)
 if i<4:arrow(x+296,792,x+309,792)
arrow(1455,882,1455,905);arrow(1455,905,1147,905);arrow(1147,905,1147,882)
text(83,909,'发现缺口 → 回到 implement 补齐 → 再检查；converge 本身不负责改业务代码。',22)
text(83,949,'可达目标：可运行原型、约定范围内的产品或新功能、可继续迭代的代码与文档。',23,INK,600)
text(83,984,'可选扩展：bug 故障修复、assess 想法评估；是独立入口，不是每次都必走。',22,MUTED)
section(1041,'03','底层原理：Skills 是核心载体，但不是全部')
for i,(label,ss,fill) in enumerate([('指令 / Skills',['读哪些项目材料','按什么步骤开展工作','交什么产物、怎样核对'],GREEN),('模板 / 持久文档',['规定规格与任务的结构','下一阶段读上一阶段产物','把依据留在项目中'],'#fff'),('CLI / 辅助脚本',['安装、初始化、管理接入','准备目录、定位当前功能','执行部分确定性检查'],'#fff'),('可选 Workflow',['调用命令、AI 与脚本','串联步骤、循环与分支','暂停恢复、人工审核节点'],PURPLE)]):card(64+i*394,1069,370,186,label,ss,fill,22)
text(84,1296,'原理链：AI 读取指令和项目文件 → 调用工具执行 → 保存产物 → 下阶段读取 → 按要求复核。',23)
text(84,1333,'Skill 的核心价值是“输入、动作、产物、检查”的约定；不是换了一个更强的大模型。',23)
section(1390,'04','何时需要你参与？能否自动连续做？','交互来自需求、授权和具体工作流')
card(64,1418,502,216,'需求已清楚 / 有合理默认',['AI 可以记录假设后继续','不必每个小细节都询问','你仍可纠正范围与默认选择','适合已明确、可验证的工作'])
card(589,1418,502,216,'重要分歧 / 没有合理默认',['应把问题与选择交给你','你的回答进入需求文档','后续方案、任务随之改变','例如：恢复要覆盖还是合并？'],AMBER)
card(1114,1418,502,216,'授权连续推进 / 可选编排',['AI 可按约定连续执行多个阶段','Workflow 也能自动串联步骤','内置示例有需求、方案审核点','需核对版本与支持的 AI 接入'],PURPLE,22)
rect(64,1651,1552,80,'#e8ece4',10)
text(83,1684,'这次为什么没有充分问你？我自行选了“备份恢复、全量替换、撤销规则”，然后连续实施。',23)
text(83,1716,'这是本次演示的自主取舍；没有模拟你的回答，也不能证明所有产品都不需要人参与。',22,MUTED)
section(1789,'05','对你的价值：让想法落地有依据，让结果可以检查')
card(64,1817,502,217,'开发前 · 把想法讲具体',['把“我想要……”变成用户行为','暴露范围、取舍和遗漏条件','先约定“怎样才算做完”','避免只靠 AI 猜你的意思'],GREEN)
card(589,1817,502,217,'开发中 · 有依据地推进',['拆分复杂工作，保留决策理由','让任务与需求前后对应','换会话、换人时有文档可读','降低遗漏与反复解释的可能'])
card(1114,1817,502,217,'开发后 · 查漏与持续迭代',['检查约定功能是否真正落实','用实际结果发现未完成的部分','保留代码、规格与验收记录','为后续修改提供明确起点'])
text(83,2073,'这些是流程预期收益；本次没有做“使用 / 不使用 Spec Kit”的效率对照，不能量化提升。',22,MUTED)
section(2131,'06','什么时候值得用？与普通 Skill 有何差异？')
card(64,2159,502,201,'适合完整使用',['规则多、步骤多的新功能','持续迭代的产品与内部工具','多人交接、需要追踪验收','已有产品可从下一项改动开始'])
card(589,2159,502,201,'可以轻量使用',['已有流程，只补需求或验收','简单改字、调色、小脚本','完整流程可能增加文档负担','选用需要的阶段即可'],GREEN)
card(1114,2159,502,201,'差异在组织内容',['单项 Skill 常聚焦一类工作','Spec Kit 衔接定义到交付各阶段','其他 Skill 也能做类似流程','没有必然的技术代差'],size=22)
section(2407,'07','如何接入与使用？本项目已经接入到哪里？')
card(64,2435,502,218,'1 / 接到编码 AI 的项目里',['安装 Specify CLI，初始化项目','选择要使用的 AI 集成','生成 .specify 与技能文件','用扩展、预设定制组织规则'])
card(589,2435,502,218,'2 / 在 AI 对话里执行流程',['先说明目标、边界和验收','调用 specify → plan → tasks','再 implement ↔ converge','重要决定是否先确认，要说清'],GREEN,22)
card(1114,2435,502,218,'3 / 当前接入状态',['研库：Spec Kit 1.0.9 已安装','已使用 Codex Skills 集成','本次由 AI 按技能连续推进','未运行 Workflow 自动编排'],PURPLE,22)
rect(64,2670,1552,100,INK,13)
text(86,2706,'给 AI 的使用指令示例',21,'#bed4c5',600)
text(86,2746,'“用 Spec Kit 做这个功能。需求中重要的取舍先问我；其余记录假设，按规格实现并实际验收。”',24,'#fff')
section(2829,'08','这次真实演示：一条规则如何落到产品行为？')
rect(64,2857,1552,178)
for i,(label,ss) in enumerate([('需求',['“预览后若有新编辑，','就不能覆盖新数据。”']),('方案',['保存持续递增的版本，','确认恢复时重新检查。']),('实现',['检测到旧预览就拒绝，','提示重新读取与预览。']),('验证',['先预览，再从别处修改，','实际确认：新数据仍保留。'])]):
 x=89+i*390;text(x,2897,label,25,INK,650,right=x+345);lines(x,2938,ss,22,34,right=x+345)
 if i<3:arrow(x+343,2944,x+369,2944)
e=ROOT/'practice/research-workbench/evidence/restore'
s=json.loads((e/'storage-verification.json').read_text('utf-8'));b=json.loads((e/'browser-verification.json').read_text('utf-8'))
rect(64,3051,1552,70,GREEN,12)
text(84,3095,f"已实测：A 版备份 → B 版现状 → 恢复 A → 撤销回 B   ·   {s['passed']} 项存储 + {b['passed']} 项浏览器检查通过",24,INK,600)
section(3180,'09','明确边界：怎样评价它，才不会高估或低估？')
rect(64,3208,1552,129)
lines(86,3243,['可支撑从想法到可用产品；不能保证任意想法一次成功、零缺陷、自动满足全部真实业务需求。','需要编码 AI、可用工具和执行条件；文档与测试仍要维护，部署与外部资源也需要相应配置。','本图和研究网页是我们制作的说明界面；本次测试证明已测功能可用，不代表无人值守产品生成已获验证。'],22,34)
text(80,3381,'核对依据：官方说明（2026-09-22）＋实际安装技能＋本地规格、代码与运行报告。点击矢量图中的来源可核对。',20,MUTED)
link(80,3420,'官方总览 ↗','https://github.com/github/spec-kit')
link(291,3420,'开发流程 ↗','https://github.github.io/spec-kit/quickstart.html')
link(502,3420,'工作流编排 ↗','https://github.github.io/spec-kit/reference/workflows.html')
link(760,3420,'已有项目接入 ↗','https://github.github.io/spec-kit/guides/existing-projects.html')
link(1062,3420,'本轮真实证据 ↗','./evidence/restore/spec.md')
text(80,3471,'我们的采用方式：重要产品判断由你参与；让 AI 在明确的范围内，持续实现、验证并留下依据。',25,INK,650)
p.append('</g></svg>')
target=ROOT/'assets/understanding-map.svg';target.write_text('\n'.join(p),encoding='utf-8');print(target)
