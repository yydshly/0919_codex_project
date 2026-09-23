"""Render a source-grounded Chinese capability diagram as editable SVG and PNG."""
from pathlib import Path
from html import escape
import math
from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[1]
OUT = PROJECT / 'assets'
OUT.mkdir(exist_ok=True)
W, H = 2600, 5610
BG, PANEL, INK, MUTED, LINE = '#f3f6fa', '#ffffff', '#182c43', '#4b6075', '#d3dce6'
GREEN, BLUE, PURPLE = '#167b62', '#2364aa', '#7551a6'
FONTS = Path('C:/Windows/Fonts')
im = Image.new('RGB', (W,H), BG)
draw = ImageDraw.Draw(im)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
       '<title id="title">VideoCaptioner 能力、效果与依赖全景图</title>',
       '<desc id="desc">九部分完整参考：输入、处理原理、输出、模型接入、底层依赖、直观效果、时间戳与声音边界、运行条件，以及对我们的意义。</desc>']
checks=[]

def font(size,bold=False):
    return ImageFont.truetype(str(FONTS/('msyhbd.ttc' if bold else 'msyh.ttc')),size)

def box(x,y,w,h,fill=PANEL,stroke=LINE,r=18):
    draw.rounded_rectangle((x,y,x+w,y+h),radius=r,fill=fill,outline=stroke,width=2)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')

def line(points,color=LINE,width=3):
    draw.line(points,fill=color,width=width)
    svg.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" fill="none" stroke="{color}" stroke-width="{width}"/>')

def txt(x,y,text,size=29,color=INK,bold=False):
    f=font(size,bold)
    draw.text((x,y),text,font=f,fill=color,anchor='lt')
    ascent,descent=f.getmetrics(); bbox=f.getbbox(text)
    svg.append(f'<text x="{x}" y="{y+ascent-bbox[1]}" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{escape(text)}</text>')
    checks.append((x,y,x+draw.textlength(text,font=f),y+size))

def wrap(text,width,size=29,bold=False):
    out=[]
    for paragraph in text.split('\n'):
        current=''
        for char in paragraph:
            if current and draw.textlength(current+char,font=font(size,bold))>width:
                if char in '，。、；：！？）】》':
                    out.append(current+char);current=''
                else:
                    out.append(current);current=char
            else: current+=char
        if current or not paragraph:
            out.append(current)
    return out

def para(x,y,text,width,size=29,color=MUTED,bold=False,leading=1.55):
    for row in wrap(text,width,size,bold):
        txt(x,y,row,size,color,bold);y+=round(size*leading)
    return y

def bullet(x,y,text,width,size=28,color=MUTED):
    txt(x,y,'·',size,color,True)
    return para(x+19,y,text,width-19,size,color)+9

def arrow(x1,y1,x2,y2,color=GREEN):
    line([(x1,y1),(x2,y2)],color,4)
    theta=math.atan2(y2-y1,x2-x1)
    pts=[(x2,y2),(x2-14*math.cos(theta-.55),y2-14*math.sin(theta-.55)),(x2-14*math.cos(theta+.55),y2-14*math.sin(theta+.55))]
    draw.polygon(pts,fill=color)
    svg.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="{color}"/>')

def section(y,num,title,note=''):
    box(64,y,48,43,INK,INK,9);txt(75,y+8,num,23,'#ffffff',True)
    txt(128,y+1,title,35,INK,True)
    if note: txt(1120,y+9,note,25,MUTED)

def card(x,y,w,h,kicker,title,items,color=GREEN,size=28):
    box(x,y,w,h)
    box(x+24,y+25,6,30,color,color,3)
    txt(x+46,y+23,kicker,23,color,True)
    txt(x+25,y+68,title,35,INK,True)
    cy=y+125
    for s in items: cy=bullet(x+25,cy,s,w-50,size)
    assert cy<=y+h-14,(title,cy,y+h)

box(0,0,W,H,BG,BG,0)
box(0,0,W,237,INK,INK,0)
txt(65,35,'008 / 开源项目研究集',25,'#9adbc7')
txt(65,86,'VideoCaptioner：能力、效果与依赖全景图',62,'#ffffff',True)
txt(65,176,'核心是讲话、字幕与配音：声音 → 文字；文字 → 文字；文字 → 声音。',32,'#d8e5ef')

section(280,'01','输入：你可以从不同材料开始','视频不是唯一入口；已有字幕可以直接处理或配音')
cw=800; xs=[64,900,1736]
card(xs[0],346,cw,253,'本地文件','视频 / 录音',[
    '视频如 MP4、MKV；音频如 MP3、WAV。',
    '视频先提取音轨；画面保留供最后合成。'],size=29)
card(xs[1],346,cw,253,'在线素材','视频链接',[
    '通过 yt-dlp 下载 YouTube、B站等视频。',
    '平台可用性取决于网络、权限与下载支持。'],size=29)
