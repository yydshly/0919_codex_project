import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMailFile, analyzeMessages, classifyMessage, htmlToText, LIMITS } from '../site/mail-trail/core.mjs';

const eml = ({ from = 'GitHub <noreply@github.com>', subject = 'Welcome to GitHub', body = 'Your account has been created.', date = 'Mon, 21 Sep 2026 10:00:00 +0800', id = 'test@example.test', headers = '' } = {}) => `From: ${from}\r\nTo: demo@example.test\r\nSubject: ${subject}\r\nDate: ${date}\r\nMessage-ID: <${id}>\r\n${headers}MIME-Version: 1.0\r\n\r\n${body}`;
const parse = options => parseMailFile(eml(options), 'test.eml');
const message = options => parse(options).messages[0];

test('reads standard mail as bytes; parses timezone and known sender', () => {
  const result = parseMailFile(new TextEncoder().encode(eml()), 'hello.eml');
  assert.equal(result.warnings.length, 0);
  assert.equal(result.messages[0].date, '2026-09-21T02:00:00.000Z');
  assert.equal(result.messages[0].senderDomain, 'github.com');
  assert.equal(result.messages[0].fileName, 'hello.eml');
  assert.equal(analyzeMessages(result.messages).platforms[0].signal, 'registration');
});

test('decodes RFC2047 folded UTF8 base64 and Q headers', () => {
  const subject = '=?UTF-8?B?' + Buffer.from('注册').toString('base64') + '?=\r\n =?UTF-8?B?' + Buffer.from('成功').toString('base64') + '?=';
  const result = parse({ from: '=?UTF-8?Q?GitHub_Account?= <hello@github.com>', subject });
  assert.equal(result.messages[0].subject, '注册成功');
  assert.equal(result.messages[0].from, 'GitHub Account <hello@github.com>');
});

test('decodes quoted-printable UTF8 soft breaks and base64 text', () => {
  const body = '注册成功，账号已创建';
  const qp = [...Buffer.from(body)].map(x => '=' + x.toString(16).padStart(2, '0')).join('');
  const decoded = parse({ headers: 'Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n', body: qp.slice(0, 12) + '=\r\n' + qp.slice(12) });
  assert.equal(decoded.messages[0].text, body);
  assert.equal(parse({ headers: 'Content-Transfer-Encoding: base64\r\n', body: Buffer.from(body).toString('base64') }).messages[0].text, body);
});

test('decodes GB18030 text bytes and encoded subject', () => {
  // GB18030 bytes for 注册成功.
  const encoded = Buffer.from([0xd7, 0xa2, 0xb2, 0xe1, 0xb3, 0xc9, 0xb9, 0xa6]);
  const result = parse({ subject: '=?GB18030?B?' + encoded.toString('base64') + '?=', headers: 'Content-Type: text/plain; charset=GB18030\r\nContent-Transfer-Encoding: base64\r\n', body: encoded.toString('base64') });
  assert.equal(result.messages[0].subject, '注册成功');
  assert.equal(result.messages[0].text, '注册成功');
});

test('multipart prefers plain and ignores attachments and nested forwarded messages', () => {
  const body = '--mix\r\nContent-Type: multipart/alternative; boundary="alt"\r\n\r\n--alt\r\nContent-Type: text/plain\r\n\r\nNo account evidence.\r\n--alt\r\nContent-Type: text/html\r\n\r\n<h1>Your account has been created.</h1>\r\n--alt--\r\n--mix\r\nContent-Type: text/plain\r\nContent-Disposition: attachment; filename="account.txt"\r\n\r\nYour account has been created.\r\n--mix\r\nContent-Type: message/rfc822\r\n\r\n' + eml() + '\r\n--mix--';
  const result = parse({ subject: 'Attached documentation', headers: 'Content-Type: multipart/mixed; boundary="mix"\r\n', body });
  assert.equal(result.messages[0].text, 'No account evidence.');
  assert.equal(analyzeMessages(result.messages).platforms.length, 0);
});

test('HTML fallback creates text only, drops active content and remote attributes', () => {
  const html = '<html><head><title>noise</title></head><body><script>fetch("https://evil.test")</script><p>Your account has been created.</p><img src="https://tracking.test/x"><p>A &amp; B &#x4f60;&#22909;</p></body></html>';
  const result = parse({ headers: 'Content-Type: text/html; charset=utf-8\r\n', body: html });
  assert.match(result.messages[0].text, /Your account has been created/);
  assert.match(result.messages[0].text, /A & B 你好/);
  assert.doesNotMatch(result.messages[0].text, /evil|tracking|noise|<script/);
  assert.equal(htmlToText('&#x110000; &#xD800;'), '&#x110000; &#xD800;');
});

