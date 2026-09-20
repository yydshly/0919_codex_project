# GitHub 项目研究集

持续收录值得研究的 GitHub 开源项目，记录它们解决的问题、关键设计、复现过程与实践成果。每个项目独立整理，按固定编号顺序索引，方便查阅和持续更新。

> 收录不等于推荐；研究结论以各项目记录的版本、环境和验证结果为准。

## 项目索引

编号按收录顺序递增，分配后保持不变。点击项目名称查看研究详情，点击源库名称查看原始仓库。

<!-- PROJECT_INDEX:START -->
| 编号 | 项目 | 摘要 | 状态 | 标签 | 源库 | 演示 |
| --- | --- | --- | --- | --- | --- | --- |
| 001 | [Video Shotcraft · Remotion 动效素材合集](projects/001-video-shotcraft/README.md) | 基于 Remotion 实现的动效素材合集，附镜头配方与制作流程；与已研究的 TalkCraft、Vibe Motion 能力重叠，价值在补充镜头源码与调参经验，新增能力有限。 | 已复现 | Remotion、素材复用、动效、交互展示 | [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | [演示](https://yydshly.github.io/0919_codex_project/001-video-shotcraft/) |
| 002 | [BrightBean Studio · 多平台内容发布与运营后台](projects/002-brightbean-studio/README.md) | 可自建的内容编辑、审核、定时发布、互动与统计后台，提供 REST/MCP；支持 Facebook、Instagram、Threads、LinkedIn、TikTok、YouTube、Pinterest、Bluesky、Mastodon、DEV\.to 和 Google 商家资料（11 平台、13 种接入）。多数通过开发者应用凭证加账号授权接入；Bluesky 用应用密码，DEV\.to 用个人 API key，Mastodon 由程序自动注册 OAuth 应用。 | 已完成 | 社交媒体、定时发布、Django、MCP、源码研究 | [brightbean-studio](https://github.com/brightbeanxyz/brightbean-studio) | [演示](https://yydshly.github.io/0919_codex_project/002-brightbean-studio/) |
<!-- PROJECT_INDEX:END -->

## 项目图览

每个子项目可以提供一张封面截图及简短描述，详细截图、操作步骤和结论收录在子项目 README 中。

<!-- PROJECT_GALLERY:START -->
### 001 · [Video Shotcraft · Remotion 动效素材合集](projects/001-video-shotcraft/README.md)

基于 Remotion 实现的动效素材合集，附镜头配方与制作流程；与已研究的 TalkCraft、Vibe Motion 能力重叠，价值在补充镜头源码与调参经验，新增能力有限。

[![Video Shotcraft · Remotion 动效素材合集 项目截图](projects/001-video-shotcraft/assets/cover.png)](projects/001-video-shotcraft/README.md)

### 002 · [BrightBean Studio · 多平台内容发布与运营后台](projects/002-brightbean-studio/README.md)

可自建的内容编辑、审核、定时发布、互动与统计后台，提供 REST/MCP；支持 Facebook、Instagram、Threads、LinkedIn、TikTok、YouTube、Pinterest、Bluesky、Mastodon、DEV\.to 和 Google 商家资料（11 平台、13 种接入）。多数通过开发者应用凭证加账号授权接入；Bluesky 用应用密码，DEV\.to 用个人 API key，Mastodon 由程序自动注册 OAuth 应用。

[![BrightBean Studio · 多平台内容发布与运营后台 项目截图](projects/002-brightbean-studio/assets/cover.png)](projects/002-brightbean-studio/README.md)
<!-- PROJECT_GALLERY:END -->

## 仓库结构

```text
projects/                    按编号组织的研究子项目
  001-project-slug/          首个项目的目录格式（示意）
    project.json            索引元信息
    README.md               项目介绍、截图、运行方式、研究结论
    notes/                  研究记录与实验笔记
    assets/                 截图、封面和演示 GIF
templates/project/          新项目模板
scripts/project.py          新增项目、同步首页与校验索引
docs/                       收录规范与后续部署约定
web/                        已构建的静态演示与总入口
```

## 新增研究项目

需要 Python 3.10 或更高版本，无第三方依赖。在仓库根目录运行：

```sh
python scripts/project.py add example-project --name "项目名称" --source "https://github.com/owner/repo" --summary "用一句话说明项目用途与研究重点"
```

工具会分配下一个编号、复制研究模板并更新首页索引。随后填写子项目 README，把截图放入 `assets/`，在 `project.json` 的 `cover` 中填写相对路径（例如 `assets/cover.png`）。

```sh
python scripts/project.py sync   # 修改元信息或图片后更新首页
python scripts/project.py check  # 检查编号、路径及首页是否同步
```

## 维护说明

- [项目收录与编号规范](docs/project-guide.md)
- [多个 Web 演示的部署约定](docs/deployment.md)
- [子项目 README 模板](templates/project/README.md)

上游项目的作者、链接、版本与许可证在各子项目中单独记录。转载代码与资源时保留上游许可证和署名。
