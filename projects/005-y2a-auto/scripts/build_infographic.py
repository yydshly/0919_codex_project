"""Render the verified research as one precisely typeset PNG and SVG."""
from pathlib import Path
from html import escape
from PIL import Image, ImageDraw, ImageFont

P = Path(__file__).resolve().parents[1]
W = 2400
BG, INK, GREEN, MUTED, LINE = '#f4f3ec', '#24372a', '#35533d', '#596757', '#cdd5c2'
image = Image.new('RGB', (W, 5200), BG)
d = ImageDraw.Draw(image)
svg = []
fonts = {}

def font(size, bold=False):
    key=(size,bold)
    if key not in fonts:
        fonts[key]=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',size)
    return fonts[key]

def rect(x,y,w,h,fill=BG,stroke=None,r=16):
    d.rounded_rectangle((x,y,x+w,y+h),radius=r,fill=fill,outline=stroke,width=2)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="2"' if stroke else '')+'/>')

def text(x,y,s,size=32,color=INK,bold=False):
    f=font(size,bold)
    d.text((x,y),s,font=f,fill=color,anchor='lt')
    ascent,descent=f.getmetrics()
    bbox=f.getbbox(s)
    baseline=y+ascent-bbox[1]
    svg.append(f'<text x="{x}" y="{baseline}" font-size="{size}" fill="{color}" font-weight="{700 if bold else 400}">{escape(s)}</text>')

def para(x,y,s,width,size=31,color=MUTED,bold=False,gap=1.52):
    f=font(size,bold); line=''; lines=[]
    for c in s:
        if c=='\n': lines.append(line); line=''; continue
        if d.textlength(line+c,font=f)>width and line:
            lines.append(line);line=c
        else: line+=c
    if line:lines.append(line)
    for line in lines:
        text(x,y,line,size,color,bold);y+=int(size*gap)
    return y

def heading(y,no,title,sub=None):
    text(110,y,no,25,GREEN,True)
    text(180,y-5,title,47,INK,True)
    if sub:text(180,y+62,sub,27,MUTED)
    return y+(120 if sub else 88)

text(110,75,'OPEN SOURCE RESEARCH   /   005',26,GREEN,True)
text(110,138,'Y2A-Auto 能力全景',86,INK,True)
text(110,256,'把已有的 YouTube 视频，本地化处理后发布到 AcFun / bilibili',39,GREEN)
text(110,327,'自部署工具  ·  视频主体来自原内容  ·  源码已核对，实际运行效果待验证',29,MUTED)
rect(110,400,520,112,'#f4ded5');text(145,423,'YouTube',38,'#a34534',True);text(145,473,'手动链接 / 频道与关键词监控',26,'#7a4e40')
text(675,433,'→',55,GREEN)
rect(800,400,720,112,GREEN);text(840,426,'Y2A-Auto',38,'#ffffff',True);text(1085,436,'处理 · 管理 · 发布',29,'#dfebc1')
text(1560,433,'→',55,GREEN)
rect(1680,400,610,112,'#dfe9e3');text(1720,426,'AcFun / bilibili',38,GREEN,True);text(1720,477,'单平台或双平台',25,MUTED)

y=590
text(110,y,'01  一个任务怎样运行？',46,INK,True)
text(1250,y,'02  围绕流水线的完整能力',46,INK,True)
text(110,y+73,'按主流程源码排序；各环节受配置与任务状态影响。',27,MUTED)
text(1250,y+73,'输入、处理、发布、后台和维护。',27,MUTED)
flow=[
('添加任务','手动添加 YouTube 链接，或由频道／关键词监控发现视频后自动入队。'),
('采集信息与处理文案','先取元数据与封面；按开关翻译标题、简介，生成或应用标签，推荐分区。'),
('可选文本审核','检查标题、简介、标签；未通过时进入人工审核。此时还未下载完整视频。'),
('下载视频','yt-dlp 获取视频及相关资源；已有阶段检查点可用于跳过完成的工作。'),
('字幕本地化','复用已有字幕，或按需调用 ASR；再按配置进行翻译、整理与质量检查。'),
('字幕烧录与转码','FFmpeg 处理编码与烧录；烧录前结合字幕质量状态和配置决定是否放行。'),
('上传与反馈','自动模式上传，否则停在准备上传；记录平台结果，并按配置发送事件通知。')]
fy=y+132
for i,(title,body) in enumerate(flow):
    rect(110,fy,1050,173,'#e9eddf')
    text(138,fy+28,f'0{i+1}',30,GREEN,True)
    text(218,fy+25,title,35,INK,True)
    end=para(218,fy+82,body,903,29)
    assert end<=fy+174
    if i<6:text(139,fy+173,'↓',25,GREEN)
    fy+=200
caps=[
('输入与监控','链接、频道／关键词；最新／历史模式；视频类型筛选；YouTube Cookies 与可选 CookieCloud 同步。'),
('字幕与 AI','Whisper／Voxtral API；字幕翻译、断句、时间轴整理、质量检查；生成标题、简介、标签和分区建议。'),
('媒体处理','FFmpeg；CPU／NVIDIA／Intel／AMD 编码；优先 HEVC，失败可回退 H.264；可选字幕烧录。'),
('账号与平台发布','AcFun／bilibili 扫码登录；B 站 Cookie 导入；单平台或双平台发布；各平台上传结果单独记录。'),
('Web 后台与维护','设置中心、任务状态、人工处理、并发控制、日志与下载清理；可查看进度与失败信息。'),
('事件通知','企业微信、Server酱、message-pusher；任务与登录等事件；持久化发送队列及失败重试。')]
cy=y+132
for i,(title,body) in enumerate(caps):
    rect(1250,cy,1040,204,'#ffffff',LINE)
    text(1282,cy+27,title,35,GREEN,True)
    end=para(1282,cy+88,body,975,29)
    assert end<=cy+204
    cy+=230
