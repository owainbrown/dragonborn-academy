# Quest Board

Year 6 maths games for Oliver, themed around a red dragonborn. Static pages, no build step, progress saved in the browser's local storage.

- `index.html`: the quest board, linking every game
- `factors.html`: **Factor Forge** (Autumn 2 KIRF). Find every factor of a number in a minute; factor pairs are drawn as a rainbow
- `common.html`: **Shared Hoard** (Autumn 2 KIRF). Tap the common factors of two numbers, then check them on a Venn diagram with the greatest common factor highlighted
- `trials.html?quest=vault|spells|potions`: ten-question battles for the rest of the autumn term: place value to 10,000,000 and negative numbers; BIDMAS, long multiplication and short division; fractions. Question types you get wrong come up more often
- `primes.html`: **Prime Hoard** (Autumn 1). Find all 25 primes to 100

Shared code lives in `assets/`: `maths.js` (question generators, no DOM), `kit.js` and `kit.css`.

Run the tests with `node --test tests/*.test.js`.
