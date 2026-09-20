# BrightBean Studio 实现原理

[返回项目总览](research.md) · [研究范围](notes.md)

本文基于固定提交 `f812ee4e3c2c7186c7236a49f6eafb491137ac35` 的源码阅读。流程图是便于理解的概括，不代表本次已做运行时验证。

## 1. 整体结构

```text
浏览器界面                         外部程序 / AI 助手
Django 模板 + HTMX + Alpine.js      REST API / MCP
             │                         │
             └──────────┬──────────────┘
                        ↓
             Django 业务模块与权限校验
                        ↓
           数据库：账号、内容、状态、任务、指标
                        ↑
              持续运行的后台 worker
          发布 / 结果确认 / 素材处理 / 数据同步
                        ↓
             providers：各平台 API 适配
                        ↓
                  社交平台官方 API

素材文件存放于本地持久化目录或 S3 兼容存储。
```

这是模块化的 Django 应用，Web 和 worker 使用同一套业务代码与数据库。前端通过服务端模板渲染页面，HTMX 更新局部内容，Alpine.js 处理页面交互。后台使用 `django-background-tasks`，不要求 Redis；生产默认数据库为 PostgreSQL，本地说明也提供 SQLite 方案。

依据：[依赖][requirements]、[Compose 服务定义][compose]、[基础设置][settings]。

## 2. 数据模型：一份内容，各账号分别发布

系统为每个选中的社交账号建立独立发布记录，并通过父级内容复用文案与素材。

```text
Post：共用的标题、文案等内容
 ├─ PlatformPost：YouTube 账号 A，独立覆盖字段、时间和状态
 ├─ PlatformPost：TikTok 账号 B，独立覆盖字段、时间和状态
 └─ PlatformPost：Instagram 账号 C，独立覆盖字段、时间和状态

PostMedia → MediaAsset：关联素材，并记录平台媒体差异
```

`PlatformPost` 关联一个具体账号，拥有独立的编辑和发布状态。没有覆盖字段时可以沿用父级内容，设置后则按目标账号定制。父级 `Post` 的整体状态由子记录推导，因此可以表达“部分平台已发布”。父级排期字段也会与子记录时间同步。

例如，同一视频在 YouTube 已发布，在 TikTok 仍然处理，在 Instagram 因权限失败。三个目标可以保留各自状态，无需被合并成一个成功或失败结果。

依据：[Post / PlatformPost / PostMedia][models]、[创建与状态同步服务][services]。

## 3. 平台适配：统一操作，不同实现

`SocialProvider` 定义平台名称、授权类型、字数上限、支持媒体类型、所需权限等元信息，以及授权、令牌刷新、发布、统计等方法。`PROVIDER_REGISTRY` 将平台标识映射到具体实现。

上层按统一结构准备发布内容，再由 YouTube、Instagram 等模块转换为各自的上传、创建和确认请求。平台返回结果也整理成系统可以理解的数据结构。

接入新平台通常需要实现 provider、注册平台、配置凭证和授权、补充内容约束与测试。新增国内平台不能仅靠增加下拉选项，仍取决于可用官方 API、账号资格和权限。

账号授权凭证由系统保存。当前加密字段使用 AES-256-GCM，密钥通过 HKDF 从应用密钥和盐派生。这是静态存储保护，部署者仍需妥善管理密钥。

依据：[适配基类][provider]、[注册表][registry]、[统一类型][types]、[加密字段][encryption]。

## 4. 发布引擎：扫描、认领、执行、确认

固定版本注册两项周期任务：`run_publish_cycle` 每 15 秒运行，`confirm_pending_publishes` 每 60 秒运行。任务由 worker 执行，不是浏览器计时器；浏览器关闭后任务仍可运行，但服务器和 worker 必须保持工作。这些周期也不是对实际上线延迟的保证。

一次发布的大致路径：

1. 查找状态为 `scheduled` 且已到发布时间的 `PlatformPost`，排除未到重试时间或受暂停约束的内容。
2. 在事务内锁定该帖的相关平台记录，重新检查状态，将本次要执行的记录改为 `publishing`。
3. 提交状态变更后调用外部接口，避免网络操作期间一直持有该事务锁。
4. 使用有上限的线程池分发到平台；同一帖的不同目标可共享媒体下载缓存。
5. 写入平台帖子标识、发布时间或错误。对于先接收再异步处理的发布，保留中间状态，等待确认任务。

发布主线可概括为：

```text
草稿 → 按规则审核 → 已排期 → 发布中 → 已发布 / 失败
```

这不是完整状态机。实际还有退回修改、拒绝、客户暂停等状态，不同审核模式允许的路径也不同。当前实现中，一个平台子记录的客户暂停还会阻止同一帖其他目标进入发布路径。

