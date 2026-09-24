export const KEY = 'spec-kit-repo-shelf:v1';
const now = () => new Date().toISOString();
export function canonicalize(value) {
  let input=String(value).trim();
  if (/^github\.com\//i.test(input)) input='https://'+input;
  let url;
  try { url=new URL(input); } catch { throw new Error('请填写完整的 GitHub 仓库首页链接，例如 https://github.com/github/spec-kit。'); }
  if (!['https:','http:'].includes(url.protocol) || url.hostname.toLowerCase()!=='github.com' || url.username || url.password || url.port)
    throw new Error('仅支持 github.com 仓库首页，不接受其他网站或带登录信息的链接。');
  const parts=url.pathname.replace(/\/+$/,'').split('/').filter(Boolean);
  if(parts.length!==2) throw new Error('请粘贴仓库首页链接，不要使用 issues、tree 等子页面。');
  const owner=parts[0],repo=parts[1].replace(/\.git$/i,'');
  if(!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(owner)||! /^[a-z0-9_.-]+$/i.test(repo)||['.','..'].includes(repo))
    throw new Error('仓库链接中的作者或项目名称格式不正确。');
  const canonicalKey=(owner+'/'+repo).toLowerCase();
  return {url:'https://github.com/'+canonicalKey,canonicalKey};
}
export function normalizeFields(fields) {
  const name=fields.name.trim(),notes=fields.notes.trim();
  if(!name || name.length>80)throw new Error('项目名称不能为空，最多填写 80 个字符。');
  if(notes.length>300)throw new Error('备注最多填写 300 个字符。');
  const tags=[...new Set(fields.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean))];
  if(tags.length>6)throw new Error('最多填写 6 个标签，请用逗号分隔。');
  if(tags.some(t=>t.length>20))throw new Error('每个标签最多填写 20 个字符。');
  return {name,notes,tags,...canonicalize(fields.url)};
}
function assertCollection(value) {
  if(!value || value.schemaVersion!==1 || !Array.isArray(value.repositories) || !Number.isFinite(Date.parse(value.updatedAt)))throw new Error('unsupported');
  const ids=new Set(),keys=new Set();
  for(const r of value.repositories){
    if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||typeof r.notes!=='string'||r.notes.length>300||!Array.isArray(r.tags)||r.tags.length>6||r.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>20)||!['pending','reviewed'].includes(r.status)||typeof r.sample!=='boolean'||!Number.isFinite(Date.parse(r.createdAt))||!Number.isFinite(Date.parse(r.updatedAt)))throw new Error('invalid');
    const canonical=canonicalize(r.url);
    if(r.url!==canonical.url||r.canonicalKey!==canonical.canonicalKey||keys.has(r.canonicalKey))throw new Error('invalid');
    ids.add(r.id);keys.add(r.canonicalKey);
  }
  return value;
}
export function rawValue(){try{return localStorage.getItem(KEY);}catch{throw new Error('浏览器不允许读取本机存储，请检查浏览器设置。');}}
export function read(){
  const raw=rawValue();
  if(raw===null)return null;
  try{return assertCollection(JSON.parse(raw));}catch{throw new Error('本机收藏数据损坏或版本不受支持。原始内容已保留，请导出原始数据供恢复；当前禁止修改。');}
}
function write(collection){
  try{localStorage.setItem(KEY,JSON.stringify(collection));}
  catch{throw new Error('未保存：浏览器阻止了写入，或本机存储空间不足。原有记录和输入已保留。');}
  return collection;
}
function seed(){
  const date=now();
  return {schemaVersion:1,updatedAt:date,repositories:[
    {id:'sample-spec-kit',name:'Spec Kit',url:'https://github.com/github/spec-kit',canonicalKey:'github/spec-kit',tags:['AI 编程','工作流程'],notes:'本次实际演示使用的工具：把需求、方案、任务和检查连接起来。',status:'reviewed',sample:true,createdAt:date,updatedAt:date},
    {id:'sample-videocaptioner',name:'VideoCaptioner',url:'https://github.com/weifeng2333/videocaptioner',canonicalKey:'weifeng2333/videocaptioner',tags:['视频','字幕'],notes:'继续研究字幕识别、翻译与配音的使用方式。',status:'pending',sample:true,createdAt:date,updatedAt:date},
    {id:'sample-blinko',name:'Blinko',url:'https://github.com/blinkospace/blinko',canonicalKey:'blinkospace/blinko',tags:['笔记','知识整理'],notes:'对比个人笔记、检索与 AI 问答能力。',status:'pending',sample:true,createdAt:date,updatedAt:date}
  ]};
}
export function initialize(){return read()??write(seed());}
function mutate(change){
  const current=read()??{schemaVersion:1,updatedAt:now(),repositories:[]};
  const next=structuredClone(current);
  const result=change(next.repositories);
  next.updatedAt=now();
  write(next);
  return {collection:next,result};
}
export function add(fields){
  const normalized=normalizeFields(fields);
  return mutate(items=>{
    if(items.some(r=>r.canonicalKey===normalized.canonicalKey))throw new Error('这个仓库已收藏，没有重复添加，也没有覆盖原来的备注。');
    const date=now();
    items.unshift({id:crypto.randomUUID(),...normalized,status:'pending',sample:false,createdAt:date,updatedAt:date});
  }).collection;
}
export function toggle(id){return mutate(items=>{const item=items.find(r=>r.id===id);if(!item)throw new Error('这个项目已在其他页面移除，请刷新列表。');item.status=item.status==='pending'?'reviewed':'pending';item.updatedAt=now();}).collection;}
export function remove(id){return mutate(items=>{const position=items.findIndex(r=>r.id===id);if(position<0)throw new Error('这个项目已在其他页面移除，请刷新列表。');const [item]=items.splice(position,1);return {item,position};});}
export function restore(deleted){return mutate(items=>{if(items.some(r=>r.canonicalKey===deleted.item.canonicalKey))throw new Error('这个仓库已经在收藏中，无需重复恢复。');items.splice(Math.min(deleted.position,items.length),0,deleted.item);}).collection;}
