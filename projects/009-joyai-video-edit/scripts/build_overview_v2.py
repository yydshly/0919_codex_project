"""Editorial video-workbench overview, with unaltered official preview frames."""
from html import escape
from pathlib import Path
import base64

PROJECT = Path(__file__).resolve().parents[1]
OUT = PROJECT / 'assets/joyai-capability-overview-v2.svg'
W, H = 2160, 3020
P = dict(bg='#0c131c', panel='#17222f', panel2='#202e3d', line='#3a4b5f',
         ink='#f4f6f8', muted='#b3c2d3', lime='#d4fb73', blue='#91bfff',
         light='#e9eff4', dark='#142233', amber='#f8c780')
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
     '<title id="title">JoyAI-Video-Edit：把已有视频，变成新的视觉版本</title>',
     '<desc id="desc">基于官方案例与源码研究的中文总览：能力、输入输出、核心原理、实际意义、后期参考价值、部署门槛与验证边界。</desc>',
     '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#91bfff" stroke-width="1.6"/></marker><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity=".04"/></pattern></defs>',
     '<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}.mono{font-family:Consolas,monospace}</style>']

def rect(x,y,w,h,fill='panel',r=0,stroke=None):
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{P.get(fill,fill)}"'+(f' stroke="{P.get(stroke,stroke)}"' if stroke else '')+'/>')

def t(x,y,s,size=29,fill='ink',weight=400,anchor='start',mono=False):
    svg.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{P.get(fill,fill)}" font-weight="{weight}" text-anchor="{anchor}"'+(' class="mono"' if mono else '')+f'>{escape(s)}</text>')

def lines(x,y,rows,size=28,fill='muted',gap=43,weight=400):
    for i,s in enumerate(rows): t(x,y+i*gap,s,size,fill,weight)

