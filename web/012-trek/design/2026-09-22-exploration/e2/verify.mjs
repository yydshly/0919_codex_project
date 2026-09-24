import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {resolve, dirname, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildLayout, PLACE_IDS} from '../e1/core.mjs';
import {makeComposition, auditComposition, validateManifest} from './core.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const manifestPath = process.argv[2] ? resolve(process.argv[2]) : resolve(dir, 'data/asset-manifest.json');
const inputPath = resolve(dir, '../e1/data/input.json');
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const inputBytes = await readFile(inputPath), input = JSON.parse(inputBytes);
assert.equal(hash(inputBytes), 'c0ac5804ab18560d0dab667b484d2fa9811cd4adf3d4c8df320f702305da5c43', 'E1 recorded input changed; review a new geography version before accepting E2');
const recordedE1Layout = JSON.parse(await readFile(resolve(dir, '../e1/layout-normal-split.json')));
const copy = value => JSON.parse(JSON.stringify(value));

function inspectPNG(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
  let offset = 8, header, transparency, chunks = [];
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    assert.ok(offset + 12 + size <= bytes.length, 'PNG chunk fits file');
    const data = bytes.subarray(offset + 8, offset + 8 + size);
    if (type === 'IHDR') header = {width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], interlace: data[12]};
    if (type === 'tRNS') transparency = data;
    if (type === 'IDAT') chunks.push(data);
    offset += size + 12;
    if (type === 'IEND') break;
  }
  assert.ok(header?.width && header?.height, 'PNG dimensions');
  let alpha = {status: 'not-decoded', hasTransparency: null, visibleBox: null};
  if ([0, 2, 3].includes(header.colorType) && !transparency) alpha = {status: 'decoded-no-alpha-channel', hasTransparency: false, visibleBox: {x: 0, y: 0, width: header.width, height: header.height}};
  else if (header.bitDepth === 8 && header.interlace === 0 && [4, 6].includes(header.colorType)) {
    const components = header.colorType === 6 ? 4 : 2, rowBytes = header.width * components;
    const inflated = inflateSync(Buffer.concat(chunks));
    assert.equal(inflated.length, (rowBytes + 1) * header.height, 'PNG inflated row size');
    let previous = Buffer.alloc(rowBytes), hasTransparency = false;
    let minX = header.width, minY = header.height, maxX = -1, maxY = -1;
    const paeth = (a, b, c) => {const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;};
    for (let y = 0; y < header.height; y++) {
      const start = y * (rowBytes + 1), filter = inflated[start], row = Buffer.alloc(rowBytes);
      assert.ok(filter >= 0 && filter <= 4, 'supported PNG row filter');
      for (let i = 0; i < rowBytes; i++) {
        const a = i >= components ? row[i - components] : 0, b = previous[i], c = i >= components ? previous[i - components] : 0;
        const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c);
        row[i] = (inflated[start + 1 + i] + predictor) & 255;
      }
      for (let x = 0; x < header.width; x++) {
        const value = row[x * components + components - 1];
        if (value < 255) hasTransparency = true;
        if (value > 0) {minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);}
      }
      previous = row;
    }
    alpha = {status: 'decoded-alpha-channel', hasTransparency, visibleBoxThreshold: 'alpha > 0',
      visibleBox: maxX < 0 ? null : {x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1}};
  }
  return {...header, alpha, note: 'Alpha means nontransparent pixels only; it is not a landmark subject segmentation.'};
}

