window.confirmDeleteUser=id=>{
 if(state.profile?.role!=="admin")return toast("Somente Admin pode excluir usuários definitivamente.","warn");
 const p=profile(id);if(!p)return;
 if(p.id===PRIMARY_ADMIN_ID)return toast("O Admin Principal é protegido e nunca pode ser excluído.","warn");
 if(p.id===state.profile.id)return toast("Você não pode excluir a própria conta logada.","warn");
 const readCount=state.readings.filter(r=>r.created_by===id).length;
 showModal(`<div class="modalHead"><div><span class="eyebrow">AÇÃO DE ADMIN</span><h2>Excluir usuário?</h2></div><button class="x" onclick="closeModal()">×</button></div>
 <div class="notice" style="background:#fff3f3;border-color:#efc8c8;color:#862c2c"><b>${esc(p.full_name)} (@${esc(p.username)})</b><br>A conta de acesso será removida. Esta ação não pode ser desfeita.</div>
 <div class="deleteSummary"><div><small>Perfil</small><b>${esc(roleLabel(p.role))}</b></div><div><small>Escopo</small><b>${p.access_scope==="global"?"Rede":esc(store(p.store_id)?.name||"—")}</b></div><div><small>Coletas feitas</small><b>${readCount}</b></div></div>
 ${readCount?'<div class="notice">Este usuário possui coletas registradas. Se o banco impedir a exclusão para preservar rastreabilidade, desative a conta em vez de excluir.</div>':""}
 <div class="modalActions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger" onclick="deleteUser('${id}')">Excluir definitivamente</button></div>`);
};
window.deleteUser=async id=>{
 const p=profile(id);if(!p)return;
 if(state.profile?.role!=="admin")return toast("Somente Admin pode excluir usuários.","warn");
 if(p.id===state.profile.id)return toast("Você não pode excluir sua própria conta.","warn");
 showLoad(true);
 try{await callManageUser({action:"delete",user_id:id});closeModal();toast("Usuário excluído definitivamente.","good");await fetchAll();renderUsers()}
 catch(e){toast("Não foi possível excluir. "+e.message,"bad")}
 finally{showLoad(false)}
};


function renderAudit(){
 const rows=state.audit.map(a=>`<tr><td>${new Date(a.created_at).toLocaleString("pt-BR")}</td><td>${esc(profile(a.user_id)?.username||a.user_id||"sistema")}</td><td><b>${esc(a.action)}</b></td><td>${esc(a.entity_type||"—")}</td><td>${esc(a.details?JSON.stringify(a.details):"—")}</td></tr>`).join("");
 document.getElementById("content").innerHTML=`<section class="panel"><div class="tableWrap"><table><thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Sem eventos.</td></tr>'}</tbody></table></div></section>`;
}
function renderAccount(){
 const scope=state.profile.access_scope==="global"?"Rede inteira":(store(state.profile.store_id)?.name||"—");
 const perms=effectivePerms().map(p=>PERMS[p]).filter(Boolean);
 const isAdmin=state.profile.role==="admin";
 const primary=isPrimaryAdmin();
 document.getElementById("content").innerHTML=`
 <div class="accountGrid">
   <section class="accountCard">
     <h2>Meu acesso</h2>
     <div class="accountIdentity">
       <b>${esc(state.profile.full_name)}</b>
       <span>@${esc(state.profile.username)}</span>
       ${primary?'<span class="securityPrimary">ADMIN PRINCIPAL PROTEGIDO</span>':""}
     </div>
     <div class="accountMeta">
       <div><small>Perfil</small><b>${esc(roleLabel(state.profile.role))}</b></div>
       <div><small>Escopo</small><b>${esc(scope)}</b></div>
       <div><small>Status</small><b>Ativo</b></div>
       <div><small>Proteção</small><b>${primary?"Máxima":"Padrão reforçado"}</b></div>
     </div>
   </section>

   <section class="accountCard">
     <h2>Segurança da conta</h2>
     <div class="securityBanner"><b>${primary?"Admin Principal protegido":"Alteração protegida"}</b>${primary?"Ninguém pode excluir, desativar ou alterar seu perfil. Você mesmo pode trocar seu nome de usuário e sua senha, confirmando a senha atual.":"Para alterar suas credenciais, confirme primeiro sua senha atual."}</div>

     ${isAdmin?`
       <label>Nome de usuário</label>
       <input id="myUsername" value="${esc(state.profile.username)}" autocomplete="username" oninput="updatePasswordSecurityHint('myPassword','myPasswordHint','myUsername')">
       <div class="passwordHint">Admins podem alterar o próprio nome de usuário. A proteção do Admin Principal continua ativa mesmo depois da troca.</div>
     `:`
       <div class="accountReadonly"><small>Nome de usuário</small><b>@${esc(state.profile.username)}</b></div>
     `}

     <div class="passwordCurrentBox">
       <label>Senha atual</label>
       <input id="myCurrentPassword" type="password" autocomplete="current-password" placeholder="Obrigatória para confirmar qualquer alteração">
       <div class="passwordHint">Usada apenas para confirmar sua identidade. O sistema não exibe nem armazena sua senha em texto visível.</div>
     </div>

     <div class="passwordChangeBox">
       <h3>Alterar minha senha</h3>
       <p>Use uma senha forte. Após salvar, será necessário entrar novamente.</p>
       <div class="passwordFields">
         <div><label>Nova senha</label><input id="myPassword" type="password" autocomplete="new-password" placeholder="Mínimo de 10 caracteres" oninput="updatePasswordSecurityHint('myPassword','myPasswordHint','myUsername')"></div>
         <div><label>Confirmar nova senha</label><input id="myPasswordConfirm" type="password" autocomplete="new-password" placeholder="Digite a mesma senha"></div>
       </div>
       <div id="myPasswordHint" class="passwordStrengthLine">10+ caracteres • maiúscula • minúscula • número • especial • sem espaços.</div>
       <div class="securityRules"><strong>Regras:</strong> não pode conter o nome de usuário nem termos previsíveis como “admin”, “senha” ou “centraltemp”.</div>
       <div class="actions" style="margin-top:11px"><button class="btn primary" onclick="saveMyAccount()">Salvar credenciais</button></div>
     </div>
   </section>

   <section class="accountCard accountWide">
     <div class="panelHead"><div><span class="eyebrow">ACESSO ATUAL</span><h2>Permissões disponíveis</h2></div><span class="muted" style="font-size:10px">${perms.length} permissão(ões)</span></div>
     <div class="permissionList">${perms.map(x=>`<div class="permissionItem">${esc(x)}</div>`).join("")||'<div class="muted">Nenhuma permissão adicional disponível.</div>'}</div>
   </section>
 </div>`;
}

