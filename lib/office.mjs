import {parseLocalizedRequest} from './requests.mjs';
export function todayTokyo(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function addDays(date,n){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export const colleagues=[{name:'田中',initial:'田',color:'#efd6bb'},{name:'佐藤',initial:'佐',color:'#cddcfa'},{name:'林悦',initial:'林',color:'#c8dfd8'},{name:'Alex',initial:'A',color:'#e3d7f1'},{name:'山本',initial:'山',color:'#f0d7db'},{name:'小野',initial:'小',color:'#d4e5f2'},{name:'陈晨',initial:'陈',color:'#d8dec4'},{name:'铃木',initial:'铃',color:'#ded9d1'}];
export const seats=[];
for(let i=0;i<6;i++) seats.push({id:`A${String(i+1).padStart(2,'0')}`,zone:'靠窗区',zoneKey:'window',x:130+(i%2)*94,y:218+Math.floor(i/2)*124,cluster:`A${Math.floor(i/2)}`,monitor:true,window:true,quiet:false});
for(const [letter,offset,zone,zoneKey] of [['B',396,'协作区','collab'],['C',712,'安静区','quiet']]){
 for(let i=0;i<12;i++){const pod=Math.floor(i/6),row=Math.floor((i%6)/3),col=i%3;seats.push({id:`${letter}${String(i+1).padStart(2,'0')}`,zone,zoneKey,x:offset+col*76,y:220+pod*211+row*64,cluster:`${letter}${pod}`,monitor:letter==='C'||![4,10].includes(i),window:false,quiet:letter==='C'});}
}
export function seedOccupancy(date){return ['A01','A04','B02','B05','B10','C03','C08','C12'].map((seatId,i)=>({seatId,date,start:i===3?13:9,end:i===5?13:18,name:colleagues[i].name,color:colleagues[i].color,kind:'seed'}));}
export function validateRequest(r,today=todayTokyo()){
 if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(r.date))throw new Error('invalidDate');
 const d=new Date(`${r.date}T12:00:00Z`);if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==r.date)throw new Error('dateMissing');
 if(r.date<today)throw new Error('pastDate');
 if(r.date>addDays(today,90))throw new Error('dateLimit');
 if(!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<8||r.end>20||r.end<=r.start)throw new Error('invalidTime');
 if(!Number.isInteger(r.count)||r.count<1||r.count>6)throw new Error('groupLimit');
 if(r.seatIds&&(!Array.isArray(r.seatIds)||new Set(r.seatIds).size!==r.seatIds.length||r.seatIds.some(id=>!seats.some(s=>s.id===id))))throw new Error('invalidSeats');
 return r;
}
const digits={'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
function parseLegacyRequest(text,context={},today=todayTokyo()){
 const t=String(text).trim();
 const defaults={date:today,start:9,end:18,count:1,monitor:false,quiet:false,window:false,windowRequired:false,adjacent:false,names:['你']};
 const follow=/^(那|改|换|还是|同样|再|不用|不要|加上|需要|最好|必须|尽量|可以)/.test(t);
 const r={...defaults,...context,action:'search'};
 if(/^(确认|确认预约|确认预订|可以|好的|好|就这组|就这个|订这组|预约这组)[。！!\s]*$/.test(t))return {...context,action:'confirm'};
 if(/取消/.test(t))return {...r,action:'cancel'};
 if(/(我的预约|预约记录|已经订|已订)/.test(t))return {...r,action:'bookings'};
 if(!/(座|席|预订|预约|订|靠窗|安静|显示器|上午|下午|明天|后天|相邻|改|换|田中|佐藤|几点|空位)/.test(t))return {...r,action:'unsupported'};
 if(/会议室|投影|白板|咖啡/.test(t))return {...r,action:'unsupported'};
 if(/半|\d[:：][1-5]\d|\d+分钟/.test(t))return {...r,action:'clarify',message:'演示版按整小时预约。请用例如“明天 9 点到 12 点”。'};
 const iso=t.match(/\d{4}-\d{2}-\d{2}/); const md=t.match(/(\d{1,2})月(\d{1,2})[日号]?/);const weekday=t.match(/(下周|下星期|本周|这周|周|星期)([一二三四五六日天])/);
 if(iso)r.date=iso[0];else if(md)r.date=`${today.slice(0,4)}-${md[1].padStart(2,'0')}-${md[2].padStart(2,'0')}`;
 else if(/后天/.test(t))r.date=addDays(today,2);else if(/明天/.test(t))r.date=addDays(today,1);else if(/今天/.test(t))r.date=today;
 else if(weekday){const day=new Date(`${today}T12:00:00Z`).getUTCDay()||7;const target=digits[weekday[2]]||7;let delta=target-day;if(weekday[1].startsWith('下'))delta+=7;else if(['周','星期'].includes(weekday[1])&&delta<0)delta+=7;r.date=addDays(today,delta);}
 if(/上午/.test(t)){r.start=9;r.end=12;}if(/下午/.test(t)){r.start=13;r.end=18;}if(/全天|一整天/.test(t)){r.start=9;r.end=18;}
 if(/上午.*下午|下午.*上午/.test(t))return {...r,action:'clarify',message:'请用 24 小时制描述跨上午、下午的时间，例如“明天 10 点到 14 点”。'};
 const range=t.match(/(\d{1,2})(?:[:：]00|点|时)?\s*(?:到|至|[-–~])\s*(\d{1,2})(?:[:：]00|点|时|(?=\s|$))/);
 if(range){r.start=Number(range[1]);r.end=Number(range[2]);if(/下午/.test(t)){if(r.start<12)r.start+=12;if(r.end<12)r.end+=12;}}
 const count=t.match(/([一二两三四五六七八九十\d]+)\s*(?:个(?:人|座位|位置|工位)?|位|人|张)/);if(count)r.count=Number(count[1])||digits[count[1]]||7;
 if(!Number.isInteger(r.count)||r.count<1||r.count>6)return {...r,action:'clarify',message:'演示版一次支持 1–6 人预约，请调整人数。'};
 const near=t.match(/(?:离|靠近|挨着)\s*(田中|佐藤|林悦|Alex|山本|小野|陈晨|铃木)/);if(near)r.near=near[1];
 const names=colleagues.filter(c=>t.includes(c.name)&&c.name!==near?.[1]).map(c=>c.name);
 if(names.length){r.names=['你',...names];if(!count)r.count=r.names.length;}
 r.names=Array.from({length:r.count},(_,i)=>r.names?.[i]||(i===0?'你':`同事 ${i}`));
 if(/显示器|屏幕/.test(t))r.monitor=!/(不需要|不用|不要)显示器/.test(t);
 if(/安静|专注/.test(t))r.quiet=!/(不用|不要|不需要)安静/.test(t);
 if(/靠窗|窗边/.test(t)){r.window=!/(不靠窗|不要靠窗|不用靠窗|不需要靠窗|无需靠窗|不必靠窗|不一定靠窗)/.test(t);const soft=/(最好|尽量|优先|希望|可以)[^，。；,;]*?(靠窗|窗边)/.test(t);const hard=/(必须|一定要|务必)[^，。；,;]*?(靠窗|窗边)/.test(t);r.windowRequired=r.window&&(hard||!soft);}
 if(/相邻|一起|连着|连座/.test(t))r.adjacent=true;
 if(/不必相邻|不用相邻|分开也可以/.test(t))r.adjacent=false;
 const ids=t.toUpperCase().match(/\b[ABC]\d{2}\b/g);if(ids){r.seatIds=[...new Set(ids)];if(count&&r.count!==r.seatIds.length)return {...r,action:'clarify',message:'人数与指定的座位数量不同，请补充座位或调整人数。'};r.count=r.seatIds.length;}else delete r.seatIds;
 return r;
}
export function recommendSeats(r,occupied){
 const available=seats.filter(s=>(!r.monitor||s.monitor)&&(!r.quiet||s.quiet)&&(!r.windowRequired||s.window)&&(!r.seatIds||r.seatIds.includes(s.id))&&!occupied.some(o=>o.seatId===s.id&&o.start<r.end&&o.end>r.start));
 if(r.seatIds&&available.length!==r.seatIds.length)return [];
 const target=occupied.find(o=>o.name===r.near&&o.start<r.end&&o.end>r.start);const nearSeat=seats.find(s=>s.id===target?.seatId);
 const score=s=>(r.window&&s.window?40:0)+(r.quiet&&s.quiet?30:0)+(s.monitor?2:0)-(nearSeat?Math.hypot(s.x-nearSeat.x,s.y-nearSeat.y)/10:0);
 const groups=[];
 function connected(g){const seen=new Set([g[0].id]);let changed=true;while(changed){changed=false;for(const a of g)if(seen.has(a.id))for(const b of g)if(!seen.has(b.id)&&((a.y===b.y&&Math.abs(a.x-b.x)<=95)||(a.x===b.x&&Math.abs(a.y-b.y)<=65))){seen.add(b.id);changed=true;}}return seen.size===g.length;}
 function choose(list,size,start=0,current=[]){if(current.length===size){if(connected(current))groups.push([...current]);return;}for(let i=start;i<=list.length-(size-current.length);i++)choose(list,size,i+1,[...current,list[i]]);}
 if(r.adjacent&&r.count>1){for(const cluster of new Set(available.map(s=>s.cluster)))choose(available.filter(s=>s.cluster===cluster),r.count);}
 else if(r.count===1)available.forEach(s=>groups.push([s]));else{const sorted=[...available].sort((a,b)=>score(b)-score(a));if(sorted.length>=r.count)for(let i=0;i<Math.min(3,sorted.length-r.count+1);i++)groups.push(sorted.slice(i,i+r.count));}
 return groups.map(g=>({seats:g,score:g.reduce((n,s)=>n+score(s),0)-(g.length>1?Math.max(...g.map(s=>s.x))-Math.min(...g.map(s=>s.x)):0)/100,reasons:[g.every(s=>s.monitor)?'reasonMonitor':'reasonDesk',g.every(s=>s.window)?'reasonWindow':g.every(s=>s.quiet)?'reasonQuiet':'reasonTeam',...(r.count>1&&r.adjacent?['reasonAdjacent']:[]),...(nearSeat?['reasonNear']:[])]})).sort((a,b)=>b.score-a.score||a.seats[0].id.localeCompare(b.seats[0].id)).slice(0,3);
}

export function parseRequest(text,context={},today=todayTokyo()){return /明天|后天|今天|下周|预约|靠窗|显示器|相邻|换成|取消|确认|可以|好的|订位|订座|个人订/.test(String(text))?parseLegacyRequest(text,context,today):parseLocalizedRequest(text,context,today);}
