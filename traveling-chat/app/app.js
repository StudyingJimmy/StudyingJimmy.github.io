import { SCENARIOS } from './data.js';
import { Speaker, Listener } from './speech.js';
import { Brain } from './brain.js';
import { apiUrl } from './api.js';
const $ = id => document.getElementById(id);
const speaker = new Speaker();
speaker.setRate(1.02);
const brain = new Brain();
const scene = SCENARIOS[0];
let busy = false;
let toastTimer;
let pendingSubtitle = '';
let earlySpeech = null;
let earlySpeechText = '';

// 流式回答中一出现完整句子，就可以提前送去合成；不必等整段回答结束。
function firstCompleteSentence(value) {
  const match = String(value || '').trim().match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1].trim() : '';
}
function toast(message, ms = 4500) {
  const el = $('toast'); el.textContent = message; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, ms);
}
function status(message, active = false) {
  $('state').querySelector('span').textContent = message;
  $('state').classList.toggle('on', active);
}
function message(role, text) {
  const row = document.createElement('div'); row.className = `msg ${role}`;
  const who = document.createElement('div'); who.className = 'who';
  who.textContent = role === 'student' ? '我' : '✦';
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
  row.append(who, bubble); $('chat').append(row); $('chat').scrollTop = $('chat').scrollHeight;
  return bubble;
}
speaker.onChunk = text => {
  pendingSubtitle = text;
  // The chunk is queued before the browser actually begins sound output.
  // Wait for onStateChange so text and the preloaded talk animation start together.
  if (speaker.playing) { $('subtitle').textContent = text; $('subtitle').classList.add('show'); }
};
speaker.onStateChange = on => {
  document.body.classList.toggle('is-speaking', on);
  if (on && pendingSubtitle) { $('subtitle').textContent = pendingSubtitle; $('subtitle').classList.add('show'); }
  if (!on) { $('subtitle').classList.remove('show'); pendingSubtitle = ''; }
  status(on ? '正在说话…' : '准备好了', on);
};
/* 边说边出字：先挂一条虚线气泡，识别结果不断覆盖它 */
let liveBubble = null;
function showLive(text) {
  if (!liveBubble) {
    liveBubble = message('student', text);
    liveBubble.closest('.msg').classList.add('live');
  } else {
    liveBubble.textContent = text;
    $('chat').scrollTop = $('chat').scrollHeight;
  }
  $('typed').value = text;
}
function clearLive() {
  if (liveBubble) { liveBubble.closest('.msg').remove(); liveBubble = null; }
}

async function studentSaid(text) {
  text = String(text || '').trim();
  if (!text || busy) return;
  busy = true; speaker.stop();
  earlySpeech = null;
  earlySpeechText = '';
  message('student', text);
  const bubble = message('lily', '…');
  status('正在思考…', true);
  try {
    const answer = await brain.respond(text, { onDelta: value => {
      bubble.textContent = value; $('chat').scrollTop = $('chat').scrollHeight;
      // LLM 还在继续生成时，先让 Lily 说出已经完整的第一句。
      if (!earlySpeech) {
        const first = firstCompleteSentence(value);
        if (first) {
          earlySpeechText = first;
          earlySpeech = speaker.speak(first).catch(() => {});
        }
      }
    }});
    bubble.textContent = answer;
    bubble.closest('.msg').classList.add('speaking');
    if (earlySpeech) {
      await earlySpeech;
      const remaining = answer.slice(earlySpeechText.length).trim();
      if (remaining) await speaker.speak(remaining);
    } else {
      await speaker.speak(answer);
    }
    bubble.closest('.msg').classList.remove('speaking');
    if (brain.fallbackReason) {
      $('mode-badge').textContent = '模型连接失败'; $('mode-badge').classList.remove('online');
      toast(`模型未连通：${brain.fallbackReason.slice(0, 110)}`);
      brain.fallbackReason = null;
    }
  } catch (e) { bubble.textContent = 'Sorry. Please say that again.'; toast('对话出错：' + e.message); }
  finally { busy = false; status('准备好了'); }
}
const listener = new Listener({
  lang: 'en-US',
  onPartial: text => showLive(text),
  onFinal: text => { clearLive(); $('typed').value = ''; studentSaid(text); },
  onProcessing: busyNow => {
    if (busyNow) status('正在识别…', true);
    else if (!busy) status('准备好了');
  },
  onError: code => {
    clearLive();
    $('mic').classList.remove('listening'); $('mic').querySelector('.mic-txt').textContent = '点击说话';
    status('准备好了');
    const msg = code === 'not-allowed' ? '请允许本页使用麦克风，再点击说话。'
      : code === 'no-speech' ? '没有听清，请再说一次。'
      : code === 'unsupported' ? '这台电脑的浏览器用不了麦克风，请在输入框里打字。'
      : /百炼|HTTP|asr/i.test(code) ? `语音识别没成功（${code}），可以再说一次或直接打字。`
      : `语音识别失败：${code}`;
    toast(msg);
  },
  onStateChange: on => {
    if (on) clearLive();
    $('mic').classList.toggle('listening', on);
    $('mic').querySelector('.mic-txt').textContent = on ? '正在听…点击结束' : '点击说话';
    status(on ? '正在听你说…' : '准备好了', on);
  }
});
async function loadConfig() {
  try {
    const res = await fetch(apiUrl('/api/config'), { cache: 'no-store' });
    const config = await res.json();
    brain.config.serverReady = !!config.online;
    $('mode-badge').textContent = config.online ? '大模型对话' : '未配置模型';
    $('mode-badge').classList.toggle('online', config.online);
  } catch { $('mode-badge').textContent = '模型不可用'; }
}
async function onMic() {
  speaker.prime();
  if (busy) { toast('请等她说完，再点击说话。'); return; }
  if (speaker.speaking) { speaker.stop(); return; }          // 点一下可打断正在说的话
  if (!Listener.supported) { toast('当前浏览器无法使用麦克风，请在输入框里打字。'); return; }
  listener.toggle();
}

function boot() {
  loadConfig();
  brain.start(scene);            // 没有登场独白，等学生先开口
  $('mic').addEventListener('click', onMic);
  $('send').addEventListener('click', () => { speaker.prime(); const value = $('typed').value; $('typed').value = ''; studentSaid(value); });
  $('typed').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); speaker.prime(); $('send').click(); } });
  $('btn-fullscreen').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {}));
  document.addEventListener('keydown', e => { if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); $('mic').click(); } });
}
document.addEventListener('DOMContentLoaded', boot);
