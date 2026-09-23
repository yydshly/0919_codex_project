"""Create a text-first, editable vector overview of the researched library."""
from html import escape
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
OUT = PROJECT / 'assets/joyai-capability-overview.svg'
W, H = 1800, 2730
C = dict(bg='#eef3f7', ink='#132b40', muted='#4d6578', line='#cbd8e2',
         blue='#145da0', teal='#087f83', white='#ffffff', soft='#eaf4fb',
         green='#e8f5ed', amber='#fff2d9', dark='#102b42')
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
         '<title id="title">JoyAI-Video-Edit 能力、输入输出、实现原理与使用边界总览</title>',
         '<desc id="desc">视频内容改写模型：原视频、文字指令与可选参考图片输入，经多模态条件编码、因果视频压缩、扩散生成和解码，输出编辑后视频。可处理人物、动物、场景和整体风格；本研究展示官方素材，未运行模型。</desc>',
         '<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#527a99" stroke-width="1.5"/></marker></defs>',
         '<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif} .mono{font-family:Consolas,monospace}</style>']


def rect(x, y, w, h, fill='white', radius=16, stroke=None):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{C.get(fill,fill)}"'+
                 (f' stroke="{C.get(stroke,stroke)}"' if stroke else '')+'/>' )


def text(x, y, value, size=25, color='ink', weight=400, anchor='start'):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{C.get(color,color)}" font-weight="{weight}" text-anchor="{anchor}">{escape(value)}</text>')


def lines(x, y, values, size=25, color='muted', gap=39, weight=400):
    for i, value in enumerate(values):
        text(x, y+i*gap, value, size, color, weight)


def line(x1, y1, x2, y2, color='line', width=2, arrow=False):
    parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{C.get(color,color)}" stroke-width="{width}"'+
                 (' marker-end="url(#arrow)"' if arrow else '')+'/>' )


def path(d):
    parts.append(f'<path d="{d}" fill="none" stroke="#527a99" stroke-width="3" marker-end="url(#arrow)"/>')


def section(y, height, number, title, note=''):
    rect(48, y, 1704, height)
    rect(76, y+25, 44, 38, 'blue', 8)
    text(98, y+52, number, 24, 'white', 600, 'middle')
    text(137, y+54, title, 31, weight=700)
    if note: text(1720, y+51, note, 21, 'muted', anchor='end')


rect(0, 0, W, H, 'bg', 0)
rect(0, 0, W, 240, 'dark', 0)
text(65, 48, 'OPEN-SOURCE RESEARCH  /  009  /  2026.09.22', 22, '#b6cbdc')
text(65, 116, 'JoyAI-Video-Edit', 56, 'white', 700)
text(65, 170, '视频内容改写：能力、输入输出与实现原理', 36, 'white', 600)
text(65, 216, '在已有画面的基础上，按指令生成修改后的视频；人物、动物、物体与环境都可以是编辑目标。', 26, '#d4e3ed')
rect(1450, 65, 285, 60, '#c8edb1', 12)
text(1592, 104, '不只是人物变装', 28, 'dark', 700, 'middle')

# 1. The actual input / output contract.
section(262, 330, '01', '输入什么 → 得到什么', '模型可自行部署在电脑或服务器；也可使用官方在线体验')
rect(78, 350, 512, 211, 'soft', 12)
text(104, 388, '输入：视频 + 要求 + 可选图片', 28, 'blue', 700)
lines(104, 433, ['原视频：上传片段，或持续输入的摄像头画面',
                 '文字指令：明确要改什么、希望保留什么',
                 '参考图片（可选）：指定服装或目标外观'], 23, gap=42)
line(607, 454, 661, 454, 'blue', 3, True)
rect(677, 350, 421, 211, '#edf5ee', 12)
text(887, 398, '按条件生成新画面', 30, 'teal', 700, 'middle')
lines(709, 446, ['理解修改意图 → 分块编辑 → 解码',
                 '尽量保留未要求修改的内容与运动',
                 '不是固定滤镜菜单；可组合描述要求'], 23, gap=40)
