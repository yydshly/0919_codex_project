import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'../../web/016-pireel');
mkdirSync(output,{recursive:true});
for(const name of ['showcase.mp4','studio-export.mp4','studio.png','cover.png','export-frame.png','pireel-overview.png','pireel-overview.svg','pireel-overview-preview.png']){
  const input=resolve(root,'assets',name);if(existsSync(input))copyFileSync(input,resolve(output,name));
}
mkdirSync(resolve(output,'story'),{recursive:true});
for(const name of ['before.mp4','after.mp4','before-poster.png','after-poster.png','studio.png','manifest.json']){
  const input=resolve(root,'assets/story',name);if(existsSync(input))copyFileSync(input,resolve(output,'story',name));
}
execFileSync(process.platform==='win32'?'python':'python3',[resolve(root,'scripts/source_archive.py'),output],{stdio:'inherit'});
