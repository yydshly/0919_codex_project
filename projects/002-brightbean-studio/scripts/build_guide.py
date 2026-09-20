"""Generate the editable SVG guide using only the Python standard library."""
from html import escape
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
OUT = PROJECT / 'assets' / 'connection-guide.svg'
SOURCE = 'https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/README.md#platform-credentials'

# Columns: target, variant, four capabilities, portal, address, two setup lines, URL.
ROWS = [
    ('Facebook', '管理自己的 Page', [1, 1, 1, 1], 'Meta for Developers', 'developers.facebook.com', '建 Meta 应用 → 取得 App ID / Secret', '配置权限与回调 → 管理员授权 Page', 'https://developers.facebook.com/'),
    ('Instagram', '经 Facebook 连接', [1, 1, 1, 1], 'Meta for Developers', 'developers.facebook.com', '使用 Facebook 应用凭证，配置 IG 权限', '专业账号关联 Page → 登录并授权', 'https://developers.facebook.com/'),
    ('Instagram Direct', '直接连接专业账号', [1, 1, 1, 1], 'Meta / Instagram API', 'developers.facebook.com', '取得 Instagram 专属 App ID / Secret', '专业账号直接授权；不要求关联 Page', 'https://developers.facebook.com/'),
    ('Threads', '文字社交', [1, 1, 0, 1], 'Meta / Threads API', 'developers.facebook.com', '启用 Threads 用例，取得专属 ID / Secret', '单独配置回调 → 授权 Threads 账号', 'https://developers.facebook.com/'),
    ('LinkedIn · 个人', '个人发布与运营', [1, 2, 0, 2], 'LinkedIn Developer', 'developer.linkedin.com', '建应用 → 取得 Client ID / Secret', '基础发布走登录 + 分享；评论/统计看权限*', 'https://developer.linkedin.com/'),
    ('LinkedIn · 公司', '公司主页运营', [1, 1, 0, 1], 'LinkedIn Developer', 'developer.linkedin.com', '关联公司 Page → 申请 Community Management', '获批后取得凭证 → 有管理资格的用户授权', 'https://developer.linkedin.com/'),
    ('TikTok', '海外短视频，不是抖音', [1, 0, 0, 1], 'TikTok for Developers', 'developers.tiktok.com', '建应用 + Login Kit + Content Posting API', '取得 Client Key / Secret → 授权；公开发布需审核', 'https://developers.tiktok.com/'),
    ('YouTube', '自己的视频频道', [1, 1, 0, 1], 'Google Cloud Console', 'console.cloud.google.com', '建项目、启用 YouTube Data API，配置统计权限', '创建 OAuth Client ID / Secret → 频道所有者授权', 'https://console.cloud.google.com/'),
    ('Google Business Profile', '谷歌商家资料', [1, 0, 0, 1], 'Google Cloud Console', 'console.cloud.google.com', '申请 Business Profile API 访问并启用相关 API', 'OAuth 凭证 → 商家所有者 / 管理员授权', 'https://console.cloud.google.com/'),
    ('Pinterest', '图片与视觉内容', [1, 0, 0, 1], 'Pinterest Developers', 'developers.pinterest.com', '建应用 → 取得 App ID / Secret', '配置回调与权限 → 授权自己的账号', 'https://developers.pinterest.com/'),
    ('Bluesky', '不需预建开发者应用', [1, 1, 0, 0], 'Bluesky 账号设置', 'bsky.app', '设置 → 隐私与安全 → App Passwords', '创建应用密码 → 在 Studio 填账号标识与应用密码', 'https://bsky.app/'),
    ('Mastodon', '不需预建开发者应用', [1, 1, 0, 0], '自己所在的 Mastodon 实例', '例如 mastodon.social', '在 Studio 输入实例地址', 'Studio 自动注册 OAuth 应用 → 跳转登录授权', 'https://docs.joinmastodon.org/methods/apps/'),
    ('DEV.to', '不需预建开发者应用', [1, 0, 0, 0], 'DEV.to / Settings / Extensions', 'dev.to/settings/extensions', '找到 DEV Community API Keys → 生成密钥', '将个人 API key 填入 Studio 连接账号', 'https://dev.to/settings/extensions'),
]

