# 长安初见：实拍照片与授权来源

核验日期：2026-09-22。11张真实照片，共约2 MB；全部来自 Wikimedia Commons 的公开授权文件。

## 展示边界

- 7张是所述景点的真实照片；4张是菜品类型参考图，不代表所列餐厅门店环境或门店出品。所有餐厅配图均设为 dish-photo，并在图注中写明“菜品参考，非门店出品”。
- 葫芦鸡照片实际摄于北京长安记；葫芦头照片实际摄于西安天发芽。这里只用于说明菜品形态，不能把来源餐厅改称西安饭庄或春发生。
- 照片是历史记录，不代表当前客流、天气、节庆装置、营业或菜品供应。大唐不夜城图是2020年的灯光装置照片。
- 碑林、兴庆宫没有在本批次加入照片；前端应保留明确的无图状态，不以其它地点替代。

## 文件处理与视觉核验

所有文件直接复制 Wikimedia 缩略图服务返回的 JPEG。申请最大宽、高均960像素；未使用程序重绘、裁切、调色或生成式编辑。网页若按卡片比例使用 object-fit 裁切，须保留来源与许可链接，并说明展示裁切。已实际逐张查看11张照片：确认兵马俑坑内军阵、永宁门门牌、陕历博馆体、大雁塔、唐夜城灯光、钟鼓楼，以及泡馍、水饺、葫芦鸡、葫芦头实物。

兵马俑原始发布文件已由原作者裁切；本项目未进一步修改图片内容。

## 逐项归属

| 地点ID | 图片说明 | 作者与来源 | 采用许可 |
| --- | --- | --- | --- |
| terracotta | 兵马俑一号坑实拍 · 历史照片 | [BrokenSphere / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Terracotta_Army_Pit_1.JPG) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| wall | 永宁门实拍 · 2025年 | [YikyuenG / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yongningmen,_Xi%27an_City_Wall,_Xi%27an.jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| shaanxi-museum | 陕历博本馆实拍 · 2015年 | [jesse / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Shaanxi_History_Museum_2.JPG) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| pagoda | 大雁塔与周边园林实拍 · 历史照片 | [Alex Kwok / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Giant_Wild_Goose_Pagoda.jpg) | [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/) |
| tang-night | 大唐不夜城灯光装置实拍 · 2020年历史景观 | [Liuxingy / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:%E9%9B%81%E5%A1%94_%E5%A4%A7%E5%94%90%E4%B8%8D%E5%A4%9C%E5%9F%8E%E5%92%8C%E5%A4%A7%E9%9B%81%E5%A1%94.jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| bell-tower | 西安钟楼夜景实拍 · 2013年 | [Matthew D. Jalovick / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bell_Tower_of_Xi%27an.jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| drum-tower | 西安鼓楼实拍 · 2024年 | [xiquinhosilva / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Drum_Tower_of_Xi%27an.jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| tongshengxiang | 羊肉泡馍实拍 · 菜品参考，非门店出品 | [Danielinblue / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Yangrou_Paomo.JPG) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| defachang | 水饺实拍 · 菜品参考，非门店出品 | [Bioniclepluslotr / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:BoiledDumplings.jpg) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| xian-fanzhuang | 葫芦鸡实拍 · 菜品参考，非门店出品 | [N509FZ / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Huluji_at_CHANG_AN_G,_Beijing_Xibeiwang_MIXC_One_(20240601111947).jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| chunfasheng | 葫芦头实拍 · 菜品参考，非门店出品 | [Acstar / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hulutou.jpeg) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |

## 网页署名要求

每张图片至少在详情中展示作者 credit、原始来源 sourceUrl、许可名称 license 与许可链接 licenseUrl。保留图注中的真实范围说明；不暗示摄影者或来源平台认可本产品。各照片保留自身许可，CC BY-SA 图片的改作应遵循相同许可要求；产品代码与其它素材的许可不因汇编展示而自动改变。

photos.json额外保存 downloadUrl、bytes、changes 以便追溯与检查；页面只需读取 src、alt、caption、credit、sourceUrl、license、licenseUrl、kind、position。
