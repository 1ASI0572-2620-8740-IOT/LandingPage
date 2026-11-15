const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname, '..');
(async()=>{
 const server=http.createServer((req,res)=>{const f=root+(req.url==='/'?'/index.html':req.url);try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f))}catch{res.writeHead(404).end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 const page=await browser.newPage();let calls=0,handler;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{if(route.request().url().startsWith('http://127.0.0.1'))return route.continue();if(route.request().url().startsWith('https://formspree.io/f/')){calls++;return handler(route)}return route.abort()});
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base);
 assert.equal(await page.locator('#contact-form').count(),1);
 for (const file of ['index.html','script.js','styles.css','i18n.js','terms.html']) assert.equal(fs.readFileSync(root+'/'+file,'utf8').includes('@gmail.com'),false,'Personal Gmail must not be published: '+file);
 assert.equal(await page.locator('#contact-form').getAttribute('data-formspree-endpoint'),'https://formspree.io/f/moedeady');
 async function fresh(){await page.goto(base);await page.evaluate(()=>{document.querySelector('#contact-form').dataset.formspreeEndpoint='https://formspree.io/f/testonly';window.HydroGuardI18n && document.querySelector('#language').dispatchEvent(new Event('change'))})}
 async function fill(){await page.locator('[name=name]').fill(' Andrea ');await page.locator('[name=email]').fill('andrea@example.com');await page.locator('[name=message]').fill(' Consulta ')}
 async function submit(){await page.locator('#contact-form').evaluate(f=>f.requestSubmit())}
 async function done(){await page.waitForFunction(()=>!document.querySelector('#contact-form button').disabled)}
 async function test(name,fn){await fresh();calls=0;await fn();console.log('PASS '+name)}
 await test('empty / whitespace / invalid email: no requests',async()=>{await submit();assert.equal(calls,0);await fill();await page.locator('[name=name]').fill('   ');await submit();assert.equal(calls,0);await fill();await page.locator('[name=email]').fill('bad');await submit();assert.equal(calls,0);await fill();await page.locator('[name=message]').fill('   ');await submit();assert.equal(calls,0)});
 await test('missing endpoint: preserves values / no requests',async()=>{await fill();await page.locator('#contact-form').evaluate(f=>f.dataset.formspreeEndpoint='');await submit();assert.equal(calls,0);assert.match(await page.locator('.form-message').textContent(),/unavailable/);assert.equal(await page.locator('[name=message]').inputValue(),' Consulta ')});
 await test('accepted response: trimmed payload / reset',async()=>{handler=async r=>{assert.deepEqual(r.request().postDataJSON(),{name:'Andrea',email:'andrea@example.com',message:'Consulta'});await r.fulfill({json:{ok:true}})};await fill();await submit();await done();assert.equal(calls,1);assert.equal(await page.locator('[name=name]').inputValue(),'');assert.equal(await page.locator('.form-message').getAttribute('data-state'),'success')});
 for(const status of [400,422,429,500])await test('HTTP '+status+' preserves fields and permits retry',async()=>{handler=r=>r.fulfill({status,json:{errors:[{message:'<script>bad</script>'}]}});await fill();await submit();await done();assert.equal(await page.locator('[name=message]').inputValue(),' Consulta ');assert.equal(await page.locator('.form-message').getAttribute('data-state'),'error');handler=r=>r.fulfill({json:{ok:true}});await submit();await done();assert.equal(calls,2);assert.equal(await page.locator('.form-message').getAttribute('data-state'),'success')});
 for(const mode of ['reject','json','unconfirmed'])await test(mode+' never false success',async()=>{handler=r=>mode==='reject'?r.abort():mode==='json'?r.fulfill({body:'invalid',contentType:'application/json'}):r.fulfill({json:{ok:false}});await fill();await submit();await done();assert.equal(await page.locator('.form-message').getAttribute('data-state'),'error');assert.equal(await page.locator('[name=name]').inputValue(),' Andrea ')});
 for (const result of [{ok:true,next:'/thanks'}, {success:true}]) await test('HTTP acceptance with supported affirmative markers: '+JSON.stringify(result), async()=>{
   handler=r=>r.fulfill({json:result});await fill();await submit();await done();
   assert.equal(await page.locator('.form-message').getAttribute('data-state'),'success');
   assert.equal(await page.locator('[name=message]').inputValue(),'');
 });
 const rejectedBodies = [
   {success:false}, {errors:[{message:'Rejected'}]}, null, [], {}, 'accepted', 42,
   {next:'/thanks'}, {ok:'true'}, {success:'true'}, {ok:true,success:false},
   {ok:true,error:'Rejected'}, {ok:true,errors:['Rejected']}, {ok:true,status:'error'},
   {ok:true,unknown:true}, {ok:true,next:42}, {ok:true,next:'javascript:alert(1)'}
 ];
 const rejectedGroups = [rejectedBodies.slice(0,4), rejectedBodies.slice(4,8), rejectedBodies.slice(8,12), rejectedBodies.slice(12)];
 for (const [group, bodies] of rejectedGroups.entries()) await test('HTTP 200 rejects invalid bodies, group '+(group+1), async()=>{
   for (const result of bodies) {
     handler=r=>r.fulfill({contentType:'application/json',body:JSON.stringify(result)});await fill();await submit();await done();
     assert.equal(await page.locator('.form-message').getAttribute('data-state'),'error',JSON.stringify(result));
     assert.equal(await page.locator('[name=message]').inputValue(),' Consulta ');
   }
 });
 await test('double submit and language switch during request',async()=>{let release;handler=async r=>{await new Promise(resolve=>release=resolve);await r.fulfill({json:{ok:true}})};await fill();await submit();await page.waitForFunction(()=>document.querySelector('button[type=submit]').disabled);await submit();await page.locator('#language').selectOption('es-419');assert.equal(await page.locator('#contact-submit-label').textContent(),'Enviando…');assert.equal(await page.locator('[name=name]').inputValue(),' Andrea ');while(!release)await new Promise(r=>setTimeout(r,10));assert.equal(calls,1);release();await done();assert.match(await page.locator('.form-message').textContent(),/recibió/);await page.locator('#language').selectOption('en-US');assert.match(await page.locator('.form-message').textContent(),/received/)});
 await test('labels, live status, keyboard and responsive',async()=>{assert.equal(await page.locator('.form-message').getAttribute('role'),'status');assert.equal(await page.locator('.form-message').getAttribute('aria-live'),'polite');assert.equal(await page.getByLabel('Full name').count(),1);await page.getByLabel('Full name').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('[name=email]').evaluate(e=>e===document.activeElement),true);for(const width of [320,375,768,1280]){await page.setViewportSize({width,height:900});console.log('viewport',width,await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth})));const box=await page.locator('#contact-form').boundingBox();console.log('contact bounds',width,box);assert(box.width>0 && box.x>=0 && box.x+box.width<=width+1)}});

 for (const mode of ['disabled', 'early-error']) {
   const context = await browser.newContext({javaScriptEnabled: mode !== 'disabled'});
   const unsafePage = await context.newPage();
   const requests = [], failures = [];
   // Count submissions and navigations, not delayed images or fonts.
   unsafePage.on('request', r => {
     if (r.isNavigationRequest() || r.method() === 'POST' || r.url().startsWith('https://formspree.io/')) requests.push(r.url());
   });
   unsafePage.on('pageerror', e => failures.push(e.message));
   await unsafePage.route('**/*', route => {
     const url = route.request().url();
     if (mode === 'early-error' && url === base + '/script.js')
       return route.fulfill({contentType:'text/javascript', body:'throw new Error("Test: initialization interrupted");'});
     return url.startsWith(base) ? route.continue() : route.abort();
   });
   await unsafePage.goto(base);
   await unsafePage.locator('[name=name]').fill('Private name');
   await unsafePage.locator('[name=email]').fill('private@example.com');
   await unsafePage.locator('[name=message]').fill('Private message');
   assert.equal(await unsafePage.locator('button[type=submit]').isDisabled(), true);
   const start = requests.length;
   for (const name of ['name', 'email', 'message']) {
     await unsafePage.locator('[name='+name+']').press('Enter');
     await unsafePage.waitForTimeout(100);
     assert.equal(unsafePage.url(), base + '/');
     assert.equal(requests.length, start);
   }
   await unsafePage.locator('button[type=submit]').evaluate(b => b.click());
   await unsafePage.waitForTimeout(100);
   assert.equal(requests.length, start);
   assert.equal(unsafePage.url(), base + '/');
   if (mode === 'disabled') assert.equal(await unsafePage.locator('noscript p').isVisible(),true);
   else assert(failures.some(x => x.includes('initialization interrupted')));
   await context.close();
   console.log('PASS '+mode+': disabled button and Enter never transmit or navigate');
 }
 await test('normal Enter uses registered handler without native GET', async()=>{
   handler=r=>r.fulfill({json:{ok:true}});
   await fill();
   const original=page.url();
   await page.locator('[name=email]').press('Enter');
   await done();
   assert.equal(calls,1);
   assert.equal(page.url(),original);
   assert.equal(await page.locator('.form-message').getAttribute('data-state'),'success');
 });
 await test('20-second timeout: clock-controlled abort and recovery', async()=>{
   await page.clock.install({time: new Date('2026-11-15T12:00:00Z')});
   await page.clock.pauseAt(new Date('2026-11-15T12:00:01Z'));
   handler=()=>{}; // Intentionally leave the request unanswered until AbortController cancels it.
   await fill();
   await submit();
   await page.clock.runFor(19999);
   assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
   assert.equal(await page.locator('.form-message').getAttribute('data-state'),'sending');
   await page.clock.runFor(1);
   await done();
   assert.equal(calls,1);
   assert.equal(await page.locator('.form-message').getAttribute('data-state'),'error');
   assert.equal(await page.locator('[name=name]').inputValue(),' Andrea ');
   assert.equal(await page.locator('[name=message]').evaluate(e=>e.readOnly),false);
   await page.clock.resume();
 });
 await page.goto(base+'/terms.html');await page.locator('#language').selectOption('es-419');assert.match(await page.locator('#contact-privacy').textContent(),/Formspree/);assert.equal((await page.locator('body').innerText()).includes('@gmail.com'),false);assert.equal(errors.length,0);console.log('PASS terms translation / no browser JS errors');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