card(xs[2],346,cw,253,'文字素材','已有字幕 + 可选配置',[
    '字幕：SRT / ASS / VTT / JSON。',
    '可附目标语言、术语提示、音色、字幕样式。'],size=29)

section(644,'02','中间处理：把“听到的内容”变成“可用的字幕”','这些步骤可按需求选用，不必每次跑完整流程')
stagew=586; stagexs=[64,694,1324,1954]
stage_data=[
    ('1 / ASR','语音识别',['引擎把音轨转为文字。','返回句级或词级时间戳。','长音频可分块；部分引擎支持语音活动检测。','结果：原语言字幕。'],GREEN),
    ('2 / SPLIT','语义断句',['LLM 按语义和长度拆句。','检查内容变化和过长片段，反馈修正。','匹配回时间轴；有规则处理与回退路径。'],BLUE),
    ('3 / OPTIMIZE','文字校正',['LLM 修正识别错误、标点及格式。','按批次处理，保留字幕编号。','失败批次可保留原文；专业术语仍需核对。'],BLUE),
    ('4 / TRANSLATE','字幕翻译',['翻译成目标语言，可带术语提示。','大模型可按批次理解上下文。','反思模式：初译 → 分析 → 改写，并检查结果结构。'],BLUE)]
for x,(k,t,items,col) in zip(stagexs,stage_data): card(x,711,stagew,416,k,t,items,col,size=28)
for x in stagexs[:-1]: arrow(x+stagew+6,907,x+stagew+36,907)
box(64,1150,2476,67,'#e4eee9','#e4eee9',10)
txt(86,1169,'按需进入：已有字幕可跳过识别；只要字幕可跳过配音与视频合成；已有人声也不必重新生成声音。',29,GREEN)

section(1263,'03','输出：同一份字幕，可以走三条交付路径','配音从文字生成新声音；不等于直接转换原声')
card(xs[0],1330,cw,465,'A / 文字交付','字幕文件 / 文本',[
    'SRT：通用时间轴字幕。',
    'ASS：带样式字幕；TXT：纯文字。',
    'JSON：结构化数据，便于后续程序处理。',
    '可选原文、译文、中英等双语布局。',
    '用途：字幕编辑、阅读学习、知识整理。'],GREEN,size=29)
card(xs[1],1330,cw,465,'B / 画面交付','带字幕的视频',[
    '原视频 + 字幕 → 本机 FFmpeg 等工具处理。',
    '软字幕：嵌入字幕轨道，由播放器显示。',
    '硬字幕：把文字直接写进视频画面。',
    '可设置字体、颜色、描边、圆角背景和双语顺序。',
    '输出：带字幕视频，例如 MP4。'],GREEN,size=29)
card(xs[2],1330,cw,465,'C / 声音交付','配音音轨 / 配音视频',[
    '字幕 → TTS 发声 → 测时长、调语速 → 按时间轴拼接。',
    '可选用 LLM 缩短过长台词；按说话人标签分配音色。',
    '支持替换、混合或压低原声；不等于分离背景音乐。',
    '输出：WAV / MP3、配音视频、逐句时长 / 语速 / 警告报告。'],PURPLE,size=29)

section(1840,'04','模型怎么接：本地模型和外部服务可以混合使用','软件安装在本机 ≠ 全流程都在本机运行')
tx,ty,tw=64,1907,2476
cols=[230,730,795,721]
box(tx,ty,tw,654,PANEL,LINE,12)
box(tx,ty,tw,62,'#e2e9f1','#e2e9f1',10)
headers=['环节','本地运行 / 自建接入','外部服务 / 云端接口','使用条件与关键区别']
cx=tx
for width,label in zip(cols,headers):txt(cx+22,ty+17,label,26,INK,True);cx+=width
rows=[
    ('语音识别',
     'Whisper 现成模型\nFaster-Whisper / whisper.cpp',
     'Whisper API；必剪 / 剪映识别服务',
     '本地需模型、程序与硬件；云端需联网。\n必剪 / 剪映文档注明主要支持中英文。',122),
    ('断句 / 校正',
     '可指向自建 OpenAI 兼容服务*\n不是直接加载一个模型权重文件。',
     '通过 OpenAI 兼容接口调用大模型\n例如 DeepSeek 或兼容服务商。',
     '配置 API 地址、Key、模型名。\n具体模型由接入服务提供。',122),
    ('字幕翻译',
     '自建兼容大模型服务*\n使用与云端相同的接口协议。',
     '大模型 / Bing / Google；另有 DeepLX 适配',
     'Bing / Google 路径不需要 LLM Key。\n免费入口仍依赖网络与服务可用性。',110),
    ('字幕配音',
     '当前配音主流程没有开箱即用的\n本地 TTS 模型运行选项。',
     'Edge TTS；SiliconFlow CosyVoice2；\nGemini TTS',
     'Edge 无需 Key；其他服务需相应凭证。\nSiliconFlow 可用参考音频 + 文本克隆音色。',128),
    ('字幕 / 音轨合成',
     'FFmpeg + 字幕渲染，本机执行。',
     '这个环节不需要调用大模型。',
     '需要媒体工具与可用字体；\n编码速度取决于设备与输出设置。',110)]
