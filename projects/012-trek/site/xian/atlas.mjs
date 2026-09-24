/** Interactive index over the existing city-atlas research image.
 * The art coordinates below are label hit areas, never geographic coordinates.
 * onAdd(id) toggles a place in the caller's selection; the caller owns persistence.
 */
const HOTSPOTS = [
  { id: 'terracotta', x: 91.55, y: 35.05, w: 6.0, h: 4.2 },
  { id: 'wall', x: 47.45, y: 52.05, w: 5.7, h: 4.2 },
  { id: 'shaanxi-museum', x: 35.35, y: 66.55, w: 10.0, h: 4.0 },
  { id: 'pagoda', x: 49.8, y: 67.4, w: 6.0, h: 4.1 },
  { id: 'tang-night', x: 45.55, y: 76.45, w: 7.2, h: 3.8 },
  { id: 'bell-tower', x: 47.65, y: 43.15, w: 5.1, h: 4.1 },
  { id: 'drum-tower', x: 33.85, y: 42.75, w: 5.0, h: 4.0 },
];
const AREA = {
  center: { label: '古城与市区', text: '钟鼓楼、城墙与市区风味可以分段串联；具体位置请在真实地图查看。', representative: 'wall' },
  east: { label: '临潼方向', text: '兵马俑位于临潼，与主城区分开安排，留出往返交通时间。', representative: 'terracotta' },
  south: { label: '城南片区', text: '雁塔周边适合与傍晚街区游览衔接；博物馆需先确认预约。', representative: 'pagoda' },
};
const EXTRAS = ['tongshengxiang', 'defachang', 'xian-fanzhuang', 'chunfasheng', 'beilin', 'xingqing'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function photoURL(value) {
  if (typeof value !== 'string' || !value) return null;
  if (/^https?:\/\//i.test(value) || (!/^[a-z]+:/i.test(value) && !value.startsWith('//'))) return value;
  return null;
}

export function createAtlas({ container, places, photos = {}, onAdd, onDetail, onPlan, onNavigate, onProfile }) {
  if (!container || typeof container.querySelector !== 'function') throw new TypeError('createAtlas requires a container element');
  const list = Array.isArray(places) ? places : places?.places || [];
  const byId = new Map(list.map(place => [place.id, place]));
  let currentId = byId.has('terracotta') ? 'terracotta' : list[0]?.id;
  let selected = new Set(), plan = null, profile = {}, pending = false, lastExternalFocus;
  let zoom = 1;
  container.classList.add('xian-atlas');
  container.innerHTML = `
    <header class="atlas-heading">
      <div><p class="atlas-eyebrow">从城市印象，到自己的旅行</p><h2>一张图，看懂第一次西安</h2><p class="atlas-subtitle">先点一个想去的地方，再看看是否适合放进你的行程。</p></div>
      <div class="atlas-heading-actions"><button type="button" data-atlas-profile>调整这次旅行的偏好</button><span class="atlas-map-note">城市景观示意 · 非导航地图</span></div>
    </header>
    <div class="atlas-layout">
      <div class="atlas-main">
        <div class="atlas-toolbar">
          <div class="atlas-regions" aria-label="按片区探索">
            <span>先看哪里</span><button type="button" data-atlas-region="center">古城</button><button type="button" data-atlas-region="east">临潼</button><button type="button" data-atlas-region="south">城南</button>
          </div>
          <div class="atlas-zoom" aria-label="图稿缩放"><span>放大看</span>${[1, 1.5, 2].map(value => `<button type="button" data-atlas-zoom="${value}" aria-label="图稿缩放 ${value} 倍" aria-pressed="${value === 1}">${value}×</button>`).join('')}</div>
        </div>
        <div class="atlas-image-scroll" tabindex="0" aria-label="西安景观研究图，可放大后横向或纵向滚动查看">
          <div class="atlas-image-stage" style="--atlas-zoom:1">
            <img class="atlas-image" src="atlas/xian-macro-v2.png" width="1536" height="1024" alt="城景工坊西安与周边景观研究图：城墙与钟鼓楼、兵马俑、雁塔等地标的艺术示意，部分方位仍待校正。带轮廓的七个标签可以点击。" decoding="async">
            <div class="atlas-image-unavailable" hidden>图稿暂未加载，请先从片区或图下地点继续探索。</div>
            ${HOTSPOTS.filter(h => byId.has(h.id)).map(h => `<button type="button" class="atlas-hotspot" data-atlas-hotspot="${h.id}" style="left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%" aria-label="查看${esc(byId.get(h.id).name)}" aria-pressed="false"><span class="atlas-hotspot-icon" aria-hidden="true">＋</span><span class="atlas-sr-only">${esc(byId.get(h.id).name)}</span></button>`).join('')}
          </div>
        </div>
        <div class="atlas-legend"><span><i class="atlas-key-focus"></i>正在看</span><span><i class="atlas-key-added">✓</i>已加入旅行</span><span class="atlas-scroll-hint">点击有轮廓的标签 · 放大后可滚动查看</span></div>
        <p class="atlas-provenance">沿用城景工坊研究图稿，部分方位仍待校正；实际位置与道路以真实地图为准。位置及距离经艺术压缩，图中范围不代表本次已接入全部周边地点。</p>
      </div>
      <aside class="atlas-detail" aria-label="图中地点与旅行选择"></aside>
    </div>
    <section class="atlas-extras"><div><h3>图上没有的，也别错过</h3><p>四家地方风味，以及两处值得补充的市区目的地。点击看推荐理由。</p></div><div class="atlas-extra-list"></div></section>
    <section class="atlas-plan-summary" aria-label="我的旅行概览"></section>`;
  const panel = container.querySelector('.atlas-detail');
  const scroll = container.querySelector('.atlas-image-scroll');
  const stage = container.querySelector('.atlas-image-stage');

  function renderDetail() {
    const place = byId.get(currentId);
    if (!place) { panel.innerHTML = '<p>地点资料正在准备中。</p>'; return; }
    const area = AREA[place.area] || { label: '西安市区', text: '查看真实地图，确认与其他地点的距离。' };
    const rawPhoto = photos[place.id];
    const photo = Array.isArray(rawPhoto) ? rawPhoto[0] : rawPhoto;
    const src = photoURL(photo?.src || photo?.url);
    const sourceUrl = photoURL(photo?.sourceUrl);
    const licenseUrl = photoURL(photo?.licenseUrl);
    const photoCaption = photo?.caption || (photo?.kind === 'dish-photo' ? '菜品类型参考实拍 · 非该门店出品' : '地点实拍');
    const joined = selected.has(place.id);
    const reservation = place.id === 'shaanxi-museum' && profile.museumBooked === false
      ? '你尚未确认预约。可先加入心愿，生成行程时会提供替代安排。'
      : place.reservation || '出发前确认开放、营业与预约信息。';
    panel.innerHTML = `
      <div class="atlas-detail-top"><span class="atlas-area-tag">${esc(area.label)}</span><span class="atlas-place-kind">${place.kind === 'food' ? '地方风味' : '值得去'}</span></div>
      <h3 aria-live="polite" aria-atomic="true">${esc(place.name)}</h3>
      <p class="atlas-detail-subtitle">${esc(place.subtitle)}</p>
      ${src ? `<figure class="atlas-place-photo"><img src="${esc(src)}" alt="${esc(photo.alt || place.name + '实拍') }" loading="lazy" style="object-position:${esc(/^[\d.]+% [\d.]+%$/.test(photo.position || '') ? photo.position : '50% 50%')}"><figcaption>${sourceUrl ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(photoCaption)} ↗</a>` : esc(photoCaption)}${photo.credit ? `<span>${esc(photo.credit)}</span>` : ''}${photo.license ? `<span>${licenseUrl ? `<a href="${esc(licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(photo.license)}</a>` : esc(photo.license)}</span>` : ''}</figcaption></figure>` : ''}
      <p class="atlas-detail-reason">${esc(String(place.reason || '').replace(/^编辑推荐：/, ''))}</p>
      <div class="atlas-area-explanation"><span>怎样与其他地点安排</span><p>${esc(area.text)}</p></div>
      <div class="atlas-detail-practical"><span>行前确认</span><p>${esc(reservation)}</p></div>
      <div class="atlas-detail-actions"><button type="button" class="atlas-join ${joined ? 'is-added' : ''}" data-atlas-add="${place.id}" aria-pressed="${joined}">${joined ? '✓ 已加入 · 点击移出' : '＋ 加入这趟旅行'}</button><button type="button" class="atlas-show-detail" data-atlas-detail="${place.id}">看实拍与详情 <span aria-hidden="true">↗</span></button><button type="button" class="atlas-navigate" data-atlas-navigate="${place.id}">查看真实位置 <span aria-hidden="true">→</span></button></div>
      <p class="atlas-detail-disclaimer">图稿帮你认识城市，真实地图帮你确认位置。加入地点后，还可以调整每天的安排。</p>`;
    panel.querySelector('img')?.addEventListener('error', event => { event.target.closest('figure').hidden = true; }, { once: true });
  }

  function renderMarkers() {
    for (const button of container.querySelectorAll('[data-atlas-hotspot]')) {
      const id = button.dataset.atlasHotspot, joined = selected.has(id), active = id === currentId;
      button.classList.toggle('is-current', active);
      button.classList.toggle('is-added', joined);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', `查看${byId.get(id).name}${joined ? '，已加入旅行' : ''}`);
      button.querySelector('.atlas-hotspot-icon').textContent = joined ? '✓' : '＋';
    }
    const area = byId.get(currentId)?.area;
    for (const button of container.querySelectorAll('[data-atlas-region]')) button.setAttribute('aria-pressed', String(button.dataset.atlasRegion === area));
    container.querySelector('.atlas-extra-list').innerHTML = EXTRAS.filter(id => byId.has(id)).map(id => {
      const place = byId.get(id), added = selected.has(id);
      return `<button type="button" data-atlas-extra="${id}" class="${currentId === id ? 'is-current ' : ''}${added ? 'is-added' : ''}" aria-pressed="${currentId === id}"><span class="atlas-extra-type">${place.kind === 'food' ? '吃' : '游'}</span><span>${esc(place.name)}</span>${added ? '<span class="atlas-extra-check" aria-label="已加入旅行">✓</span>' : '<span class="atlas-extra-arrow" aria-hidden="true">↗</span>'}</button>`;
    }).join('');
  }

  function renderSummary() {
    const parties={couple:'两人同行',parents:'带父母',family:'亲子家庭'};
    container.querySelector('[data-atlas-profile]').textContent=`${parties[profile.party]||'两人同行'} · ${profile.pace==='relaxed'?'轻松慢游':'三天适中'} · 调整偏好`;
    const days = Array.isArray(plan?.days) ? plan.days : [];
    const dayCount = pending ? Number(profile.days) || 3 : days.length || Number(profile.days) || 3;
    const stopCount = days.reduce((total, day) => total + (day.stops?.length || 0), 0);
    container.querySelector('.atlas-plan-summary').innerHTML = `<div class="atlas-summary-heading"><div><p class="atlas-eyebrow">把喜欢的地方，放进自己的旅行</p><h3><span aria-live="polite">已选 ${selected.size} 个心动地点</span>${pending ? '<small> · 选择已变化，将重新安排</small>' : days.length ? `<small> · ${days.length} 天安排，${stopCount} 个行程站点</small>` : `<small> · 准备规划 ${dayCount} 天</small>`}</h3></div><button type="button" data-atlas-plan ${!selected.size && !days.length ? 'disabled' : ''}>${pending ? `按当前选择更新 ${dayCount} 天行程` : days.length ? `查看我的 ${dayCount} 天行程` : `用这些地点规划 ${dayCount} 天`} <span aria-hidden="true">→</span></button></div>${days.length && !pending ? `<div class="atlas-day-preview">${days.map((day, index) => `<div><span>DAY ${String(index + 1).padStart(2, '0')}</span><strong>${esc(day.title || `第 ${index + 1} 天`)}</strong><p>${esc((day.stops || []).map(stop => byId.get(stop.placeId)?.name).filter(Boolean).join(' → ') || '还可以加入想去的地方')}</p></div>`).join('')}</div>` : '<p class="atlas-summary-hint">先选想去、想吃的，再根据同行者、节奏和预约情况，按片区安排每天的路线。</p>'}`;
  }

  function redraw() { renderMarkers(); renderDetail(); renderSummary(); }
  function focusPlace(id, revealDetail = true) {
    if (!byId.has(id)) return;
    currentId = id;
    renderMarkers(); renderDetail();
    if (revealDetail && window.matchMedia('(max-width:760px)').matches) panel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }
  function centerCurrent() {
    const hit = HOTSPOTS.find(h => h.id === currentId);
    if (!hit) return;
    scroll.scrollTo({ left: stage.clientWidth * hit.x / 100 - scroll.clientWidth / 2, top: stage.clientHeight * hit.y / 100 - scroll.clientHeight / 2, behavior: 'auto' });
  }
  container.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !container.contains(button)) return;
    if (button.dataset.atlasHotspot) focusPlace(button.dataset.atlasHotspot);
    else if (button.dataset.atlasExtra) focusPlace(button.dataset.atlasExtra);
    else if (button.dataset.atlasRegion) { focusPlace(AREA[button.dataset.atlasRegion].representative, false); requestAnimationFrame(centerCurrent); }
    else if (button.dataset.atlasZoom) {
      zoom = Number(button.dataset.atlasZoom);
      stage.style.setProperty('--atlas-zoom', zoom);
      for (const control of container.querySelectorAll('[data-atlas-zoom]')) control.setAttribute('aria-pressed', String(Number(control.dataset.atlasZoom) === zoom));
      requestAnimationFrame(centerCurrent);
    } else if (button.hasAttribute('data-atlas-profile')) onProfile?.();
    else if (button.dataset.atlasAdd) onAdd?.(button.dataset.atlasAdd);
    else if (button.dataset.atlasDetail) onDetail?.(button.dataset.atlasDetail);
    else if (button.dataset.atlasNavigate) onNavigate?.(button.dataset.atlasNavigate);
    else if (button.hasAttribute('data-atlas-plan')) onPlan?.();
  });
  container.querySelector('.atlas-image').addEventListener('error', () => {
    container.querySelector('.atlas-image-unavailable').hidden = false;
  }, { once: true });
  redraw();
  if (window.matchMedia('(max-width:760px)').matches) requestAnimationFrame(centerCurrent);
  return {
    render(next = {}) {
      selected = new Set(next.selected || []);
      plan = next.plan || null;
      profile = next.profile || {};
      pending = Boolean(next.pending);
      // A stable parent focus prop must not undo a hotspot selection whenever
      // adding/removing a place triggers the parent's normal redraw.
      if (next.focusId && next.focusId !== lastExternalFocus && byId.has(next.focusId)) currentId = next.focusId;
      lastExternalFocus = next.focusId;
      redraw();
    },
    setPhotos(nextPhotos = {}) { photos = nextPhotos; renderDetail(); },
  };
}
