window.toggleStoreActive=async(id,active)=>{
 if(state.profile?.role!=="admin"&&!can("stores.manage"))return toast("Sem permissão.","warn");
 showLoad(true);const {error}=state.trainingMode?trainingWrite("stores","update",{active,updated_at:new Date().toISOString()},id):await sb.from("stores").update({active,updated_at:new Date().toISOString()}).eq("id",id);showLoad(false);
 if(error)return toast(error.message,"bad");
 await fetchAll();renderPage();toast(active?"Loja ativada.":"Loja desativada.","good");
};
window.removeStore=async id=>toggleStoreActive(id,false);
window.confirmDeleteStore=id=>{
 if(state.profile?.role!=="admin")return toast("Somente Admin pode excluir uma loja definitivamente.","warn");
 const s=store(id);if(!s)return;
 const eqs=state.equipment.filter(e=>e.store_id===id),users=state.profiles.filter(p=>p.store_id===id),reads=state.readings.filter(r=>r.store_id===id),alerts=state.alerts.filter(a=>a.store_id===id);
 const deps=eqs.length+users.length+reads.length+alerts.length;
 if(deps){
   showModal(`<div class="modalHead"><div><span class="eyebrow">EXCLUSÃO DE LOJA</span><h2>Não é seguro excluir ${esc(s.name)}</h2></div><button class="x" onclick="closeModal()">×</button></div>
   <div class="notice" style="background:#fff6e8;border-color:#efd3a2;color:#74511d"><b>Esta loja possui dados vinculados.</b><br>Para preservar histórico, coletas e usuários, a exclusão definitiva foi bloqueada.</div>
   <div class="deleteSummary"><div><small>Equipamentos</small><b>${eqs.length}</b></div><div><small>Usuários</small><b>${users.length}</b></div><div><small>Coletas</small><b>${reads.length}</b></div></div>
   <div class="modalActions"><button class="btn ghost" onclick="closeModal()">Cancelar</button>${s.active?`<button class="btn danger" onclick="closeModal();toggleStoreActive('${id}',false)">Desativar loja</button>`:""}</div>`);
   return;
 }
 showModal(`<div class="modalHead"><div><span class="eyebrow">AÇÃO DE ADMIN</span><h2>Excluir loja definitivamente?</h2></div><button class="x" onclick="closeModal()">×</button></div>
 <div class="notice" style="background:#fff3f3;border-color:#efc8c8;color:#862c2c"><b>${esc(s.name)}</b><br>Não há equipamentos, usuários, coletas ou alertas vinculados. Esta ação não poderá ser desfeita.</div>
 <div class="modalActions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger" onclick="deleteStore('${id}')">Excluir definitivamente</button></div>`);
};
window.deleteStore=async id=>{
 if(state.profile?.role!=="admin")return toast("Somente Admin pode excluir lojas.","warn");
 showLoad(true);const {error}=state.trainingMode?trainingWrite("stores","delete",{},id):await sb.from("stores").delete().eq("id",id);showLoad(false);
 if(error)return toast("Não foi possível excluir: "+error.message,"bad");
 closeModal();await fetchAll();renderPage();toast("Loja excluída definitivamente.","good");
};

