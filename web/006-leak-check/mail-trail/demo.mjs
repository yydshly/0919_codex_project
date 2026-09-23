// Entirely fictional messages, including recipient, timestamps and content.
const samples = [
  ['github-register', 'GitHub <noreply@github.com>', 'Welcome to GitHub — your account is ready', '2022-03-12', 'Your GitHub account has been created successfully. Welcome to your new account.'],
  ['github-login', 'GitHub <noreply@github.com>', 'A new sign-in to your GitHub account', '2026-09-18', 'A successful login to your account was detected from a new device. If this was you, no action is needed.'],
  ['notion-register', 'Notion <team@mail.notion.so>', 'Your Notion account has been created', '2023-05-08', 'Welcome to Notion. Your account has been created successfully. Start your first page.'],
  ['notion-login', 'Notion <team@mail.notion.so>', 'New login to your Notion account', '2026-09-16', 'A new sign-in to your account was detected. You have successfully signed in.'],
  ['figma-register', 'Figma <hello@figma.com>', 'Welcome to Figma! Your account is ready', '2023-07-21', 'Your account has been created successfully. Welcome to Figma.'],
  ['canva-register', 'Canva <hello@canva.com>', 'Canva 账号注册成功', '2024-01-10', '你的 Canva 账号已创建，欢迎加入。可以开始制作你的第一个设计了。'],
  ['spotify-usage', 'Spotify <no-reply@spotify.com>', 'Your Premium subscription has been renewed', '2026-09-08', 'Your account subscription has been renewed. Your next billing date is October 8.'],
  ['spotify-login', 'Spotify <no-reply@spotify.com>', 'New login to your Spotify account', '2025-11-03', 'We detected a successful login to your account on a new device.'],
  ['zhihu-login', '知乎 <security@zhihu.com>', '知乎账号登录提醒', '2026-08-22', '你的知乎账号已成功登录。如非本人操作，请在应用中检查账号安全。'],
  ['bilibili-code', '哔哩哔哩 <noreply@bilibili.com>', '哔哩哔哩注册验证码', '2024-06-30', '你的注册验证码是 123456，十分钟内有效。收到验证码不代表你已完成注册。'],
  ['paperlane-register', 'Paperlane <hello@paperlane.example>', 'Your account has been created', '2021-04-19', 'Welcome to Paperlane. Your account has been created successfully. This is a fictional service used in the demo.'],
  ['canva-promo', 'Canva <news@canva.com>', 'This week: fresh templates for your next idea', '2026-09-17', 'Explore our new templates. Shop the collection and unsubscribe from this newsletter at any time.'],
  ['jd-receipt', '京东 <receipt@jd.com>', '你的订单已完成', '2026-09-10', '感谢购买，订单已送达。这是一封交易收据，不能证明曾创建账号。'],
  ['newsletter', '周末通信 <news@weekend.example>', '本周精选：值得收藏的十篇文章', '2026-09-12', '你订阅的每周精选已送达。点击阅读本周内容，或取消订阅。']
];
function mail([id, from, subject, date, text]) {
  const stamp = new Date(`${date}T09:30:00Z`);
  const envelope = `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][stamp.getUTCDay()]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][stamp.getUTCMonth()]} ${String(stamp.getUTCDate()).padStart(2, ' ')} 09:30:00 ${stamp.getUTCFullYear()}`;
  return `From demo@example.test ${envelope}\nMessage-ID: <${id}@demo.example.test>\nFrom: ${from}\nTo: reader@example.test\nDate: ${stamp.toUTCString()}\nSubject: ${subject}\nMIME-Version: 1.0\nContent-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: 8bit\n\n${text}\n`;
}
export const demoMbox = [...samples, samples[0]].map(mail).join('\n');
