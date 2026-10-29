import {node,sorted,cancelled,smsURI,showNote} from './admin-core.js?v=admin10-http';
export function renderReservationCards(container,records,onCancel){
 container.replaceChildren();
 for(const r of sorted(records)){
  const ended=cancelled(r),active=r.status==='예약됨';
  const card=node('article',undefined,'admin-reservation-card'+(ended?' is-cancelled':''));
  card.setAttribute('aria-label',`${r.name||'이름 없음'} ${r.time||''} ${r.courseType||''} ${ended?'취소됨':r.status||'상태 확인'}`);
  const top=node('div',undefined,'rc-top'),identity=node('div',undefined,'rc-identity');
  identity.append(node('h3',r.name||'이름 없음','rc-name'),node('span',`${r.grade??'-'}학년 · ${r.unit??'-'}중대`,'rc-unit'));
  const badge=node('span',ended?'취소됨':r.status||'상태 확인','rc-status'+(ended?' is-cancelled':!active?' is-unknown':''));
  top.append(identity,badge);card.append(top);
  const course=node('p',undefined,'rc-course');course.append(node('span',r.time||'시간 미입력','rc-time'),node('span',' · ','rc-separator'),node('span',r.courseType||'교육 미입력'));card.append(course);
  const bottom=node('div',undefined,'rc-bottom');bottom.append(node('p',r.phone||'번호 미입력','rc-phone'));
  const actions=node('div',undefined,'rc-actions');
  try{const sms=node('a','💬','rc-icon');sms.href=smsURI(r);sms.setAttribute('aria-label',`${r.name||'예약자'} 문자 보내기`);sms.title='문자 보내기';actions.append(sms);}catch{const unavailable=node('span','—','rc-icon-placeholder');unavailable.setAttribute('aria-label','문자 보내기 불가: 전화번호 또는 날짜 확인 필요');actions.append(unavailable);}
  if(typeof r.note==='string'&&r.note.trim()){
   const note=node('button','📝','rc-icon');note.type='button';note.setAttribute('aria-label',`${r.name||'예약자'} 비고 보기`);note.title='비고';note.addEventListener('click',()=>showNote(r.note));actions.append(note);
  }else{const none=node('span','-','rc-icon-placeholder');none.setAttribute('aria-label','비고 없음');actions.append(none);}
  if(active){const cancel=node('button','❌','rc-icon rc-cancel');cancel.type='button';cancel.setAttribute('aria-label',`${r.name||'예약자'} 예약 취소`);cancel.title='예약 취소';cancel.addEventListener('click',()=>onCancel(r));actions.append(cancel);}else{const none=node('span','-','rc-icon-placeholder');none.setAttribute('aria-label',ended?'이미 취소된 예약':'취소할 수 없는 상태');actions.append(none);}
  bottom.append(actions);card.append(bottom);container.append(card);
 }
}
