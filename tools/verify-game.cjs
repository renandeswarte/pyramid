const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../engine.js');
const words = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/global.json'), 'utf8'));
function random(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }

// Check the real scheduling algorithm over many seeds and all supported sizes.
for (let n = 2; n <= 10; n++) {
  for (const rounds of [1, 2, 3, 4, 6, 9, 18]) {
  for (let seed = 1; seed <= 60; seed++) {
    const schedule = E.schedule(n, random(seed), rounds);
    check(schedule.length === n * rounds, 'Chosen turns per player');
    for (let cycle = 1; cycle <= rounds; cycle++) {
      const turns = schedule.filter(t => t.cycle === cycle);
      check(new Set(turns.map(t => t.teller)).size === n, 'Everyone tells once per cycle');
      check(new Set(turns.map(t => t.guesser)).size === n, 'Everyone guesses once per cycle');
      check(turns.every(t => t.teller !== t.guesser), 'No self pairing');
    }
    for (let p = 0; p < n; p++) {
      const turns = schedule.filter(t => t.teller === p);
      const telling = [], guessing = [];
      for (let q = 0; q < n; q++) if (q !== p) {
        telling.push(turns.filter(t => t.guesser === q).length);
        guessing.push(schedule.filter(t => t.guesser === p && t.teller === q).length);
      }
      check(Math.max(...telling) - Math.min(...telling) <= 1, 'Even telling partners');
      check(Math.max(...guessing) - Math.min(...guessing) <= 1, 'Even guessing partners');
      if (n > 2) check(turns.every((t, i) => !i || t.guesser !== turns[i - 1].guesser), 'Change partners between telling turns');
      if (rounds % (n - 1) === 0) check(new Set(telling).size === 1, 'Exactly equal pairings when divisible');
    }
  }
  }
}

function game(n = 4) { return E.createGame(Array.from({ length: n }, (_, i) => `Player ${i+1}`), 'global', 30, words, random(123)); }
function ready(g, time = 1000) { g.phase = 'ready'; E.beginBetting(g, time); }

// Short games: resource budget, penalties and final bonuses scale with length.
for (const [n, rounds] of [[2,1],[2,3],[3,2],[3,4],[4,3],[10,9]]) {
  for (const outcome of ['correct', 'timeout', 'joker']) {
    const g = E.createGame(Array.from({length:n}, (_,i)=>`Player ${i+1}`), 'global', 30, words, random(42), rounds);
    check(g.players.every(p=>p.bricks===rounds*3), 'Short-game starting bricks');
    while (g.phase !== 'finished') {
      ready(g);
      const teller = g.players[g.current.teller];
      if (outcome === 'timeout') E.expire(g, 31000);
      else {
        if (outcome === 'joker' && !teller.jokerUsed) E.joker(g, 1200);
        E.bet(g, outcome === 'joker' ? 2 : 1, 1400);
        E.attempt(g, true);
      }
      if (teller.told < rounds) check(teller.brickBonus===0 && teller.jokerBonus===0, 'Bonuses wait for final telling turn');
      E.next(g);
    }
    for (const p of g.players) {
      check(p.told === rounds && p.guessed === rounds, 'Short-game role totals');
      check(p.brickBonus === (outcome==='timeout'?0:outcome==='joker'?rounds:rounds*2), 'Short-game brick bonus');
      check(p.jokerBonus === (outcome==='joker'?0:1), 'Short-game Joker bonus');
      check(E.score(p) === (outcome==='timeout'?1:outcome==='joker'?rounds*3:rounds*4+1), 'Short-game score');
      check(p.bricks>=0, 'Brick budget never negative');
    }
    check(new Set(g.used).size===g.used.length, 'Short games never reuse words, including discards');
  }
}

