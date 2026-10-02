// Playwright CLI run-code scenario. Simulates safe-area and viewport reports;
// these checks do not replace testing on physical iOS devices.
async page => {
  const results=[];
  const cases=[
    ['iphone-covered',393,852,59,34,0,93,true],
    ['iphone-system-statusbar',393,793,0,34,0,0,true],
    ['iphone-browser',393,659,0,0,0,0,false],
    ['iphone-landscape',852,393,0,21,59,21,true],
    ['small-phone',320,568,0,0,0,0,false],
    ['ipad-mini',744,1133,24,20,0,44,true],
    ['ipad-landscape',1133,744,24,20,0,44,true],
    ['laptop',1366,768,0,0,0,0,false]
  ];
  for(const [device,width,height,top,bottom,side,missing,standalone] of cases)for(const language of ['en','fr']){
    const c=await page.context().browser().newContext({viewport:{width,height},isMobile:width<1200,hasTouch:true,locale:language,serviceWorkers:'block',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(({top,bottom,side,missing,standalone})=>{
      const height=innerHeight;
      Object.defineProperty(navigator,'standalone',{get:()=>standalone});
      Object.defineProperty(window,'innerHeight',{get:()=>height-missing});
      document.addEventListener('DOMContentLoaded',()=>{
        const style=document.createElement('style');style.textContent=`:root{--safe-area-top:${top}px;--safe-area-bottom:${bottom}px}#modal{--modal-left:${Math.max(16,side)}px;--modal-right:${Math.max(16,side)}px}`;document.head.append(style);
      });
      if(window.name.startsWith('modal-qa:'))sessionStorage.setItem('pyramid-game-v1',window.name.slice(9));
    },{top,bottom,side,missing,standalone});
    await p.goto('http://127.0.0.1:4173/');await p.evaluate(()=>document.fonts.ready);
    const inspect=async(label,mustScroll=false)=>{
      const measure=()=>p.evaluate(()=>{
        const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
        const modal=document.querySelector('#modal'),body=modal.querySelector('.modal-body'),button=modal.querySelector('[data-action="close-modal"]');
        const rect=button.getBoundingClientRect();
        return {dialog:box(modal),close:box(button),scrollHeight:body.scrollHeight,clientHeight:body.clientHeight,scrollTop:body.scrollTop,hit:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('button')===button,outerScroll:modal.scrollTop};
      });
      const before=await measure();
      if(before.dialog.top<top+23||before.dialog.bottom>height-bottom-23||before.dialog.left<Math.max(16,side)-1||before.dialog.right>width-Math.max(16,side)+1||before.close.width<44||before.close.height<44||!before.hit)throw Error(JSON.stringify({device,language,label,before}));
      await p.locator('.modal-body').evaluate(e=>e.scrollTop=e.scrollHeight);
      const after=await measure();
      if(after.close.top!==before.close.top||!after.hit||after.outerScroll!==0)throw Error('Close moved or hidden: '+JSON.stringify({device,language,label,after}));
      if(mustScroll&&after.scrollTop<1)throw Error('Long content cannot scroll: '+device);
      if(device==='iphone-covered'&&label==='rules')await p.screenshot({path:`/Users/renandeswarte/Desktop/Renan/Pyramid Game/output/playwright/modal-fixed-${language}.png`});
      await p.locator('#modal [data-action="close-modal"]').tap();
      if(await p.locator('#modal').evaluate(e=>e.open))throw Error('Close tap did not work');
      results.push({device,language,label,top:before.dialog.top,bottom:before.dialog.bottom,scrolled:after.scrollTop});
    };
    await p.locator('#rules-button').tap();await inspect('rules',true);
    await p.locator('#about-button').tap();await inspect('about');
    await p.locator('#about-button').tap();await p.locator('[data-action="sources"]').tap();await inspect('sources');
    await p.locator('#language-button').tap();await inspect('languages');
    if(!standalone){await p.locator('#about-button').tap();await p.locator('#modal [data-action="install"]').tap();await inspect('install');}
    // The longest game history uses the same scroll container and fixed close target.
    await p.evaluate(language=>{
      const E=PyramidEngine,g=E.createGame(Array.from({length:8},(_,i)=>'Player '+i),'global',30,PyramidWords.global,Math.random,7,1);g.language=language;
      while(g.phase!=='finished'){g.phase='ready';E.beginBetting(g);E.bet(g,1);E.attempt(g,true);E.next(g);}
      window.name='modal-qa:'+JSON.stringify(g);
    },language);
    await p.reload();await p.locator('[data-action="history"]').tap();await inspect('history',true);
    if(device==='iphone-covered') {
      await p.locator('#rules-button').tap();
      await p.setViewportSize({width:852,height:393});
      await p.evaluate(()=>{const root=document.documentElement,modal=document.querySelector('#modal');root.style.setProperty('--safe-area-top','0px');root.style.setProperty('--safe-area-bottom','21px');modal.style.setProperty('--modal-left','59px');modal.style.setProperty('--modal-right','59px');});
      await p.locator('.modal-body').evaluate(e=>e.scrollTop=e.scrollHeight);
      const bounds=await p.locator('#modal').boundingBox();
      if(bounds.y<23||bounds.y+bounds.height>349||bounds.x<58||bounds.x+bounds.width>794)throw Error('Rotated dialog escaped safe area');
      await p.locator('#modal [data-action="close-modal"]').tap();
      if(await p.locator('#modal').evaluate(e=>e.open))throw Error('Cannot close after rotation');
      results.push({device,language,label:'rotation'});
    }
    if(errors.length)throw Error(errors.join('|'));await c.close();
  }
  return {checks:results.length,results};
}
