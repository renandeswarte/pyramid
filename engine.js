/* Pure game rules. Usable in the browser and in Node for verification. */
(function (root) {
  'use strict';
  const TURNS = 6;
  const BRICKS = 18;
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function schedule(count, random = Math.random, rounds = TURNS) {
    if (!Number.isInteger(count) || count < 2 || count > 10) throw new Error('Choose between 2 and 10 players.');
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 18) throw new Error('Choose between 1 and 18 turns per player.');
    const ring = shuffle(Array.from({ length: count }, (_, i) => i), random);
    const offsets = shuffle(Array.from({ length: count - 1 }, (_, i) => i + 1), random);
    const turns = [];
    for (let cycle = 0; cycle < rounds; cycle++) {
      const offset = offsets[cycle % offsets.length];
      const pairs = ring.map((teller, i) => ({ teller, guesser: ring[(i + offset) % count], cycle: cycle + 1 }));
      turns.push(...shuffle(pairs, random));
    }
    return turns;
  }
  function createGame(names, category, seconds, words, random = Math.random, rounds = TURNS, jokers = 1) {
    const planned = schedule(names.length, random, rounds);
    if (!names.every(name => typeof name === 'string' && name.trim() && name.trim().length <= 24)) throw new Error('Give every player a name (24 characters or fewer).');
    if (new Set(names.map(name => name.trim().toLowerCase())).size !== names.length) throw new Error('Use a different name for each player.');
    if (![30, 60].includes(seconds)) throw new Error('Choose a 30- or 60-second time limit.');
    if (![0, 1, 2].includes(jokers)) throw new Error('Choose zero, one, or two Jokers.');
    const unique = [...new Map(words.map(word => [word.trim().toLowerCase(), word.trim()])).values()].filter(Boolean);
    if (unique.length < names.length * (rounds + jokers)) throw new Error('This category needs more words for this many players.');
    return {
      version: 2, category, seconds, jokers, turns: rounds, startingBricks: rounds * 3, phase: 'shuffle-teller', index: 0,
      players: names.map((name, id) => ({ id, name: name.trim(), bricks: rounds * 3, told: 0, guessed: 0, telling: 0, guessing: 0, brickBonus: 0, jokerBonus: 0, jokersUsed: 0 })),
      schedule: planned, deck: shuffle(unique, random), used: [], history: [], current: null
    };
  }
  function pair(game) { return game.schedule[game.index]; }
  function draw(game) {
    const word = game.deck.pop();
    if (!word) throw new Error('No unused words remain.');
    game.used.push(word);
    return word;
  }
  function beginBetting(game, now = Date.now()) {
    if (game.phase !== 'ready') return false;
    game.current = { ...pair(game), word: draw(game), discarded: [], bet: 0, attempts: 0, attemptResults: [], deadline: now + game.seconds * 1000 };
    game.phase = 'betting';
    return true;
  }
  function finishTurn(game, success, timeout = false) {
    if (!['betting', 'attempts'].includes(game.phase)) return false;
    const turn = game.current;
    const teller = game.players[turn.teller];
    const guesser = game.players[turn.guesser];
    teller.told++;
    guesser.guessed++;
    if (success) { teller.telling++; guesser.guessing++; }
    let brickBonus = 0, jokerBonus = 0;
    if (teller.told === (game.turns || TURNS)) {
      brickBonus = teller.bricks;
      jokerBonus = game.jokers - teller.jokersUsed;
      teller.brickBonus = brickBonus;
      teller.jokerBonus = jokerBonus;
    }
    game.history.push({ ...turn, success, timeout, brickBonus, jokerBonus, bricksLeft: teller.bricks });
    game.phase = 'recap';
    return true;
  }
  function expire(game, now = Date.now()) {
    if (!['betting', 'attempts'].includes(game.phase) || now < game.current.deadline) return false;
    const turn = game.current;
    if (game.phase === 'betting') {
      turn.bet = 3;
      game.players[turn.teller].bricks -= 3;
      finishTurn(game, false, 'betting');
    } else {
      // Deadlines advance from the previous deadline, including while backgrounded.
      while (game.phase === 'attempts' && now >= turn.deadline) {
        turn.attempts++;
        turn.attemptResults.push('timeout');
        if (turn.attempts >= turn.bet) finishTurn(game, false, 'guessing');
        else turn.deadline += game.seconds * 1000;
      }
    }
    return true;
  }
  function bet(game, amount, now = Date.now()) {
    if (game.phase !== 'betting' || expire(game, now)) return false;
    if (![1, 2, 3].includes(amount)) throw new Error('Choose one, two, or three bricks.');
    const teller = game.players[game.current.teller];
    if (amount > teller.bricks) throw new Error('Not enough bricks.');
    teller.bricks -= amount;
    game.current.bet = amount;
    game.current.deadline = now + game.seconds * 1000;
    game.phase = 'attempts';
    return true;
  }
  function joker(game, now = Date.now()) {
    if (game.phase !== 'betting' || expire(game, now)) return false;
    const teller = game.players[game.current.teller];
    if (teller.jokersUsed >= game.jokers) return false;
    teller.jokersUsed++;
    game.current.discarded.push(game.current.word);
    game.current.word = draw(game);
    return true;
  }
  function attempt(game, correct, now = Date.now()) {
    if (game.phase !== 'attempts' || expire(game, now)) return false;
    game.current.attempts++;
    game.current.attemptResults.push(correct ? 'correct' : 'incorrect');
    if (correct || game.current.attempts >= game.current.bet) finishTurn(game, Boolean(correct));
    else game.current.deadline = now + game.seconds * 1000;
    return true;
  }
  function next(game) {
    if (game.phase !== 'recap') return false;
    game.index++;
    game.current = null;
    game.phase = game.index >= game.schedule.length ? 'finished' : 'shuffle-teller';
    return true;
  }
  function restore(game, now = Date.now()) {
    if (game.version === 1) {
      game.jokers = 1;
      game.players.forEach(p => { p.jokersUsed = p.jokerUsed ? 1 : 0; delete p.jokerUsed; });
      for (const turn of [...game.history, ...(game.current ? [game.current] : [])]) {
        turn.discarded = turn.discarded ? [turn.discarded] : [];
        turn.attemptResults = Array.from({ length: turn.attempts }, (_, i) => turn.success && i === turn.attempts - 1 ? 'correct' : 'incorrect');
        if (turn.timeout) turn.timeout = 'betting';
      }
      if (game.phase === 'attempts') game.current.deadline = now + game.seconds * 1000;
      game.version = 2;
    }
    return game;
  }
  function score(player) { return player.guessing + player.telling + player.brickBonus + player.jokerBonus; }
  const api = { TURNS, BRICKS, shuffle, schedule, createGame, pair, beginBetting, expire, bet, joker, attempt, next, score, restore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PyramidEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