// Unit fixtures exercise contracts only. They are never included as real asset evidence.
const fixture = {assets: PLACE_IDS.map(id => ({id: `fixture-${id}`, placeId: id, src: `assets/${id}.png`, width: 128, height: 128, sha256: 'a'.repeat(64), alpha: {hasTransparency: false}}))};
const unitTests = [];
const record = (name, fn) => {fn(); unitTests.push({name, pass: true});};
record('composition preserves the recorded E1 layout artifact', () => {assert.deepEqual(makeComposition(input, fixture).frames, recordedE1Layout.frames);});
record('normal composition matches E1 and has no rectangle overlap at 84 px', () => {
  const composition = makeComposition(input, fixture), audit = auditComposition(input, fixture, composition);
  assert.equal(audit.pass, true); assert.equal(audit.releaseReady, false); assert.equal(audit.visibleAssessment.pass, null);
  const expected = buildLayout(input, 'split').frames.filter(f => f.kind === 'primary').flatMap(f => f.nodes);
  for (const point of expected) {const placement = composition.placements.find(p => p.id === point.id); assert.equal(placement.x + placement.width / 2, point.x); assert.equal(placement.y + placement.height / 2, point.y);}
});
for (const [fault, requiredCheck] of [['shift', 'geometry'], ['swap', 'binding'], ['missing', 'identity'], ['oversize', 'overlap']]) record(`fault ${fault} is detected by ${requiredCheck}`, () => {
  const audit = auditComposition(input, fixture, makeComposition(input, fixture, {fault}));
  assert.equal(audit.pass, false); assert.equal(audit.checks.find(c => c.id === requiredCheck).pass, false);
});
record('move declared anchor with image cannot hide position error', () => {
  const c = makeComposition(input, fixture); c.anchors[0].x += 20; c.placements[0].x += 20; c.placements[0].center.x += 20;
  const audit = auditComposition(input, fixture, c); assert.equal(audit.checks.find(x => x.id === 'anchors').pass, false); assert.equal(audit.checks.find(x => x.id === 'geometry').pass, false);
});
record('changed frame and locator are rejected against original E1 geometry', () => {
  const c = makeComposition(input, fixture); c.frames[1].nodes[0].x += 1;
  assert.equal(auditComposition(input, fixture, c).checks.find(x => x.id === 'frames').pass, false);
});
record('duplicate placement ID is rejected', () => {const c = makeComposition(input, fixture); c.placements[1].id = c.placements[0].id; assert.equal(auditComposition(input, fixture, c).checks.find(x => x.id === 'identity').pass, false);});
record('wrong image URL cannot hide behind the right asset ID', () => {const c = makeComposition(input, fixture); c.placements[0].src = c.placements[1].src; assert.equal(auditComposition(input, fixture, c).checks.find(x => x.id === 'binding').pass, false);});
record('locator cannot receive a main image', () => {const c = makeComposition(input, fixture); c.placements[0].frameId = 'locator'; assert.equal(auditComposition(input, fixture, c).checks.find(x => x.id === 'range').pass, false);});
record('changed center offset is rejected', () => {const c = makeComposition(input, fixture); c.placements[0].anchorOffset.x = 0; assert.equal(auditComposition(input, fixture, c).checks.find(x => x.id === 'geometry').pass, false);});
record('exported manifest cannot change asset hashes independently', () => {const c = makeComposition(input, fixture); c.assetManifest.assets[0].sha256 = 'b'.repeat(64); assert.equal(auditComposition(input, fixture, c).checks.find(x => x.id === 'manifest-snapshot').pass, false);});
record('malformed composition returns failed checks', () => {assert.equal(auditComposition(input, fixture, null).pass, false); assert.equal(auditComposition(input, fixture, {placements: [null, null]}).pass, false);});
record('140 px honestly reports overlap rather than passing every slider value', () => {const c = makeComposition(input, fixture, {size: 140}); const audit = auditComposition(input, fixture, c); assert.equal(audit.checks.find(x => x.id === 'geometry').pass, true); assert.equal(audit.checks.find(x => x.id === 'overlap').pass, false);});
for (const [name, mutate] of [
  ['missing asset', m => m.assets.pop()],
  ['duplicate asset ID', m => {m.assets[1].id = m.assets[0].id;}],
  ['reused image path', m => {m.assets[1].src = m.assets[0].src;}],
  ['duplicate place mapping', m => {m.assets[1].placeId = m.assets[0].placeId;}],
  ['missing SHA', m => {delete m.assets[0].sha256;}],
  ['invalid dimension', m => {m.assets[0].width = 0;}],
  ['path traversal', m => {m.assets[0].src = 'assets/../outside.png';}],
  ['unknown place', m => {m.assets[0].placeId = 'unknown';}],
]) record(`manifest rejects ${name}`, () => {const m = copy(fixture); mutate(m); assert.equal(validateManifest(m).valid, false); assert.throws(() => makeComposition(input, m), TypeError);});
for (const size of [0, 59, 141, NaN]) record(`rejects size ${String(size)}`, () => assert.throws(() => makeComposition(input, fixture, {size}), TypeError));
record('unknown fault fails explicitly', () => assert.throws(() => makeComposition(input, fixture, {fault: 'invisible'}), TypeError));

