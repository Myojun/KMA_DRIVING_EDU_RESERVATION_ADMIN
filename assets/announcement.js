import {$,status,dateOfTimestamp,deadline,explain,userError,confirmAction,fingerprint} from './admin-core.js?v=admin10-http';
import {firebase} from './firebase.js?v=admin10-http';
let busy=false,current=null,baseline=null,dirty=false,editorReady=false;
function lock(value){busy=value;for(const id of ['saveNotice','deleteNotice','reloadNotice','resetNotice','announcementText'])$(id).disabled=value;}
async function load(force=false){
 if(busy)return;lock(true);status('noticeStatus','공지사항 확인 중');
 try{const snapshot=await deadline((async()=>{const {f,db}=await firebase();return f.getDocFromServer(f.doc(db,'announcements','main'));})());current=snapshot.exists()?{data:snapshot.data(),hash:await fingerprint(snapshot.data())}:null;
 $('noticeContent').textContent=current?(typeof current.data.content==='string'?current.data.content:'내용이 없습니다.'):'등록된 공지사항이 없습니다.';const date=dateOfTimestamp(current?.data.updatedAt||current?.data.createdAt);$('noticeDate').hidden=!date;if(date){$('noticeDate').dateTime=date.toISOString();$('noticeDate').textContent='최근 수정 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium'}).format(date);}
 if(force||!dirty){baseline=current?.hash??null;$('announcementText').value=typeof current?.data.content==='string'?current.data.content:'';dirty=false;editorReady=true;$('charCount').textContent=`${$('announcementText').value.length} / 1000자`;$('saveNotice').textContent=current?'수정사항 저장':'작성하기';}
 status('noticeStatus','');
 }catch(error){status('noticeStatus',explain(error),'error');}finally{lock(false);}
}
$('reloadNotice').addEventListener('click',()=>load());$('resetNotice').addEventListener('click',()=>load(true));
$('announcementText').addEventListener('input',()=>{dirty=true;$('charCount').textContent=`${$('announcementText').value.length} / 1000자`;});
$('noticeForm').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!$('noticeForm').reportValidity())return;if(!editorReady){status('writeStatus','공지를 먼저 불러와 주세요.','error');return;}const content=$('announcementText').value.trim();if(!content||content.length>1000){status('writeStatus','내용은 1~1000자 이내로 입력해 주세요.','error');return;}
 const expected=baseline;lock(true);status('writeStatus','공지사항 저장 중');let saved=false;
 try{const {f,db}=await deadline(firebase());const ref=f.doc(db,'announcements','main');await f.runTransaction(db,async tx=>{const snapshot=await tx.get(ref);if(expected===null){if(snapshot.exists())throw userError('다른 곳에서 공지를 작성했습니다. 다시 불러와 주세요.');tx.set(ref,{content,createdAt:f.serverTimestamp(),updatedAt:f.serverTimestamp()});}else{if(!snapshot.exists()||await fingerprint(snapshot.data())!==expected)throw userError('공지사항이 변경되었습니다. 다시 불러온 뒤 수정해 주세요.');tx.update(ref,{content,updatedAt:f.serverTimestamp()});}});dirty=false;saved=true;
 }catch(error){status('writeStatus',explain(error),'error');}finally{lock(false);}if(saved){await load(true);status('writeStatus','공지사항을 저장했습니다.','success');}
});
$('deleteNotice').addEventListener('click',async()=>{
 if(busy)return;if(!current){status('writeStatus','삭제할 공지가 없습니다.','error');return;}const expected=current.hash;lock(true);const ok=await confirmAction({title:'공지 삭제',text:String(current.data.content??'')+'\n\n정말 삭제하시겠습니까?',label:'삭제하기'});if(!ok){lock(false);return;}let deleted=false;
 try{const {f,db}=await deadline(firebase());const ref=f.doc(db,'announcements','main');await f.runTransaction(db,async tx=>{const snapshot=await tx.get(ref);if(!snapshot.exists()||await fingerprint(snapshot.data())!==expected)throw userError('공지사항이 변경되었습니다. 다시 확인해 주세요.');tx.delete(ref);});dirty=false;deleted=true;
 }catch(error){status('writeStatus',explain(error),'error');}finally{lock(false);}if(deleted){await load(true);status('writeStatus','공지사항을 삭제했습니다.','success');}
});
load();
