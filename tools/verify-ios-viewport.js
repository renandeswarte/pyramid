// Playwright CLI run-code scenario. Serve this project at http://127.0.0.1:4173/.
// Simulates reported iOS safe-area height discrepancies; not a physical-device test.
async page => {
 const results=[];
 const cases=[
 ['iphone-reduced-top',393,852,59,34,59,true],['iphone-reduced-both',393,852,59,34,93,true],['iphone-correct-height',393,852,59,34,0,true],
 ['iphone-system-statusbar',393,793,0,34,0,true],['iphone-landscape',852,393,0,21,21,true],
 ['ipad',744,1133,24,20,44,true],['safari',393,659,0,0,0,false],['laptop',1366,768,0,0,0,false]];
 for(const [name,width,height,top,bottom,missing,standalone] of cases){
 const c=await page.context().browser().newContext({viewport:{width,height},isMobile:width<1000,hasTouch:width<1000,serviceWorkers:'block',reducedMotion:'reduce'}),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(({top,bottom,missing,standalone})=>{
 const actualHeight=innerHeight;window.qaVisibleHeight=actualHeight-top-bottom;
 Object.defineProperty(navigator,'standalone',{get:()=>standalone});
 Object.defineProperty(window,'innerHeight',{get:()=>actualHeight-missing});
 Object.defineProperty(visualViewport,'height',{get:()=>window.qaVisibleHeight});
 document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=`:root{--safe-area-top:${top}px}.app-shell{padding-top:${top+(innerWidth<=1024?5:0)}px;padding-bottom:${bottom}px}.keyboard-open .app-shell{padding-bottom:0}`;document.head.append(s)});
 },{top,bottom,missing,standalone});
 await p.goto('http://127.0.0.1:4173/');
 for(let i=0;i<4;i++)await p.locator(`[data-player="${i}"]`).fill(['Alice','Bob','Camille','Dan'][i]);
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 for(let step=0;step<5;step++){
 await settle();const m=await p.evaluate(()=>{const pane=document.querySelector('.setup-body'),nav=document.querySelector('.setup-navigation').getBoundingClientRect();return {bodyHeight:document.body.clientHeight,inlineHeight:document.body.style.height,overflow:pane.scrollHeight-pane.clientHeight,navBottom:nav.bottom,screen:document.querySelector('#app').dataset.screen,covered:document.documentElement.classList.contains('ios-covered-viewport')};});
 if(m.bodyHeight!==height||m.inlineHeight||m.overflow>2||m.navBottom>height-bottom||m.navBottom<height-bottom-(width>700?110:60))throw Error(JSON.stringify({name,...m}));results.push({name,...m});
 if(step<4)await p.locator('[data-action="setup-next"]').click();
 }
 if(name==='iphone-reduced-top'){
 await p.locator('[data-action="setup-step"][data-step="0"]').click();for(let i=0;i<6;i++)await p.locator('[data-action="add-player"]').click();await p.locator('[data-player="9"]').focus();await p.evaluate(()=>{window.qaVisibleHeight=420;visualViewport.dispatchEvent(new Event('resize'))});await settle();
 const m=await p.evaluate(()=>({height:document.body.clientHeight,keyboard:document.body.classList.contains('keyboard-open'),nav:document.querySelector('.setup-navigation').getBoundingClientRect().bottom,field:document.activeElement.getBoundingClientRect().bottom,pane:document.querySelector('.setup-body').getBoundingClientRect().bottom}));
 if(m.height!==420||!m.keyboard||m.nav>420||m.field>m.pane+1)throw Error('Keyboard '+JSON.stringify(m));results.push({name,keyboard:m});
 await p.evaluate(()=>{window.qaVisibleHeight=759;document.activeElement.blur();visualViewport.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('pageshow'));});await settle();if(await p.evaluate(()=>document.body.clientHeight)!==852)throw Error('Height did not recover after keyboard');
 }
 if(errors.length)throw Error(errors.join());await c.close();
 }return {checks:results.length,results};
}
