"""Create a single Chinese overview as matching vector SVG and high-resolution PNG."""
from pathlib import Path
from html import escape
import base64
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
W, H, SCALE = 2160, 3520, 1.5
C = dict(bg='#10151e', panel='#192330', panel2='#243344', line='#394a5e',
         ink='#f4f6fa', muted='#bbc7d6', orange='#ff9a72', blue='#94c3fc',
         green='#b9e2ba', red='#e7ada1', light='#e9eef3', dark='#192a3b')
canvas=Image.new('RGB',(int(W*SCALE),int(H*SCALE)),C['bg'])
draw=ImageDraw.Draw(canvas)
fonts={}
elements=[]
text_bounds=[]
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
     '<title id="title">Pireel 能力、原理与使用价值全景图</title>',
     '<desc id="desc">素材与效果映射、人和AI的职责、编辑与合成技术、45秒变28秒的原版案例、工具与学习价值、使用场景和验证边界。</desc>',
     '<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}</style>']

def color(c):return C.get(c,c)
def rect(x,y,w,h,fill='panel',r=12,stroke=None):
    draw.rounded_rectangle((x*SCALE,y*SCALE,(x+w)*SCALE,(y+h)*SCALE),radius=r*SCALE,fill=color(fill),outline=color(stroke) if stroke else None,width=2)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{color(fill)}"'+(f' stroke="{color(stroke)}"' if stroke else '')+'/>')

def line(x1,y1,x2,y2,fill='line',width=2):
    draw.line((x1*SCALE,y1*SCALE,x2*SCALE,y2*SCALE),fill=color(fill),width=max(1,round(width*SCALE)))
    svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color(fill)}" stroke-width="{width}"/>')

def arrow(x1,y,x2,fill='blue'):
    line(x1,y,x2,y,fill,3)
    line(x2-12,y-9,x2,y,fill,3);line(x2-12,y+9,x2,y,fill,3)

def font(size,bold=False):
    key=(size,bold)
    if key not in fonts:fonts[key]=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',round(size*SCALE))
    return fonts[key]

def t(x,y,s,size=28,fill='ink',bold=False,anchor='start',maxw=None):
    f=font(size,bold);width=draw.textlength(s,font=f)/SCALE
    if maxw is not None:assert width<=maxw,(s,width,maxw)
    left=x-width if anchor=='end' else x-width/2 if anchor=='middle' else x
    assert left>=0 and left+width<=W,(s,left,width)
    draw.text((x*SCALE,y*SCALE),s,font=f,fill=color(fill),anchor={'start':'ls','end':'rs','middle':'ms'}[anchor])
    svg.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color(fill)}" font-weight="{700 if bold else 400}" text-anchor="{anchor}">{escape(s)}</text>')
    text_bounds.append(dict(text=s,x=round(left,2),baseline=y,width=round(width,2),size=size))

def lines(x,y,ss,size=28,fill='muted',gap=42,bold=False,maxw=None):
    for i,s in enumerate(ss):t(x,y+i*gap,s,size,fill,bold,maxw=maxw)

def heading(y,n,title,sub=''):
    t(72,y,n,42,'orange',True)
    t(151,y-2,title,38,'ink',True)
    if sub:t(2088,y-2,sub,24,'muted',anchor='end')

def pill(x,y,w,s,fill='panel2',ink='muted'):
    rect(x,y,w,38,fill,8);t(x+w/2,y+27,s,22,ink,True,'middle',w-20)

def picture(x,y,w,h,path):
    img=Image.open(path).convert('RGB');img.thumbnail((round(w*SCALE),round(h*SCALE)))
    canvas.paste(img,(round(x*SCALE),round(y*SCALE)))
    uri=base64.b64encode(path.read_bytes()).decode()
    svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/png;base64,{uri}" preserveAspectRatio="xMinYMin meet"/>')

# Editorial identity and one-sentence definition.
rect(72,48,6,161,'orange',0)
t(102,79,'PIREEL / 开源视频编辑研究 · 016',25,'orange',True)
t(98,159,'能剪素材，也能做动态图文。',68,'ink',True)
t(102,212,'把我们的理解连成一条线：输入 → 决策 → 编辑 → 合成 → 成片 → 使用价值',29,'muted')
pill(1770,63,318,'基于源码与本机实测','panel2','blue')
t(2088,160,'Pireel Studio',31,'blue',True,'end')
t(2088,205,'开源版本 b824ee2',23,'muted',anchor='end')
rect(72,249,2016,104,'orange',10)
t(104,295,'核心定位：可由人或 AI 操作的视频编辑与动态图文合成系统。',35,'dark',True)
t(104,333,'AI 或人决定表达与取舍；编辑程序负责执行、计算画面、处理声音并导出。',28,'dark')

