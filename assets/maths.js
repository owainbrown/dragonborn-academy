/* Maths engine for the quest board. Pure functions, no DOM: loaded by the game pages and by the node tests. */
(function(root){
'use strict';

/* ---------- basics ---------- */
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weighted(pairs){ let t = 0; pairs.forEach(p => t += p[1]); let r = Math.random() * t; for(const p of pairs){ r -= p[1]; if(r <= 0) return p[0]; } return pairs[pairs.length - 1][0]; }
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while(b){ [a, b] = [b, a % b]; } return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const MINUS = '−';
const fmt = n => (n < 0 ? MINUS : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const listAnd = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];

/* ---------- factors ---------- */
function factors(n){ const out = []; for(let d = 1; d <= n; d++) if(n % d === 0) out.push(d); return out; }
function factorPairs(n){ const out = []; for(let a = 1; a * a <= n; a++) if(n % a === 0) out.push([a, n / a]); return out; }
function commonFactors(a, b){ return factors(Math.min(a, b)).filter(f => a % f === 0 && b % f === 0); }
function isPrime(n){ if(n < 2) return false; for(let d = 2; d * d <= n; d++) if(n % d === 0) return false; return true; }

/* Numbers for Factor Forge: weighted towards numbers with lots of factors, with the odd prime as a twist. */
function pickFactorNumber(recent){
  recent = recent || [];
  const pool = [];
  for(let n = 6; n <= 100; n++){
    if(recent.includes(n)) continue;
    const c = factors(n).length;
    const w = c >= 4 ? c - 2 : (isPrime(n) && n > 10 ? 0.4 : 0);
    if(w > 0) pool.push([n, w]);
  }
  return weighted(pool);
}

/* Pairs for Shared Hoard: built from a chosen greatest common factor so every pair is interesting. */
function pickCommonPair(recent){
  recent = recent || [];
  for(let tries = 0; tries < 1000; tries++){
    const g = pick([1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10, 12, 15]);
    const m1 = randInt(1, 12), m2 = randInt(1, 12);
    if(m1 === m2 || gcd(m1, m2) !== 1) continue;
    const a = Math.min(g * m1, g * m2), b = Math.max(g * m1, g * m2);
    if(b > 100 || a > 60 || b < 8 || a < 4) continue;
    if(g === 1 && Math.random() < 0.6) continue;
    if(recent.includes(a + ',' + b)) continue;
    return [a, b];
  }
  return [12, 30];
}

/* ---------- words for numbers (British) ---------- */
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const w100 = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
const w1000 = n => { const h = Math.floor(n / 100), r = n % 100; return h ? ONES[h] + ' hundred' + (r ? ' and ' + w100(r) : '') : w100(r); };
function words(n){
  if(n === 0) return 'zero';
  if(n < 0) return 'negative ' + words(-n);
  const m = Math.floor(n / 1e6), th = Math.floor(n / 1000) % 1000, r = n % 1000, parts = [];
  if(m) parts.push(w1000(m) + ' million');
  if(th) parts.push(w1000(th) + ' thousand');
  if(r) parts.push((parts.length && r < 100 ? 'and ' : '') + w1000(r));
  return parts.join(', ').replace(', and ', ' and ');
}
const PLACE = ['ones','tens','hundreds','thousands','ten thousands','hundred thousands','millions','ten millions'];
const placeName = p => PLACE[Math.round(Math.log10(p))];

/* ---------- fractions ---------- */
function simp(n, d){ const g = gcd(n, d); return [n / g, d / g]; }
function fstr(n, d){ const [a, b] = simp(n, d); if(b === 1) return String(a); if(a > b) return `${Math.floor(a / b)} ${a % b}/${b}`; return `${a}/${b}`; }
function fval(s){ // "3/4", "1 1/2" or "5" to a number
  s = String(s).trim();
  let m = s.match(/^(\d+) (\d+)\/(\d+)$/); if(m) return +m[1] + m[2] / m[3];
  m = s.match(/^(\d+)\/(\d+)$/); if(m) return m[1] / m[2];
  return Number(s.replace(/,/g, ''));
}
const sameVal = (a, b) => Math.abs(fval(a) - fval(b)) < 1e-9;
function properFrac(dens){ const d = pick(dens); let n; do { n = randInt(1, d - 1); } while(gcd(n, d) !== 1); return [n, d]; }
const DENS = [2, 3, 4, 5, 6, 8, 10, 12];

/* ---------- question plumbing ---------- */
const numFallback = (ans, spread, suffix) => () => { let k = 0; while(k === 0) k = randInt(-spread, spread); return fmt(ans + k) + (suffix || ''); };
function finalize(q){
  const out = [q.answer], seen = new Set(out);
  const ok = s => s !== '' && !seen.has(s) && !(q.reject && q.reject(s));
  for(const d of q.distractors){ const s = String(d); if(ok(s)){ seen.add(s); out.push(s); } if(out.length === 4) break; }
  for(let guard = 0; out.length < 4 && guard < 300; guard++){ const s = String(q.fallback()); if(ok(s)){ seen.add(s); out.push(s); } }
  const choices = shuffle(out);
  return { kind: q.kind, prompt: q.prompt, choices, answer: choices.indexOf(q.answer), explain: q.explain };
}
const op = s => s.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/-/g, ` ${MINUS} `).replace(/\+/g, ' + ');

/* ---------- Vault of Ten Million: place value and negatives ---------- */
const VAULT = {
  words(){
    let s;
    do {
      s = String(randInt(1, 9));
      for(let i = 0; i < 6; i++) s += Math.random() < 0.4 ? '0' : String(randInt(1, 9));
    } while((s.match(/0/g) || []).length < 2);
    const n = +s, vars = [];
    for(let i = 1; i < s.length - 1; i++){
      if((s[i] === '0') !== (s[i + 1] === '0')){ const a = s.split(''); [a[i], a[i + 1]] = [a[i + 1], a[i]]; vars.push(+a.join('')); }
    }
    const z = s.indexOf('0', 1); if(z > 0) vars.push(+(s.slice(0, z) + s.slice(z + 1)));
    const m = Math.floor(n / 1e6), th = Math.floor(n / 1000) % 1000, r = n % 1000;
    return { kind:'words', answer: fmt(n), distractors: shuffle(vars).map(fmt),
      prompt: `Which number is <b>${words(n)}</b>?`,
      explain: `Split it up: ${m} million, ${th} thousand and ${r}. Write each part in its own block of three digits, using zeros for empty columns: <b>${fmt(n)}</b>.`,
      fallback: numFallback(n, 9000) };
  },
  digitValue(){
    let s, idx;
    do { s = String(randInt(1000000, 9999999)); const opts = [...s].map((c, i) => i).filter(i => s[i] !== '0' && s.indexOf(s[i]) === s.lastIndexOf(s[i])); idx = opts.length ? pick(opts) : -1; } while(idx < 0);
    const d = +s[idx], place = 10 ** (s.length - 1 - idx), ans = d * place;
    let shown = '', di = 0; for(const c of fmt(+s)){ if(c === ','){ shown += c; continue; } shown += di === idx ? `<u>${c}</u>` : c; di++; }
    return { kind:'digitValue', answer: fmt(ans), distractors: [fmt(ans * 10), place >= 10 ? fmt(ans / 10) : fmt(ans * 100), fmt(d), fmt(ans * 100)],
      prompt: `In <b>${shown}</b>, what is the underlined digit worth?`,
      explain: `The ${d} is in the <b>${placeName(place)}</b> column, so it is worth ${d} × ${fmt(place)} = <b>${fmt(ans)}</b>.`,
      fallback: () => fmt(d * 10 ** randInt(0, 7)) };
  },
  rounding(){
    const n = randInt(100000, 9999999);
    const p = pick([10, 100, 1000, 10000, 100000, 1000000].filter(x => x * 10 <= n));
    const down = Math.floor(n / p) * p, up = down + p, ans = Math.round(n / p) * p;
    const dec = Math.floor(n / (p / 10)) % 10;
    const ds = [ans === down ? up : down, Math.round(n / (p * 10)) * p * 10];
    if(p >= 100) ds.push(Math.round(n / (p / 10)) * (p / 10));
    return { kind:'rounding', answer: fmt(ans), distractors: ds.map(fmt),
      prompt: `Round <b>${fmt(n)}</b> to the nearest <b>${fmt(p)}</b>.`,
      explain: `${fmt(n)} is between ${fmt(down)} and ${fmt(up)}. Look one column to the right, at the ${placeName(p / 10)}: it's a <b>${dec}</b>. ${dec >= 5 ? '5 or more, so round up' : 'Less than 5, so round down'} to <b>${fmt(ans)}</b>.`,
      fallback: () => fmt((Math.floor(n / p) + randInt(-3, 3)) * p) };
  },
  compare(){
    const prefix = String(randInt(1, 9)) + String(randInt(0, 9)), set = new Set();
    while(set.size < 4){ let s = prefix; for(let i = 0; i < 5; i++) s += randInt(0, 9); set.add(+s); }
    const nums = [...set], big = Math.random() < 0.5, ans = big ? Math.max(...nums) : Math.min(...nums);
    const sorted = nums.slice().sort((a, b) => big ? b - a : a - b);
    return { kind:'compare', answer: fmt(ans), distractors: nums.filter(x => x !== ans).map(fmt),
      prompt: `Four dragons count their hoards. Which hoard is the <b>${big ? 'largest' : 'smallest'}</b>?`,
      explain: `Compare digits from the left. They all start ${prefix[0]},${prefix[1]}… so look at the next digit along until one differs. ${big ? 'Largest' : 'Smallest'} first: ${sorted.map(fmt).join(', ')}.`,
      fallback: () => fmt(+(prefix + randInt(10000, 99999))) };
  },
  tempChange(){
    let t, c, up, r;
    do { t = randInt(-12, 8); c = randInt(3, 15); up = Math.random() < 0.5; r = up ? t + c : t - c; } while(t === 0 || r === 0 || Math.sign(t) === Math.sign(r));
    const deg = x => fmt(x) + '°C';
    return { kind:'tempChange', answer: deg(r), distractors: [deg(-r), deg(up ? t - c : t + c), deg(r + (r > 0 ? 2 : -2))],
      prompt: `The ice cavern is <b>${deg(t)}</b>. ${up ? `The dragon's fire warms it by <b>${c}°C</b>` : `A frost spell cools it by <b>${c}°C</b>`}. What is the temperature now?`,
      explain: `Picture a number line. Start at ${deg(t)} and count <b>${up ? 'up' : 'down'}</b> ${c}: ${t > 0 ? `${t} to zero` : `${-t} to zero`}, then ${c - Math.abs(t)} more ${up ? 'above' : 'below'} zero. That's <b>${deg(r)}</b>.`,
      fallback: numFallback(r, 6, '°C') };
  },
  tempDiff(){
    const a = randInt(-15, -1), b = randInt(1, 15), ans = b - a;
    return { kind:'tempDiff', answer: `${ans}°C`, distractors: [`${Math.abs(b + a) || ans + 2}°C`, `${ans - 1}°C`, `${ans + 1}°C`],
      prompt: `The dungeon is <b>${fmt(a)}°C</b> and the forge is <b>${b}°C</b>. How much warmer is the forge?`,
      explain: `Count through zero: from ${fmt(a)}°C up to 0 is ${-a}, then 0 up to ${b} is ${b}. ${-a} + ${b} = <b>${ans}°C</b>.`,
      fallback: () => `${ans + randInt(2, 8) * (Math.random() < .5 ? -1 : 1)}°C` };
  },
  coldest(){
    const set = new Set(); set.add(-randInt(2, 9)); set.add(-randInt(11, 19));
    while(set.size < 4) set.add(randInt(-20, 10));
    const ts = [...set], cold = Math.random() < 0.6, ans = cold ? Math.min(...ts) : Math.max(...ts);
    const sorted = ts.slice().sort((x, y) => cold ? x - y : y - x);
    return { kind:'coldest', answer: fmt(ans) + '°C', distractors: ts.filter(x => x !== ans).map(x => fmt(x) + '°C'),
      prompt: `Four caves have these temperatures. Which is the <b>${cold ? 'coldest' : 'warmest'}</b>?`,
      explain: `The further below zero, the colder: ${MINUS}15 is colder than ${MINUS}5. ${cold ? 'Coldest' : 'Warmest'} first: ${sorted.map(x => fmt(x) + '°C').join(', ')}.`,
      fallback: () => fmt(randInt(-20, 10)) + '°C' };
  }
};

/* ---------- Spell Order: four operations and BIDMAS ---------- */
const SPELLS = {
  bidmas(){
    for(;;){
      const t = randInt(1, 6), a = randInt(2, 12), b = randInt(2, 12), c = randInt(2, 9), d = randInt(2, 6);
      let expr, ans, wrong, steps;
      if(t === 1){ expr = `${a}+${b}*${c}`; ans = a + b * c; wrong = (a + b) * c; steps = `No brackets, so multiply first: ${b} × ${c} = ${b * c}. Then ${a} + ${b * c} = ${ans}.`; }
      else if(t === 2){ expr = `(${a}+${b})*${c}`; ans = (a + b) * c; wrong = a + b * c; steps = `Brackets first: ${a} + ${b} = ${a + b}. Then ${a + b} × ${c} = ${ans}.`; }
      else if(t === 3){ const big = b * c + randInt(5, 40); expr = `${big}-${b}*${c}`; ans = big - b * c; wrong = (big - b) * c; steps = `Multiply before subtracting: ${b} × ${c} = ${b * c}. Then ${big} ${MINUS} ${b * c} = ${ans}.`; }
      else if(t === 4){ expr = `${a}*${b}+${c}*${d}`; ans = a * b + c * d; wrong = (a * b + c) * d; steps = `Do both multiplications first: ${a} × ${b} = ${a * b} and ${c} × ${d} = ${c * d}. Then ${a * b} + ${c * d} = ${ans}.`; }
      else if(t === 5){ const q = b, big = c * q; expr = `${a}+${big}/${c}`; ans = a + q; wrong = (a + big) % c === 0 ? (a + big) / c : a + big; steps = `Divide before adding: ${big} ÷ ${c} = ${q}. Then ${a} + ${q} = ${ans}.`; }
      else { const s = randInt(1, b - 1 > 0 ? b - 1 : 1), e = randInt(1, 9); expr = `${a}*(${b}-${s})+${e}`; ans = a * (b - s) + e; wrong = a * b - s + e; steps = `Brackets first: ${b} ${MINUS} ${s} = ${b - s}. Then multiply: ${a} × ${b - s} = ${a * (b - s)}. Finally add ${e}: ${ans}.`; }
      if(wrong === ans || ans <= 0 || wrong <= 0) continue;
      return { kind:'bidmas', answer: fmt(ans), distractors: [fmt(wrong), fmt(ans + c), fmt(Math.abs(ans - a) || ans + 3)],
        prompt: `Cast the spell in the right order:<br><b class="expr">${op(expr).replace(/\( /g, '(').replace(/ \)/g, ')')}</b>`,
        explain: `BIDMAS: Brackets, Indices, Division and Multiplication, then Addition and Subtraction. ${steps}`,
        fallback: numFallback(ans, 12) };
    }
  },
  longMult(){
    const a = randInt(124, 987); let b; do { b = randInt(13, 89); } while(b % 10 === 0);
    const ans = a * b, u = b % 10, t = b - u, pu = a * u, pt = a * t;
    return { kind:'longMult', answer: fmt(ans), distractors: [fmt(pu + pt / 10), fmt(ans + a), fmt(ans - 100), fmt(ans + 10)],
      prompt: `The blacksmith forges <b>${b}</b> crates of <b>${a}</b> arrows. How many arrows?<br><b class="expr">${a} × ${b}</b>`,
      explain: `Long multiplication in two rows. ${a} × ${u} = ${fmt(pu)}. ${a} × ${t} = ${fmt(pt)} (put a placeholder zero in the ones column first). Add the rows: ${fmt(pu)} + ${fmt(pt)} = <b>${fmt(ans)}</b>.`,
      fallback: numFallback(ans, 300) };
  },
  shortDiv(){
    let n, d, q, r; do { d = randInt(3, 9); n = randInt(1000, 9999); q = Math.floor(n / d); r = n % d; } while(r === 0);
    const rr = r === d - 1 ? r - 1 : r + 1;
    return { kind:'shortDiv', answer: `${fmt(q)} r ${r}`, distractors: [`${fmt(q - 1)} r ${r + d}`, `${fmt(q + 1)} r ${r}`, `${fmt(q)} r ${rr}`, `${fmt(q + 10)} r ${r}`],
      prompt: `Short division:<br><b class="expr">${fmt(n)} ÷ ${d}</b>`,
      explain: `Check by multiplying back: ${d} × ${fmt(q)} = ${fmt(d * q)}, and ${fmt(n)} ${MINUS} ${fmt(d * q)} = ${r} left over. The remainder must always be smaller than ${d}, or another ${d} would fit.`,
      fallback: () => `${fmt(q + randInt(-20, 20) || q + 2)} r ${randInt(1, d - 1)}` };
  },
  column(){
    const add = Math.random() < 0.5; let a = randInt(20000, 899999), b = randInt(10000, 599999);
    if(!add && b > a) [a, b] = [b, a];
    const ans = add ? a + b : a - b;
    const sa = String(a), sb = String(b).padStart(sa.length, '0');
    const noCarry = +[...sa].map((c, i) => add ? (+c + +sb[i]) % 10 : Math.abs(+c - +sb[i])).join('');
    return { kind:'column', answer: fmt(ans), distractors: [fmt(noCarry), fmt(ans + 1000), fmt(ans - 10), fmt(ans + 100)],
      prompt: `${add ? 'Two treasure chests are emptied together' : 'A thief steals from the hoard'}:<br><b class="expr">${fmt(a)} ${add ? '+' : MINUS} ${fmt(b)}</b>`,
      explain: `Line up the columns and work right to left, ${add ? 'carrying' : 'exchanging'} when you need to. ${fmt(a)} ${add ? '+' : MINUS} ${fmt(b)} = <b>${fmt(ans)}</b>. Check with the inverse: ${add ? `${fmt(ans)} ${MINUS} ${fmt(b)} = ${fmt(a)}` : `${fmt(ans)} + ${fmt(b)} = ${fmt(a)}`}.`,
      fallback: numFallback(ans, 2000) };
  },
  change(){
    const p = randInt(105, 495), k = randInt(2, 6), m = Math.ceil((p * k + 1) / 1000) * 1000, ans = m - p * k;
    return { kind:'change', answer: fmt(ans) + ' gold', distractors: [fmt(m - p) + ' gold', fmt(p * k) + ' gold', fmt(ans + p) + ' gold', fmt(ans + 10) + ' gold'],
      prompt: `A healing potion costs <b>${p} gold</b>. Your party buys <b>${k}</b> and pays with <b>${fmt(m)} gold</b>. How much change?`,
      explain: `Two steps. First the total: ${k} × ${p} = ${fmt(p * k)} gold. Then the change: ${fmt(m)} ${MINUS} ${fmt(p * k)} = <b>${fmt(ans)} gold</b>.`,
      fallback: numFallback(ans, 50, ' gold') };
  },
  share(){
    let n, k, q, r; do { k = randInt(3, 8); n = randInt(100, 999); q = Math.floor(n / k); r = n % k; } while(r === 0);
    return { kind:'share', answer: `${q} each, ${r} left`, distractors: [`${q + 1} each, ${r} left`, `${q} each, ${r === k - 1 ? r - 1 : r + 1} left`, `${q - 1} each, ${r + k} left`],
      prompt: `<b>${k}</b> adventurers share <b>${n}</b> gold coins equally. How many each, and how many left over?`,
      explain: `${n} ÷ ${k}: ${k} × ${q} = ${k * q}, which leaves ${n} ${MINUS} ${k * q} = ${r}. So <b>${q} each with ${r} left over</b>.`,
      fallback: () => `${q + randInt(-5, 5) || q + 2} each, ${randInt(1, k - 1)} left` };
  },
  multiStep(){
    const c = randInt(2, 5), cv = pick([1250, 1500, 2400, 3125, 1750]), g = randInt(2, 6), gv = randInt(12, 48) * 25;
    const ans = c * cv + g * gv;
    return { kind:'multiStep', answer: fmt(ans), distractors: [fmt(c * cv + gv), fmt(cv + g * gv), fmt((c + g) * (cv + gv)), fmt(ans + 100)],
      prompt: `A dragon sleeps on <b>${c} chests</b> of <b>${fmt(cv)}</b> coins and <b>${g} bags</b> of <b>${gv}</b> coins. How many coins altogether?`,
      explain: `Work out each part, then add. Chests: ${c} × ${fmt(cv)} = ${fmt(c * cv)}. Bags: ${g} × ${gv} = ${fmt(g * gv)}. Total: <b>${fmt(ans)}</b>.`,
      fallback: numFallback(ans, 500) };
  }
};

/* ---------- Potion Brewing: fractions ---------- */
const POTIONS = {
  simplify(){
    const [p, q] = properFrac([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]), k = randInt(2, 6), N = p * k, D = q * k;
    const partials = []; for(let f = 2; f < k; f++) if(k % f === 0) partials.push(`${N / f}/${D / f}`);
    return { kind:'simplify', answer: `${p}/${q}`, distractors: [...partials, `${p}/${D}`, `${N}/${q}`, p + 1 < q ? `${p + 1}/${q}` : `${p}/${q + 1}`],
      reject: s => sameVal(s, `${p}/${q}`) && !partials.includes(s),
      prompt: `Simplify this potion recipe fully:<br><b class="expr">${N}/${D}</b>`,
      explain: `Find the greatest common factor of ${N} and ${D}: it's <b>${k}</b>. ${N} ÷ ${k} = ${p} and ${D} ÷ ${k} = ${q}, so ${N}/${D} = <b>${p}/${q}</b>. Your factor training pays off here.`,
      fallback: () => `${randInt(1, q)}/${randInt(q, q + 6)}` };
  },
  compare(){
    const set = new Map();
    while(set.size < 4){ const [n, d] = properFrac(DENS); const key = (n / d).toFixed(6); if(!set.has(key)) set.set(key, [n, d]); }
    const fr = [...set.values()], big = Math.random() < 0.65;
    const best = fr.reduce((x, y) => (big ? y[0] / y[1] > x[0] / x[1] : y[0] / y[1] < x[0] / x[1]) ? y : x);
    const L = fr.reduce((a, f) => lcm(a, f[1]), 1);
    const sorted = fr.slice().sort((x, y) => big ? y[0] / y[1] - x[0] / x[1] : x[0] / x[1] - y[0] / y[1]);
    return { kind:'compare', answer: `${best[0]}/${best[1]}`, distractors: fr.filter(f => f !== best).map(f => `${f[0]}/${f[1]}`),
      prompt: `Four potion bottles are filled to these fractions. Which is <b>${big ? 'fullest' : 'emptiest'}</b>?`,
      explain: `Give them all the same denominator, ${L}: ${fr.map(f => `${f[0]}/${f[1]} = ${f[0] * L / f[1]}/${L}`).join(', ')}. ${big ? 'Fullest' : 'Emptiest'} first: ${sorted.map(f => `${f[0]}/${f[1]}`).join(', ')}.`,
      fallback: () => '1/2' };
  },
  addSub(){
    let n1, d1, n2, d2, L, add;
    do { [n1, d1] = properFrac(DENS); [n2, d2] = properFrac(DENS); L = lcm(d1, d2); add = Math.random() < 0.55; }
    while(d1 === d2 || L > 24 || (!add && n1 / d1 <= n2 / d2));
    const a = n1 * L / d1, b = n2 * L / d2, r = add ? a + b : a - b, ans = fstr(r, L);
    const naive = add ? `${n1 + n2}/${d1 + d2}` : (n1 > n2 && d1 !== d2 ? `${n1 - n2}/${Math.abs(d1 - d2)}` : `${n1}/${d1 + d2}`);
    const shown = `${r}/${L}`, conv = shown === ans ? '' : ` = <b>${ans}</b>`;
    return { kind:'addSub', answer: ans, distractors: [naive, fstr(r + 1, L), fstr(add ? n1 * n2 : Math.max(1, r - 1), add ? d1 * d2 : L), `${n1 + n2}/${L}`],
      reject: s => sameVal(s, ans),
      prompt: `Mix the potions:<br><b class="expr">${n1}/${d1} ${add ? '+' : MINUS} ${n2}/${d2}</b>`,
      explain: `The denominators must match first. The lowest common multiple of ${d1} and ${d2} is ${L}. ${n1}/${d1} = ${a}/${L} and ${n2}/${d2} = ${b}/${L}. Then ${a}/${L} ${add ? '+' : MINUS} ${b}/${L} = ${shown}${conv}${conv ? ' in its simplest form' : ''}.`,
      fallback: () => fstr(randInt(1, 2 * L), L) };
  },
  mixedToImproper(){
    const w = randInt(1, 5), [n, d] = properFrac([2, 3, 4, 5, 6, 7, 8, 9]), ans = `${w * d + n}/${d}`;
    return { kind:'mixedToImproper', answer: ans, distractors: [`${w * n + d}/${d}`, `${w + n}/${d}`, `${w * d + n}/${w * d}`, `${w * d - n}/${d}`],
      reject: s => sameVal(s, ans),
      prompt: `Turn this into an improper fraction:<br><b class="expr">${w} ${n}/${d}</b>`,
      explain: `Each whole is ${d}/${d}, so ${w} wholes make ${w} × ${d} = ${w * d} pieces. Add the ${n} extra pieces: <b>${ans}</b>.`,
      fallback: () => `${randInt(d + 1, 6 * d)}/${d}` };
  },
  improperToMixed(){
    const w = randInt(1, 5), [n, d] = properFrac([2, 3, 4, 5, 6, 7, 8, 9]), ans = `${w} ${n}/${d}`;
    return { kind:'improperToMixed', answer: ans, distractors: [`${w + 1} ${n}/${d}`, d - n !== n ? `${w} ${d - n}/${d}` : `${w} ${n}/${d + 1}`, w > 1 ? `${w - 1} ${n}/${d}` : `${n} ${w}/${d}`],
      reject: s => sameVal(s, ans),
      prompt: `Turn this into a mixed number:<br><b class="expr">${w * d + n}/${d}</b>`,
      explain: `How many whole ${d}s fit in ${w * d + n}? ${w} × ${d} = ${w * d}, with ${n} left over. So it's <b>${ans}</b>.`,
      fallback: () => `${randInt(1, 6)} ${randInt(1, d - 1)}/${d}` };
  },
  timesWhole(){
    const [n, d] = properFrac([3, 4, 5, 6, 8, 10]), k = randInt(2, 6), ans = fstr(n * k, d);
    return { kind:'timesWhole', answer: ans, distractors: [`${n * k}/${d * k}`, `${n}/${d * k}`, fstr(n * k + 1, d), fstr(n + k, d)],
      reject: s => sameVal(s, ans),
      prompt: `Brew <b>${k}</b> batches of <b>${n}/${d}</b> of a cauldron:<br><b class="expr">${n}/${d} × ${k}</b>`,
      explain: `Multiply the numerator and keep the denominator: ${n} × ${k} = ${n * k}, so ${n * k}/${d}${`${n * k}/${d}` === ans ? '' : `, which is <b>${ans}</b>`}.`,
      fallback: () => fstr(randInt(1, 30), d) };
  },
  ofAmount(){
    const [n, d] = properFrac([2, 3, 4, 5, 6, 8, 10, 12]), A = d * randInt(2, 12), part = A / d, ans = part * n;
    return { kind:'ofAmount', answer: String(ans), distractors: [String(part), String(A - ans || A), String(ans + part), String(A % n === 0 ? A / n : A * n)],
      prompt: `A dragon guards <b>${A} gold coins</b>. You may take <b>${n}/${d}</b> of them. How many coins is that?`,
      explain: `Divide by the denominator, then multiply by the numerator. ${A} ÷ ${d} = ${part}, and ${part} × ${n} = <b>${ans}</b>.`,
      fallback: numFallback(ans, 8) };
  }
};

const QUESTS = {
  vault: { title:'Vault of Ten Million', blurb:'Place value to 10,000,000, rounding and negative numbers.', gens: VAULT,
    kinds: { words:['Reading big numbers', 1], digitValue:['Place value', 1.2], rounding:['Rounding', 1.4], compare:['Comparing numbers', 0.8], tempChange:['Negative numbers', 1.2], tempDiff:['Differences across zero', 1], coldest:['Ordering negatives', 0.7] } },
  spells: { title:'Spell Order', blurb:'BIDMAS, long multiplication, short division and multi-step problems.', gens: SPELLS,
    kinds: { bidmas:['Order of operations', 2], longMult:['Long multiplication', 1], shortDiv:['Short division', 1], column:['Column addition and subtraction', 0.8], change:['Two-step problems', 0.8], share:['Remainders in context', 0.7], multiStep:['Multi-step problems', 0.7] } },
  potions: { title:'Potion Brewing', blurb:'Simplify, compare, add, subtract and multiply fractions.', gens: POTIONS,
    kinds: { simplify:['Simplifying', 1.2], compare:['Comparing fractions', 1], addSub:['Adding and subtracting', 2], mixedToImproper:['Mixed to improper', 0.8], improperToMixed:['Improper to mixed', 0.8], timesWhole:['Multiplying by a whole number', 1], ofAmount:['Fractions of amounts', 1] } }
};

function makeQuestion(quest, weak, avoidKind){
  const Q = QUESTS[quest]; weak = weak || {};
  const pairs = Object.entries(Q.kinds).map(([k, v]) => [k, v[1] * (1 + Math.min(weak[k] || 0, 3)) * (k === avoidKind ? 0.3 : 1)]);
  const kind = weighted(pairs);
  return finalize(Q.gens[kind]());
}

const Maths = { randInt, pick, shuffle, gcd, lcm, fmt, listAnd, factors, factorPairs, commonFactors, isPrime,
  pickFactorNumber, pickCommonPair, words, fstr, fval, sameVal, finalize, makeQuestion, QUESTS, MINUS };
if(typeof module !== 'undefined' && module.exports) module.exports = Maths;
else root.Maths = Maths;
})(typeof window !== 'undefined' ? window : globalThis);
