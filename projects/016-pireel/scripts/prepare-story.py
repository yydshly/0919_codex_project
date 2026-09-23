"""Make demonstration INPUT material, not the edited Pireel output.

The actual Blinko screenshot is framed with FFmpeg and combined with locally
synthesized narration. Final editorial changes are performed in Pireel Studio.
"""
import json
import math
from pathlib import Path
import subprocess
import wave

root = Path(__file__).resolve().parents[1]
dest = root / 'assets/story'
source = root.parent / '004-blinko/assets/cover.png'
segments = json.loads((dest / 'script.json').read_text(encoding='utf-8-sig'))
crops = {
    'intro': 'scale=-2:650,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xe8e9e8',
    'record': 'crop=720:390:200:30,scale=1180:-2,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xe8e9e8',
    'tags': 'crop=620:670:0:180,scale=-2:650,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xe8e9e8',
    'search': 'crop=620:360:300:0,scale=1180:-2,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xe8e9e8',
    'outro': 'scale=-2:650,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xe8e9e8',
    'tail': 'scale=-2:650,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xe8e9e8',
}
at = 0
for segment in segments:
    audio = dest / (segment['id'] + '.wav')
    with wave.open(str(audio), 'rb') as handle:
        spoken = handle.getnframes()/handle.getframerate()
    duration = math.ceil(spoken + 0.55)
    segment.update(start=at, end=at+duration, duration=duration, speechDuration=spoken)
    at += duration
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-framerate','24','-i',str(source),'-i',str(audio),'-vf',crops[segment['id']],'-af','apad','-t',str(duration),'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-movflags','+faststart',str(dest/(segment['id']+'.mp4'))],check=True)
(dest/'concat.txt').write_text(''.join("file '"+s['id']+".mp4'\n" for s in segments),encoding='utf-8')
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(dest/'concat.txt'),'-c:v','copy','-c:a','aac','-movflags','+faststart',str(dest/'before.mp4')],check=True)
manifest={'scenario':'向同事介绍 Blinko 笔记软件','source':'真实 Blinko 部署截图 + 本地合成解说；为演示制作的输入素材，不是用户原始录屏。','total':at,'keptDuration':sum(s['duration'] for s in segments if s['keep']),'segments':segments}
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