对可重试错误，系统安排退避重试，并考虑平台限流恢复时间。对无法确认是否已发布的情况，会先查询确认，不会一律重发。数据库锁和幂等控制可以降低重复风险，但不能把任意外部 API 调用变成绝对的“只发布一次”。多平台发布也不具备一起成功或一起回滚的事务保证。

依据：[任务周期][tasks]、[任务注册][registration]、[发布引擎][engine]。

## 5. 素材、互动和指标如何回流

| 数据链路 | 实现方式 | 作用 |
| --- | --- | --- |
| 素材上传 | 校验类型、大小和配额，创建素材记录，保存文件 | 界面与自动化接口引用同一素材 |
| 素材处理 | 后台提取宽高、时长和缩略图；提供图片编辑、视频裁剪任务 | 支持预览和后续适配 |
| 发布素材 | 按 provider 要求提供可访问 URL 或读取本地文件上传 | 兼容平台主动抓取和客户端上传 |
| 收件箱 | 后台同步平台消息，关联账号和帖子，保存线程及处理状态 | 集中展示互动并分派回复 |
| 数据统计 | 通过 provider 获取指标，写入账号及帖子的日期快照，处理失败、配额与不同同步频率 | 支持历史趋势与跨账号查看 |

统计展示受平台实际返回数据约束。源码处理了累计值和日期范围等差异，但不能推导出所有平台都有完全一致的曝光、播放或粉丝指标。

依据：[素材任务][media]、[素材 API][mediaapi]、[收件箱同步][inbox]、[指标同步][analytics]。

## 6. REST / MCP：让 AI 操作现有业务

REST 接口位于 `/api/v1/`，MCP 入口为 `/api/v1/mcp`。MCP 工具处理函数复用 REST 使用的业务服务，避免另做一套可绕过业务约束的发布通道。

| 工具类别 | 代表操作 |
| --- | --- |
| 账号和帖子 | `list_accounts`、`create_draft`、`get_post`、`list_posts` |
| 排期 | `schedule_post`、`schedule_draft`、`cancel_post` |
| 素材 | `search_media`、`get_media`、`upload_media` |
| 大文件传输 | `request_media_upload`、`finalize_media_upload`；流程与存储配置相关 |
| 统计 | `get_account_analytics`、`get_post_analytics` |
| 互动 | `list_inbox_messages`、`create_reply_draft`、`send_reply` 等 |

小文件 MCP 上传有原始大小上限，不能将所有视频编码后直接传给这个工具。固定版本源码另有上传请求与完成确认工具，REST 也提供文件上传入口；真实接入需选择适合当前存储配置的方式。

认证支持 API key，另有用于 MCP 连接的 OAuth 服务。API key 按工作区和账号范围限制操作；有效权限取“密钥被授予的权限”与“签发者当前权限”的交集。写操作还会经过配额、限流、幂等和审计等检查。要求审核的工作区会阻止通过创建服务直接排期，应先创建草稿并进入审核流程。

因此，AI 提出操作意图，Studio 执行业务约束。自然语言理解和内容生成可以由外部模型承担，MCP 本身不提供这些智能。

依据：[MCP handlers 与工具定义][mcp]、[API 认证][auth]、[API 中间件][middleware]、[创建服务与审核约束][services]。

## 7. 值得借鉴的设计

- 用共用内容减少重复编辑，用每个目标账号的独立记录表达差异和部分失败。
- 用 provider 屏蔽外部 API 差异，让上层流程保持一致。
- 把“请求已接收”和“内容已上线”分开处理。
- 在共享业务服务中执行权限与审核约束，让界面、脚本和 AI 遵守同一规则。
- 将 AI 生成、人工审核、后台执行和数据反馈拆成可检查的步骤。

这些是源码结构带来的工程启发，不等于本研究已证明其性能、稳定性或真实账号兼容性。

[requirements]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/requirements.txt
[compose]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/docker-compose.yml
[settings]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/config/settings/base.py
[models]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/composer/models.py
[services]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/composer/services.py
[provider]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/providers/base.py
[registry]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/providers/__init__.py
[types]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/providers/types.py
[encryption]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/common/encryption.py
[tasks]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/publisher/tasks.py
[registration]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/publisher/apps.py
[engine]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/publisher/engine.py
[media]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/media_library/tasks.py
[mediaapi]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/api/routers/media.py
[inbox]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/inbox/tasks.py
[analytics]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/analytics/tasks.py
[mcp]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/mcp/handlers.py
[auth]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/api/auth.py
[middleware]: https://github.com/brightbeanxyz/brightbean-studio/blob/f812ee4e3c2c7186c7236a49f6eafb491137ac35/apps/api/middleware.py
