import {TIMES,COURSES,cloneState,slotKey,userError} from './core.js?v=admin11-slots';
import {fingerprint} from './admin-core.js?v=admin11-slots';
export function scheduleConfig(data){
 if(!data)return null;const slots={};
 for(const [time,courses] of Object.entries(data.timeSlots||{})){
  slots[time]={};for(const [course,slot] of Object.entries(courses||{})){const {currentCount,...config}=slot||{};slots[time][course]=config;}
 }
 return {date:data.date??null,isActive:data.isActive??null,timeSlots:slots};
}
export const configFingerprint=data=>fingerprint(scheduleConfig(data));
export function updateScheduleModel(data,capacities,seed,{creating=false}={}){
 const state=cloneState(data||{},seed),slots={...(data?.timeSlots||{})};
 for(const time of TIMES){
  const existing=slots[time]||{},next={...existing};
  for(const course of COURSES){
   const max=capacities?.[time]?.[course];if(!Number.isInteger(max)||max<0||max>99)throw userError('정원은 0~99 사이 정수로 입력해 주세요.');
   const count=state.counts[slotKey(time,course)]||0;if(count>max)throw userError(`${time} ${course}: 현재 예약 ${count}명보다 정원을 낮출 수 없습니다.`);
   if(!creating&&!existing[course]&&max===0)continue;
   const old=existing[course]||{};const unchanged=old.maxCapacity===max;
   next[course]={...old,maxCapacity:max,currentCount:count,isAvailable:max>0&&(unchanged?old.isAvailable!==false:true)};
  }
  // Preserve missing legacy times: a zero row alone never adds a new DB field.
  if(creating||Object.keys(next).length)slots[time]=next;
 }
 return {timeSlots:slots,bookingState:state};
}

export function capacityShortages(data,capacities,seed){const state=cloneState(data||{},seed),groups=[];for(const time of TIMES)for(const course of COURSES){const max=capacities?.[time]?.[course];if(!Number.isInteger(max)||max<0||max>99)throw userError('정원은 0~99 사이 정수로 입력해 주세요.');const count=state.counts[slotKey(time,course)]||0;if(count>max)groups.push({time,course,current:count,max,needed:count-max});}return groups;}
