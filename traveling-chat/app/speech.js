/* =====================================================================
 * 语音：朗读（TTS）+ 听说识别（ASR）
 * 只用浏览器原生能力，零依赖、零费用，断网时朗读仍可用系统语音。
 * ===================================================================== */
import { apiUrl } from './api.js';

/* ---------------------------- TTS ---------------------------- */
export class Speaker {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.rate = 1.02;
    this.voice = null;
    this.voices = [];
    this.speaking = false;
    this.playing = false;
    this.cancelled = false;
    this.cloudEnabled = true;
    this.cloudAbort = null;
    this.audio = null;
    this.onChunk = null;   // (text) => void   当前朗读的句子（做字幕）
    this.onStateChange = null; // (speaking:boolean) => void

    if (this.synth) {
      this._load();
      this.synth.onvoiceschanged = () => this._load();
    }
  }

  get supported() { return !!this.synth; }

  _load() {
    const all = this.synth.getVoices() || [];
    if (!all.length) return;
    this.voices = all;
    this.voice = this._pick(all);
  }

  _pick(list) {
    const en = list.filter(v => /^en(-|_)/i.test(v.lang));
    const score = (v) => {
      let s = 0;
      const n = v.name || '';
      if (/Online \(Natural\)/i.test(n)) s += 100;      // Edge 的在线自然语音
      if (/Natural/i.test(n)) s += 60;
      if (/Ava|Aria|Emma|Jenny|Sonia|Michelle|Ana/i.test(n)) s += 35;
      if (/David|Mark|Guy|Male/i.test(n)) s -= 60;
      if (/en-US/i.test(v.lang)) s += 20;
      if (/en-GB/i.test(v.lang)) s += 10;
      if (/Zira|David|Mark/i.test(n)) s += 4;           // 系统离线语音，音质一般
      return s;
    };
    en.sort((a, b) => score(b) - score(a));
    // 没有英语语音时宁可让浏览器按 lang 选，也不要退化成中文音色
    return en[0] || null;
  }

  get voiceName() { return this.voice ? this.voice.name : '默认语音'; }

  setRate(r) { this.rate = Math.max(0.5, Math.min(1.3, Number(r) || 0.9)); }

  /* 把长文本切成短句，逐句朗读：延迟更低，字幕更准 */
  static chunk(text) {
    const clean = String(text)
      .replace(/[*_`#>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return [];
    const parts = clean.match(/[^.!?;]+[.!?;]*/g) || [clean];
    const out = [];
    let buf = '';
    for (const p of parts) {
      if ((buf + p).length > 140 && buf) { out.push(buf.trim()); buf = p; }
      else buf += p;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  async speak(text) {
    const chunks = Speaker.chunk(text);
    if (!chunks.length) return;
    if (this.cloudEnabled) {
      try {
        await this._speakCloud(chunks);
        return;
      } catch (err) {
        if (this.cancelled) return;
        console.warn('云端语音不可用，改用浏览器语音', err);
        this.cloudEnabled = false;
        this._done();
      }
    }
    return this._speakBrowser(chunks.join(' '));
  }

  /* 云端合成：先取第一句就开播，后面的句子在播第一句时并行预取，
     把"整段等 2 秒"变成"半秒开口"。 */
  async _speakCloud(chunks) {
    const ctx = await this._ctx();
    if (!ctx) throw new Error('浏览器不支持 WebAudio');

    this.stop();
    this.cancelled = false;
    this.speaking = true;

    this.cloudAbort = new AbortController();
    const signal = this.cloudAbort.signal;

    let pending = this._fetchAudio(chunks[0], signal);
    for (let i = 0; i < chunks.length; i++) {
      this.onChunk?.(chunks[i]);
      const raw = await pending;
      const next = i + 1 < chunks.length ? this._fetchAudio(chunks[i + 1], signal) : null;
      if (this.cancelled) return;
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      if (this.cancelled) return;
      await this._play(ctx, decoded);
      if (!next) break;
      pending = next;
    }
    this._done();
  }

  async _ctx() {
    if (this._ac === undefined) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._ac = AC ? new AC() : null;
    }
    if (this._ac && this._ac.state === 'suspended') await this._ac.resume();
    return this._ac;
  }

  /* 在用户的直接点击中恢复音频上下文。回答生成完成后再恢复，
     部分浏览器会推迟输出，甚至截掉音频开头。 */
  prime() {
    this._ctx().catch(() => {});
  }

  async _fetchAudio(text, signal) {
    const res = await fetch(apiUrl('/api/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error || ''; } catch {}
      throw new Error(detail || `语音合成失败 HTTP ${res.status}`);
    }
    return res.arrayBuffer();
  }

  _play(ctx, buffer) {
    return new Promise((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      this._src = src;
      src.onended = () => { if (this._src === src) this._src = null; resolve(); };
      try {
        src.start();
        this._started();
      } catch { resolve(); }
    });
  }

  _started() {
    if (this.playing) return;
    this.playing = true;
    this.onStateChange?.(true);
  }

  _speakBrowser(text) {
    const chunks = Speaker.chunk(text);
    if (!this.synth || !chunks.length) return Promise.resolve();
    this.stop();
    this.cancelled = false;
    this.speaking = true;

    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (this.cancelled || i >= chunks.length) {
          this._done();
          resolve();
          return;
        }
        const piece = chunks[i++];
        const u = new SpeechSynthesisUtterance(piece);
        u.lang = (this.voice && this.voice.lang) || 'en-US';
        if (this.voice) u.voice = this.voice;
        u.rate = this.rate;
        u.pitch = 1.22;
        u.volume = 1;
        u.onstart = () => this._started();
        this.onChunk && this.onChunk(piece);
        u.onend = () => setTimeout(next, 70);
        u.onerror = () => { this._done(); resolve(); };
        try { this.synth.speak(u); } catch { this._done(); resolve(); }
      };
      // Chromium may truncate an utterance queued immediately after cancel().
      // The short gap is before animation starts, so it does not desynchronize
      // the character from the sound.
      setTimeout(next, 50);
    });
  }

  _done() {
    const wasPlaying = this.playing;
    this.speaking = false;
    this.playing = false;
    if (wasPlaying) this.onStateChange?.(false);
  }

  stop() {
    this.cancelled = true;
    this.cloudAbort?.abort();
    this.cloudAbort = null;
    if (this._src) { try { this._src.stop(); } catch {} this._src = null; }
    if (this.audio) { try { this.audio.pause(); } catch {} this.audio = null; }
    if (this.synth) { try { this.synth.cancel(); } catch {} }
    this._done();
  }
}

/* ---------------------------- ASR ---------------------------- */
export class Listener {
  constructor({ lang = 'en-US', onPartial, onFinal, onError, onStateChange } = {}) {
    this.lang = lang;
    this.onPartial = onPartial;
    this.onFinal = onFinal;
    this.onError = onError;
    this.onStateChange = onStateChange;
    this.listening = false;
    this.rec = null;
    this._wantListen = false;
    this._finalText = '';
    this._retry = 0;
    this.recorder = null;
    this.stream = null;
    this.recordTimer = null;
    this.transcribing = false;
    this.onProcessing = null;   // (busy:boolean) => void  正在把录音转成文字
    this._vadTimer = null;
    this._vadCtx = null;
    this._partialTimer = null;
    this._partialBusy = false;
    this._build();
  }

  static get supported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition ||
      (navigator.mediaDevices?.getUserMedia && window.MediaRecorder));
  }

  _build() {
    // MediaRecorder works in the in-app browser; native SpeechRecognition may exist but fail at runtime.
    if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = this.lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) this._finalText += final;
      const shown = (this._finalText + ' ' + interim).trim();
      this.onPartial && this.onPartial(shown);
    };

    rec.onerror = (e) => {
      const code = e.error || 'unknown';
      if (code === 'no-speech') { this._retry++; return; }
      if (code === 'aborted') return;
      this._wantListen = false;
      this._setState(false);
      this.onError && this.onError(code);
    };

    rec.onend = () => {
      this._setState(false);
      if (this._finalText.trim()) {
        const text = this._finalText.trim();
        this._finalText = '';
        this._wantListen = false;
        this.onFinal && this.onFinal(text);
        return;
      }
      // 没有识别到内容：自动再听一次（最多一次），避免老师反复点击
      if (this._wantListen && this._retry < 1) {
        this._retry++;
        setTimeout(() => this._wantListen && this._start(), 250);
      } else {
        this._wantListen = false;
        this.onError && this.onError('no-speech');
      }
    };

    this.rec = rec;
  }

  _setState(v) {
    if (this.listening === v) return;
    this.listening = v;
    this.onStateChange && this.onStateChange(v);
  }

  _start() {
    if (!this.rec || this.listening) return;
    this._finalText = '';
    try {
      this.rec.start();
      this._setState(true);
    } catch {
      /* 已在运行 */
    }
  }

  start() {
    if (!this.rec) { this._record(); return; }
    this._wantListen = true;
    this._retry = 0;
    try { this.rec.abort(); } catch {}
    setTimeout(() => this._start(), 60);
  }

  stop() {
    this._wantListen = false;
    this._stopVad();
    this._stopPartial();
    if (this.recorder && this.recorder.state === 'recording') {
      clearTimeout(this.recordTimer);
      this.recorder.stop();
      return;
    }
    try { this.rec && this.rec.stop(); } catch {}
    this._setState(false);
  }

  toggle() {
    if (this.transcribing) return;
    this._wantListen ? this.stop() : this.start();
  }

  async _record() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      this.onError?.('unsupported');
      return;
    }
    this._wantListen = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this._wantListen) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      this.recorder = recorder;
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        this._wantListen = false;
        this._stopVad();
        this._stopPartial();
        this._setState(false);
        stream.getTracks().forEach(t => t.stop());
        this.stream = null;
        this.transcribing = true;
        this.onProcessing?.(true);
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size < 800) throw new Error('no-speech');
          const res = await fetch(apiUrl('/api/asr'), { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          const result = String(data.text || '').trim();
          if (!result) throw new Error('no-speech');
          this.onFinal?.(result);
        } catch (e) {
          this.onError?.(e.message || 'recognition-failed');
        } finally {
          this.transcribing = false;
          this.onProcessing?.(false);
        }
      };
      // 每 400ms 落一个分片，供"边说边出字"使用
      recorder.start(400);
      this._setState(true);
      this._watchSilence(stream);
      this._streamTranscript(recorder, chunks);
      // 兜底：最长录 12 秒，避免学生一直不说话把麦克风占住
      this.recordTimer = setTimeout(() => this.stop(), 12000);
    } catch (e) {
      this._wantListen = false;
      this._setState(false);
      this.onError?.(e.name === 'NotAllowedError' ? 'not-allowed' : (e.message || 'mic-error'));
    }
  }

  /* 边说边出字：每 1 秒把"目前为止的整段录音"送一次识别，
     新结果直接顶替上一版显示（整段送，模型有完整上下文，不会把词切碎）。 */
  _streamTranscript(recorder, chunks) {
    this._stopPartial();
    this._partialTimer = setInterval(async () => {
      if (!this.recorder || this.recorder.state !== 'recording') return;
      if (this._partialBusy) return;
      const blob = new Blob(chunks.slice(), { type: recorder.mimeType || 'audio/webm' });
      if (blob.size < 3000) return;
      this._partialBusy = true;
      try {
        const res = await fetch(apiUrl('/api/asr'), {
          method: 'POST',
          headers: { 'Content-Type': blob.type },
          body: blob
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.text && this._wantListen) this.onPartial?.(String(data.text).trim());
      } catch {
        /* 中间某次失败没关系，最后一次仍会给出完整结果 */
      } finally {
        this._partialBusy = false;
      }
    }, 1000);
  }

  _stopPartial() {
    clearInterval(this._partialTimer);
    this._partialTimer = null;
    this._partialBusy = false;
  }

  /* 说完自动收：检测到有人说过话、随后静音 1.1 秒就自动结束录音。
     学生只需要点一次"说话"，不用再点第二次。 */
  _watchSilence(stream) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      const started = performance.now();
      let lastLoud = 0;
      this._vadCtx = ctx;
      this._vadTimer = setInterval(() => {
        if (!this.recorder || this.recorder.state !== 'recording') { this._stopVad(); return; }
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);
        const now = performance.now();
        if (rms > 0.012) lastLoud = now;
        const spoke = lastLoud > 0 && lastLoud - started > 250;
        if (spoke && now - lastLoud > 1100) this.stop();
      }, 100);
    } catch {
      /* 没有 WebAudio 就退回手动点击 / 12 秒兜底 */
    }
  }

  _stopVad() {
    clearInterval(this._vadTimer);
    this._vadTimer = null;
    try { this._vadCtx?.close(); } catch {}
    this._vadCtx = null;
  }
}
