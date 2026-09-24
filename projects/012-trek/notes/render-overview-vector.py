"""Create an original, text-accurate SVG research infographic (no raster editing)."""
from pathlib import Path
from html import escape
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "trek-research-overview-vector.svg"
W, H = 3840, 2880
C = {"paper":"#F5F2EA", "ink":"#122C43", "muted":"#5B6C79", "line":"#D8DFDF", "blue":"#286593", "bluebg":"#EAF2F8", "green":"#22755E", "greenbg":"#E8F3ED", "amber":"#936119", "amberbg":"#FAF0D8", "grey":"#64717B", "greybg":"#EBEEEF", "white":"#FFFDF8"}
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">', '<title id="title">TREK 研究全景图</title>', '<desc id="desc">从旅行管理基础，到可信城市导览。汇总 TREK 原生能力、实现原理、本地研究、可扩展目标和对产品负责人的意义。当前暂停产品实现。</desc>', '<style>text{font-family:"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif} .bold{font-weight:700}</style>']
checks = []

def rect(x,y,w,h,fill,stroke=None,r=18):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="2"' if stroke else '')+'/>')

def line(x1,y1,x2,y2,color=None,width=2):
    parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color or C["line"]}" stroke-width="{width}"/>')

def est_width(s, size):
    return sum(1 if ord(c)>255 else 0.63 if c.isupper() else 0.56 for c in s)*size

def txt(s,x,y,size=32,color=None,bold=False,max_width=None):
    width=est_width(s,size)
    checks.append({"text":s,"x":x,"y":y,"size":size,"estimatedWidth":round(width,1),"limit":max_width})
    if x+width>W-60 or y>H-30 or y-size<0:
        raise ValueError(f"Canvas overflow: {s}")
    if max_width and width>max_width:
        raise ValueError(f"Text width overflow: {s} ({width:.1f}>{max_width})")
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color or C["ink"]}"'+(' class="bold"' if bold else '')+'>'+escape(s)+'</text>')

def pill(s,x,y,width,color,bg,size=27):
    rect(x,y,width,47,bg,r=23)
    txt(s,x+21,y+33,size,color,bold=True,max_width=width-42)

def section(x,y,w,h,num,title,color,subtitle):
    rect(x,y,w,h,C['white'],C['line'],24)
    rect(x+32,y+35,72,62,color,r=12)
    txt(num,x+46,y+81,40,C['white'],True)
    txt(title,x+128,y+81,44,C['ink'],True,max_width=w-166)
    txt(subtitle,x+42,y+135,29,C['muted'],max_width=w-84)
    line(x+42,y+162,x+w-42,y+162)

def entry(x,y,width,title,body,color=C['ink'],tag=None,tag_width=180):
    txt(title,x,y,36,color,True,max_width=width-(tag_width+20 if tag else 0))
    if tag:
        label,tcolor,bg=tag
        pill(label,x+width-tag_width,y-36,tag_width,tcolor,bg,25)
    by=y+54
    for s in body:
        txt(s,x,by,32,C['muted'],max_width=width)
        by+=44
    return by

rect(0,0,W,H,C['paper'],r=0)
rect(100,92,10,110,C['blue'],r=4)
txt('TREK 研究全景图',139,180,96,C['ink'],True)
txt('从旅行管理基础，到可信城市导览',142,250,43,C['muted'])
pill('当前：暂停产品实现 · 沉淀能力与研究',2810,111,930,C['ink'],C['greybg'],34)

takeaways=[('它是什么','可自部署的旅行管理应用',C['blue'],C['bluebg']),('最值得复用','地点 → 行程 → 路线 → 保存',C['green'],C['greenbg']),('我们的机会','看图认识城市，点开就能行动',C['amber'],C['amberbg'])]
for x,(small,big,col,bg) in zip([100,1330,2560],takeaways):
    rect(x,312,1180,176,bg,r=20)
    txt(small,x+37,371,32,col,True)
    txt(big,x+37,439,47,C['ink'],True,max_width=1106)

section(100,547,1080,1358,'01','TREK 原生能力',C['blue'],'上游提供；不代表本地全部实测')
section(1220,547,1220,1358,'02','底层怎样工作',C['blue'],'旅行业务、地图服务与持久化各有职责')
section(2480,547,1260,1358,'03','我们已探索到哪里',C['green'],'分清已经完成、候选效果和后续构想')

x=142; width=996
items=[
('地点与地图',['搜索地点、周边分类探索、地图选点','照片与收藏']),
('行程与路线',['分日安排、住宿与交通、拖拽调整','顺序优化、道路路线']),
('旅途事务',['预订资料与附件、行李清单、待办任务']),
('费用与协作',['多币种分账、成员权限','实时协作、分享']),
('记录与输出',['旅行日记、到访统计、离线资料','PDF / GPX / ICS / CSV']),
('扩展与日常辅助',['插件、公共 API、MCP','天气、日历、通知；AI 辅助导入需配置'])]
for y,(title,body) in zip([774,965,1156,1347,1538,1729],items):
    entry(x,y,width,title,body,C['blue'])
    if y!=1729: line(x,y+141,x+width,y+141)