# Material-to-effect matrix, not a file-format promise.
heading(419,'01','给它什么素材，可以得到什么效果？','不限于已有视频，也可从图片、文字和图形开始')
rect(72,453,2016,444,'panel',10)
for x,s in [(104,'输入素材'),(688,'编辑与合成操作'),(1512,'对应效果')]:t(x,495,s,25,'blue',True)
line(104,516,2054,516)
rows=[
 ('视频 / 录屏 / 口播','截取、分割、排序、调整画面取景','讲解精剪、产品演示、片段集锦'),
 ('图片 / 照片 / 截图','设置时长、移动缩放、与其他内容叠加','图文短片、截图讲解、展示画面'),
 ('现成配音 / 背景音乐','按时间对齐、调音量、淡入淡出与混音','旁白配画面、背景音乐'),
 ('文字 / 已有字幕','排版、定时显示、设置动态入场效果','动态标题、字幕、重点提示'),
 ('数字 / 图表 / 步骤数据','配置图形组件，由动画时间线驱动','动态数字、图表、步骤卡片'),
]
for i,(a,b,c) in enumerate(rows):
    y=567+i*65
    t(104,y,a,29,'ink',True,maxw=535);t(688,y,b,28,'muted',maxw=765);t(1512,y,c,27,'ink',maxw=550)
    if i<4:line(104,y+22,2054,y+22,'line',1)
t(104,879,'提示：自动转写、文字生成配音属于额外服务；已有字幕、配音和音乐可作为素材使用。',24,'muted')

# Decision layer separated from the deterministic editor.
heading(963,'02','谁做决定？谁真正制作视频？')
nodes=[(72,560,'谁来决定怎么剪？','orange'),(720,720,'Pireel：保存并执行编辑安排','blue'),(1528,560,'最后得到什么？','green')]
for x,w,label,c in nodes:
    rect(x,1000,w,276,'panel',10);t(x+26,1048,label,30,c,True,maxw=w-52)
lines(98,1103,['人：在画布与时间线上直接操作','外接 AI：理解要求，提出剪辑安排','本例由模型操作，未接通自动流程'],27,'ink',45,maxw=509)
lines(746,1103,['工程记录素材、轨道、片段、文字与效果','执行裁切、排列、音画对齐与图层合成','预览与调整围绕同一个工程进行'],28,'ink',45,maxw=668)
lines(1554,1103,['可预览、可继续修改的编辑工程','MP4 / MOV / WebM 视频文件','格式与编码受浏览器支持情况约束'],27,'ink',45,maxw=508)
arrow(646,1134,705);arrow(1454,1134,1513)
rect(72,1299,2016,61,'panel2',8)
t(1080,1341,'提出目标 → 编辑 → 预览 → 人或 AI 修改同一工程 → 确认后导出',29,'ink',True,'middle')

# Render chain with named technologies and role boundaries.
heading(1432,'03','底层怎么生成画面与声音？','当前本地导出路径：浏览器内逐帧合成')
stages=[
 ('编辑引擎','Pireel Composition / trim',['管理轨道与时间映射','例如原片 9–37 秒','映射到成片 0–28 秒']),
 ('图文动画','HTML / CSS + GSAP',['排版与计算动画状态','每个时刻的位置、大小','透明度与入场效果']),
 ('画面合成','Canvas / 浏览器绘图',['把视频帧、图片和文字','叠加为每一帧的画面','部分转场使用 WebGL']),
 ('媒体处理','Mediabunny + WebCodecs',['读取媒体、调用编解码','音频按编辑时间处理','把画面和声音封装成文件']),
 ('视频文件','本例：H.264 + AAC',['28 秒 × 24 帧 / 秒','＝ 672 帧画面 + 音频','输出可播放的 MP4']),
]
for i,(label,tech,body) in enumerate(stages):
    x=72+i*410
    rect(x,1475,376,276,'panel',10)
    t(x+24,1521,f'{i+1:02d}  {label}',30,'blue',True,maxw=332)
    t(x+24,1570,tech,24,'orange',True,maxw=332)
    lines(x+24,1623,body,25,'ink',40,maxw=332)
    if i<4:arrow(x+382,1606,x+403)
rect(72,1775,2016,166,'light',10)
t(104,1820,'这里的“生成动画”：程序计算并绘制每一帧；不是视频大模型凭描述创造场景与人物。',29,'dark',True)
t(104,1867,'Remotion：另一套程序化视频方案，本次未使用。FFmpeg：用于准备本例输入素材，不是原版导出的主链。',26,'dark')
t(104,1911,'WebCodecs 是接口；实际软件或硬件编解码实现由浏览器与设备决定，不能认定总是或完全不使用 FFmpeg。',26,'dark')

