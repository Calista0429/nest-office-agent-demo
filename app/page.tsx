'use client';
import {useEffect,useRef,useState} from 'react';
import {Armchair,Map,CalendarDays,Users,Settings2,Sparkles,ChevronDown,Plus,Minus,Search,ArrowUp,Check,CheckCheck,X,Sun,VolumeX,Clock,MoreHorizontal,Info,LoaderCircle,Building2,PanelRightClose,Leaf,ShieldCheck,RefreshCw,Languages} from 'lucide-react';
import OfficeMap from './components/OfficeMap';
import {todayTokyo,addDays,colleagues,seats} from '../lib/office.mjs';
import {t,localeOf,personName,dateText} from '../lib/i18n.mjs';

type Message={id:string;role:'user'|'assistant';text:string;params?:any;type?:string;proposal?:any;booking?:any};
type Notice={key:string;params?:any}|null;
const time=(h:number)=>`${String(h).padStart(2,'0')}:00`;
async function api(body?:any,date?:string){
 const endpoint=document.querySelector('meta[name=office-api]')?.getAttribute('content')||'/api/office';
 const res=await fetch(body?endpoint:`${endpoint}?date=${date}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
 const data=await res.json();
 if((!res.ok||data.error)&&!data.conflict)throw new Error(data.error||'requestFailed');
 return data;
}
export default function Home(){
 const [locale,setLocale]=useState(()=>localeOf(new URLSearchParams(location.search).get('lang')||localStorage.getItem('nest.locale')));
 const tr=(key:string,params:any={})=>t(locale,key,params);
 const name=(value:string)=>personName(locale,value);
 const dateLabel=(value:string)=>dateText(locale,value);
 const join=(items:string[])=>items.join(locale==='ja'?'、':', ');
 const zoneLabel=(seat:any)=>tr(`zone_${seat.zoneKey}`);
 const [date,setDate]=useState(todayTokyo()),[start,setStart]=useState(9),[end,setEnd]=useState(18),[data,setData]=useState<any>({occupied:[],bookings:[]});
 const [view,setView]=useState('map'),[zone,setZone]=useState('all'),[query,setQuery]=useState(''),[selected,setSelected]=useState<any>(null),[zoom,setZoom]=useState(1);
 const [messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(''),[pending,setPending]=useState(false),[proposal,setProposal]=useState<any>(null),[context,setContext]=useState<any>(null),[replaceId,setReplaceId]=useState<string|null>(null);
 const [error,setError]=useState(''),[toast,setToast]=useState<Notice>(null),[loading,setLoading]=useState(true),[simulate,setSimulate]=useState(false),[settings,setSettings]=useState(false),[info,setInfo]=useState(false),[chatOpen,setChatOpen]=useState(true),[activeIds,setActiveIds]=useState<string[]>([]);
 const chatEnd=useRef<HTMLDivElement>(null),refreshVersion=useRef(0),inputRef=useRef<HTMLTextAreaElement>(null);
 function msg(role:'user'|'assistant',text:string,extra:any={}){setMessages(m=>[...m,{id:crypto.randomUUID(),role,text,...extra}]);}
 function notice(key:string,params:any={}){setToast({key,params});}
 function messageText(m:Message){
  if(m.role==='user')return m.text;
  if(m.booking){const b=m.booking;return tr(m.text,{seats:join(b.seats),names:join(b.names.map(name)),date:dateLabel(b.date),time:`${time(b.start)}–${time(b.end)}`});}
  return tr(m.text,{...m.params,...(m.params?.name?{name:name(m.params.name)}:{})});
 }
 async function refresh(d=date){
  const v=++refreshVersion.current;
  try{const next=await api(undefined,d);if(v===refreshVersion.current){setData(next);setError('');}}
  catch(e:any){if(v===refreshVersion.current)setError(e.message);}
  finally{if(v===refreshVersion.current)setLoading(false);}
 }
 useEffect(()=>{localStorage.setItem('nest.locale',locale);document.documentElement.lang=locale;document.title=tr('pageTitle');},[locale]);
 useEffect(()=>{setLoading(true);refresh(date);setSelected(null);},[date]);
 useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[messages,pending]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(null),4000);return()=>clearTimeout(id);},[toast]);
 const occupied=data.occupied.filter((o:any)=>o.start<end&&o.end>start);
 const available=seats.length-new Set(occupied.map((o:any)=>o.seatId)).size;
 const selectedOcc=selected&&occupied.find((o:any)=>o.seatId===selected.id);
 const upcoming=data.bookings.filter((b:any)=>b.date>=todayTokyo());
 function clearProposal(){setProposal(null);setActiveIds([]);setReplaceId(null);setContext(null);}
 function chooseDate(d:string){if(d){setDate(d);setProposal(null);setActiveIds([]);}}
 function chooseTime(a:number,b:number){setStart(a);setEnd(b);setProposal(null);setActiveIds([]);}
 function acceptProposal(p:any,conflict=false){
  setContext(p.request);setProposal(p.options?.length?p:null);setDate(p.request.date);setStart(p.request.start);setEnd(p.request.end);setView('map');
  const first=p.options?.[0];setActiveIds(first?.seats.map((s:any)=>s.id)||[]);setSelected(null);
  if(conflict)msg('assistant','conflictMessage',{type:'conflict'});
  const key=first?(p.request.window&&!first.seats.every((s:any)=>s.window)?'windowRelaxed':'found'):'noneFound';
  msg('assistant',key,{proposal:p,type:'proposal'});
 }
 async function send(text=input){
  if(!text.trim()||pending)return;
  const value=text.trim();setInput('');msg('user',value);setChatOpen(true);setPending(true);setProposal(null);setActiveIds([]);
  try{
   const p=await api({action:'search',text:value,context:{...context,date,start,end},replaceId});
   if(p.request.action==='confirm'){
    if(proposal){await book(proposal.options[0],proposal);return;}
    msg('assistant','needProposal');
   }else if(['cancel','bookings'].includes(p.request.action)){setView('bookings');msg('assistant','openedBookings');}
   else if(p.request.action==='unsupported')msg('assistant','unsupported');
   else if(p.request.action==='clarify')msg('assistant',p.request.message,{params:p.request.params});
   else acceptProposal(p);
  }catch(e:any){msg('assistant',e.message,{type:'error'});}finally{setPending(false);}
 }
 async function proposeSelected(){
  if(!selected||pending)return;
  if(replaceId&&context?.count>1){notice('groupEditHint');return;}
  setPending(true);
  try{
   const p=await api({action:'select',request:{date,start,end,count:1,seatIds:[selected.id],names:['self'],monitor:false,quiet:false,window:false,windowRequired:false,adjacent:false},replaceId});
   msg('user',tr('manualRequest',{seats:selected.id,date:dateLabel(date),time:`${time(start)}–${time(end)}`}));acceptProposal(p);
  }catch(e:any){notice(e.message);}finally{setPending(false);}
 }
 async function book(option:any,p=proposal){
  if(!p)return;setPending(true);
  try{
   const result=await api({action:'book',request:{...p.request,seatIds:option.seats.map((s:any)=>s.id)},proposalId:p.proposalId,replaceId,simulateConflict:simulate});
   setSimulate(false);await refresh(p.request.date);
   if(result.conflict)acceptProposal(result,true);
   else{clearProposal();notice('saved');msg('assistant',replaceId?'rescheduledMessage':'bookedMessage',{type:'success',booking:result.booking});}
  }catch(e:any){msg('assistant',e.message,{type:'error'});}finally{setPending(false);}
 }
 async function cancelBooking(b:any){
  if(pending)return;setPending(true);
  try{await api({action:'cancel',id:b.id});await refresh();notice('cancelledMessage',{seats:join(b.seats)});clearProposal();}
  catch(e:any){notice(e.message);}finally{setPending(false);}
 }
 function changeBooking(b:any){
  setReplaceId(b.id);setContext({date:b.date,start:b.start,end:b.end,count:b.seats.length,names:b.names,monitor:false,quiet:false,window:false,windowRequired:false,adjacent:b.seats.length>1});
  setDate(b.date);setStart(b.start);setEnd(b.end);setProposal(null);setActiveIds(b.seats);setChatOpen(true);
  msg('assistant','editMessage',{params:{seats:join(b.seats)}});setTimeout(()=>inputRef.current?.focus(),50);
 }
 const examples=['exampleWindow','exampleTeam','exampleQuiet'];
 const nav=[{id:'map',icon:Map},{id:'bookings',icon:CalendarDays},{id:'people',icon:Users}];
 return <div className="app-shell">
  <aside className="sidebar">
   <a href="/" className="brand" aria-label={tr('home')}><span className="brand-mark"><Armchair size={23}/></span><span>{tr('brand')}{locale==='ja'&&<span className="brand-en">NEST</span>}</span></a>
   <div className="workspace"><span className="workspace-icon"><Building2 size={18}/></span><div><strong>Studio Tokyo</strong><span>{tr('workspaceSubtitle')}</span></div><ChevronDown size={15}/></div>
   <div className="nav-caption">{tr('workspace')}</div>
   <nav>{nav.map(n=><button key={n.id} aria-label={tr(n.id)} className={`nav-item ${view===n.id?'active':''}`} onClick={()=>setView(n.id)}><n.icon size={19}/><span>{tr(n.id)}</span>{n.id==='bookings'&&upcoming.length>0&&<small>{upcoming.length}</small>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="sidebar-note"><Leaf size={22}/><p>{tr('sidebarNote')}</p></div><button className="nav-item" onClick={()=>setInfo(true)}><Info size={18}/><span>{tr('about')}</span></button><div className="profile"><span className="avatar self">{name('self').slice(0,1)}</span><div><strong>{tr('member')}</strong><span>{tr('personal')}</span></div><button className="icon-button" aria-label={tr('about')} onClick={()=>setInfo(true)}><MoreHorizontal size={19}/></button></div></div>
  </aside>
  <div className="workspace-shell">
   <header className="topbar"><div className="breadcrumb">{tr('workspace')} <span>/</span> <strong>{tr(view)}</strong></div><div className="topbar-right"><label className="language-switch"><Languages size={15}/><select aria-label={tr('language')} value={locale} onChange={e=>setLocale(localeOf(e.target.value))}><option value="ja">日本語</option><option value="en">English</option></select></label><span className="demo-tag">{tr('demo')}</span><button className="icon-button" aria-label={tr('refresh')} onClick={()=>refresh()}><RefreshCw size={17}/></button><span className="avatar small self">{name('self').slice(0,1)}</span></div></header>
   <div className={`content-layout ${chatOpen?'':'chat-closed'}`}>
    <main className="main-content">
     <div className="page-heading"><div><h1>{tr(`${view}Title`)}</h1><p>{tr(`${view}Subtitle`)}</p></div><button className="secondary-button assistant-toggle" onClick={()=>setChatOpen(!chatOpen)}><Sparkles size={17}/>{tr('assistant')}</button></div>
     {error&&<div className="error-banner" role="alert">{tr(error)}<button onClick={()=>refresh()}>{tr('retry')}</button></div>}
     <div className="schedule-toolbar"><div className="location-selector"><Building2 size={17}/><span>{tr('office')}</span><span className="floor-badge">3F</span></div><div className="schedule-controls"><label className="date-control"><CalendarDays size={16}/><input type="date" aria-label={tr('date')} value={date} min={todayTokyo()} max={addDays(todayTokyo(),90)} onChange={e=>chooseDate(e.target.value)}/></label><label className="time-control"><Clock size={16}/><select aria-label={tr('start')} value={start} onChange={e=>chooseTime(Number(e.target.value),Math.max(end,Number(e.target.value)+1))}>{Array.from({length:12},(_,i)=>i+8).map(h=><option key={h} value={h}>{time(h)}</option>)}</select><span>–</span><select aria-label={tr('end')} value={end} onChange={e=>chooseTime(start,Number(e.target.value))}>{Array.from({length:20-start},(_,i)=>i+start+1).map(h=><option key={h} value={h}>{time(h)}</option>)}</select></label></div></div>
     {view==='map'&&<>
      <div className="map-toolbar"><div className="filter-tabs">{[['all','allZones'],['window','window'],['quiet','quiet'],['collab','collab']].map(([key,label])=><button className={zone===key?'chosen':''} key={key} onClick={()=>setZone(key)}>{tr(label)}</button>)}</div><label className="search-input"><Search size={16}/><input aria-label={tr('search')} placeholder={tr('search')} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label={tr('clearSearch')} onClick={()=>setQuery('')}><X size={14}/></button>}</label></div>
      <section className="map-panel" aria-label={tr('map')}><div className="map-panel-heading"><span><span className="availability-dot"/>{loading?tr('loading'):tr('availableCount',{n:available})}</span><span className="subtle">{tr('mapCount')}</span></div><div className="map-scroll"><OfficeMap locale={locale} zone={zone} occupied={occupied} selected={selected?.id} recommended={activeIds} query={query} zoom={zoom} onSelect={s=>{setSelected(s);setChatOpen(true);}}/></div>
       <div className="map-bottom"><div className="legend">{[['free','available'],['occupied','occupied'],['mine','mine'],['recommended','recommended']].map(([css,key])=><span key={key}><i className={css}/>{tr(key)}</span>)}</div><div className="zoom-controls"><button className="icon-button" aria-label={tr('zoomOut')} onClick={()=>setZoom(z=>Math.max(.8,+(z-.1).toFixed(1)))}><Minus size={15}/></button><button className="zoom-value" aria-label={tr('resetZoom')} onClick={()=>setZoom(1)}>{Math.round(zoom*100)}%</button><button className="icon-button" aria-label={tr('zoomIn')} onClick={()=>setZoom(z=>Math.min(1.6,+(z+.1).toFixed(1)))}><Plus size={15}/></button></div></div>
       {selected&&<div className="seat-popover"><span className="seat-icon"><Armchair size={23}/></span><div className="seat-popover-content"><div><strong>{selected.id}</strong><span>{zoneLabel(selected)}</span></div><p>{selectedOcc?`${tr('occupiedBy',{name:name(selectedOcc.name)})} · ${time(selectedOcc.start)}–${time(selectedOcc.end)}`:`${selected.monitor?tr('monitor')+' · ':''}${tr(selected.window?'daylight':selected.quiet?'focus':'teamwork')}`}</p></div>{selectedOcc?<span className="unavailable">{tr('occupied')}</span>:<button className="primary-button" disabled={pending||loading} onClick={proposeSelected}>{tr('bookSeat')}</button>}<button className="icon-button" aria-label={tr('closeSeat')} onClick={()=>setSelected(null)}><X size={17}/></button></div>}
      </section>
      <div className="below-map"><div className="colleague-stack">{colleagues.slice(0,4).map(c=><span className="avatar" key={c.name} style={{background:c.color}}>{name(c.name).slice(0,1)}</span>)}</div><span>{tr('colleaguesCount',{n:new Set(occupied.map((o:any)=>o.name)).size})}</span><button onClick={()=>setView('people')}>{tr('findPeople')}</button><span className="map-hint">{tr('mapHint')}</span></div>
     </>}
     {view==='bookings'&&<section className="booking-page"><div className="section-title"><h2>{tr('upcoming')}</h2><span>{tr('bookingCount',{n:upcoming.length})}</span></div>{upcoming.length===0?<div className="empty-state"><CalendarDays size={40}/><h3>{tr('emptyTitle')}</h3><p>{tr('emptyBody')}</p><button className="primary-button" onClick={()=>setView('map')}>{tr('chooseSeat')}</button></div>:upcoming.map((b:any)=><article className="booking-row" key={b.id}><div className="booking-date"><strong>{b.date.slice(8)}</strong><span>{locale==='ja'?tr('month',{n:Number(b.date.slice(5,7))}):new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'Asia/Tokyo'}).format(new Date(b.date+'T12:00:00Z'))}</span></div><div className="booking-main"><h3>{b.seats.join(' / ')}<span className="status-tag">{tr('occupied')}</span></h3><p>{dateLabel(b.date)} · {time(b.start)}–{time(b.end)}</p><span>{join(b.names.map(name))} · {tr('office')} 3F</span></div><div className="booking-actions"><button className="secondary-button" disabled={pending} onClick={()=>changeBooking(b)}>{tr('reschedule')}</button><button className="text-button" disabled={pending} onClick={()=>cancelBooking(b)}>{tr('cancelBooking')}</button></div></article>)}</section>}
     {view==='people'&&<section className="people-page"><div className="section-title"><h2>{tr('peopleLocation')}</h2><span>{dateLabel(date)}</span></div><p className="subtle">{tr('peopleDisclaimer')}</p><div className="people-grid">{colleagues.map(c=>{const o=occupied.find((o:any)=>o.name===c.name);const seat=o&&seats.find((s:any)=>s.id===o.seatId);return <article className="person-card" key={c.name}><span className="avatar large" style={{background:c.color}}>{name(c.name).slice(0,1)}</span><h3>{name(c.name)}</h3><p>{o?`${o.seatId} · ${zoneLabel(seat)}`:tr('noBooking')}</p><button className="secondary-button" disabled={!o} onClick={()=>{setView('map');setZone('all');setQuery(name(c.name));setSelected(seat);}}>{tr('showMap')}</button></article>})}</div></section>}
     <footer className="main-footer"><span><Leaf size={13}/>{tr('footer')}</span><span>{tr('timezone')}</span></footer>
    </main>
    {chatOpen&&<aside className="assistant-panel">
     <header className="assistant-header"><div className="assistant-symbol"><Sparkles size={20}/></div><div><h2>{tr('assistantName')}</h2><span>{tr('assistantSubtitle')}</span></div><button className="icon-button" aria-label={tr('closeAssistant')} onClick={()=>setChatOpen(false)}><PanelRightClose size={17}/></button></header>
     <div className="assistant-mode"><span><span className="mode-dot"/>{tr('mode')}</span><button onClick={()=>setInfo(true)} aria-label={tr('modeInfo')}><Info size={14}/></button></div>
     <div className="chat-scroll" role="log" aria-live="polite"><div className="assistant-intro"><div className="intro-art"><Armchair size={29}/><Sparkles size={16}/></div><h3>{tr('introTitle')}</h3><p>{tr('introBody')}</p></div>
      {messages.length===0&&<div className="suggestions">{examples.map((key,i)=><button key={key} onClick={()=>send(tr(key))} disabled={pending}><span className={`suggestion-icon s${i}`}>{i===0?<Sun size={17}/>:i===1?<Users size={17}/>:<VolumeX size={17}/>}</span><span>{tr(key)}</span><Plus size={14}/></button>)}</div>}
      {messages.map(m=><div key={m.id} className={`message ${m.role} ${m.type||''}`}>{m.role==='assistant'&&<span className="message-avatar"><Sparkles size={14}/></span>}<div className="message-body"><p>{m.type==='success'&&<CheckCheck className="inline-icon" size={17}/>} {messageText(m)}</p>{m.proposal?.options?.length>0&&<><div className="tool-progress"><Check size={12}/>{tr('understood')} <span/><Check size={12}/>{tr('checked')}</div><div className="proposal-meta"><CalendarDays size={13}/>{dateLabel(m.proposal.request.date)}<br/><Clock size={13}/>{time(m.proposal.request.start)}–{time(m.proposal.request.end)} · {tr('peopleNumber',{n:m.proposal.request.count})}</div>{m.proposal.options.slice(0,2).map((o:any,i:number)=>{const current=proposal?.proposalId===m.proposal.proposalId;return <div className={`recommendation-card ${current?'':'stale'}`} key={i}><div className="recommendation-top"><span>{tr(i===0?'firstOption':'otherOption')}</span>{i===0&&<span className="match-tag">{tr('requirementsMet')}</span>}</div><strong>{o.seats.map((s:any)=>s.id).join(' · ')}</strong><div className="feature-tags">{o.reasons.map((r:string)=><span key={r}>{tr(r,{name:name(m.proposal.request.near||'')})}</span>)}</div><div className="recommendation-actions"><button className="text-button" disabled={!current} onClick={()=>{setActiveIds(o.seats.map((s:any)=>s.id));setView('map');setSelected(o.seats[0]);}}>{tr('locate')}</button><button className="primary-button" disabled={!current||pending} onClick={()=>book(o,m.proposal)}>{tr(current?'confirm':'expired')}</button></div></div>})}</>}</div></div>)}
      {pending&&<div className="assistant-thinking"><LoaderCircle size={15} className="spin"/><span>{tr('working')}</span></div>}<div ref={chatEnd}/>
     </div>
     <div className="chat-composer">{replaceId&&<div className="reschedule-banner">{tr('editing')}<button onClick={clearProposal} aria-label={tr('exitEditing')}><X size={13}/></button></div>}{settings&&<div className="demo-settings"><label><input type="checkbox" checked={simulate} onChange={e=>setSimulate(e.target.checked)}/>{tr('simulateLabel')}</label><p>{tr('simulateHelp')}</p></div>}<form onSubmit={e=>{e.preventDefault();send();}}><textarea ref={inputRef} aria-label={tr('requestLabel')} placeholder={tr('placeholder')} value={input} maxLength={1000} rows={2} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><div className="composer-bottom"><button type="button" className={`icon-button ${simulate?'enabled':''}`} aria-label={tr('demoSettings')} onClick={()=>setSettings(!settings)}><Settings2 size={17}/></button><span>{tr(simulate?'conflictEnabled':'enterToSend')}</span><button className="send-button" type="submit" disabled={!input.trim()||pending||loading} aria-label={tr('send')}>{pending?<LoaderCircle size={17} className="spin"/>:<ArrowUp size={19}/>}</button></div></form><p className="composer-note"><ShieldCheck size={12}/>{tr('composerNote')}</p></div>
    </aside>}
   </div>
  </div>
  {toast&&<div className="toast" role="status"><Check size={17}/>{tr(toast.key,toast.params)}</div>}
  {info&&<div className="modal-backdrop" onClick={()=>setInfo(false)}><section className="info-dialog" role="dialog" aria-modal="true" aria-label={tr('about')} onClick={e=>e.stopPropagation()}><button className="icon-button close-dialog" aria-label={tr('closeAbout')} onClick={()=>setInfo(false)}><X size={20}/></button><span className="brand-mark"><Armchair size={25}/></span><h2>{tr('aboutTitle')}</h2><p>{tr('aboutBody')}</p><div className="info-fact"><Sparkles size={20}/><div><strong>{tr('mode')}</strong><p>{tr('aboutAI')}</p></div></div><div className="info-fact"><CalendarDays size={20}/><div><strong>{tr('realPersistence')}</strong><p>{tr('aboutPersistence')}</p></div></div><button className="primary-button" onClick={()=>{setInfo(false);setChatOpen(true);}}>{tr('startDemo')}</button></section></div>}
 </div>;
}