def line(x1,y1,x2,y2,fill='line',width=2,arrow=False):
    svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{P.get(fill,fill)}" stroke-width="{width}"'+(' marker-end="url(#arrow)"' if arrow else '')+'/>')

def path(d,fill='blue',width=3,arrow=True):
    svg.append(f'<path d="{d}" stroke="{P.get(fill,fill)}" stroke-width="{width}" fill="none"'+(' marker-end="url(#arrow)"' if arrow else '')+'/>')

def pill(x,y,w,label,fill='panel2',color='muted'):
    rect(x,y,w,38,fill,6)
    t(x+w/2,y+27,label,22,color,600,'middle')

def image(x,y,w,h,name):
    uri=base64.b64encode((PROJECT/'assets/media'/name).read_bytes()).decode()
    svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/jpeg;base64,{uri}" preserveAspectRatio="xMidYMid meet"/>')

def heading(y,n,title,sub=''):
    t(64,y,n,48,'lime',700,mono=True)
    t(150,y-2,title,40,'ink',700)
    if sub:t(2094,y-2,sub,24,'muted',anchor='end')

rect(0,0,W,H,'bg')
rect(0,0,W,1200,'url(#grid)')
rect(64,44,6,158,'lime')
t(92,72,'JOYAI-VIDEO-EDIT  /  OPEN-SOURCE RESEARCH 009',25,'blue',mono=True)
t(89,151,'把已有视频，变成新的视觉版本。',66,'ink',700)
t(93,204,'改画面内容 · 延续原始素材 · 支持连续视频流',31,'muted')
pill(1716,52,378,'不是完整剪辑软件','lime','dark')
t(2093,164,'能力 × 原理 × 使用价值',25,'lime',600,'end')
t(2093,204,'官方资料研究 / 尚未本地运行模型',23,'muted',400,'end')

# A single visual equation anchors the entire reading order.
rect(64,244,2032,117,'lime',10)
t(99,291,'输入',23,'dark',600)
t(99,334,'原视频 / 摄像头',38,'dark',700)
t(485,324,'+',43,'dark',600)
t(553,291,'编辑要求',23,'dark',600)
t(553,334,'文字指令',38,'dark',700)
t(805,324,'+',43,'dark',600)
t(869,291,'可选条件',23,'dark',600)
t(869,334,'参考图片',38,'dark',700)
t(1161,326,'→',59,'dark',700)
t(1294,291,'模型持续生成',23,'dark',600)
t(1294,334,'修改后的视频 / 连续画面',39,'dark',700)

# Three photographic pairs are native images from official examples.
t(64,411,'先看得到的变化',34,'ink',700)
t(2096,409,'以下为官方预览的首帧，不是本机生成结果',24,'muted',anchor='end')
examples=[('case04','换装与配饰','原动作延续，服装发生变化'),
          ('case05','移除指定主体','两侧白猫消失，背景得到补全'),
          ('case02','改变整体风格','保留画面基础，转为水彩风格')]
for i,(case,title,caption) in enumerate(examples):
    x=64+i*688
    rect(x,437,656,276,'panel',10)
    t(x+17,472,title,29,'ink',600)
    pill(x+475,449,165,'官方案例')
    image(x+12,489,306,176,case+'_source.jpg')
    image(x+338,489,306,176,case+'_edited.jpg')
    rect(x+18,496,69,28,'#101926',4);t(x+52,516,'原始',18,'ink',600,'middle')
    rect(x+344,496,69,28,'lime',4);t(x+378,516,'结果',18,'dark',600,'middle')
    t(x+328,584,'›',37,'lime',600,'middle')
    t(x+17,697,caption,24,'muted')

# Capability grid and a semantic object map.
heading(792,'01','它能改什么？','核心能力：视频内容改写，不局限于人像')
capabilities=[
    ('换风格','水彩 / 卡通 / 手绘动画','已展示'),
    ('换装与配饰','外套 / 裙装 / 帽子 / 墨镜','已展示'),
    ('主体变换','真人 → 机器人等形象','已展示'),
    ('删除 / 添加','移除目标，或增加内容','部分展示'),
    ('换场景','办公室 → 古代宫殿','已展示'),
    ('局部外观','毛色 / 颜色 / 局部细节','已展示'),
    ('参考图引导','按服装图或目标外观编辑','已展示'),
    ('组合编辑','换装 + 背景 + 风格','已展示')]
for i,(title,body,evidence) in enumerate(capabilities):
    x=64+(i%4)*340;y=826+(i//4)*164
    rect(x,y,322,145,'panel',7)
    t(x+17,y+40,title,30,'ink',700)
    t(x+17,y+82,body,22,'muted')
    t(x+17,y+120,evidence,21,'lime' if evidence=='已展示' else 'amber')
rect(1451,826,645,309,'light',9)
t(1480,873,'处理的是画面中的内容',34,'dark',700)
t(1480,923,'人  /  动物  /  物体  /  环境',32,'dark',600)
line(1480,947,2064,947,'#bdcad6')
lines(1480,984,['“换人”需区分形象替换与指定真人替换。',
                  '指定真人、删除人物、一般物体替换：',
                  '当前未实测，不能从案例推定稳定成功。'],26,'dark',42)
rect(64,1153,2032,65,'#332c23',8)
t(88,1195,'补充边界：官方声明支持运动变化，但其幅度与稳定性尚未验证；文字、Logo、身份与复杂花纹也不保证精确保留。',26,'amber')

# Mechanism: two condition branches, a denoising core, decoder and feedback.
heading(1293,'02','它怎样做到？','原视频是约束，生成历史帮助连续；重新生成像素，不只是贴滤镜')
rect(64,1327,2032,525,'panel',10)
rect(64,1327,2032,525,'url(#grid)',10)
rect(94,1363,461,131,'panel2',7)
t(116,1403,'读懂目标 · 多模态语言模型',27,'blue',700)
lines(116,1444,['首帧 + 指令 → 条件表示', '提取画面语义与修改意图'],26,'ink',35)
rect(94,1520,461,131,'panel2',7)
t(116,1560,'压缩画面 · 因果视频 VAE',27,'blue',700)
lines(116,1601,['源视频 + 参考图 → 潜在表示', '用紧凑特征降低生成计算量'],26,'ink',35)
path('M555 1428H613V1491H664')
path('M555 1583H613V1543H664')
rect(681,1388,774,240,'#29402e',10,stroke='#6a8b44')
t(709,1432,'16B',53,'lime',700,mono=True)
t(871,1432,'扩散 Transformer',33,'ink',700)
t(1426,1432,'160 亿参数',25,'lime',600,'end')
lines(709,1483,['融合源视频、编辑条件、参考图与历史',
                  '在潜在空间通过去噪生成当前片段',
                  '蒸馏后仅需两步去噪，再交给解码器'],30,'ink',50)
path('M1456 1510H1544')
rect(1563,1388,500,240,'panel2',8)
t(1588,1438,'解码 → 输出 → 继续',32,'blue',700)
lines(1588,1490,['VAE 还原成可观看的画面',
                   '逐块输出，不必等待视频录完',
                   '继续接收下一段视频输入'],26,'ink',44)
rect(719,1658,1315,53,'#0d1926',6)
t(747,1694,'首块 + 近期 KV 缓存 → 让后续画面延续外观，限制历史显存增长',26,'muted')
path('M1813 1628V1650')
path('M719 1686H650V1609H674')
for x,title,desc in [(98,'分块自回归','参考过去，按片段持续生成'),(755,'两步去噪 + 工程加速','FP8 / 算子融合 / 计算图'),(1440,'训练时抑制漂移','源视频锚定 + 长序列优化')]:
    t(x,1763,title,28,'lime',600)
    t(x,1811,desc,25,'muted')

# Value is distinct from technical claims, and includes reuse directions.
heading(1926,'03','对我们有什么用，之后值得借鉴什么？','以下为应用判断与研究建议，不是已验证的收益承诺')
value_cols=[
    (64,'当下的使用价值','把素材的复用空间打开',[
        ('创意预览','拍一次，尝试多种画风和场景'),
        ('电商内容','做换装与搭配创意，细节另行验收'),
        ('互动体验','摄像头造型、展厅互动、视觉特效')]),
    (752,'后期的技术参考','值得学的是整条处理链',[
        ('流式架构','分块计算 + 有限缓存，控制长时开销'),
        ('推理提速','少步蒸馏 + 量化 + 编译协同优化'),
        ('服务组织','浏览器 ⇄ 视频服务 ⇄ GPU 推理')]),
    (1440,'后期的产品参考','用真实任务验证是否值得接入',[
        ('产品交互','源视频 + 指令 + 参考图 + 即时对照'),
        ('质量评测','指令遵循 / 内容保留 / 时序一致性'),
        ('投入决策','端到端延迟 / 并发 / 成本 / 失败率')])]
for x,title,sub,rows in value_cols:
    rect(x,1962,656,364,'panel',8)
    rect(x,1962,656,6,'lime' if x==64 else 'blue')
    t(x+25,2010,title,34,'ink',700)
    t(x+25,2050,sub,25,'muted')
    for i,(label,desc) in enumerate(rows):
        y=2111+i*72
        t(x+25,y,label,26,'lime' if x==64 else 'blue',600)
        t(x+25,y+36,desc,24,'ink')

# Deployment in a narrow, high-contrast rail; the action sequence is explicit.
rect(64,2354,2032,220,'light',10)
t(93,2403,'落地路线',34,'dark',700)
t(322,2403,'先体验官方示例  →  用自己的素材测试  →  再评估部署或产品接入',31,'dark',600)
line(95,2425,2063,2425,'#bccad5')
hardware=[(96,'RTX 5090 · 32 GB','840 × 480 / 24 FPS'),(621,'RTX PRO 6000 Blackwell','1248 × 720 / 16 FPS'),(1192,'NVIDIA B200','1248 × 720 / 约 30 FPS')]
for x,gpu,perf in hardware:
    t(x,2474,gpu,26,'dark',700)
    t(x,2514,perf,27,'dark')
t(1714,2474,'约 51 GB 权重',26,'dark',700)
t(1714,2514,'还需 CUDA 环境',26,'dark')
t(96,2553,'以上均为官方性能条件，未在本机复测；实时帧率不等于零延迟。已有权重与部署代码，完整训练和数据流水线仍待发布。',23,'#4a5e71')

# Explicit scope / reality check, visually secondary but easy to locate.
rect(64,2606,980,204,'#302a21',8)
t(89,2654,'它不负责什么',33,'amber',700)
lines(89,2700,['自动选片、字幕、配音、转场和时间线编排不是其核心。',
                '换装不是尺码试穿；生成效果不是物理真实性保证。',
                '主要需求若是普通剪辑，其直接价值有限。'],27,'ink',40)
rect(1072,2606,1024,204,'#20322a',8)
t(1097,2654,'我们已做到哪一步',33,'lime',700)
lines(1097,2700,['已整理：5 组动态对比、5 张官方截图、参考图换装视频。',
                  '网页在本地 ≠ 模型在本地；当前没有运行 AI 推理。',
                  '截图不证明时序稳定；案例不保证任意素材都成功。'],27,'ink',40)
line(64,2850,2096,2850)
t(64,2896,'核心判断',26,'lime',700)
t(226,2896,'把它视为可研究、可部署的视频内容改写引擎；先验证自己的任务，再投入算力与产品开发。',29,'ink',600)
t(64,2953,'依据：官方 README、DEPLOYMENT.md、推理代码、arXiv:2608.03974；案例图片来自官方预览。',23,'muted')
t(64,2990,'研究日期 2026-09-22 · 上游提交 d88456a · JD / Joy Future Academy · Apache-2.0 · 应用与参考价值为本研究判断。',22,'muted')
svg.append('</svg>')
OUT.write_text('\n'.join(svg)+'\n',encoding='utf-8')
print(OUT)
