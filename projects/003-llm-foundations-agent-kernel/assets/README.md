# 项目图片

`cover.png` 是本项目实际网页在桌面浏览器中的首屏截图，用于研究文档和总入口。图片不含上游产品截图或真实模拟数据。

`capability-overview.svg` 与 `capability-overview.png` 为本项目独立绘制的完整能力总览（2000 × 2670），内容相同；SVG 支持无损缩放，PNG 方便保存分享。未使用上游截图或媒体。

重建 SVG：`python projects/003-llm-foundations-agent-kernel/scripts/build_overview.py`。同时生成 PNG：追加 `--png`，需要 Pillow 和 Windows 微软雅黑字体；发布构建仅生成 SVG 并复制已提交的 PNG，无新增依赖。
