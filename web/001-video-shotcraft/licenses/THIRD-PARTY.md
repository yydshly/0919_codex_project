# Third-party sources

## Video Shotcraft

- Author / repository: Vincentwei1021 — https://github.com/Vincentwei1021/video-shotcraft
- Snapshot: 5e71af35a2daee492dd3ea93e5e8903f32dcd13c
- Retrieved: 2026-09-20
- Code license: Apache License 2.0; see video-shotcraft-LICENSE.txt.
- Purpose: independent research showcase, without affiliation or endorsement.

Copied source paths (relative paths retained under src/upstream/):

- demos/_fixtures/{Motion,Fixtures,PageCam2D}.tsx
- demos/_textures/live-layout.json
- demos/ui-entrance/card-stack/CardStack.tsx
- demos/ui-entrance/carousel-3d/Carousel3D.tsx
- demos/ui-entrance/deck-deal-flyin/DeckDealFlyin.tsx
- demos/typography/blur-slide/BlurSlide.tsx
- demos/data/counter-confetti/CounterConfetti.tsx
- demos/transition/card-flip-reveal/CardFlipReveal.tsx
- demos/interaction/ai-stream-response/{StreamResponse.tsx,agent-stream.jpg}
- demos/opening/orbit-ring-title-open/OrbitRingTitleOpen.tsx

Demo assets: demos/_textures/card1.png through card10.png and projects-empty.png, placed in public/textures/live/. The original imagery is illustrative; replace for an actual product film. No upstream audio, footage from referenced brand films, or remote gallery videos were copied.

Local modifications (2026-09-20):

- BlurSlide: optional headline/subtitle props; fit headline size; bound staggering for increased word counts. Default copy and basic motion retained.
- CounterConfetti: optional target/metric props; clamp target to 1–99999; prevent label wrapping. Timing and particle motion retained.
- Other vendored sources retain upstream contents. Showcase, labels, metadata and Reel composition are new local code.

## Dependencies

Remotion: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md
React (MIT): https://github.com/facebook/react/blob/main/LICENSE
Vite (MIT): https://github.com/vitejs/vite/blob/main/LICENSE

Exact versions are in package-lock.json. This project grants no licenses beyond each upstream author's terms.