test('handles MIME boundaries ending in dashes and extended attachment filenames', () => {
  const body = '--edge--\nContent-Type: text/plain\n\nNew sign-in to your account.\n--edge--\nContent-Type: text/plain\nContent-Disposition: inline; filename*=UTF-8\'\'welcome.txt\n\nYour account has been created.\n--edge----';
  const result = parse({ subject: 'Account notification', headers: 'Content-Type: multipart/mixed; boundary="edge--"\r\n', body });
  assert.equal(result.messages[0].text, 'New sign-in to your account.');
  assert.equal(classifyMessage(result.messages[0]).kind, 'usage');
});

test('bounds MIME recursion and reports unsupported encrypted content', () => {
  let raw = 'Content-Type: text/plain\n\nYour account has been created.';
  for (let i = 0; i < LIMITS.mimeDepth + 2; i++) raw = `Content-Type: multipart/mixed; boundary="nested${i}"\n\n--nested${i}\n${raw}\n--nested${i}--`;
  const result = parseMailFile('From: test@github.com\nSubject: Test\n' + raw, 'deep.eml');
  assert.ok(result.warnings.some(x => x.includes('复杂')));
  assert.equal(result.messages[0].text, '');
  assert.ok(parse({ headers: 'Content-Type: application/pgp-encrypted\r\n' }).warnings.some(x => x.includes('加密')));
});

test('splits standard MBOX envelopes without splitting ordinary From body text', () => {
  const first = eml({ body: 'Your account has been created.\r\nFrom the support team\r\n>From user@example.test Mon Sep 21 12:00:00 2026\r\nStill the same message.' });
  const second = eml({ id: 'second@example.test', from: 'Notion <team@mail.notion.so>', body: 'New sign-in to your account.', subject: 'New sign-in' });
  const result = parseMailFile('From a@example.test Mon Sep 21 10:00:00 2026\n' + first + '\nFrom b@example.test Mon Sep 21 11:00:00 2026\n' + second, 'archive.mbox');
  assert.equal(result.messages.length, 2);
  assert.match(result.messages[0].text, /\nFrom user@example.test/);
  assert.equal(analyzeMessages(result.messages).platforms.length, 2);
});

test('does not fabricate missing, malformed, impossible or timezone-free dates', () => {
  for (const date of ['', 'yesterday', 'January 1', 'Fri, 30 Feb 2026 10:00:00 +0800', '2026-09-21T10:00:00', 'Mon, 21 Sep 2026 25:00:00 +0800']) assert.equal(message({ date }).date, null, date);
  assert.equal(message({ date: '2026-09-21T10:00:00Z' }).date, '2026-09-21T10:00:00.000Z');
});

test('subdomain matching uses domain boundaries, never display names', () => {
  const messages = [message({ from: 'Nobody <bot@mail.github.com>', id: 'a' }), message({ from: 'GitHub <bot@github.com.evil.test>', id: 'b' }), message({ from: 'GitHub <bot@notgithub.com>', id: 'c' }), message({ from: 'GitHub <bot@sendgrid.net>', id: 'd' })];
  const result = analyzeMessages(messages);
  const known = result.platforms.filter(x => x.recognized);
  assert.deepEqual(known.map(x => x.domain), ['github.com']);
  assert.equal(result.platforms.find(x => x.domain === 'github.com.evil.test').recognized, false);
  assert.equal(result.platforms.find(x => x.domain === 'sendgrid.net').name, 'sendgrid.net');
});

test('ambiguous From headers and sender addresses are not attributed', () => {
  assert.equal(message({ from: 'GitHub <a@github.com>, Other <b@evil.test>' }).senderDomain, '');
  assert.equal(message({ from: 'GitHub <not-an-email>' }).senderDomain, '');
  assert.equal(message({ from: 'GitHub <a@github.com>', headers: 'From: Attacker <b@evil.test>\r\n' }).senderDomain, '');
});

test('registration success distinct from OTP or password reset request', () => {
  for (const subject of ['Your verification code', '登录验证码', 'Reset your password', 'Password reset request']) {
    assert.equal(classifyMessage(message({ subject, body: 'Welcome! Enter code 123456 to finish.' })).kind, 'verification', subject);
  }
  assert.equal(classifyMessage(message({ subject: 'Verify your email', body: 'Your account has been created. Verify your email to finish.' })).kind, 'verification');
});

