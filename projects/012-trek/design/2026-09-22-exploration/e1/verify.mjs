import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeInput, validateInput, project, haversine, buildLayout, auditLayout} from './core.mjs';

const baselineURL = new URL('../data/baseline-places.json', import.meta.url);
const raw = await readFile(baselineURL);
const input = makeInput(JSON.parse(raw));
const baselineHash = createHash('sha256').update(raw).digest('hex');
assert.equal(baselineHash, '7b363a3a44d8dc94c75851683d82ae313216d889a9eaf71dd422052da4d94dd3', 'E1 baseline changed; independently review the new input before accepting updated results');
assert.equal(validateInput(input).valid, true);
const byID = Object.fromEntries(input.places.map(p => [p.id, p]));
const close = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

// Constants were separately calculated with Python's math module from the frozen input.
const projectionBenchmarks = {
  'bell-tower': {x: 215.224801077, y: 112.518301689},
  'drum-tower': {x: -106.431462542, y: 196.337153168},
  pagoda: {x: 1785.274974694, y: -4470.398049645},
  terracotta: {x: 31032.753001387, y: 14162.105645259},
};
const distances = [
  {from: 'bell-tower', to: 'drum-tower', meters: 332.393, bearingDegrees: 284.606832},
  {from: 'bell-tower', to: 'pagoda', meters: 4844.515, bearingDegrees: 161.080280},
  {from: 'bell-tower', to: 'terracotta', meters: 33847.587, bearingDegrees: 65.380946},
];
for (const [id, expected] of Object.entries(projectionBenchmarks)) {
  const actual = project(byID[id], input.projection);
  close(actual.x, expected.x, 0.000001, `${id} projected X meters`);
  close(actual.y, expected.y, 0.000001, `${id} projected Y meters`);
}
for (const reference of distances) {
  close(haversine(byID[reference.from], byID[reference.to]), reference.meters, 0.001, 'Independent spherical distance');
  close(haversine(byID[reference.to], byID[reference.from]), reference.meters, 0.001, 'Distance symmetry');
}
assert.equal(haversine(byID.pagoda, byID.pagoda), 0);
const origin = project({lon: input.projection.lon0, lat: input.projection.lat0}, input.projection);
assert.deepEqual(origin, {x: 0, y: 0});

const layouts = Object.fromEntries(['continuous', 'split'].map(mode => [mode, buildLayout(input, mode)]));
const normal = Object.fromEntries(Object.entries(layouts).map(([mode, layout]) => [mode, auditLayout(input, layout)]));
for (const mode of ['continuous', 'split']) {
  assert.equal(normal[mode].pass, true, `${mode} geographic consistency`);
  assert.equal(normal[mode].maxAnchorErrorPx, 0);
  assert.equal(normal[mode].directions.every(d => d.pass), true);
  const nodeCount = layouts[mode].frames.filter(f => f.kind === 'primary').reduce((sum, f) => sum + f.nodes.length, 0);
  assert.equal(nodeCount, 4);
  for (const frame of layouts[mode].frames) for (const node of frame.nodes) {
    // Independent inverse test: the pixel node must recover the separately computed meter benchmark.
    const xMeters = (node.x - frame.x - frame.width / 2) / frame.scale + (frame.bounds.minX + frame.bounds.maxX) / 2;
    const yMeters = -(node.y - frame.y - frame.height / 2) / frame.scale + (frame.bounds.minY + frame.bounds.maxY) / 2;
    close(xMeters, projectionBenchmarks[node.id].x, 0.000001, 'Pixel inverse X');
    close(yMeters, projectionBenchmarks[node.id].y, 0.000001, 'Pixel inverse Y');
  }
}
assert.equal(normal.continuous.collisions.length, 1, '84px continuous layout shows the clock/drum crowding');
assert.equal(normal.split.collisions.length, 0, '84px split layout resolves this sample crowding');
assert.ok(normal.split.minSeparationPx > normal.continuous.minSeparationPx);
const enlarged = auditLayout(input, buildLayout(input, 'split', {footprint: 120}));
assert.equal(enlarged.pass, true, 'Visual occupancy collisions must not masquerade as geographic inconsistency');
assert.equal(enlarged.collisions.length, 1);