# One actually executed case, with authentic stills and scaled timelines.
heading(2013,'04','把原理放进一个真实任务：向同事介绍 Blinko','原版 Studio 已完成剪辑并导出')
rect(72,2051,2016,325,'panel',10)
pill(96,2072,174,'剪前 · 45 秒');pill(576,2072,174,'剪后 · 28 秒','panel2','green')
picture(96,2126,376,211,OUT/'story/before-poster.png')
picture(576,2126,376,211,OUT/'story/after-poster.png')
arrow(490,2230,551,'orange')
timeline_x=1002;unit=23
t(timeline_x,2108,'删掉废话，保留功能与总结，再叠加动态文字。',27,'ink',True,maxw=1044)
labels=[('开场',9,False),('记录',9,True),('标签',6,True),('搜索',6,True),('总结',7,True),('结尾',8,False)]
x=timeline_x
for label,d,keep in labels:
    width=unit*d-4
    rect(x,2138,width,57,'#294148' if keep else '#493237',4)
    t(x+width/2,2176,f'{label} {d}s',23,'green' if keep else 'red',True,'middle',width-8)
    if not keep:line(x+9,2190,x+width-9,2146,'red',1)
    x+=unit*d
x=timeline_x
for label,d,keep in labels:
    if keep:
        width=unit*d-4;rect(x,2230,width,57,'#294148',4)
        t(x+width/2,2268,f'{label} {d}s',23,'green',True,'middle',width-8);x+=unit*d
t(x+18,2268,'28 秒',28,'green',True)
t(timeline_x,2331,'删 17 秒  +  4 段动态文字  +  保留中文解说',29,'orange',True,maxw=1044)
t(96,2358,'输入说明：真实软件截图 + 本机合成解说，预先制成原片；截图取景变化已存在于输入素材中。',23,'muted')

# Value: use the tool and learn from the implementation.
heading(2442,'05','对我们的两项核心价值','选用价值与学习价值分开判断')
rect(72,2478,990,256,'panel',10);rect(1094,2478,994,256,'panel',10)
t(102,2531,'A  用作剪辑工具，配合 AI',34,'orange',True)
lines(102,2585,['把已有素材整理成视频，预览、手改并导出。','目标流程：AI 初剪 → 人检查修改 → 导出。','收益：复用现成工作台，减少编辑系统开发。'],29,'ink',49,maxw=929)
t(1124,2531,'B  参考实现，理解编辑器原理',34,'blue',True)
lines(1124,2585,['研究素材管理、时间映射、音画同步与图层合成。','研究预览、导出和 Agent 如何操作同一个工程。','学习重点是编辑系统，不是 H.264 压缩算法。'],29,'ink',49,maxw=934)

# Concrete scenes without implying automatic decisions are already installed.
heading(2807,'06','哪些场景更适合它？')
scenarios=[('产品演示与教程','录屏 + 重点标题 + 配音'),('口播与访谈精剪','整理片段 + 字幕 + 音频'),('动态图文与数据视频','图片 + 文字 + 图表动画'),('同一内容的多个版本','重排内容 + 调整横竖画幅')]
for i,(title,body) in enumerate(scenarios):
    x=72+i*512
    rect(x,2844,480,124,'panel',8)
    t(x+22,2891,title,29,'ink',True,maxw=436)
    t(x+22,2937,body,25,'muted',maxw=436)
t(72,3011,'只有固定裁切、拼接或批量转码时，直接调用媒体处理工具也可能足够；是否采用，要看它能省多少实际工作。',27,'muted')

# Verified scope and honest limits.
rect(72,3054,990,261,'#20342e',10);rect(1094,3054,994,261,'#382f28',10)
t(102,3105,'已实测 / 有证据',32,'green',True)
lines(102,3157,['原版：导入、裁切、动态文字、声音保留与导出。','案例：45 秒 → 28 秒有声 MP4。','组件实验室：真实上游图形组件 + 另写展示层；','其 12 秒样片与原版案例是两种不同复现。'],27,'ink',41,maxw=930)
t(1124,3105,'尚未接通 / 不应误解',32,'orange',True)
lines(1124,3157,['本地未接通 AI 自动编排、自动转写和音色配音。','音色面板有入口，但所需后台服务没有接上。','没有验证复杂工程的稳定性或完整自动剪辑。','“能做动态图文”不等于自带视频生成大模型。'],27,'ink',41,maxw=934)
line(72,3356,2088,3356)
t(72,3397,'结论：它提供编辑与合成系统；价值在于可用、可改、可集成，以及可研究的工程实现。',30,'ink',True)
t(72,3444,'依据：Pireel b824ee2 源码（Composition / trim / client-export / audio-mix / providers）及本机导出记录。',23,'muted')
t(72,3484,'研究日期：2026-09-22  ·  上游：github.com/pireel/pireel  ·  原库许可：AGPL-3.0-only  ·  场景与使用价值为研究判断。',22,'muted')
svg.append('</svg>')
(OUT/'pireel-overview.svg').write_text('\n'.join(svg)+'\n',encoding='utf-8')
canvas.save(OUT/'pireel-overview.png',optimize=True)
canvas.resize((1080,1760),Image.Resampling.LANCZOS).save(OUT/'pireel-overview-preview.png',optimize=True)
(OUT/'pireel-overview-layout.json').write_text(json.dumps(text_bounds,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Created {OUT / "pireel-overview.png"}: {canvas.width} x {canvas.height}')
