import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFAULT_PROFILE, DEFAULT_SELECTION, rankPlaces, makePlan, dayWarnings, amapUrl, formatDuration} from '../site/xian/core.mjs';

const {places} = JSON.parse(await readFile(new URL('../site/xian/places.json', import.meta.url), 'utf8'));
const get = id => places.find(place => place.id === id);
const stopIds = plan => plan.days.flatMap(day => day.stops.map(stop => stop.placeId));

const original = JSON.stringify(places);
const baseline = makePlan(places, DEFAULT_SELECTION, DEFAULT_PROFILE);
assert.equal(baseline.title, '长安初见 · 西安首访');
assert.equal(baseline.days.length, 3);
assert.deepEqual(baseline.days[0].stops.map(stop => stop.placeId), ['wall', 'tongshengxiang', 'bell-tower']);
assert.deepEqual(baseline.days[1].stops.map(stop => stop.placeId), ['terracotta']);
assert.deepEqual(baseline.days[2].stops.map(stop => stop.placeId), ['xingqing', 'pagoda', 'tang-night']);
assert.equal(baseline.days[2].stops.at(-1).time, '18:00');
assert.equal(new Set(stopIds(baseline)).size, stopIds(baseline).length);
assert(!stopIds(baseline).includes('shaanxi-museum'));
assert(dayWarnings(baseline, 2, places).some(text => text.includes('预约尚未确认')));
assert(dayWarnings(baseline, 1, places).some(text => text.includes('往返交通')));
assert(!baseline.planWarnings.some(text => text.includes('重叠')));

const booked = makePlan(places, DEFAULT_SELECTION, {...DEFAULT_PROFILE, museumBooked: true});
assert(stopIds(booked).includes('shaanxi-museum'));
assert(!stopIds(booked).includes('xingqing'));
assert(dayWarnings(booked, 2, places).some(text => text.includes('订单场次')));
const noMuseum = makePlan(places, ['pagoda'], DEFAULT_PROFILE);
assert.deepEqual(stopIds(noMuseum), ['pagoda']);
assert(!noMuseum.planWarnings.some(text => text.includes('预约尚未确认')));

const duplicates = makePlan(places, [...DEFAULT_SELECTION, 'wall', 'xingqing', 'xingqing', 'unknown-place'], DEFAULT_PROFILE);
assert.equal(new Set(stopIds(duplicates)).size, stopIds(duplicates).length);
assert(!stopIds(duplicates).includes('unknown-place'));
assert(duplicates.planWarnings.some(text => text.includes('未知地点')));
assert.equal(duplicates.days[0].stops.some(stop => stop.placeId === 'xingqing'), false);
const empty = makePlan(places, [], DEFAULT_PROFILE);
assert.equal(stopIds(empty).length, 0);

const all = places.map(place => place.id);
for (const lightProfile of [{...DEFAULT_PROFILE, party: 'parents'}, {...DEFAULT_PROFILE, pace: 'relaxed'}]) {
  const light = makePlan(places, all, lightProfile);
  assert(light.days[0].stops.length <= 3);
  assert(light.days[2].stops.length <= 3);
  assert(light.planWarnings.some(text => text.includes('减少项目')));
  assert.equal(new Set(stopIds(light)).size, stopIds(light).length);
  // Simulate the backend accepting only documented fields and discarding top-level warnings.
  const persisted = JSON.parse(JSON.stringify({title: light.title, profile: light.profile, days: light.days}));
  assert(dayWarnings(persisted, 0, places).some(text => text.includes('减少项目')));
  assert(dayWarnings(persisted, 2, places).some(text => text.includes('预约尚未确认')));
}

const conflict = JSON.parse(JSON.stringify(baseline));
conflict.days[0].stops[1].time = '09:30';
assert(dayWarnings(conflict, 0, places).some(text => text.includes('重叠')));
conflict.days[0].stops[1].time = '10:35';
assert(dayWarnings(conflict, 0, places).some(text => text.includes('仅留 5 分钟')));
conflict.days[0].stops[1].time = '25:30';
assert(dayWarnings(conflict, 0, places).some(text => text.includes('时间格式无效')));
conflict.days[0].stops.push({placeId: 'missing', time:'17:00'});
assert(dayWarnings(conflict, 0, places).some(text => text.includes('行程含未知地点')));
const overloaded = {profile: DEFAULT_PROFILE, days:[{stops:[{placeId:'terracotta',time:'09:00'},{placeId:'shaanxi-museum',time:'13:00'},{placeId:'beilin',time:'16:00'},{placeId:'wall',time:'19:00'}]}]};
assert(dayWarnings(overloaded, 0, places).some(text => text.includes('安排偏满')));

