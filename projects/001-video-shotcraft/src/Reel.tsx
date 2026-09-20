import { AbsoluteFill, Sequence } from 'remotion';
import { shots } from './shots';

// Sequence establishes both local frame and duration for each upstream useT() call.
export const reelShots = [shots[7], shots[1], shots[0], shots[2], shots[6], shots[3]];
export const REEL_DURATION = reelShots.reduce((sum, shot) => sum + shot.duration, 0);
export const Reel = () => {
  let from = 0;
  return <AbsoluteFill style={{background: '#0a0b10'}}>
    {reelShots.map((shot, index) => {
      const start = from;
      from += shot.duration;
      const Comp = shot.component;
      return <Sequence key={shot.id} from={start} durationInFrames={shot.duration}>
        <Comp />
        <div style={{position: 'absolute', bottom: 26, left: 36, color: '#fff', fontFamily: 'Arial, Microsoft YaHei, sans-serif', fontSize: 22, padding: '10px 16px', background: 'rgba(12,13,17,.86)', borderRadius: 6}}>
          {String(index + 1).padStart(2, '0')} / {reelShots.length}　{shot.name} · VIDEO SHOTCRAFT
        </div>
      </Sequence>;
    })}
  </AbsoluteFill>;
};
