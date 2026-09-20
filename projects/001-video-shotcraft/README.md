# 001 · Video Shotcraft：Remotion 动效素材合集

基于 Remotion 实现的动效素材合集，附镜头配方与制作流程。与已研究的 TalkCraft、Vibe Motion 能力重叠，价值在补充镜头源码与调参经验，新增能力有限。

[返回项目索引](../../README.md) · 源库：[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) · [官方样片画廊](https://vincentwei1021.github.io/video-shotcraft/)

## 项目信息

| 项目 | 内容 |
| --- | --- |
| 研究编号 | 001 |
| 上游版本 | `5e71af35a2daee492dd3ea93e5e8903f32dcd13c` |
| 研究日期 | 2026-09-20 |
| 上游代码许可 | Apache-2.0，副本见 [LICENSE](public/licenses/video-shotcraft-LICENSE.txt) |
| 展示技术 | React 19.2.7、Remotion / Player 4.0.484、TypeScript、Vite 6.4.1 |
| 本次环境 | Windows、Node.js 22.15.0、npm 10.9.2、Python 3.10 |
| 展示形式 | 本地交互展台；发布文件汇总至 `web/001-video-shotcraft/` |

## 能力展示

页面直接运行上游的 8 个 React / Remotion 动画组件，画面随帧号计算，不依赖远程视频。

- **镜头实验室**：8 个镜头、4 类筛选、名称与用途搜索、暂停、逐帧移动、时间轴拖动、倍速、循环、全屏、关键时刻定位。
- **内容适配**：逐词标题可改主副文案；数字庆祝可改终值与标签。参数在当前页面内存保留，刷新重置。
- **精选串片**：开场、页面发牌、卡片展开、标题、AI 响应、数字成果依次编排成 25.7 秒无声串片（771 帧 / 30fps）。
- **制作流程**：产品理解、素材采集、镜头编排、逐帧合成、声音验收、可编辑交付 6 个交互环节。
- **理解与价值**：与此前 TalkCraft / Vibe Motion 研究的重叠、对我们的实际价值、验证范围及源码出处。

| 镜头 | 展示重点 | 时长 |
| --- | --- | --- |
| 卡片扇形展开 | Spring 错峰入场、扇形旋转、纵深 | 4.20s |
| 真实页面 · 发牌入场 | 页面底板、元素切片、2.5D 相机、加速节奏 | 3.77s |
| 逐词解糊标题 | 位移 / 模糊 / 透明度同进度、文案参数化 | 3.80s |
| 数字冲刺与庆祝 | 数字缓动、回弹、确定性粒子、指标参数化 | 4.60s |
| 环形立体画廊 | CSS 3D、公转、双面内容 | 5.60s |
| 功能翻面 · 成果揭示 | 错峰翻面、过冲回弹、语义转场 | 4.87s |
| AI 响应与证据汇入 | 摘要 → 证据 → 完成态的层级节奏 | 5.00s |
| 环形卡阵 · 标题开场 | 动效嵌套、椭圆公转、标题揭示 | 4.33s |

## 截图与演示

![能力展示页：真实动画播放器、镜头说明和精选镜头库](assets/cover.png)

[观看 / 下载实际渲染的串片](public/media/showcase.mp4) · [六镜头抽帧检查图](assets/reel-contact-sheet.png) · [移动端截图](assets/mobile.png)

启动后访问 [本地展台](http://127.0.0.1:5181/)。该地址仅在本机服务运行时有效；未发布到公网，`project.json` 中的 `demo` 保持为空。

## 本地运行

在本目录执行：

```sh
npm ci
npm run dev
```

启动地址为 `http://127.0.0.1:5181/`。演示图片均随项目携带，不需要远程视频或 API 密钥。

```sh
npm run build        # TypeScript 检查与生产构建
npm run build:web    # 构建并同步到仓库 web/001-video-shotcraft/
npm run preview     # 5182 端口预览生产构建
npm run render      # 可选：CLI 渲染同一串片为 MP4
```

渲染输出 `public/media/showcase.mp4`，960×540 / 30fps（1920×1080 合成画布按 0.5 倍导出）。首次可能下载浏览器。实际验证结果见 [研究笔记](notes/README.md)。展台不包含在线渲染服务。

验证多个子路径：在仓库根目录运行 `python -m http.server 5183 --bind 127.0.0.1 --directory web`，访问 `http://127.0.0.1:5183/001-video-shotcraft/`。`web/index.html` 是研究演示总入口。

## 实现结构

```text
src/App.tsx             播放控制、筛选、参数编辑与研究页
src/shots.tsx           镜头注册、说明、时长、关键时刻
src/Reel.tsx            6 段 Sequence 时间线
src/render.tsx          串片与单镜头的 CLI 渲染入口
src/upstream/demos/     上游代码与共享组件
public/textures/live/   发牌镜头的真实页面演示切片
public/licenses/       上游许可证与来源说明
scripts/copy-web.mjs    同步生产构建到统一静态目录
notes/                 研究与验证记录
```

`Sequence` 为每个镜头提供本地帧号和时长，让基于 `useT()` 的上游动画在串片中仍按各自节奏运行。Player 与 CLI 使用相同组件及时间线。缩略图由同一组件的指定帧生成。

## 研究结论与范围

**核心定位：Remotion 动效素材合集；研究分类：现有视频制作能力的补充素材库，独立研究优先级较低。** 上游另外提供镜头配方、Agent 制作指引、模板和交付工具。我们的结论是针对现有研究积累的增量价值判断，不等同于说上游只有样片。

底层原理是 React 描述画面，组件根据帧号与参数计算位移、旋转、透明度、模糊等属性，Remotion 负责时间线、预览与逐帧渲染。可概括为 `画面 = f（帧号，素材，参数）`。产品理解、素材适配与分镜编排仍由人或外部编码 Agent 完成。

### 以前研究过什么，能力是否重叠

| 项目 / 源库 | 主要侧重点 | 与本库的关系 | 既有研究 |
| --- | --- | --- | --- |
| [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | 产品宣传、真实界面切片、镜头配方 | 本次作为补充素材库收录 | 本项目 |
| [video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) | 口播内容、词级时间戳与画面同步 | 同样使用 Remotion，动效素材与编排方法重叠 | [003 · TalkCraft](https://yydshly.github.io/0914_codex_project/003-video-talkcraft/) |
| [vibe-motion](https://github.com/vibe-motion)（项目组） | 2D / 3D 动画工程与制作指引 | 2D Remotion 部分重叠，另有 Three.js 等路线 | [004 · Vibe Motion](https://yydshly.github.io/0914_codex_project/004-vibe-motion/) |

文字、卡片、数字、转场、参数化和逐帧渲染是共同能力；表中列的是侧重点，不是独有能力。比较依据是此前研究记录与本次固定版本源码，没有做同一制作任务的横向效率或质量测评。

### 对我们的价值

- **值得保留**：质量较好的镜头源码、真实页面切片与运镜方法，以及调好的时长、缓动、错峰参数和失败经验。遇到具体制作需求时按需复用。
- **新增价值有限**：已有类似项目的研究后，再增加一个效果画廊并没有显著扩展能力。现阶段无需围绕它另建完整制作平台。
- **下一次有效验证**：用自己的产品做一支 20–30 秒短片，记录素材替换、调参、渲染和修改耗时，再判断是否值得进入常用制作流程。尚未完成这项验证。

本次仅展示精选镜头、内容编辑和无声串片。未运行完整 Ink Press 模板、实际产品采集、配乐卡点、Motion Workbench 或剪映导出。AI 响应是预编排动画，并未调用模型；演示指标不是业务测量结果。

## 来源与修改

动画、共享组件、截图与背景图来自固定提交，保留原路径和注释。仅对 `BlurSlide.tsx` 与 `CounterConfetti.tsx` 增加内容 props；前者增加长标题适配和词数较多时的错峰上限，后者限制数字范围。改动有 `Local adaptation` 注释。

展台、中文能力解读、串片编排、构建脚本为本研究新增。Apache-2.0 不替代 Remotion 等依赖的独立许可。明细见 [第三方说明](public/licenses/THIRD-PARTY.md)。
