import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRequest} from '../lib/office.mjs';
const base={date:'2026-11-25',start:9,end:18,count:1,monitor:false,quiet:false,window:false,windowRequired:false,adjacent:false};
test('Japanese team request resolves date, names, equipment and soft preference',()=>{
 const r=parseRequest('来週水曜日9時から18時、私と田中さんと佐藤さんの3人で隣同士の席を予約。モニター必須、できれば窓際。',base,'2026-11-21');
 assert.equal(r.action,'search');assert.equal(r.date,'2026-11-25');assert.equal(r.count,3);assert.equal(r.monitor,true);assert.equal(r.window,true);assert.equal(r.windowRequired,false);assert.equal(r.adjacent,true);assert.deepEqual(r.names,['self','田中','佐藤']);
});
test('English request supports weekdays and am/pm ranges',()=>{const r=parseRequest('Book 3 adjacent desks next Wednesday from 9 am to 6 pm, monitors required, preferably by a window.',base,'2026-11-21');assert.equal(r.action,'search');assert.equal(r.date,'2026-11-25');assert.equal(r.start,9);assert.equal(r.end,18);assert.equal(r.count,3);assert.equal(r.adjacent,true);assert.equal(r.monitor,true);assert.equal(r.windowRequired,false);});
test('Japanese and English follow-ups preserve group context',()=>{for(const text of ['明日の午後に変更','Change to tomorrow afternoon']){const r=parseRequest(text,{...base,count:3,names:['self','田中','佐藤'],monitor:true},'2026-11-21');assert.equal(r.date,'2026-11-22');assert.equal(r.start,13);assert.equal(r.count,3);assert.equal(r.monitor,true);}});
test('questions never confirm a reservation in either language',()=>{for(const text of ['予約できますか？','確認してから変更して','Can you book a meeting room?','Yes, but change to tomorrow'])assert.notEqual(parseRequest(text,base,'2026-11-21').action,'confirm');for(const text of ['予約を確定','Confirm booking'])assert.equal(parseRequest(text,base,'2026-11-21').action,'confirm');});
test('required windows are not softened by another preference',()=>{for(const text of ['窓際は必須、できればモニター付き、3人で隣同士','Window seats are required; preferably with monitors, 3 adjacent desks']){const r=parseRequest(text,base,'2026-11-21');assert.equal(r.windowRequired,true);}});
test('preferences can be relaxed in both languages',()=>{for(const text of ['窓際でなくてもいい','No window preference']){const r=parseRequest(text,{...base,window:true,windowRequired:true},'2026-11-21');assert.equal(r.windowRequired,false);assert.equal(r.window,false);}});
test('dates are not mistaken for time ranges',()=>{const r=parseRequest('Book a desk on 2026-11-25 from 10 to 12',base,'2026-11-21');assert.equal(r.date,'2026-11-25');assert.equal(r.start,10);assert.equal(r.end,12);});
test('unsupported precision and oversized groups are clarified',()=>{for(const text of ['明日9時半から座席を予約','Book 100 desks tomorrow','Book 3 desks: A02'])assert.equal(parseRequest(text,base,'2026-11-21').action,'clarify');});
test('English for-time expressions do not become group sizes',()=>{
 for(const [text,start,end] of [['Book a desk for 9 am to 12 pm',9,12],['Book a desk for 2 pm to 4 pm',14,16]]){
  const r=parseRequest(text,base,'2026-11-21');assert.equal(r.action,'search');assert.equal(r.count,1);assert.equal(r.start,start);assert.equal(r.end,end);
 }
});
test('English month dates are honored rather than silently booking today',()=>{
 assert.equal(parseRequest('Book a desk on December 1',base,'2026-11-21').date,'2026-12-01');
 assert.equal(parseRequest('Book a desk on 2 December 2026',base,'2026-11-21').date,'2026-12-02');
});
test('Explicit participants are not replaced by the requester',()=>{
 const r=parseRequest('Book 2 desks for Tanaka and Sato',base,'2026-11-21');assert.deepEqual(r.names,['田中','佐藤']);
 assert.deepEqual(parseRequest('田中さんと佐藤さんの2人で席を予約',base,'2026-11-21').names,['田中','佐藤']);
 assert.equal(parseRequest('Book 2 desks for me, Tanaka and Sato',base,'2026-11-21').action,'clarify');
});