if (process.argv.includes('--unit-only')) {
  console.log(JSON.stringify({unitTestsPassed: unitTests.length, realAssetsChecked: false, releaseReady: false}));
  process.exit(0);
}
const manifestBytes = await readFile(manifestPath), manifest = JSON.parse(manifestBytes);
assert.equal(validateManifest(manifest).valid, true, 'real asset manifest must satisfy contract');
const fileChecks = [];
for (const asset of manifest.assets) {
  const assetPath = resolve(dir, asset.src), traversal = relative(resolve(dir, 'assets'), assetPath);
  assert.ok(traversal && !traversal.startsWith('..') && !isAbsolute(traversal), 'asset remains inside E2 assets directory');
  const bytes = await readFile(assetPath), actualHash = hash(bytes), png = inspectPNG(bytes);
  assert.equal(actualHash, asset.sha256.toLowerCase(), `${asset.id} SHA-256 matches file bytes`);
  assert.equal(png.width, asset.width, `${asset.id} PNG width`); assert.equal(png.height, asset.height, `${asset.id} PNG height`);
  if (typeof asset.alpha?.hasTransparency === 'boolean' && typeof png.alpha.hasTransparency === 'boolean') assert.equal(png.alpha.hasTransparency, asset.alpha.hasTransparency, `${asset.id} alpha declaration`);
  fileChecks.push({id: asset.id, placeId: asset.placeId, src: asset.src, bytes: bytes.length, sha256: actualHash, pass: true, png});
}
const normal = makeComposition(input, manifest);
const faultResults = ['shift', 'swap', 'missing', 'oversize'].map(fault => {
  const composition = makeComposition(input, manifest, {fault}), audit = auditComposition(input, manifest, composition);
  assert.equal(audit.pass, false, `real asset fault ${fault} caught`);
  return {fault, detected: true, failedChecks: audit.checks.filter(c => !c.pass).map(c => c.id), maxAnchorErrorPx: audit.maxAnchorErrorPx, overlaps: audit.overlaps};
});
const normalAudit = auditComposition(input, manifest, normal);
assert.equal(normalAudit.pass, true, 'real asset normal geometry and binding');
const normalJSON = `${JSON.stringify(normal, null, 2)}\n`;
await writeFile(resolve(dir, 'normal-composition.json'), normalJSON);
const result = {schemaVersion: 'e2-verification-v1', generatedAt: new Date().toISOString(),
  input: {path: '../e1/data/input.json', sha256: hash(inputBytes), externalGeographyReverified: false},
  manifest: {path: relative(dir, manifestPath).replaceAll('\\', '/'), sha256: hash(manifestBytes)},
  composition: {path: 'normal-composition.json', sha256: hash(normalJSON), sizePx: 84, layout: 'E1 split'},
  actualFiles: fileChecks, normal: normalAudit, faults: faultResults,
  unitTests: {count: unitTests.length, fixturesAreRealAssetEvidence: false, checks: unitTests},
  fileIntegrity: {pass: true, method: 'SHA-256 over actual PNG bytes plus independent PNG header/alpha inspection'},
  releaseReady: false,
  pending: ['建筑身份与外形人工核验', '整体美术质量评审', '真实主体分割和 90% 可见率测量', '更多地点密度与不同比例图幅测试']};
await writeFile(resolve(dir, 'results.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({unitTestsPassed: unitTests.length, actualPNGsVerified: fileChecks.length, normalPass: normalAudit.pass, faultsDetected: faultResults.length, releaseReady: false, result: resolve(dir, 'results.json'), composition: resolve(dir, 'normal-composition.json')}));
