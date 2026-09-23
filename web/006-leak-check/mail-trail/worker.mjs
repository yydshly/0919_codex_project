import { parseMailFile, analyzeMessages } from './core.mjs';
self.onmessage = ({ data }) => {
  try {
    const messages = [], warnings = [];
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      const parsed = parseMailFile(new Uint8Array(file.buffer), file.name);
      const available = Math.max(0, 3000 - messages.length);
      messages.push(...parsed.messages.slice(0, available));
      warnings.push(...parsed.warnings.map(warning => `${file.name}：${warning}`));
      self.postMessage({ type: 'progress', current: i + 1, total: data.files.length });
      if (messages.length >= 3000) {
        if (parsed.messages.length > available || i < data.files.length - 1) warnings.push('已达到每批 3,000 封上限；剩余邮件未分析。请先导出本批结果，再分批处理。');
        break;
      }
    }
    self.postMessage({ type: 'result', report: analyzeMessages(messages), warnings });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || '解析失败，请检查邮件文件。' });
  }
};
