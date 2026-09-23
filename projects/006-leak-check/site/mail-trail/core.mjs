/** Local-only mail parsing and conservative account-footprint classification. */
export const LIMITS = Object.freeze({ fileBytes: 25 * 1024 * 1024, messages: 3000, bodyChars: 250000, mimeDepth: 8, mimeParts: 100 });

const CATALOG = [
  ['github.com', 'GitHub', '开发工具'], ['notion.so', 'Notion', '效率工具'],
  ['figma.com', 'Figma', '设计工具'], ['canva.com', 'Canva', '设计工具'],
  ['spotify.com', 'Spotify', '影音娱乐'], ['dropbox.com', 'Dropbox', '云端存储'],
  ['openai.com', 'OpenAI', 'AI 工具'], ['bilibili.com', '哔哩哔哩', '影音娱乐'],
  ['zhihu.com', '知乎', '内容社区'], ['yuque.com', '语雀', '效率工具'],
  ['jd.com', '京东', '购物平台'], ['taobao.com', '淘宝', '购物平台'],
];

function hash(value) {
  let h = 2166136261, second = 2246822507;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i); h = Math.imul(h, 16777619);
    second ^= value.charCodeAt(i); second = Math.imul(second, 3266489909);
  }
  return (h >>> 0).toString(36) + '-' + (second >>> 0).toString(36);
}

function bytesToBinary(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
}

function binaryToBytes(value) {
  return Uint8Array.from(value, c => c.charCodeAt(0) & 255);
}

function decodeBytes(value, charset = 'utf-8', warn = () => {}) {
  let decoder;
  try { decoder = new TextDecoder(charset || 'utf-8', { fatal: false }); }
  catch { warn(`无法识别字符集 ${String(charset).slice(0, 60)}，已尝试 UTF-8。`); decoder = new TextDecoder('utf-8'); }
  const decoded = decoder.decode(value);
  if (decoded.includes('\uFFFD')) warn('部分字符无法解码，相关邮件可能需要人工检查。');
  return decoded;
}

function decodeBase64(value, warn) {
  const clean = value.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) { warn('邮件包含无效 Base64 内容，已跳过该部分。'); return null; }
  try { return binaryToBytes(atob(clean)); }
  catch { warn('邮件包含无法解码的 Base64 内容，已跳过该部分。'); return null; }
}

function decodeQuotedPrintable(value, header = false) {
  return binaryToBytes(value.replace(/=\r?\n/g, '').replace(header ? /_/g : /$^/g, ' ').replace(/=([\da-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))));
}

function decodeHeader(value, warn) {
  // Whitespace separating adjacent encoded words has no semantic content.
  const raw = decodeBytes(binaryToBytes(value), 'utf-8', () => {}).replace(/(\?=)\s+(?==\?)/g, '$1');
  return raw.replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (full, charset, kind, payload) => {
    const bytes = kind.toLowerCase() === 'b' ? decodeBase64(payload, warn) : decodeQuotedPrintable(payload, true);
    return bytes ? decodeBytes(bytes, charset, warn) : full;
  });
}

function readHeaders(raw, warn) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const split = normalized.indexOf('\n\n');
  if (split < 0) { warn('邮件缺少标准的邮件头与正文分隔，已跳过。'); return null; }
  const headerBlock = normalized.slice(0, split);
  if (headerBlock.length > 65536) { warn('邮件头过长，已跳过。'); return null; }
  const headers = new Map();
  let last = '';
  for (const line of headerBlock.split('\n')) {
    if (/^[ \t]/.test(line) && last) { headers.set(last, headers.get(last) + ' ' + line.trim()); continue; }
    const match = /^([\w-]+):[ \t]*(.*)$/.exec(line);
    if (!match) { last = ''; continue; }
    last = match[1].toLowerCase();
    if (!headers.has(last)) headers.set(last, match[2]);
    else if (last === 'from') headers.set(last, headers.get(last) + ', ' + match[2]);
  }
  if (!headers.size) { warn('没有识别到有效邮件头，已跳过。'); return null; }
  return { headers, body: normalized.slice(split + 2) };
}

function parameter(value, name) {
  const match = new RegExp('(?:^|;)\\s*' + name + '\\s*=\\s*(?:"([^"\\r\\n]*)"|([^;\\s]+))', 'i').exec(value || '');
  return match ? match[1] ?? match[2] : '';
}