y=max(fy,cy)+10
rect(110,y,2180,117,GREEN)
text(143,y+25,'三个概念要分清',32,'#dfebc1',True)
text(143,y+75,'ASR：声音 → 文字     /     翻译：原语言 → 目标语言     /     烧录：字幕 → 写入画面',31,'#ffffff')

y=heading(y+182,'03','底层原理：用任务系统组织处理工具')
layers=[('管理入口','Flask Web 后台：配置、任务、审核、日志'),('任务编排','任务管理器：状态、并发额度、阶段检查点、上传结果'),('执行工具','yt-dlp 获取媒体  /  AI 与 ASR API 处理语言  /  FFmpeg 处理音视频'),('结果与存储','AcFun／bilibili 上传模块；SQLite 任务与通知；本地配置、媒体、日志')]
for i,(label,body) in enumerate(layers):
    rect(110,y,2180,89,'#e9eddf' if i%2==0 else '#eeeee5')
    text(143,y+27,label,30,GREEN,True);text(410,y+27,body,30,INK)
    y+=101
y=para(110,y+12,'本版本语音识别通过可配置 API 接入；本机 GPU 编码与语音识别服务是两件事。',2180,28)

y=heading(y+55,'04','四个值得借鉴的工程机制')
mechanisms=[('阶段检查点','记录完成的步骤，重跑时可跳过；避免所有失败都从头处理。'),('字幕质量门控','区分识别失败、质检不合格、质检不可用；实际放行行为受配置影响。'),('部分成功恢复','分别保留平台响应；双平台部分成功后，可只重试尚未成功的平台。'),('通知独立投递','SQLite outbox 保存消息 → 后台投递 → 递增间隔重试 → 超限记录失败。')]
for i,(title,body) in enumerate(mechanisms):
    x=110+(i%2)*1140; yy=y+(i//2)*205
    rect(x,yy,1040,180,'#e9eddf')
    text(x+32,yy+25,title,35,GREEN,True)
    para(x+32,yy+87,body,976,29)
y+=420
text(110,y,'这些是源码中可见的机制，不等于已经验证生产稳定性、并发容量或恢复效果。',28,MUTED)

y+=100
text(110,y,'05  对我们的意义',46,INK,True)
text(1250,y,'06  运行条件与使用边界',46,INK,True)
yy=y+90
for title,body in [
('自有视频跨语言分发','减少字幕、发布文案与平台上传之间的重复操作。'),
('获授权课程／访谈本地化','自动处理重复环节，人工复核术语、时间轴与最终内容。'),
('内容工具的工程参考','借鉴检查点、人工介入、状态管理和部分失败恢复设计。')]:
    text(110,yy,title,33,GREEN,True)
    yy=para(110,yy+61,body,1050,30)+34
yy=para(110,yy,'与 BrightBean Studio 的侧重点不同：它面向多平台发布与运营；Y2A-Auto 更集中于视频本地化及 A/B 站输出。尚未验证直接集成。',1050,29)
ry=y+90
for title,body in [
('需要准备','Docker 或本地运行环境、网络与存储、平台账号状态、FFmpeg；启用 AI／ASR／审核时配置相应服务。'),
('按需选用','CookieCloud、云审核与 GPU 并非统一必需条件；字幕翻译、烧录、审核、自动上传分别有开关。'),
('能力边界','不等于新视频生成、复杂剪辑或配音工具；已确认目标平台仅 AcFun／bilibili。'),
('审核边界','当前主流程检测标题、简介、标签，封面检测被跳过；不能等同整段视频审核。使用自有或已获授权素材。')]:
    text(1250,ry,title,32,GREEN,True)
    ry=para(1250,ry+55,body,1040,29)+26
y=max(yy,ry)+45
y=heading(y,'07','研究证据与尚待验证的部分')
rect(110,y,2180,280,GREEN)
text(145,y+30,'已核对',34,'#dfebc1',True)
para(350,y+32,'上游说明、任务主流程、ASR 接入、字幕处理与质检、通知持久化及重试机制。',1870,30,'#ffffff')
text(145,y+118,'待实测',34,'#dfebc1',True)
para(350,y+120,'真实字幕准确性、API 成本、处理耗时、平台上传成功率、失败恢复效果。',1870,30,'#ffffff')
text(145,y+218,'本次为源码研究：未运行上游服务，未连接真实账号。',32,'#ffffff',True)
y+=325
text(110,y,'来源  github.com/fqscfqj/Y2A-Auto',28,GREEN,True)
text(1250,y,'核对  2026-09-21   /   版本  14dc78cf5380',27,MUTED)
y=para(110,y+62,'依据：README · task_manager · speech_recognition · subtitle_translator · subtitle_qc · notifications/service',2180,24)
H=y+75
assert H<=5200,H
out=P/'assets'
image.crop((0,0,W,H)).save(out/'y2a-auto-panorama.png')
(out/'y2a-auto-panorama.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="{BG}"/><g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif">'+''.join(svg)+'</g></svg>',encoding='utf-8')
print(f'Created PNG and SVG: {W} x {H}')
