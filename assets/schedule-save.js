import {configFingerprint,updateScheduleModel} from './schedule-model.js?v=admin11-slots';
import {cancelled,validDate,TIMES,COURSES,normalizePhone,phoneHash,release,userError} from './admin-core.js?v=admin11-slots';
import {cloneState} from './core.js?v=admin11-slots';
// Only reads occur until every selected cancellation and the new capacity is valid.
// The reservations and schedule are committed together, or none are changed.
export async function saveSchedule(f,db,{date,capacities,seed,creating,expected,cancellations=[]}){
 if(!validDate(date))throw userError('날짜를 확인해 주세요.');if(cancellations.length>150)throw userError('한 번에 150건까지 취소할 수 있습니다.');
 if(new Set(cancellations.map(r=>r.id)).size!==cancellations.length)throw userError('중복 선택된 예약이 있습니다.');
 const ref=f.doc(db,'availableDates',date);
 return f.runTransaction(db,async tx=>{
  const snapshot=await tx.get(ref);if(snapshot.exists()===creating)throw userError('교육 개설 상태가 변경되었습니다. 다시 불러와 주세요.');let data=snapshot.exists()?snapshot.data():{};
  if(!creating&&await configFingerprint(data)!==expected)throw userError('다른 곳에서 교육을 수정했습니다. 다시 불러와 주세요.');
  const changes=[];let state=cloneState(data,seed);
  for(const chosen of cancellations){
   if(!chosen.id||chosen.date!==date||!TIMES.includes(chosen.time)||!COURSES.includes(chosen.courseType))throw userError('취소할 예약을 다시 확인해 주세요.');
   const reservationRef=f.doc(db,'reservations',chosen.id),reservation=await tx.get(reservationRef);if(!reservation.exists())throw userError('예약 내역이 변경되었습니다. 다시 불러와 주세요.');const current=reservation.data();
   if(cancelled(current))continue;
   const phone=normalizePhone(current.phone);
   if(current.status!=='예약됨'||current.date!==date||current.time!==chosen.time||current.courseType!==chosen.courseType||!phone||phone!==normalizePhone(chosen.phone))throw userError('예약 내역이 변경되었습니다. 다시 불러와 주세요.');
   const hash=await phoneHash(phone);state=release({...data,bookingState:state},null,hash,chosen.id,current.time,current.courseType);changes.push(reservationRef);
  }
  const model=updateScheduleModel({...data,bookingState:state},capacities,null,{creating});
  for(const reservationRef of changes)tx.update(reservationRef,{status:'취소됨',canceledAt:f.serverTimestamp(),updatedAt:f.serverTimestamp(),canceledBy:'admin'});
  if(creating)tx.set(ref,{date,isActive:true,...model,createdAt:f.serverTimestamp(),updatedAt:f.serverTimestamp(),createdBy:'admin'});
  else tx.update(ref,{...model,updatedAt:f.serverTimestamp(),updatedBy:'admin'});
  return {cancelledCount:changes.length};
 });
}