/** Converts HTML to inert text. This never creates DOM nodes or resolves remote content. */
export function htmlToText(html) {
  return html.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|head|iframe|object|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(?:br|hr)\b[^>]*>|<\/(?:p|div|tr|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (full, entity) => {
      const names = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      const lower = entity.toLowerCase();
      if (names[lower]) return names[lower];
      const n = lower.startsWith('#x') ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : full;
    }).replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function extractPart(raw, warn, state, depth = 0) {
  if (depth > LIMITS.mimeDepth || ++state.parts > LIMITS.mimeParts) { warn('邮件结构过于复杂，已停止解析其剩余部分。'); return { plain: [], html: [] }; }
  const parsed = readHeaders(raw, warn);
  if (!parsed) return { plain: [], html: [] };
  const { headers, body } = parsed;
  const typeHeader = headers.get('content-type') || 'text/plain';
  const type = typeHeader.split(';')[0].trim().toLowerCase();
  const disposition = headers.get('content-disposition') || '';
  if (/^attachment(?:\s*;|\s*$)/i.test(disposition) || /(?:^|;)\s*filename(?:\*\d+\*?|\*)?\s*=/i.test(disposition) || /(?:^|;)\s*name(?:\*\d+\*?|\*)?\s*=/i.test(typeHeader) || type === 'message/rfc822') return { plain: [], html: [] };
  if (type.startsWith('multipart/')) {
    const boundary = parameter(typeHeader, 'boundary');
    if (!boundary || boundary.length > 200) { warn('邮件缺少有效的 MIME 边界，无法读取该部分正文。'); return { plain: [], html: [] }; }
    const chunks = [];
    let current = null;
    let closed = false;
    for (const line of body.split('\n')) {
      const marker = line.trimEnd();
      if (marker === '--' + boundary || marker === '--' + boundary + '--') {
        if (current !== null) chunks.push(current.join('\n'));
        current = [];
        if (marker === '--' + boundary + '--') { closed = true; break; }
      } else if (current !== null) current.push(line);
    }
    if (!closed && current?.length) chunks.push(current.join('\n'));
    if (!closed) warn('邮件 MIME 结构不完整，仅尝试解析已找到的正文。');
    if (!chunks.length) warn('没有找到可读取的 MIME 正文。');
    const result = { plain: [], html: [] };
    for (const chunk of chunks) {
      if (state.parts >= LIMITS.mimeParts) { warn('邮件包含过多 MIME 部分，已停止解析其剩余部分。'); break; }
      const child = extractPart(chunk, warn, state, depth + 1);
      result.plain.push(...child.plain); result.html.push(...child.html);
    }
    return result;
  }
  if (type !== 'text/plain' && type !== 'text/html') {
    if (/encrypted|pkcs7|pgp/i.test(type)) warn('加密邮件正文暂不支持解析。');
    return { plain: [], html: [] };
  }
  const transfer = (headers.get('content-transfer-encoding') || '8bit').trim().toLowerCase();
  let bytes;
  if (transfer === 'base64') bytes = decodeBase64(body, warn);
  else if (transfer === 'quoted-printable') bytes = decodeQuotedPrintable(body);
  else if (['7bit', '8bit', 'binary', ''].includes(transfer)) bytes = binaryToBytes(body);
  else { warn(`暂不支持 ${transfer.slice(0, 40)} 邮件编码，已跳过该部分。`); return { plain: [], html: [] }; }
  if (!bytes) return { plain: [], html: [] };
  const decoded = decodeBytes(bytes, parameter(typeHeader, 'charset') || 'utf-8', warn);
  return type === 'text/plain' ? { plain: [decoded], html: [] } : { plain: [], html: [htmlToText(decoded)] };
}

function parseAddress(from) {
  const angles = [...from.matchAll(/<([^<>]+)>/g)].map(x => x[1].trim());
  const candidates = angles.length ? angles : [...from.matchAll(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+/gi)].map(x => x[0]);
  if (candidates.length !== 1) return { senderEmail: '', senderDomain: '' };
  const address = candidates[0].replace(/^mailto:/i, '');
  const at = address.lastIndexOf('@');
  const domain = address.slice(at + 1).toLowerCase();
  if (at < 1 || address.slice(0, at).includes('@') || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)) return { senderEmail: '', senderDomain: '' };
  return { senderEmail: address.toLowerCase(), senderDomain: domain };
}

