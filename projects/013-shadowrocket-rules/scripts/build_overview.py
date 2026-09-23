"""Generate the editable, self-contained vector overview for the research page."""
from html import escape
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
OUT = PROJECT / "assets" / "capability-overview.svg"
W, H = 1600, 2200
INK, MUTED, BLUE, TEAL, RED = "#17253e", "#52647e", "#235fe4", "#14725e", "#b63855"
parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">
<title id="title">一张图读懂 Shadowrocket 规则库：能力、配置生效、广告拦截与适用边界</title>
<desc id="desc">上游名单经仓库脚本整理生成配置，客户端导入并启用配置；另一条路径由系统 VPN 或 TUN 将应用流量接入客户端。规则引擎据此决定直连、代理或拒绝。广告名单主要用于拒绝，代理黑白名单用于选路。仓库节省名单维护工作，不提供节点或网关引擎，配置不能供所有 VPN 直接使用。</desc>
<defs>
<marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#7b8ca8"/></marker>
<marker id="policy-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="{BLUE}"/></marker>
</defs>
<style>text{{font-family:'Microsoft YaHei','Noto Sans CJK SC',sans-serif}}.mono{{font-family:Consolas,'Courier New',monospace}}</style>
<rect width="{W}" height="{H}" fill="#f4f7fc"/>
''']

def rect(x, y, w, h, fill="#fff", stroke="#dce4ef", radius=14):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>')

def text(x, y, value, size=24, color=INK, weight=400, anchor="start", mono=False):
    cls = ' class="mono"' if mono else ''
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}"{cls}>{escape(value)}</text>')

def lines(x, y, values, size=24, gap=36, color=MUTED, weight=400):
    for n, value in enumerate(values):
        text(x, y + gap*n, value, size, color, weight)

def path(d, policy=False, arrow=True):
    dash = ' stroke-dasharray="9 7"' if policy else ''
    marker = f' marker-end="url(#{"policy-arrow" if policy else "arrow"})"' if arrow else ''
    parts.append(f'<path d="{d}" fill="none" stroke="{BLUE if policy else "#7b8ca8"}" stroke-width="3"{dash}{marker}/>')

def section(x, y, number, heading):
    text(x, y, number, 24, BLUE, 700, mono=True)
    text(x+54, y, heading, 28, INK, 700)

# What the repository is.
text(60, 59, "开源项目研究  /  013", 20, BLUE, 700)
text(60, 125, "一张图读懂：Shadowrocket 规则库", 46, INK, 700)
text(60, 164, "Shadowrocket-ADBlock-Rules-Forever  ·  能力 / 配置生效 / 流量接入 / 使用价值", 21, MUTED)
rect(60, 194, 1480, 93, "#e7efff", "#d4e2fc")
text(85, 232, "本质：维护好的名单 + 规则转换脚本 + 持续生成的配置文件", 29, "#204f9d", 700)
text(85, 267, "仓库提供处理依据；Shadowrocket 接收流量并执行；代理节点提供网络出口。", 24, MUTED)

# Configuration path.
section(60, 337, "01", "配置怎么来：仓库负责整理和生成")
rect(60, 366, 370, 188)
text(86, 407, "上游名单", 28, INK, 700)
lines(86, 450, ["广告 / 部分跟踪域名", "代理与直连站点、人工例外", "如 EasyList、GFWList"], 22, 34)
path("M440 461H483")
rect(500, 366, 438, 188)
text(525, 407, "Python 脚本与模板", 28, INK, 700)
lines(525, 450, ["拉取 → 提取域名/IP → 去重", "合并人工规则，组合不同策略", "自动构建 / 懒人配置另行同步"], 22, 34)
path("M949 461H991")
rect(1008, 366, 532, 188, "#edf3ff", "#a9c3f5")
text(1034, 407, ".conf 配置文件", 28, BLUE, 700)
lines(1034, 450, ["分流：黑名单 / 白名单 / 国内外划分", "拦截：广告 REJECT 规则", "其他：回国、直连去广告、策略组"], 22, 34)
path("M1275 554V593H905V765", policy=True)
rect(956, 571, 486, 44, "#f4f7fc", "#f4f7fc", 0)
text(964, 600, "导入 / 更新并启用 → 加载为策略", 22, BLUE, 600)

# Runtime path, distinctly separate from configuration.
section(60, 649, "02", "配置怎么生效：两条输入，汇合到引擎")
rect(60, 678, 1480, 386, "#fff", "#dce4ef")
path("M905 678V765", policy=True)
text(88, 718, "实线 = 网络请求的处理方向", 20, MUTED)
text(448, 718, "虚线 = 配置加载关系", 20, BLUE)
rect(90, 808, 232, 130, "#f2f5fa", "#dce4ef")
text(206, 850, "App / 浏览器", 25, INK, 700, "middle")
text(206, 890, "发出网络请求", 23, MUTED, anchor="middle")
path("M327 873H377")
rect(390, 808, 293, 130, "#f2f5fa", "#dce4ef")
text(536, 850, "系统网络接入", 25, INK, 700, "middle")
text(536, 890, "iOS VPN / TUN 架构", 22, MUTED, anchor="middle")
path("M689 873H734")
rect(748, 775, 314, 186, "#e9f1ff", "#8eb2f5")
text(905, 824, "Shadowrocket", 29, BLUE, 700, "middle")
text(905, 861, "规则匹配与执行引擎", 23, INK, 700, "middle")
text(905, 900, "域名 / IP / 地区 / 优先级", 20, MUTED, anchor="middle")
text(905, 936, "未命中 → 默认策略", 21, MUTED, anchor="middle")
path("M1067 871H1114", arrow=False)
path("M1114 871V761H1167")
path("M1114 871H1167")
path("M1114 871V981H1167")
for y, title, body, color, fill in [
    (724, "DIRECT · 直连", "本机 → 目标服务", TEAL, "#e9f6ef"),
    (834, "PROXY · 代理", "本机 → 自备节点 → 目标", BLUE, "#edf3ff"),
    (944, "REJECT · 拒绝", "阻止匹配的连接或请求", RED, "#fff0f3")]:
    rect(1180, y, 332, 83, fill, fill, 10)
    text(1203, y+33, title, 24, color, 700)
    text(1203, y+64, body, 21, MUTED)
text(91, 1023, "加载配置 ≠ 接入流量：配置告诉引擎怎么处理；系统机制把流量交给客户端。", 24, INK, 700)
lines(62, 1102, ["接入层为架构示意：Apple NetworkExtension 提供此类 VPN/TUN 能力；本库不含客户端接入或转发引擎源码。",
                    "本库不提供函数 Hook 或 BPF 程序；图中不据此断言 Shadowrocket 内部具体类、协议栈和转发实现。"], 20, 30)

# The two kinds of lists people confuse.
rect(60, 1170, 710, 315)
section(85, 1214, "03", "广告如何拦截")
text(86, 1257, "广告域名/IP 命中名单 → REJECT", 24, RED, 700)
rect(86, 1277, 658, 47, "#f1f4f9", "#f1f4f9", 6)
text(103, 1308, "DOMAIN-SUFFIX,ads.example.test,REJECT", 22, INK, mono=True)
lines(86, 1363, ["广告资源获取被阻止 → 广告可能不再显示", "例外规则减少误拦截，具体结果取决于优先级。", "基础域名/IP 拦截不要求解密 HTTPS 正文。"], 22, 36)
text(87, 1461, "示例域名仅用于教学，不进行真实访问。", 18, MUTED)

rect(800, 1170, 740, 315)
section(826, 1214, "04", "三种名单，含义不同")
for y, label, detail, color in [
    (1259, "广告黑名单", "命中 → 拒绝请求", RED),
    (1324, "代理黑名单", "命中 → 代理；其余通常直连", BLUE),
    (1389, "直连白名单", "命中 → 直连；其余通常代理", TEAL)]:
    text(826, y, label, 24, color, 700)
    text(1004, y, detail, 22, MUTED)
text(826, 1457, "“黑名单”不总是禁止访问；分流名单用来选路。", 22, INK, 600)

# What the user gets and what cannot be generalized.
rect(60, 1515, 710, 365)
section(85, 1560, "05", "适用场景与生效步骤")
lines(86, 1606, ["已有小火箭：国内外服务分流，减少手动切换。", "只想去广告：选择“直连 + 去广告”。", "多个节点：策略组按服务选择出口。", "人在海外：回国规则配合已有的国内出口。"], 22, 37)
path("M86 1748H743", arrow=False)
text(86, 1788, "选配置 → 导入客户端 → 启用 → 检查常用服务", 23, BLUE, 600)
lines(86, 1828, ["代理模式需可用节点；直连去广告可不依赖节点。", "仓库更新后，客户端仍需刷新配置。"], 21, 32)

rect(800, 1515, 740, 365)
section(826, 1560, "06", "通用性与技术边界")
text(826, 1606, "名单可参考，配置不对所有 VPN 通用。", 25, BLUE, 700)
lines(826, 1652, ["换客户端 / 网关：转换格式，核对支持能力，", "再检查 DNS、例外规则和匹配优先级。", "同域广告、视频内嵌广告不保证准确拦截。", "无法完整替代浏览器元素隐藏与复杂过滤。", "它不提供代理节点、VPN 协议或完整网关。"], 22, 38)

rect(60, 1912, 1480, 128, "#101c32", "#101c32")
text(88, 1956, "真正的价值：把零散名单维护成可用配置，节省人工整理和更新的成本。", 28, "#f1f6ff", 700)
text(88, 2006, "记住分工：仓库管规则    ·    客户端接入并执行    ·    节点提供出口    ·    配置需要持续更新", 24, "#bfcee5")

text(60, 2081, "依据：上游 README、ad.py、build_confs.py、配置模板，以及 Apple NetworkExtension 官方文档。", 19, MUTED)
parts.append('<a href="https://github.com/Johnshall/Shadowrocket-ADBlock-Rules-Forever">')
text(60, 2116, "github.com/Johnshall/Shadowrocket-ADBlock-Rules-Forever", 19, BLUE)
parts.append('</a><a href="https://developer.apple.com/documentation/networkextension/nepackettunnelprovider">')
text(60, 2147, "Apple：NEPacketTunnelProvider 接口文档 ↗", 19, BLUE)
parts.append('</a>')
text(60, 2180, "整理日期 2026-09-22  ·  基于源码与公开资料的技术说明，未作 iOS 真机拦截测试  ·  CC BY-SA 4.0", 18, MUTED)
parts.append('</svg>')
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text('\n'.join(parts), encoding='utf-8', newline='\n')
print(OUT)
