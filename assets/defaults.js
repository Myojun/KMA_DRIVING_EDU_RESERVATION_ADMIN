import {$,status,TIMES,COURSES,userError} from './admin-core.js?v=admin10-http';
export const DEFAULTS_KEY='kma-driving-admin.capacity-defaults.v1';
export const ORIGINAL_DEFAULTS=[[4,3,2],[3,2,2],[4,3,2],[3,2,2],[0,0,0]];
export function validateDefaults(value){if(!Array.isArray(value)||value.length!==TIMES.length||value.some(row=>!Array.isArray(row)||row.length!==3||row.some(n=>!Number.isInteger(n)||n<0||n>99)))throw userError('저장된 기본값 형식이 올바르지 않습니다.');return value.map(row=>[...row]);}
export function readDefaults(storage){const raw=storage.getItem(DEFAULTS_KEY);if(raw===null)return null;const saved=JSON.parse(raw);if(saved.version!==1)throw userError('저장된 기본값 버전을 확인해 주세요.');const rows=saved.capacities;return validateDefaults(Array.isArray(rows)&&rows.length===4?[...rows,[0,0,0]]:rows);}
export function writeDefaults(storage,capacities){const valid=validateDefaults(capacities);storage.setItem(DEFAULTS_KEY,JSON.stringify({version:1,capacities:valid}));return valid;}
export function initDefaults(){
 const inputs=[...document.querySelectorAll('.capacity-input')];
 const apply=matrix=>{for(let t=0;t<TIMES.length;t++)for(let c=0;c<3;c++)inputs[t*3+c].value=matrix[t][c];};
 const read=()=>validateDefaults(TIMES.map(time=>COURSES.map(course=>{const el=inputs.find(x=>x.dataset.time===time&&x.dataset.course===course);if(el.value.trim()==='')throw userError('모든 정원을 입력해 주세요.');return Number(el.value);}))); 
 const load=()=>{try{const saved=readDefaults(localStorage);apply(saved||ORIGINAL_DEFAULTS);status('defaultsStatus',saved?'저장된 기본값 적용':'초기 기본값 적용');}catch{apply(ORIGINAL_DEFAULTS);status('defaultsStatus','기본값을 읽지 못했습니다. 브라우저 저장소 설정을 확인하거나 새 기본값을 저장해 주세요.','error');}};
 $('saveDefaults').addEventListener('click',()=>{try{writeDefaults(localStorage,read());status('defaultsStatus','기본값 저장 완료','success');}catch(error){status('defaultsStatus',error.message.startsWith('USER:')?error.message.slice(5):'기본값을 저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.','error');}});
 $('loadDefaults').addEventListener('click',load);
 $('resetDefaults').addEventListener('click',()=>{apply(ORIGINAL_DEFAULTS);status('defaultsStatus','초기값 적용 · 저장하려면 기본값 저장을 눌러 주세요.');});
 window.addEventListener('storage',event=>{if(event.key===DEFAULTS_KEY)status('defaultsStatus','다른 탭에서 기본값 변경됨 · 저장값 불러오기');});
 load();return {load};
}
