window.saveInlineReading=async()=>{
 const {e,count,nums,valid}=getInlineSamples(),action=val("icAction").trim(),date=val("icDate"),time=val("icTime"),condition=val("icCondition")||"operational",issue=val("icIssueNote").trim();
 if(!e)return toast("Selecione um equipamento.","warn");
 if(valid.length!==count)return toast(count===3?"Preencha as três temperaturas.":"Informe uma temperatura válida.","warn");
 if(!date||!time)return toast("Informe data e hora.","warn");
 const avg=valid.reduce((a,b)=>a+b,0)/valid.length,min=Math.min(...valid),max=Math.max(...valid),bad=min<Number(e.min_temp)||max>Number(e.max_temp);
 if(bad&&!action)return toast("Temperatura fora do padrão. Informe a ação corretiva.","bad");
 if(condition!=="operational"&&!issue)return toast("Descreva o problema do equipamento.","warn");
 const payload={equipment_id:e.id,store_id:e.store_id,temperature:avg,sample_count:count,temperature_1:nums[0],temperature_2:count===3?nums[1]:null,temperature_3:count===3?nums[2]:null,temperature_avg:avg,temperature_min:min,temperature_max:max,reading_date:date,reading_time:time,responsible_name:state.profile.full_name,notes:val("icNote").trim(),corrective_action:action,equipment_condition:condition,equipment_issue_note:condition==="operational"?null:issue,created_by:state.profile.id};
 showLoad(true);const {data:saved,error}=await sb.from("readings").insert(payload).select("*").single();showLoad(false);
 if(error)return toast("Não foi possível salvar a coleta: "+error.message,"bad");
 lastOwnReadingId=saved.id;await fetchAll();const daily=dailyGoalInfo(e);renderReadings();buildNav();renderScope();
 const opMsg=condition!=="operational"?` Ocorrência de ${operationalLabel(condition).toLowerCase()} aberta.`:"";
 toast((bad?`Coleta ${count}x salva com alerta.`:`Coleta ${count}x salva.`)+` Progresso ${daily.count}/${daily.goal}.${opMsg}`,bad||condition!=="operational"?"bad":"good");
};
window.openReading=eqId=>{if(state.page!=="readings"){setPage("readings");setTimeout(()=>{if(eqId)selectInlineEquipment(eqId);else focusInlineCollect()},120);return}if(eqId)selectInlineEquipment(eqId);else focusInlineCollect()};
window.confirmDeleteReading=id=>{
 if(state.profile.role!=="admin")return toast("Somente Admin pode excluir coletas.","warn");
 const r=reading(id),e=r?equipment(r.equipment_id):null,count=Number(r?.sample_count||1),tempInfo=count===3?`Média ${num(r.temperature_avg??r.temperature,2)} °C • mín. ${num(r.temperature_min)} °C • máx. ${num(r.temperature_max)} °C`:r?num(r.temperature)+" °C":"—";
 showModal(`<div class="modalHead"><div><span class="eyebrow">AÇÃO ADMINISTRATIVA</span><h2>Excluir coleta?</h2></div><button class="x" onclick="closeModal()">×</button></div><div class="notice" style="border-color:#f1caca;background:#fff6f6;color:#7e2b2b"><b>Esta exclusão é definitiva.</b><br>Alertas vinculados poderão ser removidos conforme as regras do banco.</div><div class="detailGrid" style="margin-top:12px"><div><small>Equipamento</small><b>${esc(e?.name||"—")}</b></div><div><small>Resultado</small><b>${tempInfo}</b></div><div><small>Data</small><b>${r?fmtDate(r.reading_date):"—"}</b></div><div><small>Condição</small><b>${operationalLabel(r?.equipment_condition)}</b></div></div><div class="modalActions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn danger" onclick="deleteReading('${id}')">Excluir definitivamente</button></div>`);
};
window.deleteReading=async id=>{if(state.profile.role!=="admin")return toast("Somente Admin pode excluir coletas.","warn");showLoad(true);const {error}=await sb.from("readings").delete().eq("id",id);showLoad(false);if(error)return toast("Não foi possível excluir: "+error.message,"bad");closeModal();await fetchAll();renderPage();toast("Coleta excluída pelo Admin.","good")};
window.filterReadTable=()=>{
 const q=(val("searchRead")||"").toLowerCase(),start=val("readStart"),end=val("readEnd"),sec=val("readSector"),st=val("statusRead"),cond=val("conditionRead");
 document.querySelectorAll("[data-read-row]").forEach(tr=>{
   const ok=(!q||tr.dataset.search.includes(q))&&(!start||tr.dataset.date>=start)&&(!end||tr.dataset.date<=end)&&(!sec||tr.dataset.sector===sec)&&(!st||tr.dataset.tempstatus===st)&&(!cond||tr.dataset.condition===cond);
   tr.style.display=ok?"":"none";
 });
};
function scopedAlerts(){
 const sid=currentScopeStore();return state.alerts.filter(a=>!sid||a.store_id===sid).sort((a,b)=>b.created_at.localeCompare(a.created_at));
}
function renderPending(){
 const alerts=scopedAlerts(),open=alerts.filter(a=>a.status==="open"),ack=alerts.filter(a=>a.status==="acknowledged"),closed=alerts.filter(a=>a.status==="closed");
 const alertCard=a=>{const r=reading(a.reading_id),e=equipment(a.equipment_id),s=store(a.store_id),u=profile(r?.created_by);return `<div class="alertEvent ${a.status==="acknowledged"?"ack":a.status==="closed"?"closed":""}">
  <div class="alertTop"><div><h3>${esc(e?.name||"Equipamento")}</h3><div class="alertDetails">${esc(s?.name||"—")}<br><b class="badText">${r?num(r.temperature)+" °C":"—"}</b> • faixa ${e?`${e.min_temp} a ${e.max_temp} °C`:"—"}<br>${r?`${fmtDate(r.reading_date)} ${r.reading_time?.slice(0,5)} • @${esc(u?.username||"—")}`:""}</div></div><span class="badge ${a.status==="open"?"bad":a.status==="acknowledged"?"warn":"neutral"}">${a.status==="open"?"ABERTO":a.status==="acknowledged"?"TRATANDO":"ENCERRADO"}</span></div>
  <div class="actions"><button class="btn sm ghost" onclick="showAlertDetails('${a.id}')">Detalhes</button>${can("readings.create")?`<button class="btn sm primary" onclick="openReading('${a.equipment_id}')">Nova coleta</button>`:""}${can("alerts.manage")&&a.status==="open"?`<button class="btn sm" onclick="ackAlert('${a.id}')">Iniciar tratamento</button>`:""}${can("alerts.manage")&&a.status!=="closed"?`<button class="btn sm blue" onclick="closeAlert('${a.id}')">Encerrar</button>`:""}</div>
 </div>`};
 document.getElementById("content").innerHTML=`
 <div class="alertHero"><span class="eyebrow">GESTÃO DE DESVIOS</span><h2>Central de alertas</h2><p>Os alertas são criados automaticamente quando uma coleta sai da faixa configurada.</p></div>
 <div class="grid4 compactKpis" style="margin-bottom:14px">
   <div class="card"><div class="kpiIcon badSoft">!</div><div><div class="label">Abertos</div><div class="num badText">${open.length}</div></div></div>
   <div class="card"><div class="kpiIcon warnSoft">~</div><div><div class="label">Em tratamento</div><div class="num">${ack.length}</div></div></div>
   <div class="card"><div class="kpiIcon goodSoft">✓</div><div><div class="label">Encerrados</div><div class="num">${closed.length}</div></div></div>
   <div class="card"><div class="kpiIcon blueSoft">Σ</div><div><div class="label">Total</div><div class="num">${alerts.length}</div></div></div>
 </div>
 <div class="grid" style="align-items:start">
   <section class="panel"><div class="panelHead"><h2>Abertos</h2><span class="badge bad">${open.length}</span></div>${open.map(alertCard).join("")||'<div class="emptyState"><div class="emptyIcon">✓</div><b>Sem alertas</b><span>Nenhum desvio aberto.</span></div>'}</section>
   <section class="panel"><div class="panelHead"><h2>Em tratamento</h2><span class="badge warn">${ack.length}</span></div>${ack.map(alertCard).join("")||'<div class="emptyState"><div class="emptyIcon">~</div><b>Nada em tratamento</b><span>Os alertas assumidos aparecem aqui.</span></div>'}</section>
   <section class="panel"><div class="panelHead"><h2>Encerrados</h2><span class="badge neutral">${closed.length}</span></div>${closed.slice(0,15).map(alertCard).join("")||'<div class="emptyState"><div class="emptyIcon">✓</div><b>Sem histórico</b><span>Alertas encerrados aparecem aqui.</span></div>'}</section>
 </div>`;
}
window.ackAlert=async id=>{
 const {error}=await sb.from("temperature_alerts").update({status:"acknowledged",acknowledged_by:state.profile.id,acknowledged_at:new Date().toISOString()}).eq("id",id);
 if(error)return toast(error.message,"bad");
 await fetchAll();renderPage();toast("Alerta marcado como em tratamento.","good")
};
window.closeAlert=async id=>{
 const {error}=await sb.from("temperature_alerts").update({status:"closed",closed_by:state.profile.id,closed_at:new Date().toISOString()}).eq("id",id);
 if(error)return toast(error.message,"bad");
 await fetchAll();renderPage();toast("Alerta encerrado.","good")
};
window.showAlertDetails=id=>{
 const a=alertById(id);if(!a)return;
 const r=reading(a.reading_id),e=equipment(a.equipment_id),s=store(a.store_id),u=profile(r?.created_by),count=Number(r?.sample_count||1);
 const statusLabel=a.status==="open"?"Aberto":a.status==="acknowledged"?"Em tratamento":"Encerrado";
 const mainTemp=count===3?`Média ${num(r.temperature_avg??r.temperature,2)} °C`:r?num(r.temperature)+" °C":"—";
 showModal(`<div class="modalHead"><div><span class="eyebrow">DETALHES DO ALERTA</span><h2>Temperatura fora do padrão</h2></div><button class="x" onclick="closeModal()">×</button></div>
   <div class="alertSummary"><div class="alertSummaryTop"><div class="alertIcon large">!</div><div><b>${esc(e?.name||"—")}</b><span>${esc(s?.name||"—")} • ${statusLabel} • Coleta ${count}x</span></div></div>
     <div class="alertNumbers"><div><small>${count===3?"Resultado médio":"Temperatura coletada"}</small><b class="badText">${mainTemp}</b></div><div><small>Faixa permitida</small><b>${e?`${e.min_temp} a ${e.max_temp} °C`:"—"}</b></div><div><small>Ideal</small><b>${e?`${e.target_temp} °C`:"—"}</b></div></div>
     ${count===3?`<div class="tripleAlertSummary"><small>Três medições realizadas no mesmo momento</small><b>1ª ${num(r.temperature_1)} °C • 2ª ${num(r.temperature_2)} °C • 3ª ${num(r.temperature_3)} °C</b><b>Mínima ${num(r.temperature_min)} °C • Máxima ${num(r.temperature_max)} °C • Média ${num(r.temperature_avg,2)} °C</b></div>`:""}
   </div>
   <div class="detailGrid"><div><small>Data da coleta</small><b>${r?fmtDate(r.reading_date):"—"}</b></div><div><small>Horário</small><b>${r?r.reading_time?.slice(0,5):"—"}</b></div><div><small>Coletado por</small><b>${esc(u?.full_name||r?.responsible_name||"—")}</b></div><div><small>Usuário</small><b>${u?.username?"@"+esc(u.username):"—"}</b></div></div>
   <label>Observação da coleta</label><div class="readOnlyBox">${esc(r?.notes||"Nenhuma observação registrada.")}</div>
   <label>Ação corretiva registrada</label><div class="readOnlyBox emphasis">${esc(r?.corrective_action||"Nenhuma ação registrada.")}</div>
   <div class="modalActions"><button class="btn" onclick="closeModal()">Fechar</button>${can("readings.create")?`<button class="btn primary" onclick="closeModal();openReading('${a.equipment_id}')">Fazer nova coleta</button>`:""}${can("alerts.manage")&&a.status==="open"?`<button class="btn blue" onclick="closeModal();ackAlert('${a.id}')">Iniciar tratamento</button>`:""}${can("alerts.manage")&&a.status!=="closed"?`<button class="btn primary" onclick="closeModal();closeAlert('${a.id}')">Encerrar alerta</button>`:""}</div>`);
};
window.enableNotifications=async()=>{
 if(!("Notification" in window))return toast("Este navegador não oferece notificações.","warn");
 if(location.protocol==="file:")return toast("As notificações funcionarão quando o sistema estiver publicado em HTTPS.","warn");
 const p=await Notification.requestPermission();
 toast(p==="granted"?"Notificações deste aparelho ativadas.":"Permissão de notificações não concedida.",p==="granted"?"good":"warn")
};
function notifyBrowserAlert(a){
 if("Notification" in window&&Notification.permission==="granted"){
   const e=equipment(a.equipment_id),r=reading(a.reading_id);
   new Notification("Central Temp — temperatura fora do padrão",{body:`${store(a.store_id)?.name||""} • ${e?.name||""}: ${r?num(r.temperature)+" °C":""}`})
 }
}