// Six one-brick successful tells and guesses: 6+6+12 saved bricks+1 Joker = 25.
for (const n of [2, 3, 4, 10]) {
  const g = game(n);
  while (g.phase !== 'finished') {
    ready(g);
    check(E.bet(g, 1, 1100), 'Bet accepted before deadline');
    check(E.attempt(g, true), 'Correct guess accepted');
    check(!E.attempt(g, true), 'Completed turn cannot score twice');
    E.next(g);
  }
  for (const p of g.players) {
    check(p.told === 6 && p.guessed === 6, 'Both role totals complete');
    check(p.bricks === 12 && p.brickBonus === 12 && p.jokerBonus === 1, 'Final bonuses awarded once');
    check(p.telling === 6 && p.guessing === 6 && E.score(p) === 25, 'Expected total score');
  }
  check(new Set(g.used).size === n * 6, 'No repeated words');
}

// All timeouts: full three-brick penalty, no attempts or success points.
{
  const g = game();
  while (g.phase !== 'finished') {
    ready(g);
    check(!E.expire(g, 30999), 'Deadline not early');
    check(E.expire(g, 31000), 'Deadline exact');
    check(!E.expire(g, 32000), 'Timeout cannot charge twice');
    check(!E.bet(g, 1, 32000), 'No late bets');
    check(g.history.at(-1).timeout && g.history.at(-1).bet === 3 && g.history.at(-1).attempts === 0, 'Timeout receipt');
    E.next(g);
  }
  check(g.players.every(p => p.bricks === 0 && p.telling === 0 && p.guessing === 0 && E.score(p) === 1), 'Timeout totals and unused Joker');
}

// Jokers never reset the deadline; discarded words also remain used.
{
  const g = game(3);
  while (g.phase !== 'finished') {
    ready(g);
    const p = g.players[E.pair(g).teller], deadline = g.current.deadline, first = g.current.word;
    if (!p.jokerUsed) {
      check(E.joker(g, 2000), 'First Joker accepted');
      check(g.current.deadline === deadline && g.current.discarded === first && g.current.word !== first, 'Swap retains timer and uses new word');
      check(!E.joker(g, 2500), 'No second Joker');
    }
    E.bet(g, 2, 3000);
    E.attempt(g, false);
    check(g.phase === 'attempts', 'First wrong guess leaves one attempt');
    E.attempt(g, true);
    E.next(g);
  }
  check(g.used.length === 21 && new Set(g.used).size === 21, 'Played and discarded words all unique');
  check(g.players.every(p => p.bricks === 6 && p.jokerBonus === 0 && E.score(p) === 18), 'Two-brick game scores');
}
{
  const g = game(); ready(g);
  check(!E.joker(g, 31000) && g.phase === 'recap' && !g.players[g.current.teller].jokerUsed, 'Expired Joker action loses turn without consuming Joker');
}
{
  const g = game(); ready(g); E.bet(g, 3, 1200); E.attempt(g, true);
  check(g.history[0].bet === 3 && g.players[g.history[0].teller].bricks === 15, 'Early success never refunds committed bet');
}
assert.throws(() => E.createGame(['Same', 'same'], 'global', 30, words));
assert.throws(() => E.createGame(['A', 'B'], 'global', 30, ['word']));
assert.throws(() => E.schedule(1));
assert.throws(() => E.schedule(4, Math.random, 0));
assert.throws(() => E.schedule(4, Math.random, 1.5));
check(words.every(w=>w===w.toLowerCase()), 'Global excludes capitalized proper names');
for (const place of ['London','Paris','France','Canada','Tokyo','Asia','Africa']) check(!words.some(w=>w.toLowerCase()===place.toLowerCase()), `Global excludes ${place}`);
for (const word of ['whisper','careful','quickly','before','mountain']) check(words.includes(word), `Global retains ordinary word ${word}`);
for (const category of ['global', 'food', 'animals', 'geography', 'body', 'kids', 'teens']) {
  const deck = JSON.parse(fs.readFileSync(path.join(__dirname, `../data/${category}.json`), 'utf8'));
  check(deck.length >= 100, `${category} supports ten players with nine turns and Jokers`);
  check(new Set(deck.map(w => w.toLowerCase())).size === deck.length, `${category} has no duplicates`);
}
console.log(`Passed ${checks.toLocaleString()} game-rule and schedule checks.`);
