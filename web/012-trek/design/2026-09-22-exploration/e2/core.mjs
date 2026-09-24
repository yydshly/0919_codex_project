import {PLACE_IDS, buildLayout, validateInput} from '../e1/core.mjs';

// This module checks declared identity and geometry. It never recognizes bitmap content.
const finite = value => typeof value === 'number' && Number.isFinite(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const close = (a, b, tolerance = 1e-6) => finite(a) && finite(b) && Math.abs(a - b) <= tolerance;
const clone = value => JSON.parse(JSON.stringify(value));
export const FAULTS = Object.freeze(['normal', 'shift', 'swap', 'missing', 'oversize']);

export function validateManifest(manifest) {
  const errors = [];
  const reject = (code, path, message) => errors.push({code, path, message});
  if (!Array.isArray(manifest?.assets)) return {valid: false, errors: [{code: 'ASSETS', path: 'assets', message: '缺少素材清单'}]};
  const ids = new Set(), sources = new Set();
  manifest.assets.forEach((asset, i) => {
    const path = `assets[${i}]`;
    if (!asset || typeof asset !== 'object') {reject('ASSET', path, '素材须为对象'); return;}
    if (!nonempty(asset.id)) reject('ASSET_ID', `${path}.id`, '素材编号不能为空');
    else if (ids.has(asset.id)) reject('DUPLICATE_ASSET', `${path}.id`, '素材编号重复');
    ids.add(asset.id);
    if (!PLACE_IDS.includes(asset.placeId)) reject('PLACE_ID', `${path}.placeId`, '素材必须绑定本次实验地点');
    if (!nonempty(asset.src) || !/^assets\/[a-zA-Z0-9_.\/-]+\.png$/.test(asset.src) || asset.src.split('/').includes('..')) reject('SRC', `${path}.src`, '素材须为本实验 assets 目录内的 PNG 相对路径');
    if (sources.has(asset.src)) reject('DUPLICATE_SRC', `${path}.src`, '本轮四份独立素材不能复用同一图片路径');
    sources.add(asset.src);
    if (![asset.width, asset.height].every(n => Number.isInteger(n) && n > 0)) reject('DIMENSIONS', path, '须登记原图正整数宽高');
    if (!/^[a-f0-9]{64}$/i.test(asset.sha256 ?? '')) reject('HASH', `${path}.sha256`, '须登记原始文件 SHA-256');
    if (asset.alpha?.hasTransparency !== undefined && typeof asset.alpha.hasTransparency !== 'boolean') reject('ALPHA', `${path}.alpha.hasTransparency`, '透明信息为明确布尔值，未分析时省略');
  });
  for (const id of PLACE_IDS) if (manifest.assets.filter(a => a?.placeId === id).length !== 1) reject('PLACE_BINDING', 'assets', `${id} 必须恰好绑定一份素材`);
  if (manifest.assets.length !== PLACE_IDS.length) reject('ASSET_COUNT', 'assets', '本轮固定四份素材');
  return {valid: errors.length === 0, errors};
}

export function makeComposition(input, assetManifest, {size = 84, fault = 'normal'} = {}) {
  const validInput = validateInput(input), validManifest = validateManifest(assetManifest);
  if (!validInput.valid) throw new TypeError(validInput.errors.map(e => e.message).join('；'));
  if (!validManifest.valid) throw new TypeError(validManifest.errors.map(e => e.message).join('；'));
  if (!finite(size) || size < 60 || size > 140) throw new TypeError('正常素材框尺寸须在 60–140 px 范围内');
  if (!FAULTS.includes(fault)) throw new TypeError('未知故障注入');
  const layout = buildLayout(input, 'split', {footprint: size});
  const anchors = layout.frames.filter(f => f.kind === 'primary').flatMap(frame => frame.nodes.map(node => ({
    id: node.id, placeId: node.id, frameId: frame.id, name: node.name, shortName: node.shortName,
    x: node.x, y: node.y, projected: {...node.projected},
    coordinate: {lon: input.places.find(p => p.id === node.id).lon, lat: input.places.find(p => p.id === node.id).lat, crs: 'EPSG:4326'},
  })));
  let placements = anchors.map(anchor => {
    const asset = assetManifest.assets.find(a => a.placeId === anchor.id);
    return {id: anchor.id, placeId: anchor.id, assetId: asset.id, src: asset.src, frameId: anchor.frameId,
      x: anchor.x - size / 2, y: anchor.y - size / 2, width: size, height: size,
      anchorOffset: {x: size / 2, y: size / 2}, center: {x: anchor.x, y: anchor.y},
      transform: {rotation: 0, fit: 'contain', sourceWidth: asset.width, sourceHeight: asset.height}};
  });
  const drum = placements.find(p => p.id === 'drum-tower');
  if (fault === 'shift') {drum.x += 140; drum.center.x += 140;}
  if (fault === 'swap') {
    const bell = placements.find(p => p.id === 'bell-tower');
    for (const key of ['assetId', 'src', 'transform']) [bell[key], drum[key]] = [drum[key], bell[key]];
  }
  if (fault === 'missing') placements = placements.filter(p => p.id !== 'drum-tower');
  if (fault === 'oversize') {
    drum.width *= 3; drum.height *= 3;
    drum.anchorOffset = {x: drum.width / 2, y: drum.height / 2};
    drum.x = drum.center.x - drum.anchorOffset.x; drum.y = drum.center.y - drum.anchorOffset.y;
  }
  return {schemaVersion: 'e2-composition-v1', width: layout.width, height: layout.height,
    layoutMode: 'split', projection: {...layout.projection}, frames: clone(layout.frames),
    anchors, placements, assetManifest: clone(assetManifest), size, fault,
    layoutReference: '../e1/core.mjs:buildLayout(split)',
    semantics: {placement: 'square contain box; center aligned to geographic anchor',
      geography: 'building/site center, not verified entrance',
      visibility: 'rectangle overlap only; no bitmap subject segmentation'}};
}

function rectIntersection(a, b) {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return {width, height, area: width * height};
}

export function auditComposition(input, assetManifest, composition) {
  const checks = [];
  const add = (id, label, pass, detail) => checks.push({id, label, pass: Boolean(pass), detail});
  const inputCheck = validateInput(input), manifestCheck = validateManifest(assetManifest);
  add('input', '继承 E1 坐标合同', inputCheck.valid, inputCheck.valid ? '来源、坐标系及中心点含义沿用 E1；未重新核实外部地理事实' : inputCheck.errors.map(e => e.message).join('；'));
  add('manifest', '素材清单完整且可追溯', manifestCheck.valid, manifestCheck.valid ? '四个素材编号、地点绑定、文件路径、尺寸与哈希均已登记；浏览器未校验文件字节' : manifestCheck.errors.map(e => e.message).join('；'));
  const placements = Array.isArray(composition?.placements) ? composition.placements : [];
  const assets = Array.isArray(assetManifest?.assets) ? assetManifest.assets : [];
  const frames = Array.isArray(composition?.frames) ? composition.frames : [];
  const anchors = Array.isArray(composition?.anchors) ? composition.anchors : [];
  const canonical = inputCheck.valid ? buildLayout(input, 'split', {footprint: 84}) : null;
  const canonicalAnchors = canonical?.frames.filter(f => f.kind === 'primary').flatMap(f => f.nodes.map(n => ({...n, frameId: f.id}))) ?? [];
  const recordedAssets = Array.isArray(composition?.assetManifest?.assets) ? composition.assetManifest.assets : [];
  const manifestSnapshotOK = manifestCheck.valid && recordedAssets.length === assets.length && assets.every(asset => {
    const matching = recordedAssets.filter(a => a?.id === asset.id);
    return matching.length === 1 && ['placeId', 'src', 'width', 'height', 'sha256'].every(key => matching[0][key] === asset[key]);
  });
  add('manifest-snapshot', '导出记录匹配本次素材清单', manifestSnapshotOK, '导出记录必须保留相同素材编号、地点、文件路径、尺寸与哈希');
  const layoutHeaderOK = composition?.schemaVersion === 'e2-composition-v1' && composition?.width === 1200 && composition?.height === 720 && composition?.layoutMode === 'split';
  let framesOK = layoutHeaderOK && frames.length === 4 && !!canonical && ['name', 'lon0', 'lat0', 'radius'].every(key => composition?.projection?.[key] === input?.projection?.[key]);
  for (const expected of canonical?.frames ?? []) {
    const matching = frames.filter(f => f?.id === expected.id), frame = matching[0];
    if (matching.length !== 1 || frame.kind !== expected.kind || !['x', 'y', 'width', 'height', 'padding', 'scale'].every(key => close(frame[key], expected[key])) || !['minX', 'maxX', 'minY', 'maxY'].every(key => close(frame.bounds?.[key], expected.bounds[key])) || !Array.isArray(frame.nodes) || frame.nodes.length !== expected.nodes.length) {framesOK = false; continue;}
    for (const n of expected.nodes) {
      const actual = frame.nodes.filter(node => node?.id === n.id);
      if (actual.length !== 1 || !close(actual[0].x, n.x) || !close(actual[0].y, n.y)) framesOK = false;
    }
  }
  add('frames', 'E1 分区图幅与定位小图保持', framesOK, '重新计算 E1 原始图幅后比较；定位小图只放点，不铺素材');
  const unique = placements.length === 4 && PLACE_IDS.every(id => placements.filter(p => p?.id === id && p?.placeId === id).length === 1);
  add('identity', '四个地点素材完整且唯一', unique, `主图中实际素材记录 ${placements.length} 个；不得遗漏或复用地点编号`);
  let anchorsOK = anchors.length === 4, geometryOK = placements.length === 4, bindingOK = manifestCheck.valid && placements.length === 4;
  let boxRangeOK = placements.length === 4, maxAnchorErrorPx = 0;
  const expectedSizeOK = finite(composition?.size) && composition.size >= 60 && composition.size <= 140;
  let requestedSizeOK = expectedSizeOK;
  for (const expected of canonicalAnchors) {
    const actual = anchors.filter(a => a?.id === expected.id);
    const original = input.places.find(p => p.id === expected.id);
    if (actual.length !== 1 || actual[0].placeId !== expected.id || actual[0].frameId !== expected.frameId || !close(actual[0].x, expected.x) || !close(actual[0].y, expected.y) || !close(actual[0].projected?.x, expected.projected.x) || !close(actual[0].projected?.y, expected.projected.y) || !close(actual[0].coordinate?.lon, original.lon) || !close(actual[0].coordinate?.lat, original.lat) || actual[0].coordinate?.crs !== original.crs) anchorsOK = false;
  }
  for (const p of placements) {
    const asset = assets.find(a => a.id === p?.assetId);
    bindingOK = bindingOK && !!asset && asset.placeId === p.placeId && p.src === asset.src && p.transform?.sourceWidth === asset.width && p.transform?.sourceHeight === asset.height;
    const expected = canonicalAnchors.find(a => a.id === p?.placeId);
    const frame = canonical?.frames.find(f => f.id === p?.frameId && f.kind === 'primary');
    const structure = p && ['x', 'y', 'width', 'height'].every(k => finite(p[k])) && p.width > 0 && p.height > 0 && close(p.anchorOffset?.x, p.width / 2) && close(p.anchorOffset?.y, p.height / 2) && p.transform?.rotation === 0 && p.transform?.fit === 'contain';
    const center = structure ? {x: p.x + p.anchorOffset.x, y: p.y + p.anchorOffset.y} : {x: NaN, y: NaN};
    const error = expected ? Math.hypot(center.x - expected.x, center.y - expected.y) : Infinity;
    maxAnchorErrorPx = Math.max(maxAnchorErrorPx, finite(error) ? error : Infinity);
    geometryOK = geometryOK && structure && !!expected && p.frameId === expected.frameId && close(p.center?.x, center.x) && close(p.center?.y, center.y);
    requestedSizeOK = requestedSizeOK && close(p?.width, composition?.size) && close(p?.height, composition?.size);
    boxRangeOK = boxRangeOK && structure && !!frame && p.x >= frame.x && p.y >= frame.y && p.x + p.width <= frame.x + frame.width && p.y + p.height <= frame.y + frame.height;
  }
  add('anchors', '原始四点地理锚点保持', anchorsOK, '锚点同 E1 重新计算结果比较，防止素材与锚点被一起移动');
  add('binding', '地点与素材编号绑定正确', bindingOK, '检查实际 placement 的 assetId、src 和声明绑定；不能识别图片是否画错建筑');
  add('geometry', '素材中心对齐实际地理锚点', geometryOK && maxAnchorErrorPx <= 1e-6, `最大偏移 ${finite(maxAnchorErrorPx) ? maxAnchorErrorPx.toFixed(6) : '不可计算'} px；以实际图片矩形及中心偏移回算`);
  add('size', '遵守所选素材框尺寸', requestedSizeOK, '素材矩形须与当前 60–140 px 设置一致；超大素材不得静默压住其他地点');
  add('range', '素材矩形未超出所属图幅', boxRangeOK, '按完整方形素材框保守检查；不把透明区域解释为已分割主体');
  const overlaps = [];
  for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
    const a = placements[i], b = placements[j];
    if (!a || !b || a.frameId !== b.frameId) continue;
    const intersection = rectIntersection(a, b);
    if (intersection.area > 1e-6) overlaps.push({frameId: a.frameId, a: a.placeId, b: b.placeId,
      areaPx: intersection.area, widthPx: intersection.width, heightPx: intersection.height,
      classification: 'conservative-rectangle-overlap', actualSubjectOcclusion: null});
  }
  add('overlap', '未出现素材框重叠候选', overlaps.length === 0, overlaps.length ? `发现 ${overlaps.length} 对矩形重叠；需复核真实主体可见情况` : '矩形未重叠；这不能替代主体可见率测量和建筑外形审查');
  return {pass: checks.every(c => c.pass), scope: 'declared-identity-and-layout-only', checks,
    maxAnchorErrorPx, overlaps, visibleAssessment: {status: 'not-measured', threshold: 0.9, pass: null, method: null},
    appearanceAssessment: {status: 'not-verified', pass: null}, fileIntegrity: {status: 'node-verification-required', pass: null},
    releaseReady: false, limitation: '本结果只验证登记关系与矩形布局；未验收建筑外形、审美、真实主体 90% 可见率和外部地理精度'};
}
