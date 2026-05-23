export const CHALLENGE_SCRIPT = String.raw`
(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const text = normalize(document.body && (document.body.innerText || document.body.textContent));
  const title = document.title || '';
  const url = location.href;
  const signals = [];
  const checks = [
    ['login', ['登录', '亲，请登录', '扫码登录', '密码登录']],
    ['slider', ['滑块', '拖动滑块', '请按住滑块']],
    ['captcha', ['验证码', '安全验证', '请输入验证码']],
    ['access-denied', ['访问被拒绝', 'deny', '拒绝访问', '风险']],
  ];
  for (const [kind, words] of checks) {
    for (const word of words) {
      if (text.includes(word) || title.includes(word)) signals.push(kind + ':' + word);
    }
  }
  const kind = signals.find(item => item.startsWith('slider:')) ? 'slider'
    : signals.find(item => item.startsWith('captcha:')) ? 'captcha'
    : signals.find(item => item.startsWith('access-denied:')) ? 'access-denied'
    : signals.find(item => item.startsWith('login:')) ? 'login'
    : 'unknown';
  return {
    detected: signals.length > 0,
    kind,
    reason: signals.length > 0 ? '淘宝页面需要人工处理' : '',
    title,
    url,
    matchedSignals: signals,
  };
})()
`;