const foodRanking = rankPlaces(places, {...DEFAULT_PROFILE, interests:['food']});
assert(foodRanking[0].tags.includes('美食'));
const mixedRanking = rankPlaces(places, DEFAULT_PROFILE);
assert.equal(mixedRanking[3].id, 'tongshengxiang');
assert.deepEqual(mixedRanking.slice(0, 2).map(place => place.id), ['terracotta', 'wall']);
assert(mixedRanking.indexOf(get('wall')) < mixedRanking.indexOf(get('drum-tower')));
assert(mixedRanking.indexOf(get('terracotta')) < mixedRanking.indexOf(get('drum-tower')));
assert.deepEqual(mixedRanking.slice(0, 12).map(place => place.kind), [
  'sight','sight','sight','food','sight','sight','sight','food','sight','sight','sight','food',
]);
assert.equal(mixedRanking.length, places.length);
assert.equal(new Set(mixedRanking).size, places.length);
assert.deepEqual(mixedRanking.filter(place => place.kind === 'food'), places.filter(place => place.kind === 'food'));
const noFoodProfile = {...DEFAULT_PROFILE, interests:['history']};
const historicFirst = [...places.filter(place => place.tags.some(tag => ['历史','博物馆','建筑','书法'].includes(tag))),
  ...places.filter(place => !place.tags.some(tag => ['历史','博物馆','建筑','书法'].includes(tag)))];
assert.deepEqual(rankPlaces(places, noFoodProfile), historicFirst, 'Without food interest preserve the original relevance/stable ordering');
const shortMix = [
  {id:'s-low',kind:'sight',tags:[],effort:1},
  {id:'f-low',kind:'food',tags:[],effort:1},
  {id:'s-high',kind:'sight',tags:['历史'],effort:1},
  {id:'f-high',kind:'food',tags:['美食'],effort:1},
];
assert.deepEqual(rankPlaces(shortMix, DEFAULT_PROFILE).map(place => place.id), ['s-high','s-low','f-high','f-low']);
assert.deepEqual(rankPlaces([], DEFAULT_PROFILE), []);
const outdoorRanking = rankPlaces(places, {...DEFAULT_PROFILE, interests:['outdoor']});
assert(outdoorRanking[0].tags.includes('户外') || outdoorRanking[0].tags.includes('园林'));
const walkRanking = rankPlaces(places, {...DEFAULT_PROFILE, interests:['walk']});
const neutralRanking = rankPlaces(places, {...DEFAULT_PROFILE, interests:[]});
assert.notDeepEqual(walkRanking.map(place => place.id), neutralRanking.map(place => place.id), 'The UI walk interest must affect ranking');
const walkMatches = places.filter(place => place.tags.some(tag => ['户外','园林','夜景'].includes(tag)));
assert.deepEqual(walkRanking.slice(0, walkMatches.length), walkMatches, 'Walking promotes outdoor, garden and night-scene places in stable order');
const effortSamples = [{id:'hard',tags:['历史'],effort:3},{id:'easy',tags:['历史','轻松'],effort:1}];
assert.equal(rankPlaces(effortSamples, {...DEFAULT_PROFILE, party:'parents'})[0], effortSamples[1]);
const familySamples = [{id:'a',tags:['历史'],effort:1},{id:'b',tags:['历史','亲子'],effort:1}];
assert.equal(rankPlaces(familySamples, {...DEFAULT_PROFILE, party:'family'})[0], familySamples[1]);
assert(foodRanking.every(place => places.includes(place)));
assert.equal(JSON.stringify(places), original);

const navigation = new URL(amapUrl(get('tongshengxiang')));
const [lng,lat] = navigation.searchParams.get('position').split(',').map(Number);
assert.equal(navigation.origin, 'https://uri.amap.com');
assert.equal(navigation.pathname, '/marker');
assert.equal(navigation.searchParams.get('coordinate'), 'gaode');
assert.equal(navigation.searchParams.get('callnative'), '1');
assert.equal(navigation.searchParams.get('name'), get('tongshengxiang').name);
assert(Math.abs(lng-108.945254) < 0.00003, 'WGS84 must be converted back near the verified GCJ02 source');
assert(Math.abs(lat-34.260282) < 0.00003);
assert.equal(amapUrl({lat:null,lng:108}), '');
assert.equal(amapUrl({lat:NaN,lng:108}), '');
assert.equal(new URL(amapUrl({name:'London',lat:51.5,lng:-0.1})).searchParams.get('position'), '-0.100000,51.500000');
assert.equal(formatDuration(90), '1小时30分钟');
assert.equal(formatDuration(120), '2小时');
assert.equal(formatDuration(45), '45分钟');
assert.equal(formatDuration(-5), '0分钟');
console.log('西安规则验证通过：分区、去重、预约、减量提示、编辑冲突、推荐偏好与导航坐标。');
