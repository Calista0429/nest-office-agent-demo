import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRequest,recommendSeats,validateRequest,seats} from '../lib/office.mjs';
const base={date:'2026-11-25',start:9,end:18,count:1,monitor:false,quiet:false,window:false,windowRequired:false,adjacent:false};
test('Chinese request resolves next Wednesday, group size, hard equipment and soft window preference',()=>{
 const r=parseRequest('下周三9点到18点，帮我、田中和佐藤订三个相邻座位，都要显示器，最好靠窗',base,'2026-11-21');
 assert.equal(r.date,'2026-11-25');assert.equal(r.count,3);assert.equal(r.adjacent,true);assert.equal(r.monitor,true);assert.equal(r.window,true);assert.equal(r.windowRequired,false);assert.deepEqual(r.names,['你','田中','佐藤']);
});
test('follow-up preserves constraints while changing afternoon time',()=>{
 const r=parseRequest('换成下午', {...base,monitor:true,count:3},'2026-11-21');
 assert.equal(r.start,13);assert.equal(r.end,18);assert.equal(r.count,3);assert.equal(r.monitor,true);
});
test('unknown requests are not interpreted as a booking',()=>{assert.equal(parseRequest('帮我买一杯咖啡',base,'2026-11-21').action,'unsupported');});
test('questions, cancellation and changes never count as confirmation',()=>{
 for(const text of ['可以订会议室吗','确认取消','可以改成四个人吗','可以不要了吗','好的，但不要预订'])assert.notEqual(parseRequest(text,base,'2026-11-21').action,'confirm');
 assert.equal(parseRequest('确认预约',base,'2026-11-21').action,'confirm');
});
test('oversized group count is rejected before allocation',()=>{const r=parseRequest('预约100个座位',base,'2026-11-21');assert.equal(r.action,'clarify');});
test('ordinary date reply preserves group size and names during reschedule',()=>{const r=parseRequest('明天下午',{...base,count:3,names:['你','田中','佐藤']},'2026-11-21');assert.equal(r.count,3);assert.deepEqual(r.names,['你','田中','佐藤']);assert.equal(r.start,13);});
test('preference qualifiers apply only to the named feature',()=>{const r=parseRequest('必须靠窗，最好有显示器，3个人相邻',base,'2026-11-21');assert.equal(r.windowRequired,true);assert.equal(parseRequest('可以不靠窗',{...base,window:true,windowRequired:true},'2026-11-21').windowRequired,false);});
test('explicit unhandled times and mismatched seat count require clarification',()=>{for(const t of ['明天上午10点到下午2点订位','给3个人订 A02'])assert.equal(parseRequest(t,base,'2026-11-21').action,'clarify');assert.equal(parseRequest('11月25日 10-12 订座',base,'2026-11-21').start,10);});
test('adjacent seats form a physically connected selection',()=>{assert.equal(recommendSeats({...base,count:2,adjacent:true,seatIds:['B01','B03']},[]).length,0);});
test('invalid date and time ranges are rejected',()=>{
 assert.throws(()=>validateRequest({...base,date:'2026-02-30'},'2026-01-01'));
 assert.throws(()=>validateRequest({...base,start:18,end:9},'2026-01-01'));
 assert.throws(()=>validateRequest({...base,date:'2020-01-01'},'2026-01-01'));
});
test('recommendation preserves hard constraints and does not overlap occupied slots',()=>{
 const choices=recommendSeats({...base,count:3,monitor:true,adjacent:true,window:true},[{seatId:'B01',start:9,end:18}]);
 assert.ok(choices.length);const best=choices[0];assert.equal(best.seats.length,3);
 assert.ok(best.seats.every(s=>s.monitor&&s.id!=='B01'));
 assert.equal(new Set(best.seats.map(s=>s.cluster)).size,1);
});
test('mandatory window group cannot silently fall back to interior desks',()=>{
 const choices=recommendSeats({...base,count:3,adjacent:true,window:true,windowRequired:true},[]);
 assert.equal(choices.length,0);
});
test('back-to-back reservations are allowed',()=>{
 const choices=recommendSeats({...base,start:13,end:18,seatIds:['A01']},[{seatId:'A01',start:9,end:13}]);
 assert.equal(choices[0]?.seats[0].id,'A01');
});
