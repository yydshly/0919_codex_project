import { Composition, registerRoot } from 'remotion';
import { Reel, REEL_DURATION } from './Reel';
import { shots } from './shots';
const Root = () => <>
  <Composition id="ShotcraftReel" component={Reel} durationInFrames={REEL_DURATION} fps={30} width={1920} height={1080} />
  {shots.map(shot => <Composition key={shot.id} id={shot.id} component={shot.component} durationInFrames={shot.duration} fps={30} width={1920} height={1080} />)}
</>;
registerRoot(Root);
