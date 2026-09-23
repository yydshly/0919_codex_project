# VideoCaptioner 研究与验证记录

## 能力全景图（2026-09-22）

新增 `assets/capability-map.png`（2600×3220）与可编辑 SVG，归纳输入、识别/断句/校正/翻译、字幕/视频/配音三类输出、模型接入矩阵、工程实现与使用边界。已加入研究网页首屏，提供高清与矢量图下载；生成脚本为 `scripts/build_capability_map.py`。

补充核对：`core/asr/asr_data.py` 支持读取 SRT/VTT/ASS/JSON，写出 SRT/TXT/JSON/ASS；`core/llm/client.py` 接受可配置的 API base 与 Key；`core/speech/providers.py` 的配音主流程提供 edge / siliconflow / gemini；`core/dubbing/presets.py` 与 `subtitle_parser.py` 确认音色预设和说话人标签；SiliconFlow 的参考音频及文本通过服务接口上传用于克隆。

自建 LLM 的接入是基于可配置 OpenAI 兼容接口的能力推断，图中有星号注明需自行验证；未宣称内置本地 LLM 或本地 TTS。图示静态布局与文字范围已检查，并检查网页可加载高清图。

## 实际合成

- 固定版本：`95842ecb5618c0b6a548a336bdfb0eb859bdb501`。
- 输入画面：本项目自行绘制的 Python 教学信息板；FFmpeg 生成 38 秒、1280×720、24fps 的无声视频。
- 字幕：上游 `tests/fixtures/subtitle/sample_en.srt` 与 `sample_en_processed.srt`，10 条字幕。后者文件顺序为中文第一行、英文第二行。
- 执行：在隔离的 `.local/videocaptioner-research` 目录放置上游源码与所需依赖，经 PYTHONPATH 调用。没有修改系统 Python 依赖，也没有配置付费 API。

```sh
python -m videocaptioner.cli synthesize projects/008-videocaptioner/site/media/input.mp4 \
  -s projects/008-videocaptioner/site/media/bilingual.srt \
  --subtitle-mode hard --layout source-above --quality high \
  --font-file C:/Windows/Fonts/msyh.ttc \
  -o projects/008-videocaptioner/site/media/captioned.mp4
```

这里使用 source-above 是因为输入文件的第一行就是中文；布局参数处理的是文件中两行的顺序，不能仅凭 target 推断目标语言。初次尝试 target-above 时英文在上，通过抽帧发现并调整。

输出经 ffprobe 确认为 38 秒 H.264 / 1280×720 视频，没有音轨。已抽帧检查中英文字形与字幕位置。上游读取 TTC 字体度量时产生 font-number 警告，但合成命令成功；以实际画面检查为准。成片及截图是本次产物，译文不是本次模型输出。

## 展示材料来源

| 本项目文件 | 来源 |
| --- | --- |
| `site/media/source.srt` | 上游 `tests/fixtures/subtitle/sample_en.srt` |
| `site/media/bilingual.srt` | 上游 `tests/fixtures/subtitle/sample_en_processed.srt` |
| `site/media/upstream-main.png` | 上游 `docs/public/main.png` |
| `site/media/upstream-subtitle.png` | 上游 `docs/public/subtitle.png` |
| `site/media/upstream-style.png` | 上游 `docs/public/style.png` |
| `site/media/upstream-LICENSE.txt` | 上游 LICENSE 原文 |
| `site/media/poster.png`、`input.mp4` | 本研究原创信息板及视频 |
| `site/media/captioned.mp4` | 上游合成命令的实际输出 |

所有上游来源均固定至上述提交，作者与仓库：WEIFENG2333 / VideoCaptioner。原文字幕与已优化文件在所用英文样例中相同，因此本页没有伪造“优化前后质量提升”。

## 网页验证

验证项目包括：脚本语法、静态资源可达、视频元数据与 HTTP Range、播放/暂停、字幕点击跳转、布局切换、样式切换、实际成片模式、流程选项卡与键盘切换、上游图片切换、手机宽度布局。检查截图保存在 assets 目录。

使用 Python 标准静态服务首次检查时，发现 MP4 的可跳转时间范围为 0；因此增加支持 HTTP Range 的本地预览服务。生产静态托管也需要支持媒体分段请求。

验证结果：页面及资源 HTTP 200，媒体 Range 请求返回 206 且长度正确；26 个页面本地链接全部存在；JavaScript 语法检查通过。浏览器确认点击第二条字幕跳转至 3 秒、仅中文模式隐藏英文、样式切换生效、成片模式禁用预览选项；播放暂停、流程选项卡键盘切换和截图切换正常。390×844 手机视口未出现横向溢出，桌面浏览器未记录脚本错误。

全库同步与检查当时被并行创建的其他项目缺少 project.json 阻断。因此使用现有 scripts/project.py 的索引渲染函数，仅更新 008 的索引行与封面，不改其他项目。008 的元信息、静态资源及网页独立检查通过；全库检查需待其他项目完成后重跑。本次没有执行 Git 提交、推送或公网部署。

## 尚未验证

当前已发布的网页与验证结果见[发布记录](publication.md)。下方“本次没有执行 Git 提交、推送或公网部署”是 2026-09-22 原始本地研究阶段的记录。

### 综合全景图扩充

能力图扩充为九部分、2600 × 5610 像素的 PNG 与同尺寸 SVG，覆盖输入、原理、输出、模型接入、底层依赖、直观效果、时间戳边界、运行条件和使用价值。依赖名称核对固定版本 pyproject.toml；DeepLX 适配、WAV / MP3 与逐句配音报告再次核对相关源码。

生成时检查卡片文字高度及画布范围；检查完整图与依赖区域细节，调整行尾标点。PNG 尺寸与 SVG XML 已验证，最终生成 324 行文字。网页已同步尺寸与说明，浏览器确认加载新版 2600 × 5610 图片且无横向溢出。未新增模型效果实测。

### 后续理解接入网页（2026-09-22）

新增首页三种核心转换、六类需求效果、时间戳能力与限制、在线 / 混合 / 离线条件、按功能配置的依赖清单和官方内存参考；README 同步记录。继续沿用固定源码版本，未新增模型调用或质量实测。

本轮浏览器检查：新增快捷入口与侧栏跳转可用，两个折叠说明可展开；全部页内锚点有效。1366 像素桌面与 390 像素窄屏检查未发现页面横向溢出，新增卡片文字无溢出，图片正常加载，未记录脚本错误。已重新构建静态网页并刷新本地预览。

没有调用识别或大模型服务，没有生成语音，因此不报告识别准确率、翻译提升比例、配音自然度或 API 成本。没有安装和运行完整桌面 GUI；网页中的桌面截图来自上游文档。没有验证与 Y2A-Auto / Blinko 的集成。
