// Playwright CLI run-code scenario; serve the project on port 4173.
async page => {
  const browser = page.context().browser(), results = [];
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const context = await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'en-US',serviceWorkers:'block',reducedMotion:'reduce'});
  const p = await context.newPage(), errors = [];
  p.on('pageerror', error => errors.push(error.message));
  await p.addInitScript(() => {
    if (window.name.startsWith('pyramid-check:')) {
      const seed = JSON.parse(window.name.slice(14));
      localStorage.setItem('pyramid-preferences-v2', JSON.stringify(seed.preferences));
      if (seed.game) sessionStorage.setItem('pyramid-game-v1', JSON.stringify(seed.game));
      else sessionStorage.removeItem('pyramid-game-v1');
    }
  });
  await p.clock.install(); await p.goto('http://127.0.0.1:4173/');
  await p.locator('[data-action="install"]').click();
  check((await p.locator('#modal-content').innerText()).includes('Android · Chrome'), 'Missing installation fallback');
  await p.locator('[data-action="close-modal"]').click();
  await p.locator('#about-button').click();
  check(!(await p.locator('#modal-content').innerText()).includes('WordNet'), 'About still contains dictionary section');
  check(await p.locator('#modal [data-action="install"]').isVisible(), 'About installation action missing');
  await p.locator('[data-action="sources"]').click();
  check((await p.locator('#modal-content').innerText()).includes('Princeton University'), 'Attribution missing');
  await p.locator('[data-action="close-modal"]').click();
  // Native prompt delivery is simulated; actual device installation is browser-owned.
  for (const outcome of ['dismissed','accepted']) {
    await p.evaluate(outcome => {
      const event = new Event('beforeinstallprompt', {cancelable:true});
      event.prompt = async () => { window.promptCalls = (window.promptCalls || 0) + 1; };
      event.userChoice = Promise.resolve({outcome});
      dispatchEvent(event);
    }, outcome);
    await p.locator('#app [data-action="install"]').click();
    check(await p.evaluate(() => window.promptCalls) === (outcome === 'dismissed' ? 1 : 2), 'Native prompt not called once');
    if (outcome === 'dismissed') {
      await p.locator('#app [data-action="install"]').click();
      check(await p.locator('.install-guide').isVisible(), 'Dismissal did not leave usable fallback');
      await p.locator('[data-action="close-modal"]').click();
    }
  }
  await p.evaluate(() => dispatchEvent(new Event('appinstalled')));
  check(await p.locator('[data-action="install"]:visible').count() === 0, 'Install action survived appinstalled');
  await p.locator('#about-button').click();
  check(await p.locator('#modal [data-action="install"]').count() === 0, 'About install action survived appinstalled');
  await p.locator('[data-action="close-modal"]').click();
  results.push({installFallback:true,nativePromptAcceptedAndDismissed:true,installedActionsHidden:true,sourcesAccessible:true});
  const seed = async preferences => {
    await p.evaluate(preferences => { window.name = 'pyramid-check:' + JSON.stringify({preferences}); }, preferences);
    await p.reload();
  };
  for (const count of [9,10]) {
    const names = Array.from({length:count}, (_,i) => 'Player ' + (i+1));
    await seed({language:'en',names,category:'global',seconds:30,turns:6,jokers:1});
    check(await p.locator('input[data-player]').count() === count, 'Old saved names silently removed');
    await p.locator('[data-action="setup-next"]').click();
    check(await p.locator('#app').getAttribute('data-screen') === 'setup-0', 'Oversized group continued');
    check(await p.locator('[data-action="add-player"]').isDisabled(), 'Oversized group can add players');
    for (let i=count; i>8; i--) await p.locator('[data-action="remove-player"]').click();
    check(await p.locator('[data-action="add-player"]').isDisabled(), 'Eight-player limit not enforced');
    await p.locator('[data-action="setup-next"]').click();
    check(await p.locator('#app').getAttribute('data-screen') === 'setup-1', 'Reduced group cannot continue');
  }
  results.push({legacyGroupsPreserved:true,eightPlayerLimit:true});
  await seed({language:'fr',names:['Zoé','Noé'],category:'animals',seconds:60,turns:1,jokers:2,muted:true});
  for (let i=0;i<4;i++) await p.locator('[data-action="setup-next"]').click();
  await p.locator('[data-action="start"]').click(); await p.clock.runFor(3100);
  await p.locator('[data-action="find-guesser"]').click(); await p.locator('[data-action="reveal"]').click();
  await p.locator('[data-bet="1"]').click(); await p.locator('[data-action="correct"]').click();
  await p.locator('#language-button').click(); await p.locator('[data-language="en"]').click();
  check(await p.locator('[data-action="confirm-language"]').isVisible(), 'Language restart confirmation missing');
  check(await p.locator('html').getAttribute('lang') === 'fr', 'Language changed before confirmation');
  await p.locator('[data-action="confirm-language"]').click();
  let game = await p.evaluate(() => JSON.parse(sessionStorage.getItem('pyramid-game-v1')));
  check(game.language === 'en' && game.history.length === 0 && game.index === 0 && game.players.every(p=>p.guessing===0&&p.telling===0&&p.jokersUsed===0), 'Restart retained progress or wrong language');
  check(game.players.map(p=>p.name).join() === 'Zoé,Noé' && game.category === 'animals' && game.seconds === 60 && game.turns === 1 && game.jokers === 2, 'Restart changed settings');
  await p.clock.runFor(3100); await p.locator('[data-action="find-guesser"]').click(); await p.locator('[data-action="reveal"]').click();
  game = await p.evaluate(() => JSON.parse(sessionStorage.getItem('pyramid-game-v1')));
  check(await p.evaluate(word => PyramidWords.animals.includes(word),game.current.word), 'Restart used old language deck');
  await p.locator('#language-button').click(); await p.locator('[data-language="fr"]').click();
  await p.clock.runFor(60100);
  check(!await p.locator('#modal').evaluate(el=>el.open), 'Expired confirmation remained open');
  check(await p.locator('#app').getAttribute('data-screen') === 'recap', 'Confirmation paused timer');
  results.push({languageRestartResetsScores:true,preservesNamesAndSettings:true,newDeckLanguage:true,timerContinuesDuringConfirmation:true});
  // Restore an older 10-player game with a balanced one-cycle schedule.
  await p.evaluate(() => {
    const names=Array.from({length:10},(_,i)=>'Player '+(i+1));
    const game=PyramidEngine.createGame(names.slice(0,8),'global',30,PyramidWords.global,Math.random,1,1);
    const template=game.players[0];
    game.players=names.map((name,id)=>({...template,name,id}));
    game.schedule=names.map((_,teller)=>({teller,guesser:(teller+1)%10,cycle:1}));
    game.phase='handoff';game.language='en';
    window.name='pyramid-check:'+JSON.stringify({game,preferences:{language:'en',names,category:'global',seconds:30,turns:6,jokers:1}});
  });
  await p.reload();
  for(let i=0;i<10;i++) {
    await p.locator('[data-action="find-guesser"]').click(); await p.clock.runFor(3100);
    await p.locator('[data-action="reveal"]').click(); await p.locator('[data-bet="1"]').click(); await p.locator('[data-action="correct"]').click();
    await p.locator('[data-action="next"]').click(); if(i<9)await p.clock.runFor(3100);
  }
  check(await p.locator('#app').getAttribute('data-screen') === 'finished', 'Legacy game cannot finish');
  await p.locator('[data-action="play-again"]').click();
  check(await p.locator('#app').getAttribute('data-screen') === 'setup-0' && await p.locator('input[data-player]').count() === 10, 'Legacy restart did not request smaller group');
  results.push({legacyGameFinishes:true,legacyReplayRequiresReduction:true});
  check(!errors.length, errors.join('|')); await context.close();
  const installed=await browser.newContext({serviceWorkers:'block'}),q=await installed.newPage();
  await q.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));
  await q.goto('http://127.0.0.1:4173/'); await q.locator('#about-button').click();
  check(await q.locator('[data-action="install"]').count() === 0, 'Standalone app offers installation');
  await installed.close(); results.push({standaloneHidesInstall:true});
  return results;
}
