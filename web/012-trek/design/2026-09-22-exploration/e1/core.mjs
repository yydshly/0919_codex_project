// E1 is a local layout experiment. Passing these checks does not verify geography.
export const PLACE_IDS = Object.freeze(['bell-tower', 'drum-tower', 'pagoda', 'terracotta']);
const META = Object.freeze({
  'bell-tower': {shortName: '钟楼', role: 'building-center', sourceId: 'osm-bell'},
  'drum-tower': {shortName: '鼓楼', role: 'building-center', sourceId: 'osm-drum'},
  pagoda: {shortName: '大雁塔', role: 'building-center', sourceId: 'osm-pagoda'},
  terracotta: {shortName: '兵马俑', role: 'site-center', sourceId: 'osm-terracotta'},
});
const RAD = Math.PI / 180;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const close = (a, b, tolerance = 1e-7) => finite(a) && finite(b) && Math.abs(a - b) <= tolerance;

export function makeInput(baseline) {
  if (!Array.isArray(baseline?.places) || !Array.isArray(baseline?.sources)) throw new TypeError('缺少原始地点或来源列表');
  const places = PLACE_IDS.map(id => {
    const matches = baseline.places.filter(p => p.id === id);
    if (matches.length !== 1) throw new TypeError(`原始数据必须恰好包含一个 ${id}`);
    const p = matches[0], meta = META[id];
    if (!/^WGS84；/.test(p.coordinateAccuracy ?? '')) throw new TypeError(`${id} 未明确声明原始 WGS84 坐标`);
    if (!p.sourceIds?.includes(meta.sourceId)) throw new TypeError(`${id} 未关联预期地理来源`);
    const source = baseline.sources.find(s => s.id === meta.sourceId);
    return {id, name: p.name, shortName: meta.shortName, lon: p.lng, lat: p.lat,
      crs: 'EPSG:4326', role: meta.role, sourceUrl: source?.url ?? null,
      coordinateAccuracy: p.coordinateAccuracy};
  });
  const input = {schemaVersion: 'e1-input-v1', places,
    projection: {name: 'local-equirectangular', lon0: 108.94, lat0: 34.26, radius: 6371008.8},
    region: {west: 108.5, east: 109.6, south: 34, north: 34.7}};
  const check = validateInput(input);
  if (!check.valid) throw new TypeError(check.errors.map(e => e.message).join('；'));
  return input;
}

