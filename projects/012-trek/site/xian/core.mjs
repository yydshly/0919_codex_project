/** Rules for a three-day first visit. Durations and ranking are editorial estimates. */
export const DEFAULT_PROFILE = Object.freeze({
  party: 'couple', pace: 'balanced', interests: Object.freeze(['history', 'food']),
  days: 3, museumBooked: false,
});

export const DEFAULT_SELECTION = Object.freeze([
  'wall', 'bell-tower', 'tongshengxiang', 'terracotta',
  'shaanxi-museum', 'pagoda', 'tang-night',
]);

const INTEREST_TAGS = {
  history: ['历史', '博物馆', '建筑', '书法'],
  food: ['美食', '陕菜', '地方风味', '老字号'],
  outdoor: ['户外', '园林'],
  outdoors: ['户外', '园林'],
  walk: ['户外', '园林', '夜景'],
  nature: ['户外', '园林'],
  night: ['夜景'],
};
const AREAS = ['center', 'east', 'south'];
const TITLES = ['古城初见 · 城墙与地方风味', '临潼访秦 · 留给兵马俑的半天', '城南漫游 · 雁塔与长安夜色'];

function normalizeProfile(profile = {}) {
  return {
    party: typeof profile.party === 'string' ? profile.party : DEFAULT_PROFILE.party,
    pace: typeof profile.pace === 'string' ? profile.pace : DEFAULT_PROFILE.pace,
    interests: Array.isArray(profile.interests) ? [...new Set(profile.interests.filter(x => typeof x === 'string'))] : [...DEFAULT_PROFILE.interests],
    days: 3,
    museumBooked: profile.museumBooked === true,
  };
}

function isLight(profile) { return profile.party === 'parents' || profile.pace === 'relaxed'; }
function ids(values) { return [...new Set((Array.isArray(values) ? values : []).filter(x => typeof x === 'string'))]; }
function placeMap(places) { return new Map((Array.isArray(places) ? places : []).map(p => [p.id, p])); }
function minutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? ''));
  if (!match || +match[1] > 23 || +match[2] > 59) return null;
  return +match[1] * 60 + +match[2];
}
function clock(value) {
  const safe = Math.max(0, Math.min(1439, Math.round(value)));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
function stay(place) { return Number.isFinite(place?.duration) && place.duration > 0 ? place.duration : 60; }

/** Returns the original objects, in stable editorial order; no fabricated ratings. */
export function rankPlaces(places, profile = DEFAULT_PROFILE) {
  const p = normalizeProfile(profile);
  const wantsFood = p.interests.includes('food');
  const value = place => {
    const tags = new Set(place.tags || []);
    // First-visit landmarks get a small tie-breaker in the history-and-food mix.
    // A street with snacks should not outrank the main sights merely for matching two interests.
    let result = wantsFood && p.interests.includes('history') && tags.has('经典') ? 3 : 0;
    for (const interest of p.interests) {
      const relevant = INTEREST_TAGS[interest] || [interest];
      if (relevant.some(tag => tags.has(tag))) result += interest === 'food' && place.kind !== 'food' ? 2 : 6;
    }
    if (p.party === 'family' || p.party === 'kids' || p.party === 'children') {
      if (tags.has('亲子')) result += 5;
    }
    if (isLight(p)) {
      result -= Math.max(0, (Number(place.effort) || 1) - 1) * 4;
      if (tags.has('轻松')) result += 3;
    }
    return result;
  };
  const ranked = (Array.isArray(places) ? places : []).map((place, index) => ({place, index, weight: value(place)}))
    .sort((a, b) => b.weight - a.weight || a.index - b.index).map(entry => entry.place);
  if (!wantsFood) return ranked;
  // Preserve the relevance order within each type, while making both parts of the trip visible.
  const sights = ranked.filter(place => place.kind !== 'food');
  const restaurants = ranked.filter(place => place.kind === 'food');
  const mixed = [];
  let sightIndex = 0, foodIndex = 0;
  while (sightIndex < sights.length || foodIndex < restaurants.length) {
    mixed.push(...sights.slice(sightIndex, sightIndex + 3));
    sightIndex += 3;
    if (foodIndex < restaurants.length) mixed.push(restaurants[foodIndex++]);
  }
  return mixed;
}

function orderDay(candidates, dayIndex) {
  const priorities = dayIndex === 0
    ? ['wall', 'beilin', 'tongshengxiang', 'defachang', 'xian-fanzhuang', 'chunfasheng', 'bell-tower', 'drum-tower', 'xingqing']
    : dayIndex === 1 ? ['terracotta'] : ['shaanxi-museum', 'xingqing', 'pagoda', 'tang-night'];
  // One lunch first, further restaurants become dinner options at the end.
  const known = [...candidates].sort((a, b) => {
    const ai = priorities.indexOf(a.id), bi = priorities.indexOf(b.id);
    return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi);
  });
  if (dayIndex !== 0) return known;
  let hadFood = false;
  const lateMeals = [];
  const main = known.filter(place => {
    if (place.kind !== 'food') return true;
    if (!hadFood) { hadFood = true; return true; }
    lateMeals.push(place); return false;
  });
  return [...main, ...lateMeals];
}

