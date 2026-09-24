# E2 真实照片参考审查

审查日期：2026-09-22。逐张查看已有四张照片，未重新访问外部来源；来源、作者及许可沿用 `../data/baseline-photos.json`。四张照片按原字节复制至 `references/`，原网页与归档未改动。完整元数据、检查项及 SHA-256 见 [references.json](data/references.json)。

这些是历史实拍参考。它们可以约束照片中可见的形态，不能证明当前景区状态、入口位置、道路或全园区实际平面。后续模型生成素材属于插画，必须与原实拍区分。

| 地点 | 从照片直接可辨的特征 | 生成时的关键检查 | 证据边界 |
| --- | --- | --- | --- |
| 钟楼 | 较紧凑的楼身；三层外伸檐线；顶端中央宝顶；高砖台与侧面拱洞 | 保留三檐和中央宝顶，与鼓楼长屋脊区分 | 夜景透视，不能精确还原平面、背面、白天颜色或入口 |
| 鼓楼 | 横向舒展楼体；长屋脊和近端三角山墙；三层主要檐线；台沿一排鼓 | 长向轮廓与鼓的符号清晰，不画成钟楼的中央尖顶；不伪造可读牌匾 | 不能确认精确长宽比、鼓的全量、背面或通行路线 |
| 大雁塔 | 七层逐层收分的土褐色砖塔；拱窗；顶部小型尖顶 | 七层与砖塔结构明确，不替换为木构绿瓦塔 | 树木遮住部分底部，不能确认完整基座、寺院平面或入口 |
| 兵马俑 | 坑内陶俑列阵；平行土质隔梁；上方展厅屋架 | 使用“内部主题符号”，保留军阵与隔梁，不捏造外立面 | 仅一号坑局部内景，不是建筑外轮廓、全坑测绘或园区鸟瞰 |

## 对本次实验的约束

1. 参考照片约束“画的是什么”。E1 坐标约束“这个地点的锚点在哪里”。两类证据不能互相替代。
2. 建筑素材可以为可读性放大，但不得声称画面里的尺寸、阴影方向、屋顶朝向或面板位置就是实际地理关系。
3. 兵马俑只适合本轮的内部主题符号。若产品需要真实建筑外观或全园区图，应补充对应照片或有来源的平面数据后另行验证。
4. 模型输出需要逐项对照这些检查项。代码的坐标审计通过，不等于外形审查通过；本报告本身不宣称任何生成候选已合格。
5. 页面展示原图及生成候选时，应保留照片作者、来源、许可链接，并说明生成改动。生成候选应显式写明“参考照片生成的插画，非实拍”。

## 参考来源与许可

- 钟楼：Matthew D. Jalovick / Wikimedia Commons，[原照片](https://commons.wikimedia.org/wiki/File:Bell_Tower_of_Xi%27an.jpg)，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)。原说明：西安钟楼夜景实拍 · 2013年。
- 鼓楼：xiquinhosilva / Wikimedia Commons，[原照片](https://commons.wikimedia.org/wiki/File:Drum_Tower_of_Xi%27an.jpg)，[CC BY 2.0](https://creativecommons.org/licenses/by/2.0)。原说明：西安鼓楼实拍 · 2024年。
- 大雁塔：Alex Kwok / Wikimedia Commons，[原照片](https://commons.wikimedia.org/wiki/File:Giant_Wild_Goose_Pagoda.jpg)，[CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/)。原说明：大雁塔与周边园林实拍 · 历史照片。
- 兵马俑：BrokenSphere / Wikimedia Commons，[原照片](https://commons.wikimedia.org/wiki/File:Terracotta_Army_Pit_1.JPG)，[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0)。原说明：兵马俑一号坑实拍 · 历史照片。

原图均为既有 Wikimedia 缩略图；本轮只复制文件，没有改动图像内容。来源页面的实时可用性与许可变化未在本轮复核。
