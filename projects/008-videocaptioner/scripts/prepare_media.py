"""Prepare original teaching media and copy attributed upstream subtitle fixtures."""
import json
import re
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
SHA = '95842ecb5618c0b6a548a336bdfb0eb859bdb501'
UPSTREAM = ROOT / '.local/videocaptioner-research' / f'VideoCaptioner-{SHA}'
MEDIA = PROJECT / 'site/media'
MEDIA.mkdir(parents=True, exist_ok=True)

def font(size, mono=False):
    return ImageFont.truetype('C:/Windows/Fonts/consola.ttf' if mono else 'C:/Windows/Fonts/msyh.ttc', size)

im = Image.new('RGB', (1280, 720), '#101a28')
d = ImageDraw.Draw(im)
d.text((64, 45), 'PYTHON / FIRST STEPS', font=font(22, True), fill='#7cdbc8')
d.text((62, 112), '从第一行代码开始', font=font(52), fill='#f3f7fc')
d.text((65, 195), '一段用于验证字幕合成的原创教学画面', font=font(23), fill='#9facbe')
d.rounded_rectangle((62, 260, 1218, 484), radius=18, fill='#182638', outline='#34475e', width=2)
d.text((95, 285), 'hello.py', font=font(20, True), fill='#a5b2c5')
d.line((94, 327, 1180, 327), fill='#34475e', width=2)
d.text((99, 353), '01', font=font(26, True), fill='#6a7e97')
d.text((162, 347), 'print("Hello, world!")', font=font(38, True), fill='#cbf17a')
d.text((164, 417), '> Hello, world!', font=font(26, True), fill='#b4c2d6')
im.save(MEDIA / 'poster.png')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(MEDIA/'poster.png'),'-t','38','-r','24','-c:v','libx264','-pix_fmt','yuv420p','-crf','23','-movflags','+faststart',str(MEDIA/'input.mp4')], check=True)

for source, target in [('sample_en.srt','source.srt'),('sample_en_processed.srt','bilingual.srt')]:
    shutil.copy2(UPSTREAM/'tests/fixtures/subtitle'/source, MEDIA/target)
shutil.copy2(UPSTREAM/'LICENSE', MEDIA/'upstream-LICENSE.txt')
for name in ('main.png','subtitle.png','style.png'):
    shutil.copy2(UPSTREAM/'docs/public'/name, MEDIA/('upstream-'+name))

def seconds(s):
    h,m,rest = s.split(':')
    return int(h)*3600+int(m)*60+float(rest.replace(',','.'))

segments=[]
for block in (MEDIA/'bilingual.srt').read_text(encoding='utf-8-sig').strip().split('\n\n'):
    lines=block.splitlines()
    if len(lines)<4: continue
    start,end=lines[1].split(' --> ')
    segments.append({'id':int(lines[0]),'start':seconds(start),'end':seconds(end),'zh':lines[2],'en':' '.join(lines[3:])})
(PROJECT/'site/subtitles.json').write_text(json.dumps(segments,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Prepared {len(segments)} subtitle segments and original 38-second silent clip.')