function renderEquipment(){
 const eqs=filteredEquipment(),active=eqs.filter(e=>e.active).length,bad=eqs.filter(e=>statusOf(e).k==="bad").length,pend=eqs.filter(e=>statusOf(e).k==="pending").length;
 const problems=eqs.filter(e=>e.operational_status&&e.operational_status!=="operational"),recurrence=recurrenceData();
 const groups=new Map();
 eqs.forEach(e=>{const key=e.sector_id||"none";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e)});
 const cards=[...groups.entries()].sort(([a],[b])=>(sector(a)?.name||"Sem setor").localeCompare(sector(b)?.name||"Sem setor")).map(([sid,list])=>{
   const name=sid==="none"?"Sem setor":sector(sid)?.name||"Setor";
   const inner=list.map(e=>{const r=lastReading(e.id),st=statusOf(e,r),count=Number(e.samples_per_collection||1),rc=recurrence.find(x=>x.equipment?.id===e.id)?.count||0;return `<article class="equip" data-eq-card data-sector="${e.sector_id||""}" data-tempstatus="${st.k}" data-opstatus="${operationalClass(e.operational_status)}" data-search="${esc((e.name+" "+e.category+" "+(store(e.store_id)?.name||"")+" "+name).toLowerCase())}">
     <div class="equipTop"><div><span class="eyebrow">${esc(store(e.store_id)?.name||"")}</span><h3>${esc(e.name)}</h3><span class="muted" style="font-size:10px">${esc(e.category)}</span><div class="sectorChip">${esc(name)}</div><div class="equipmentCollectionMode">${count===3?"COLETA 3X":"COLETA 1X"}</div></div><div style="display:grid;gap:5px;justify-items:end"><span class="badge ${st.c}">${st.l}</span><span class="operationalBadge ${operationalClass(e.operational_status)}">${operationalLabel(e.operational_status)}</span></div></div>
     <div class="temp ${st.k==="bad"?"badText":st.k==="ok"?"goodText":st.k==="pending"?"warnText":""}">${r?(Number(r.sample_count||1)===3?num(r.temperature_avg??r.temperature,2):num(r.temperature))+" °C":"—"}</div>
     <div class="rangeLine"><span>Permitido <b>${e.min_temp} a ${e.max_temp} °C</b></span><span>Ideal <b>${e.target_temp} °C</b></span></div>
     <div class="meta">${r?`Última coleta ${fmtDate(r.reading_date)} às ${r.reading_time?.slice(0,5)}`:"Nenhuma coleta"}${rc?` • ${rc} desvio(s) no período`:""}</div>
     <div class="actions">${can("readings.create")?`<button class="btn sm primary" onclick="openReading('${e.id}')">Nova coleta</button>`:""}${can("equipment.manage")?`<button class="btn sm ghost" onclick="openEquipment('${e.id}')">Editar</button><button class="btn sm" onclick="toggleEquipmentActive('${e.id}',${!e.active})">${e.active?"Desativar":"Ativar"}</button>${state.profile?.role==="admin"?`<button class="btn sm adminDelete" onclick="confirmDeleteEquipment('${e.id}')">Excluir</button>`:""}`:""}</div>
   </article>`}).join("");
   return `<div class="sectorGroup" data-sector-group="${sid}"><div class="sectorGroupHead"><div><h3>${esc(name)}</h3><small>${list.length} equipamento(s)</small></div></div><div class="sectorCards">${inner}</div></div>`;
 }).join("");
 const incidents=openIncidents().map(i=>{const e=equipment(i.equipment_id);return `<div class="issueRow"><div><b>${esc(e?.name||"Equipamento")} • ${esc(sector(e?.sector_id)?.name||"Sem setor")}</b><small>${esc(store(i.store_id)?.name||"—")} • ${operationalLabel(i.incident_type)} • aberto em ${new Date(i.opened_at).toLocaleString("pt-BR")}<br>${esc(i.description||"Sem descrição.")}</small></div><div class="issueActions"><span class="operationalBadge ${operationalClass(i.incident_type)}">${operationalLabel(i.incident_type)}</span>${can("equipment.manage")?`<button class="btn sm primary" onclick="resolveIncident('${i.id}')">Resolver</button>`:""}</div></div>`}).join("");
 document.getElementById("content").innerHTML=`
 <div class="pageIntro"><div><span class="eyebrow">CADASTRO TÉCNICO</span><h2>Equipamentos por setor</h2><p>Organize por setor e acompanhe temperatura, recorrência e condição operacional.</p></div><div class="introStat"><b>${problems.length}</b><span>com problema</span></div></div>
 <div class="grid4 compactKpis" style="margin-bottom:14px">
   <div class="card"><div class="kpiIcon blueSoft">EQ</div><div><div class="label">Cadastrados</div><div class="num">${eqs.length}</div></div></div>
   <div class="card"><div class="kpiIcon goodSoft">ON</div><div><div class="label">Ativos</div><div class="num">${active}</div></div></div>
   <div class="card"><div class="kpiIcon badSoft">!</div><div><div class="label">Fora do padrão agora</div><div class="num badText">${bad}</div></div></div>
   <div class="card"><div class="kpiIcon warnSoft">R</div><div><div class="label">Recorrentes no período</div><div class="num warnText">${recurrence.filter(x=>x.recurring).length}</div></div></div>
 </div>
 ${incidents?`<section class="panel"><div class="panelHead"><div><span class="eyebrow">MANUTENÇÃO</span><h2>Equipamentos com ocorrência aberta</h2></div><span class="badge bad">${openIncidents().length}</span></div><div class="issueList">${incidents}</div></section>`:""}
 <section class="panel">
  <div class="panelHead"><div><span class="eyebrow">CATÁLOGO</span><h2>Equipamentos separados por setor</h2></div>${can("equipment.manage")?`<button class="btn ghost" onclick="openSectors()">Gerenciar setores</button>`:""}</div>
  <div class="toolbar" style="grid-template-columns:1.2fr .8fr .8fr .8fr">
    <input id="eqSearch" placeholder="Buscar equipamento, categoria, loja ou setor" oninput="filterEquipmentCards()">
    <select id="eqSector" onchange="filterEquipmentCards()"><option value="">Todos os setores</option>${filteredSectors().map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}<option value="none">Sem setor</option></select>
    <select id="eqStatus" onchange="filterEquipmentCards()"><option value="">Temperatura: todos</option><option value="ok">Normal</option><option value="bad">Fora do padrão</option><option value="pending">Sem leitura</option><option value="inactive">Inativo</option></select>
    <select id="eqOpStatus" onchange="filterEquipmentCards()"><option value="">Situação: todas</option><option value="operational">Operacional</option><option value="broken">Com defeito</option><option value="maintenance">Em manutenção</option><option value="unavailable">Indisponível</option></select>
  </div>
  <div class="grid" id="equipmentGrid">${cards||'<div class="emptyState"><div class="emptyIcon">EQ</div><b>Nenhum equipamento</b><span>Cadastre o primeiro equipamento.</span></div>'}</div>
 </section>`;
}
window.filterEquipmentCards=()=>{
 const q=(val("eqSearch")||"").toLowerCase(),st=val("eqStatus"),op=val("eqOpStatus"),sec=val("eqSector");
 document.querySelectorAll("[data-eq-card]").forEach(c=>{
   const ok=(!q||c.dataset.search.includes(q))&&(!st||c.dataset.tempstatus===st)&&(!op||c.dataset.opstatus===op)&&(!sec||(sec==="none"?!c.dataset.sector:c.dataset.sector===sec));
   c.style.display=ok?"":"none";
 });
 document.querySelectorAll("[data-sector-group]").forEach(g=>{g.style.display=[...g.querySelectorAll("[data-eq-card]")].some(c=>c.style.display!=="none")?"":"none"});
};
window.openEquipment=id=>{
 const e=id?equipment(id):{store_id:currentScopeStore()||ownStoreId()||state.stores[0]?.id,sector_id:null,name:"",category:"",target_temp:3,min_temp:0,max_temp:5,active:true,samples_per_collection:1};
 const allowedStores=isGlobal()?state.stores:state.stores.filter(s=>s.id===ownStoreId());
 const count=Number(e.samples_per_collection||1),secs=(state.sectors||[]).filter(s=>s.store_id===e.store_id&&s.active);
 showModal(`<div class="modalHead"><div><span class="eyebrow">CONFIGURAÇÃO DO EQUIPAMENTO</span><h2>${id?"Editar equipamento":"Adicionar equipamento"}</h2></div><button class="x" onclick="closeModal()">×</button></div>
 <div class="formGrid">
   <div><label>Loja</label><select id="feStore" onchange="refreshEquipmentSectorOptions()">${allowedStores.filter(s=>s.active).map(s=>`<option value="${s.id}" ${s.id===e.store_id?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div>
   <div><label>Setor</label><select id="feSector">${secs.map(s=>`<option value="${s.id}" ${s.id===e.sector_id?"selected":""}>${esc(s.name)}</option>`).join("")}<option value="" ${!e.sector_id?"selected":""}>Selecione...</option></select></div>
   <div><label>Nome do equipamento</label><input id="feName" value="${esc(e.name)}" placeholder="Ex.: Ilha de congelados 01"></div>
   <div><label>Categoria / tipo</label><input id="feCat" value="${esc(e.category)}" placeholder="Ex.: Freezer, Câmara fria, Balcão"></div>
   <div><label>Status no cadastro</label><select id="feActive"><option value="true" ${e.active?"selected":""}>Ativo</option><option value="false" ${!e.active?"selected":""}>Inativo</option></select></div>
   <div><label>Situação operacional atual</label><div style="padding:10px;border:1px solid #dce4e9;border-radius:9px"><span class="operationalBadge ${operationalClass(e.operational_status)}">${operationalLabel(e.operational_status)}</span></div></div>
   <div class="sampleConfigBox">
     <label>Medições em cada coleta</label>
     <div class="sampleChoiceGrid">
       <label class="sampleChoice ${count===1?"selected":""}" id="sampleChoice1"><input type="radio" name="feSamples" value="1" ${count===1?"checked":""} onchange="selectEquipmentSampleCount(1)"><strong>1x — Uma medição</strong><span>Uma temperatura por coleta.</span></label>
       <label class="sampleChoice ${count===3?"selected":""}" id="sampleChoice3"><input type="radio" name="feSamples" value="3" ${count===3?"checked":""} onchange="selectEquipmentSampleCount(3)"><strong>3x — Três medições</strong><span>Média, mínima e máxima automáticas.</span></label>
     </div>
   </div>
   <div><label>Temperatura ideal / alvo</label><input id="feTarget" inputmode="decimal" value="${e.target_temp}"></div>
   <div><label>Mínima permitida</label><input id="feMin" inputmode="decimal" value="${e.min_temp}"></div>
   <div><label>Máxima permitida</label><input id="feMax" inputmode="decimal" value="${e.max_temp}"></div>
 </div>
 <div class="notice" style="margin-top:11px"><b>Meta diária:</b> mínimo de 3 coletas por dia, sem horário fixo.</div>
 <div class="modalActions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveEquipment('${id||""}')">Salvar equipamento</button></div>`);
};
window.refreshEquipmentSectorOptions=()=>{
 const sid=val("feStore"),sel=document.getElementById("feSector");if(!sel)return;
 const secs=(state.sectors||[]).filter(s=>s.store_id===sid&&s.active);
 sel.innerHTML=`<option value="">Selecione...</option>${secs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}`;
};
window.selectEquipmentSampleCount=n=>{
 document.querySelectorAll('input[name="feSamples"]').forEach(x=>x.checked=Number(x.value)===Number(n));
 document.getElementById("sampleChoice1")?.classList.toggle("selected",Number(n)===1);
 document.getElementById("sampleChoice3")?.classList.toggle("selected",Number(n)===3);
};