line(1115, 454, 1169, 454, 'blue', 3, True)
rect(1185, 350, 537, 211, 'soft', 12)
text(1211, 388, '输出：编辑后的视频 / 连续画面', 28, 'blue', 700)
lines(1211, 433, ['例如：人仍在走路，但衣服换成参考款式',
                  '源视频决定内容基础，指令决定修改方向',
                  '模型会重新生成像素，不保证其他部分完全不变'], 23, gap=42)

# 2. Object and operation map, with honest evidence labels.
section(614, 499, '02', '能改哪些对象？能产生哪些效果？', '“已展示”指作者公开素材，不代表本机复现')
cols = [92, 318, 760, 1370]
for x, value in zip(cols, ['编辑对象', '操作与效果', '具体例子', '证据边界']): text(x, 721, value, 23, 'muted', 600)
line(80, 738, 1720, 738)
rows = [
    ('人物 / 多人', '换装、配饰、形象替换、卡通化', '羽绒服 / 擎天柱 / 高达 / 多人卡通', '官方视频 / 截图'),
    ('动物', '改外观、增加配饰、移除主体', '白色毛发 + 彩帽 + 粉墨镜 / 移除两侧猫', '官方视频已展示'),
    ('背景 / 场景', '场景替换、环境外观改变', '办公室 → 宫殿 / 室内 → 城堡贵族风格', '官方视频 / 截图'),
    ('整体画面', '风格转换、全局外观编辑', '水彩晕染 / 手绘赛璐璐动画', '官方视频 / 截图'),
    ('一般物体', '添加、替换、移除、外观修改', '杯子改色 / 汽车换色等可作为测试任务', '属能力范围；此例未测')
]
for i, row in enumerate(rows):
    y = 779+i*49
    if i%2==0: rect(80,y-32,1640,49,'#f4f7fa',5)
    for j, (x, value) in enumerate(zip(cols,row)):
        text(x, y, value, 23 if j!=2 else 22, 'ink' if j<3 else ('teal' if i<4 else '#95620f'), 600 if j==0 else 400)
text(92, 1010, '补充：官方还声明支持运动变化；我们尚未验证其修改幅度、可控性与稳定性。', 22, 'muted')
rect(80, 1023, 1640, 61, 'amber', 9)
text(102, 1062, '一条指令可以组合多个目标：“换成粉色古装 + 背景改成宫殿 + 尽量保留面部与动作”。目标越复杂，越需要实测。', 24)

# 3. Parallel conditioning pathways with feedback across chunks.
section(1135, 489, '03', '底层如何工作？', 'MLLM 理解目标 · VAE 压缩与还原 · DiT 生成修改结果')
rect(80, 1224, 474, 137, 'soft', 12)
text(104, 1261, 'A  理解目标：多模态语言模型', 27, 'blue', 700)
lines(104, 1304, ['首帧 + 文字指令 → 条件表示', '部署依赖 MiMo-VL，提供语义与编辑意图'], 23, gap=35)
rect(80, 1390, 474, 137, 'soft', 12)
text(104, 1427, 'B  压缩画面：因果视频 VAE', 27, 'blue', 700)
lines(104, 1470, ['当前源视频片段 + 可选参考图 → 潜在表示', '在紧凑特征空间处理，降低像素计算负担'], 23, gap=35)
path('M 555 1290 H 600 V 1345 H 649')
path('M 555 1459 H 600 V 1400 H 649')
rect(668, 1247, 557, 215, '#e7f3ec', 14)
text(696, 1289, 'C  生成修改：16B 扩散 Transformer', 27, 'teal', 700)
lines(696, 1338, ['结合指令、源视频、参考图与生成历史',
                  '在潜在空间去噪，生成当前片段的新内容',
                  '蒸馏后仅用两步去噪，再交给解码器'], 25, gap=43)
line(1237, 1358, 1300, 1358, 'blue', 3, True)
rect(1315, 1247, 404, 215, 'soft', 12)
text(1339, 1289, 'D  解码并输出', 29, 'blue', 700)
lines(1339, 1338, ['VAE 将潜在表示还原为视频帧',
                  '输出当前编辑结果',
                  '继续接收与处理下一片段'], 24, gap=43)
