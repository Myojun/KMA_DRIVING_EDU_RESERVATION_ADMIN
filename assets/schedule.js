import {$,status,todayKey,validDate,TIMES,COURSES,deadline,explain,userError,confirmAction,seedState} from './admin-core.js?v=admin9-cards';
import {firebase,activeRecords} from './firebase.js?v=admin9-cards';
import {deletionPreview,previewTotals,assertFresh,sameManifest,deleteManifest} from './db-data.js?v=admin9-cards';
import {configFingerprint,capacityShortages} from './schedule-model.js?v=admin9-cards';
import {chooseCapacityCancellations} from './capacity-dialog.js?v=admin9-cards';
import {saveSchedule} from './schedule-save.js?v=admin9-cards';
import {initDefaults} from './defaults.js?v=admin9-cards';
const defaults=initDefaults();$('createDate').value=todayKey();let busy=false,loadedDate=null,loaded=null,baseline=null,loadVersion=0,deleting=false;
function lock(value){busy=value;for(const id of ['createDate','loadSchedule','createButton','deleteScheduleButton','saveDefaults','loadDefaults','resetDefaults'])$(id).disabled=value;document.querySelectorAll('.capacity-input').forEach(input=>input.disabled=value);}
function capacities(){const result={};for(const time of TIMES){result[time]={};for(const course of COURSES){const input=document.querySelector(`.capacity-input[data-time="${time}"][data-course="${course}"]`);if(input.value.trim()==='')throw userError('모든 정원을 입력해 주세요.');result[time][course]=Number(input.value);}}return result;}
function apply(data){for(const time of TIMES)for(const course of COURSES)document.querySelector(`.capacity-input[data-time="${time}"][data-course="${course}"]`).value=data.timeSlots?.[time]?.[course]?.maxCapacity??0;}
async function load(){
 if(busy)return;const date=$('createDate').value;if(!validDate(date))return;const version=++loadVersion;lock(true);loadedDate=null;status('createStatus','교육 일정 확인 중');
 try{const snapshot=await deadline((async()=>{const {f,db}=await firebase();return f.getDocFromServer(f.doc(db,'availableDates',date));})());if(version!==loadVersion)return;loaded=snapshot.exists()?snapshot.data():null;baseline=loaded?await configFingerprint(loaded):null;loadedDate=date;if(loaded){apply(loaded);status('defaultsStatus','');}else defaults.load();$('scheduleMode').textContent=loaded?'개설된 교육':'신규 교육';$('createButton').textContent=loaded?'수정사항 저장':'개설하기';status('createStatus',loaded?'기존 예약은 유지됩니다.':'');
 }catch(error){loadedDate=null;status('createStatus',explain(error),'error');}finally{if(version===loadVersion)lock(false);}
}
$('loadSchedule').addEventListener('click',load);$('createDate').addEventListener('change',load);
$('createForm').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!$('createForm').reportValidity())return;const date=$('createDate').value;if(!validDate(date))return;if(date!==loadedDate){status('createStatus','먼저 해당 날짜를 불러와 주세요.','error');return;}
 let values;try{values=capacities();}catch(error){status('createStatus',explain(error),'error');return;}
 const expected=baseline,creating=!loaded;lock(true);status('createStatus',creating?'교육 개설 중':'교육 수정 중');let saved=false;
 let cancelledCount=0;
 try{const {f,db}=await deadline(firebase());const ref=f.doc(db,'availableDates',date);const [snapshot,records]=await deadline(Promise.all([f.getDocFromServer(ref),activeRecords(f,db,date)]));
  if(snapshot.exists()===creating)throw userError('교육 개설 상태가 변경되었습니다. 다시 불러와 주세요.');const current=snapshot.exists()?snapshot.data():{};
  if(!creating&&await configFingerprint(current)!==expected)throw userError('다른 곳에서 교육을 수정했습니다. 다시 불러와 주세요.');
  const seed=await seedState(records),shortages=capacityShortages(current,values,seed);
  let selected=[];
  if(shortages.length){selected=await chooseCapacityCancellations(shortages,records);if(selected===null){status('createStatus','수정을 취소했습니다.');return;}}
  status('createStatus',selected.length?'예약 취소 및 정원 저장 중':creating?'교육 개설 중':'교육 수정 중');
  const result=await saveSchedule(f,db,{date,capacities:values,seed,creating,expected,cancellations:selected});cancelledCount=result.cancelledCount;saved=true;
 }catch(error){status('createStatus',explain(error),'error');}finally{lock(false);}
 if(saved){await load();status('createStatus',creating?'교육을 개설했습니다.':cancelledCount?`예약 ${cancelledCount}건을 취소하고 교육을 수정했습니다.`:'교육을 수정했습니다.','success');}
});
$('deleteScheduleButton').addEventListener('click',async()=>{
 if(busy)return;const date=$('createDate').value;if(!validDate(date))return;lock(true);let started=false;
 try{status('createStatus','삭제 대상 확인 중');const {f,db}=await deadline(firebase());const manifest=await deletionPreview(f,db,date,date);if(!manifest.entries.length){status('createStatus','삭제할 데이터가 없습니다.');return;}const total=previewTotals(manifest);
 const ok=await confirmAction({title:'교육 삭제',text:`${date}\n교육 일정 ${total.dates}건 · 예약 ${total.reservations}건\n\n정말 삭제하시겠습니까?`,label:'삭제하기'});if(!ok){status('createStatus','삭제를 취소했습니다.');return;}
 assertFresh(manifest,date,date);const latest=await deletionPreview(f,db,date,date);if(!sameManifest(manifest,latest))throw userError('삭제 대상이 변경되었습니다. 다시 확인해 주세요.');started=true;deleting=true;const count=await deleteManifest(f,db,manifest,(done,total)=>status('createStatus',`${done} / ${total}개 삭제 확인 완료`));loadedDate=null;loaded=null;baseline=null;status('createStatus',`${count}개 문서를 삭제했습니다.`,'success');$('scheduleMode').textContent='신규 교육';$('createButton').textContent='개설하기';
 }catch(error){status('createStatus',explain(error)+(started?` 삭제 확인 ${error.confirmedDeleted||0}개. 남은 데이터를 다시 조회해 주세요.`:''),'error');}
 finally{deleting=false;lock(false);}
});
window.addEventListener('beforeunload',event=>{if(deleting){event.preventDefault();event.returnValue='';}});
load();
