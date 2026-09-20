"""Create an editable capability map; --png also renders with Pillow and CJK fonts."""
from html import escape
from pathlib import Path
import argparse

PROJECT = Path(__file__).resolve().parents[1]
W, H = 2000, 2670
INK, MUTED, BLUE, TEAL = '#15273f', '#56677d', '#2457cd', '#087366'
NAVY, PAPER, LINE = '#101e33', '#f3f6fb', '#d8e2ef'
parts = []
draw = None
fonts = {}
FONT_DIR = Path('C:/Windows/Fonts')


def rect(x, y, w, h, fill, radius=0, stroke=None):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"' + (f' stroke="{stroke}"' if stroke else '') + '/>')
    if draw:
        draw.rounded_rectangle((x,y,x+w,y+h), radius, fill=fill, outline=stroke)


def text(x, y, value, size=24, fill=INK, bold=False, maxw=None):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{600 if bold else 400}">{escape(value)}</text>')
    if draw:
        from PIL import ImageFont
        key=(size,bold)
        if key not in fonts:
            fonts[key]=ImageFont.truetype(str(FONT_DIR / ('msyhbd.ttc' if bold else 'msyh.ttc')), size)
        font=fonts[key]
        length=font.getlength(value)
        if maxw is not None:
            assert length <= maxw, f'Text overflow ({length:.0f} > {maxw}): {value}'
        assert x+length < W-20 and y < H-20, value
        draw.text((x,y),value,font=font,fill=fill,anchor='ls')


def line(x1,y1,x2,y2,color=LINE,width=2):
    parts.append(f'<path d="M{x1},{y1} L{x2},{y2}" stroke="{color}" stroke-width="{width}" fill="none"/>')
    if draw: draw.line((x1,y1,x2,y2),fill=color,width=width)


def label(x,y,num,title,color):
    text(x,y,num,19,color,True)
    text(x+48,y+1,title,28,INK,True,maxw=796)


