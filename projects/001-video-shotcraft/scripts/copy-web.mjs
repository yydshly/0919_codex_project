import { cpSync, existsSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = realpathSync(resolve(project, '../../web'));
const destination = resolve(web, '001-video-shotcraft');
if (!destination.startsWith(web + sep) || dirname(destination) !== web) throw new Error('Invalid output directory');
if (!existsSync(resolve(project, 'dist/index.html'))) throw new Error('Build the site first');
if (existsSync(destination)) {
  if (realpathSync(destination) !== destination) throw new Error('Refusing to replace redirected output');
  rmSync(destination, {recursive: true});
}
mkdirSync(destination, {recursive: true});
cpSync(resolve(project, 'dist'), destination, {recursive: true});
cpSync(resolve(project, 'assets/cover.png'), resolve(destination, 'cover.png'));
console.log('Static showcase copied to web/001-video-shotcraft');
