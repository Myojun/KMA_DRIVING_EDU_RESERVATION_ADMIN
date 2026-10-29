'use strict';
const noteDialog=document.getElementById('noteDialog');
document.getElementById('noteClose')?.addEventListener('click',()=>noteDialog.close());
const dialogs=[...document.querySelectorAll('dialog')];
function syncScroll(){document.body.classList.toggle('dialog-open',dialogs.some(dialog=>dialog.open));}
for(const dialog of dialogs){dialog.addEventListener('close',syncScroll);new MutationObserver(syncScroll).observe(dialog,{attributes:true,attributeFilter:['open']});}
if(location.protocol==='file:'){const p=document.createElement('p');p.className='callout';p.textContent='관리 기능은 HTTP(S) 서버에서 실행해 주세요.';document.getElementById('main')?.prepend(p);}
