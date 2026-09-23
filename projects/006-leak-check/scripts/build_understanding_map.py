"""Export one editable SVG and a high-resolution PNG of the research synthesis."""

from pathlib import Path
from html import escape
from functools import lru_cache
import os

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
W, H, SCALE = 1800, 3200, 2
BG = "#F4F4ED"
INK = "#203D34"
MUTED = "#536A61"
GREEN = "#244E40"
LINE = "#D2DDD2"
PALE = "#E6ECE0"
WHITE = "#FFFFFF"
GOLD = "#E7D8A7"
AMBER = "#806425"
REGULAR = os.environ.get("MAP_FONT_REGULAR", "C:/Windows/Fonts/msyh.ttc")
BOLD = os.environ.get("MAP_FONT_BOLD", "C:/Windows/Fonts/msyhbd.ttc")

image = Image.new("RGB", (W * SCALE, H * SCALE), BG)
draw = ImageDraw.Draw(image)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
       '<title id="title">从 Leak Check 到拾迹：我们的理解与产品方向全景图</title>',
       '<desc id="desc">包含原始目标、源码能力、探索转折、数据边界、邮件账号盘点流程、证据分级、对用户的意义、当前验证状态和暂停后的适配规划。</desc>',
       '<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}</style>']


@lru_cache(None)
def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REGULAR, round(size * SCALE))


def width(text, size, bold=False):
    return draw.textlength(text, font=font(size, bold)) / SCALE


def box(x, y, w, h, fill=WHITE, stroke=None, radius=18):
    bounds = (x * SCALE, y * SCALE, (x + w) * SCALE, (y + h) * SCALE)
    draw.rounded_rectangle(bounds, radius=radius * SCALE, fill=fill, outline=stroke, width=SCALE)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"' + (f' stroke="{stroke}"' if stroke else '') + '/>')


def line(x1, y1, x2, y2, color=LINE, weight=2):
    draw.line((x1*SCALE, y1*SCALE, x2*SCALE, y2*SCALE), fill=color, width=weight*SCALE)
    svg.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{color}" stroke-width="{weight}" fill="none"/>')


def arrow(x1, y, x2, color=MUTED, weight=2):
    line(x1, y, x2, y, color, weight)
    line(x2-8, y-6, x2, y, color, weight)
    line(x2-8, y+6, x2, y, color, weight)


def text(x, y, value, size=26, color=INK, bold=False, anchor="left"):
    if anchor == "center":
        x -= width(value, size, bold) / 2
    if x < 0 or x + width(value, size, bold) > W + 1:
        raise ValueError(f"Text outside canvas: {value}")
    f = font(size, bold)
    ascent, _ = f.getmetrics()
    baseline = y * SCALE + ascent
    draw.text((x*SCALE, baseline), value, font=f, fill=color, anchor="ls")
    svg.append(f'<text x="{x:.2f}" y="{baseline/SCALE:.2f}" font-size="{size}" fill="{color}" font-weight="{700 if bold else 400}">{escape(value)}</text>')


def para(x, y, value, max_width, size=25, color=MUTED, bold=False, gap=1.5):
    top = y
    for paragraph in value.split("\n"):
        rows, current = [], ""
        for char in paragraph:
            candidate = current + char
            if width(candidate, size, bold) > max_width and current:
                rows.append(current)
                current = char
            else:
                current = candidate
        rows.append(current)
        for row in rows:
            text(x, top, row, size, color, bold)
            top += size * gap
    return top


def tag(x, y, value, fill=PALE, color=GREEN, size=21):
    tw = width(value, size) + 28
    box(x, y, tw, 38, fill, radius=6)
    text(x+14, y+5, value, size, color)
    return tw


def section(y, num, title, note=None):
    text(72, y, num, 27, MUTED)
    text(132, y-3, title, 36, INK, True)
    if note:
        text(1728-width(note, 23), y+5, note, 23, MUTED)