def main(png=False):
    global draw
    parts.clear()
    if png:
        from PIL import Image, ImageDraw
        canvas=Image.new('RGB',(W,H),PAPER)
        draw=ImageDraw.Draw(canvas)
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">')
    parts.append('<title id="title">Foundations-of-LLMs 与 Agent-Kernel 完整能力总览</title><desc id="desc">左侧为大模型基础教材六章核心内容、方法和学习价值；右侧为多智能体框架架构、能力价值、使用场景、可视化和数据输出，以及运行条件。实际功能依据官方文档；未运行上游模拟。</desc>')
    parts.append('<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC","PingFang SC",sans-serif}</style>')
    rect(0,0,W,H,PAPER)
    rect(0,0,W,267,NAVY)
    text(64,60,'OPEN SOURCE RESEARCH / 003',20,'#b8c9e1',True)
    text(1550,60,'ZJU-LLMs · 2026.09.20',20,'#b8c9e1')
    text(64,137,'大模型教材 × AI 群体模拟',58,'#ffffff',True)
    text(66,195,'一张图看懂：学什么、能做什么、为什么有用，以及最后能看到什么。',27,'#cedbed')
    text(66,237,'知识与方法 → 帮你做判断                         角色与环境 → 帮你做模拟实验',22,'#9dc5ed')

    rect(64,302,920,2000,'#ffffff',16,LINE)
    rect(1016,302,920,2000,'#ffffff',16,LINE)
    rect(64,302,920,9,BLUE,4)
    rect(1016,302,920,9,TEAL,4)
    text(96,355,'A / 开源教材',21,BLUE,True)
    text(96,405,'Foundations-of-LLMs',39,INK,True)
    text(96,447,'理解模型原理，学习使用与适配大模型的方法。',25,MUTED)
    text(96,484,'核心模块：按官方目录整理的六个章节',21,BLUE,True)
    chapters=[
        ('01','语言模型基础','统计语言模型 · RNN · Transformer','采样方法 · 效果评测','理解：文字怎样生成，回答怎样评价。'),
        ('02','大语言模型','数据与规模 · 架构概览 · 编码器型模型','编码器—解码器型 · 解码器型 · 非 Transformer','理解：不同架构的特点与演进路线。'),
        ('03','Prompt 工程','基本概念 · 上下文学习 · 思维链','提示技巧 · 相关应用','应用：交代目标、背景、示例和输出要求。'),
        ('04','参数高效微调','基本概念 · 参数附加 · 参数选择','低秩适配（如 LoRA）· 实践与应用','应用：用较少可训练参数适配具体任务。'),
        ('05','模型编辑','基本概念 · 经典方法 · 应用','附加参数 T-Patcher · 定位编辑 ROME','研究：针对性修改知识，并检查副作用。'),
        ('06','检索增强生成 · RAG','基本概念 · 系统架构 · 知识检索','生成增强 · 实践与应用','应用：找到相关资料，再让模型参考作答。'),
    ]
    for i,(num,title,a,b,c) in enumerate(chapters):
        y=510+i*160
        rect(96,y,856,146,'#f3f6fc',9)
        text(116,y+37,num,21,BLUE,True)
        text(167,y+38,title,27,INK,True)
        text(167,y+73,a,22,MUTED,maxw=760)
        text(167,y+105,b,22,MUTED,maxw=760)
        text(167,y+133,c,21,BLUE,maxw=760)

    label(96,1530,'A1','最实用的三种方法，分别改什么？',BLUE)
    methods=[('Prompt','改输入：任务、上下文、示例'),('RAG','补资料：检索外部知识，供回答参考'),('微调','改参数：通过训练适应特定任务')]
    for i,(title,note) in enumerate(methods):
        y=1570+i*67
        rect(96,y,856,55,'#eef3ff',7)
        text(115,y+36,title,24,BLUE,True)
        text(258,y+36,note,24,INK,maxw=672)

    label(96,1844,'A2','读完以后，你真正获得什么？',BLUE)
    text(96,1890,'提要求：把“帮我做”变成可理解、可验收的任务。',24,INK,maxw=856)
    text(96,1934,'找原因：分清指令不清、资料不足与能力限制。',24,INK,maxw=856)
    text(96,1978,'选方法：判断补资料、改提示词或训练是否合适。',24,INK,maxw=856)
    rect(96,2010,856,130,NAVY,10)
    text(119,2052,'建议阅读路线 / 面向实际应用',20,'#b6c8e3')
    text(119,2098,'第 3 章 → 第 6 章 → 回查 1、2 章 → 按需读 4、5 章',24,'#fff',True,maxw=810)
    text(96,2195,'交付形式：整本 / 分章 PDF + 相关论文资料。',24,INK)
    text(96,2233,'适合：AI 学习、日常提效、应用开发的知识准备。',23,MUTED)
    text(96,2270,'它提供学习材料；实际系统仍需另外实现与验证。',22,MUTED)

    text(1048,355,'B / 多智能体开发框架',21,TEAL,True)
    text(1048,405,'Agent-Kernel',39,INK,True)
    text(1048,447,'用大模型扮演个体，在共同环境里观察群体互动。',25,MUTED)
    label(1048,502,'B1','底层结构：模型思考，系统管理，场景定规则',TEAL)
    # Core module diagram: common runtime contains distinct responsibilities.
    modules=[('Agent','角色与决策'),('Environment','环境与状态'),('Action','行动与执行'),('Controller','干预与控制'),('System','系统管理')]
    for i,(en,cn) in enumerate(modules):
        x=1048+i*173
        rect(x,533,163,87,'#edf7f4',7,'#cee6df')
        text(x+12,567,en,19,TEAL,True,maxw=139)
        text(x+12,600,cn,21,INK,maxw=139)
    text(1048,657,'微内核：插件注册、行为校验、异步通信等通用机制。',23,MUTED,maxw=856)
    text(1048,693,'插件：实现具体角色、环境与动作，支持跨场景复用。',23,MUTED,maxw=856)
    rect(1048,719,856,132,NAVY,9)
    text(1071,759,'一次互动的概念流程',20,'#b8cce3')
    text(1071,802,'感知 → 决策 → 校验 → 执行 → 环境变化 → 再感知',24,'#d6fff3',True,maxw=810)
    text(1048,886,'你准备：角色身份 / 模型接口 / 环境规则 / 实验条件',23,TEAL,maxw=856)

    label(1048,947,'B2','核心价值：把群体互动变成可干预的实验',TEAL)
    values=[('动态群体','运行中增减角色、修改环境与行为。'),('实验干预','调整条件、触发事件，比较不同设定。'),('行为约束','按设定规则检查行动，再执行并更新状态。'),('开发复用','复用插件；提供单机与分布式运行路径。')]
    for i,(title,note) in enumerate(values):
        y=992+i*49
        text(1048,y,title,24,TEAL,True)
        text(1173,y,note,23,INK,maxw=731)

    label(1048,1200,'B3','适用场景：官方已经展示哪些方向？',TEAL)
    scenarios=[('校园生活','人员流动、资源使用、社会互动。'),('Universe 25','群体规模、社会结构与行为动态。'),('OpenHospital','医生与患者互动、协作流程与能力评测。')]
    for i,(title,note) in enumerate(scenarios):
        y=1227+i*79
        rect(1048,y,856,69,'#f1f7f5',7)
        text(1067,y+29,title,23,TEAL,True)
        text(1067,y+57,note,22,INK,maxw=810)

    label(1048,1504,'B4','效果呈现：最后可以看见或拿到什么？',TEAL)
    outputs=[
        ('运行面板 / Society-Panel','配置与启动 / 停止模拟；查看运行状态、事件日志。','通用控制面板，目前仅支持分布式版。'),
        ('过程回放 / OpenHospital 示例','通过前端查看角色活动与患者轨迹，支持离线日志回放。','具体场景负责可视化，不是所有场景自带地图动画。'),
        ('实验数据 / OpenHospital 示例','导出 JSON 与日志；可选 PostgreSQL 保存轨迹。','记录事件和互动过程，为复盘与评测提供依据。'),
        ('量化评测 / OpenHospital 示例','检查合理性、诊断准确性、治疗方案对齐与输入 token 成本。','指标依赖数据、标准答案与完整事件记录；本图无实测数值。'),
    ]
    for i,(title,a,b) in enumerate(outputs):
        y=1533+i*142
        rect(1048,y,856,130,'#f3f6fa',8)
        text(1068,y+34,title,25,INK,True,maxw=815)
        text(1068,y+73,a,22,INK,maxw=815)
        text(1068,y+107,b,20,MUTED,maxw=815)
    text(1048,2162,'使用条件：Python、模型服务、场景代码与所需存储。',23,INK,maxw=856)
    text(1048,2202,'适合：科研、教学、虚拟社会与多角色协作评测。',23,INK,maxw=856)
    text(1048,2240,'成本由模型调用与规模决定；多角色不等于多个本地模型。',21,MUTED,maxw=856)
    text(1048,2276,'规则校验不保证现实有效性，也不保证群体一定更聪明。',21,MUTED,maxw=856)

    rect(64,2335,1872,170,'#e5edf9',12)
    text(93,2380,'对你的意义',27,BLUE,True)
    text(93,2426,'想把 AI 用好 → 从教材的提示词与 RAG 开始。',27,INK,True)
    text(1021,2426,'想观察 AI 群体 → 用框架搭建并检验一个小场景。',27,INK,True,maxw=886)
    text(93,2470,'两者关系：教材首页关联推荐框架；学习可以帮助开发，但阅读整本教材不是运行框架的必要条件。',23,MUTED,maxw=1814)

    text(64,2549,'来源：两库官方 README / 教材目录；Agent-Kernel 的 Society-Panel、OpenHospital 文档与论文。',21,MUTED)
    text(64,2586,'版本：Foundations 1109bfa · Agent-Kernel c14b6e5   |   独立整理；未部署上游或复现实验；阅读路线与适用性为研究判断。',19,MUTED)
    # SVG has clickable primary source references; PNG retains readable repository names.
    parts.append('<a href="https://github.com/ZJU-LLMs/Foundations-of-LLMs" target="_blank">')
    text(64,2623,'github.com/ZJU-LLMs/Foundations-of-LLMs',20,BLUE)
    parts.append('</a><a href="https://github.com/ZJU-LLMs/Agent-Kernel" target="_blank">')
    text(1048,2623,'github.com/ZJU-LLMs/Agent-Kernel',20,TEAL)
    parts.append('</a></svg>')
    output=PROJECT/'assets'/'capability-overview.svg'
    output.write_text('\n'.join(parts),encoding='utf-8')
    if png:
        canvas.save(output.with_suffix('.png'),optimize=True)
    print(f'Created capability overview: {W} x {H}; SVG' + (' + PNG' if png else ''))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--png',action='store_true',help='Render PNG using Pillow and Windows Microsoft YaHei fonts')
    main(parser.parse_args().png)