test('failed or incomplete registrations do not become success', () => {
  for (const text of ['Registration failed. Your account was not created.', '注册未成功，请重新尝试。', 'Unable to create your account.', 'Your registration is incomplete.']) assert.equal(classifyMessage(message({ body: text })), null, text);
});

test('marketing, purchases, generic welcome, forwarded and quoted messages do not imply account creation', () => {
  const examples = [
    { subject: 'Welcome to our newsletter', body: 'Manage your account to change marketing preferences.' },
    { subject: 'Your order receipt', body: 'Thank you for your purchase. View your order.' },
    { subject: 'Welcome to GitHub', body: 'Create your account today.' },
    { subject: 'Re: Welcome to GitHub' }, { subject: 'Fwd: Welcome to GitHub' }, { subject: '转发：注册成功' },
    { subject: 'A question', body: '> Your account has been created.\nCan you explain this?' },
    { subject: 'Weekly digest', body: 'Your account has been created. Discover what is new.' },
  ];
  for (const item of examples) assert.equal(classifyMessage(message(item)), null, item.subject);
});

test('recognizes login and actual subscription state as usage evidence', () => {
  for (const body of ['New sign-in to your account.', 'Your subscription is now active.', '您的会员已开通。', '账号登录成功。']) assert.equal(classifyMessage(message({ subject: 'Account update', body })).kind, 'usage', body);
});

test('deduplicates IDs, aggregates signals and dates, excludes unclassified mail', () => {
  const registration = message({ id: 'reg', date: 'Mon, 21 Sep 2026 10:00:00 +0800' });
  const usage = message({ id: 'use', from: 'Bot <robot.mail@notify.github.com>', subject: 'New sign-in', body: 'New sign-in to your account.', date: 'Tue, 22 Sep 2026 10:00:00 +0800' });
  const otp = message({ id: 'otp', from: 'Notion <hello@notion.so>', subject: 'Verification code', body: 'Your verification code is 123456.' });
  const ignored = message({ id: 'ad', subject: 'Special offer', body: 'Save 20% today.' });
  const result = analyzeMessages([registration, registration, usage, otp, ignored]);
  assert.deepEqual(result.stats, { total: 5, duplicates: 1, registration: 1, usage: 0, verification: 1, ignored: 1 });
  const github = result.platforms.find(x => x.domain === 'github.com');
  assert.equal(github.evidence.length, 2);
  assert.equal(github.signal, 'registration');
  assert.equal(github.firstSeen, '2026-09-21T02:00:00.000Z');
  assert.equal(github.lastSeen, '2026-09-22T02:00:00.000Z');
  assert.equal(github.evidence[0].kind, 'usage');
});

test('uses content fingerprints for messages without Message-ID', () => {
  const source = eml().replace(/Message-ID:[^\r]+\r\n/, '');
  const a = parseMailFile(source, 'a.eml').messages[0];
  const b = parseMailFile(source, 'b.eml').messages[0];
  assert.equal(a.id, b.id);
  assert.equal(analyzeMessages([a, b]).stats.duplicates, 1);
});

test('reports malformed, unsupported and truncated inputs', () => {
  assert.equal(parseMailFile('not mail', 'bad.eml').messages.length, 0);
  assert.ok(parseMailFile('not mail', 'bad.eml').warnings.length);
  assert.ok(parse({ headers: 'Content-Transfer-Encoding: x-unsupported\r\n' }).warnings.some(x => x.includes('暂不支持')));
  assert.ok(parse({ headers: 'Content-Transfer-Encoding: base64\r\n', body: '!!!' }).warnings.some(x => x.includes('Base64')));
  const large = parse({ body: 'x'.repeat(LIMITS.bodyChars + 1) });
  assert.equal(large.messages[0].text.length, LIMITS.bodyChars);
  assert.ok(large.warnings.some(x => x.includes('正文过长')));
  assert.equal(parseMailFile(new Uint8Array(LIMITS.fileBytes + 1), 'huge.mbox').messages.length, 0);
});

test('limits MBOX message count with an explicit warning', () => {
  const item = 'From a@example.test Mon Sep 21 10:00:00 2026\n' + eml() + '\n';
  const result = parseMailFile(item.repeat(LIMITS.messages + 1), 'many.mbox');
  assert.equal(result.messages.length, LIMITS.messages);
  assert.ok(result.warnings.some(x => x.includes(String(LIMITS.messages))));
});