function reduceLightDay(candidates, dayIndex, profile) {
  if (!isLight(profile) || dayIndex === 1 || candidates.length <= 3) return candidates;
  const preferred = dayIndex === 0
    ? ['wall', 'tongshengxiang', 'defachang', 'xian-fanzhuang', 'chunfasheng', 'bell-tower']
    : ['shaanxi-museum', 'xingqing', 'pagoda', 'tang-night'];
  const result = [];
  // Keep one meal and at least one main sight before taking secondary stops.
  const meal = candidates.find(p => p.kind === 'food');
  const sights = candidates.filter(p => p.kind !== 'food');
  const sortedSights = [...sights].sort((a, b) => {
    const ai = preferred.indexOf(a.id), bi = preferred.indexOf(b.id);
    return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi);
  });
  if (meal) result.push(meal);
  result.push(...sortedSights.slice(0, 3 - result.length));
  if (result.length < 3) result.push(...candidates.filter(p => !result.includes(p)).slice(0, 3 - result.length));
  return candidates.filter(p => result.includes(p));
}

function schedule(candidates, dayIndex, profile) {
  let cursor = dayIndex === 1 ? 10 * 60 : isLight(profile) ? 10 * 60 : 9 * 60;
  let meals = 0;
  return candidates.map(place => {
    let desired = cursor;
    if (place.kind === 'food') desired = Math.max(desired, ++meals === 1 ? 12 * 60 : 18 * 60);
    if (dayIndex === 0 && place.id === 'bell-tower') desired = Math.max(desired, 14 * 60);
    if (dayIndex === 2 && place.id === 'xingqing') desired = Math.max(desired, 10 * 60);
    if (dayIndex === 2 && place.id === 'pagoda') desired = Math.max(desired, 14 * 60);
    if (place.id === 'tang-night') desired = Math.max(desired, 18 * 60);
    const stop = {placeId: place.id, time: clock(desired)};
    // These are planning buffers, never presented as a live route estimate.
    cursor = desired + stay(place) + (isLight(profile) ? 45 : 30);
    return stop;
  });
}

/** Makes only the supported three-day itinerary. It does not book anything. */
export function makePlan(places, selectedIds = DEFAULT_SELECTION, profile = DEFAULT_PROFILE) {
  const p = normalizeProfile(profile);
  const requested = ids(selectedIds);
  p.selectedIds = requested;
  const map = placeMap(places);
  const selected = requested.map(id => map.get(id)).filter(Boolean);
  const replaceMuseum = requested.includes('shaanxi-museum') && !p.museumBooked;
  const groups = AREAS.map(area => selected.filter(place => place.area === area
    && !(replaceMuseum && (place.id === 'shaanxi-museum' || place.id === 'xingqing'))));
  // A deliberately disclosed exception: use an east-city park before heading south.
  if (replaceMuseum && map.has('xingqing')) groups[2].unshift(map.get('xingqing'));
  const plan = {
    title: '长安初见 · 西安首访', profile: p,
    days: groups.map((group, index) => ({
      title: TITLES[index],
      stops: schedule(reduceLightDay(orderDay(group, index), index, p), index, p),
    })),
  };
  plan.planWarnings = [...new Set(plan.days.flatMap((_, index) => dayWarnings(plan, index, places)))];
  return plan;
}

