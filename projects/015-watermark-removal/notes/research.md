# 源码阅读记录

上游提交：902dc1a268d29d50d291ac2a30150abb9574311a。

## 代码路径

- main.py：读取 inpaint.yml；Pillow 读图；preprocess_image；构建 TensorFlow Session；逐变量加载 checkpoint；推理和保存。
- preprocess_image.py：判断横竖图；读取 utils/{watermark_type}/{image_type}/mask.png；RGB 转换；宽高比在遮罩 0.95–1.05 倍范围内才缩放遮罩；主入口裁到 8 的倍数；图像和遮罩沿宽轴拼接传入模型。
- inpaint_model.py / build_server_graph：分离图片与遮罩；取遮罩首通道，阈值 >127.5 转二值；图片归一化；遮罩内输入置零；调用两阶段网络；合成遮罩内预测和遮罩外原图。
- build_inpaint_net：粗修网络含门控卷积、下采样、膨胀率 2/4/8/16 的空洞卷积、上采样。精修有结构分支与 contextual_attention 分支，特征拼接后解码。
- inpaint_ops.py / gen_conv：卷积结果分半，ELU（或指定激活）的内容分支乘以 sigmoid 门控分支；输出层不走门控。
- contextual_attention：提取参考特征块、归一化匹配、遮挡参考筛除、softmax 权重、基于加权参考块重建特征。网页示例权重并非计算此算子所得。
- build_graph_with_losses：矩形与笔刷遮罩并集；两阶段 L1；谱归一化 patch 判别器和 hinge GAN loss；训练代码存在，但项目没有完整训练脚本。
- batch_test.py：清单每行提供 image、mask、out，固定目标尺寸逐张推理。
- guided_batch_test.py：保留边缘引导脚本，但 build_server_graph 调用与当前签名不一致，不作为本页已验证能力。

## 避免误导

- 不把 README 的“与原图无法区分”当作普遍保证。
- 不把命令行 watermark_type 参数当作多平台检测器。
- 不展示虚构模型成功率、耗时、原图恢复率或训练数据来源。
- 教学输出特意改变局部山体轮廓，说明补画可能看起来合理但与原场景不同。
- 本页不复制上游模型或实现算法，不调用远程 AI 服务。

## 2026-09-22 · 增加真实样例

用户要求真实效果展示。watermark-removal 仓库未附带成套原图与输出，因此采用其所引用底层方法的原作者公开样例，并在页面显著区分来源，不冒充封装库本地实测。

- 下载 generative_inpainting 主分支归档，ZIP 注释记录提交 3a5324373ba52c68c79587ca183bc10b9e57b783。
- 官方 README 将 raw / input / output 三列描述为原图、自由形状遮罩输入与模型结果。
- 逐张查看 case1–case4 的输入、原图和输出，确认内容与可见瑕疵。
- case1 包含原图黑色文字和栏杆，case2–4 为人物移除；未将四组统称为水印移除实测。
- 原始 PNG 字节保持不变，复制到 site/samples，提供文件哈希、来源链接、CC BY-NC 4.0 许可与署名。
- 只读取官方发布文件；未运行下载包中的程序、下载模型权重或执行模型推理。

## 2026-09-22 · 理解汇总与知识海报

将讨论整理为概念基础、训练/推理、传统算法比较、本地部署、扩展与价值判断。原有样例和原理交互保留；新增高清总览图及可重新导出的 HTML 海报。

- 模型分享页此前保存于 `.local/watermark-model-page.html`：`snap-0.data-00000-of-00001` 为 119,996,408 字节，`snap-0.meta` 为 65,952,190 字节，索引 11,495 字节，checkpoint 32 字节；合计 185,960,125 字节。页面使用十进制约 120 / 186 MB，并说明分享页二进制显示口径及文件大小不代表显存。
- 只读检查本机：Python 3.10.11、RTX 4070 Laptop 8188 MiB，TensorFlow / neuralgym 未安装，模型权重未下载；没有实际推理数据。
- 仓库 requirements.txt 固定 TensorFlow 1.15.5，PyPI 发布文件面向 Python 3.6 / 3.7；现代环境及 GPU 兼容性仍需另行验证。
- FFmpeg 官方 delogo / removelogo 文档与 OpenCV inpaint 教程说明传统算法原理；未生成传统算法对照图，不声称模型总是更优。
- 各扩展清晰标注额外选区、检测、OCR、分割、排版、队列或时序模块；无对应已部署功能。
- 海报准确文字通过 HTML/CSS 排版、浏览器内 SVG/Canvas 导出，图片只用于知识总览；未生成任何伪装成实测的模型效果。
- 新页面依旧是静态解释与公开样例展示，没有上传推理接口或远程模型服务。
