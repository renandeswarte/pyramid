(() => {
  'use strict';
  const E = window.PyramidEngine;
  const WORDS = window.PyramidWords || {};
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const standaloneDisplay = matchMedia('(display-mode: standalone)');
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const browserViewport = viewportMeta.content;
  let webAppMode = false;
  function updateWebAppMode() {
    webAppMode = standaloneDisplay.matches || navigator.standalone === true;
    document.documentElement.classList.toggle('web-app-mode', webAppMode);
    viewportMeta.content = webAppMode ? `${browserViewport}, maximum-scale=1, user-scalable=no` : browserViewport;
  }
  updateWebAppMode();
  standaloneDisplay.addEventListener('change', updateWebAppMode);
  // Safari's native pinch gestures need an explicit guard in installed app mode.
  const preventAppZoom = event => { if (webAppMode && event.cancelable) event.preventDefault(); };
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, preventAppZoom, { passive: false });
  const preventAppPinch = event => { if (event.touches.length > 1) preventAppZoom(event); };
  document.addEventListener('touchstart', preventAppPinch, { passive: false });
  document.addEventListener('touchmove', preventAppPinch, { passive: false });
  const storageKey = 'pyramid-game-v1';
  const preferencesKey = 'pyramid-preferences-v1';
  const defaults = ['Renan', 'Valerie', 'Thomas', 'Chloe'];
  const categories = [
    ['global', 'Global', 'Everyday words. Endless possibilities.', 'globe'], ['food', 'Food', 'Food & drink', 'food'],
    ['animals', 'Animals', 'Wild & wonderful', 'animal'], ['geography', 'Geography', 'Places & landscapes', 'map'],
    ['body', 'Human Body', 'Head to toe', 'body'], ['kids', 'Kids', 'Ages 11 & under', 'sun'], ['teens', 'Teens', 'Ages 12 & up', 'spark']
  ];
  let settings = { names: [...defaults], category: 'global', seconds: 30, turns: 6, jokers: 1, muted: false };
  let setupStep = 0, stepDirection = 1, lastScreen = '', leaderboardPage = 0;
  let game = null, animationTimer = null, animationEnd = null, hiddenWord = false, privacy = false, setupError = '', lastTick = null;
  let audioContext = null, installPrompt = null, storageAvailable = true;
  const paths = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
    food: '<path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M18 3v18M18 3c-5 4-5 10 0 10"/>',
    animal: '<ellipse cx="12" cy="15.5" rx="5" ry="4.5"/><ellipse cx="4" cy="10" rx="2" ry="2.5"/><ellipse cx="9" cy="5" rx="2" ry="2.5"/><ellipse cx="15" cy="5" rx="2" ry="2.5"/><ellipse cx="20" cy="10" rx="2" ry="2.5"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16"/>',
    body: '<circle cx="12" cy="4" r="2"/><path d="m4 9 8-2 8 2M12 7v7m-5 7 5-7 5 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shuffle: '<path d="M3 6h3c4 0 6 12 10 12h5m-4-4 4 4-4 4M3 18h3c1 0 2-.7 3-2m5-8c1-1.4 2-2 3-2h4m-4-4 4 4-4 4"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="m3 3 18 18M10 5c6-1 12 7 12 7a20 20 0 0 1-3 4M6 6a22 22 0 0 0-4 6s3.5 7 10 7c2 0 4-.7 5-1.5m-7-8a3 3 0 0 0 4 4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    volume: '<path d="M11 4 6 8H3v8h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 4 6 8H3v8h3l5 4Zm5 5 6 6m-6 0 6-6"/>',
    trophy: '<path d="M7 3h10v5a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4M12 13v5m-4 3v-3h8v3Z"/>',
    gem: '<path d="m12 2 9 8-9 12L3 10ZM3 10h18M7 6l5 16 5-16"/>',
    pair: '<path d="M5 12h14M9 8l-4 4 4 4m6-8 4 4-4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>'
  };
  function icon(name, size = 24) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`; }
  function escape(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function avatar(player, large = false) { return `<span class="avatar tone-${player.id % 5}${large ? ' large' : ''}" aria-hidden="true">${escape(player.name.trim().slice(0, 1).toUpperCase())}</span>`; }
  function announce(text) { document.getElementById('announcement').textContent = text; }
  function readStorage(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } }
  function writeStorage(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { storageAvailable = false; } }
  function save() { if (game) writeStorage(storageKey, game); writeStorage(preferencesKey, settings); }
  const storedSettings = readStorage(preferencesKey);
  if (storedSettings && Array.isArray(storedSettings.names) && storedSettings.names.length >= 2 && storedSettings.names.length <= 10 && storedSettings.names.every(n => typeof n === 'string')) {
    settings = { ...settings, ...storedSettings, jokers: [0, 1, 2].includes(storedSettings.jokers) ? storedSettings.jokers : 1, seconds: [30, 60].includes(storedSettings.seconds) ? storedSettings.seconds : 30, category: categories.some(c => c[0] === storedSettings.category) ? storedSettings.category : 'global' };
  }
  const saved = readStorage(storageKey);
  if (saved && [1, 2].includes(saved.version) && Array.isArray(saved.players) && Array.isArray(saved.schedule) && Array.isArray(saved.deck) && Array.isArray(saved.history) && Number.isInteger(saved.index) && saved.index >= 0 && saved.index <= saved.schedule.length && ['shuffle-teller', 'handoff', 'shuffle-guesser', 'ready', 'betting', 'attempts', 'recap', 'finished'].includes(saved.phase)) {
    game = E.restore(saved);
    game.turns ||= 6;
    game.startingBricks ||= game.turns * 3;
    if (game.phase === 'shuffle-teller') game.phase = 'handoff';
    if (game.phase === 'shuffle-guesser') game.phase = 'ready';
    privacy = ['betting', 'attempts'].includes(game.phase);
    E.expire(game);
  }
  function updateSoundButton() {
    const button = document.getElementById('sound-button');
    button.innerHTML = icon(settings.muted ? 'mute' : 'volume', 19);
    button.setAttribute('aria-pressed', String(settings.muted));
    button.setAttribute('aria-label', settings.muted ? 'Turn sound on' : 'Mute sound');
    button.title = settings.muted ? 'Sound off' : 'Sound on';
  }
  function activateAudio() {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch { /* The game remains usable if this browser cannot play audio. */ }
  }
  function tone(frequency, duration = .05, delay = 0, volume = .025) {
    if (settings.muted || !audioContext || audioContext.state !== 'running' || document.hidden) return;
    try {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      const time = audioContext.currentTime + delay;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(.001, time + duration);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(time); oscillator.stop(time + duration);
    } catch { /* Audio is supplementary. */ }
  }
  function chime(success) { tone(success ? 523 : 230, .12); tone(success ? 659 : 180, .14, .1); if (success) tone(784, .2, .2); }
  function turnOptions(count = settings.names.length) {
    return count === 2 ? [1, 3, 6] : count === 3 ? [2, 4, 6] : count === 4 ? [3, 6] : [...new Set([6, count - 1])].sort((a, b) => a - b);
  }
  function normalizeTurns() { if (!turnOptions().includes(settings.turns)) settings.turns = 6; }
  function home() {
    normalizeTurns();
    const titles = ['Who’s at the table?', 'Pick your words.', 'Set the pace.', 'A little room for magic.', 'How big is your Pyramid?'];
    const subtitles = ['Good company. One device. Let’s make some guesses.', 'Pick a world of words for everyone to play with.', 'The same time limit for your bet and each clue + guess.', 'Choose how many word swaps each player gets for the whole game.', 'A quick round or a longer game? Everyone gets equal turns.'];
    let content;
    if (setupStep === 0) content = `<div class="party-emblem" aria-hidden="true"><span class="gem"></span><span class="gem"></span><span class="gem"></span></div><div class="counter-control"><button class="small-button" data-action="remove-player" aria-label="Remove last player" ${settings.names.length <= 2 ? 'disabled' : ''}>${icon('minus', 18)}</button><strong>${settings.names.length} <span>players</span></strong><button class="small-button" data-action="add-player" aria-label="Add player" ${settings.names.length >= 10 ? 'disabled' : ''}>${icon('plus', 18)}</button></div><div class="players-grid">${settings.names.map((name, id) => `<label class="player-input" style="--i:${id}">${avatar({ name, id })}<span class="sr-only">Player ${id + 1} name</span><input data-player="${id}" value="${escape(name)}" maxlength="24" autocomplete="off" spellcheck="false" required placeholder="Player ${id + 1}"></label>`).join('')}</div><p class="setup-tip">${icon('pair', 16)} Tell a word. Guess a word. Take turns being brilliant.</p>`;
    else if (setupStep === 1) content = `<div class="category-grid">${categories.map(([id, name, label, symbol], i) => `<button class="category ${id === 'global' ? 'category-global' : ''}" style="--i:${i}" data-action="category" data-category="${id}" aria-pressed="${settings.category === id}"><span class="category-symbol">${icon(symbol, 28)}</span><span class="category-name">${name}<span class="category-meta">${id === 'global' ? label : id === 'kids' ? 'Ages 11 & under' : id === 'teens' ? 'Ages 12 & up' : label}</span></span><span class="choice-check">${icon('check', 14)}</span></button>`).join('')}</div><p class="setup-tip">${icon('globe', 16)} English · ${WORDS[settings.category].length.toLocaleString()} words in this deck</p>`;
    else if (setupStep === 2) content = `<div class="time-choices">${[30, 60].map((seconds, i) => `<button class="time-choice" style="--i:${i}" data-action="time" data-seconds="${seconds}" aria-pressed="${settings.seconds === seconds}"><span class="time-dial">${icon('clock', 42)}</span><strong>${seconds}<small>seconds</small></strong><span>${seconds === 30 ? 'Keep it moving' : 'Room to think'}</span><span class="choice-check">${icon('check', 14)}</span></button>`).join('')}</div><div class="setup-callout">${icon('clock', 20)}<p>Place your bet before the clock runs out.<br><strong>Bet timeout: turn lost. Guess timeout: attempt lost.</strong></p></div>`;
    else if (setupStep === 3) content = `<div class="length-choices joker-choices">${[0, 1, 2].map((n, i) => `<button class="length-choice" style="--i:${i}" data-action="jokers" data-jokers="${n}" aria-pressed="${settings.jokers === n}"><span class="length-label">${['All in', 'A second chance', 'More possibilities'][n]}</span><strong>${n}</strong><span>${n === 1 ? 'Joker' : 'Jokers'} each</span><small>${n === 0 ? 'Play every word' : `Up to +${n} bonus ${n === 1 ? 'point' : 'points'}`}</small><span class="choice-check">${icon('check', 14)}</span></button>`).join('')}</div><div class="setup-callout">${icon('spark', 20)}<p>Swap a word before you bet. The timer keeps running.<br><strong>Each unused Joker earns 1 bonus point.</strong></p></div>`;
    else content = `<div class="length-choices">${turnOptions().map((turns, i) => `<button class="length-choice" style="--i:${i}" data-action="length" data-turns="${turns}" aria-pressed="${settings.turns === turns}"><span class="length-label">${turns === 6 ? 'Classic' : turns === settings.names.length - 1 ? (turns < 6 ? 'Quick game' : 'Round robin') : 'A little longer'}</span><strong>${turns}</strong><span>${turns === 1 ? 'turn' : 'turns'} each, per role</span><small>${settings.names.length * turns} words · ${turns * 3} bricks each</small><span class="choice-check">${icon('check', 14)}</span></button>`).join('')}</div><div class="balance-note">${icon('pair', 22)}<div><strong>${settings.turns % (settings.names.length - 1) === 0 ? 'Every partner. Exactly equal.' : 'Equal roles. Balanced partners.'}</strong><p>${settings.turns % (settings.names.length - 1) === 0 ? `Each player tells to every other player ${settings.turns / (settings.names.length - 1) === 1 ? 'once' : settings.turns / (settings.names.length - 1) + ' times'}, and guesses for them equally.` : 'Everyone tells and guesses the same number of times. Partner counts differ by at most one.'}</p></div></div><div class="launch-summary"><span>${settings.names.length} players</span><i></i><span>${categories.find(c => c[0] === settings.category)[1]}</span><i></i><span>${settings.seconds}s per timer</span><i></i><span>${settings.jokers} ${settings.jokers === 1 ? 'Joker' : 'Jokers'} each</span></div>`;
    return `<section class="setup-stage"><nav class="setup-steps" aria-label="Game setup">${['Players', 'Words', 'Time', 'Jokers', 'Length'].map((name, i) => `<button data-action="setup-step" data-step="${i}" class="${i === setupStep ? 'current' : i < setupStep ? 'complete' : ''}" ${i > setupStep ? 'disabled' : ''} ${i === setupStep ? 'aria-current="step"' : ''}><span>${i < setupStep ? icon('check', 12) : i + 1}</span><small>${name}</small></button>`).join('')}</nav><div class="setup-content ${lastScreen !== 'setup-' + setupStep ? 'stage-enter' : ''}" style="--direction:${stepDirection}"><div class="setup-heading"><p class="eyebrow">${['THE WORD GAME FOR GOOD COMPANY', 'A WORLD OF POSSIBILITIES', 'A LITTLE PRESSURE. A LOT OF FUN.', 'YOUR SECRET RESERVE', 'MAKE EVERY CLUE COUNT'][setupStep]}</p><h1>${titles[setupStep]}</h1><p class="subtitle">${subtitles[setupStep]}</p></div><div class="setup-body">${content}</div><p id="setup-error" class="error-message" role="alert" ${!setupError ? 'hidden' : ''}>${escape(setupError)}</p></div><div class="setup-navigation">${setupStep ? `<button class="secondary-button" data-action="setup-back">← Back</button>` : ''}<button class="primary-button" data-action="${setupStep === 4 ? 'start' : 'setup-next'}">${setupStep === 4 ? icon('spark', 19) + ' Let’s play' : ['Choose your words', 'Set the time', 'Choose your Jokers', 'Choose game length'][setupStep] + ' <span aria-hidden="true">→</span>'}</button></div><p class="start-note">${setupStep === 0 ? 'Edit the names. Invite 2–10 players.' : setupStep === 4 ? 'Fewer clues. More points. One shared device.' : `STEP ${setupStep + 1} OF 5`}</p></section>`;
  }
  function scoreList() {
    return game.players.map(p => `<div class="score-player ${E.pair(game)?.teller === p.id && game.phase !== 'finished' ? 'active' : ''}">${avatar(p)}<div class="score-name">${escape(p.name)}<span class="score-meta">${p.told}/${game.turns} told · ${p.guessed}/${game.turns} guessed</span></div><span class="score-number">${E.score(p)}</span></div>`).join('');
  }
  function toolbar() {
    return `<div class="game-toolbar"><div class="game-progress"><div class="progress-bar" aria-hidden="true"><i style="width:${game.history.length / game.schedule.length * 100}%"></i></div><span>${game.phase === 'finished' ? 'Game complete' : `Turn ${game.index + 1} of ${game.schedule.length}`}</span></div><div class="toolbar-actions"><button class="utility-button" data-action="scores">${icon('trophy', 15)} Scores</button><button class="utility-button end-game-button" data-action="end-game">${icon('close', 15)} End Game</button></div></div>`;
  }
  function selection(guesser) {
    const pair = E.pair(game);
    const people = game.players.filter(p => !guesser || p.id !== pair.teller);
    return `<p class="eyebrow">${guesser ? 'BUILDING YOUR DUO' : 'THE NEXT TELLER'}</p><h1>${guesser ? 'Find your partner.' : 'Who’s up next?'}</h1><p class="subtitle">${guesser ? `Let’s find a guesser for ${escape(game.players[pair.teller].name)}.` : 'The spotlight is looking for you.'}</p><div class="selection-arena" id="selection-arena"><div class="orbit-track" aria-hidden="true"></div><div class="orbit-track second" aria-hidden="true"></div><div class="orbit-sweep" aria-hidden="true"></div><div class="orbit-sparks" aria-hidden="true">${Array.from({length: 6}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>${people.map((p, i) => `<div class="orbit-player" data-bubble="${p.id}" style="--angle:${i * 360 / people.length}deg;--counter-angle:${-i * 360 / people.length}deg;--i:${i}">${avatar(p)}<span>${escape(p.name)}</span></div>`).join('')}<div class="selection-focus"><div class="focus-halo" aria-hidden="true"></div><div id="selection-face">${avatar(people[0], true)}</div><strong id="selection-name">${escape(people[0].name)}</strong><span id="selection-label">${guesser ? 'Finding your guesser' : 'Taking the spotlight'}</span></div></div><div class="reveal-meter" aria-hidden="true"><i></i></div><p class="selection-caption" id="selection-caption">${icon('shuffle', 14)} A little suspense. A fair match.</p>`;
  }
  function handoff() {
    const teller = game.players[E.pair(game).teller];
    return `<div class="handoff-avatar">${avatar(teller, true)}</div><p class="eyebrow">YOUR NEXT TELLER</p><h1>Pass it to ${escape(teller.name)}.</h1><p class="subtitle">Take the device. Keep the screen to yourself.</p><span class="pill">Telling turn ${teller.told + 1} of ${game.turns}</span><button class="primary-button" data-action="find-guesser">I’m ${escape(teller.name)}. I’m ready.</button><p class="hint">Your word stays hidden until you’re ready to bet.</p>`;
  }
  function ready() {
    const pair = E.pair(game), teller = game.players[pair.teller], guesser = game.players[pair.guesser];
    return `<p class="eyebrow">${teller.told === game.turns - 1 ? 'YOUR FINAL TELLING TURN' : `TELLING TURN ${teller.told + 1} OF ${game.turns}`}</p><h1>You’re playing together.</h1><div class="player-pair"><div class="pair-person">${avatar(teller, true)}<strong>${escape(teller.name)}</strong><small>Teller</small></div><span class="pair-divider">${icon('pair', 24)}</span><div class="pair-person">${avatar(guesser, true)}<strong>${escape(guesser.name)}</strong><small>Guesser</small></div></div><p class="subtitle">${escape(teller.name)}, only you should see the word.</p><span class="pill">${icon('clock', 15)} ${game.seconds} seconds to bet</span><button class="primary-button" data-action="reveal">Reveal word & start timer</button><p class="hint">If time runs out: 3 bricks spent, turn lost.<br>Give your clues and make your guesses aloud.</p>`;
  }
  function wordScreen() {
    const turn = game.current, teller = game.players[turn.teller], guesser = game.players[turn.guesser];
    const betting = game.phase === 'betting';
    const remainingJokers = game.jokers - teller.jokersUsed;
    return `<div class="word-topline"><span class="turn-chip">${escape(teller.name)} · Telling turn ${teller.told + 1}/${game.turns}${betting ? '' : ` · ${turn.bet} ${turn.bet === 1 ? 'brick' : 'bricks'} bet`}</span><div class="clock" id="clock" role="timer" aria-label="${betting ? 'Betting' : 'Guessing'} time remaining">${icon('clock', 18)}<span id="seconds">${Math.max(0, Math.ceil((turn.deadline - Date.now()) / 1000))}s</span></div></div>
      <div class="word-area"><div class="word-face"><p class="word-label">${hiddenWord ? 'YOUR WORD IS HIDDEN' : 'YOUR WORD TO TELL'} – ${escape(categories.find(c => c[0] === game.category)?.[1] || game.category).toUpperCase()}</p><h1 class="secret-word ${hiddenWord ? 'word-hidden' : ''}">${hiddenWord ? 'Ready when you are.' : escape(turn.word)}</h1></div><div class="word-controls"><button class="utility-button hide-word-button" data-action="hide-word" aria-pressed="${hiddenWord}">${icon(hiddenWord ? 'eye' : 'eyeOff', 16)} ${hiddenWord ? 'Show word' : 'Hide word'}</button>${betting && game.jokers > 0 ? `<button class="utility-button joker-button" data-action="joker" ${remainingJokers === 0 ? 'disabled' : ''}>${icon('spark', 18)} ${remainingJokers ? `Use Joker · ${remainingJokers} left` : 'No Jokers left'}</button>` : ''}</div></div>
      ${betting ? `<div class="bricks-display"><span class="gem" aria-hidden="true"></span><strong>${teller.bricks}</strong> bricks left</div><div class="brick-bank" aria-hidden="true">${Array.from({ length: game.startingBricks }, (_, i) => `<span class="gem ${i >= teller.bricks ? 'spent' : ''}"></span>`).join('')}</div><p class="bet-label">How many clues will it take?</p><div class="bet-options">${[1, 2, 3].map(n => `<button class="bet-button" data-action="bet" data-bet="${n}" aria-label="Bet ${n} ${n === 1 ? 'brick' : 'bricks'}"><span class="bet-gems" aria-hidden="true">${'<span class="gem"></span>'.repeat(n)}</span><strong>${n}</strong><small>${n === 1 ? 'brick · 1 clue' : 'bricks · ' + n + ' clues'}</small></button>`).join('')}</div><p class="hint">Commit your full bet. Saved bricks become bonus points.<br>${remainingJokers ? 'A Joker swaps the word. The timer keeps running.' : 'Make every clue count.'}</p>` : `<p class="eyebrow" style="margin-bottom:12px">ATTEMPT ${turn.attempts + 1} OF ${turn.bet}</p><div class="attempt-dots" aria-label="${turn.bet - turn.attempts} attempts remaining">${Array.from({ length: turn.bet }, (_, i) => `<span class="attempt-dot ${i < turn.attempts ? 'used' : i === turn.attempts ? 'current' : ''}">${i + 1}</span>`).join('')}</div><p class="subtitle">Give ${escape(guesser.name)} <strong>one spoken word</strong>.<br>Then let them make one guess.</p><div class="action-pair"><button class="danger-button" data-action="incorrect">${icon('close', 18)} Incorrect</button><button class="success-button" data-action="correct">${icon('check', 19)} Correct!</button></div><p class="hint">${turn.attemptResults.at(-1) === 'timeout' ? 'Last attempt timed out. A fresh timer is running.' : `${game.seconds}s per attempt. Time runs out? That attempt counts as incorrect.`}</p>`}`;
  }
  function recap() {
    const turn = game.history.at(-1), teller = game.players[turn.teller], guesser = game.players[turn.guesser];
    const heading = turn.timeout ? 'Time’s up.' : turn.success ? 'That’s the word!' : 'A tricky one.';
    const message = turn.timeout === 'betting' ? 'Turn lost. Three bricks spent. No success points.' : turn.timeout === 'guessing' ? 'Last attempt timed out. No success points.' : turn.success ? 'One good guess. Two happy players.' : 'No success points this time. On to the next word.';
    return `<div class="recap-symbol ${turn.success ? '' : 'missed'}">${icon(turn.timeout ? 'clock' : turn.success ? 'check' : 'close', 34)}</div><h1>${heading}</h1><p class="subtitle">${message}</p><h2 class="recap-word">${escape(turn.word)}</h2><div class="recap-players">${[[teller, 'Teller'], [guesser, 'Guesser']].map(([p, role]) => `<div class="recap-person">${avatar(p)}<strong>${escape(p.name)}</strong><span style="color:var(--muted)">${role}</span><span class="points-gain ${turn.success ? '' : 'zero'}">${turn.success ? '+1 point' : '0 points'}</span></div>`).join('')}</div><div class="receipt"><span><span class="gem" aria-hidden="true"></span>${turn.bet} spent · ${turn.bricksLeft} left</span><span>${turn.timeout === 'betting' ? 'Betting timeout' : `${turn.attempts} ${turn.attempts === 1 ? 'attempt' : 'attempts'}`}</span>${turn.discarded.length ? `<span>${turn.discarded.length} ${turn.discarded.length === 1 ? 'Joker' : 'Jokers'} used</span>` : ''}</div>${teller.told === game.turns ? `<div class="bonus-banner"><strong>${escape(teller.name)} finished telling!</strong><br>+${turn.brickBonus} unused-brick ${turn.brickBonus === 1 ? 'point' : 'points'}${turn.jokerBonus ? ` · +${turn.jokerBonus} unused-Joker ${turn.jokerBonus === 1 ? 'point' : 'points'}` : ''}</div>` : ''}<button class="primary-button" data-action="next">${game.index === game.schedule.length - 1 ? 'See the final scores' : 'Ready for the next turn'}</button>`;
  }
  function privacyScreen() {
    const teller = game.players[game.current.teller];
    return `<div class="selection-icon">${icon('lock', 27)}</div><p class="eyebrow">KEEP THE WORD SECRET</p><h1>Welcome back, ${escape(teller.name)}.</h1><p class="subtitle">Make sure only you can see the screen.</p><button class="primary-button" style="margin-top:26px" data-action="resume-word">Show my turn</button><p class="hint">${game.phase === 'betting' ? 'Your betting timer is still running.' : 'Your guessing timer is still running.'}</p>`;
  }
  function historyList() {
    return game.history.map((turn, i) => `<div class="history-item"><div><strong>${escape(turn.word)}</strong><small>${i + 1}. ${escape(game.players[turn.teller].name)} to ${escape(game.players[turn.guesser].name)} · ${turn.bet} ${turn.bet === 1 ? 'brick' : 'bricks'}${turn.attemptResults.includes('timeout') ? ` · ${turn.attemptResults.filter(r => r === 'timeout').length} timed-out attempts` : ''}${turn.discarded.length ? ` · Replaced: ${turn.discarded.map(escape).join(', ')}` : ''}</small></div><span class="history-status ${turn.success ? '' : 'missed'}">${turn.timeout ? 'Timed out' : turn.success ? 'Guessed' : 'Missed'}</span></div>`).join('');
  }
  function finished() {
    const sorted = [...game.players].sort((a, b) => E.score(b) - E.score(a));
    const winners = sorted.filter(p => E.score(p) === E.score(sorted[0]));
    const pages = Math.ceil(sorted.length / 4);
    leaderboardPage = Math.max(0, Math.min(leaderboardPage, pages - 1));
    const name = winners.length === 1 ? `${escape(winners[0].name)} wins!` : `${winners.length} champions!`;
    return `<section class="finish-screen ${lastScreen !== 'finished' ? 'screen-enter' : ''}"><div class="finish-header"><div class="trophy">${icon('trophy', 51)}</div><p class="eyebrow">${winners.length > 1 ? 'SHARED VICTORY' : 'THE PYRAMID CHAMPION'}</p><h1>${name}</h1><p class="subtitle">${E.score(sorted[0])} points · ${game.history.length} words played</p></div><div class="finish-scores"><div class="panel leaderboard"><div class="leaderboard-head"><span>#</span><span style="text-align:left">Player</span><span title="Successful guesses">Guess</span><span title="Successful tells">Tell</span><span>Bricks</span><span>Joker</span><span>Total</span></div>${sorted.slice(leaderboardPage * 4, leaderboardPage * 4 + 4).map(p => { return `<div class="leaderboard-row ${winners.includes(p) ? 'winner' : ''}"><span class="rank">${sorted.findIndex(q => E.score(q) === E.score(p)) + 1}</span><span class="leaderboard-name" title="${escape(p.name)}${winners.includes(p) ? ' — Champion' : ''}">${avatar(p)}<span>${escape(p.name)}</span>${winners.includes(p) ? '<span class="winner-mark" aria-label="Champion">✦</span>' : ''}</span><span>${p.guessing}</span><span>${p.telling}</span><span>${p.brickBonus}</span><span>${p.jokerBonus}</span><span class="total-score">${E.score(p)}</span></div>`; }).join('')}</div>${pages > 1 ? `<nav class="score-pages" aria-label="Leaderboard pages"><button class="small-button" data-action="score-page" data-page="${leaderboardPage - 1}" aria-label="Previous players" ${leaderboardPage === 0 ? 'disabled' : ''}>←</button><span>Players ${leaderboardPage * 4 + 1}–${Math.min((leaderboardPage + 1) * 4, sorted.length)} of ${sorted.length}</span><button class="small-button" data-action="score-page" data-page="${leaderboardPage + 1}" aria-label="Next players" ${leaderboardPage === pages - 1 ? 'disabled' : ''}>→</button></nav>` : ''}<p class="leaderboard-legend">Guess = correct guesses · Tell = successful tells<br>Bricks & Joker = unused-resource bonuses</p></div><div class="finish-actions"><button class="primary-button" data-action="play-again">${icon('shuffle', 18)} Play again</button><button class="secondary-button" data-action="setup">Change setup</button></div><button class="text-button history-button" data-action="history">All ${game.history.length} words & results ${icon('arrow', 15)}</button></section>`;
  }
  function stopAnimation() { clearInterval(animationTimer); clearTimeout(animationEnd); animationTimer = null; animationEnd = null; }
  // Allocate only measured spare height; reset before measuring after a resize.
  let spacingEdits = [];
  function resetSpacing() {
    for (const [element, property, value] of spacingEdits) {
      if (value) element.style.setProperty(property, value);
      else element.style.removeProperty(property);
    }
    spacingEdits = [];
  }
  function spaceStyle(element, property, value) {
    spacingEdits.push([element, property, element.style.getPropertyValue(property)]);
    element.style.setProperty(property, `${value}px`);
  }
  function spareHeight(pane) {
    const style = getComputedStyle(pane);
    const children = [...pane.children].filter(el => el.getClientRects().length && getComputedStyle(el).position !== 'absolute');
    const number = value => parseFloat(value) || 0;
    const used = children.reduce((total, el) => {
      const childStyle = getComputedStyle(el);
      return total + el.offsetHeight + number(childStyle.marginTop) + number(childStyle.marginBottom);
    }, 0) + Math.max(0, children.length - 1) * number(style.rowGap);
    return { children, free: Math.max(0, pane.clientHeight - number(style.paddingTop) - number(style.paddingBottom) - used - 4) };
  }
  function breathe(pane, cards = []) {
    if (!pane || getComputedStyle(pane).display !== 'flex') return;
    const { free } = spareHeight(pane);
    if (free < 12) return;
    // Card rows receive part of the space; the rest separates content groups.
    if (cards.length) {
      const rows = new Set(cards.map(el => el.offsetTop)).size;
      const padding = Math.min(16, free * .4 / (2 * rows));
      for (const card of cards) {
        const style = getComputedStyle(card);
        spaceStyle(card, 'padding-top', parseFloat(style.paddingTop) + padding);
        spaceStyle(card, 'padding-bottom', parseFloat(style.paddingBottom) + padding);
      }
    }
    const measured = spareHeight(pane);
    if (measured.children.length > 1) {
      const gap = parseFloat(getComputedStyle(pane).rowGap) || 0;
      spaceStyle(pane, 'row-gap', gap + Math.min(40, measured.free * .8 / (measured.children.length - 1)));
    }
  }
  function fitBreathingRoom() {
    if (document.body.classList.contains('keyboard-open') || innerHeight <= 540) return;
    const setup = app.querySelector('.setup-body');
    breathe(setup, setup ? [...setup.querySelectorAll('.player-input,.category,.time-choice,.length-choice')] : []);
    if (app.dataset.screen !== 'attempts') breathe(app.querySelector('.play-panel'));
    const scores = app.querySelector('.finish-scores');
    breathe(scores, scores ? [...scores.querySelectorAll('.leaderboard-row')] : []);
  }
  function fitStage() {
    resetSpacing();
    const viewport = window.visualViewport;
    const input = document.activeElement;
    // Installed iPhone apps can exclude safe areas from visualViewport.height.
    // The shell already pads those areas; only shrink it for an on-screen keyboard.
    const keyboardOpen = Boolean(input?.matches('input[data-player]') && viewport?.scale === 1 && viewport.height < innerHeight * .8);
    const height = keyboardOpen ? Math.min(innerHeight, viewport.height + viewport.offsetTop) : innerHeight;
    document.body.style.height = `${height}px`;
    document.body.classList.toggle('keyboard-open', keyboardOpen);
    // Measure the actual browser text, including the font and fixed letter spacing.
    document.querySelectorAll('.secret-word:not(.word-hidden), .recap-word').forEach(word => {
      word.style.removeProperty('font-size');
      word.style.removeProperty('min-height');
      const style = getComputedStyle(word);
      const maximum = parseFloat(style.fontSize);
      // Keep the spotlight and its buttons steady when a longer word needs smaller type.
      if (word.matches('.secret-word')) word.style.minHeight = style.lineHeight;
      const range = document.createRange();
      range.selectNodeContents(word);
      const boxWidth = word.getBoundingClientRect().width;
      const available = boxWidth - Math.max(8, boxWidth * .05);
      if (available <= 0 || range.getBoundingClientRect().width <= available) return;
      let lower = 1, upper = maximum;
      // Fixed tracking does not shrink with the font, so solve for the rendered width.
      while (upper - lower > .25) {
        const size = (lower + upper) / 2;
        word.style.setProperty('font-size', `${size}px`, 'important');
        if (range.getBoundingClientRect().width <= available) lower = size;
        else upper = size;
      }
      word.style.setProperty('font-size', `${Math.floor(lower * 100) / 100}px`, 'important');
    });
    fitBreathingRoom();
    const pane = input?.matches('input[data-player]') && input.closest('.setup-body');
    if (pane) {
      const field = input.getBoundingClientRect(), bounds = pane.getBoundingClientRect();
      if (field.bottom > bounds.bottom - 6) pane.scrollTop += field.bottom - bounds.bottom + 6;
      else if (field.top < bounds.top + 6) pane.scrollTop -= bounds.top - field.top + 6;
    }
  }
  window.addEventListener('resize', () => requestAnimationFrame(fitStage));
  window.visualViewport?.addEventListener('resize', () => requestAnimationFrame(fitStage));
  window.visualViewport?.addEventListener('scroll', () => requestAnimationFrame(fitStage));
  document.addEventListener('focusin', () => requestAnimationFrame(fitStage));
  document.addEventListener('focusout', () => requestAnimationFrame(fitStage));
  if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(fitStage)).observe(app);
  new MutationObserver(records => {
    if (records.some(record => record.target.parentElement?.closest('.secret-word,.recap-word') || record.target.matches?.('.secret-word,.recap-word'))) fitStage();
  }).observe(app, { childList: true, characterData: true, subtree: true });
  document.fonts?.ready.then(fitStage);
  document.fonts?.addEventListener('loadingdone', fitStage);
  function render(focus = true) {
    stopAnimation();
    const screen = game ? (privacy ? 'privacy-' : '') + game.phase : 'setup-' + setupStep;
    const entering = lastScreen !== screen;
    app.dataset.screen = screen;
    document.body.classList.toggle('is-playing', Boolean(game));
    if (!game) app.innerHTML = home();
    else if (game.phase === 'finished') app.innerHTML = finished();
    else {
      const privateTurn = ['betting', 'attempts'].includes(game.phase);
      const content = privateTurn && privacy ? privacyScreen() : ({ 'shuffle-teller': () => selection(false), handoff, 'shuffle-guesser': () => selection(true), ready, betting: wordScreen, attempts: wordScreen, recap })[game.phase]();
      app.innerHTML = `${toolbar()}<div class="game-layout ${entering ? 'stage-enter' : ''}"><section class="play-panel ${game.phase.startsWith('shuffle-') ? 'selection-panel' : ''} ${privateTurn && !privacy ? 'word-panel' : ''}" aria-label="Current turn">${content}</section></div>`;
      if (game.phase.startsWith('shuffle-')) runSelection(game.phase === 'shuffle-guesser');
    }
    lastScreen = screen;
    if (focus) { app.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
    updateSoundButton();
    fitStage();
  }
  function runSelection(guesser) {
    const candidates = game.players.filter(p => !guesser || p.id !== E.pair(game).teller);
    const selected = game.players[E.pair(game)[guesser ? 'guesser' : 'teller']];
    const order = E.shuffle(candidates);
    const started = performance.now();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let index = 0;
    const highlight = player => {
      document.querySelectorAll('[data-bubble]').forEach(el => el.classList.toggle('chosen', Number(el.dataset.bubble) === player.id));
      document.getElementById('selection-name').textContent = player.name;
      const face = document.getElementById('selection-face');
      face.innerHTML = avatar(player, true);
      face.classList.remove('face-flip'); void face.offsetWidth; face.classList.add('face-flip');
    };
    function spin() {
      const elapsed = performance.now() - started;
      if (elapsed >= 2450) {
        highlight(selected);
        document.getElementById('selection-arena').classList.add('locked');
        document.getElementById('selection-label').textContent = guesser ? 'Your guesser!' : 'Your teller!';
        document.getElementById('selection-caption').textContent = 'The spotlight is yours.';
        tone(660, .12); tone(880, .16, .08);
        return;
      }
      highlight(order[index++ % order.length]);
      tone(280 + index % 4 * 70, .024, 0, .009);
      animationTimer = setTimeout(spin, reducedMotion ? 600 : elapsed < 1500 ? 95 : elapsed < 2050 ? 170 : 240);
    }
    spin();
    animationEnd = setTimeout(() => {
      stopAnimation();
      game.phase = guesser ? 'ready' : 'handoff';
      save(); render();
      announce(`${selected.name} is the ${guesser ? 'guesser' : 'teller'}.`);
      tone(520, .08);
    }, 3000);
  }
  function startGame() {
    try { game = E.createGame(settings.names, settings.category, settings.seconds, WORDS[settings.category] || [], Math.random, settings.turns, settings.jokers); }
    catch (error) { setupError = error.message; const box = document.getElementById('setup-error'); if (box) { box.hidden = false; box.textContent = setupError; } return; }
    setupError = ''; hiddenWord = false; privacy = false; lastTick = null; leaderboardPage = 0; save(); render();
  }
  function clearGame() { stopAnimation(); game = null; setupStep = 0; stepDirection = 1; privacy = false; hiddenWord = false; setupError = ''; try { sessionStorage.removeItem(storageKey); } catch {} save(); render(); }
  function openModal(title, content, actions = '') {
    document.getElementById('modal-content').innerHTML = `<div class="modal-inner"><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close', 18)}</button></div>${content}${actions}</div>`;
    if (!modal.open) modal.showModal();
  }
  function rules() {
    openModal('How to play', `<p><strong>Make your partner guess a word with as few clues as possible.</strong> Your chosen game length sets the turns per role. Everyone starts with three bricks per telling turn and the chosen allowance of 0, 1, or 2 Jokers.</p><ol><li>The teller privately sees the word and bets <strong>1, 2, or 3 bricks</strong> within the chosen time limit. The full bet is spent immediately.</li><li>Each brick buys <strong>one spoken clue word and one spoken guess</strong>. Record Correct or Incorrect after each guess. Each attempt gets the chosen time limit. Timeout counts as Incorrect; the next attempt starts with a fresh timer. Timers keep running while the word is hidden or the app is in the background.</li><li>A correct guess gives <strong>one point to each player</strong>. Unsuccessful turns give no success points.</li><li>If the betting timer expires, <strong>three bricks are spent and the turn is lost</strong>. It counts for both players.</li><li>Each player has <strong>0, 1, or 2 Jokers for the entire game</strong>, as chosen in setup, to replace a word before betting. It does not restart the timer.</li><li>After your final telling turn, each unused brick becomes a bonus point added to your guessing score. Each unused Joker adds <strong>one more point</strong>.</li></ol><p>Keep the target word secret. Agree together whether a spoken clue or guess is valid. Geography includes place names. Each drawn word, even a Joker discard, is used only once per game.</p><p>Partners are distributed equally when possible, and otherwise differ by at most one turn.</p>`);
  }
  function about() {
    openModal('About Pyramid', `<p>Pyramid is played aloud around one shared device. Player names, choices, and scores stay in this browser session. A new game resets all scores.</p><p><strong>English word sources</strong><br>The curated lists are drawn from and verified against Princeton WordNet 3.0, an authoritative English lexical database. Categories and age suitability are editorial selections, not dictionary ratings.</p><p><a href="https://wordnet.princeton.edu/" target="_blank" rel="noopener">Princeton WordNet</a> · <a href="data/WORDNET-LICENSE.txt" target="_blank" rel="noopener">WordNet license</a> · <a href="data/SOURCES.md" target="_blank" rel="noopener">Sources & selection notes</a></p><p>Source: Princeton University, “About WordNet,” 2010. WordNet 3.0 Copyright 2006 by Princeton University. WordNet is a registered trademark.</p><p><strong>Install on your phone or tablet</strong><br>Open Pyramid over HTTPS, then use your browser’s Add to Home Screen option. On iPhone and iPad, look in the Share menu. Installed mode removes browser controls. Offline play is available after the app finishes caching its files.</p><p>${storageAvailable ? 'Refreshing restores the active game in this tab. Private words stay covered until the teller returns.' : 'This browser is blocking session storage. Keep this page open; refreshing will reset the game.'}</p>`);
  }
  function handleAction(action, button) {
    activateAudio();
    if (action === 'close-modal') { modal.close(); return; }
    if (action === 'history' && game?.phase === 'finished') { openModal('Words & results', historyList()); return; }
    if (action === 'score-page' && game?.phase === 'finished') { leaderboardPage = Number(button.dataset.page); render(); return; }
    if (action === 'scores' && game) { openModal('At the table', `${scoreList()}<p>Points include correct guesses, successful tells, and bonuses awarded after a player’s final telling turn.</p>`); return; }
    if (action === 'end-game') { openModal('End this game?', '<p>Your current words, scores, and progress will be cleared.</p>', '<div class="modal-actions"><button class="secondary-button" data-action="close-modal">Keep playing</button><button class="danger-button" data-action="confirm-end">End game</button></div>'); return; }
    if (action === 'confirm-end') { modal.close(); clearGame(); return; }
    if (action === 'setup') { clearGame(); return; }
    if (action === 'play-again' && game?.phase === 'finished') { game = null; startGame(); return; }
    if (!game) {
      if (action === 'add-player' && settings.names.length < 10) settings.names.push(defaults[settings.names.length] || `Player ${settings.names.length + 1}`);
      else if (action === 'remove-player' && settings.names.length > 2) settings.names.pop();
      else if (action === 'category') settings.category = button.dataset.category;
      else if (action === 'jokers' && [0, 1, 2].includes(Number(button.dataset.jokers))) settings.jokers = Number(button.dataset.jokers);
      else if (action === 'time') settings.seconds = Number(button.dataset.seconds);
      else if (action === 'length' && turnOptions().includes(Number(button.dataset.turns))) settings.turns = Number(button.dataset.turns);
      else if (action === 'setup-back' && setupStep > 0) { setupStep--; stepDirection = -1; }
      else if (action === 'setup-step' && Number(button.dataset.step) <= setupStep) { stepDirection = -1; setupStep = Number(button.dataset.step); }
      else if (action === 'setup-next' && setupStep < 4) {
        if (setupStep === 0 && (!settings.names.every(n => n.trim()) || new Set(settings.names.map(n => n.trim().toLowerCase())).size !== settings.names.length)) {
          setupError = 'Give everyone a name, and use a different name for each player.'; render(false); return;
        }
        setupStep++; stepDirection = 1; tone(440 + setupStep * 110, .07);
      }
      else if (action === 'start') { startGame(); return; }
      else return;
      normalizeTurns(); setupError = ''; save(); render(); return;
    }
    if (game.phase === 'handoff' && action === 'find-guesser') game.phase = game.players.length === 2 ? 'ready' : 'shuffle-guesser';
    else if (game.phase === 'ready' && action === 'reveal') { hiddenWord = false; privacy = false; lastTick = null; E.beginBetting(game); }
    else if (['betting', 'attempts'].includes(game.phase) && action === 'hide-word') hiddenWord = !hiddenWord;
    else if (game.phase === 'betting' && action === 'bet') { E.bet(game, Number(button.dataset.bet)); if (modal.open && game.phase !== 'betting') modal.close(); }
    else if (game.phase === 'betting' && action === 'joker') { if (E.joker(game)) { tone(700, .1); announce('Joker used. A new word is ready.'); } }
    else if (game.phase === 'attempts' && ['correct', 'incorrect'].includes(action)) { E.attempt(game, action === 'correct'); if (game.phase === 'recap') chime(game.history.at(-1).success); }
    else if (game.phase === 'recap' && action === 'next') { E.next(game); hiddenWord = false; privacy = false; if (game.phase === 'finished') chime(true); }
    else if (action === 'resume-word' && ['betting', 'attempts'].includes(game.phase)) { E.expire(game); privacy = false; }
    else return;
    save(); render();
    if (action === 'joker') document.querySelector('.secret-word')?.classList.add('word-flip');
  }
  document.addEventListener('click', event => { const button = event.target.closest('[data-action]'); if (button && !button.disabled) handleAction(button.dataset.action, button); });
  app.addEventListener('input', event => {
    if (event.target.matches('[data-player]') && !game) {
      settings.names[Number(event.target.dataset.player)] = event.target.value;
      setupError = '';
      document.getElementById('setup-error').hidden = true;
      const initial = event.target.closest('.player-input').querySelector('.avatar');
      initial.textContent = event.target.value.trim().slice(0, 1).toUpperCase();
      save();
    }
  });
  document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); if (game && game.phase !== 'finished') handleAction('end-game'); else clearGame(); });
  document.getElementById('rules-button').addEventListener('click', rules);
  document.getElementById('about-button').addEventListener('click', about);
  document.getElementById('sound-button').addEventListener('click', () => { activateAudio(); settings.muted = !settings.muted; updateSoundButton(); save(); if (!settings.muted) tone(600, .07); });
  modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game && ['betting', 'attempts'].includes(game.phase)) { privacy = true; render(false); } if (!document.hidden) tick(); });
  function tick() {
    if (!game || !['betting', 'attempts'].includes(game.phase)) return;
    const betting = game.phase === 'betting';
    if (E.expire(game)) { if (modal.open) modal.close(); save(); render(); chime(false); announce(betting ? 'Time is up. Three bricks spent. Turn lost.' : game.phase === 'recap' ? 'Time is up. No attempts left.' : `Time is up. Attempt ${game.current.attempts + 1} starts now.`); lastTick = null; return; }
    const remaining = Math.max(0, Math.ceil((game.current.deadline - Date.now()) / 1000));
    const seconds = document.getElementById('seconds'), clock = document.getElementById('clock');
    if (seconds) seconds.textContent = `${remaining}s`;
    if (clock) { clock.classList.toggle('urgent', remaining <= 10); clock.setAttribute('aria-label', `${remaining} seconds left to ${betting ? 'bet' : 'guess'}`); }
    if (remaining <= 10 && lastTick !== remaining) { tone(remaining % 2 ? 900 : 650, .035, 0, .035); if ([10, 5].includes(remaining)) announce(`${remaining} seconds left to ${betting ? 'bet' : 'guess'}.`); }
    lastTick = remaining;
  }
  setInterval(tick, 100);
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; document.getElementById('install-button').hidden = false; });
  document.getElementById('install-button').addEventListener('click', async () => { if (installPrompt) { await installPrompt.prompt(); installPrompt = null; document.getElementById('install-button').hidden = true; } });
  // Optional browser-standard read access mirrors the public scoreboard only.
  // It never exposes the current word, future partners, or the shuffled deck.
  if (document.modelContext?.registerTool) {
    try {
      Promise.resolve(document.modelContext.registerTool({
        name: 'get_pyramid_scoreboard',
        title: 'Pyramid scoreboard',
        description: 'Read the public Pyramid scores and completed turn counts. Does not reveal secret words or change the game.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('This tool accepts an empty object.');
          return game ? { phase: game.phase, completedTurns: game.history.length, totalTurns: game.schedule.length, players: game.players.map(p => ({ name: p.name, told: p.told, guessed: p.guessed, tellingPoints: p.telling, guessingPoints: p.guessing, brickBonus: p.brickBonus, jokerBonus: p.jokerBonus, total: E.score(p) })) } : { phase: 'setup', playerCount: settings.names.length };
        }
      })).catch(() => {});
    } catch { /* Unsupported browsers use the normal interface. */ }
  }
  if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => registration.update()).catch(() => {});
  render(false); tick();
})();
