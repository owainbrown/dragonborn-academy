// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../assets/maths.js');

const RUNS = 400;
const num = s => Number(String(s).replace(/[,\s]|gold|°C/g, '').replace(M.MINUS, '-'));

test('factors and common factors match the school sheet', () => {
  assert.deepEqual(M.factors(12), [1, 2, 3, 4, 6, 12]);
  assert.deepEqual(M.factors(30), [1, 2, 3, 5, 6, 10, 15, 30]);
  assert.deepEqual(M.commonFactors(12, 30), [1, 2, 3, 6]);
  assert.deepEqual(M.commonFactors(20, 50), [1, 2, 5, 10]);
  assert.deepEqual(M.factorPairs(36), [[1, 36], [2, 18], [3, 12], [4, 9], [6, 6]]);
});

test('Factor Forge numbers are in range and have enough to find', () => {
  for(let i = 0; i < RUNS; i++){
    const n = M.pickFactorNumber([24, 36]);
    assert.ok(n >= 6 && n <= 100);
    assert.ok(n !== 24 && n !== 36);
    assert.ok(M.factors(n).length >= 4 || M.isPrime(n));
  }
});

test('Shared Hoard pairs fit the tile grid', () => {
  for(let i = 0; i < RUNS; i++){
    const [a, b] = M.pickCommonPair();
    assert.ok(a < b && a >= 4 && a <= 60 && b <= 100, `${a},${b}`);
  }
});

test('numbers in words use British conventions', () => {
  assert.equal(M.words(3040506), 'three million, forty thousand, five hundred and six');
  assert.equal(M.words(2000005), 'two million and five');
  assert.equal(M.words(10000000), 'ten million');
  assert.equal(M.words(1000021), 'one million and twenty-one');
  assert.equal(M.words(750300), 'seven hundred and fifty thousand, three hundred');
});

test('fraction formatting', () => {
  assert.equal(M.fstr(12, 8), '1 1/2');
  assert.equal(M.fstr(6, 3), '2');
  assert.equal(M.fstr(4, 6), '2/3');
  assert.ok(M.sameVal('1 1/2', '3/2'));
});

for(const quest of Object.keys(M.QUESTS)){
  for(const kind of Object.keys(M.QUESTS[quest].kinds)){
    test(`${quest}.${kind} always gives four distinct choices with the answer among them`, () => {
      for(let i = 0; i < RUNS; i++){
        const q = M.finalize(M.QUESTS[quest].gens[kind]());
        assert.equal(q.choices.length, 4, JSON.stringify(q));
        assert.equal(new Set(q.choices).size, 4);
        assert.ok(q.answer >= 0 && q.answer < 4);
        assert.ok(q.prompt && q.explain);
        assert.ok(!/NaN|undefined|Infinity/.test(q.prompt + q.explain + q.choices.join()), JSON.stringify(q));
      }
    });
  }
}

test('fraction answers are never duplicated in value by a distractor', () => {
  for(const kind of ['addSub', 'mixedToImproper', 'improperToMixed', 'timesWhole']){
    for(let i = 0; i < RUNS; i++){
      const q = M.finalize(M.QUESTS.potions.gens[kind]());
      const a = q.choices[q.answer];
      q.choices.forEach((c, j) => { if(j !== q.answer) assert.ok(!M.sameVal(c, a), `${kind}: ${c} vs ${a}`); });
    }
  }
});

test('fraction addition and subtraction answers are correct', () => {
  for(let i = 0; i < RUNS; i++){
    const raw = M.QUESTS.potions.gens.addSub();
    const m = raw.prompt.match(/(\d+)\/(\d+) (\+|−) (\d+)\/(\d+)/);
    const v = m[1] / m[2] + (m[3] === '+' ? 1 : -1) * m[4] / m[5];
    assert.ok(Math.abs(M.fval(raw.answer) - v) < 1e-9, raw.prompt + ' = ' + raw.answer);
  }
});

test('short division answers check out', () => {
  for(let i = 0; i < RUNS; i++){
    const raw = M.QUESTS.spells.gens.shortDiv();
    const [, n, d] = raw.prompt.match(/([\d,]+) ÷ (\d+)/);
    const [q, r] = raw.answer.split(' r ').map(num);
    assert.equal(q * +d + r, num(n));
    assert.ok(r > 0 && r < +d);
  }
});

test('BIDMAS answers match JavaScript precedence', () => {
  for(let i = 0; i < RUNS; i++){
    const raw = M.QUESTS.spells.gens.bidmas();
    const expr = raw.prompt.match(/class="expr">(.*)<\/b>/)[1].replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    assert.equal(Function(`return ${expr}`)(), num(raw.answer), expr);
  }
});

test('rounding answers are correct', () => {
  for(let i = 0; i < RUNS; i++){
    const raw = M.QUESTS.vault.gens.rounding();
    const [, n, p] = raw.prompt.match(/Round <b>([\d,]+)<\/b> to the nearest <b>([\d,]+)/).map(num);
    assert.equal(num(raw.answer), Math.round(n / p) * p);
  }
});

test('reading big numbers: answer matches the words', () => {
  for(let i = 0; i < RUNS; i++){
    const raw = M.QUESTS.vault.gens.words();
    assert.ok(raw.prompt.includes(M.words(num(raw.answer))));
  }
});

test('makeQuestion favours weak kinds', () => {
  const counts = {};
  for(let i = 0; i < 2000; i++){ const q = M.makeQuestion('potions', { ofAmount: 3 }); counts[q.kind] = (counts[q.kind] || 0) + 1; }
  assert.ok(counts.ofAmount > counts.mixedToImproper * 2);
});
