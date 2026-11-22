export async function listBookings(db,scope){const {results}=await db.prepare('SELECT * FROM bookings WHERE scope = ? ORDER BY date,start,created').bind(scope).all();return results.map(row=>({...row,seats:JSON.parse(row.seats),names:JSON.parse(row.names)}));}
export async function reserve(db,scope,r,id,replaceId=null,kind='booking'){
 const fingerprint=JSON.stringify({date:r.date,start:r.start,end:r.end,seats:r.seatIds,names:r.names,replaceId,kind});
 async function replay(){const {results}=await db.prepare('SELECT * FROM booking_operations WHERE scope = ? AND id = ?').bind(scope,id).all();const op=results[0];if(!op)return null;if(op.request!==fingerprint)throw new Error('alreadyUsed');const row=(await listBookings(db,scope)).find(b=>b.id===op.booking_id);if(!row)throw new Error('alreadyCancelled');return row;}
 const prior=await replay();if(prior)return prior;
 const existing=(await listBookings(db,scope)).find(b=>b.id===(replaceId||id));
 if(replaceId&&(!existing||existing.kind!=='booking'))throw new Error('notFound');
 if(existing&&!replaceId){if(existing.date===r.date&&existing.start===r.start&&existing.end===r.end&&JSON.stringify(existing.seats)===JSON.stringify(r.seatIds))return existing;throw new Error('alreadyUsed');}
 const batch=[];
 if(replaceId){batch.push(db.prepare('DELETE FROM slots WHERE booking_id = ? AND scope = ?').bind(replaceId,scope));batch.push(db.prepare('UPDATE bookings SET date = ?, start = ?, end = ?, seats = ?, names = ? WHERE id = ? AND scope = ?').bind(r.date,r.start,r.end,JSON.stringify(r.seatIds),JSON.stringify(r.names),replaceId,scope));}
 else batch.push(db.prepare('INSERT INTO bookings (id,scope,date,start,end,seats,names,kind,created) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,scope,r.date,r.start,r.end,JSON.stringify(r.seatIds),JSON.stringify(r.names),kind,new Date().toISOString()));
 for(const seat of r.seatIds)for(let hour=r.start;hour<r.end;hour++)batch.push(db.prepare('INSERT INTO slots (scope,date,seat,hour,booking_id) VALUES (?,?,?,?,?)').bind(scope,r.date,seat,hour,replaceId||id));
 batch.push(db.prepare('INSERT INTO booking_operations (scope,id,booking_id,request) VALUES (?,?,?,?)').bind(scope,id,replaceId||id,fingerprint));
 try{await db.batch(batch);}catch(e){if(/UNIQUE|constraint/i.test(e.message)){const completed=await replay();if(completed)return completed;}throw e;}
 return (await listBookings(db,scope)).find(b=>b.id===(replaceId||id));
}
export async function cancel(db,scope,id){const booking=(await listBookings(db,scope)).find(b=>b.id===id&&b.kind==='booking');if(!booking)throw new Error('cancelNotFound');await db.batch([db.prepare('DELETE FROM slots WHERE booking_id = ? AND scope = ?').bind(id,scope),db.prepare('DELETE FROM bookings WHERE id = ? AND scope = ?').bind(id,scope)]);return {id};}