window.saveMyAccount=async()=>{
 const currentPassword=val("myCurrentPassword");
 const password=val("myPassword");
 const confirmPassword=val("myPasswordConfirm");
 const isAdmin=state.profile.role==="admin";
 const username=isAdmin?val("myUsername").trim().toLowerCase():state.profile.username;
 const usernameChanged=isAdmin&&username!==state.profile.username;

 if(isAdmin&&!validUsernameSecure(username))return toast("Nome de usuário inválido. Use 3 a 40 caracteres, sem espaços, começando e terminando com letra ou número.","warn");
 if(!password&&!usernameChanged)return toast("Altere o nome de usuário ou informe uma nova senha.","warn");
 if(!currentPassword)return toast("Informe sua senha atual para confirmar a alteração.","warn");

 if(password){
   const errors=passwordSecurityErrors(password,username);
   if(errors.length)return toast("A nova senha ainda não atende à segurança exigida: "+errors.join(", ")+".","warn");
   if(password!==confirmPassword)return toast("As duas senhas não são iguais.","warn");
   if(password===currentPassword)return toast("A nova senha precisa ser diferente da senha atual.","warn");
 }

 showLoad(true);
 try{
   await callManageUser({action:"self_update",username,current_password:currentPassword,password});
   toast(usernameChanged&&password?"Usuário e senha alterados com sucesso. Entre novamente.":usernameChanged?"Nome de usuário alterado com sucesso. Entre novamente.":"Senha alterada com sucesso. Entre novamente.","good");
   await sb.auth.signOut();
   state.session=null;state.profile=null;
   setTimeout(()=>location.reload(),700);
 }catch(e){
   toast("Não foi possível alterar sua conta: "+(e?.message||e),"bad");
 }finally{showLoad(false)}
};

function val(id){return document.getElementById(id)?.value??""}
function showModal(content,closable=true){
 const host=document.getElementById("modalHost");if(!host)return;
 host.innerHTML="";
 const overlay=document.createElement("div");overlay.className="modal";
 if(closable)overlay.addEventListener("click",event=>{if(event.target===overlay)closeModal()});
 const box=document.createElement("div");box.className="modalBox";box.innerHTML=String(content??"");
 overlay.appendChild(box);host.appendChild(overlay);
}
window.closeModal=()=>{const host=document.getElementById("modalHost");if(host)host.innerHTML=""};

if(configured){
 sb.auth.onAuthStateChange((event,session)=>{
  if(session)state.session=session;
  if(event==="SIGNED_OUT"){
   state.session=null;state.profile=null;document.body.classList.remove("app-open","vx-network-page","mobile-nav-open");
   document.getElementById("app")?.classList.add("hidden");document.getElementById("loginPage")?.classList.remove("hidden");
  }
 });
}else document.getElementById("configWarning").classList.remove("hidden");
boot();