# Headline and the decision this research supports.
box(0, 0, W, H, BG, radius=0)
box(0, 0, W, 264, GREEN, radius=0)
text(72, 34, "006  /  开源研究 → 产品探索", 24, "#BDD0BA")
text(72, 83, "从 Leak Check 到「拾迹」", 61, WHITE, True)
text(74, 171, "能力边界 · 探索转折 · 可继续验证的产品方向 · 对你的意义", 27, "#E0EADC")
tag(1457, 43, "接入开发暂缓", GOLD, AMBER, 23)
text(1457, 99, "研究与原型保留", 24, "#E0EADC")
text(74, 222, "核心判断：先找到可访问的数据，再决定产品能够承诺什么。", 25, "#D4E1C9")

# The exploration is a sequence of questions and decisions.
section(300, "01", "我们的探索，如何逐步收敛", "保留原始目标与转向之间的区别")
steps = [
    ("最初想要", "输入电话或邮箱", "查出所有注册平台，\n以及相关泄露情况。"),
    ("阅读源码", "发现查询的是已有库", "程序能做匹配与关联，\n真实数据需要另行接入。"),
    ("追问数据来源", "内部账号表并不开放", "知道邮箱地址，不能直接\n读取各平台内部账号。"),
    ("寻找可用证据", "用户自己的历史邮件", "授权读注册、登录通知\n但邮件仍可能缺失。"),
    ("保留方向", "邮件驱动的账号盘点", "自动整理线索与证据\n用户确认、排除与导出。"),
]
for i, (label, title, desc) in enumerate(steps):
    x = 72 + i * 336
    fill = GREEN if i == 4 else WHITE
    box(x, 366, 312, 198, fill)
    text(x+22, 384, label, 22, "#CADAAC" if i == 4 else MUTED)
    text(x+22, 426, title, 26, WHITE if i == 4 else INK, True)
    para(x+22, 474, desc, 272, 23, "#E0EADC" if i == 4 else MUTED, gap=1.48)
    if i < 4:
        arrow(x+317, 460, x+331, "#8BA18A")
box(72, 587, 1656, 66, "#E9E6D7", radius=9)
text(96, 605, "关键转折", 25, AMBER, True)
text(243, 607, "原始的“只输入标识、查全平台”尚未实现；新方向增加了用户授权读信这一必要条件。", 25, INK)

# Original library: mechanism on the left, data boundaries on the right.
section(688, "02", "这个库实际做了什么", "源码版本 3.0.0 · 固定提交 7e3a113")
box(72, 754, 806, 506, WHITE, LINE)
box(902, 754, 826, 506, WHITE, LINE)
text(100, 777, "已有数据库的查询、关联与脱敏", 31, INK, True)
text(100, 827, "FastAPI + SQLite · 主要提供后端 HTTP 查询接口", 23, MUTED)
nodes = [("输入标识", "电话 / 邮箱 / 身份证 / QQ"), ("精确匹配", "按字段查询 person 表"), ("发现关联", "提取命中记录的其他标识")]
for i, (label, desc) in enumerate(nodes):
    x = 100 + i*251
    box(x, 883, 235, 104, PALE, radius=9)
    text(x+15, 897, label, 26, GREEN, True)
    text(x+15, 944, desc, 17.5, MUTED)
    if i < 2:
        arrow(x+238, 935, x+248, MUTED)
box(100, 1007, 750, 58, GREEN, radius=8)
text(120, 1021, "用新标识重复查表 → 默认两轮 → 字段聚合、打码输出", 23, WHITE)
para(100, 1084, "本质是应用程序分轮查询同一张表；来源表补充来源信息。共享标识能串起线索，但不证明一定是同一人。", 748, 24)
line(100, 1177, 850, 1177)
text(100, 1195, "可借鉴：查询流程、有限轮次关联、脱敏与接口组织。", 24, GREEN, True)

text(932, 777, "能力上限，由数据来源决定", 31, INK, True)
rows = [
    ("开源仓库", "只有小型示例库：8 条个人记录；真实数据需自备。"),
    ("作者服务", "可能连接作者的数据；其数据和实际效果本次未验证。"),
    ("公开网页", "能提供公开出现的线索，无法读取平台内部账号表。"),
    ("已知泄露库", "只能覆盖已收录事件；无命中不代表没有泄露。"),
]
for i, (label, value) in enumerate(rows):
    yy = 836 + i*72
    text(932, yy, label, 24, INK, True)
    para(1080, yy, value, 616, 23, MUTED, gap=1.4)
    if i < 3:
        line(932, yy+63, 1698, yy+63)