function parseDate(raw) {
  const value = raw.trim().replace(/\([^)]*\)/g, '').trim();
  let year, month, day, hour, minute, second;
  const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.exec(value);
  const rfc = /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+(?:[+-]\d{4}|UT|UTC|GMT|[ECMP][SD]T)$/i.exec(value);
  if (iso) [, year, month, day, hour, minute, second = '0'] = iso;
  else if (rfc) { [, day, month, year, hour, minute, second = '0'] = rfc; month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(month.toLowerCase()) + 1; }
  else return null;
  [year, month, day, hour, minute, second] = [year, month, day, hour, minute, second].map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function splitMbox(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const chunks = [];
  let current = [];
  let found = false;
  const envelope = /^From \S+ (?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) )?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2} \d{2}:\d{2}:\d{2}(?: [A-Z+-][A-Z\d:+-]*)? \d{4}(?: .*)?$/;
  for (let i = 0; i < lines.length; i++) {
    if (envelope.test(lines[i]) && /^[\w-]+:[ \t]*/.test(lines[i + 1] || '')) {
      if (found && current.length) chunks.push(current.join('\n'));
      found = true; current = [];
    } else current.push(lines[i]);
  }
  if (found && current.length) chunks.push(current.join('\n'));
  return found ? chunks.map(chunk => {
    const divider = chunk.indexOf('\n\n');
    return divider < 0 ? chunk : chunk.slice(0, divider + 2) + chunk.slice(divider + 2).replace(/^>(>*From )/gm, '$1');
  }) : null;
}

/** Accept an .eml or .mbox as bytes (preferred) or UTF-8 source text. */
export function parseMailFile(input, filename = 'mail.eml') {
  const warnings = [];
  const warn = value => { if (!warnings.includes(value)) warnings.push(value); };
  let bytes;
  if (typeof input === 'string') bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else return { messages: [], warnings: ['不支持的文件内容，请导入 EML 或 MBOX 文件。'] };
  if (bytes.length > LIMITS.fileBytes) return { messages: [], warnings: [`文件超过 ${LIMITS.fileBytes / 1024 / 1024} MB，请拆分后导入。`] };
  const raw = bytesToBinary(bytes).replace(/^\xef\xbb\xbf/, '');
  const mbox = splitMbox(raw);
  if (/\.mbox$/i.test(filename) && !mbox) warn('未识别到标准 MBOX 分隔，已按单封邮件尝试读取。');
  const chunks = mbox || [raw];
  if (chunks.length > LIMITS.messages) warn(`单次最多读取 ${LIMITS.messages} 封邮件，超出部分未分析。`);
  const messages = [];
  for (const chunk of chunks.slice(0, LIMITS.messages)) {
    const parsed = readHeaders(chunk, warn);
    if (!parsed || !['from', 'subject', 'date', 'message-id', 'to'].some(key => parsed.headers.has(key))) { if (parsed) warn('内容不像标准邮件，已跳过。'); continue; }
    const header = key => decodeHeader(parsed.headers.get(key) || '', warn);
    const from = header('from');
    const subject = header('subject');
    const to = header('to');
    const { senderEmail, senderDomain } = parseAddress(from);
    if (!senderDomain) warn('部分邮件没有唯一且有效的发件地址，无法归属平台。');
    const dateHeader = header('date');
    const date = dateHeader ? parseDate(dateHeader) : null;
    if (dateHeader && !date) warn('部分邮件日期无法可靠识别，已保留为未知日期。');
    const parts = extractPart(chunk, warn, { parts: 0 });
    let text = (parts.plain.filter(v => v.trim()).length ? parts.plain : parts.html).join('\n\n').replace(/\u0000/g, '').trim();
    if (text.length > LIMITS.bodyChars) { text = text.slice(0, LIMITS.bodyChars); warn('部分邮件正文过长，仅分析了开头部分。'); }
    const messageId = header('message-id').trim().replace(/^<|>$/g, '');
    const id = messageId ? 'mid:' + messageId : 'mail:' + hash([senderEmail, to, subject, dateHeader, text].join('\u001f'));
    messages.push({ id, from, senderEmail, senderDomain, to, subject, date, text, fileName: filename });
  }
  return { messages, warnings };
}

function platformFor(domain) {
  const known = CATALOG.find(([base]) => domain === base || domain.endsWith('.' + base));
  return known ? { id: known[0], name: known[1], domain: known[0], recognized: true, category: known[2] } : { id: domain, name: domain, domain, recognized: false, category: '待识别平台' };
}

