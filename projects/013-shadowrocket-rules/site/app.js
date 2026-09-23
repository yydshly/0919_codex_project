'use strict';
const repo = 'https://github.com/Johnshall/Shadowrocket-ADBlock-Rules-Forever';
const buildCommit = 'ff8ecea54bb71deaab5ef13bfd466e7da03a50fa';
const releaseCommit = '1df281947ae906e6dd8440bb540eff11312aa74f';
document.querySelectorAll('[data-source], [data-release], [data-config]').forEach(link => {
  const path = link.dataset.source || link.dataset.release || link.dataset.config;
  const ref = link.dataset.source ? buildCommit : link.dataset.release ? releaseCommit : 'release';
  link.href = `${repo}/blob/${ref}/${path}`;
  link.target = '_blank';
  link.rel = 'noreferrer';
});
const samples = {
  ad: {domain: 'ads.example.test'}, cn: {domain: 'service-cn.example.test'},
  listed: {domain: 'listed-overseas.example.test'}, unknown: {domain: 'unknown-overseas.example.test'}
};
const mode = document.querySelector('#mode');
const request = document.querySelector('#request');
function renderDecision() {
  const type = request.value;
  const current = mode.value;
  let result, rule, match, reason;
  if (type === 'ad') {
    result = 'REJECT'; rule = 'DOMAIN-SUFFIX,ads.example.test,REJECT'; match = '域名名单';
    reason = '广告域名已在拦截名单中，因此拒绝该请求。不会向广告服务器获取内容。';
  } else if (current === 'direct') {
    result = 'DIRECT'; rule = 'FINAL,DIRECT'; match = '直连兜底';
    reason = '该样本未命中广告规则；直连去广告模式将剩余请求直接连接到目标服务。';
  } else if (current === 'back') {
    result = type === 'cn' ? 'PROXY' : 'DIRECT'; rule = type === 'cn' ? 'GEOIP,CN,PROXY' : 'FINAL,DIRECT'; match = type === 'cn' ? '中国 IP' : '直连兜底';
    reason = type === 'cn' ? '回国策略把此中国 IP 请求交给代理，需要你提供可用的国内出口节点。' : '这个海外服务样本没有命中回国代理规则，使用直连。';
  } else if (current === 'black') {
    result = type === 'listed' ? 'PROXY' : 'DIRECT'; rule = type === 'listed' ? `DOMAIN-SUFFIX,${samples[type].domain},PROXY` : 'FINAL,DIRECT'; match = type === 'listed' ? '代理名单' : '直连兜底';
    reason = type === 'listed' ? '站点已列入代理名单，交给你配置的代理出口。' : '该样本不在代理名单中。黑名单模式对未命中的请求默认直连。';
  } else {
    result = type === 'cn' ? 'DIRECT' : 'PROXY'; rule = type === 'cn' ? 'GEOIP,CN,DIRECT' : 'FINAL,PROXY'; match = type === 'cn' ? '中国 IP' : '代理兜底';
    reason = type === 'cn' ? '此样本的目标 IP 归类为中国，且没有更早的例外规则，因此直连。' : current === 'white' ? '此海外样本不在直连白名单中，剩余请求按默认策略走代理。' : '此样本的目标 IP 不属于中国，且没有更早的例外规则，因此由兜底策略走代理。';
  }
  const labels = {REJECT: '拦截', DIRECT: '直连', PROXY: '代理'};
  document.querySelector('#request-domain').textContent = samples[type].domain;
  document.querySelector('#match-type').textContent = match;
  document.querySelector('#result-label').textContent = labels[result];
  document.querySelector('#result-code').textContent = result;
  document.querySelector('#result-node').dataset.result = result;
  document.querySelector('#rule-code').textContent = rule;
  document.querySelector('#result-reason').textContent = reason;
}
mode.addEventListener('change', renderDecision);
request.addEventListener('change', renderDecision);
renderDecision();
const sections = [...document.querySelectorAll('main > section')];
const links = [...document.querySelectorAll('nav a')];
function updateNavigation() {
  let current = sections[0].id;
  for (const section of sections) if (section.getBoundingClientRect().top <= 160) current = section.id;
  if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1].id;
  for (const link of links) {
    const active = link.hash === `#${current}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  }
}
let scheduled = false;
window.addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { updateNavigation(); scheduled = false; });
}, {passive: true});
updateNavigation();