para(932, 1136, "仓库不含：实时全网搜索、作者数据同步、平台内部数据访问、历史邮件分析。", 760, 24, AMBER, True)
text(932, 1223, "描述易造成误解，不足以证明作者有意误导。", 22, MUTED)

# The concrete product concept and its evidence model.
box(72, 1300, 1656, 770, GREEN, radius=22)
text(105, 1328, "03  /  最终保留的产品方向", 25, "#CAD9B5")
text(105, 1375, "拾迹 · 有邮件证据的账号盘点", 44, WHITE, True)
text(105, 1441, "面向个人用户；独立开发的原型，未直接复用 Leak Check 查询代码。", 25, "#DBE7D5")
tag(1454, 1340, "价值仍待验证", GOLD, AMBER, 22)
pipeline = [
    ("01", "连接自己的邮箱", "输入地址，识别服务商"),
    ("02", "完成读信授权", "官方授权 / 客户端授权码"),
    ("03", "自动读取邮件", "展示实际范围与进度"),
    ("04", "分析与归组", "解析、去重、提取线索"),
    ("05", "查看平台证据", "线索类型、时间、原邮件"),
    ("06", "确认并导出", "排除误判，保留清单"),
]
for i, (num, label, desc) in enumerate(pipeline):
    x = 105+i*268
    box(x, 1508, 248, 133, "#36604E", radius=10)
    text(x+16, 1521, num, 21, "#BBD19E")
    text(x+16, 1556, label, 25, WHITE, True)
    text(x+16, 1603, desc, 18, "#DCE7D7")
    if i < 5:
        arrow(x+252, 1575, x+264, "#C1D0B7")
text(107, 1663, "主入口是授权后自动分析；.eml / .mbox 文件导入仅为备用。验证邮箱归属，不等于授权读取邮件。", 24, "#E0EADC")
line(105, 1720, 1695, 1720, "#65806B")
text(105, 1740, "线索如何解释", 27, WHITE, True)
text(401, 1745, "交付：平台 + 线索类型 + 证据邮件 + 相关时间 + 用户确认状态", 24, "#DDE9D5")
evidence = [
    ("注册成功通知", "支持历史注册判断", "仍需核对是否属于本人"),
    ("登录 / 订阅状态", "支持历史使用判断", "不据此认定注册时间"),
    ("验证码 / 重置请求", "仅说明发生过请求", "不证明操作已成功完成"),
    ("推广 / 普通收据", "不能单独证明注册", "可能是营销或访客购买"),
]
for i, (label, conclusion, note) in enumerate(evidence):
    x = 105+i*404
    box(x, 1803, 379, 139, "#F0F3E8", radius=10)
    text(x+22, 1820, label, 25, GREEN, True)
    text(x+22, 1864, conclusion, 25, INK)
    text(x+22, 1904, note, 22, MUTED)
text(105, 1967, "结果边界", 24, "#E7D8A7", True)
text(249, 1969, "历史邮件 ≠ 完整注册清单    最早邮件 ≠ 注册日期    平台数 ≠ 账号数", 25, WHITE)
text(249, 2014, "遗漏邮件就可能遗漏账号；历史线索不证明账号今天仍有效，也不能当作泄露检测。", 24, "#D9E4D2")

