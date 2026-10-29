import {$,status,todayKey,validDate,TIMES,COURSES,cancelled,confirmAction,deadline,explain,userError,phoneHash,normalizePhone,release,slotKey} from './admin-core.js?v=admin9-cards';
import {firebase,initialState} from './firebase.js?v=admin9-cards';
import {renderReservationCards} from './reservation-cards.js?v=admin9-cards';
const params=new URLSearchParams(location.search),requested=params.get('date');
$('searchDate').value=validDate(requested)?requested:todayKey();
let records=[],loadedDate=null,searching=false,cancelling=false,version=0;
function setBusy(value){$('searchButton').disabled=value;$('searchDate').disabled=value;for(const id of ['filterAll','filterBooked','filterCancelled'])$(id).disabled=value;}
function render(){
 const shown=records.filter(r=>cancelled(r)?$('filterCancelled').checked:$('filterBooked').checked);
 renderReservationCards($('reservationCards'),shown,cancel);
 $('resultCaption').textContent=loadedDate?`${loadedDate.replaceAll('-','.')} · ${shown.length}건`:'';
 if(loadedDate)status('searchStatus',shown.length?'':records.length?'선택한 상태의 예약이 없습니다.':'해당 날짜에 예약이 없습니다.');
}
async function search(){
 if(searching||cancelling)return false;const date=$('searchDate').value;if(!validDate(date))return false;const token=++version;searching=true;setBusy(true);records=[];loadedDate=null;render();$('reservationCards').setAttribute('aria-busy','true');status('searchStatus','예약 조회 중');
 try{const snapshot=await deadline((async()=>{const {f,db}=await firebase();return f.getDocsFromServer(f.query(f.collection(db,'reservations'),f.where('date','==',date)));})());if(token!==version)return false;records=snapshot.docs.map(d=>({...d.data(),id:d.id}));loadedDate=date;render();return true;
 }catch(error){if(token===version)status('searchStatus',explain(error),'error');return false;
 }finally{if(token===version){searching=false;setBusy(false);$('reservationCards').setAttribute('aria-busy','false');}}
}
$('searchForm').addEventListener('submit',event=>{event.preventDefault();if($('searchForm').reportValidity())search();});
$('searchDate').addEventListener('change',()=>{version++;records=[];loadedDate=null;render();status('searchStatus','조회하기를 눌러 주세요.');});
$('filterAll').addEventListener('change',()=>{$('filterBooked').checked=$('filterCancelled').checked=$('filterAll').checked;render();});
for(const id of ['filterBooked','filterCancelled'])$(id).addEventListener('change',()=>{$('filterAll').checked=$('filterBooked').checked&&$('filterCancelled').checked;render();});
async function cancel(r){
 if(searching||cancelling)return;cancelling=true;setBusy(true);
 const confirmed=await confirmAction({title:'예약 취소',text:`${r.name}\n${r.date} ${r.time} ${r.courseType}\n\n예약을 취소하시겠습니까?`,label:'예약 취소'});
 if(!confirmed){cancelling=false;setBusy(false);return;}
 status('searchStatus','예약 취소 중');let outcome='',kind='success';
 try{if(!validDate(r.date)||!TIMES.includes(r.time)||!COURSES.includes(r.courseType))throw userError('예약 정보를 확인해 주세요.');const phone=normalizePhone(r.phone);if(!phone)throw userError('전화번호를 확인해 주세요.');const {f,db}=await deadline(firebase());const ref=f.doc(db,'reservations',r.id),dateRef=f.doc(db,'availableDates',r.date);const [seed,hash]=await deadline(Promise.all([initialState(f,db,r.date),phoneHash(phone)]));
 await f.runTransaction(db,async tx=>{const snapshot=await tx.get(ref);if(!snapshot.exists())throw userError('예약이 존재하지 않습니다.');const current=snapshot.data();if(cancelled(current))return;if(current.status!=='예약됨'||current.date!==r.date||current.time!==r.time||current.courseType!==r.courseType||normalizePhone(current.phone)!==phone)throw userError('예약이 변경되었습니다. 다시 조회해 주세요.');const date=await tx.get(dateRef);if(date.exists()){const data=date.data(),state=release(data,seed,hash,r.id,current.time,current.courseType);const patch={bookingState:state};if(data.timeSlots?.[current.time]?.[current.courseType])patch[`timeSlots.${current.time}.${current.courseType}.currentCount`]=state.counts[slotKey(current.time,current.courseType)];tx.update(dateRef,patch);}tx.update(ref,{status:'취소됨',canceledAt:f.serverTimestamp(),updatedAt:f.serverTimestamp(),canceledBy:'admin'});});outcome='예약을 취소했습니다.';
 }catch(error){outcome=explain(error)+' 예약 상태를 다시 조회해 주세요.';kind='error';}finally{cancelling=false;setBusy(false);}
 const refreshed=await search();status('searchStatus',outcome+(refreshed?'':' 내역을 다시 조회해 주세요.'),kind);
}
window.addEventListener('pagehide',()=>{version++;records=[];loadedDate=null;$('reservationCards').replaceChildren();});
window.addEventListener('pageshow',event=>{if(event.persisted){searching=false;cancelling=false;setBusy(false);$('resultCaption').textContent='';$('reservationCards').setAttribute('aria-busy','false');status('searchStatus','날짜를 선택하고 조회해 주세요.');}});
