function renderReadings(){
 const rs=filteredReadings().slice().sort((a,b)=>(b.reading_date+b.reading_time).localeCompare(a.reading_date+a.reading_time));
 const today=localISODate(),tm=new Date().toTimeString().slice(0,5),todayRs=rs.filter(r=>r.reading_date===today),todayBad=todayRs.filter(r=>isReadingOutOfRange(r)).length;
 const eqs=filteredEquipment().filter(e=>e.active),firstEq=eqs[0]||null,due=eqs.filter(e=>!dailyGoalInfo(e).met);
 const rows=rs.map(r=>{const e=equipment(r.equipment_id),st=e?statusOf(e,r):{c:"neutral",l:"—"},u=profile(r.created_by),count=Number(r.sample_count||1),cond=r.equipment_condition||"operational";
   const result=count===3?`<div class="readingResult"><strong class="${st.k==="bad"?"badText":"goodText"}">Média ${num(r.temperature_avg??r.temperature,2)} °C</strong><small>Mín. ${num(r.temperature_min)} °C • Máx. ${num(r.temperature_max)} °C</small><div class="readingSamples"><span>1: ${num(r.temperature_1)}°</span><span>2: ${num(r.temperature_2)}°</span><span>3: ${num(r.temperature_3)}°</span></div></div>`:`<div class="readingResult"><strong class="${st.k==="bad"?"badText":"goodText"}">${num(r.temperature)} °C</strong><small>Coleta 1x</small></div>`;
   return `<tr data-read-row data-date="${r.reading_date}" data-sector="${e?.sector_id||""}" data-condition="${cond}" data-tempstatus="${st.k}" data-search="${esc(((e?.name||"")+" "+(store(e?.store_id)?.name||"")+" "+(sector(e?.sector_id)?.name||"")+" "+(u?.full_name||r.responsible_name||"")).toLowerCase())}">
   <td data-label="Data">${fmtDate(r.reading_date)}<br><span class="muted">${r.reading_time?.slice(0,5)}</span></td>
   <td data-label="Loja / setor">${esc(store(e?.store_id)?.name||"—")}<br><span class="muted">${esc(sector(e?.sector_id)?.name||"Sem setor")}</span></td>
   <td data-label="Equipamento"><b>${esc(e?.name||"—")}</b><br><span class="muted">${esc(e?.category||"")}</span></td>
   <td data-label="Resultado">${result}</td>
   <td data-label="Temperatura"><span class="badge ${st.c}">${st.l}</span></td>
   <td data-label="Condição"><span class="operationalBadge ${operationalClass(cond)}">${operationalLabel(cond)}</span>${r.equipment_issue_note?`<br><span class="muted">${esc(r.equipment_issue_note)}</span>`:""}</td>
   <td data-label="Coletado por"><b>${esc(u?.full_name||r.responsible_name)}</b></td>
   <td data-label="Ação corretiva">${esc(r.corrective_action||"—")}</td>
   <td data-label="Ações">${state.profile.role==="admin"?`<button class="btn sm danger adminDelete" onclick="confirmDeleteReading('${r.id}')">Excluir</button>`:""}</td>
 </tr>`}).join("");

 document.getElementById("content").innerHTML=`
 <div class="pageIntro collectionPrimary">
   <div><span class="eyebrow">COLETA DE DADOS</span><h2>Registrar temperatura e condição do equipamento</h2><p>Além da temperatura, você pode informar se o equipamento está com defeito, em manutenção ou indisponível.</p></div>
   <div class="introStat"><b>${todayRs.length}</b><span>coleta(s) hoje</span></div>
 </div>
 <div class="inlineCollectShell">
   <section class="inlineCollectForm" id="inlineCollectForm">
     <div class="inlineCollectHead"><div><h2>Nova coleta</h2><p>O formato 1x ou 3x é definido no equipamento.</p></div><div class="collectUser"><small>Coletado por</small><b>${esc(state.profile.full_name)} (@${esc(state.profile.username)})</b></div></div>
     <div class="inlineCollectBody">
       ${can("readings.create")&&eqs.length?`
       <div class="inlineCollectGrid">
         <div class="full">
           <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px"><div style="flex:1"><label>Equipamento</label><select id="icEq" onchange="inlineCollectEquipmentChanged()">${eqs.map(e=>`<option value="${e.id}">${esc(store(e.store_id)?.name||"—")} — ${esc(sector(e.sector_id)?.name||"Sem setor")} — ${esc(e.name)}</option>`).join("")}</select></div><span id="icMode" class="sampleModePill">COLETA 1X</span></div>
           <div id="icRange" class="collectRange"></div>
         </div>
         <div class="full"><label>Temperaturas coletadas</label><div id="icTempsHost"></div><div id="icStats" class="sampleStats"></div><div id="icSampleProgress" class="sampleProgress"></div><div id="icStatus" class="collectStatus">Digite a temperatura coletada.</div></div>
         <div><label>Data da coleta</label><input id="icDate" type="date" value="${today}"></div>
         <div><label>Hora da coleta</label><input id="icTime" type="time" value="${tm}"></div>
         <div class="conditionBox">
           <label>Condição do equipamento no momento da coleta</label>
           <select id="icCondition" onchange="toggleEquipmentCondition()">
             <option value="operational">Operando normalmente</option>
             <option value="broken">Equipamento com defeito / estragado</option>
             <option value="maintenance">Em manutenção</option>
             <option value="unavailable">Indisponível / sem condição normal de operação</option>
           </select>
           <div id="icConditionProblem" class="conditionProblem hidden"><label>Descreva o problema do equipamento</label><textarea id="icIssueNote" placeholder="Ex.: compressor não liga, porta danificada, ruído anormal, sem refrigeração..."></textarea><div class="muted" style="font-size:8px;margin-top:5px">Ao salvar, será aberta uma ocorrência operacional para este equipamento.</div></div>
         </div>
         <div class="full"><label>Observação da coleta</label><textarea id="icNote" placeholder="Opcional. Ex.: abastecimento recente, porta aberta, condição observada..."></textarea></div>
         <div class="full"><label>Ação corretiva de temperatura</label><textarea id="icAction" placeholder="Obrigatória quando qualquer medição estiver fora da faixa."></textarea></div>
       </div>
       <div class="inlineCollectActions"><span class="muted" style="font-size:9px;margin-right:auto">Problemas físicos do equipamento ficam registrados separadamente dos desvios de temperatura.</span><button class="saveCollectBtn" onclick="saveInlineReading()">SALVAR COLETA</button></div>
       `:can("readings.create")?`<div class="notice">Não existe equipamento ativo no escopo selecionado.</div>`:`<div class="notice">Seu perfil não possui permissão para registrar novas medições.</div>`}
     </div>
   </section>
   <aside class="collectAside">
     <section class="collectAsidePanel"><h3>Meta diária de coletas</h3><p>Mínimo de 3 coletas por equipamento, sem horário fixo.</p><div class="quickCollectList">${eqs.slice().sort((a,b)=>dailyGoalInfo(a).count-dailyGoalInfo(b).count).slice(0,10).map(e=>{const g=dailyGoalInfo(e),count=Number(e.samples_per_collection||1);return `<div class="quickCollectRow dailyGoalRow ${g.met?"goalMet":""}"><div><b>${esc(e.name)}</b><small>${esc(sector(e.sector_id)?.name||"Sem setor")} • coleta ${count}x</small><div class="dailyGoalProgress"><span style="width:${Math.min(100,(g.count/g.goal)*100)}%"></span></div><small><b>${g.count}/${g.goal}</b> hoje ${g.met?"• concluído":`• faltam ${g.remaining}`}</small></div>${can("readings.create")&&!g.met?`<button class="btn sm primary" onclick="selectInlineEquipment('${e.id}')">Coletar</button>`:`<span class="badge good">OK</span>`}</div>`}).join("")}</div></section>
     <section class="collectAsidePanel"><h3>Resumo de hoje</h3><div class="collectionStatusList"><div class="collectionStatusRow"><div><b>Coletas realizadas</b></div><b>${todayRs.length}</b></div><div class="collectionStatusRow"><div><b>Fora do padrão</b></div><b class="badText">${todayBad}</b></div><div class="collectionStatusRow"><div><b>Equipamentos com problema</b></div><b class="badText">${filteredEquipment().filter(e=>e.operational_status&&e.operational_status!=="operational").length}</b></div><div class="collectionStatusRow"><div><b>Abaixo da meta</b></div><b class="warnText">${due.length}</b></div></div></section>
   </aside>
 </div>

 <section class="panel">
  <div class="panelHead"><div><span class="eyebrow">HISTÓRICO</span><h2>Pesquisar coletas por data, período, setor e condição</h2></div><span class="muted" style="font-size:10px">${rs.length} carregadas</span></div>
  <div class="historyFilterGrid">
    <input id="searchRead" placeholder="Buscar equipamento, loja, setor ou coletor" oninput="filterReadTable()">
    <input id="readStart" type="date" onchange="filterReadTable()">
    <input id="readEnd" type="date" onchange="filterReadTable()">
    <select id="readSector" onchange="filterReadTable()"><option value="">Todos os setores</option>${filteredSectors().map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>
    <select id="statusRead" onchange="filterReadTable()"><option value="">Temperatura: todos</option><option value="ok">Normal</option><option value="bad">Fora do padrão</option></select>
    <select id="conditionRead" onchange="filterReadTable()"><option value="">Condição: todas</option><option value="operational">Operacional</option><option value="broken">Com defeito</option><option value="maintenance">Em manutenção</option><option value="unavailable">Indisponível</option></select>
  </div>
  <div class="tableWrap"><table id="readTable"><thead><tr><th>Data/hora</th><th>Loja / setor</th><th>Equipamento</th><th>Resultado</th><th>Temperatura</th><th>Condição</th><th>Coletado por</th><th>Ação</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="9">Nenhuma coleta registrada.</td></tr>'}</tbody></table></div>
 </section>`;
 if(firstEq)setTimeout(()=>inlineCollectEquipmentChanged(),0);
}
window.goToCollectForm=()=>{
 if(state.page!=="readings"){setPage("readings");setTimeout(()=>focusInlineCollect(),100)} else focusInlineCollect();
};
window.focusInlineCollect=()=>{document.getElementById("inlineCollectForm")?.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>document.getElementById("icT1")?.focus(),180)};
window.selectInlineEquipment=id=>{if(state.page!=="readings"){setPage("readings");setTimeout(()=>selectInlineEquipment(id),120);return}const el=document.getElementById("icEq");if(!el)return;el.value=id;inlineCollectEquipmentChanged();focusInlineCollect()};
window.inlineCollectEquipmentChanged=()=>{
 const e=equipment(val("icEq")),range=document.getElementById("icRange"),host=document.getElementById("icTempsHost"),mode=document.getElementById("icMode");if(!e||!range||!host)return;
 const count=Number(e.samples_per_collection||1);if(mode){mode.textContent=`COLETA ${count}X`;mode.className="sampleModePill"+(count===3?" three":"")}
 range.innerHTML=`<div><small>Loja / setor</small><b>${esc(store(e.store_id)?.name||"—")} • ${esc(sector(e.sector_id)?.name||"Sem setor")}</b></div><div><small>Faixa permitida</small><b>${e.min_temp} a ${e.max_temp} °C</b></div><div><small>Temperatura ideal</small><b>${e.target_temp} °C</b></div>`;
 host.innerHTML=count===3?`<div class="sampleInputs three"><div class="sampleInputCard" id="sampleCard1"><label>Medição 1</label><input id="icT1" inputmode="decimal" autocomplete="off" placeholder="Ex.: -2,5" oninput="inlineCollectPreview()"></div><div class="sampleInputCard" id="sampleCard2"><label>Medição 2</label><input id="icT2" inputmode="decimal" autocomplete="off" placeholder="Ex.: -2,7" oninput="inlineCollectPreview()"></div><div class="sampleInputCard" id="sampleCard3"><label>Medição 3</label><input id="icT3" inputmode="decimal" autocomplete="off" placeholder="Ex.: -2,4" oninput="inlineCollectPreview()"></div></div>`:`<div class="sampleInputs one"><div class="sampleInputCard" id="sampleCard1"><label>Temperatura</label><input id="icT1" inputmode="decimal" autocomplete="off" placeholder="Ex.: 3,8" oninput="inlineCollectPreview()"></div></div>`;
 inlineCollectPreview();toggleEquipmentCondition();setTimeout(()=>document.getElementById("icT1")?.focus(),50);
};
window.toggleEquipmentCondition=()=>{
 const cond=val("icCondition"),box=document.getElementById("icConditionProblem");if(box)box.classList.toggle("hidden",cond==="operational");
};
window.getInlineSamples=()=>{
 const e=equipment(val("icEq")),count=Number(e?.samples_per_collection||1),nums=[parseTemp(val("icT1")),count===3?parseTemp(val("icT2")):NaN,count===3?parseTemp(val("icT3")):NaN];
 return {e,count,nums,valid:nums.slice(0,count).filter(Number.isFinite)};
};
window.inlineCollectPreview=()=>{
 const {e,count,nums,valid}=getInlineSamples(),box=document.getElementById("icStatus"),stats=document.getElementById("icStats"),progress=document.getElementById("icSampleProgress");if(!box||!e)return;
 [1,2,3].forEach(i=>document.getElementById(`sampleCard${i}`)?.classList.toggle("filled",Number.isFinite(nums[i-1])));
 if(!valid.length){box.className="collectStatus";box.textContent=count===3?"Preencha as três medições.":"Digite a temperatura coletada.";if(stats)stats.innerHTML=`<div class="sampleStat avg"><small>Média</small><b>—</b></div><div class="sampleStat"><small>Mínima</small><b>—</b></div><div class="sampleStat"><small>Máxima</small><b>—</b></div>`;if(progress)progress.textContent=count===3?"0 de 3 medições":"Aguardando";return}
 const avg=valid.reduce((a,b)=>a+b,0)/valid.length,min=Math.min(...valid),max=Math.max(...valid),complete=valid.length===count,bad=min<Number(e.min_temp)||max>Number(e.max_temp);
 if(stats)stats.innerHTML=`<div class="sampleStat avg"><small>Média ${complete?"":"parcial"}</small><b>${num(avg,2)} °C</b></div><div class="sampleStat"><small>Mínima</small><b>${num(min)} °C</b></div><div class="sampleStat"><small>Máxima</small><b>${num(max)} °C</b></div>`;
 if(progress)progress.innerHTML=count===3?`<b>${valid.length}</b> de 3 medições`:"1 medição";
 if(!complete){box.className="collectStatus"+(bad?" bad":"");box.textContent=bad?"Uma medição já está fora da faixa. Complete as demais.":"Complete as três medições.";return}
 box.className="collectStatus "+(bad?"bad":"good");box.textContent=bad?`FORA DO PADRÃO — pelo menos uma medição saiu da faixa ${e.min_temp} a ${e.max_temp} °C.`:`DENTRO DO PADRÃO — todas as medições estão adequadas.`;
};