/** Signals are mail evidence only. Neither sender authenticity nor a live account is verified. */
export function classifyMessage(message) {
  if (!message.senderDomain || /^(?:(?:re|fw|fwd)\s*:|回复[:：]|回覆[:：]|转发[:：])/i.test((message.subject || '').trim())) return null;
  const subject = (message.subject || '').replace(/\s+/g, ' ').trim();
  const originalText = (message.text || '').split(/\n(?:-{2,}\s*(?:forwarded|original) message|On .+wrote:|在.+写道[：:])/i)[0].replace(/^>.*$/gm, '');
  const body = originalText.slice(0, LIMITS.bodyChars).replace(/\s+/g, ' ');
  const all = subject + '\n' + body;
  if (/(?:注册|创建(?:账号|账户|帐号)|激活).{0,8}(?:失败|未成功|未完成)|(?:未能|无法)(?:完成)?(?:注册|创建(?:账号|账户|帐号))|(?:registration|sign[ -]?up|account creation).{0,20}(?:failed|unsuccessful|incomplete)|(?:could not|couldn't|unable to) (?:create|activate) (?:your |the |an? )?account/i.test(all)) return null;
  const verification = /(?:验证码|校验码|动态密码|一次性密码|验证(?:您的?|你的?)?(?:邮箱|电子邮件)|确认(?:您的?|你的?)?(?:邮箱|电子邮件)|(?:重置|找回)(?:您的?|你的?)?密码|密码重置(?:请求|链接))|\b(?:verification|confirmation|security|one[- ]time|sign[- ]in|login|authentication) (?:code|pin|token)\b|\b(?:verify|confirm) your (?:email|e-mail|email address)\b|\b(?:reset your password|password reset (?:request|link|code)|request(?:ed)? (?:a |to )?password reset)\b/i.test(all);
  if (verification) return { kind: 'verification', reason: '发现验证码、邮箱验证或密码重置请求；不能据此确认注册完成。' };
  const marketingSubject = /\b(?:newsletter|weekly digest|sale|discount|promotion|special offer|webinar)\b|(?:周刊|月刊|周报|促销|优惠|折扣|精选内容|限时特惠|欢迎订阅)/i.test(subject);
  if (marketingSubject) return null;
  const success = /(?:注册成功|成功注册|(?:账号|帐号|账户)(?:已|已经)(?:成功)?(?:创建|注册|开通|激活)|(?:账号|帐号|账户)(?:创建|注册|开通|激活)成功)|\b(?:registration|sign[ -]?up) (?:is |was |has been )?(?:successful|complete|completed)\b|\b(?:your |new |the )?account (?:has been |was |is |successfully )?(?:successfully )?(?:created|activated)\b/i.test(all);
  const welcome = /\bwelcome\b|欢迎(?:加入|使用|来到)/i.test(subject);
  const readyAccount = /\byour (?:new )?account (?:is (?:now )?ready|has been (?:set up|created))\b|(?:您的?|你的?)(?:新)?(?:账号|帐号|账户)(?:已准备就绪|已开通|创建成功)/i.test(body);
  if (success || welcome && readyAccount) return { kind: 'registration', reason: '邮件明确提到注册成功、账号创建或激活；这是历史线索，账号现状仍需确认。' };
  const usage = /(?:登录成功|成功登录|(?:新的?|新设备)(?:登录|登入)|(?:账号|帐号|账户).{0,12}(?:登录提醒|登录通知)|(?:订阅|会员)(?:已|已经)(?:生效|开通|续费|取消)|(?:订阅|会员)(?:开通|续费)成功)|\b(?:new (?:sign[ -]?in|login)|signed in to your account|successfully (?:logged|signed) in|your account was (?:accessed|signed into))\b|\b(?:your )?subscription (?:is (?:now )?|has been |was )?(?:active|activated|renewed|cancelled|canceled|confirmed)\b/i.test(all);
  if (usage) return { kind: 'usage', reason: '发现登录或订阅状态记录，可作为曾使用该平台的线索。' };
  return null;
}

export function analyzeMessages(messages) {
  const groups = new Map();
  const seen = new Set();
  const stats = { total: messages.length, duplicates: 0, registration: 0, usage: 0, verification: 0, ignored: 0 };
  const priority = { registration: 3, usage: 2, verification: 1 };
  for (const message of messages) {
    const key = message.id || 'mail:' + hash([message.senderEmail, message.to, message.subject, message.date, message.text].join('\u001f'));
    if (seen.has(key)) { stats.duplicates++; continue; }
    seen.add(key);
    const finding = classifyMessage(message);
    if (!finding) { stats.ignored++; continue; }
    const platform = platformFor(message.senderDomain.toLowerCase());
    if (!groups.has(platform.id)) groups.set(platform.id, { ...platform, signal: finding.kind, evidence: [], firstSeen: null, lastSeen: null });
    const group = groups.get(platform.id);
    group.evidence.push({ ...message, ...finding });
    if (priority[finding.kind] > priority[group.signal]) group.signal = finding.kind;
    if (message.date) {
      if (!group.firstSeen || message.date < group.firstSeen) group.firstSeen = message.date;
      if (!group.lastSeen || message.date > group.lastSeen) group.lastSeen = message.date;
    }
  }
  const platforms = [...groups.values()].sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || '') || a.name.localeCompare(b.name));
  for (const group of platforms) {
    stats[group.signal]++;
    group.evidence.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }
  return { platforms, stats };
}
