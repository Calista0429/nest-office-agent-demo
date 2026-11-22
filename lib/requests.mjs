const numbers={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
const aliases={'田中':['田中','tanaka'],'佐藤':['佐藤','sato'],'林悦':['林悦','林','hayashi'],'Alex':['alex'],'山本':['山本','yamamoto'],'小野':['小野','ono'],'陈晨':['陳','chen'],'铃木':['鈴木','suzuki']};
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthPattern=months.map(m=>m+'|'+m.slice(0,3)).join('|');
const add=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export function parseLocalizedRequest(text,context,today){
 const raw=String(text).normalize('NFKC').trim(),textLower=raw.toLowerCase();
 const r={date:today,start:9,end:18,count:1,monitor:false,quiet:false,window:false,windowRequired:false,adjacent:false,names:['self'],...context,action:'search'};
 const clarify=key=>({...r,action:'clarify',message:key});
 if(/^(はい|確定|予約を確定|この席で確定|お願いします|confirm|confirm booking|book it|yes|yes please)[.!。!\s]*$/i.test(raw))return {...r,action:'confirm'};
 if(/キャンセル|取り消|\bcancel\b/i.test(raw))return {...r,action:'cancel'};
 if(/自分の予約|予約一覧|予約を確認|my bookings|my reservations/i.test(raw))return {...r,action:'bookings'};
 if(/会議室|コーヒー|meeting room|coffee/i.test(raw))return {...r,action:'unsupported'};
 if(!/席|予約|窓|静か|集中|モニター|明日|明後日|今日|午前|午後|来週|変更|隣|desk|seat|book|reserv|tomorrow|today|quiet|monitor|window|adjacent|together|morning|afternoon|change|next |\d{4}-\d{2}-\d{2}/i.test(raw))return {...r,action:'unsupported'};
 if(/半|\d[:：][1-5]\d|\d+\s*(分|minutes?)/i.test(raw))return clarify('wholeHours');
 const iso=raw.match(/\d{4}-\d{2}-\d{2}/),md=raw.match(/(\d{1,2})月(\d{1,2})日?/);
 const monthFirst=textLower.match(new RegExp('\\b('+monthPattern+')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b'));
 const dayFirst=textLower.match(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+('+monthPattern+')\\.?(?:\\s+(\\d{4}))?\\b'));
 const enMonth=monthFirst||dayFirst;
 const jpDay=raw.match(/(来週|今週)?の?([月火水木金土日])(?:曜日|曜)/);
 const enDay=textLower.match(/\b(next |this )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
 if(iso)r.date=iso[0];else if(md)r.date=`${today.slice(0,4)}-${md[1].padStart(2,'0')}-${md[2].padStart(2,'0')}`;
 else if(enMonth){const month=monthFirst?enMonth[1]:enMonth[2];const day=monthFirst?enMonth[2]:enMonth[1];const index=months.findIndex(m=>m.startsWith(month));r.date=`${enMonth[3]||today.slice(0,4)}-${String(index+1).padStart(2,'0')}-${day.padStart(2,'0')}`;}
 else if(/明後日|day after tomorrow/i.test(raw))r.date=add(today,2);else if(/明日|tomorrow/i.test(raw))r.date=add(today,1);else if(/今日|today/i.test(raw))r.date=today;
 else if(jpDay||enDay){const current=new Date(today+'T12:00:00Z').getUTCDay()||7;const target=jpDay?'月火水木金土日'.indexOf(jpDay[2])+1:['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(enDay[2])+1;const next=jpDay?.[1]==='来週'||enDay?.[1]==='next ';const explicitThis=jpDay?.[1]==='今週'||enDay?.[1]==='this ';let delta=target-current;if(next)delta+=7;else if(delta<0&&!explicitThis)delta+=7;r.date=add(today,delta);}
 if(/午前|morning/i.test(raw)){r.start=9;r.end=12;}if(/午後|afternoon/i.test(raw)){r.start=13;r.end=18;}if(/終日|一日中|all day/i.test(raw)){r.start=9;r.end=18;}
 const timeText=raw.replace(/\d{4}-\d{2}-\d{2}/g,'').replace(/\d{1,2}月\d{1,2}日?/g,'');
 const range=timeText.match(/(?<!\d)(?:(午前|午後)\s*)?(\d{1,2})(?::(\d{2})|時)?\s*(am|pm)?\s*(?:から|〜|~|–|-|to|until)\s*(?:(午前|午後)\s*)?(\d{1,2})(?::(\d{2})|時)?\s*(am|pm)?/i);
 if(range){if(Number(range[3]||0)||Number(range[7]||0))return clarify('wholeHours');const first=range[1]||range[4],last=range[5]||range[8];const general=/午後|afternoon/i.test(raw)?'pm':/午前|morning/i.test(raw)?'am':null;function hour(v,period){v=Number(v);if(/pm|午後/i.test(period||'')&&v<12)v+=12;if(/am|午前/i.test(period||'')&&v===12)v=0;return v;}r.start=hour(range[2],first||last||general);r.end=hour(range[6],last||first||general);}
 else if(/\d{1,2}\s*(時|:00|am\b|pm\b)/i.test(timeText))return clarify('clarifyTime');
 const count=raw.match(/(\d+|[一二三四五六七八九十])\s*(?:人|名|席)/)||textLower.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:(?:adjacent|connected)\s+)?(?:people|persons|desks?|seats?|colleagues?|of us)\b/)||textLower.match(/\bfor\s+(\d+)\b(?!\s*(?:am\b|pm\b|:|to\b|until\b|-))/);
 if(count)r.count=Number(count[1])||numbers[count[1]]||0;
 if(!Number.isInteger(r.count)||r.count<1||r.count>6)return clarify('groupLimit');
 let near;
 const mentioned=[];
 for(const [name,words] of Object.entries(aliases)){for(const word of words){if(!textLower.includes(word))continue;const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp(`${escaped}(?:さん)?の(?:近く|隣)|(?:near|close to|next to)\\s+${escaped}`,'i').test(raw))near=name;else if(!mentioned.includes(name))mentioned.push(name);}}
 if(near)r.near=near;if(/近くでなく|no proximity|not near/i.test(raw))delete r.near;
 if(mentioned.length){const people=mentioned.filter(n=>n!==near);const includesSelf=/私|自分|\b(?:me|myself|i)\b/i.test(raw);r.names=[...(includesSelf||count&&r.count>people.length?['self']:[]),...people];if(!count)r.count=r.names.length;else if(r.names.length>r.count)return clarify('countMismatch');}
 if(r.count>6)return clarify('groupLimit');
 r.names=Array.from({length:r.count},(_,i)=>r.names?.[i]||(i===0?'self':`colleague:${i}`));
 if(/モニター|monitor|screen/i.test(raw))r.monitor=!/モニター(?:は|が)?(?:不要|なし)|モニター付きでなく|no monitors?|without (?:a )?monitor/i.test(raw);
 if(/静か|集中|quiet|focus/i.test(raw))r.quiet=!/静かでなく|静かさは不要|no quiet preference|does not need to be quiet/i.test(raw);
 if(/窓際|窓側|window/i.test(raw)){
  r.window=!/(窓際|窓側)(?:で|じゃ|は|が)?(?:なくても|なくて|不要)|窓際にこだわらない|no window preference|not necessarily.{0,20}window|does(?:n.t| not) (?:have|need) to be.{0,15}window/i.test(raw);
  const clauses=raw.split(/[、。，,;；]/).filter(c=>/窓際|窓側|window/i.test(c));
  const soft=clauses.some(c=>/できれば|なるべく|可能なら|希望|prefer|if possible/i.test(c));const hard=clauses.some(c=>/必須|必ず|must|required/i.test(c));r.windowRequired=r.window&&(hard||!soft);
 }
 if(/隣同士|隣り合|隣接|並び|adjacent|together|next to each other/i.test(raw))r.adjacent=true;
 if(/隣同士でなくても|離れても|not (?:need to be |necessarily )?adjacent|do not need to be adjacent|separate.{0,10}(?:okay|fine)/i.test(raw))r.adjacent=false;
 const ids=raw.toUpperCase().match(/\b[ABC]\d{2}\b/g);if(ids){r.seatIds=[...new Set(ids)];if(count&&r.count!==r.seatIds.length)return clarify('countMismatch');r.count=r.seatIds.length;}else delete r.seatIds;
 return r;
}
