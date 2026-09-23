# Pireel 中文能力全景图

用户请求将本轮对话形成的理解汇总为一张图。交付为同一内容的高清 PNG 和 SVG；PNG 为 3240×5280，SVG 为 2160×3520 逻辑画布。图中两张画面来自本地 before.mp4 与原版导出 after.mp4 的真实帧。

内容覆盖：

1. 视频、图片、音频、文字字幕及图表数据如何转换为对应效果。
2. 人或接入的 AI 决策，Pireel 保存并执行编辑工程，输出可修改工程和视频文件。
3. Pireel 时间映射 → HTML/CSS＋GSAP → Canvas／浏览器绘图 → Mediabunny＋WebCodecs → 文件。
4. Blinko 45 秒原片裁掉开头 9 秒与结尾 8 秒，叠加 4 段动态文字后，实际导出 28 秒有声 MP4。
5. 两项价值：作为工具配合 AI；作为开发参考理解编辑器实现。
6. 产品教程、口播精剪、动态图文及多版本内容等应用判断。

事实边界：

- 不把 Pireel 称为视频生成大模型，也不声称模型逐帧生成本次成片。
- 此路径未使用 Remotion；FFmpeg 用于制作本例输入素材。
- WebCodecs 的具体底层实现由浏览器和设备决定，未检查本机导出使用的具体编码器实现。
- 本地 AI 自动编排、转写和音色服务尚未接入；没有对复杂工程稳定性作出承诺。
- 上游图形组件在另写实验室中运行；原版 28 秒导出与实验室 12 秒静音样片明确分开。

主要依据（2026-09-22）：

- [Pireel 上游固定版本](https://github.com/pireel/pireel/tree/b824ee23ff1667c45232930366cf1ef5c85318c4)
- `packages/studio-engine/README.md`、`src/trim.ts`、`src/composition*`：工程模型、时间映射与工具执行。
- `packages/studio-ui/src/client-export.ts`、`sample-composition.ts`、`export-audio-mix.ts`：渲染、GSAP、Canvas 和音频处理。
- `apps/studio-oss/src/providers.ts`、`packages/studio-ui/src/avatar-panel.tsx`：本地服务边界。
- [Mediabunny 介绍](https://mediabunny.dev/guide/introduction)
- [WebCodecs 官方介绍](https://developer.chrome.com/docs/web-platform/best-practices/webcodecs)
- [本次原版编辑实测记录](real-scenario.md)

生成脚本为 `scripts/build-overview.py`；文本宽度以实际字体度量检查，并人工检查全图排版。
