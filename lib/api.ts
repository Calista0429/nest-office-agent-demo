import {todayTokyo,parseRequest,validateRequest,recommendSeats,seedOccupancy,seats} from './office.mjs';
import {listBookings,reserve,cancel} from './store.mjs';

const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function scope(request:Request){const h=request.headers;const user=h.get('oai-authenticated-user-id');if(user)return user;if(['localhost','127.0.0.1'].includes(new URL(request.url).hostname))return 'local-office-demo';throw new Error('signIn');}
function occupiedFor(rows:any[],date:string,ignore?:string){return [...seedOccupancy(date),...rows.filter(b=>b.date===date&&b.id!==ignore).flatMap(b=>b.seats.map((seatId:string,i:number)=>({seatId,date,start:b.start,end:b.end,name:b.names[i]||'colleague:1',kind:b.kind,bookingId:b.id,color:b.kind==='simulation'?'#edcdb7':'#cddcfa'})))];}
function proposal(r:any,rows:any[],ignore?:string){return {request:r,options:recommendSeats(r,occupiedFor(rows,r.date,ignore)),proposalId:crypto.randomUUID()};}
export async function GET(request:Request,env:any){try{const user=await scope(request);const date=new URL(request.url).searchParams.get('date')||todayTokyo();validateRequest({date,start:9,end:18,count:1});const rows=await listBookings(env.DB,user);return json({date,seats,occupied:occupiedFor(rows,date),bookings:rows.filter(b=>b.kind==='booking'),mode:'demo',today:todayTokyo()});}catch(e:any){return json({error:e.message},400);}}
export async function POST(request:Request,env:any){
 try{const user=await scope(request);const body=await request.json();const db=env.DB;if(!db)throw new Error('serviceUnavailable');
 const rows=await listBookings(db,user);
 if(body.action==='cancel'){await cancel(db,user,String(body.id));return json({ok:true});}
 if(body.action==='search'){
  if(typeof body.text!=='string'||body.text.length>1000)throw new Error('textLimit');
  const r=parseRequest(body.text,body.context||{});if(['unsupported','clarify','confirm','cancel','bookings'].includes(r.action))return json({request:r});
  validateRequest(r);if(r.near&&!occupiedFor(rows,r.date).some(o=>o.name===r.near&&o.start<r.end&&o.end>r.start))return json({request:{...r,action:'clarify',message:'nearUnavailable',params:{name:r.near}}});return json(proposal(r,rows,body.replaceId));
 }
 if(body.action==='select'){const r={...body.request,count:body.request?.seatIds?.length};validateRequest(r);if(!r.count)throw new Error('chooseFirst');return json(proposal(r,rows,body.replaceId));}
 if(body.action==='book'){
  const r={...body.request};validateRequest(r);if(!r.seatIds?.length||r.seatIds.length!==r.count)throw new Error('invalidProposal');
  r.names=Array.from({length:r.count},(_,i)=>String(r.names?.[i]||(i?'colleague:'+i:'self')).slice(0,30));
  if(typeof body.proposalId!=='string'||body.proposalId.length>100)throw new Error('invalidProposal');
  const existing=rows.find(b=>b.id===body.proposalId&&b.kind==='booking');
  if(existing&&!body.replaceId){const booking=await reserve(db,user,r,body.proposalId);return json({ok:true,booking});}
  if(body.replaceId&&!rows.some(b=>b.id===body.replaceId&&b.kind==='booking'))throw new Error('notFound');
  const occupied=occupiedFor(rows,r.date,body.replaceId);
  if(!recommendSeats(r,occupied).length)return json({error:'unavailableProposal',conflict:true,...proposal({...r,seatIds:undefined},rows,body.replaceId)},409);
  try{if(body.simulateConflict){const allOccupied=occupiedFor(rows,r.date);let target:any=null;for(const seat of r.seatIds)for(let h=r.start;h<r.end;h++)if(!target&&!allOccupied.some(o=>o.seatId===seat&&o.start<=h&&o.end>h))target={seat,h};if(!target)throw new Error('cannotSimulate');await reserve(db,user,{...r,count:1,start:target.h,end:target.h+1,seatIds:[target.seat],names:['simulated']},crypto.randomUUID(),null,'simulation');}
  const booking=await reserve(db,user,r,body.proposalId,body.replaceId||null);return json({ok:true,booking});}
  catch(e:any){if(!/UNIQUE|constraint/i.test(e.message))throw e;const latest=await listBookings(db,user);return json({error:'conflictMessage',conflict:true,...proposal({...r,seatIds:undefined},latest,body.replaceId)},409);}
 }
 return json({error:'unsupportedAction'},400);
 }catch(e:any){console.error('Office request failed:',e.message);return json({error:e.message||'requestFailed'},400);}
}
