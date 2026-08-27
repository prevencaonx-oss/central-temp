function renderNetwork(){
 const stores=filteredStores(),eqs=filteredEquipment().filter(e=>e.active),rs=readingsInAnalysisPeriod();
 const recurrence=recurrenceData(),recurring=recurrence.filter(x=>x.recurring),deviationReadings=rs.filter(r=>isReadingOutOfRange(r));
 const outEq=new Set(deviationReadings.map(r=>r.equipment_id)).size,broken=eqs.filter(e=>e.operational_status&&e.operational_status!=="operational").length;
 const today=localISODate(),todayReadings=filteredReadings().filter(r=>r.reading_date===today).length,openAlerts=scopedAlerts().filter(a=>a.status==="open").length;
 const dailyCompleted=eqs.filter(e=>dailyGoalInfo(e,today).met).length,dailyPending=Math.max(0,eqs.length-dailyCompleted);
 const sectorRows=sectorAnalysis().slice(0,8);
 const storeRows=stores.map(s=>{
  const se=state.equipment.filter(e=>e.store_id===s.id&&e.active);
  const ids=new Set(se.map(e=>e.id)),sr=rs.filter(r=>ids.has(r.equipment_id)),dev=sr.filter(r=>isReadingOutOfRange(r)).length;
  const rec=recurrence.filter(x=>x.recurring&&x.equipment?.store_id===s.id).length;
  const prob=se.filter(e=>e.operational_status&&e.operational_status!=="operational").length;
  return `<tr>
    <td data-label="Unidade"><b>${esc(s.name)}</b><br><span class="muted">${esc(s.city||"—")} • Loja ${esc(s.code)}</span></td>
    <td data-label="Equipamentos">${se.length}</td>
    <td data-label="Coletas no período">${sr.length}</td>
    <td data-label="Desvios">${dev}</td>
    <td data-label="Recorrentes">${rec}</td>
    <td data-label="Com problema"><span class="badge ${prob?"bad":"good"}">${prob}</span></td>
    <td data-label="Ações"><button class="btn sm primary" onclick="openStoreDash('${s.id}')">Abrir unidade</button></td>
  </tr>`;
 }).join("");
 const recRows=recurrence.slice(0,10).map(x=>{const e=x.equipment;return `<tr>
   <td data-label="Equipamento"><b>${esc(e?.name||"—")}</b><br><span class="muted">${esc(store(e?.store_id)?.name||"—")}</span></td>
   <td data-label="Setor">${esc(sector(e?.sector_id)?.name||"Sem setor")}</td>
   <td data-label="Desvios"><span class="recurrenceTag ${x.count>=4?"high":""}">${x.count} ocorrência(s)</span></td>
   <td data-label="Último desvio">${x.last?`${fmtDate(x.last.reading_date)} ${x.last.reading_time?.slice(0,5)}`:"—"}</td>
   <td data-label="Classificação">${x.recurring?'<b class="badText">RECORRENTE</b>':'Pontual'}</td>
 </tr>`}).join("");
 document.getElementById("content").innerHTML=`
 <div class="pageIntro">
   <div><span class="eyebrow">PAINEL EXECUTIVO</span><h2>Temperatura, recorrência e saúde dos equipamentos</h2><p>Analise desvios por período, setor, equipamento e situação operacional.</p><div class="introMicro">Meta diária: <b>${dailyCompleted}/${eqs.length}</b> equipamento(s) com 3+ coletas hoje • <b>${dailyPending}</b> pendente(s)</div></div>
   <div class="introStat ${openAlerts?"alertPulse":""}"><b>${openAlerts}</b><span>alerta(s) aberto(s)</span></div>
 </div>
 <div class="preventionStrip"><img src="assets/nilo-mascote.webp" alt="Mascote Nilo"><div><b>Prevenção de perdas</b><span>Monitoramento, disciplina operacional e ação preventiva para reduzir desvios e proteger resultados.</span></div></div>
 ${analysisFilterBar()}
 <div class="grid4 compactKpis" style="margin-bottom:14px">
   <div class="card"><div class="kpiIcon blueSoft">CT</div><div><div class="label">Coletas no período</div><div class="num">${rs.length}</div><div class="foot">${analysisFilter.start?fmtDate(analysisFilter.start):"Início"} até ${analysisFilter.end?fmtDate(analysisFilter.end):"Hoje"}</div></div></div>
   <div class="card"><div class="kpiIcon badSoft">!</div><div><div class="label">Equipamentos com desvio</div><div class="num badText">${outEq}</div><div class="foot">${deviationReadings.length} coleta(s) fora da faixa</div></div></div>
   <div class="card"><div class="kpiIcon warnSoft">R</div><div><div class="label">Recorrentes</div><div class="num warnText">${recurring.length}</div><div class="foot">2 ou mais desvios</div></div></div>
   <div class="card"><div class="kpiIcon badSoft">EQ</div><div><div class="label">Com defeito/manutenção</div><div class="num badText">${broken}</div><div class="foot">${openIncidents().length} ocorrência(s) aberta(s)</div></div></div>
 </div>
 <section class="panel">
  <div class="panelHead"><div><span class="eyebrow">REDE</span><h2>Situação das unidades no período</h2></div><span class="muted" style="font-size:9px">${todayReadings} coleta(s) realizadas hoje</span></div>
  <div class="tableWrap"><table><thead><tr><th>Unidade</th><th>Equip.</th><th>Coletas</th><th>Desvios</th><th>Recorrentes</th><th>Com problema</th><th></th></tr></thead><tbody>${storeRows||'<tr><td colspan="7">Nenhuma loja cadastrada.</td></tr>'}</tbody></table></div>
 </section>
 <div class="analyticsTwo">
  <section class="panel">
    <div class="panelHead"><div><span class="eyebrow">RECORRÊNCIA</span><h2>Equipamentos que mais saíram do padrão</h2></div><span class="muted" style="font-size:9px">Recorrência = 2+ desvios</span></div>
    <div class="tableWrap"><table class="analyticsTable"><thead><tr><th>Equipamento</th><th>Setor</th><th>Desvios</th><th>Último</th><th>Classificação</th></tr></thead><tbody>${recRows||'<tr><td colspan="5">Nenhum desvio no período selecionado.</td></tr>'}</tbody></table></div>
  </section>
  <section class="panel">
    <div class="panelHead"><div><span class="eyebrow">SETORES</span><h2>Setores com mais desvios</h2></div></div>
    <div class="sectorAnalytics">${sectorRows.map(x=>`<div class="sectorAnalyticsRow"><div class="sectorAnalyticsTop"><div><b>${esc(x.sector.name)}</b><small>${x.equipmentCount} equipamento(s) • ${x.readings} coleta(s)</small></div><div style="text-align:right"><b class="${x.deviations?"badText":"goodText"}">${x.deviations}</b><small>desvios • ${x.recurring} recorrente(s)</small></div></div></div>`).join("")||'<div class="emptyState"><b>Sem setores cadastrados</b><span>Cadastre setores na área Equipamentos.</span></div>'}</div>
  </section>
 </div>`;
}
window.openStoreDash=id=>{state.activeStoreId=id;analysisFilter.sectorId="";analysisFilter.equipmentId="";setPage("store")};
function renderStoreDash(){
 const sid=currentScopeStore();
 if(!sid){document.getElementById("content").innerHTML=`<div class="emptyState"><div class="emptyIcon">LJ</div><b>Selecione uma unidade</b><span>Use o seletor de escopo no topo para abrir uma loja.</span></div>`;return}
 const s=store(sid),eqs=state.equipment.filter(e=>e.store_id===sid&&e.active),rs=readingsInAnalysisPeriod();
 const rec=recurrenceData(),recurring=rec.filter(x=>x.recurring),devRs=rs.filter(r=>isReadingOutOfRange(r)),broken=eqs.filter(e=>e.operational_status&&e.operational_status!=="operational");
 const openAlerts=state.alerts.filter(a=>a.store_id===sid&&a.status==="open").length;
 const eqRows=eqs.filter(e=>!analysisFilter.sectorId||e.sector_id===analysisFilter.sectorId).map(e=>{const r=lastReading(e.id),st=statusOf(e,r),u=r?profile(r.created_by):null,rc=rec.find(x=>x.equipment?.id===e.id)?.count||0;return `<tr>
  <td data-label="Equipamento"><b>${esc(e.name)}</b><br><span class="muted">${esc(e.category)} • ${esc(sector(e.sector_id)?.name||"Sem setor")}</span></td>
  <td data-label="Operação"><span class="operationalBadge ${operationalClass(e.operational_status)}">${operationalLabel(e.operational_status)}</span></td>
  <td data-label="Última leitura">${r?`<b class="${st.k==="bad"?"badText":st.k==="ok"?"goodText":"warnText"}">${num(r.temperature_avg??r.temperature,Number(r.sample_count||1)===3?2:1)} °C</b>`:"—"}</td>
  <td data-label="Recorrência">${rc?`<span class="recurrenceTag ${rc>=4?"high":""}">${rc} desvio(s)</span>`:"—"}</td>
  <td data-label="Última coleta">${r?`${fmtDate(r.reading_date)} ${r.reading_time?.slice(0,5)}<br><span class="muted">${esc(u?.full_name||r.responsible_name)}</span>`:"Sem coleta"}</td>
  <td data-label="Ação">${can("readings.create")?`<button class="btn sm primary" onclick="openReading('${e.id}')">Coletar</button>`:"—"}</td>
 </tr>`}).join("");
 document.getElementById("content").innerHTML=`
 <div class="pageIntro"><div><span class="eyebrow">UNIDADE ${esc(s?.code||"")}</span><h2>${esc(s?.name||"—")}</h2><p>${esc(s?.city||"")} • análise por setor, período e equipamento.</p></div><div class="introStat ${openAlerts?"alertPulse":""}"><b>${openAlerts}</b><span>alerta(s) aberto(s)</span></div></div>
 <div class="preventionStrip"><img src="assets/nilo-mascote.webp" alt="Mascote Nilo"><div><b>Prevenção de perdas</b><span>Monitoramento, disciplina operacional e ação preventiva para reduzir desvios e proteger resultados.</span></div></div>
 ${analysisFilterBar()}
 <div class="grid4 compactKpis" style="margin-bottom:14px">
   <div class="card"><div class="kpiIcon blueSoft">CT</div><div><div class="label">Coletas no período</div><div class="num">${rs.length}</div></div></div>
   <div class="card"><div class="kpiIcon badSoft">!</div><div><div class="label">Desvios</div><div class="num badText">${devRs.length}</div></div></div>
   <div class="card"><div class="kpiIcon warnSoft">R</div><div><div class="label">Recorrentes</div><div class="num warnText">${recurring.length}</div></div></div>
   <div class="card"><div class="kpiIcon badSoft">EQ</div><div><div class="label">Com problema</div><div class="num badText">${broken.length}</div></div></div>
 </div>
 <section class="panel">
   <div class="panelHead"><div><span class="eyebrow">MONITORAMENTO</span><h2>Equipamentos da unidade</h2></div>${can("readings.create")?`<button class="btn primary" onclick="openReading()">Nova coleta</button>`:""}</div>
   <div class="tableWrap"><table><thead><tr><th>Equipamento / setor</th><th>Situação</th><th>Última leitura</th><th>Recorrência</th><th>Última coleta</th><th></th></tr></thead><tbody>${eqRows||'<tr><td colspan="6">Nenhum equipamento ativo.</td></tr>'}</tbody></table></div>
 </section>`;
}
function renderStores(){
 const stores=filteredStores(),isAdmin=state.profile?.role==="admin";
 const rows=stores.map(s=>{
   const eqCount=state.equipment.filter(e=>e.store_id===s.id).length;
   const userCount=state.profiles.filter(p=>p.store_id===s.id).length;
   const readingCount=state.readings.filter(r=>r.store_id===s.id).length;
   return `<tr>
    <td data-label="Loja"><b>${esc(s.name)}</b><br><span class="muted">${esc(s.city||"—")}</span></td>
    <td data-label="Código">${esc(s.code)}</td>
    <td data-label="Meta diária"><b>3 coletas/dia</b><br><span class="muted">sem horário fixo</span></td>
    <td data-label="Equipamentos">${state.equipment.filter(e=>e.store_id===s.id&&e.active).length}</td>
    <td data-label="Status"><span class="badge ${s.active?"good":"neutral"}">${s.active?"ATIVA":"INATIVA"}</span></td>
    <td data-label="Ações">${can("stores.manage")?`<div class="adminActions">
      <button class="btn sm ghost" onclick="openStore('${s.id}')">Editar</button>
      <button class="btn sm" onclick="toggleStoreActive('${s.id}',${!s.active})">${s.active?"Desativar":"Ativar"}</button>
      ${isAdmin?`<button class="btn sm adminDelete" onclick="confirmDeleteStore('${s.id}')">Excluir</button>`:""}
    </div>`:"—"}</td>
   </tr>`;
 }).join("");
 document.getElementById("content").innerHTML=`
 <div class="pageIntro"><div><span class="eyebrow">REDE</span><h2>Lojas</h2><p>Administre as unidades da rede. Admin pode excluir definitivamente apenas lojas sem histórico vinculado.</p></div><div class="introStat"><b>${stores.filter(s=>s.active).length}</b><span>ativa(s)</span></div></div>
 <section class="panel">
  <div class="panelHead"><div><span class="eyebrow">CADASTRO</span><h2>Unidades cadastradas</h2></div>${isAdmin?'<span class="adminOnlyNote">Controles de Admin ativos</span>':""}</div>
  <div class="tableWrap"><table><thead><tr><th>Loja</th><th>Código</th><th>Meta diária</th><th>Equipamentos</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Nenhuma loja cadastrada.</td></tr>'}</tbody></table></div>
 </section>`;
}