# Meaning for this user's product decision as well as their end users.
section(2104, "04", "对你有什么意义", "真实价值应通过使用验证，而非平台数量证明")
box(72, 2170, 806, 232, WHITE, LINE)
box(902, 2170, 826, 232, "#E7ECDD")
text(101, 2191, "对个人使用者：减少翻信与遗忘", 30, INK, True)
para(101, 2244, "找回曾使用的平台，看到可核对的原邮件；把分散在历史邮件中的线索整理成清单，便于确认、排除和后续整理。", 746, 25)
text(101, 2356, "直接收益假设：节省时间、减少遗漏、降低判断成本。", 23, GREEN)
text(932, 2191, "对你做产品：明确投入方向", 30, INK, True)
para(932, 2244, "把资源投入邮箱接入、证据质量与账号整理体验。原库适合作为实现参考，无法补齐关键数据；单纯列出平台是否值得付费仍待验证。", 760, 25)
text(932, 2356, "后续探索：订阅线索、闲置账号整理、注销入口指引。", 23, GREEN)

# Status and a gated roadmap.
section(2424, "05", "现在做到哪一步，之后如何推进", "截至 2026.09.22 · 无上线日期承诺")
box(72, 2489, 806, 277, WHITE, LINE)
box(902, 2489, 826, 277, WHITE, LINE)
text(101, 2509, "保留现有原型，真实效果尚未验证", 29, INK, True)
para(101, 2560, "已做：解析、分类、平台聚合、证据、确认、CSV 导出；20 项解析测试、21 项服务离线测试及浏览器流程验证通过。", 746, 24)
para(101, 2640, "未做：真实账号授权读取、真实准确率与遗漏评估。当前仅设计读取收件箱最近 100–3,000 封，另有大小上限。", 746, 24)
text(101, 2725, "自动读取需本机服务；静态页仅支持示例与文件导入。", 22, AMBER)
text(932, 2509, "差异在授权与读取，邮件分析可以复用", 29, INK, True)
text(932, 2562, "QQ / Foxmail · 163 / 126 / Yeah", 25, GREEN, True)
text(932, 2606, "已有 IMAP 连接代码与模拟验证；真实兼容性待验证。", 23, MUTED)
text(932, 2653, "Gmail / Workspace · Outlook / Hotmail", 25, GREEN, True)
text(932, 2697, "尚未接入：后期规划 OAuth + Gmail API / Graph。", 23, MUTED)
text(932, 2728, "Gmail 本身支持 IMAP；当前缺的是产品适配。", 22, AMBER)

roadmap = [
    ("现在", "暂停新增接入", "保留研究与原型"),
    ("恢复后 01", "单一邮箱真实验证", "小范围授权、核对证据"),
    ("02", "扩大邮箱支持", "优先 Gmail，再 Outlook"),
    ("03", "完善覆盖与质量", "多文件夹、增量、多账号"),
    ("04", "验证整理价值", "订阅 / 注销指引再评估"),
]
for i, (label, title, detail) in enumerate(roadmap):
    x = 72+i*336
    box(x, 2803, 312, 157, GREEN if i == 0 else PALE, radius=11)
    text(x+20, 2820, label, 21, "#D8E4CA" if i == 0 else MUTED)
    text(x+20, 2861, title, 27, WHITE if i == 0 else INK, True)
    text(x+20, 2909, detail, 21, "#DFE9D6" if i == 0 else MUTED)
    if i < 4:
        arrow(x+316, 2880, x+331, MUTED)
text(73, 2984, "继续投入的条件：真实读取成功 → 误报与遗漏可解释 → 用户能完成具体整理任务，并认可节省的时间。", 25, GREEN, True)

line(72, 3048, 1728, 3048, "#B7C6B4")
text(73, 3065, "当前决定：暂停新增适配与真实邮箱验证。保留原型，不承诺查全网、查全账号或自动注销。", 25, INK, True)
text(73, 3112, "依据：Leak Check 固定版本源码审查 · 本地原型及离线验证记录 · product-roadmap.md", 22, MUTED)
text(73, 3150, "github.com/garinasset/leak-check  ·  Google / Microsoft 官方接入文档  ·  研究日期 2026-09-22", 20, MUTED)

svg.append("</svg>")
OUT.mkdir(exist_ok=True)
(OUT / "understanding-map.svg").write_text("\n".join(svg), encoding="utf-8")
image.save(OUT / "understanding-map.png", optimize=True)
print(f"Exported {W}×{H} SVG and {W*SCALE}×{H*SCALE} PNG to {OUT}")
