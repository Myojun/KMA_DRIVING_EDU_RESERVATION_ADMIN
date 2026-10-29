'use strict';
const noteDialog=document.getElementById('noteDialog');
document.getElementById('noteClose')?.addEventListener('click',()=>noteDialog.close());
const dialogs=[...document.querySelectorAll('dialog')];
function syncScroll(){document.body.classList.toggle('dialog-open',dialogs.some(dialog=>dialog.open));}
for(const dialog of dialogs){dialog.addEventListener('close',syncScroll);new MutationObserver(syncScroll).observe(dialog,{attributes:true,attributeFilter:['open']});}
if(location.protocol==='file:'){const p=document.createElement('p');p.className='callout';p.textContent='관리 기능은 HTTP(S) 서버에서 실행해 주세요.';document.getElementById('main')?.prepend(p);}

// The HTTP compatibility path is functional; recommend transport security without
// forcing an unverified HTTPS endpoint or changing browser security settings.
if(location.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname)){
 const notice=document.createElement('p');notice.className='connection-notice';notice.setAttribute('role','status');
 notice.append(document.createTextNode('HTTP 접속 중 · '));const secure=document.createElement('a');const url=new URL(location.href);url.protocol='https:';secure.href=url.href;secure.textContent='HTTPS로 접속';notice.append(secure);document.getElementById('main')?.prepend(notice);
}
