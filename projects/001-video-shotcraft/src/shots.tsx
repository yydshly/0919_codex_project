import type { ComponentType } from 'react';
import { CardStack } from './upstream/demos/ui-entrance/card-stack/CardStack';
import { Carousel3D } from './upstream/demos/ui-entrance/carousel-3d/Carousel3D';
import { DeckDealFlyin } from './upstream/demos/ui-entrance/deck-deal-flyin/DeckDealFlyin';
import { BlurSlide } from './upstream/demos/typography/blur-slide/BlurSlide';
import { CounterConfetti } from './upstream/demos/data/counter-confetti/CounterConfetti';
import { CardFlipReveal } from './upstream/demos/transition/card-flip-reveal/CardFlipReveal';
import { StreamResponse } from './upstream/demos/interaction/ai-stream-response/StreamResponse';
import { OrbitRingTitleOpen } from './upstream/demos/opening/orbit-ring-title-open/OrbitRingTitleOpen';

export const COMMIT = '5e71af35a2daee492dd3ea93e5e8903f32dcd13c';
export const REPO = 'https://github.com/Vincentwei1021/video-shotcraft';
export const sourceUrl = (path: string) => `${REPO}/blob/${COMMIT}/${path}`;
export const FPS = 30;
export type DemoProps = { headline?: string; subtitle?: string; target?: number; metric?: string };
export type Shot = {
  id: string; name: string; category: string; component: ComponentType<DemoProps>;
  duration: number; thumbnail: number; color: string; path: string;
  intro: string; use: string; principle: string; caveat: string;
  beats: { frame: number; label: string }[]; tags: string[];
};
export const shots: Shot[] = [
  { id: 'card-stack', name: '卡片扇形展开', category: '界面与空间', component: CardStack,
    duration: 126, thumbnail: 108, color: '#af97f5', path: 'ui-entrance/card-stack',
    intro: '先聚成一摞，再展开成一组。用一次完整动作，让数量与多样性同时被看见。',
    use: '模板库、方案集合、作品集，以及需要展示「我们有一组东西」的产品段落。',
    principle: '逐张弹簧入场与整组扇形展开分开计算。位移、旋转和纵深在同一帧合成，旋转轴放在卡片下缘之外。',
    caveat: '这是上游的占位卡面。用于实际产品时，需要替换为自己的内容或页面切片。',
    beats: [{frame: 18, label: '错峰入场'}, {frame: 66, label: '聚拢落位'}, {frame: 100, label: '扇形展开'}],
    tags: ['Spring 弹簧', '3D 透视', '错峰入场'] },
  { id: 'deck-deal-flyin', name: '真实页面 · 发牌入场', category: '界面与空间', component: DeckDealFlyin,
    duration: 113, thumbnail: 70, color: '#e7c191', path: 'ui-entrance/deck-deal-flyin',
    intro: '一摞实体卡片从特写中飞出，逐渐加速，回到真实页面的网格里。',
    use: '内容聚合、项目列表、批量导入，强调「信息源源不断汇入」。',
    principle: '页面截图充当底板，元素切片按布局坐标归位。2.5D 相机由关键帧驱动，发牌间隔持续缩短。',
    caveat: '使用上游的产品演示截图，不代表我们的产品。新页面需要重新采集截图与元素坐标。',
    beats: [{frame: 20, label: '牌堆环绕'}, {frame: 55, label: '加速发牌'}, {frame: 100, label: '满板停留'}],
    tags: ['真实截图', '2.5D 运镜', '加速节奏'] },
  { id: 'blur-slide', name: '逐词解糊标题', category: '文字与开场', component: BlurSlide,
    duration: 114, thumbnail: 99, color: '#8bb6ef', path: 'typography/blur-slide',
    intro: '文字从虚焦中浮出来。主标题先起，副标题错峰接上，形成一句完整表达。',
    use: '产品主张、章节标题、功能介绍。低能量文字动效可以给主角镜头让位。',
    principle: '每个词的位移、模糊与透明度共用同一条缓动曲线。按词错峰，而非逐字打字。',
    caveat: '本研究为这张卡增加了文案参数。用空格把中文分为 3–5 组，可保留逐词节奏。',
    beats: [{frame: 15, label: '主标题起手'}, {frame: 50, label: '副标题跟进'}, {frame: 104, label: '清晰落定'}],
    tags: ['可改文案', '三通道同步', '低能量'] },
  { id: 'counter-confetti', name: '数字冲刺与庆祝', category: '数据与交互', component: CounterConfetti,
    duration: 138, thumbnail: 87, color: '#d1b3f2', path: 'data/counter-confetti',
    intro: '数字加速冲向目标，彩纸提前半拍喷出，落定后留给观众读取结果。',
    use: '增长里程碑、用户数、业绩成果。让一个重要数字成为画面主角。',
    principle: '缓动驱动数字增长和缩放回弹，固定种子的粒子轨迹模拟重力，任意帧都能复现。',
    caveat: '数字仅用于演示。本研究开放终值与标签编辑，保留上游的计数、回弹和纸屑节拍。',
    beats: [{frame: 30, label: '计数冲刺'}, {frame: 75, label: '纸屑抢拍'}, {frame: 112, label: '成果落定'}],
    tags: ['可改数字', '确定性粒子', '成果展示'] },
  { id: 'carousel-3d', name: '环形立体画廊', category: '界面与空间', component: Carousel3D,
    duration: 168, thumbnail: 48, color: '#94cbe0', path: 'ui-entrance/carousel-3d',
    intro: '八张卡片围成一圈稳定公转，从正面到背面都保持内容正立。',
    use: '作品集、集成生态、模板阵列，或者需要循环播放的产品背景。',
    principle: '卡片沿 Y 轴旋转后向 Z 轴推出形成圆环；父层统一旋转，双面卡结构避免镜像文字。',
    caveat: '这里的立体感由浏览器的 CSS 透视实现；没有完整的三维建模或物理光照。',
    beats: [{frame: 0, label: '圆环就位'}, {frame: 56, label: '侧面公转'}, {frame: 112, label: '背面可读'}],
    tags: ['循环镜头', '双面卡片', 'CSS 3D'] },
  { id: 'card-flip-reveal', name: '功能翻面 · 成果揭示', category: '转场与揭示', component: CardFlipReveal,
    duration: 146, thumbnail: 80, color: '#dddacb', path: 'transition/card-flip-reveal',
    intro: '界面卡片依次翻面，背面揭出结果：让动作本身回答「它带来了什么」。',
    use: '功能与收益成对表达、性能对比、产品成果汇报。',
    principle: '卡片先翻到 192°，再回弹至 180°。高光带随翻转角度移动，三张卡错开十帧起手。',
    caveat: '展示数字是上游占位内容。正反两面应有明确因果关系，实际使用必须换成真实可核实的数据。',
    beats: [{frame: 18, label: '首卡翻面'}, {frame: 42, label: '错峰揭示'}, {frame: 80, label: '结果停留'}],
    tags: ['语义转场', '旋转回弹', '成果对照'] },
  { id: 'ai-stream-response', name: 'AI 响应与证据汇入', category: '数据与交互', component: StreamResponse,
    duration: 150, thumbnail: 130, color: '#b8d791', path: 'interaction/ai-stream-response',
    intro: '先看到结论，再看到证据逐条补齐，最后收束为完成态。',
    use: 'AI 助手、搜索与智能任务处理功能的过程演示。',
    principle: '摘要与证据分层揭示；行文本先落定，状态图标稍后跟进。微小时间差建立清楚的主次。',
    caveat: '这是预先编排的视觉演示，不会实际调用模型、搜索文件或执行任务。',
    beats: [{frame: 30, label: '摘要先到'}, {frame: 80, label: '证据汇入'}, {frame: 128, label: '任务完成'}],
    tags: ['语义分块', '状态反馈', 'AI 产品'] },
  { id: 'orbit-ring-title-open', name: '环形卡阵 · 标题开场', category: '文字与开场', component: OrbitRingTitleOpen,
    duration: 130, thumbnail: 70, color: '#e3da85', path: 'opening/orbit-ring-title-open',
    intro: '一圈正在播放的内容托住中心标题，用一个开场交代完整的产品能力。',
    use: '功能矩阵、素材库、多场景产品的第一镜。',
    principle: '卡片沿椭圆公转，缩放与叠放顺序共同模拟远近；环先展开，再让卡内动效统一开播。',
    caveat: '卡内是上游的通用示意内容。实际制作应替换为自己的场景，且保留中心标题的阅读空间。',
    beats: [{frame: 20, label: '卡环展开'}, {frame: 50, label: '标题落定'}, {frame: 113, label: '交棒下一镜'}],
    tags: ['复合镜头', '伪纵深', '动效嵌套'] },
];