window.openStore=id=>{
 const s=id?store(id):{name:"",code:"",city:"",active:true};
 showModal(`<div class="modalHead"><div><span class="eyebrow">CONFIGURAÇÃO DA LOJA</span><h2>${id?"Editar loja":"Adicionar loja"}</h2></div><button class="x" onclick="closeModal()">×</button></div>
 <div class="formGrid">
   <div><label>Nome</label><input id="fsName" value="${esc(s.name)}"></div>
   <div><label>Código</label><input id="fsCode" value="${esc(s.code)}"></div>
   <div><label>Cidade</label><input id="fsCity" value="${esc(s.city||"")}"></div>
   <div><label>Status</label><select id="fsActive"><option value="true" ${s.active?"selected":""}>Ativa</option><option value="false" ${!s.active?"selected":""}>Inativa</option></select></div>
 </div>
 <div class="notice" style="margin-top:11px"><b>Frequência de aferição:</b> cada equipamento deve ter no mínimo <b>3 coletas por dia</b>. Não existem horários fixos; o sistema acompanha apenas a quantidade realizada no dia.</div>
 <div class="modalActions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveStore('${id||""}')">Salvar</button></div>`);
};
window.saveStore=async id=>{
 const payload={name:val("fsName").trim(),code:val("fsCode").trim(),city:val("fsCity").trim(),active:val("fsActive")==="true"};
 if(!payload.name||!payload.code)return toast("Informe nome e código.","warn");
 showLoad(true);const {error}=id?await sb.from("stores").update(payload).eq("id",id):await sb.from("stores").insert(payload);showLoad(false);
 if(error)return toast(error.message,"bad");closeModal();toast("Loja salva.","good");await fetchAll();renderPage();
};