rect(691, 1491, 1006, 57, '#eef2f6', 10)
text(718, 1528, '历史缓存：保留首块 + 最近片段，帮助下一段延续外观与动作', 24)
path('M 1499 1464 V 1484')
path('M 691 1520 H 644 V 1440 H 660')
text(92, 1590, '“自回归”＝参考先前结果继续生成；“扩散”＝每段内部通过去噪生成。无需看完整段视频后再开始输出。', 25)

# 4. Fast generation and stability, with separate training explanations.
section(1646, 296, '04', '为什么可以持续、实时地编辑？', '实时 = 跟得上输入速度；不等于没有延迟')
cards = [
    (80,'按小片段处理',['通常按 8 帧分块，跨块只看过去', '不需要预先知道视频总长度']),
    (638,'减少每次计算',['两步去噪 + FP8 低精度计算', '算子融合 / 计算图 / VAE 加速']),
    (1196,'限制历史开销',['固定窗口复用 KV 缓存', '历史显存不随视频时长无限增长'])
]
for x,title,body in cards:
    rect(x, 1730, 524, 123, '#f2f6f9', 10)
    text(x+22,1769,title,28, 'blue',600)
    lines(x+22,1808,body,23,gap=32)
text(92, 1904, '训练时：源视频锚定蒸馏 + 长序列优化，用于降低源内容偏离、闪烁和累积漂移；这些问题并非被完全消除。', 24)

# 5. Real requirements and realistic personal value.
section(1964, 381, '05', '真正运行需要什么？对你有什么价值？')
text(91, 2062, '运行门槛 · 下列均为官方配置 / 性能', 26, 'blue', 700)
text(940, 2062, '值得投入的方向 · 先用自己的素材验证', 26, 'teal', 700)
line(891, 2050, 891, 2306)
hardware=[('RTX 5090 · 32 GB', '840 × 480', '24 FPS'),
          ('RTX PRO 6000 · Blackwell', '1248 × 720', '16 FPS'),
          ('NVIDIA B200', '1248 × 720', '约 30 FPS')]
for i, row in enumerate(hardware):
    y=2110+47*i
    for x,value in zip([92,472,697],row):text(x,y,value,23)
lines(92,2260,['必要权重约 51 GB；还需 Python / PyTorch / CUDA 与算子编译。',
                '网页客户端 ⇄ FastAPI / WebSocket 服务 ⇄ GPU 模型推理。'],22,gap=35)
lines(943,2111,['内容创作：同一素材尝试多种风格与视觉方案',
                 '电商创意：服装搭配与素材预览，正式交付需验细节',
                 '互动体验：摄像头特效、展厅互动、造型变换',
                 '产品原型：把模型服务接入自己的视频工作流'],24,gap=44)
text(943, 2304, '若主要需求是字幕、配音或拼接，本库直接价值有限。', 23, 'muted')

# 6. Guard against the main misunderstanding from this conversation.
section(2367, 256, '06', '能力边界与我们当前完成的工作')
rect(80, 2450, 791, 143, 'amber', 10)
text(101, 2487, '不能据此保证', 27, '#94600d', 700)
lines(101,2525,['Logo、文字、复杂花纹、身份和运动都能精确保留；',
                '复杂遮挡 / 快速动作 / 任意长时段始终稳定。',
                '它不是完整剪辑台，也不是尺码试穿或物理仿真系统。'],23,gap=29)
rect(901, 2450, 820, 143, 'green', 10)
text(924, 2487, '已完成：官方素材展示；尚未本地运行模型', 27, 'teal', 700)
lines(924,2525,['5 组动态对比 + 5 张实时截图 + 30 秒参考图换装视频。',
                '网页在本地 ≠ 模型在本地；播放速度 ≠ 推理速度。',
                '完整训练与数据流水线仍待发布；部署指南以官方为准。'],23,gap=29)
text(62,2661,'资料：官方 README / DEPLOYMENT.md / 推理代码；论文 arXiv:2608.03974。模型与素材：JD / Joy Future Academy。',21,'muted')
text(62,2700,'研究整理：2026-09-22 · 上游提交 d88456a · 上游许可 Apache-2.0 · 本图为能力归纳，不是独立效果或性能评测。',21,'muted')
parts.append('</svg>')
OUT.write_text('\n'.join(parts)+'\n', encoding='utf-8')
print(OUT)
