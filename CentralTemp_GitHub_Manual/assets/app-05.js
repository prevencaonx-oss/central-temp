window.saveEquipment=async id=>{
 const selected=document.querySelector('input[name="feSamples"]:checked');
 const p={store_id:val("feStore"),sector_id:val("feSector")||null,name:val("feName").trim(),category:val("feCat").trim(),target_temp:parseTemp(val("feTarget")),min_temp:parseTemp(val("feMin")),max_temp:parseTemp(val("feMax")),samples_per_collection:Number(selected?.value||1),active:val("feActive")==="true"};
 if(!p.sector_id)return toast("Selecione o setor do equipamento. Se ainda não existe, cadastre em Gerenciar setores.","warn");
 if(!p.name)return toast("Informe o nome do equipamento.","warn");
 if(!p.category)return toast("Informe a categoria / tipo do equipamento.","warn");
 if(!Number.isFinite(p.target_temp)||!Number.isFinite(p.min_temp)||!Number.isFinite(p.max_temp))return toast("Informe temperaturas válidas.","warn");
 if(p.min_temp>p.max_temp)return toast("A mínima não pode ser maior que a máxima.","warn");
 if(p.target_temp<p.min_temp||p.target_temp>p.max_temp)return toast("A temperatura ideal deve ficar dentro da faixa permitida.","warn");
 showLoad(true);const {error}=id?await sb.from("equipment").update(p).eq("id",id):await sb.from("equipment").insert({...p,created_by:state.profile.id});showLoad(false);
 if(error)return toast(error.message,"bad");
 closeModal();toast(`Equipamento salvo no setor ${sector(p.sector_id)?.name||""}.`,"good");await fetchAll();renderPage();
};
window.toggleEquipmentActive=async(id,active)=>{
 showLoad(true);const {error}=await sb.from("equipment").update({active,updated_at:new Date().toISOString()}).eq("id",id);showLoad(false);
 if(error)return toast(error.message,"bad");
 await fetchAll();renderPage();toast(active?"Equipamento ativado.":"Equipamento desativado.","good");
};
window.removeEquipment=async id=>toggleEquipmentActive(id,false);
window.confirmDeleteEquipment=id=>{
 if(state.profile?.role!=="admin")return toast("Somente Admin pode excluir equipamento definitivamente.","warn");
 const e=equipment(id);if(!e)return;
 const reads=state.readings.filter(r=>r.equipment_id===id),alerts=state.alerts.filter(a=>a.equipment_id===id),incs=state.incidents.filter(i=>i.equipment_id===id);
 if(reads.length||alerts.length){
  showModal(`<div class="modalHead"><div><span class="eyebrow">EXCLUSÃO DE EQUIPAMENTO</span><h2>Histórico encontrado</h2></div><button class="x" onclick="closeModal()">×</button></div>
  <div class="notice" style="background:#fff6e8;border-color:#efd3a2;color:#74511d"><b>${esc(e.name)}</b> já possui histórico. A exclusão definitiva foi bloqueada para não apagar ou quebrar coletas anteriores.</div>
  <div class="deleteSummary"><div><small>Coletas</small><b>${reads.length}</b></div><div><small>Alertas</small><b>${alerts.length}</b></div><div><small>Ocorrências</small><b>${incs.length}</b></div></div>
  <div class="modalActions"><button class="btn ghost" onclick="closeModal()">Cancelar</button>${e.active?`<button class="btn danger" onclick="closeModal();toggleEquipmentActive('${id}',false)">Desativar equipamento</button>`:""}</div>`);
  return;
 }
 showModal(`<div class="modalHead"><div><span class="eyebrow">AÇÃO DE ADMIN</span><h2>Excluir equipamento definitivamente?</h2></div><button class="x" onclick="closeModal()">×</button></div>
 <div class="notice" style="background:#fff3f3;border-color:#efc8c8;color:#862c2c"><b>${esc(e.name)}</b><br>Este equipamento não possui coletas ou alertas vinculados. A exclusão será definitiva.</div>
 <div class="modalActions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger" onclick="deleteEquipment('${id}')">Excluir definitivamente</button></div>`);
};
window.deleteEquipment=async id=>{
 if(state.profile?.role!=="admin")return toast("Somente Admin pode excluir equipamentos.","warn");
 showLoad(true);const {error}=await sb.from("equipment").delete().eq("id",id);showLoad(false);
 if(error)return toast("Não foi possível excluir: "+error.message,"bad");
 closeModal();await fetchAll();renderPage();toast("Equipamento excluído definitivamente.","good");
};

window.openSectors=()=>{
 const stores=isGlobal()?filteredStores():state.stores.filter(s=>s.id===ownStoreId());
 const sid=currentScopeStore()||stores[0]?.id||"";
 const rows=(state.sectors||[]).filter(s=>!currentScopeStore()||s.store_id===currentScopeStore()).map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(store(s.store_id)?.name||"—")}</td><td><span class="badge ${s.active?"good":"neutral"}">${s.active?"ATIVO":"INATIVO"}</span></td><td><button class="btn sm ghost" onclick="renameSector('${s.id}')">Renomear</button> <button class="btn sm" onclick="toggleSector('${s.id}',${!s.active})">${s.active?"Desativar":"Ativar"}</button></td></tr>`).join("");
 showModal(`<div class="modalHead"><div><span class="eyebrow">ORGANIZAÇÃO</span><h2>Gerenciar setores</h2></div><button class="x" onclick="closeModal()">×</button></div>
 <div class="formGrid"><div><label>Loja</label><select id="newSectorStore">${stores.filter(s=>s.active).map(s=>`<option value="${s.id}" ${s.id===sid?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div><div><label>Novo setor</label><input id="newSectorName" placeholder="Ex.: Açougue, Frios, Congelados"></div></div>
 <div class="actions" style="margin:9px 0 14px"><button class="btn primary" onclick="createSector()">Adicionar setor</button></div>
 <div class="tableWrap"><table><thead><tr><th>Setor</th><th>Loja</th><th>Status</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="4">Nenhum setor cadastrado.</td></tr>'}</tbody></table></div>`);
};
window.createSector=async()=>{
 const name=val("newSectorName").trim(),store_id=val("newSectorStore");if(!name||!store_id)return toast("Informe loja e nome do setor.","warn");
 const {error}=await sb.from("sectors").insert({name,store_id,created_by:state.profile.id});if(error)return toast(error.message,"bad");
 await fetchAll();openSectors();toast("Setor criado.","good");
};
window.renameSector=async id=>{
 const s=sector(id),name=prompt("Novo nome do setor:",s?.name||"");if(!name?.trim())return;
 const {error}=await sb.from("sectors").update({name:name.trim(),updated_at:new Date().toISOString()}).eq("id",id);if(error)return toast(error.message,"bad");
 await fetchAll();openSectors();toast("Setor atualizado.","good");
};
window.toggleSector=async(id,active)=>{
 const {error}=await sb.from("sectors").update({active,updated_at:new Date().toISOString()}).eq("id",id);if(error)return toast(error.message,"bad");
 await fetchAll();openSectors();
};
window.resolveIncident=async id=>{
 const i=incident(id);if(!i)return;
 const resolution=prompt("Como o problema foi resolvido?");if(!resolution?.trim())return;
 const {error}=await sb.from("equipment_incidents").update({status:"resolved",resolution:resolution.trim(),resolved_by:state.profile.id,resolved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);
 if(error)return toast(error.message,"bad");
 await fetchAll();renderPage();toast("Ocorrência encerrada e equipamento marcado como operacional.","good");
};