export function validateInput(input) {
  const errors = [];
  const reject = (code, path, message) => errors.push({code, path, message});
  if (!input || typeof input !== 'object') return {valid: false, errors: [{code: 'INPUT', path: '', message: '输入必须是对象'}]};
  if (input.schemaVersion !== 'e1-input-v1') reject('SCHEMA', 'schemaVersion', '未支持的输入版本');
  const region = input.region;
  const regionOK = region && ['west', 'east', 'south', 'north'].every(k => finite(region[k])) &&
    region.west >= -180 && region.east <= 180 && region.south >= -90 && region.north <= 90 &&
    region.west < region.east && region.south < region.north;
  if (!regionOK) reject('REGION', 'region', '实验范围必须是有效经纬度矩形');
  const projection = input.projection;
  if (!projection || projection.name !== 'local-equirectangular' ||
    !finite(projection.lon0) || Math.abs(projection.lon0) > 180 ||
    !finite(projection.lat0) || Math.abs(projection.lat0) >= 89 ||
    !finite(projection.radius) || projection.radius <= 0) {
    reject('PROJECTION', 'projection', '投影须声明受支持的局部等距圆柱参数');
  }
  if (!Array.isArray(input.places)) reject('PLACES', 'places', '缺少地点数组');
  else {
    const ids = new Set();
    input.places.forEach((p, i) => {
      const path = `places[${i}]`;
      if (!p || typeof p !== 'object') {reject('PLACE', path, '地点必须是对象'); return;}
      if (!nonempty(p.id)) reject('ID', `${path}.id`, '地点编号不能为空');
      else if (ids.has(p.id)) reject('DUPLICATE_ID', `${path}.id`, `重复地点编号 ${p.id}`);
      ids.add(p.id);
      if (!PLACE_IDS.includes(p.id)) reject('UNEXPECTED_ID', `${path}.id`, '地点不属于本次四点实验');
      if (!nonempty(p.name) || !nonempty(p.shortName)) reject('NAME', path, '地点名称和短名称不能为空');
      if (p.crs !== 'EPSG:4326') reject('CRS', `${path}.crs`, 'E1 仅接收显式 EPSG:4326；其他坐标系须先经过有记录的转换');
      const lonOK = finite(p.lon) && p.lon >= -180 && p.lon <= 180;
      const latOK = finite(p.lat) && p.lat >= -90 && p.lat <= 90;
      if (!lonOK || !latOK) reject('COORDINATE', path, '经纬度必须是范围内的有限数字，不能自动交换或补零');
      if (lonOK && latOK && regionOK && (p.lon < region.west || p.lon > region.east || p.lat < region.south || p.lat > region.north)) {
        reject('OUTSIDE_REGION', path, '地点超出本次实验范围');
      }
      if (!META[p.id] || p.role !== META[p.id].role) reject('ROLE', `${path}.role`, '坐标含义必须对应本样本建筑中心或景区中心，不得冒充入口');
      let sourceOK = false;
      try {const url = new URL(p.sourceUrl); sourceOK = ['https:', 'http:'].includes(url.protocol) && nonempty(url.hostname);} catch {}
      if (!sourceOK) reject('SOURCE', `${path}.sourceUrl`, '缺少可追溯的地理来源 URL');
      if (!nonempty(p.coordinateAccuracy)) reject('SOURCE_SEMANTICS', `${path}.coordinateAccuracy`, '须保留原始坐标含义声明');
    });
    for (const id of PLACE_IDS) if (!ids.has(id)) reject('MISSING_ID', 'places', `缺少实验地点 ${id}`);
    if (input.places.length !== PLACE_IDS.length) reject('PLACE_COUNT', 'places', '本实验必须恰好有四个地点');
  }
  return {valid: errors.length === 0, errors};
}

export function project(p, projection) {
  return {x: projection.radius * (p.lon - projection.lon0) * RAD * Math.cos(projection.lat0 * RAD),
    y: projection.radius * (p.lat - projection.lat0) * RAD};
}