const faultCases = [];
for (const mode of ['continuous', 'split']) {
  const audit = auditLayout(input, buildLayout(input, mode, {fault: 'flip-drum'}));
  assert.equal(audit.pass, false);
  assert.equal(audit.checks.find(c => c.id === 'anchors').pass, false);
  assert.equal(audit.checks.find(c => c.id === 'directions').pass, false);
  faultCases.push({id: `flip-drum-${mode}`, detected: true, failedChecks: audit.checks.filter(c => !c.pass).map(c => c.id), maxAnchorErrorPx: audit.maxAnchorErrorPx});
}
for (const mode of ['continuous', 'split']) {
  const corrupt = structuredClone(layouts[mode]);
  corrupt.frames[0].scale *= 1.1;
  const audit = auditLayout(input, corrupt);
  assert.equal(audit.pass, false);
  assert.equal(audit.checks.find(c => c.id === 'scale').pass, false);
  faultCases.push({id: `scale-${mode}`, detected: true, failedChecks: audit.checks.filter(c => !c.pass).map(c => c.id)});
}
const mutations = [
  ['swapped-coordinates', x => {const p = x.places[0]; [p.lon, p.lat] = [p.lat, p.lon];}, 'COORDINATE'],
  ['missing-crs', x => {delete x.places[0].crs;}, 'CRS'],
  ['mixed-gcj02', x => {x.places[1].crs = 'GCJ-02';}, 'CRS'],
  ['missing-id', x => {delete x.places[0].id;}, 'ID'],
  ['missing-place', x => {x.places.pop();}, 'MISSING_ID'],
  ['duplicate-id', x => {x.places[1].id = x.places[0].id;}, 'DUPLICATE_ID'],
  ['unknown-role', x => {x.places[0].role = 'unknown';}, 'ROLE'],
  ['center-as-entrance', x => {x.places[0].role = 'entrance';}, 'ROLE'],
  ['missing-source', x => {delete x.places[0].sourceUrl;}, 'SOURCE'],
  ['null-latitude', x => {x.places[0].lat = null;}, 'COORDINATE'],
  ['string-longitude', x => {x.places[0].lon = '108.9423419';}, 'COORDINATE'],
  ['empty-latitude', x => {x.places[0].lat = '';}, 'COORDINATE'],
  ['nan-coordinate', x => {x.places[0].lat = NaN;}, 'COORDINATE'],
  ['infinite-coordinate', x => {x.places[0].lon = Infinity;}, 'COORDINATE'],
  ['boolean-coordinate', x => {x.places[0].lat = true;}, 'COORDINATE'],
  ['outside-region', x => {x.places[0].lon = 120;}, 'OUTSIDE_REGION'],
  ['invalid-bounds', x => {x.region.east = x.region.west;}, 'REGION'],
  ['invalid-projection', x => {x.projection.radius = 0;}, 'PROJECTION'],
];
const rejectionCases = mutations.map(([id, mutate, expectedCode]) => {
  const candidate = structuredClone(input);
  mutate(candidate);
  const result = validateInput(candidate);
  assert.equal(result.valid, false, id);
  assert.ok(result.errors.some(e => e.code === expectedCode), `${id} expected ${expectedCode}`);
  assert.throws(() => buildLayout(candidate, 'continuous'), TypeError, `${id} prevents drawing`);
  return {id, rejected: true, codes: [...new Set(result.errors.map(e => e.code))]};
});
const report = {
  experiment: 'E1', checkedAt: new Date().toISOString(), status: 'passed-for-layout-consistency-only',
  baseline: {path: '../data/baseline-places.json', sha256: baselineHash},
  projectionBenchmarks, independentDistanceReference: {method: 'spherical haversine', radiusMeters: 6371008.8, distances,
    limitation: 'Straight-line reference from frozen coordinates; not a road route, travel time, or verified entrance.'},
  normal, enlargedFootprintDiagnostic: {footprint: 120, geographicConsistencyPass: enlarged.pass, collisions: enlarged.collisions},
  faultCases, rejectionCases,
  boundary: {externalGeographicFacts: 'not-reverified', entranceCoordinates: 'unknown', artworkAppearance: 'not-tested',
    labelCollision: 'browser-rendered labels need separate inspection; occupancy squares are not label boxes', roadRouting: 'not-tested'},
};
await writeFile(new URL('./results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
for (const [mode, layout] of Object.entries(layouts)) await writeFile(new URL(`./layout-normal-${mode}.json`, import.meta.url), JSON.stringify(layout, null, 2) + '\n');
console.log(JSON.stringify({status: report.status, baselineHash, rejectionCases: rejectionCases.length, detectedFaults: faultCases.length,
  continuous: {minSeparationPx: normal.continuous.minSeparationPx, collisions: normal.continuous.collisions.length},
  split: {minSeparationPx: normal.split.minSeparationPx, collisions: normal.split.collisions.length}, report: 'e1/results.json'}, null, 2));
