# BrightBean Studio 能力与接入引导图

[返回研究](README.md) · [SVG 矢量图](assets/connection-guide.svg) · [PNG 图片](assets/connection-guide.png)

“目标”在本图中指发布与运营的平台账号；“获取方式”指应用凭证的申请和账号授权路径。以自行部署 Studio 为准，不是购买账号或获取他人账号数据的方法。

## 先区分两件事

- **应用凭证**：App ID / Client ID / Client Key 与相应 Secret，用于识别你部署的服务，通常从平台开发者后台获取。
- **账号授权**：账号所有者或有管理资格的用户，允许该服务代为操作自己的频道、主页或账号。拿到应用凭证不等于已经授权账号。

Studio 核心能力是内容编辑、素材管理、团队审核、定时发布、支持平台的互动管理与数据回收。REST/MCP 可供外部 AI 或脚本操作，但不自动获得平台权限。

## 目标与获取方式

| 目标 | 官方入口 | 获取与连接路径 |
| --- | --- | --- |
| Facebook Page | [Meta for Developers](https://developers.facebook.com/) | 创建应用，取得 App ID / Secret；配置权限和回调，再由管理员授权 Page |
| Instagram，经 Facebook | [Meta for Developers](https://developers.facebook.com/) | 使用 Facebook 应用凭证，配置 Instagram 权限；专业账号关联 Page 后授权 |
| Instagram Direct | [Meta for Developers](https://developers.facebook.com/) | 添加 Instagram API 用例，取得其专属 ID / Secret；专业账号直接授权，无需关联 Page |
| Threads | [Meta for Developers](https://developers.facebook.com/) | 添加 Threads 用例，取得专属 ID / Secret，单独设置回调后授权 |
| LinkedIn 个人 | [LinkedIn Developer](https://developer.linkedin.com/) | 创建应用并取 Client ID / Secret；个人基础路径使用登录与分享产品，评论、统计须核对受限权限 |
| LinkedIn 公司 | [LinkedIn Developer](https://developer.linkedin.com/) | 关联公司 Page，申请 Community Management；获批并配置凭证后，由有资格的用户授权 |
| TikTok | [TikTok for Developers](https://developers.tiktok.com/) | 添加 Login Kit 与 Content Posting API，取得 Client Key / Secret；配置权限并授权，公开发布还受审核约束 |
| YouTube | [Google Cloud Console](https://console.cloud.google.com/) | 创建项目、启用 YouTube Data API 及所需统计能力，配置 OAuth Client ID / Secret，再授权自己的频道 |
| Google Business Profile | [Google Cloud Console](https://console.cloud.google.com/) | 为项目申请 Business Profile API 访问并启用所需 API；配置 OAuth，再由商家所有者或管理员授权 |
| Pinterest | [Pinterest Developers](https://developers.pinterest.com/) | 创建应用并取得 App ID / Secret；配置回调与权限后授权账号 |
| Bluesky | [Bluesky](https://bsky.app/) | 设置 → 隐私与安全 → App Passwords；生成应用密码，在 Studio 输入账号标识与应用密码 |
| Mastodon | 自己所在的实例；[应用注册原理](https://docs.joinmastodon.org/methods/apps/) | Studio 输入实例地址，程序自动注册 OAuth 应用，用户跳转登录授权 |
| DEV.to | [Settings → Extensions](https://dev.to/settings/extensions) | 在 DEV Community API Keys 生成个人 API key，在 Studio 连接时填入 |

Bluesky、Mastodon、DEV.to 不需要用户预先手动申请开发者应用。Mastodon 仍然使用 OAuth 应用，只是由 Studio 自动注册。

## 接入顺序和条件

1. 准备自己拥有或可管理的目标账号，并部署 Studio。
2. 对需要应用凭证的平台，申请应用和权限，设置回调；在 `.env` 或管理员后台保存凭证。
3. 在 Studio 连接账号，完成 OAuth 授权，或提供应用密码 / 个人 API key。
4. 先保存草稿，检查内容，再验证发布确认和指标回收。

通用回调格式由固定版本 README 给出；TikTok 使用 `social1` 标识，Instagram Direct 使用 `instagram_login`。以该版本具体配置说明为准，不要随意推断回调地址。

## 本次核对发现的权限边界

- 平台矩阵描述项目声称支持的能力，不能推导为新应用申请后全部可用。LinkedIn 官方 Community Management 文档注明 `r_member_social` 当前不接受新申请，因此引导图对个人评论和统计使用条件标记，避免将基础登录与分享路径描述为完整运营权限。
- TikTok 官方 Direct Post 文档说明，未经审核的客户端发布内容受私人可见限制，公开发布需要相应审核与授权。
- Google Business Profile 官方前置条件包括管理已验证且活跃至少 60 天的商家资料，并拥有相关网站；API 访问需要单独申请，不能只创建 Google Cloud 项目。
- Meta 接入路径主要依据固定版本仓库说明；本次直接读取 Instagram 官方文档遇到限流，未将其描述为已逐项验证的最新控制台操作步骤。

## 来源与验证范围

研究版本：`f812ee4e3c2c7186c7236a49f6eafb491137ac35`；整理日期：2026-09-20。

- [固定版本平台凭证说明](https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/README.md#platform-credentials)
- [固定版本平台注册表](https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/providers/__init__.py)
- [LinkedIn Community Management 官方说明](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview)
- [TikTok Direct Post 官方说明](https://developers.tiktok.com/docs/en/content-posting-api-get-started)
- [YouTube Data API 官方入门](https://developers.google.com/youtube/v3/getting-started)
- [Google Business Profile API 前置条件](https://developers.google.com/my-business/content/prereqs)
- [Mastodon 应用注册官方说明](https://docs.joinmastodon.org/methods/apps/)

未申请应用、未创建密钥、未授权账号、未发布内容。本图为接入路径概览，详细资格与界面以目标平台届时要求为准。

SVG 由 `scripts/build_guide.py` 生成，包含可点击的官方入口；PNG 是同图的 1800 × 2360 像素导出。二者均为本研究制作，不是上游界面截图。构建网页时重建 SVG，并复制已保存的 PNG。
