function renderReports(){
 const rs=readingsInAnalysisPeriod(),rec=recurrenceData(),recurring=rec.filter(x=>x.recurring),dev=rs.filter(r=>isReadingOutOfRange(r)),problems=filteredEquipment().filter(e=>e.operational_status&&e.operational_status!=="operational");
 const rows=rec.slice(0,20).map(x=>`<tr><td data-label="Equipamento"><b>${esc(x.equipment?.name||"—")}</b></td><td data-label="Loja">${esc(store(x.equipment?.store_id)?.name||"—")}</td><td data-label="Setor">${esc(sector(x.equipment?.sector_id)?.name||"Sem setor")}</td><td data-label="Desvios">${x.count}</td><td data-label="Último">${x.last?`${fmtDate(x.last.reading_date)} ${x.last.reading_time?.slice(0,5)}`:"—"}</td><td data-label="Classificação">${x.recurring?'<span class="recurrenceTag high">RECORRENTE</span>':'Pontual'}</td></tr>`).join("");
 document.getElementById("content").innerHTML=`
 <div class="pageIntro"><div><span class="eyebrow">ANÁLISE</span><h2>Relatórios por período, setor e equipamento</h2><p>Use o filtro para investigar desvios, recorrência e problemas físicos.</p></div><div class="introStat"><b>${recurring.length}</b><span>recorrente(s)</span></div></div>
 ${analysisFilterBar()}
 <div class="grid4 compactKpis" style="margin-bottom:14px">
   <div class="card"><div class="label">Coletas</div><div class="num">${rs.length}</div></div>
   <div class="card"><div class="label">Desvios</div><div class="num badText">${dev.length}</div></div>
   <div class="card"><div class="label">Equipamentos recorrentes</div><div class="num warnText">${recurring.length}</div></div>
   <div class="card"><div class="label">Com problema atualmente</div><div class="num badText">${problems.length}</div></div>
 </div>
 <div class="analyticsTwo">
  <section class="panel"><div class="panelHead"><div><span class="eyebrow">RECORRÊNCIA</span><h2>Ranking de desvios</h2></div><button class="btn primary" onclick="printReport('${currentScopeStore()||""}')">Imprimir relatório</button></div><div class="tableWrap"><table><thead><tr><th>Equipamento</th><th>Loja</th><th>Setor</th><th>Desvios</th><th>Último</th><th>Classificação</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Nenhum desvio no período.</td></tr>'}</tbody></table></div></section>
  <section class="panel"><div class="panelHead"><div><span class="eyebrow">MANUTENÇÃO</span><h2>Equipamentos com problema</h2></div></div><div class="issueList">${problems.map(e=>`<div class="issueRow"><div><b>${esc(e.name)}</b><small>${esc(store(e.store_id)?.name||"—")} • ${esc(sector(e.sector_id)?.name||"Sem setor")}<br>${esc(e.status_note||"Sem observação.")}</small></div><span class="operationalBadge ${operationalClass(e.operational_status)}">${operationalLabel(e.operational_status)}</span></div>`).join("")||'<div class="emptyState"><b>Nenhum equipamento com problema</b><span>Todos estão operacionais.</span></div>'}</div></section>
 </div>`;
}
window.printReport=sid=>{
 const stores=sid?state.stores.filter(s=>s.id===sid):filteredStores(),ids=new Set(stores.map(s=>s.id)),rs=readingsInAnalysisPeriod().filter(r=>ids.has(r.store_id)),rec=recurrenceData().filter(x=>ids.has(x.equipment?.store_id)),dev=rs.filter(r=>isReadingOutOfRange(r)),problems=state.equipment.filter(e=>ids.has(e.store_id)&&e.operational_status&&e.operational_status!=="operational");
 const body=`<h1>${sid?"Relatório da Loja":"Relatório Geral da Rede"}</h1><p>Período: ${analysisFilter.start?fmtDate(analysisFilter.start):"início"} a ${analysisFilter.end?fmtDate(analysisFilter.end):"hoje"}</p><p><b>Coletas:</b> ${rs.length} | <b>Desvios:</b> ${dev.length} | <b>Recorrentes:</b> ${rec.filter(x=>x.recurring).length} | <b>Equipamentos com problema:</b> ${problems.length}</p><h2>Recorrência</h2><table><thead><tr><th>Equipamento</th><th>Loja</th><th>Setor</th><th>Desvios</th><th>Último</th></tr></thead><tbody>${rec.map(x=>`<tr><td>${esc(x.equipment?.name||"—")}</td><td>${esc(store(x.equipment?.store_id)?.name||"—")}</td><td>${esc(sector(x.equipment?.sector_id)?.name||"Sem setor")}</td><td>${x.count}</td><td>${x.last?fmtDate(x.last.reading_date)+" "+x.last.reading_time?.slice(0,5):"—"}</td></tr>`).join("")}</tbody></table>`;
 const w=window.open("","_blank");w.document.write(`<html><head><title>Central Temp</title><style>body{font-family:Arial;padding:25px;color:#172033}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:22px}th,td{border:1px solid #d5dbe5;padding:7px;text-align:left}th{background:#f1f3f7}</style></head><body>${body}</body></html>`);w.document.close();setTimeout(()=>w.print(),200);
};
function visibleProfiles(){
 if(can("users.manage_all"))return state.profiles;
 const sid=ownStoreId();return state.profiles.filter(p=>p.store_id===sid&&(p.role==="agent"||p.id===state.profile.id));
}
function renderUsers(){
 const ps=visibleProfiles(),isAdmin=state.profile?.role==="admin";
 document.getElementById("content").innerHTML=`
 <div class="pageIntro"><div><span class="eyebrow">ACESSOS</span><h2>Usuários</h2><p>Admin pode editar, desativar e excluir usuários. A própria conta logada não pode ser excluída.</p></div><div class="introStat"><b>${ps.filter(p=>p.active).length}</b><span>ativo(s)</span></div></div>
 <section class="panel">
  <div class="panelHead"><div><span class="eyebrow">GESTÃO</span><h2>Contas cadastradas</h2></div>${isAdmin?'<span class="adminOnlyNote">Controles de Admin ativos</span>':""}</div>
  <div class="tableWrap"><table><thead><tr><th>Nome</th><th>Usuário</th><th>Tipo</th><th>Loja / escopo</th><th>Status</th><th>Ações</th></tr></thead><tbody>
  ${ps.map(p=>`<tr>
   <td data-label="Nome"><b>${esc(p.full_name)}</b></td>
   <td data-label="Usuário">${esc(p.username)}${p.id===PRIMARY_ADMIN_ID?'<br><span class="securityPrimary">ADMIN PRINCIPAL PROTEGIDO</span>':""}</td>
   <td data-label="Tipo">${roleLabel(p.role)}</td>
   <td data-label="Loja / escopo">${p.access_scope==="global"?"Rede inteira":esc(store(p.store_id)?.name||"—")}</td>
   <td data-label="Status"><span class="badge ${p.active?"good":"neutral"}">${p.active?"ATIVO":"INATIVO"}</span></td>
   <td data-label="Ações">${p.id===PRIMARY_ADMIN_ID?'<span class="adminOnlyNote">ADMIN PRINCIPAL PROTEGIDO • credenciais somente em Minha Conta</span>':p.id===state.profile.id?'<span class="adminOnlyNote">Conta logada • exclusão bloqueada</span>':canManageUser(p)?`<div class="adminActions"><button class="btn sm ghost" onclick="openUser('${p.id}')">Editar</button><button class="btn sm" onclick="toggleUserActive('${p.id}',${!p.active})">${p.active?"Desativar":"Ativar"}</button>${isAdmin?`<button class="btn sm adminDelete" onclick="confirmDeleteUser('${p.id}')">Excluir</button>`:""}</div>`:"—"}</td>
  </tr>`).join("")||'<tr><td colspan="6">Sem usuários.</td></tr>'}
  </tbody></table></div>
 </section>`;
}

