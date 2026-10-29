import {$,node,sorted,userError} from './admin-core.js?v=admin11-slots';
export function chooseCapacityCancellations(groups,records){
 const total=groups.reduce((n,g)=>n+g.needed,0);
 if(total>150)throw userError('한 번에 150건까지 취소할 수 있습니다. 정원을 나누어 조정해 주세요.');
 const prepared=groups.map(g=>({...g,records:sorted(records.filter(r=>r.status==='예약됨'&&r.time===g.time&&r.courseType===g.course))}));
 if(prepared.some(g=>g.records.length<g.needed))throw userError('예약 집계와 조회 내역이 일치하지 않습니다. 예약 내역을 확인해 주세요.');
 const dialog=$('capacityDialog'),previous=document.activeElement;let result=null;
 $('capacitySummary').textContent=`정원을 변경하려면 예약 ${total}건을 취소해야 합니다.`;$('capacityGroups').replaceChildren();
 const inputs=[];
 prepared.forEach((group,index)=>{
  const section=node('section',undefined,'capacity-group'),title=node('h3',`${group.time} · ${group.course}`);title.id=`capacity-group-${index}`;section.setAttribute('aria-labelledby',title.id);section.append(title,node('p',`예약 ${group.current}명 → 정원 ${group.max}명 · ${group.needed}명 취소 필요`,'small'));
  for(const record of group.records){const label=node('label',undefined,'capacity-choice'),input=node('input');input.type='checkbox';input.setAttribute('aria-label',`${record.name||'이름 없음'} ${record.phone||''} 예약 취소 선택`);const text=node('span');text.append(node('strong',record.name||'이름 없음'),node('span',`${record.grade??'-'}학년 · ${record.unit??'-'}중대 · ${record.phone||'번호 없음'}`,'capacity-person'));label.append(input,text);section.append(label);inputs.push({input,record,index});}
  $('capacityGroups').append(section);
 });
 const update=()=>{let complete=true;let selected=0;prepared.forEach((group,index)=>{const chosen=inputs.filter(x=>x.index===index&&x.input.checked).length;selected+=chosen;if(chosen!==group.needed)complete=false;for(const item of inputs.filter(x=>x.index===index))item.input.disabled=!item.input.checked&&chosen>=group.needed;});$('capacityConfirm').disabled=!complete;$('capacityStatus').textContent=`취소 선택 ${selected} / ${total}건`;};
 update();
 return new Promise(resolve=>{
  const yes=()=>{if(!$('capacityConfirm').disabled){result=inputs.filter(x=>x.input.checked).map(x=>x.record);dialog.close();}};
  const no=()=>dialog.close();const close=()=>{for(const item of inputs)item.input.removeEventListener('change',update);$('capacityConfirm').removeEventListener('click',yes);$('capacityBack').removeEventListener('click',no);previous?.focus();resolve(result);};
  for(const item of inputs)item.input.addEventListener('change',update);$('capacityConfirm').addEventListener('click',yes);$('capacityBack').addEventListener('click',no);dialog.addEventListener('close',close,{once:true});dialog.showModal();
 });
}
