// Playwright CLI run-code scenario; serve the project on port 4173.
async page => {
  const browser=page.context().browser(),results=[];
  const check=(value,message)=>{if(!value)throw Error(message)};
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR',serviceWorkers:'block',reducedMotion:'reduce'});
  const p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.missingMessages=[];Object.defineProperty(window,'PyramidI18n',{configurable:true,set(value){const original=value.text;value.text=function(language,key,values){if(language==='fr'&&!Object.hasOwn(this.fr,key))window.missingMessages.push(key);return original.call(this,language,key,values)};Object.defineProperty(window,'PyramidI18n',{value,configurable:true});}})});
  await p.clock.install();await p.goto('http://127.0.0.1:4173/');await p.evaluate(()=>document.fonts.ready);
  check(await p.locator('html').getAttribute('lang')==='fr','French browser detection');
  check((await p.locator('input[data-player]').evaluateAll(els=>els.map(e=>e.value))).every(v=>v===''),'Fresh names must be blank');
  await p.locator('[data-action="setup-next"]').click();check((await p.locator('#setup-error').innerText()).includes('Donnez'),'Validation not translated');
  await p.locator('[data-action="remove-player"]').click();await p.locator('[data-action="remove-player"]').click();
  await p.locator('[data-player="0"]').fill('Zoé');await p.locator('[data-player="1"]').fill('Noé');
  await p.locator('#rules-button').click();check((await p.locator('#modal-content').innerText()).includes('Le guide donne les indices'),'French rules');await p.locator('#modal [data-action="close-modal"]').click();
  await p.locator('#about-button').click();await p.locator('[data-action="sources"]').click();check((await p.locator('#modal-content').innerText()).includes('Morphalou'),'French sources');await p.locator('#modal [data-action="close-modal"]').click();
  await p.locator('[data-action="setup-next"]').click();await p.locator('[data-category="food"]').click();await p.locator('[data-action="setup-next"]').click();
  await p.locator('[data-action="time"][data-seconds="60"]').click();await p.locator('[data-action="setup-next"]').click();await p.locator('[data-jokers="2"]').click();await p.locator('[data-action="setup-next"]').click();await p.locator('[data-turns="1"]').click();await p.locator('#sound-button').click();
  const preferences=await p.evaluate(()=>JSON.parse(localStorage.getItem('pyramid-preferences-v2')));
  check(preferences.language==='fr'&&preferences.names.join()==='Zoé,Noé'&&preferences.category==='food'&&preferences.seconds===60&&preferences.jokers===2&&preferences.turns===1&&preferences.muted,'Preferences not saved');
  // A fresh tab has no session game but keeps device preferences.
  const q=await context.newPage();await q.goto('http://127.0.0.1:4173/');check(await q.locator('[data-player="0"]').inputValue()==='Zoé','Name not persisted to new session');check(await q.locator('html').getAttribute('lang')==='fr','Language not persisted');await q.close();
  await p.locator('[data-action="start"]').click();await p.clock.runFor(3100);await p.locator('[data-action="find-guesser"]').click();
  check(await p.locator('#app').getAttribute('data-screen')==='ready','Two-player guesser shuffle returned');await p.locator('[data-action="reveal"]').click();
  let before=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('pyramid-game-v1')));
  check(before.language==='fr'&&await p.evaluate(word=>PyramidWordsFr.food.includes(word),before.current.word),'Wrong French deck');
  await p.locator('#language-button').click();await p.locator('[data-language="en"]').click();await p.getByRole('button',{name:'Annuler',exact:true}).click();
  let after=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('pyramid-game-v1')));
  check(after.current.word===before.current.word&&after.current.deadline===before.current.deadline&&after.language==='fr','Switch reset word, timer, or language');
  check((await p.locator('.word-label').innerText()).includes('CUISINE'),'Cancel changed interface');
  await p.locator('[data-action="joker"]').click();after=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('pyramid-game-v1')));
  check(after.current.word!==before.current.word&&await p.evaluate(word=>PyramidWordsFr.food.includes(word),after.current.word),'Joker changed deck language');
  await p.locator('#language-button').click();await p.locator('[data-language="fr"]').click();check((await p.locator('.word-label').innerText()).includes('CUISINE'),'French category missing');
  await p.locator('[data-action="hide-word"]').click();check((await p.locator('.secret-word').innerText()).includes('révéler'),'Hidden word untranslated');await p.locator('[data-action="hide-word"]').click();
  await p.locator('[data-action="bet"][data-bet="2"]').click();await p.clock.runFor(60100);check((await p.locator('#app').innerText()).includes('ESSAI 2 SUR 2'),'Guess timeout failed');await p.locator('[data-action="correct"]').click();
  await p.locator('[data-action="scores"]').click();check((await p.locator('#modal-title').innerText())==='À la table','Score dialog untranslated');await p.locator('#modal [data-action="close-modal"]').click();
  await p.locator('[data-action="end-game"]').click();check((await p.locator('#modal-title').innerText()).includes('Terminer'),'End dialog untranslated');await p.getByRole('button',{name:'Continuer',exact:true}).click();
  await p.locator('[data-action="next"]').click();await p.clock.runFor(3100);await p.locator('[data-action="find-guesser"]').click();await p.locator('[data-action="reveal"]').click();
  // Refresh privacy must keep the original French deck and running deadline.
  check(!(await p.evaluate(()=>window.missingMessages)).length,'Missing translations before refresh');
  before=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('pyramid-game-v1')));await p.reload();check(await p.locator('[data-action="resume-word"]').isVisible(),'Refresh privacy missing');await p.locator('[data-action="resume-word"]').click();
  after=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('pyramid-game-v1')));check(before.current.deadline===after.current.deadline&&after.language==='fr','Refresh changed timer or language');
  await p.clock.runFor(60100);check((await p.locator('#app').innerText()).includes('Temps écoulé'),'Bet expiry untranslated');await p.locator('[data-action="next"]').click();
  check(await p.locator('#app').getAttribute('data-screen')==='finished','Full French game did not finish');
  const completed=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('pyramid-game-v1')));check(completed.history.length===2&&completed.players.every(x=>x.told===1&&x.guessed===1),'Role balance changed');
  await p.locator('[data-action="history"]').click();check((await p.locator('#modal-content').innerText()).includes('Remplacés'),'History replacement untranslated');await p.locator('#modal [data-action="close-modal"]').click();
  await p.locator('#language-button').click();await p.locator('[data-language="en"]').click();await p.locator('[data-action="play-again"]').click();
  check(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('pyramid-game-v1')).language)==='en','Next game not using selected language');
  const missing=await p.evaluate(()=>window.missingMessages);check(!missing.length,'Missing translations: '+missing.join('|'));check(!errors.length,errors.join('|'));
  results.push({preferences,fullFrenchGame:true,cancelPreservesGame:true,frenchJoker:true,guessAndBetTimeout:true,newGameLanguage:true});await context.close();
  // Storage denial must not block gameplay or language switching.
  const blocked=await browser.newContext({locale:'en-US',serviceWorkers:'block'}),b=await blocked.newPage();
  await b.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}}));await b.goto('http://127.0.0.1:4173/');
  await b.locator('[data-player="0"]').fill('Alice');await b.locator('#language-button').click();await b.locator('[data-language="fr"]').click();await b.reload();check(await b.locator('[data-player="0"]').inputValue()==='Alice','Session fallback lost name');check(await b.locator('html').getAttribute('lang')==='fr','Session fallback lost language');await blocked.close();results.push({storageBlockedFallback:true});
  return results;
}