x=1262; width=1136
entry(x,774,width,'业务主链',['React 界面 → NestJS 接口 → SQLite 保存','WebSocket 同步旅行变更；权限控制读写'],C['blue'])
line(x,926,x+width,926)
entry(x,990,width,'地图与地点来自组合服务',['地点：TREK Places（Overture）＋ OSM','可选 Google / 高德补充','地图：Leaflet / MapLibre / Mapbox 接入'],C['blue'])
line(x,1191,x+width,1191)
entry(x,1255,width,'路线分成三件事',['最近邻＋2-opt：排列地点顺序','OSRM：计算道路、距离与估计时间','外部地图：承接实际导航'],C['blue'])
line(x,1456,x+width,1456)
entry(x,1520,width,'运行与外部依赖',['PWA 缓存＋部分离线编辑','AI / MCP 按配置启用','照片、天气、汇率、预订解析各有服务依赖'],C['blue'])
rect(x,1737,width,114,C['bluebg'],r=14)
txt('重点',x+26,1781,29,C['blue'],True)
txt('旅行业务整合 ≠ 自研地图与导航引擎',x+26,1827,33,C['ink'],True,max_width=width-52)

x=2522; width=1176
entry(x,774,width,'原版实测',['地图联动、道路、分账、清单与刷新保存'],C['green'],('已完成',C['green'],C['greenbg']),160)
line(x,878,x+width,878)
entry(x,932,width,'西安 V1',['13 个精选地点、7 个图上热点、真实地图','规则推荐、三日安排、导航入口、保存到 TREK','旧图仍有方位问题；热点为手工关联'],C['green'],('定制并归档',C['green'],C['greenbg']),228)
line(x,1124,x+width,1124)
entry(x,1178,width,'D0',['真实资料、图片、地图和出行信息','用同一地点编号串联'],C['grey'],('设计',C['grey'],C['greybg']),135)
line(x,1326,x+width,1326)
entry(x,1380,width,'E1',['4 处地标验证：全域定位＋局部放大','保持给定输入坐标关系'],C['green'],('布局验证',C['green'],C['greenbg']),205)
line(x,1528,x+width,1528)
entry(x,1582,width,'E2',['4 张实拍参考生成素材，程序按锚点放置','大雁塔误画 6 层 → 修正为 7 层'],C['amber'],('素材候选',C['amber'],C['amberbg']),205)
rect(x,1692,width,56,C['amberbg'],r=10)
txt('关键收获：位置正确 ≠ 建筑画对',x+22,1732,32,C['amber'],True,max_width=width-44)
entry(x,1807,width,'E3',['完整出行链路、任意城市自动生成尚未实现'],C['grey'],('未执行',C['grey'],C['greybg']),180)

section(100,1945,2310,690,'04','可扩展目标：第一次到陌生城市',C['grey'],'产品构想 · 待验证')
section(2450,1945,1290,690,'05','对你的意义',C['green'],'先判断用户价值，再决定下一次投入')

def flow(labels,x,y,w,h,fill,color,size=31):
    gap=38
    node_w=(w-gap*(len(labels)-1))/len(labels)
    for i,s in enumerate(labels):
        sx=x+i*(node_w+gap)
        rect(sx,y,node_w,h,fill,r=12)
        tw=est_width(s,size)
        txt(s,sx+(node_w-tw)/2,y+h/2+size*.36,size,color,True,max_width=node_w-20)
        if i<len(labels)-1:
            txt('→',sx+node_w+6,y+h/2+11,29,C['muted'])

x=142
txt('游客体验',x,2150,31,C['ink'],True)
flow(['看图认识片区','选景点与餐厅','看费用与预约','查入口与导航','收藏安排'],x,2173,2226,73,C['greenbg'],C['green'])
txt('内容生产',x,2300,29,C['muted'],True)
flow(['真实地点与照片','地理布局','素材生成','受控合成','地点关联'],x,2324,2226,65,C['greybg'],C['grey'],29)
txt('核心规则',x,2444,32,C['ink'],True)
txt('同一地点编号连接插画、地图、详情与行程；票务资料独立更新',x+176,2444,31,C['muted'],max_width=2050)
txt('可延伸',x,2512,32,C['ink'],True)
txt('多城首访、街区与景区导览、亲子或轻体力路线',x+176,2512,31,C['muted'],max_width=2050)
txt('需要补齐',x,2580,32,C['ink'],True)
txt('入口核实、信息时效、图像质量、推荐依据、国内地图适配',x+176,2580,31,C['muted'],max_width=2050)

x=2492; width=1206
values=[('工程价值',['复用旅行业务与保存接口','降低从零搭建成本']),('产品价值',['把精力放在“帮人选去处','＋提供可信行动信息”']),('研究资产',['原版实测、V1 归档、数据、素材','和失败案例可继续复用']),('下一次决策',['先判断是否帮助用户选得更快、去得更明白','再决定继续投入'])]
for y,(title,body) in zip([2150,2272,2394,2516],values):
    txt(title,x,y,32,C['green'],True)
    for j,s in enumerate(body): txt(s,x+190,y+j*41,30,C['muted'],max_width=width-190)

line(100,2685,3740,2685,C['ink'],2)
txt('边界',100,2730,31,C['ink'],True)
txt('搜索 ≠ 个性化推荐   ｜   地点中心 ≠ 已核实入口   ｜   保存预订 ≠ 预约成功',216,2730,31,C['ink'],True)
txt('实时票务与交易需另接服务；E2 视觉质量未完成验收',100,2784,30,C['muted'])
txt('研究基准：TREK 4.3.0 / b98787f · 本地 V1、D0、E1、E2 记录 · 2026-09-22',100,2840,28,C['muted'],max_width=2550)
txt('github.com/liketrek/TREK · AGPL-3.0',2810,2840,28,C['muted'],max_width=930)
parts.append('</svg>')
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text('\n'.join(parts),encoding='utf-8')
print(json.dumps({'file':str(OUT),'width':W,'height':H,'textLines':len(checks),'minBodySize':28,'allTextWithinEstimatedBounds':True},ensure_ascii=False))
