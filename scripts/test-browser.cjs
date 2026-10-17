const {chromium}=require('playwright');
const fs=require('node:fs');
const evidence=process.argv[3]||require('node:path').join(require('node:os').tmpdir(),'cv-browser-qa');
fs.mkdirSync(evidence,{recursive:true});
const origin=(process.argv[2]||'http://127.0.0.1:4173').replace(/\/$/,'');
const report={checks:[],failures:[],viewports:[]};
let browser;
function check(name,actual){report.checks.push({name,pass:!!actual});if(!actual)report.failures.push(name);}
(async()=>{
browser=await chromium.launch({channel:'chrome',headless:true});
for(const width of [1440,1920,768,390,320]){
 const page=await browser.newPage({viewport:{width,height:900},locale:'es-AR',deviceScaleFactor:1});
 const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push([r.url(),r.status()]);});
 await page.goto(origin+'/',{waitUntil:'networkidle'});await page.waitForTimeout(2800);
 await page.screenshot({path:evidence+`/after-${width}.png`});
 const state=await page.evaluate(()=>({title:document.title,lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth,h1:[...document.querySelectorAll('.hero__line')].map(e=>({opacity:getComputedStyle(e).opacity,text:e.textContent})),fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+'/'+f.weight),image:document.images[0].currentSrc,schemas:[...document.querySelectorAll('[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent)),triggers:window.ScrollTrigger?.getAll().length}));
 check(width+' identity',state.title.startsWith('Cosme Argerich')&&state.lang==='es');check(width+' H1 visible',state.h1.every(h=>h.opacity==='1'));check(width+' no overflow',!state.overflow);
 await page.locator('.translate-en-btn').click();check(width+' English',await page.locator('html').getAttribute('lang')==='en'&&await page.locator('[data-i18n="nav_profile"]').textContent()==='Profile');
 check(width+' canvas aria translated',(await page.locator('#signal-canvas').getAttribute('aria-label')).includes('Move the probe'));
 await page.reload({waitUntil:'networkidle'});check(width+' persisted English',await page.locator('html').getAttribute('lang')==='en');
 await page.goto(origin+'/?lang=es',{waitUntil:'networkidle'});check(width+' URL overrides storage',await page.locator('html').getAttribute('lang')==='es');
 if(width<=780){await page.locator('.nav__toggle').click();const box=await page.locator('.nav__links').boundingBox();check(width+' mobile overlay',box.height>=899);await page.locator('.nav__links a[href="#profile"]').click();await page.waitForTimeout(1200);check(width+' mobile menu closes',await page.locator('.nav__toggle').getAttribute('aria-expanded')==='false');}
 else {
  const range=await page.evaluate(()=>{const s=ScrollTrigger.getAll().find(s=>s.trigger.id==='projects');return {start:s.start,end:s.end};});
  await page.evaluate(r=>window.scrollTo({top:r.start+(r.end-r.start)/2,behavior:'instant'}),range);await page.waitForTimeout(1600);
  const progress=await page.evaluate(()=>({x:gsap.getProperty('.projects__track','x'),scale:gsap.getProperty('.projects__progress span','scaleX'),active:document.querySelector('.nav__links a.is-active')?.getAttribute('href')}));
  check(width+' horizontal pin',progress.x < -500&&Math.abs(progress.scale-.5)<.05&&progress.active==='#projects');
  await page.mouse.move(500,300);check(width+' cursor',await page.locator('.cursor').evaluate(e=>getComputedStyle(e).opacity==='1'));
 }
 check(width+' console and resources',errors.length===0&&missing.length===0);report.viewports.push({width,state,errors,missing});await page.close();
}
// Instrument only this isolated test page to count renders and locate canvas nodes.
const game=await browser.newPage({viewport:{width:1440,height:900},locale:'es-AR'});
await game.addInitScript(()=>{window.draws=0;window.nodes=[];const clear=CanvasRenderingContext2D.prototype.clearRect,arc=CanvasRenderingContext2D.prototype.arc;CanvasRenderingContext2D.prototype.clearRect=function(...a){window.draws++;window.nodes=[];return clear.apply(this,a)};CanvasRenderingContext2D.prototype.arc=function(x,y,r,...a){if(r===6)window.nodes.push({x,y});return arc.call(this,x,y,r,...a)}});
await game.goto(origin+'/?lang=en',{waitUntil:'networkidle'});await game.waitForTimeout(1000);
check('Signal Lab does no work before entering',await game.evaluate(()=>window.draws)===0);
await game.locator('#signal-canvas').scrollIntoViewIfNeeded();await game.waitForTimeout(600);
check('Signal Lab renders when visible',await game.evaluate(()=>window.draws)>0);
await game.locator('#signal-reset').click();await game.waitForTimeout(300);
await game.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await game.waitForTimeout(300);const count=await game.evaluate(()=>window.draws),time=Number(await game.locator('#signal-time').textContent());await game.waitForTimeout(1600);
check('Signal Lab pauses offscreen',await game.evaluate(()=>window.draws)===count);
await game.locator('#signal-canvas').scrollIntoViewIfNeeded();await game.waitForTimeout(250);const resumed=Number(await game.locator('#signal-time').textContent());check('Signal Lab preserves remaining time',time-resumed<.6);
await game.locator('#signal-reset').click();await game.locator('#signal-canvas').focus();await game.keyboard.down('ArrowRight');await game.waitForTimeout(220);await game.keyboard.up('ArrowRight');check('Signal Lab keyboard starts game',(await game.locator('#signal-status').textContent()).includes('LEVEL 1'));
await game.locator('#signal-reset').click();
await game.waitForTimeout(50);
for(let level=1;level<=3;level++){
 await game.waitForFunction(n=>document.querySelector('#signal-level').textContent===String(n).padStart(2,'0')+'/03',level);
 await game.waitForTimeout(50);
 const nodeCount=level+2;
 for(let n=0;n<nodeCount;n++){
  const target=await game.evaluate(()=>window.nodes[0]);if(!target)break;
  const box=await game.locator('#signal-canvas').boundingBox();await game.mouse.move(box.x+target.x,box.y+target.y);
  try { await game.waitForFunction(previous=>Number(document.querySelector('#signal-score').textContent.split('/')[0])>previous,n,{timeout:2000}); }
  catch(error){await game.screenshot({path:evidence+'/game-failure.png'});console.log({level,n,target,box,state:await game.evaluate(()=>({nodes:window.nodes,score:document.querySelector('#signal-score').textContent,status:document.querySelector('#signal-status').textContent,scroll:scrollY}))});throw error;}
  await game.waitForTimeout(50);
 }
 if(level<3)await game.waitForTimeout(1700);
}
check('Signal Lab all three levels playable',(await game.locator('#signal-status').textContent()).includes('YOU WIN'));
await game.locator('.translate-es-btn').click();check('Signal Lab win message switches language',(await game.locator('#signal-status').textContent()).includes('¡GANASTE!'));
await game.locator('#signal-reset').click();await game.waitForTimeout(5200);check('Signal Lab timer and loss',(await game.locator('#signal-status').textContent()).includes('PERDISTE'));
await game.screenshot({path:evidence+'/signal-lab.png'});await game.close();
for(const scenario of ['no-js','gsap-blocked','scrolltrigger-blocked','reduced','storage-blocked']){
 const page=await browser.newPage({viewport:{width:1440,height:900},locale:'en-US',javaScriptEnabled:scenario!=='no-js',reducedMotion:scenario==='reduced'?'reduce':'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(scenario==='gsap-blocked')await page.route('**/gsap.min.js',r=>r.abort());
 if(scenario==='scrolltrigger-blocked')await page.route('**/ScrollTrigger.min.js',r=>r.abort());
 if(scenario==='storage-blocked')await page.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw new Error('Storage disabled')};});
 await page.goto(origin+'/',{waitUntil:'networkidle'});await page.waitForTimeout(2400);
 check(scenario+' readable',await page.locator('h1').isVisible());check(scenario+' console',errors.length===0);
 if(scenario==='no-js'||scenario==='reduced'||scenario.includes('blocked')&&scenario!=='storage-blocked')check(scenario+' projects accessible',await page.locator('.projects').evaluate(e=>getComputedStyle(e).overflowX==='auto'));
 if(scenario==='reduced')check('reduced no motion',!await page.locator('body').evaluate(e=>e.classList.contains('motion-on')));
 if(scenario==='storage-blocked')check('language works without storage',await page.locator('html').getAttribute('lang')==='en');
 if(scenario!=='no-js'){await page.keyboard.press('Tab');check(scenario+' keyboard skip link',await page.locator('.skip-link').evaluate(e=>e===document.activeElement));}
 await page.screenshot({path:evidence+'/'+scenario+'.png'});await page.close();
}
// High-density selection must not blindly choose a 390px source for a cropped photo.
const dense=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,locale:'es-AR'});await dense.goto(origin+'/',{waitUntil:'networkidle'});check('DPR3 hero retains full master resolution',(await dense.locator('.hero__media img').evaluate(e=>e.currentSrc)).includes('1672'));await dense.close();
await browser.close();fs.writeFileSync(evidence+'/qa-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,failures:report.failures},null,2));
if(report.failures.length)process.exitCode=1;
})().catch(async error=>{report.failures.push(error.stack);fs.writeFileSync(evidence+'/qa-results.json',JSON.stringify(report,null,2));console.error(error);await browser?.close();process.exitCode=1;});