/** Derive warnings from persisted fields, so edits and a backend round-trip remain truthful. */
export function dayWarnings(plan, dayIndex, places) {
  const day = plan?.days?.[dayIndex];
  if (!day) return [];
  const p = normalizeProfile(plan.profile);
  const requested = ids(plan.profile?.selectedIds);
  const map = placeMap(places);
  const allStops = (plan.days || []).flatMap(d => Array.isArray(d.stops) ? d.stops : []);
  const allIds = new Set(allStops.map(stop => stop.placeId));
  const stops = Array.isArray(day.stops) ? day.stops : [];
  const actual = stops.map(stop => map.get(stop.placeId)).filter(Boolean);
  const messages = [];
  if (stops.length) messages.push('停留时长与交通间隔是规划估计，未计入实时排队、路况和临时闭馆；出发前请再次核实。');
  else messages.push('这一天尚未安排地点，可留作休息或按兴趣补充。');
  if (dayIndex === 0) {
    const unknown = requested.filter(id => !map.has(id));
    if (unknown.length) messages.push(`已忽略 ${unknown.length} 个不在当前地点库中的选择，未为未知地点生成路线。`);
  }
  const museumSubstituted = requested.includes('shaanxi-museum') && !p.museumBooked && !allIds.has('shaanxi-museum');
  if (dayIndex === 2 && museumSubstituted) {
    messages.push(allIds.has('xingqing')
      ? '陕历博本馆预约尚未确认，已用兴庆宫公园作为备选；确认预约后可重新生成行程。'
      : '陕历博本馆预约尚未确认，暂不安排入馆；请先完成官方预约。');
  }
  if (actual.some(place => place.id === 'shaanxi-museum')) {
    messages.push(p.museumBooked
      ? '陕历博按“已确认预约”安排；请把页面时间调整为订单场次，生成行程不会代替官方预约。'
      : '陕历博预约尚未确认：当前行程含该馆，请先核实预约，不能凭这份行程直接入馆。');
  }
  if (actual.some(place => place.id === 'beilin')) messages.push('碑林入馆、开放区域与预约情况需另行核实，本行程不代表已预约。');
  if (dayIndex === 1 && actual.some(place => place.area === 'east')) {
    messages.push('临潼与市中心相距较远，兵马俑单独保留半天参观，并另留往返交通和休息；请先确认官方预约场次。');
  }
  if (dayIndex === 2 && actual.some(place => place.id === 'xingqing') && actual.some(place => place.area === 'south')) {
    messages.push('兴庆宫在市区东部，之后需转往城南；已预留午间机动时间，实际交通请在导航中确认。');
  }
  if (isLight(p) && dayIndex !== 1) {
    const omitted = requested.map(id => map.get(id)).filter(place => place && place.area === AREAS[dayIndex]
      && !allIds.has(place.id) && !(place.id === 'shaanxi-museum' && museumSubstituted));
    if (omitted.length) messages.push(`为${p.party === 'parents' ? '带父母' : '轻松节奏'}减少项目，今天暂不安排：${omitted.map(place => place.name).join('、')}；保留选择，可切换节奏重新规划。`);
    if (stops.length > 3) messages.push('当前已有超过 3 个地点，超出轻松节奏建议；可移除次要项目并留出休息。');
  }
  const dwell = actual.reduce((sum, place) => sum + stay(place), 0);
  if (dwell > (isLight(p) ? 360 : 480) || stops.length > 5) messages.push(`今天仅停留就需约${formatDuration(dwell)}，还未计完整交通，安排偏满；建议删减。`);
  let previous = null;
  for (const stop of stops) {
    const place = map.get(stop.placeId);
    if (!place) { messages.push('行程含未知地点，无法核实其时长或路线，请重新选择。'); continue; }
    const start = minutes(stop.time);
    if (start === null) { messages.push(`${place.name}的时间格式无效，请使用 00:00—23:59。`); continue; }
    if (previous) {
      const gap = start - (previous.start + stay(previous.place));
      if (gap < 0) messages.push(`${previous.place.name}与${place.name}的停留时间重叠，请调整开始时间。`);
      else if (gap < 15) messages.push(`${previous.place.name}到${place.name}仅留 ${gap} 分钟，请补足交通、排队与休息时间。`);
    }
    if (start + stay(place) > 22 * 60) messages.push(`${place.name}预计结束较晚，请核实开放时间并考虑提前。`);
    previous = {place, start};
  }
  if (new Set(stops.map(stop => stop.placeId)).size !== stops.length) messages.push('同一天重复安排了地点，请检查是否需要保留两次访问。');
  return [...new Set(messages)];
}

export function formatDuration(value) {
  const total = Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;
  const hours = Math.floor(total / 60), remaining = total % 60;
  return hours ? `${hours}小时${remaining ? `${remaining}分钟` : ''}` : `${remaining}分钟`;
}

function wgs84ToGcj02(lat, lng) {
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lat, lng];
  const x = lng - 105, y = lat - 35, pi = Math.PI;
  let dlat = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x));
  dlat += (20*Math.sin(6*x*pi) + 20*Math.sin(2*x*pi))*2/3;
  dlat += (20*Math.sin(y*pi) + 40*Math.sin(y*pi/3))*2/3;
  dlat += (160*Math.sin(y*pi/12) + 320*Math.sin(y*pi/30))*2/3;
  let dlng = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x));
  dlng += (20*Math.sin(6*x*pi) + 20*Math.sin(2*x*pi))*2/3;
  dlng += (20*Math.sin(x*pi) + 40*Math.sin(x*pi/3))*2/3;
  dlng += (150*Math.sin(x*pi/12) + 300*Math.sin(x*pi/30))*2/3;
  const a = 6378245, ee = 0.00669342162296594323, rad = lat*pi/180;
  const magic = 1 - ee*Math.sin(rad)**2, root = Math.sqrt(magic);
  dlat = dlat*180 / ((a*(1-ee))/(magic*root)*pi);
  dlng = dlng*180 / (a/root*Math.cos(rad)*pi);
  return [lat + dlat, lng + dlng];
}

export function amapUrl(place) {
  const lat = Number(place?.lat), lng = Number(place?.lng);
  if (place?.lat == null || place?.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)
    || Math.abs(lat) > 90 || Math.abs(lng) > 180) return '';
  const [targetLat, targetLng] = wgs84ToGcj02(lat, lng);
  const query = new URLSearchParams({
    position: `${targetLng.toFixed(6)},${targetLat.toFixed(6)}`,
    name: String(place.name || place.address || '目的地'),
    coordinate: 'gaode', callnative: '1',
  });
  return `https://uri.amap.com/marker?${query}`;
}
