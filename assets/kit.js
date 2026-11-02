/* Shared helpers for the quest board games: storage, hero name, sound, the dragonborn picture and fraction rendering. */
(function(){
const K = {};
K.$ = id => document.getElementById(id);
const PRIME_KEY = 'prime-hoard-v1'; // hero name and sound live with the original game so every page agrees

K.load = (key, def) => { try{ const r = localStorage.getItem(key); return r ? Object.assign(def, JSON.parse(r)) : def; }catch(e){ return def; } };
K.save = (key, v) => { try{ localStorage.setItem(key, JSON.stringify(v)); }catch(e){} };
const shared = () => K.load(PRIME_KEY, {});
K.heroName = () => ((shared().name || '').trim()) || 'Dragonborn';
K.soundOn = () => shared().sound !== false;
K.setSound = on => { const s = shared(); s.sound = on; K.save(PRIME_KEY, s); };
K.reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
K.bump = el => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
K.esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* "1 3/4" and "5/8" become stacked fractions; everything else passes through. */
K.math = html => String(html)
  .replace(/(\d+) (\d+)\/(\d+)/g, '<span class="mixed">$1<span class="frac"><span>$2</span><span>$3</span></span></span>')
  .replace(/(\d+)\/(\d+)/g, '<span class="frac"><span>$1</span><span>$2</span></span>');

K.heroSVG = `<svg viewBox="0 0 110 110" aria-hidden="true">
  <path d="M40 34 C30 16 16 8 3 10 C14 18 23 28 31 42 Z" fill="var(--bone)"/>
  <path d="M36 50 C24 44 12 45 2 52 C14 55 23 58 32 62 Z" fill="#cbbd9f"/>
  <path d="M38 72 C35 84 31 96 26 110 L64 110 C60 98 59 86 61 74 Z" fill="var(--scale-dark)"/>
  <path d="M31 30 C45 20 64 24 76 35 L97 45 C101 47 101 55 97 57 L76 63 C68 72 52 78 37 74 C28 63 26 43 31 30 Z" fill="var(--scale)"/>
  <path d="M34 30 L38 20 L44 27 L49 18 L54 26 L60 19 L63 29" fill="none" stroke="var(--scale-dark)" stroke-width="4" stroke-linejoin="round"/>
  <path d="M44 62 C52 66 62 66 72 60" fill="none" stroke="var(--scale-dark)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M76 59 L97 55" stroke="#5a140b" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="62" cy="40" rx="6" ry="4.5" fill="var(--gold)"/>
  <ellipse cx="62.5" cy="40" rx="1.4" ry="4" fill="#1a0e08"/>
  <circle cx="90" cy="47" r="1.8" fill="#5a140b"/>
  <circle class="mouth-glow" cx="98" cy="56" r="9" fill="var(--flame)"/>
</svg>`;
K.breathe = el => { if(!el) return; el.classList.add('breathing'); setTimeout(() => el.classList.remove('breathing'), 450); };

/* ---------- sound (same voices as Prime Hoard) ---------- */
let ac = null;
function audio(){ if(!ac){ try{ ac = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ac = null; } } return ac; }
K.sfx = kind => {
  if(!K.soundOn()) return;
  const a = audio(); if(!a) return;
  if(a.state === 'suspended') a.resume();
  const t = a.currentTime;
  const tone = (fq, s, len, vol, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.value = fq; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .02); g.gain.exponentialRampToValueAtTime(.001, s + len); o.connect(g).connect(a.destination); o.start(s); o.stop(s + len + .05); };
  if(kind === 'fire'){
    const len = 0.5, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .8;
    f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1400, t + .2); f.frequency.linearRampToValueAtTime(350, t + len);
    const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .06); g.gain.exponentialRampToValueAtTime(.001, t + len);
    src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + len);
  } else if(kind === 'gem'){
    [880, 1320, 1760].forEach((fq, i) => tone(fq, t + i * .08, .55, .13));
  } else if(kind === 'clink'){
    tone(1320, t, .25, .1);
  } else if(kind === 'miss'){
    const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(240, t); o.frequency.linearRampToValueAtTime(150, t + .3);
    g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .35);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + .4);
  } else if(kind === 'win'){
    [523, 659, 784, 1047].forEach((fq, i) => tone(fq, t + i * .12, .5, .12, 'triangle'));
  } else if(kind === 'tick'){
    tone(660, t, .08, .05, 'square');
  }
};

/* Wires a "Sound: on/off" button. */
K.soundButton = btn => {
  const render = () => { btn.textContent = K.soundOn() ? 'Sound: on' : 'Sound: off'; btn.setAttribute('aria-pressed', String(K.soundOn())); };
  btn.addEventListener('click', () => { K.setSound(!K.soundOn()); render(); });
  render();
};

K.scrollTo = el => el.scrollIntoView({ behavior: K.reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });

window.Kit = K;
})();