cy=ty+62
for label,local,remote,condition,height in rows:
    line([(tx,cy),(tx+tw,cy)],LINE,2)
    cx=tx
    for j,(width,content) in enumerate(zip(cols,[label,local,remote,condition])):
        end=para(cx+22,cy+20,content,width-44,26,INK if j==0 else MUTED,j==0,1.45)
        assert end<=cy+height-8,(label,j,end,cy+height)
        cx+=width
    cy+=height
txt(78,2574,'* 自建 LLM 接入是基于可配置接口地址的能力推断，需自行部署并验证接口、鉴权与输出格式；本次未做兼容性实测。',24,MUTED)

section(2632,'05','底层依赖：各个库和工具分别负责什么','模型能力来自所接引擎；本项目负责流程衔接')
dependency_cards = [
    ('运行与界面','Python + 桌面 GUI',[
        'Python 3.10～3.12：运行程序与命令行。',
        'PyQt5 / PyQt-Fluent-Widgets：桌面交互、任务与字幕编辑。',
        '不要求你自行训练基础模型。']),
    ('媒体与字幕','FFmpeg / FFprobe + 渲染支持',[
        'FFmpeg：提取音轨、调语速、混音、烧录与合成；FFprobe：媒体信息。',
        'pydub：音频操作；Pillow / fonttools：图像和字体支持。',
        '中文样式需要可用的中文字体。']),
    ('引擎与素材','识别程序 + 下载 / 配音支持',[
        '本地 Whisper 引擎及模型文件：语音识别；modelscope：模型相关支持。',
        'yt-dlp：获取支持平台的媒体。',
        'edge-tts：接入在线 Edge 语音服务。']),
    ('模型连接','openai / requests',[
        'openai：连接 OpenAI 兼容模型接口；requests：HTTP 服务调用。',
        '并非安装 openai 包就拥有模型。',
        '云端凭证或本地服务需另行配置。']),
    ('结果可靠性','缓存、重试与文本解析',[
        'diskcache：磁盘缓存；tenacity：重试。',
        'json-repair：修复模型返回的 JSON；langdetect：语言检测。',
        '程序校验编号、长度和返回结构；失败按模块回退。']),
    ('环境支持','配置、资源监测与诊断',[
        'platformdirs：配置目录；tomli：Python 3.10 下解析 TOML。',
        'psutil / GPUtil：系统与 GPU 信息。',
        'doctor：检查环境与关键配置；安装成功不等于服务已可用。'])
]
for i,(k,t,items) in enumerate(dependency_cards):
    card(xs[i%3],2697+(i//3)*385,cw,363,k,t,items,BLUE,26)

section(3470,'06','直观效果：除了自动出字幕，还能怎样用','下列是已确认功能；效果质量尚未逐项实测')
card(xs[0],3537,cw,382,'文字与阅读','更易读、更方便校对',[
    '原文 / 译文 / 双语；两种上下顺序。',
    '手动改原文与译文、合并或删除字幕条目、重译选中条目。',
    '术语提示与反思翻译辅助统一表达。',
    '删字幕条目不会剪掉对应视频。'],GREEN,26)
card(xs[1],3537,cw,382,'画面与批量','统一样式，重复使用流程',[
    '字体、字号、颜色、描边、阴影、圆角背景、边距；双语独立样式。',
    '预览字幕样式，导出软字幕或硬字幕。',
    '批量转录 / 字幕处理 / 字幕全流程。',
    'GUI 逐条检查；CLI 组合步骤自动化。'],GREEN,26)
card(xs[2],3537,cw,382,'声音与交付','换语言，或重新配一个声音',[
    '同语言重配音或翻译后配音；按标签分配音色。',
    '双语字幕可选择朗读其中一行。',
    '时长策略：平衡、严格、自然、不适配。',
    '克隆音色限支持的服务，需参考材料；不保证自动识别人或复刻情绪。'],PURPLE,26)

section(3960,'07','时间戳与声音：能解决什么，不能直接保证什么')
card(xs[0],4027,cw,383,'可以优先使用','生成时间、保留对应、适配配音',[
    '识别讲话时生成句级或词级时间信息。',
    '断句后映射时间；校正和翻译维持条目编号与时间对应。',
    '新配音测时长、调整语速再拼回时间轴。',
    '例：10～13 秒的一句话，尝试让新配音适配该时段；自然度仍需检查。'],GREEN,26)
card(xs[1],4027,cw,383,'需要具体排查','已有字幕错位 / 越播越不同步',[
    '未确认通用的一键自动修复已有字幕时间漂移能力。',
    '有时间戳，不等于每个字都精确对齐；不承诺人物口型同步。',
    '剪辑差异、帧率、源文件变化等，应先判断原因再选方案。'],BLUE,26)
card(xs[2],4027,cw,383,'不要混淆','降噪预处理 ≠ 通用音频工作站',[
    '部分 Faster-Whisper-XXL 路径提供 MDX-Net 人声分离 / 降噪预处理。',
    '主要服务于识别，不能推断已支持通用人声 / 伴奏分轨交付。',
    '压低原声是降低音量，不等于自动去除讲话并完整保留背景音乐。'],PURPLE,26)

section(4436,'08','使用条件：入门不必先买显卡','性能取决于模型、视频长度、分辨率与并发量')
card(xs[0],4503,cw,336,'轻量起步','在线识别 / 翻译 / 配音',[
    '本地处理文件，模型计算交给在线服务；不要求独立显卡。',
    '需要网络，部分服务需 API Key 和费用；免费入口也依赖可用性。',
    '只改已有字幕可跳过识别；本地合成仍消耗计算与磁盘。'],GREEN,26)
card(xs[1],4503,cw,336,'混合使用','本地识别 + 在线语言服务',[
    '本地需引擎和模型；可用 CPU 或受支持的 GPU。',
    '内存参考：普通 4GB+；本地 Whisper 8GB+。',
    '只是入门参考，不保证所有模型都能流畅运行；长视频需预留磁盘。'],BLUE,26)
card(xs[2],4503,cw,336,'额外部署','全离线不是现成的完整流程',[
    '本地 LLM 需自行部署兼容服务，并验证鉴权与输出格式。',
    '当前核查的配音主流程调用外部服务；本地 TTS 需另行方案。',
    '桌面打包版可带运行环境和 FFmpeg；模型、服务仍需按功能配置。'],PURPLE,26)

section(4880,'09','对我们的意义：以后遇到需求，就能定位要复用哪一步')
card(xs[0],4947,cw,330,'直接使用','已有视频的语言处理工具',[
    '演示、课程、访谈：补字幕、精修翻译、制作多语言配音版本。',
    '会议或录音：获得带时间的文字，供阅读、搜索和后续整理。',
    '价值是减少重复搭建识别、时间轴、字幕和媒体合成流程。'],GREEN,26)
card(xs[1],4947,cw,330,'接入我们的项目','作为流程中的可替换环节',[
    'Shotcraft 成片后，补字幕与配音。',
    '对比 Y2A-Auto 的字幕精修、配音质量与成本，再选择复用环节。',
    '转录文字供 Blinko 等工具整理；总结与问答由后续工具承担。'],BLUE,26)
card(xs[2],4947,cw,330,'怎样落地','先用短样片验证，再扩大使用',[
    '先确认语言、录音质量和交付格式，再选服务。',
    '人工核对术语、数字、同步与音质，再批量处理。',
    '项目间集成尚未验证；采用前核对 GPL-3.0 许可。'],PURPLE,26)

box(64,5310,2476,134,'#e4eee9','#b9d7cb',14)
txt(88,5332,'记住本质',30,GREEN,True)
txt(340,5335,'声音 → 文字；文字 → 文字；文字 → 声音。视频通常保留画面，改变的是字幕和语言表达。',29,INK)
txt(88,5388,'边界',28,INK,True)
txt(340,5389,'未确认：自动剪辑 / 新画面生成 / 口型同步 / 字幕 OCR / 擦除硬字幕 / 知识总结 / 自动发布。',27,MUTED)
txt(66,5476,'依据：WEIFENG2333/VideoCaptioner · 95842ec · 2026-09-22 · README、pyproject.toml、docs 与 core / ui 源码',23,MUTED)
txt(66,5514,'验证范围：已实测 38 秒硬字幕合成；ASR、LLM 翻译与 TTS 为源码能力整理，尚未做效果实测。网页是研究展台。',23,MUTED)
txt(66,5552,'仓库：github.com/WEIFENG2333/VideoCaptioner   |   术语：ASR = 语音识别；LLM = 大语言模型；TTS = 文字生成语音。',22,MUTED)

assert all(x>=0 and y>=0 and r<=W-20 and b<=H for x,y,r,b in checks), 'Text outside canvas'
svg.append('</svg>')
(OUT/'capability-map.svg').write_text('\n'.join(svg),encoding='utf-8')
im.save(OUT/'capability-map.png',optimize=True)
print(f'Generated {W} x {H} capability-map.png + SVG; {len(checks)} checked text lines.')
