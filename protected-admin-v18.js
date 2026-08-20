(()=>{
 const PRIMARY='andre';
 const isPrimaryProfile=p=>String(p?.username||'').toLowerCase()===PRIMARY;
 const protectUsersUI=()=>{
   try{
     document.querySelectorAll('#content table tbody tr').forEach(tr=>{
       const cells=tr.querySelectorAll('td');
       if(cells.length<6)return;
       const username=(cells[1]?.textContent||'').trim().toLowerCase();
       if(username!==PRIMARY)return;
       if(!cells[0].querySelector('.protectedAdminBadge'))cells[0].insertAdjacentHTML('beforeend','<br><span class="protectedAdminBadge">ADMIN PRINCIPAL PROTEGIDO</span>');
       cells[4].innerHTML='<span class="badge good">ATIVO</span>';
       cells[5].innerHTML='<span class="protectedAdminAction">CONTA PROTEGIDA</span>';
     });
   }catch(e){console.warn('V18 protect users UI',e)}
 };
 const protectAccountUI=()=>{
   try{
     const input=document.getElementById('myUsername');
     const identity=[...document.querySelectorAll('.accountIdentity span')].find(x=>String(x.textContent||'').trim().toLowerCase()==='@andre');
     const username=String(input?.value||identity?.textContent||'').replace(/^@/,'').trim().toLowerCase();
     if(username!==PRIMARY)return;
     if(input){input.value=PRIMARY;input.readOnly=true;input.classList.add('protectedAdminReadonly');}
     const card=[...document.querySelectorAll('.accountCard')].find(x=>/Segurança da conta/i.test(x.textContent||''));
     if(card&&!card.querySelector('.protectedAdminNotice')){
       const box=document.createElement('div');box.className='protectedAdminNotice';box.innerHTML='<b>Conta principal protegida.</b><br>O usuário andre, perfil Admin, escopo global, permissões e status não podem ser alterados ou excluídos por ninguém no sistema. Você pode alterar apenas a sua própria senha.';
       const passBox=card.querySelector('.passwordChangeBox');card.insertBefore(box,passBox||null);
     }
   }catch(e){console.warn('V18 protect account UI',e)}
 };
 const guard=(name,message)=>{
   const original=globalThis[name];if(typeof original!=='function')return;
   globalThis[name]=function(...args){
     try{const id=args[0],p=typeof profile==='function'?profile(id):null;if(isPrimaryProfile(p)){typeof toast==='function'&&toast(message,'warn');return;}}catch{}
     return original.apply(this,args);
   };
 };
 guard('openUser','Administrador Principal 1 (andre) é uma conta protegida e não pode ser editada.');
 guard('toggleUserActive','A conta andre é protegida e não pode ser desativada.');
 guard('confirmDeleteUser','Administrador Principal 1 (andre) é protegido e nunca pode ser excluído.');
 guard('deleteUser','Administrador Principal 1 (andre) é protegido e nunca pode ser excluído.');
 const run=()=>{protectUsersUI();protectAccountUI()};
 const obs=new MutationObserver(()=>setTimeout(run,0));
 window.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{childList:true,subtree:true});run()});
 window.addEventListener('focus',run);
 setInterval(run,3000);
})();