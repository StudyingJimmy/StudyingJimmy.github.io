const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://studyingjimmy.github.io';
  return { 'Access-Control-Allow-Origin': origin === allowed ? allowed : 'null', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}
function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json; charset=utf-8' } });
}
function error(request, env, message, status = 500) { return json(request, env, { error: message }, status); }
function base64(buffer) {
  const bytes = new Uint8Array(buffer), chunks = [], size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) chunks.push(String.fromCharCode(...bytes.subarray(i, i + size)));
  return btoa(chunks.join(''));
}
function auth(env, extra = {}) { return { Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, ...extra }; }

async function chat(request, env) {
  const body = await request.json();
  if (!Array.isArray(body.messages) || !body.messages.length) return error(request, env, 'messages 不能为空', 400);
  const base = (env.DASHSCOPE_BASE_URL || '').replace(/\/$/, '');
  const upstream = await fetch(`${base}/chat/completions`, { method: 'POST', headers: auth(env, { 'Content-Type': 'application/json', Accept: 'text/event-stream' }), body: JSON.stringify({ model: env.CHAT_MODEL || 'qwen-plus', messages: body.messages, stream: true, temperature: 0.75, max_tokens: 350 }) });
  if (!upstream.ok) return error(request, env, `模型服务返回 HTTP ${upstream.status}`, 502);
  return new Response(upstream.body, { headers: { ...corsHeaders(request, env), 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' } });
}

async function asr(request, env) {
  const mime = (request.headers.get('Content-Type') || 'audio/webm').split(';')[0];
  if (!['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'].includes(mime)) return error(request, env, '不支持的录音格式', 415);
  const audio = await request.arrayBuffer();
  if (audio.byteLength < 100 || audio.byteLength > MAX_AUDIO_BYTES) return error(request, env, '录音文件大小不合适', 413);
  const base = (env.DASHSCOPE_BASE_URL || '').replace(/\/$/, '');
  const upstream = await fetch(`${base}/chat/completions`, { method: 'POST', headers: auth(env, { 'Content-Type': 'application/json' }), body: JSON.stringify({ model: env.ASR_MODEL || 'qwen3-asr-flash', messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: `data:${mime};base64,${base64(audio)}` } }] }], stream: false, asr_options: { language: 'en' } }) });
  if (!upstream.ok) return error(request, env, `语音识别服务返回 HTTP ${upstream.status}`, 502);
  const result = await upstream.json();
  return json(request, env, { text: result.choices?.[0]?.message?.content || '' });
}

async function tts(request, env) {
  const { text } = await request.json();
  const input = String(text || '').trim().slice(0, 600);
  if (!input) return error(request, env, '缺少文本', 400);
  const upstream = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer', { method: 'POST', headers: auth(env, { 'Content-Type': 'application/json' }), body: JSON.stringify({ model: env.TTS_MODEL || 'cosyvoice-v3-flash', input: { text: input, voice: env.TTS_VOICE || 'longhuhu_v3', format: 'wav', sample_rate: 24000 } }) });
  if (!upstream.ok) return error(request, env, `语音合成服务返回 HTTP ${upstream.status}`, 502);
  const result = await upstream.json(), audio = result.output?.audio || {};
  let sound;
  if (audio.data) sound = Uint8Array.from(atob(audio.data), c => c.charCodeAt(0));
  else if (audio.url) {
    const url = new URL(audio.url);
    if (!url.hostname.endsWith('.aliyuncs.com') && url.hostname !== 'aliyuncs.com') return error(request, env, '语音服务返回了不可信地址', 502);
    const response = await fetch(audio.url);
    if (!response.ok) return error(request, env, '无法下载语音文件', 502);
    sound = await response.arrayBuffer();
  } else return error(request, env, '语音服务未返回音频', 502);
  return new Response(sound, { headers: { ...corsHeaders(request, env), 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(request, env) });
    if (!env.DASHSCOPE_API_KEY) return error(request, env, '服务尚未配置 API Key', 503);
    const path = new URL(request.url).pathname;
    try {
      if (request.method === 'GET' && path === '/api/config') return json(request, env, { online: true, model: env.CHAT_MODEL || 'qwen-plus' });
      if (request.method === 'POST' && path === '/api/chat') return chat(request, env);
      if (request.method === 'POST' && path === '/api/asr') return asr(request, env);
      if (request.method === 'POST' && path === '/api/tts') return tts(request, env);
      return error(request, env, '未找到接口', 404);
    } catch (cause) { return error(request, env, cause instanceof Error ? cause.message : '服务错误', 500); }
  }
};
