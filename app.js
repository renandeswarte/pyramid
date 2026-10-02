(() => {
  'use strict';
  const E = window.PyramidEngine;
  const wordDecks = { en: window.PyramidWords || {}, fr: window.PyramidWordsFr || {} };
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
  // Suppress synthesized hover after touch, including on tablets with a trackpad.
  // Real mouse input restores desktop hover; native taps and scrolling stay intact.
  const inputMode = event => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') document.documentElement.classList.add('touch-input');
    else if (event.pointerType === 'mouse') document.documentElement.classList.remove('touch-input');
  };
  document.addEventListener('pointerdown', inputMode, { passive: true });
  document.addEventListener('pointermove', inputMode, { passive: true });
  const storageKey = 'pyramid-game-v1';
  const preferencesKey = 'pyramid-preferences-v2';
  const defaults = ['', '', '', ''];
  const detectedLanguage = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const categories = [
    ['global', 'Global', 'Everyday words. Endless possibilities.', 'globe'], ['food', 'Food', 'Food & drink', 'food'],
    ['animals', 'Animals', 'Wild & wonderful', 'animal'], ['geography', 'Geography', 'Places & landscapes', 'map'],
    ['body', 'Human Body', 'Head to toe', 'body'], ['kids', 'Kids', 'Ages 11 & under', 'sun'], ['teens', 'Teens', 'Ages 12 & up', 'spark']
  ];
  let settings = { language: detectedLanguage, names: [...defaults], category: 'global', seconds: 30, turns: 6, jokers: 1, muted: false };
  let setupStep = 0, stepDirection = 1, lastScreen = '', leaderboardPage = 0;
  let game = null, animationTimer = null, animationEnd = null, hiddenWord = false, privacy = false, setupError = '', lastTick = null;
  let audioContext = null, installPrompt = null, installBusy = false, appInstalled = webAppMode, storageAvailable = true, preferencesAvailable = true;
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
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    book: '<path d="M12 5v16M12 5C9 2 5 2 2 4v16c3-2 7-2 10 1 3-3 7-3 10-1V4c-3-2-7-2-10 1Z"/>',
    pencil: '<path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>'
  };
  function icon(name, size = 24) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`; }
  function escape(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function avatar(player, large = false) { return `<span class="avatar tone-${player.id % 5}${large ? ' large' : ''}" aria-hidden="true">${escape(player.name.trim().slice(0, 1).toUpperCase())}</span>`; }
  function announce(text) { document.getElementById('announcement').textContent = text; }
  function readStorage(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } }
  function writeStorage(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { storageAvailable = false; } }
  function t(key, values) { return window.PyramidI18n.text(settings.language, key, values); }
  function isSingular(n) { return new Intl.PluralRules(settings.language).select(n) === 'one'; }
  function categoryName(id) { return t(categories.find(c => c[0] === id)?.[1] || id); }
  function deck(language = settings.language) { return wordDecks[language] || wordDecks.en; }
  function languageName(language) { return language === 'fr' ? 'Français' : 'English'; }
  function save() {
    if (game) writeStorage(storageKey, game);
    try { localStorage.setItem(preferencesKey, JSON.stringify(settings)); preferencesAvailable = true; }
    catch { preferencesAvailable = false; writeStorage(preferencesKey, settings); }
  }
  let storedSettings;
  try { storedSettings = JSON.parse(localStorage.getItem(preferencesKey)); }
  catch { preferencesAvailable = false; }
  if (!storedSettings) storedSettings = readStorage(preferencesKey);
  if (!storedSettings) {
    const legacy = readStorage('pyramid-preferences-v1');
    if (legacy) {
      storedSettings = { ...legacy };
      // These were shipped defaults, not a new visitor's chosen player names.
      if (JSON.stringify(legacy.names) === JSON.stringify(['Renan', 'Valerie', 'Thomas', 'Chloe'])) storedSettings.names = [...defaults];
    }
  }
  if (storedSettings && typeof storedSettings === 'object') {
    const names = storedSettings.names;
    // Keep older 9–10-player preferences visible so the user chooses whom to remove.
    if (Array.isArray(names) && names.length >= 2 && names.length <= 10 && names.every(n => typeof n === 'string' && n.length <= 24)) settings.names = [...names];
    if (['en', 'fr'].includes(storedSettings.language)) settings.language = storedSettings.language;
    if ([0, 1, 2].includes(storedSettings.jokers)) settings.jokers = storedSettings.jokers;
    if ([30, 60].includes(storedSettings.seconds)) settings.seconds = storedSettings.seconds;
    if (categories.some(c => c[0] === storedSettings.category)) settings.category = storedSettings.category;
    if (turnOptions().includes(storedSettings.turns)) settings.turns = storedSettings.turns;
    if (typeof storedSettings.muted === 'boolean') settings.muted = storedSettings.muted;
  }
  const saved = readStorage(storageKey);
  if (saved && [1, 2].includes(saved.version) && Array.isArray(saved.players) && Array.isArray(saved.schedule) && Array.isArray(saved.deck) && Array.isArray(saved.history) && Number.isInteger(saved.index) && saved.index >= 0 && saved.index <= saved.schedule.length && ['shuffle-teller', 'handoff', 'shuffle-guesser', 'ready', 'betting', 'attempts', 'recap', 'finished'].includes(saved.phase)) {
    game = E.restore(saved);
    game.language = game.language === 'fr' ? 'fr' : 'en';
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
    button.setAttribute('aria-label', t(settings.muted ? 'Turn sound on' : 'Mute sound'));
    button.title = t(settings.muted ? 'Sound off' : 'Sound on');
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
    if (settings.names.length > E.MAX_PLAYERS) setupError = t('Games now support up to 8 players. Use − to remove the last player until your group fits.');
    const titles = ['Who’s at the table?', 'Pick your words.', 'Set the pace.', 'A little room for magic.', 'How big is your Pyramid?'];
    const subtitles = ['Good company. One device. Let’s make some guesses.', 'Pick a world of words for everyone to play with.', 'The same time limit for your bet and each clue + guess.', 'Choose how many word swaps each player gets for the whole game.', 'A quick round or a longer game? Everyone gets equal turns.'];
    const eyebrows = ['THE WORD GAME FOR GOOD COMPANY', 'A WORLD OF POSSIBILITIES', 'A LITTLE PRESSURE. A LOT OF FUN.', 'YOUR SECRET RESERVE', 'MAKE EVERY CLUE COUNT'];
    let content;
    if (setupStep === 0) content = `<div class="party-emblem" aria-hidden="true"><span class="gem"></span><span class="gem"></span><span class="gem"></span></div><div class="counter-control"><button class="small-button" data-action="remove-player" aria-label="${t('Remove last player')}" ${settings.names.length <= 2 ? 'disabled' : ''}>${icon('minus', 18)}</button><strong>${settings.names.length} <span>${t('players')}</span></strong><button class="small-button" data-action="add-player" aria-label="${t('Add player')}" ${settings.names.length >= E.MAX_PLAYERS ? 'disabled' : ''}>${icon('plus', 18)}</button></div><div class="players-grid">${settings.names.map((name, id) => `<label class="player-input" style="--i:${id}">${avatar({ name, id })}<span class="sr-only">${t('Player {n} name', {n:id + 1})}</span><input data-player="${id}" value="${escape(name)}" maxlength="24" autocomplete="off" spellcheck="false" required placeholder="${t('Player {n}', {n:id + 1})}"><span class="name-edit-icon" aria-hidden="true">${icon('pencil', 16)}</span></label>`).join('')}</div><div class="setup-tip install-slot">${canInstall() ? installButton() : `${icon('pair', 16)} ${t('Tell a word. Guess a word. Take turns being brilliant.')}`}</div>`;
    else if (setupStep === 1) content = `<div class="category-grid">${categories.map(([id, name, label, symbol], i) => `<button class="category ${id === 'global' ? 'category-global' : ''}" style="--i:${i}" data-action="category" data-category="${id}" aria-pressed="${settings.category === id}"><span class="category-symbol">${icon(symbol, 28)}</span><span class="category-name">${t(name)}<span class="category-meta">${t(label)}</span></span><span class="choice-check">${icon('check', 14)}</span></button>`).join('')}</div><p class="setup-tip">${icon('globe', 16)} ${t('{language} · {count} words in this deck', {language:languageName(settings.language),count:deck()[settings.category].length.toLocaleString(settings.language)})}</p>`;
    else if (setupStep === 2) content = `<div class="time-choices">${[30, 60].map((seconds, i) => `<button class="time-choice" style="--i:${i}" data-action="time" data-seconds="${seconds}" aria-pressed="${settings.seconds === seconds}"><span class="time-dial">${icon('clock', 42)}</span><strong>${seconds}<small>${t('seconds')}</small></strong><span>${t(seconds === 30 ? 'Keep it moving' : 'Room to think')}</span><span class="choice-check">${icon('check', 14)}</span></button>`).join('')}</div><div class="setup-callout">${icon('clock', 20)}<p>${t('Place your bet before the clock runs out.')}<br><strong>${t('Bet timeout: turn lost. Guess timeout: attempt lost.')}</strong></p></div>`;
    else if (setupStep === 3) content = `<div class="length-choices joker-choices">${[0, 1, 2].map((n, i) => `<button class="length-choice" style="--i:${i}" data-action="jokers" data-jokers="${n}" aria-pressed="${settings.jokers === n}"><span class="length-label">${t(['All in', 'A second chance', 'More possibilities'][n])}</span><strong>${n}</strong><span>${t(isSingular(n) ? 'Joker each' : 'Jokers each')}</span><small>${n === 0 ? t('Play every word') : t(isSingular(n) ? 'Up to +{n} bonus point' : 'Up to +{n} bonus points',{n})}</small><span class="choice-check">${icon('check', 14)}</span></button>`).join('')}</div><div class="setup-callout">${icon('spark', 20)}<p>${t('Swap a word before you bet. The timer keeps running.')}<br><strong>${t('Each unused Joker earns 1 bonus point.')}</strong></p></div>`;
    else content = `<div class="length-choices">${turnOptions().map((turns, i) => `<button class="length-choice" style="--i:${i}" data-action="length" data-turns="${turns}" aria-pressed="${settings.turns === turns}"><span class="length-label">${t(turns === 6 ? 'Classic' : turns === settings.names.length - 1 ? (turns < 6 ? 'Quick game' : 'Round robin') : 'A little longer')}</span><strong>${turns}</strong><span>${t(turns === 1 ? 'turn each, per role' : 'turns each, per role')}</span><small>${t('{words} words · {bricks} bricks each',{words:settings.names.length * turns,bricks:turns * 3})}</small><span class="choice-check">${icon('check', 14)}</span></button>`).join('')}</div><div class="balance-note">${icon('pair', 22)}<div><strong>${t(settings.turns % (settings.names.length - 1) === 0 ? 'Every partner. Exactly equal.' : 'Equal roles. Balanced partners.')}</strong><p>${settings.turns % (settings.names.length - 1) === 0 ? t(settings.turns / (settings.names.length - 1) === 1 ? 'Each player tells to every other player once, and guesses for them equally.' : 'Each player tells to every other player {n} times, and guesses for them equally.',{n:settings.turns / (settings.names.length - 1)}) : t('Everyone tells and guesses the same number of times. Partner counts differ by at most one.')}</p></div></div><div class="launch-summary"><span>${t('{n} players',{n:settings.names.length})}</span><i></i><span>${categoryName(settings.category)}</span><i></i><span>${t('{n}s per timer',{n:settings.seconds})}</span><i></i><span>${t(isSingular(settings.jokers) ? '{n} Joker each' : '{n} Jokers each',{n:settings.jokers})}</span></div>`;
    return `<section class="setup-stage"><nav class="setup-steps" aria-label="${t('Game setup')}">${['Players', 'Words', 'Time', 'Jokers', 'Length'].map((name, i) => `<button data-action="setup-step" data-step="${i}" class="${i === setupStep ? 'current' : i < setupStep ? 'complete' : ''}" ${i > setupStep ? 'disabled' : ''} ${i === setupStep ? 'aria-current="step"' : ''}><span>${i < setupStep ? icon('check', 12) : i + 1}</span><small>${t(name)}</small></button>`).join('')}</nav><div class="setup-content ${lastScreen !== 'setup-' + setupStep ? 'stage-enter' : ''}" style="--direction:${stepDirection}"><div class="setup-heading"><p class="eyebrow">${t(eyebrows[setupStep])}</p><h1>${t(titles[setupStep])}</h1><p class="subtitle">${t(subtitles[setupStep])}</p></div><div class="setup-body">${content}</div><p id="setup-error" class="error-message" role="alert" ${!setupError ? 'hidden' : ''}>${escape(setupError)}</p></div><div class="setup-navigation">${setupStep ? `<button class="secondary-button" data-action="setup-back">${t('← Back')}</button>` : ''}<button class="primary-button" data-action="${setupStep === 4 ? 'start' : 'setup-next'}">${setupStep === 4 ? icon('spark', 19) + ' ' + t('Let’s play') : t(['Choose your words', 'Set the time', 'Choose your Jokers', 'Choose game length'][setupStep]) + ' <span aria-hidden="true">→</span>'}</button></div><p class="start-note">${setupStep === 0 ? t('Edit the names. Invite 2–8 players.') : setupStep === 4 ? t('Fewer clues. More points. One shared device.') : t('STEP {n} OF 5',{n:setupStep + 1})}</p></section>`;
  }
  function scoreList() {
    return game.players.map(p => `<div class="score-player ${E.pair(game)?.teller === p.id && game.phase !== 'finished' ? 'active' : ''}">${avatar(p)}<div class="score-name">${escape(p.name)}<span class="score-meta">${t('{told}/{total} told · {guessed}/{total} guessed',{told:p.told,total:game.turns,guessed:p.guessed})}</span></div><span class="score-number">${E.score(p)}</span></div>`).join('');
  }
  function toolbar() {
    return `<div class="game-toolbar"><div class="game-progress"><div class="progress-bar" aria-hidden="true"><i style="width:${game.history.length / game.schedule.length * 100}%"></i></div><span>${game.phase === 'finished' ? t('Game complete') : t('Turn {n} of {total}',{n:game.index + 1,total:game.schedule.length})}</span></div><div class="toolbar-actions"><button class="utility-button" data-action="scores">${icon('trophy', 15)} ${t('Scores')}</button><button class="utility-button end-game-button" data-action="end-game">${icon('close', 15)} ${t('End Game')}</button></div></div>`;
  }
  function selection(guesser) {
    const pair = E.pair(game);
    const people = game.players.filter(p => !guesser || p.id !== pair.teller);
    return `<p class="eyebrow">${t(guesser ? 'BUILDING YOUR DUO' : 'THE NEXT TELLER')}</p><h1>${t(guesser ? 'Find your partner.' : 'Who’s up next?')}</h1><p class="subtitle">${guesser ? t('Let’s find a guesser for {name}.',{name:escape(game.players[pair.teller].name)}) : t('The spotlight is looking for you.')}</p><div class="selection-arena" id="selection-arena"><div class="orbit-track" aria-hidden="true"></div><div class="orbit-track second" aria-hidden="true"></div><div class="orbit-sweep" aria-hidden="true"></div><div class="orbit-sparks" aria-hidden="true">${Array.from({length:6},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>${people.map((p,i)=>`<div class="orbit-player" data-bubble="${p.id}" style="--angle:${i * 360 / people.length}deg;--counter-angle:${-i * 360 / people.length}deg;--i:${i}">${avatar(p)}<span>${escape(p.name)}</span></div>`).join('')}<div class="selection-focus"><div class="focus-halo" aria-hidden="true"></div><div id="selection-face">${avatar(people[0],true)}</div><strong id="selection-name">${escape(people[0].name)}</strong><span id="selection-label">${t(guesser ? 'Finding your guesser' : 'Taking the spotlight')}</span></div></div><div class="reveal-meter" aria-hidden="true"><i></i></div><p class="selection-caption" id="selection-caption">${icon('shuffle',14)} ${t('A little suspense. A fair match.')}</p>`;
  }
  function handoff() {
    const teller=game.players[E.pair(game).teller];
    return `<div class="handoff-avatar">${avatar(teller,true)}</div><p class="eyebrow">${t('YOUR NEXT TELLER')}</p><h1>${t('Pass it to {name}.',{name:escape(teller.name)})}</h1><p class="subtitle">${t('Take the device. Keep the screen to yourself.')}</p><span class="pill">${t('Telling turn {n} of {total}',{n:teller.told+1,total:game.turns})}</span><button class="primary-button" data-action="find-guesser">${t('I’m {name}. I’m ready.',{name:escape(teller.name)})}</button><p class="hint">${t('Your word stays hidden until you’re ready to bet.')}</p>`;
  }
  function ready() {
    const pair=E.pair(game),teller=game.players[pair.teller],guesser=game.players[pair.guesser];
    return `<p class="eyebrow">${teller.told===game.turns-1?t('YOUR FINAL TELLING TURN'):t('TELLING TURN {n} OF {total}',{n:teller.told+1,total:game.turns})}</p><h1>${t('You’re playing together.')}</h1><div class="player-pair"><div class="pair-person">${avatar(teller,true)}<strong>${escape(teller.name)}</strong><small>${t('Teller')}</small></div><span class="pair-divider">${icon('pair',24)}</span><div class="pair-person">${avatar(guesser,true)}<strong>${escape(guesser.name)}</strong><small>${t('Guesser')}</small></div></div><p class="subtitle">${t('{name}, only you should see the word.',{name:escape(teller.name)})}</p><span class="pill">${icon('clock',15)} ${t('{n} seconds to bet',{n:game.seconds})}</span><button class="primary-button" data-action="reveal">${t('Reveal word & start timer')}</button><p class="hint">${t('If time runs out: 3 bricks spent, turn lost.')}<br>${t('Give your clues and make your guesses aloud.')}</p>`;
  }
  function wordScreen() {
    const turn=game.current,teller=game.players[turn.teller],guesser=game.players[turn.guesser];
    const betting=game.phase==='betting',remainingJokers=game.jokers-teller.jokersUsed;
    return `<div class="word-topline"><span class="turn-chip">${escape(teller.name)} · ${t('Telling turn {n}/{total}',{n:teller.told+1,total:game.turns})}${betting?'':` · ${t(turn.bet===1?'{n} brick bet':'{n} bricks bet',{n:turn.bet})}`}</span><div class="clock" id="clock" role="timer" aria-label="${t(betting?'Betting time remaining':'Guessing time remaining')}">${icon('clock',18)}<span id="seconds">${Math.max(0,Math.ceil((turn.deadline-Date.now())/1000))}s</span></div></div>
    <div class="word-area"><div class="word-face"><p class="word-label">${t(hiddenWord?'YOUR WORD IS HIDDEN':'YOUR WORD TO TELL')} – ${categoryName(game.category).toLocaleUpperCase(settings.language)}</p><h1 class="secret-word ${hiddenWord?'word-hidden':''}" lang="${hiddenWord?settings.language:game.language}">${hiddenWord?t('Ready when you are.'):escape(turn.word)}</h1></div><div class="word-controls"><button class="utility-button hide-word-button" data-action="hide-word" aria-pressed="${hiddenWord}">${icon(hiddenWord?'eye':'eyeOff',16)} ${t(hiddenWord?'Show word':'Hide word')}</button>${betting&&game.jokers>0?`<button class="utility-button joker-button" data-action="joker" ${remainingJokers===0?'disabled':''}>${icon('spark',18)} ${remainingJokers?t(remainingJokers===1?'Use Joker · {n} left':'Use Jokers · {n} left',{n:remainingJokers}):t('No Jokers left')}</button>`:''}</div></div>
    ${betting?`<div class="bricks-display"><span class="gem" aria-hidden="true"></span><strong>${teller.bricks}</strong> ${t(isSingular(teller.bricks)?'brick left':'bricks left')}</div><div class="brick-bank" aria-hidden="true">${Array.from({length:game.startingBricks},(_,i)=>`<span class="gem ${i>=teller.bricks?'spent':''}"></span>`).join('')}</div><p class="bet-label">${t('How many clues will it take?')}</p><div class="bet-options">${[1,2,3].map(n=>`<button class="bet-button" data-action="bet" data-bet="${n}" aria-label="${t(isSingular(n)?'Bet {n} brick':'Bet {n} bricks',{n})}"><span class="bet-gems" aria-hidden="true">${'<span class="gem"></span>'.repeat(n)}</span><strong>${n}</strong><small>${t(isSingular(n)?'brick · 1 clue':'bricks · {n} clues',{n})}</small></button>`).join('')}</div><p class="hint">${t('Commit your full bet. Saved bricks become bonus points.')}<br>${t(remainingJokers?'A Joker swaps the word. The timer keeps running.':'Make every clue count.')}</p>`:`<p class="eyebrow" style="margin-bottom:12px">${t('ATTEMPT {n} OF {total}',{n:turn.attempts+1,total:turn.bet})}</p><div class="attempt-dots" aria-label="${t(turn.bet-turn.attempts===1?'{n} attempt remaining':'{n} attempts remaining',{n:turn.bet-turn.attempts})}">${Array.from({length:turn.bet},(_,i)=>`<span class="attempt-dot ${i<turn.attempts?'used':i===turn.attempts?'current':''}">${i+1}</span>`).join('')}</div><p class="subtitle">${t('Give {name} <strong>one spoken word</strong>.<br>Then let them make one guess.',{name:escape(guesser.name)})}</p><div class="action-pair"><button class="danger-button" data-action="incorrect">${icon('close',18)} ${t('Incorrect')}</button><button class="success-button" data-action="correct">${icon('check',19)} ${t('Correct!')}</button></div><p class="hint">${turn.attemptResults.at(-1)==='timeout'?t('Last attempt timed out. A fresh timer is running.'):t('{n}s per attempt. Time runs out? That attempt counts as incorrect.',{n:game.seconds})}</p>`}`;
  }
  function recap() {
    const turn=game.history.at(-1),teller=game.players[turn.teller],guesser=game.players[turn.guesser];
    const heading=t(turn.timeout?'Time’s up.':turn.success?'That’s the word!':'A tricky one.');
    const message=t(turn.timeout==='betting'?'Turn lost. Three bricks spent. No success points.':turn.timeout==='guessing'?'Last attempt timed out. No success points.':turn.success?'One good guess. Two happy players.':'No success points this time. On to the next word.');
    return `<div class="recap-symbol ${turn.success?'':'missed'}">${icon(turn.timeout?'clock':turn.success?'check':'close',34)}</div><h1>${heading}</h1><p class="subtitle">${message}</p><h2 class="recap-word" lang="${game.language}">${escape(turn.word)}</h2><div class="recap-players">${[[teller,'Teller'],[guesser,'Guesser']].map(([p,role])=>`<div class="recap-person">${avatar(p)}<strong>${escape(p.name)}</strong><span style="color:var(--muted)">${t(role)}</span><span class="points-gain ${turn.success?'':'zero'}">${t(turn.success?'+1 point':'0 points')}</span></div>`).join('')}</div><div class="receipt"><span><span class="gem" aria-hidden="true"></span>${t('{spent} spent · {left} left',{spent:turn.bet,left:turn.bricksLeft})}</span><span>${turn.timeout==='betting'?t('Betting timeout'):t(isSingular(turn.attempts)?'{n} attempt':'{n} attempts',{n:turn.attempts})}</span>${turn.discarded.length?`<span>${t(turn.discarded.length===1?'{n} Joker used':'{n} Jokers used',{n:turn.discarded.length})}</span>`:''}</div>${teller.told===game.turns?`<div class="bonus-banner"><strong>${t('{name} finished telling!',{name:escape(teller.name)})}</strong><br>${t(isSingular(turn.brickBonus)?'+{n} unused-brick point':'+{n} unused-brick points',{n:turn.brickBonus})}${turn.jokerBonus?` · ${t(isSingular(turn.jokerBonus)?'+{n} unused-Joker point':'+{n} unused-Joker points',{n:turn.jokerBonus})}`:''}</div>`:''}<button class="primary-button" data-action="next">${t(game.index===game.schedule.length-1?'See the final scores':'Ready for the next turn')}</button>`;
  }
  function privacyScreen() {
    const teller=game.players[game.current.teller];
    return `<div class="selection-icon">${icon('lock',27)}</div><p class="eyebrow">${t('KEEP THE WORD SECRET')}</p><h1>${t('Welcome back, {name}.',{name:escape(teller.name)})}</h1><p class="subtitle">${t('Make sure only you can see the screen.')}</p><button class="primary-button" style="margin-top:26px" data-action="resume-word">${t('Show my turn')}</button><p class="hint">${t(game.phase==='betting'?'Your betting timer is still running.':'Your guessing timer is still running.')}</p>`;
  }
  function historyList() {
    return game.history.map((turn,i)=>`<div class="history-item"><div><strong lang="${game.language}">${escape(turn.word)}</strong><small>${i+1}. ${t('{name} to {partner}',{name:escape(game.players[turn.teller].name),partner:escape(game.players[turn.guesser].name)})} · ${turn.bet} ${t(turn.bet===1?'brick':'bricks')}${turn.attemptResults.includes('timeout')?` · ${t('{n} timed-out attempts',{n:turn.attemptResults.filter(r=>r==='timeout').length})}`:''}${turn.discarded.length?` · ${t('Replaced: {words}',{words:turn.discarded.map(escape).join(', ')})}`:''}</small></div><span class="history-status ${turn.success?'':'missed'}">${t(turn.timeout?'Timed out':turn.success?'Guessed':'Missed')}</span></div>`).join('');
  }
  function finished() {
    const sorted=[...game.players].sort((a,b)=>E.score(b)-E.score(a)),winners=sorted.filter(p=>E.score(p)===E.score(sorted[0])),pages=Math.ceil(sorted.length/4);
    leaderboardPage=Math.max(0,Math.min(leaderboardPage,pages-1));
    const name=winners.length===1?t('{name} wins!',{name:escape(winners[0].name)}):t('{n} champions!',{n:winners.length});
    return `<section class="finish-screen ${lastScreen!=='finished'?'screen-enter':''}"><div class="finish-header"><div class="trophy">${icon('trophy',51)}</div><p class="eyebrow">${t(winners.length>1?'SHARED VICTORY':'THE PYRAMID CHAMPION')}</p><h1>${name}</h1><p class="subtitle">${t('{points} points · {words} words played',{points:E.score(sorted[0]),words:game.history.length})}</p></div><div class="finish-scores"><div class="panel leaderboard"><div class="leaderboard-head"><span>#</span><span style="text-align:left">${t('Player')}</span><span title="${t('Successful guesses')}">${t('Guess')}</span><span title="${t('Successful tells')}">${t('Tell')}</span><span>${t('Bricks')}</span><span>${t('Joker')}</span><span>${t('Total')}</span></div>${sorted.slice(leaderboardPage*4,leaderboardPage*4+4).map(p=>`<div class="leaderboard-row ${winners.includes(p)?'winner':''}"><span class="rank">${sorted.findIndex(q=>E.score(q)===E.score(p))+1}</span><span class="leaderboard-name" title="${escape(p.name)}${winners.includes(p)?' — '+t('Champion'):''}">${avatar(p)}<span>${escape(p.name)}</span>${winners.includes(p)?`<span class="winner-mark" aria-label="${t('Champion')}">✦</span>`:''}</span><span>${p.guessing}</span><span>${p.telling}</span><span>${p.brickBonus}</span><span>${p.jokerBonus}</span><span class="total-score">${E.score(p)}</span></div>`).join('')}</div>${pages>1?`<nav class="score-pages" aria-label="${t('Leaderboard pages')}"><button class="small-button" data-action="score-page" data-page="${leaderboardPage-1}" aria-label="${t('Previous players')}" ${leaderboardPage===0?'disabled':''}>←</button><span>${t('Players {first}–{last} of {total}',{first:leaderboardPage*4+1,last:Math.min((leaderboardPage+1)*4,sorted.length),total:sorted.length})}</span><button class="small-button" data-action="score-page" data-page="${leaderboardPage+1}" aria-label="${t('Next players')}" ${leaderboardPage===pages-1?'disabled':''}>→</button></nav>`:''}<p class="leaderboard-legend">${t('Guess = correct guesses · Tell = successful tells')}<br>${t('Bricks & Joker = unused-resource bonuses')}</p></div><div class="finish-actions"><button class="primary-button" data-action="play-again">${icon('shuffle',18)} ${t('Play again')}</button><button class="secondary-button" data-action="setup">${t('Change setup')}</button></div><button class="text-button history-button" data-action="history">${t('All {n} words & results',{n:game.history.length})} ${icon('arrow',15)}</button></section>`;
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
    if (document.body.classList.contains('keyboard-open') || document.body.clientHeight <= 540) return;
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
    // iOS standalone innerHeight can omit safe areas even with viewport-fit=cover.
    // Let CSS size the stage; use the visual viewport only while editing a name.
    const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')) || 0;
    document.documentElement.classList.toggle('ios-covered-viewport', navigator.standalone === true && safeTop > 0);
    document.body.style.removeProperty('height');
    const stageHeight = document.body.clientHeight;
    const keyboardOpen = Boolean(input?.matches('input[data-player]') && viewport?.scale === 1 && viewport.height < stageHeight * .8);
    if (keyboardOpen) document.body.style.height = `${Math.min(stageHeight, viewport.height + viewport.offsetTop)}px`;
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
  window.addEventListener('pageshow', () => requestAnimationFrame(fitStage));
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
      app.innerHTML = `${toolbar()}<div class="game-layout ${entering ? 'stage-enter' : ''}"><section class="play-panel ${game.phase.startsWith('shuffle-') ? 'selection-panel' : ''} ${privateTurn && !privacy ? 'word-panel' : ''}" aria-label="${t('Current turn')}">${content}</section></div>`;
      if (game.phase.startsWith('shuffle-')) runSelection(game.phase === 'shuffle-guesser');
    }
    lastScreen = screen;
    if (focus) { app.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
    updateHeader();
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
        document.getElementById('selection-label').textContent = t(guesser ? 'Your guesser!' : 'Your teller!');
        document.getElementById('selection-caption').textContent = t('The spotlight is yours.');
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
      announce(t(guesser ? '{name} is the guesser.' : '{name} is the teller.', {name:selected.name}));
      tone(520, .08);
    }, 3000);
  }
  function startGame() {
    if (settings.names.length > E.MAX_PLAYERS) { clearGame(); return; }
    try { game = E.createGame(settings.names, settings.category, settings.seconds, deck()[settings.category] || [], Math.random, settings.turns, settings.jokers); game.language = settings.language; }
    catch (error) { setupError = t(error.message); const box = document.getElementById('setup-error'); if (box) { box.hidden = false; box.textContent = setupError; } return; }
    setupError = ''; hiddenWord = false; privacy = false; lastTick = null; leaderboardPage = 0; save(); render();
  }
  function clearGame() { stopAnimation(); game = null; setupStep = 0; stepDirection = 1; privacy = false; hiddenWord = false; setupError = ''; try { sessionStorage.removeItem(storageKey); } catch {} save(); render(); }
  function openModal(title, content, actions = '') {
    document.getElementById('modal-content').innerHTML = `<div class="modal-inner"><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="${t('Close dialog')}">${icon('close', 18)}</button></div><div class="modal-body" tabindex="0">${content}${actions}</div></div>`;
    if (!modal.open) modal.showModal();
  }
  function rules() { openModal(t('How to play'), t('rules.content')); }
  function about() {
    openModal(t('About Pyramid'), `${t('about.content')}<div class="about-actions">${canInstall() ? installButton() : ''}<button class="text-button" data-action="sources">${t('Sources & licenses')}</button></div><p>${t(storageAvailable ? 'Refreshing restores the active game in this tab. Private words stay covered until the teller returns.' : 'This browser is blocking session storage. Keep this page open; refreshing will reset the game.')}</p><p>${t(preferencesAvailable ? 'Saved on this device.' : 'This browser cannot save preferences. They will only last for this session.')}</p>`);
  }
  function updateHeader() {
    document.documentElement.lang = settings.language;
    document.querySelector('link[rel="manifest"]').setAttribute('href', settings.language === 'fr' ? 'manifest.fr.webmanifest' : 'manifest.webmanifest');
    document.title = t('Pyramid · The word game');
    document.querySelector('meta[name="description"]').content = t('app.description');
    document.querySelector('.brand').setAttribute('aria-label', t('Pyramid home'));
    const rulesButton = document.getElementById('rules-button');
    rulesButton.innerHTML = `${icon('book',18)}<span class="rules-label">${t('How to play')}</span>`;
    rulesButton.setAttribute('aria-label', t('How to play'));
    rulesButton.title = t('How to play');
    document.getElementById('about-button').setAttribute('aria-label', t('About Pyramid'));
    document.getElementById('about-button').title = t('About & word sources');
    const footer = document.querySelector('.app-footer');
    footer.firstElementChild.textContent = t('FEWER CLUES. MORE POINTS.');
    footer.lastElementChild.textContent = t('ONE WORD AT A TIME');
    const button = document.getElementById('language-button');
    button.innerHTML = flag(settings.language);
    button.setAttribute('aria-label', `${t('Choose language')} · ${languageName(settings.language)}`);
    button.title = t('Choose language');
  }
  function flag(language) { return `<img src="assets/flag-${language}.svg" alt="" aria-hidden="true" draggable="false">`; }
  function canInstall() { return !webAppMode && !appInstalled; }
  function installButton() { return `<button class="install-action secondary-button" data-action="install" aria-haspopup="dialog">${icon('download',17)} ${t('Install Pyramid')}</button>`; }
  function refreshInstallActions() {
    document.querySelectorAll('[data-action="install"]').forEach(button => { button.hidden = !canInstall(); });
    if (!canInstall() && modal.open && modal.querySelector('.install-guide')) modal.close();
    if (!game && setupStep === 0) render(false);
  }
  async function installApp() {
    if (!canInstall() || installBusy) return;
    if (!installPrompt) { openModal(t('Install Pyramid'), `<div class="install-guide">${t('install.content')}</div>`); return; }
    const prompt = installPrompt; installPrompt = null; installBusy = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      // Acceptance is not installation completion; appinstalled confirms that.
      if (choice?.outcome === 'accepted' && modal.open) modal.close();
    } catch {
      if (canInstall()) openModal(t('Install Pyramid'), `<div class="install-guide">${t('install.content')}</div>`);
    } finally { installBusy = false; }
  }
  function languages() {
    openModal(t('Language'), `<div class="language-choices">${['en','fr'].map(language => `<button class="language-choice" data-action="language" data-language="${language}" aria-pressed="${settings.language === language}" lang="${language}"><span class="language-flag">${flag(language)}</span><strong>${languageName(language)}</strong>${settings.language === language ? icon('check',20) : ''}</button>`).join('')}</div>${game && game.phase !== 'finished' ? `<p class="hint">${t('Changing language during a game restarts it and resets the scores. Your names and settings are kept.')}</p>` : ''}`);
  }
  function handleAction(action, button) {
    activateAudio();
    if (action === 'install') { installApp(); return; }
    if (action === 'sources') { openModal(t('Sources & licenses'), t('sources.content')); return; }
    if (['language', 'confirm-language'].includes(action) && ['en','fr'].includes(button.dataset.language)) {
      const language = button.dataset.language;
      const active = game && game.phase !== 'finished';
      if (action === 'language' && active && language !== game.language) {
        openModal(t('Change language and restart?'), `<p>${t('Changing to {language} starts a new game and clears the current words, scores, and progress. Your player names and game settings are kept.', {language:languageName(language)})}</p><p class="hint">${t('The current timer keeps running until you confirm.')}</p>`, `<div class="modal-actions"><button class="secondary-button" data-action="close-modal">${t('Cancel')}</button><button class="primary-button" data-action="confirm-language" data-language="${language}">${t('Change language & restart')}</button></div>`);
        return;
      }
      if (action === 'confirm-language' && active) {
        // Restart with the current game's configuration, including restored games.
        Object.assign(settings, {names:game.players.map(p => p.name), category:game.category, seconds:game.seconds, turns:game.turns, jokers:game.jokers});
        settings.language = language; modal.close(); clearGame(); startGame(); return;
      }
      settings.language = language; setupError = '';
      if (game) E.expire(game);
      save(); modal.close(); render(false); tick();
      document.getElementById('language-button').focus({ preventScroll: true }); return;
    }
    if (action === 'close-modal') { modal.close(); return; }
    if (action === 'history' && game?.phase === 'finished') { openModal(t('Words & results'), historyList()); return; }
    if (action === 'score-page' && game?.phase === 'finished') { leaderboardPage = Number(button.dataset.page); render(); return; }
    if (action === 'scores' && game) { openModal(t('At the table'), `${scoreList()}<p>${t('Points include correct guesses, successful tells, and bonuses awarded after a player’s final telling turn.')}</p>`); return; }
    if (action === 'end-game') { openModal(t('End this game?'), `<p>${t('Your current words, scores, and progress will be cleared.')}</p>`, `<div class="modal-actions"><button class="secondary-button" data-action="close-modal">${t('Keep playing')}</button><button class="danger-button" data-action="confirm-end">${t('End game')}</button></div>`); return; }
    if (action === 'confirm-end') { modal.close(); clearGame(); return; }
    if (action === 'setup') { clearGame(); return; }
    if (action === 'play-again' && game?.phase === 'finished') { game = null; startGame(); return; }
    if (!game) {
      if (action === 'add-player' && settings.names.length < E.MAX_PLAYERS) settings.names.push('');
      else if (action === 'remove-player' && settings.names.length > 2) settings.names.pop();
      else if (action === 'category') settings.category = button.dataset.category;
      else if (action === 'jokers' && [0, 1, 2].includes(Number(button.dataset.jokers))) settings.jokers = Number(button.dataset.jokers);
      else if (action === 'time') settings.seconds = Number(button.dataset.seconds);
      else if (action === 'length' && turnOptions().includes(Number(button.dataset.turns))) settings.turns = Number(button.dataset.turns);
      else if (action === 'setup-back' && setupStep > 0) { setupStep--; stepDirection = -1; }
      else if (action === 'setup-step' && Number(button.dataset.step) <= setupStep) { stepDirection = -1; setupStep = Number(button.dataset.step); }
      else if (action === 'setup-next' && setupStep < 4) {
        if (settings.names.length > E.MAX_PLAYERS) { setupStep = 0; render(false); return; }
        if (setupStep === 0 && (!settings.names.every(n => n.trim()) || new Set(settings.names.map(n => n.trim().toLowerCase())).size !== settings.names.length)) {
          setupError = t('Give everyone a name, and use a different name for each player.'); render(false); return;
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
    else if (game.phase === 'betting' && action === 'joker') { if (E.joker(game)) { tone(700, .1); announce(t('Joker used. A new word is ready.')); } }
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
  document.getElementById('language-button').addEventListener('click', languages);
  document.getElementById('about-button').addEventListener('click', about);
  document.getElementById('sound-button').addEventListener('click', () => { activateAudio(); settings.muted = !settings.muted; updateSoundButton(); save(); if (!settings.muted) tone(600, .07); });
  modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game && ['betting', 'attempts'].includes(game.phase)) { privacy = true; render(false); } if (!document.hidden) tick(); });
  function tick() {
    if (!game || !['betting', 'attempts'].includes(game.phase)) return;
    const betting = game.phase === 'betting';
    if (E.expire(game)) { if (modal.open) modal.close(); save(); render(); chime(false); announce(t(betting ? 'Time is up. Three bricks spent. Turn lost.' : game.phase === 'recap' ? 'Time is up. No attempts left.' : 'Time is up. Attempt {n} starts now.',{n:game.current.attempts + 1})); lastTick = null; return; }
    const remaining = Math.max(0, Math.ceil((game.current.deadline - Date.now()) / 1000));
    const seconds = document.getElementById('seconds'), clock = document.getElementById('clock');
    if (seconds) seconds.textContent = `${remaining}s`;
    if (clock) { clock.classList.toggle('urgent', remaining <= 10); clock.setAttribute('aria-label', t(betting ? (isSingular(remaining) ? '{n} second left to bet' : '{n} seconds left to bet') : (isSingular(remaining) ? '{n} second left to guess' : '{n} seconds left to guess'),{n:remaining})); }
    if (remaining <= 10 && lastTick !== remaining) { tone(remaining % 2 ? 900 : 650, .035, 0, .035); if ([10, 5].includes(remaining)) announce(t(betting ? (isSingular(remaining) ? '{n} second left to bet' : '{n} seconds left to bet') : (isSingular(remaining) ? '{n} second left to guess' : '{n} seconds left to guess'),{n:remaining})); }
    lastTick = remaining;
  }
  setInterval(tick, 100);
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (canInstall()) installPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    appInstalled = true; installPrompt = null; refreshInstallActions();
  });
  standaloneDisplay.addEventListener('change', refreshInstallActions);
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
  save(); render(false); tick();
})();
