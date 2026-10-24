/* =====================================================================
 * 对话大脑：两种模式
 *   1) LLM 模式：走本地 /api/chat 代理，流式返回（需要 API Key）
 *   2) 剧本模式：完全离线，按教材话题的分步脚本推进（无需任何联网）
 * 两种模式对外接口一致，页面无需关心用的是哪个。
 * ===================================================================== */
import { buildSystemPrompt, FALLBACK_LINES, ENCOURAGE } from './data.js';
import { apiUrl } from './api.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const hasChinese = (s) => /[\u4e00-\u9fff]/.test(s);
// The assistant text is displayed and read aloud. Keep a strict final guard
// in addition to the system prompt so an occasional model emoji or CJK hint
// cannot appear in class.
const cleanEnglishReply = (value) => String(value || '')
  .replace(/\*\*|__|`/g, ' ')
  .replace(/[^A-Za-z\s.,!?'']/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export class Brain {
  constructor(config = {}) {
    this.config = { baseUrl: '', apiKey: '', model: '', provider: 'deepseek', serverReady: false, ...config };
    this.scenario = null;
    this.history = [];
    this.step = 0;
    this.miss = 0;
    this.frameIdx = 0;
    this.greeted = false;
  }

  get online() { return !!(this.config.serverReady || (this.config.apiKey && this.config.baseUrl)); }

  start(scenario) {
    this.scenario = scenario;
    this.step = 0;
    this.miss = 0;
    this.frameIdx = 0;
    this.greeted = false;
    // 没有登场独白：不说话、不显示开场白，等学生先开口
    this.history = [];
    return '';
  }

  nextHint() {
    const frames = this.scenario?.frames || [];
    if (!frames.length) return '';
    const f = frames[this.frameIdx % frames.length];
    this.frameIdx++;
    return f;
  }

  /* ---------------- 对外唯一入口 ---------------- */
  async respond(text, { onDelta } = {}) {
    if (this.online) {
      try {
        return await this._llm(text, onDelta);
      } catch (err) {
        if (this.history.at(-1)?.role === 'user') this.history.pop();
        console.warn('LLM 调用失败，回落到剧本模式：', err);
        this.fallbackReason = err.message || String(err);
        return this._script(text);
      }
    }
    return this._script(text);
  }

  /* ---------------- 剧本模式 ---------------- */
  _script(text) {
    const steps = this.scenario.steps;
    // 第一轮由学生先开口，Lily 直接抛第一个问题（不读开场白）
    if (!this.greeted) {
      this.greeted = true;
      return steps[0].ask;
    }
    const cur = steps[this.step];
    if (!cur) return "That's all for this topic. You did a great job today!";

    if (hasChinese(text)) {
      return `Let's try it in English. You can say: "${cur.hint}"`;
    }

    // 只要学生真的开口说了（≥2 个英文词），就往前走，不因为用词不同而卡住
    const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
    const matched = cur.ok.test(text);
    if (matched || (this.scenario.id !== 'winter_trip' && words.length >= 2)) {
      this.miss = 0;
      this.step++;
      const next = steps[this.step];
      return next ? `${cur.react} ${next.ask}` : cur.react;
    }

    this.miss++;
    if (this.miss <= 2) {
      return this.miss === 1
        ? `Good try! You can say: "${cur.hint}"`
        : `Almost there. Let's say it together: "${cur.hint}"`;
    }

    // 连续三次没答到点上：给出示范后照常推进，保护课堂节奏
    this.miss = 0;
    this.step++;
    const next = steps[this.step];
    const model = `No problem! I can say it like this: "${cur.hint}"`;
    return next ? `${model} ${next.ask}` : `${model} ${cur.react}`;
  }

  /* ---------------- LLM 模式 ---------------- */
  async _llm(text, onDelta) {
    this.history.push({ role: 'user', content: text });
    const msgs = [
      { role: 'system', content: buildSystemPrompt(this.scenario) },
      ...this.history.slice(-20)
    ];

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    let acc = '';
    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, config: this.config }),
        signal: ctrl.signal
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${detail.slice(0, 160)}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.error) throw new Error(json.error);
              const delta = json.choices?.[0]?.delta?.content || '';
              if (delta) { acc += delta; onDelta && onDelta(cleanEnglishReply(acc)); }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } finally {
      clearTimeout(timer);
    }

    const reply = cleanEnglishReply(acc);
    if (!reply) throw new Error('empty reply');
    this.history.push({ role: 'assistant', content: reply });
    return reply;
  }
}

export { FALLBACK_LINES, ENCOURAGE, pick };
