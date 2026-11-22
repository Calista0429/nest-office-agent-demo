// Capture real UI flows against an isolated database. Never modifies .data/office.sqlite.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(process.env.NEST_DEPENDENCIES?join(resolve(process.env.NEST_DEPENDENCIES),'_resolver.cjs'):import.meta.url);
const {chromium}=require('playwright-core');
const directory=resolve('docs/screenshots');
const temp=await mkdtemp(join(tmpdir(),'nest-screenshots-'));
const port=Number(process.env.NEST_SCREENSHOT_PORT||4187);
let browser,server;
const errors=[],captures=[];
try{
 browser=await chromium.launch({headless:true,...(process.env.NEST_BROWSER_PATH?{executablePath:process.env.NEST_BROWSER_PATH}:{})});
 server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),NEST_DB_PATH:join(temp,'office.sqlite')},stdio:['ignore','pipe','pipe']});
 let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
 await new Promise((resolveReady,reject)=>{
  const deadline=Date.now()+10000;
  const interval=setInterval(()=>{if(log.includes('NEST office demo:')){clearInterval(interval);resolveReady();}else if(server.exitCode!==null||Date.now()>deadline){clearInterval(interval);reject(new Error('Preview server did not start: '+log));}},100);
 });
 await mkdir(directory,{recursive:true});
 const context=await browser.newContext({viewport:{width:1600,height:1050},deviceScaleFactor:1,locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const base=`http://127.0.0.1:${port}`;
 async function capture(file,title){
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:join(directory,file),fullPage:true,animations:'disabled'});
  captures.push({file,title});console.log('Captured:',file);
 }
 async function send(text){
  await page.locator('textarea').fill(text);await page.locator('form button[type=submit]').click();
  await page.locator('.recommendation-card:not(.stale)').first().waitFor();
  await page.locator('.assistant-thinking').waitFor({state:'hidden'});
 }
 async function confirm(){
  await page.locator('.recommendation-card:not(.stale) .primary-button').first().click();
  await page.locator('.message.success').last().waitFor();
  await page.locator('.assistant-thinking').waitFor({state:'hidden'});
 }
 await page.goto(base,{waitUntil:'networkidle'});
 await page.getByText('22 席が予約可能',{exact:true}).waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'ja');
 await capture('01-ja-office-map.png','日本語のオフィスマップ / Japanese office map');
 await page.getByRole('button',{name:/^A02 /}).click();
 await page.getByRole('button',{name:'この席を予約',exact:true}).click();
 await page.locator('.recommendation-card:not(.stale)').first().waitFor();
 await capture('02-ja-map-selection.png','座席を選び、候補を確認 / Select a desk');
 await confirm();
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'自分の予約',exact:true}).click();
 await page.locator('.booking-row').waitFor();
 assert.equal(await page.locator('.booking-row').count(),1);
 await capture('03-ja-saved-booking.png','保存と再読み込み / Persistent booking');
 await page.getByRole('button',{name:'変更',exact:true}).click();
 await send('明日の午後に変更');
 await confirm();
 await page.getByRole('button',{name:'自分の予約',exact:true}).click();
 assert.match(await page.locator('.booking-row').innerText(),/13:00–18:00/);
 await capture('04-ja-reschedule.png','既存予約の日時を変更 / Reschedule');
 await page.getByRole('button',{name:'予約をキャンセル',exact:true}).click();
 await page.locator('.empty-state').waitFor();
 await capture('05-ja-cancellation.png','予約をキャンセル / Cancellation');
 await page.getByRole('button',{name:'オフィスマップ',exact:true}).click();
 await send('来週水曜日9時から18時、私と田中さんと佐藤さんの3人で隣同士の席を予約。モニター必須、できれば窓際。');
 assert.match(await page.locator('.proposal-meta').last().innerText(),/3 人/);
 await capture('06-ja-team-proposal.png','自然言語で3人の隣接席を提案 / Adjacent team desks');
 await page.getByRole('button',{name:'デモ設定',exact:true}).click();
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'デモ設定',exact:true}).click();
 await page.locator('.recommendation-card:not(.stale) .primary-button').first().click();
 await page.locator('.message.conflict').waitFor();
 await page.locator('.assistant-thinking').waitFor({state:'hidden'});
 await page.locator('.message.conflict').scrollIntoViewIfNeeded();
 await capture('07-ja-conflict-recovery.png','競合時に代替案を提案 / Conflict recovery');
 await confirm();
 await page.getByRole('button',{name:'自分の予約',exact:true}).click();
 assert.equal(await page.locator('.booking-row').count(),1);
 await capture('08-ja-team-booking.png','全員分をまとめて確定 / Atomic team booking');
 await page.getByRole('combobox',{name:'表示言語'}).selectOption('en');
 await page.getByRole('button',{name:'My bookings',exact:true}).waitFor();
 assert.match(await page.locator('.booking-row').innerText(),/You, Tanaka, Sato/);
 await capture('09-en-bookings.png','英語へ切り替え / English bookings');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 await page.getByRole('button',{name:'My bookings',exact:true}).click();
 await page.getByRole('button',{name:'Cancel booking',exact:true}).click();
 await page.locator('.empty-state').waitFor();
 await page.getByRole('button',{name:'Office map',exact:true}).click();
 await send('Find a window desk with a monitor tomorrow morning');
 await capture('10-en-natural-language.png','英語で自然言語予約 / English natural-language request');
 await page.getByRole('button',{name:'People',exact:true}).click();
 await page.getByRole('heading',{name:'Tanaka',exact:true}).waitFor();
 await capture('11-en-people.png','メンバーの位置 / Locate teammates');
 const mobile=await context.newPage();
 await mobile.setViewportSize({width:390,height:844});
 await mobile.goto(base,{waitUntil:'networkidle'});
 await mobile.getByText('22 desks available',{exact:true}).waitFor();
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 assert.equal(overflow,false,'Mobile document should not overflow horizontally');
 await mobile.screenshot({path:join(directory,'12-en-mobile.png'),fullPage:true,animations:'disabled'});
 captures.push({file:'12-en-mobile.png',title:'モバイル表示 / Mobile layout'});
 await mobile.close();
 await page.goto(pathToFileURL(resolve('docs/architecture.html')).href,{waitUntil:'networkidle'});
 await capture('13-architecture.png','プロジェクト構成図 / Project architecture');
 assert.deepEqual(errors,[],'No browser runtime errors');
 await writeFile(join(directory,'capture-manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),browser:browser.version(),viewport:{width:1600,height:1050},database:'isolated temporary SQLite',captures,checks:['Japanese default','English switch and reload persistence','single booking survives reload','reschedule and cancellation','group adjacency request','conflict recovery','atomic group confirmation','English names','mobile overflow','no browser runtime errors']},null,2)+'\n');
 await import('./update-gallery.mjs');
 console.log(`Verified UI flows and saved ${captures.length} real screenshots to docs/screenshots.`);
}finally{
 if(browser)await browser.close();
 if(server&&server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill('SIGTERM');await stopped;}
 await rm(temp,{recursive:true,force:true});
}