export function haversine(a, b) {
  const p1 = a.lat * RAD, p2 = b.lat * RAD;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((b.lon - a.lon) * RAD / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

const around = (point, rx, ry = rx) => ({minX: point.x - rx, maxX: point.x + rx, minY: point.y - ry, maxY: point.y + ry});
function allBounds(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const margin = Math.max(maxX - minX, maxY - minY) * 0.04;
  return {minX: minX - margin, maxX: maxX + margin, minY: minY - margin, maxY: maxY + margin};
}
function expectedScale(frame) {
  return Math.min((frame.width - frame.padding * 2) / (frame.bounds.maxX - frame.bounds.minX),
    (frame.height - frame.padding * 2) / (frame.bounds.maxY - frame.bounds.minY));
}
function toCanvas(point, frame) {
  const centerX = (frame.bounds.minX + frame.bounds.maxX) / 2;
  const centerY = (frame.bounds.minY + frame.bounds.maxY) / 2;
  return {x: frame.x + frame.width / 2 + (point.x - centerX) * frame.scale,
    y: frame.y + frame.height / 2 - (point.y - centerY) * frame.scale};
}

export function buildLayout(input, mode, {footprint = 84, fault = null} = {}) {
  const validation = validateInput(input);
  if (!validation.valid) throw new TypeError(validation.errors.map(e => e.message).join('；'));
  if (!['continuous', 'split'].includes(mode)) throw new TypeError('未知布局方案');
  if (!finite(footprint) || footprint <= 0) throw new TypeError('素材占位尺寸须为正的有限像素值');
  if (![null, 'flip-drum'].includes(fault)) throw new TypeError('未知故障注入');
  const projected = Object.fromEntries(input.places.map(p => [p.id, project(p, input.projection)]));
  const full = allBounds(Object.values(projected));
  const makeFrame = (id, title, kind, x, y, width, height, bounds, ids) => {
    const frame = {id, title, kind, x, y, width, height, bounds, padding: 36, scale: 0, nodes: []};
    frame.scale = expectedScale(frame);
    frame.nodes = ids.map(id => {
      const p = input.places.find(p => p.id === id), point = projected[id];
      return {id, name: p.name, shortName: p.shortName, ...toCanvas(point, frame), projected: {...point}};
    });
    return frame;
  };
  let frames;
  if (mode === 'continuous') frames = [makeFrame('continuous', '连续全域图', 'primary', 20, 45, 1160, 635, full, PLACE_IDS)];
  else {
    const a = projected['bell-tower'], b = projected['drum-tower'];
    const cityCenter = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
    frames = [
      makeFrame('city', '钟鼓楼片区 · 局部放大', 'primary', 20, 45, 740, 635, around(cityCenter, 1000, 900), ['bell-tower', 'drum-tower']),
      makeFrame('locator', '全域定位 · 独立比例', 'locator', 790, 45, 390, 245, full, PLACE_IDS),
      makeFrame('south', '城南 · 独立比例', 'primary', 790, 325, 180, 355, around(projected.pagoda, 1000), ['pagoda']),
      makeFrame('lintong', '临潼 · 独立比例', 'primary', 990, 325, 190, 355, around(projected.terracotta, 2000), ['terracotta']),
    ];
  }
  if (fault === 'flip-drum') for (const frame of frames.filter(f => f.kind === 'primary')) {
    const drum = frame.nodes.find(p => p.id === 'drum-tower');
    if (drum) drum.x = frame.x + frame.width - frame.padding - 5;
  }
  return {mode, width: 1200, height: 720, projection: {...input.projection}, frames, footprint};
}

export function auditLayout(input, layout) {
  const checks = [];
  const add = (id, label, pass, detail) => checks.push({id, label, pass: Boolean(pass), detail});
  const validation = validateInput(input);
  add('input', '输入格式与来源记录', validation.valid, validation.valid ? '四点坐标系和中心点含义已登记；外部事实未重新核实' : validation.errors.map(e => e.message).join('；'));
  const frames = Array.isArray(layout?.frames) ? layout.frames : [];
  add('layout', '布局画布与方案', layout?.width === 1200 && layout?.height === 720 && ['continuous', 'split'].includes(layout?.mode) && frames.length > 0, '画布 1200 × 720；只审计已定义的实验方案');
  const projectionOK = validation.valid && layout?.projection && ['name', 'lon0', 'lat0', 'radius'].every(k => layout.projection[k] === input.projection[k]);
  add('projection', '投影参数一致', projectionOK, '所有图幅共享输入声明的局部投影；每图幅独立等比缩放');
  const primary = frames.filter(f => f.kind === 'primary').flatMap(f => Array.isArray(f.nodes) ? f.nodes : []);
  const primaryIDs = primary.map(p => p.id);
  add('identity', '四点主图完整且唯一', primaryIDs.length === 4 && PLACE_IDS.every(id => primaryIDs.filter(p => p === id).length === 1), `主图节点 ${primaryIDs.length} 个；定位小图的重复表达单独登记`);
  let scaleOK = frames.length > 0, rangeOK = frames.length > 0, projectedOK = true, maxAnchorErrorPx = 0;
  const collisions = [], separations = [];
  const inputById = new Map((input?.places ?? []).map(p => [p.id, p]));
  const frameIDs = frames.map(f => f.id);
  for (const frame of frames) {
    const b = frame.bounds;
    const structure = nonempty(frame.id) && frameIDs.filter(id => id === frame.id).length === 1 && ['primary', 'locator'].includes(frame.kind) &&
      ['x', 'y', 'width', 'height', 'padding', 'scale'].every(k => finite(frame[k])) && frame.padding >= 0 &&
      frame.width > frame.padding * 2 && frame.height > frame.padding * 2 && b &&
      ['minX', 'maxX', 'minY', 'maxY'].every(k => finite(b[k])) && b.maxX > b.minX && b.maxY > b.minY;
    scaleOK = scaleOK && structure && close(frame.scale, expectedScale(frame), 1e-10);
    rangeOK = rangeOK && structure && frame.x >= 0 && frame.y >= 0 && frame.x + frame.width <= layout.width && frame.y + frame.height <= layout.height;
    if (!structure || !Array.isArray(frame.nodes)) {rangeOK = false; maxAnchorErrorPx = Infinity; continue;}
    const ids = frame.nodes.map(n => n.id);
    for (const node of frame.nodes) {
      const original = inputById.get(node.id);
      if (!original || !validation.valid) {projectedOK = false; maxAnchorErrorPx = Infinity; continue;}
      const point = project(original, input.projection), expected = toCanvas(point, frame);
      const error = Math.hypot(node.x - expected.x, node.y - expected.y);
      maxAnchorErrorPx = Math.max(maxAnchorErrorPx, finite(error) ? error : Infinity);
      projectedOK = projectedOK && close(node.projected?.x, point.x) && close(node.projected?.y, point.y) && ids.filter(id => id === node.id).length === 1;
      rangeOK = rangeOK && finite(node.x) && finite(node.y) && node.x >= frame.x && node.x <= frame.x + frame.width && node.y >= frame.y && node.y <= frame.y + frame.height &&
        point.x >= b.minX && point.x <= b.maxX && point.y >= b.minY && point.y <= b.maxY;
    }
    if (frame.kind === 'primary') for (let i = 0; i < frame.nodes.length; i++) for (let j = i + 1; j < frame.nodes.length; j++) {
      const a = frame.nodes[i], b = frame.nodes[j];
      separations.push(Math.hypot(a.x - b.x, a.y - b.y));
      if (Math.abs(a.x - b.x) < layout.footprint && Math.abs(a.y - b.y) < layout.footprint) collisions.push({frameId: frame.id, a: a.id, b: b.id});
    }
  }
  add('scale', '各图幅等比缩放', scaleOK, 'X/Y 共用一个比例因子，剩余空间留白');
  add('range', '坐标与图幅范围', rangeOK, '无丢点、越界、非有限值或静默裁切');
  add('anchors', '投影锚点保持', projectedOK && maxAnchorErrorPx <= 1e-6, `相对计算锚点最大偏移 ${Number.isFinite(maxAnchorErrorPx) ? maxAnchorErrorPx.toFixed(6) : '不可计算'} px；该结果只证明布局自洽`);
  const relations = [
    {from: 'bell-tower', to: 'drum-tower', label: '鼓楼在钟楼西偏北', east: -1, north: 1},
    {from: 'bell-tower', to: 'pagoda', label: '大雁塔在钟楼南偏东', east: 1, north: -1},
    {from: 'bell-tower', to: 'terracotta', label: '兵马俑在钟楼东北', east: 1, north: 1},
  ];
  const directions = relations.map(relation => {
    const shared = frames.filter(f => f.nodes?.some(p => p.id === relation.from) && f.nodes?.some(p => p.id === relation.to));
    const frame = shared.find(f => f.kind === 'primary') ?? shared.find(f => f.kind === 'locator');
    const a = frame?.nodes.find(p => p.id === relation.from), b = frame?.nodes.find(p => p.id === relation.to);
    const actual = a && b ? {east: Math.sign(b.x - a.x), north: Math.sign(a.y - b.y)} : null;
    return {...relation, frameId: frame?.id ?? null, pass: Boolean(actual && actual.east === relation.east && actual.north === relation.north), actual};
  });
  add('directions', '约定方向关系', directions.every(d => d.pass), '每组只在同一图幅比较；分图中的全域关系使用定位小图');
  return {pass: checks.every(c => c.pass), checks, minSeparationPx: separations.length ? Math.min(...separations) : null,
    collisions, maxAnchorErrorPx, directions};
}
