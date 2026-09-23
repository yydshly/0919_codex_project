# VideoCaptioner 研究页发布记录

- 日期：2026-09-23
- 仓库提交：[5595aed](https://github.com/yydshly/0919_codex_project/commit/5595aedef3906d43f1572788a5e3ac126569ab11)
- 发布任务：[Deploy research demos](https://github.com/yydshly/0919_codex_project/actions/runs/35820162768)，结果成功
- 在线网页：[VideoCaptioner 研究页](https://yydshly.github.io/0919_codex_project/008-videocaptioner/)
- 完整引导图：[PNG](https://yydshly.github.io/0919_codex_project/008-videocaptioner/capability-map.png) · [SVG](https://yydshly.github.io/0919_codex_project/008-videocaptioner/capability-map.svg)

本次提交基于最新远端主分支，在独立检出中只加入 008 子项目、研究总入口和 Pages 构建步骤，避免带入工作区中其他子项目的未提交改动。索引检查、静态构建、JavaScript 语法检查与提交差异检查通过。

线上验证：研究页、完整引导图、真实硬字幕样片和研究文档均可访问；图像为 2600 × 5610 像素；浏览器加载 10 条字幕，未记录脚本错误。总入口使用完整图并展示能力、原理和依赖摘要。MP4 的 100 字节分段请求返回 206，允许浏览器跳转播放。

页面为静态研究展示；识别、翻译与配音服务尚未进行真实质量测试。