function canManageUser(p){
 if(can("users.manage_all"))return true;
 return can("users.manage_agents")&&p.role==="agent"&&p.store_id===ownStoreId();
}
window.openUser=id=>{
 const p=id?profile(id):{full_name:"",username:"",role:"agent",store_id:ownStoreId()||currentScopeStore()||state.stores[0]?.id,access_scope:"store",permissions:[],active:true};
 if(id&&p.id===PRIMARY_ADMIN_ID)return toast("O Admin Principal é protegido. Ele altera apenas o próprio usuário e senha em Minha Conta.","warn");
 const admin=can("users.manage_all"),roleOpts=admin?["admin","leader","agent","custom"]:["agent"];
 const allowedStores=admin?state.stores:state.stores.filter(s=>s.id===ownStoreId());
 const customPerms=Array.isArray(p.permissions)?p.permissions:[];
 showModal(`<div class="modalHead"><h2>${id?"Editar usuário":"Criar usuário"}</h2><button class="x" onclick="closeModal()">×</button></div>
 <div class="securityBanner"><b>Segurança de acesso</b>Novas senhas e redefinições usam política forte. Nunca armazenamos a senha em texto visível.</div>
 <div class="formGrid">
  <div><label>Nome</label><input id="fuName" value="${esc(p.full_name)}"></div>
  <div><label>Nome de usuário</label><input id="fuUsername" value="${esc(p.username)}" placeholder="letras, números, ponto, _ ou -" oninput="updatePasswordSecurityHint('fuPass','fuPassHint','fuUsername')"></div>
  <div><label>${id?"Nova senha (vazio = manter)":"Senha inicial"}</label><input id="fuPass" type="password" autocomplete="new-password" oninput="updatePasswordSecurityHint('fuPass','fuPassHint','fuUsername')"><div id="fuPassHint" class="passwordStrengthLine">Mín. 10 caracteres, maiúscula, minúscula, número e especial.</div></div>
  <div><label>${id?"Confirmar nova senha":"Confirmar senha inicial"}</label><input id="fuPass2" type="password" autocomplete="new-password"></div>
  <div><label>Tipo de conta</label><select id="fuRole" onchange="toggleCustomUser()">${roleOpts.map(r=>`<option value="${r}" ${p.role===r?"selected":""}>${roleLabel(r)}</option>`).join("")}</select></div>
  <div><label>Escopo</label><select id="fuScope" onchange="toggleCustomUser()" ${!admin?"disabled":""}><option value="store" ${p.access_scope!=="global"?"selected":""}>Uma loja</option><option value="global" ${p.access_scope==="global"?"selected":""}>Rede inteira</option></select></div>
  <div id="fuStoreBox"><label>Loja</label><select id="fuStore">${allowedStores.filter(s=>s.active).map(s=>`<option value="${s.id}" ${p.store_id===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div>
  <div><label>Status</label><select id="fuActive"><option value="true" ${p.active?"selected":""}>Ativo</option><option value="false" ${!p.active?"selected":""}>Inativo</option></select></div>
 </div>
 <div class="securityRules"><strong>Senha forte:</strong> 10+ caracteres • maiúscula • minúscula • número • caractere especial • sem espaços • não pode conter o usuário.</div>
 <div id="customPermBox" class="hidden"><label>Permissões personalizadas</label><div class="checkGrid">${Object.entries(PERMS).map(([k,l])=>`<label class="check"><input type="checkbox" data-perm="${k}" ${customPerms.includes(k)?"checked":""}><span><b>${esc(l)}</b><small>${k}</small></span></label>`).join("")}</div></div>
 <div class="modalActions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveUser('${id||""}')">Salvar usuário</button></div>`);
 toggleCustomUser();
};
window.toggleCustomUser=()=>{
 const role=val("fuRole"),scope=val("fuScope");document.getElementById("customPermBox")?.classList.toggle("hidden",role!=="custom");
 const box=document.getElementById("fuStoreBox");if(box)box.style.display=scope==="global"?"none":"block";
};
async function callManageUser(body){
 const {data,error}=await sb.functions.invoke("manage-user",{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data;
}
window.saveUser=async id=>{
 const username=val("fuUsername").trim().toLowerCase();
 if(!validUsernameSecure(username))return toast("Usuário inválido. Use 3 a 40 caracteres, sem espaços, começando e terminando com letra ou número.","warn");
 const role=val("fuRole"),scope=role==="admin"?"global":val("fuScope"),permissions=role==="custom"?[...document.querySelectorAll("[data-perm]:checked")].map(x=>x.dataset.perm):[];
 const password=val("fuPass"),confirmPassword=val("fuPass2");
 const body={action:id?"update":"create",user_id:id||undefined,full_name:val("fuName").trim(),username,password,role,store_id:scope==="global"?null:val("fuStore"),access_scope:scope,permissions,active:val("fuActive")==="true"};
 if(!body.full_name||(!id&&!password))return toast("Preencha nome e senha inicial.","warn");
 if(password){
   const errors=passwordSecurityErrors(password,username);
   if(errors.length)return toast("A senha ainda não atende à segurança exigida: "+errors.join(", ")+".","warn");
   if(password!==confirmPassword)return toast("As duas senhas não são iguais.","warn");
 }
 showLoad(true);
 try{await callManageUser(body);closeModal();toast("Usuário salvo com segurança.","good");await fetchAll();renderUsers()}
 catch(e){toast(e.message,"bad")}
 finally{showLoad(false)}
};
window.toggleUserActive=async(id,active)=>{
 const p=profile(id);if(!p)return;
 if(p.id===PRIMARY_ADMIN_ID)return toast("O Admin Principal é protegido e não pode ser ativado/desativado por outra conta.","warn");
 if(p.id===state.profile.id)return toast("Altere sua própria conta em Minha Conta.","warn");
 const body={action:"update",user_id:id,full_name:p.full_name,username:p.username,password:"",role:p.role,store_id:p.access_scope==="global"?null:p.store_id,access_scope:p.access_scope,permissions:Array.isArray(p.permissions)?p.permissions:[],active};
 showLoad(true);try{await callManageUser(body);toast(active?"Usuário ativado.":"Usuário desativado.","good");await fetchAll();renderUsers()}catch(e){toast(e.message,"bad")}finally{showLoad(false)}
};