INK, MUTED, GREEN, LIME = '#1b342d', '#68766b', '#235746', '#d8ef92'
parts = []


def rect(x, y, w, h, fill, radius=0, stroke=None):
    extra = f' stroke="{stroke}"' if stroke else ''
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}"{extra}/>')


def text(x, y, value, size=23, fill=INK, weight=400, anchor='start'):
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{escape(value)}</text>')


def line(x1, y1, x2, y2, color='#dce2d5', width=1):
    parts.append(f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="{color}" stroke-width="{width}"/>')


def main():
    parts.clear()
    parts.append('<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="2360" viewBox="0 0 1800 2360" role="img" aria-labelledby="title desc">')
    parts.append('<title id="title">BrightBean Studio：能力、目标平台与接入方式引导图</title><desc id="desc">概括核心运营能力，列出十一平台十三种连接的功能矩阵、官方凭证入口、账号授权方式和主要限制。以自行部署为准。</desc>')
    parts.append('<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC","PingFang SC",sans-serif}a:hover text{text-decoration:underline}</style>')
    rect(0, 0, 1800, 2360, '#f4f5ef')
    text(72, 72, 'OPEN SOURCE RESEARCH / 002', 18, GREEN, 600)
    text(1728, 72, '2026.09.20 · 基于 f812ee4', 18, MUTED, anchor='end')
    text(72, 141, 'BrightBean Studio 接入引导图', 51, INK, 600)
    text(72, 190, '先看能做什么，再选发布目标，最后找到凭证入口与授权路径。', 25, MUTED)

    rect(72, 230, 1656, 210, '#173e34', 16)
    text(109, 275, '01 / 你准备', 18, '#aec4b1')
    text(109, 326, '文案 · 图片 · 视频', 30, '#f3f5e9', 600)
    text(109, 374, '也可由外部 AI 辅助准备', 21, '#bfd1bc')
    text(447, 337, '→', 42, LIME)
    text(540, 275, '02 / Studio 统一管理', 18, '#aec4b1')
    text(540, 325, '编辑与素材  →  审核与排期  →  多平台发布', 29, '#f3f5e9', 600)
    text(540, 374, '评论 / 私信管理 · 数据回收 · 团队协作 · REST / MCP', 22, '#bfd1bc')
    text(1343, 337, '→', 42, LIME)
    text(1430, 275, '03 / 支持范围', 18, '#aec4b1')
    text(1430, 327, '11 个平台', 36, LIME, 600)
    text(1430, 374, '13 种接入方式', 23, '#bfd1bc')

    text(72, 505, '选择目标：支持哪些能力，凭证从哪里获取？', 32, INK, 600)
    text(72, 541, '以下按自行部署整理。应用凭证用于识别你的服务；账号授权决定它能替谁操作。', 21, MUTED)
    table_y, header_h, row_h = 575, 64, 84
    rect(72, table_y, 1656, header_h + 13 * row_h, '#fffefa', 8, '#d9dfd2')
    rect(72, table_y, 1656, header_h, '#e5ebdb', 8)
    text(99, 615, '目标平台 / 账号', 23, GREEN, 600)
    for x, name in zip((444, 507, 570, 633), ('发布', '评论', '私信', '统计')):
        text(x, 615, name, 21, GREEN, 600, 'middle')
    text(720, 615, '凭证获取入口', 23, GREEN, 600)
    text(1110, 615, '获取方式 → 连接目标账号', 23, GREEN, 600)
    for i, (name, variant, flags, portal, address, setup1, setup2, url) in enumerate(ROWS):
        y = table_y + header_h + i * row_h
        if i >= 10:
            rect(73, y, 1654, row_h, '#edf3e3')
        elif i % 2:
            rect(73, y, 1654, row_h, '#f8f9f3')
        if i == 10:
            line(73, y, 1727, y, '#91aa71', 2)
        text(99, y + 33, name, 24 if len(name) < 21 else 21, INK, 600)
        text(99, y + 63, variant, 18, MUTED)
        for x, flag in zip((444, 507, 570, 633), flags):
            if flag == 1:
                parts.append(f'<circle cx="{x}" cy="{y + 43}" r="6" fill="#3f8054"/>')
            elif flag == 2:
                text(x, y + 51, '*', 34, '#977535', 600, 'middle')
            else:
                line(x - 7, y + 43, x + 7, y + 43, '#a4aea0', 2)
        parts.append(f'<a href="{escape(url, quote=True)}" target="_blank" rel="noreferrer">')
        text(720, y + 33, portal, 22, GREEN, 500)
        text(720, y + 63, address + ' ↗', 18, MUTED)
        parts.append('</a>')
        text(1110, y + 33, setup1, 21, INK)
        text(1110, y + 63, setup2, 20, MUTED)
        if i < 12:
            line(73, y + row_h, 1727, y + row_h)
    text(72, 1772, '● 项目声明支持   — 未提供   * 依赖受限权限，不能按基础接入保证可用   ·   浅绿色三行无需预建开发者应用', 20, MUTED)
    text(72, 1807, 'LinkedIn 个人基础路径主要用于发布；官方文档注明 r_member_social 目前不接受新申请，评论等能力须核验。', 20, '#8a6b36')

    text(72, 1869, '拿到凭证以后：接入顺序', 31, INK, 600)
    boxes = [
        ('1', '准备账号与服务', '确认账号资格，部署 Studio'),
        ('2', '配置应用与回调', '后台或 .env 填凭证，申请权限'),
        ('3', '连接并授权账号', 'OAuth 登录，或填应用密码 / key'),
        ('4', '验证一条真实内容', '先草稿，再发布，再检查指标'),
    ]
    for i, (num, heading, note) in enumerate(boxes):
        x = 72 + i * 424
        rect(x, 1900, 384, 133, '#fffefa', 8, '#d9dfd2')
        rect(x + 20, 1921, 30, 30, GREEN, 15)
        text(x + 35, 1943, num, 18, '#fff', 600, 'middle')
        text(x + 65, 1944, heading, 25, INK, 600)
        text(x + 20, 1989, note, 20, MUTED)
        if i < 3:
            text(x + 397, 1973, '→', 25, '#83986b')

    rect(72, 2070, 1656, 165, '#e8edde', 10)
    text(99, 2114, '接入前，记住这三点', 25, GREEN, 600)
    text(99, 2157, '账号与凭证不同', 22, INK, 600)
    text(99, 2195, '有账号不等于有 API 权限；先确认自己有管理资格。', 20, MUTED)
    text(701, 2157, '支持不等于免审核', 22, INK, 600)
    text(701, 2195, 'TikTok 公开发布、LinkedIn 等可能有额外门槛。', 20, MUTED)
    text(1275, 2157, '国内目标尚未接入', 22, INK, 600)
    text(1275, 2195, '抖音、小红书、B站、公众号等。', 20, MUTED)

    line(72, 2273, 1728, 2273)
    text(72, 2312, '来源：固定版本 README / providers + 平台官方文档。能力为项目声明，本次未授权账号或实测发布。', 19, MUTED)
    parts.append(f'<a href="{SOURCE}" target="_blank" rel="noreferrer">')
    text(1728, 2312, '查看接入说明 ↗', 19, GREEN, 500, 'end')
    parts.append('</a></svg>')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('\n'.join(parts), encoding='utf-8', newline='\n')
    print(f'Generated {OUT.name}: 1800 × 2360, {len(ROWS)} connections.')


if __name__ == '__main__':
    main()
