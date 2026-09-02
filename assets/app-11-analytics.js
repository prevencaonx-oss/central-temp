(function(){
  const CT_VERSION='20260902-analytics1';

  function ctDateRangeLabel(){
    const a=analysisFilter.start?fmtDate(analysisFilter.start):'Início';
    const b=analysisFilter.end?fmtDate(analysisFilter.end):'Hoje';
    return `${a} a ${b}`;
  }
  function ctPct(n,d){return d?Math.round((n/d)*1000)/10:0}
  function ctAvg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}
  function ctScopeName(sid=currentScopeStore()){
    return sid?(store(sid)?.name||'Loja'):'Rede Geral';
  }
  function ctSafeFile(v){return String(v||'relatorio').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')}
  function ctDateInRange(date){
    if(!date)return false;
    if(analysisFilter.start&&date<analysisFilter.start)return false;
    if(analysisFilter.end&&date>analysisFilter.end)return false;
    return true;
  }
  function ctDeviationMagnitude(r,e){
    if(!r||!e)return 0;
    const low=Number(r.temperature_min??r.temperature),high=Number(r.temperature_max??r.temperature),min=Number(e.min_temp),max=Number(e.max_temp);
    let d=0;
    if(Number.isFinite(low)&&low<min)d=Math.max(d,min-low);
    if(Number.isFinite(high)&&high>max)d=Math.max(d,high-max);
    return d;
  }
  function ctFilteredEquipmentFor(sid){
    return state.equipment.filter(e=>e.active&&(!sid||e.store_id===sid)&&(!analysisFilter.sectorId||e.sector_id===analysisFilter.sectorId)&&(!analysisFilter.equipmentId||e.id===analysisFilter.equipmentId));
  }
  function ctReportData(sid=currentScopeStore()){
    const eqs=ctFilteredEquipmentFor(sid),eqIds=new Set(eqs.map(e=>e.id));
    const rs=state.readings.filter(r=>eqIds.has(r.equipment_id)&&ctDateInRange(r.reading_date)).slice().sort((a,b)=>(`${b.reading_date}${b.reading_time||''}`).localeCompare(`${a.reading_date}${a.reading_time||''}`));
    const dev=rs.filter(r=>isReadingOutOfRange(r));
    const recMap=new Map();
    dev.forEach(r=>{const arr=recMap.get(r.equipment_id)||[];arr.push(r);recMap.set(r.equipment_id,arr)});
    const rec=[...recMap.entries()].map(([id,arr])=>({equipment:equipment(id),count:arr.length,last:arr.slice().sort((a,b)=>(`${b.reading_date}${b.reading_time||''}`).localeCompare(`${a.reading_date}${a.reading_time||''}`))[0],recurring:arr.length>=2})).sort((a,b)=>b.count-a.count);
    const recurring=rec.filter(x=>x.recurring);
    const problems=eqs.filter(e=>e.operational_status&&e.operational_status!=='operational');
    const currentAlerts=state.alerts.filter(a=>(!sid||a.store_id===sid)&&(!analysisFilter.equipmentId||a.equipment_id===analysisFilter.equipmentId));
    const alertsPeriod=currentAlerts.filter(a=>ctDateInRange(String(a.created_at||'').slice(0,10)));
    const openAlerts=currentAlerts.filter(a=>a.status==='open');
    const treatingAlerts=currentAlerts.filter(a=>a.status==='acknowledged');
    const covered=new Set(rs.map(r=>r.equipment_id)).size;
    const conformity=ctPct(rs.length-dev.length,rs.length);
    const avgDeviation=ctAvg(dev.map(r=>ctDeviationMagnitude(r,equipment(r.equipment_id))));
    const dailyMap={};
    rs.forEach(r=>{
      const d=dailyMap[r.reading_date]??={date:r.reading_date,readings:0,deviations:0};
      d.readings++;if(isReadingOutOfRange(r))d.deviations++;
    });
    const daily=Object.values(dailyMap).sort((a,b)=>a.date.localeCompare(b.date));
    const sectorMap={};
    eqs.forEach(e=>{
      const key=e.sector_id||'none';
      sectorMap[key]??={sector:e.sector_id?sector(e.sector_id):{name:'Sem setor'},equipment:0,readings:0,deviations:0,recurring:0,problem:0};
      sectorMap[key].equipment++;
      if(e.operational_status&&e.operational_status!=='operational')sectorMap[key].problem++;
    });
    rs.forEach(r=>{const e=equipment(r.equipment_id),key=e?.sector_id||'none';if(!sectorMap[key])return;sectorMap[key].readings++;if(isReadingOutOfRange(r))sectorMap[key].deviations++});
    recurring.forEach(x=>{const key=x.equipment?.sector_id||'none';if(sectorMap[key])sectorMap[key].recurring++});
    const sectors=Object.values(sectorMap).map(x=>({...x,conformity:ctPct(x.readings-x.deviations,x.readings)})).sort((a,b)=>b.deviations-a.deviations);
    const equipmentStats=eqs.map(e=>{
      const er=rs.filter(r=>r.equipment_id===e.id),ed=er.filter(r=>isReadingOutOfRange(r)),last=lastReading(e.id),collector=new Set(er.map(r=>r.created_by||r.responsible_name).filter(Boolean)).size;
      return {equipment:e,readings:er.length,deviations:ed.length,conformity:ctPct(er.length-ed.length,er.length),last,recurrence:rec.find(x=>x.equipment?.id===e.id)?.count||0,collectors:collector};
    }).sort((a,b)=>b.deviations-a.deviations||b.readings-a.readings);
    const collectorMap={};
    rs.forEach(r=>{
      const u=profile(r.created_by),name=u?.full_name||r.responsible_name||'Não identificado',key=r.created_by||name;
      collectorMap[key]??={name,readings:0,deviations:0};collectorMap[key].readings++;if(isReadingOutOfRange(r))collectorMap[key].deviations++;
    });
    const collectors=Object.values(collectorMap).map(x=>({...x,conformity:ctPct(x.readings-x.deviations,x.readings)})).sort((a,b)=>b.readings-a.readings);
    return {sid,eqs,rs,dev,rec,recurring,problems,currentAlerts,alertsPeriod,openAlerts,treatingAlerts,covered,conformity,avgDeviation,daily,sectors,equipmentStats,collectors};
  }

  function ctFilterBar(extraClass=''){
    const secs=filteredSectors(),eqs=filteredEquipment().filter(e=>e.active&&(analysisFilter.sectorId?e.sector_id===analysisFilter.sectorId:true));
    return `<section class="ctFilter ${extraClass}">
      <div class="ctFilterTop"><div><span class="eyebrow">PERÍODO DE ANÁLISE</span><b>Escolha exatamente o período que deseja analisar</b></div><div class="ctQuick"><button onclick="ctQuickPeriod('today')">Hoje</button><button onclick="ctQuickPeriod('7')">7 dias</button><button onclick="ctQuickPeriod('30')">30 dias</button><button onclick="ctQuickPeriod('month')">Este mês</button></div></div>
      <div class="ctFilterGrid">
        <div><label>De</label><input class="ctFilterStart" id="afStart" type="date" value="${analysisFilter.start}"></div>
        <div><label>Até</label><input id="afEnd" type="date" value="${analysisFilter.end}"></div>
        <div><label>Setor</label><select id="afSector"><option value="">Todos os setores</option>${secs.map(s=>`<option value="${s.id}" ${analysisFilter.sectorId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div><label>Equipamento</label><select id="afEquipment"><option value="">Todos os equipamentos</option>${eqs.map(e=>`<option value="${e.id}" ${analysisFilter.equipmentId===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}</select></div>
        <button class="ctApply" onclick="ctApplyFilter()">Aplicar período</button>
        <button class="ctClear" onclick="ctClearFilter()">Limpar</button>
      </div>
      <div class="ctFilterSummary">Analisando: <b>${ctDateRangeLabel()}</b>${analysisFilter.sectorId?` • Setor: <b>${esc(sector(analysisFilter.sectorId)?.name||'—')}</b>`:''}${analysisFilter.equipmentId?` • Equipamento: <b>${esc(equipment(analysisFilter.equipmentId)?.name||'—')}</b>`:''}</div>
    </section>`;
  }
  window.ctApplyFilter=()=>{
    const start=val('afStart')||'',end=val('afEnd')||'';
    if(start&&end&&start>end)return toast('A data inicial não pode ser maior que a final.','warn');
    analysisFilter.start=start;analysisFilter.end=end;analysisFilter.sectorId=val('afSector')||'';analysisFilter.equipmentId=val('afEquipment')||'';renderPage();renderActions();
  };
  window.ctClearFilter=()=>{analysisFilter={start:monthStartISO(),end:localISODate(),sectorId:'',equipmentId:''};renderPage();renderActions()};
  window.ctQuickPeriod=mode=>{
    const end=localISODate();let start=end;
    if(mode==='7'){const d=new Date();d.setDate(d.getDate()-6);start=vxDateKey(d)}
    else if(mode==='30'){const d=new Date();d.setDate(d.getDate()-29);start=vxDateKey(d)}
    else if(mode==='month')start=monthStartISO();
    analysisFilter.start=start;analysisFilter.end=end;analysisFilter.sectorId='';analysisFilter.equipmentId='';renderPage();renderActions();
  };
  window.ctFocusPeriod=()=>{document.querySelector('.ctFilterStart')?.focus();document.querySelector('.ctFilter')?.scrollIntoView({behavior:'smooth',block:'start'})};

  function ctSparkBars(daily){
    const data=daily.slice(-14),max=Math.max(1,...data.map(x=>x.deviations));
    return `<div class="ctBars">${data.map(x=>`<div class="ctBarItem" title="${fmtDate(x.date)}: ${x.deviations} desvios em ${x.readings} coletas"><div class="ctBarTrack"><span style="height:${Math.max(4,(x.deviations/max)*100)}%"></span></div><small>${x.date.slice(8,10)}/${x.date.slice(5,7)}</small></div>`).join('')||'<div class="ctEmptyMini">Sem dados no período.</div>'}</div>`;
  }
  function ctTopList(rec,limit=6){
    const max=Math.max(1,...rec.map(x=>x.count));
    return `<div class="ctRankList">${rec.slice(0,limit).map((x,i)=>`<div class="ctRank"><span>${i+1}</span><div><b>${esc(x.equipment?.name||'—')}</b><small>${esc(sector(x.equipment?.sector_id)?.name||'Sem setor')}</small><div class="ctRankBar"><i style="width:${(x.count/max)*100}%"></i></div></div><strong>${x.count}</strong></div>`).join('')||'<div class="ctEmptyMini">Nenhum desvio no período.</div>'}</div>`;
  }

  window.renderNetwork=function(){
    const d=ctReportData(null),stores=filteredStores().filter(s=>s.active),today=localISODate(),todayCount=filteredReadings().filter(r=>r.reading_date===today).length;
    const first=esc(String(state.profile?.full_name||'').trim().split(/\s+/)[0]||'Usuário');
    document.getElementById('pageTitle').textContent='Prevenção de Perdas';
    document.getElementById('pageSub').textContent='Indicadores de temperatura, desvios e recorrência da rede';
    document.getElementById('content').innerHTML=`<div class="ctDash">
      <div class="ctWelcome"><div><span>PAINEL EXECUTIVO</span><h2>Olá, ${first}. Veja o que precisa de atenção.</h2><p>${ctScopeName(null)} • ${ctDateRangeLabel()}</p></div><div class="ctWelcomeStat"><b>${d.openAlerts.length}</b><span>alertas abertos agora</span></div></div>
      ${ctFilterBar('ctFilterNetwork')}
      <div class="ctKpiGrid ctKpiGrid6">
        <article><span>COLETAS</span><b>${d.rs.length}</b><small>${todayCount} realizadas hoje</small></article>
        <article><span>CONFORMIDADE</span><b class="goodText">${d.conformity.toFixed(1)}%</b><small>${d.rs.length-d.dev.length} dentro da faixa</small></article>
        <article><span>DESVIOS</span><b class="badText">${d.dev.length}</b><small>${d.recurring.length} equipamento(s) recorrente(s)</small></article>
        <article><span>COBERTURA</span><b>${ctPct(d.covered,d.eqs.length).toFixed(1)}%</b><small>${d.covered}/${d.eqs.length} equipamentos com coleta</small></article>
        <article><span>LOJAS</span><b>${stores.length}</b><small>unidades monitoradas</small></article>
        <article><span>PROBLEMAS</span><b class="warnText">${d.problems.length}</b><small>defeito/manutenção/indisponível</small></article>
      </div>
      <div class="ctAnalyticsGrid">
        <section class="ctPanel"><div class="ctPanelHead"><div><span>EVOLUÇÃO</span><h3>Desvios por dia</h3></div><small>Últimos ${Math.min(14,d.daily.length)} dias do recorte</small></div>${ctSparkBars(d.daily)}</section>
        <section class="ctPanel"><div class="ctPanelHead"><div><span>RECORRÊNCIA</span><h3>Equipamentos com mais desvios</h3></div><button onclick="go('reports')">Abrir relatório</button></div>${ctTopList(d.rec)}</section>
      </div>
      <section class="ctPanel"><div class="ctPanelHead"><div><span>REDE</span><h3>Resumo das lojas</h3></div></div><div class="tableWrap"><table><thead><tr><th>Loja</th><th>Equip.</th><th>Coletas</th><th>Desvios</th><th>Conformidade</th><th>Alertas abertos</th><th></th></tr></thead><tbody>${stores.map(s=>{const sd=ctReportData(s.id);return `<tr><td><b>${esc(s.name)}</b><br><small>${esc(s.city||'')}</small></td><td>${sd.eqs.length}</td><td>${sd.rs.length}</td><td><b class="${sd.dev.length?'badText':''}">${sd.dev.length}</b></td><td>${sd.conformity.toFixed(1)}%</td><td>${sd.openAlerts.length}</td><td><button class="btn sm primary" onclick="openStoreDash('${s.id}')">Abrir loja</button></td></tr>`}).join('')||'<tr><td colspan="7">Nenhuma loja ativa.</td></tr>'}</tbody></table></div></section>
    </div>`;
  };

  window.renderStoreDash=function(){
    const sid=currentScopeStore();
    if(!sid){document.getElementById('content').innerHTML='<div class="emptyState"><b>Selecione uma loja</b><span>Escolha a unidade no topo para abrir o dashboard.</span></div>';return}
    const s=store(sid),d=ctReportData(sid),noRead=Math.max(0,d.eqs.length-d.covered);
    document.getElementById('content').innerHTML=`<div class="ctDash ctStoreDash">
      <div class="ctStoreHero"><div><span>UNIDADE ${esc(s?.code||'')}</span><h2>${esc(s?.name||'—')}</h2><p>${esc(s?.city||'')} • visão operacional e gerencial da temperatura</p></div><div class="ctStoreHeroRight"><div><b>${d.openAlerts.length}</b><span>alertas abertos</span></div><div><b>${d.treatingAlerts.length}</b><span>em tratamento</span></div></div></div>
      ${ctFilterBar('ctFilterStore')}
      <div class="ctKpiGrid ctKpiGrid6">
        <article><span>COLETAS</span><b>${d.rs.length}</b><small>${(d.rs.length/Math.max(1,d.eqs.length)).toFixed(1)} por equipamento</small></article>
        <article><span>CONFORMIDADE</span><b class="goodText">${d.conformity.toFixed(1)}%</b><small>${d.rs.length-d.dev.length} coletas normais</small></article>
        <article><span>DESVIOS</span><b class="badText">${d.dev.length}</b><small>${ctPct(d.dev.length,d.rs.length).toFixed(1)}% das coletas</small></article>
        <article><span>RECORRENTES</span><b class="warnText">${d.recurring.length}</b><small>2 ou mais desvios</small></article>
        <article><span>SEM COLETA</span><b class="${noRead?'warnText':''}">${noRead}</b><small>no período selecionado</small></article>
        <article><span>PROBLEMA FÍSICO</span><b class="${d.problems.length?'badText':''}">${d.problems.length}</b><small>equipamentos atualmente</small></article>
      </div>
      <div class="ctAnalyticsGrid">
        <section class="ctPanel"><div class="ctPanelHead"><div><span>TENDÊNCIA</span><h3>Desvios por dia</h3></div><small>O gráfico respeita o período escolhido</small></div>${ctSparkBars(d.daily)}</section>
        <section class="ctPanel"><div class="ctPanelHead"><div><span>PRIORIDADE</span><h3>Onde agir primeiro</h3></div><button onclick="go('reports')">Ver relatório completo</button></div>${ctTopList(d.rec)}</section>
      </div>
      <section class="ctPanel"><div class="ctPanelHead"><div><span>MONITORAMENTO</span><h3>Equipamentos da unidade</h3></div><button class="ctPrimarySmall" onclick="goToCollectForm()">Registrar coleta</button></div><div class="tableWrap"><table><thead><tr><th>Equipamento</th><th>Setor</th><th>Coletas</th><th>Desvios</th><th>Conformidade</th><th>Última leitura</th><th>Situação</th><th></th></tr></thead><tbody>${d.equipmentStats.map(x=>{const e=x.equipment,r=x.last,st=statusOf(e,r);return `<tr><td><b>${esc(e.name)}</b><br><small>${esc(e.category||'')}</small></td><td>${esc(sector(e.sector_id)?.name||'Sem setor')}</td><td>${x.readings}</td><td><b class="${x.deviations?'badText':''}">${x.deviations}</b></td><td>${x.conformity.toFixed(1)}%</td><td>${r?`${num(r.temperature_avg??r.temperature,Number(r.sample_count||1)===3?2:1)} °C<br><small>${fmtDate(r.reading_date)} ${String(r.reading_time||'').slice(0,5)}</small>`:'—'}</td><td><span class="badge ${st.c}">${st.l}</span></td><td>${can('readings.create')?`<button class="btn sm primary" onclick="openReading('${e.id}')">Coletar</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="8">Nenhum equipamento para o filtro selecionado.</td></tr>'}</tbody></table></div></section>
    </div>`;
  };

  window.renderReports=function(){
    const sid=currentScopeStore(),d=ctReportData(sid);
    const avgPerEq=d.rs.length/Math.max(1,d.eqs.length),coverage=ctPct(d.covered,d.eqs.length);
    document.getElementById('content').innerHTML=`<div class="ctReports">
      <div class="ctReportHero"><div><span>RELATÓRIO GERENCIAL</span><h2>Temperatura, conformidade, recorrência e execução</h2><p>${esc(ctScopeName(sid))} • ${ctDateRangeLabel()}</p></div><div class="ctReportHeroActions"><button onclick="ctExportExcel('${sid||''}')">Exportar Excel</button><button onclick="ctPrintReport('${sid||''}')">Imprimir / PDF</button></div></div>
      ${ctFilterBar('ctFilterReports')}
      <div class="ctKpiGrid ctKpiGrid8">
        <article><span>COLETAS</span><b>${d.rs.length}</b><small>${avgPerEq.toFixed(1)} por equipamento</small></article>
        <article><span>CONFORMIDADE</span><b class="goodText">${d.conformity.toFixed(1)}%</b><small>${d.rs.length-d.dev.length} normais</small></article>
        <article><span>DESVIOS</span><b class="badText">${d.dev.length}</b><small>${ctPct(d.dev.length,d.rs.length).toFixed(1)}% das coletas</small></article>
        <article><span>DESVIO MÉDIO</span><b class="warnText">${d.avgDeviation.toFixed(1)} °C</b><small>além do limite</small></article>
        <article><span>RECORRENTES</span><b class="warnText">${d.recurring.length}</b><small>2+ desvios</small></article>
        <article><span>COBERTURA</span><b>${coverage.toFixed(1)}%</b><small>${d.covered}/${d.eqs.length} equipamentos</small></article>
        <article><span>ALERTAS ABERTOS</span><b class="badText">${d.openAlerts.length}</b><small>${d.treatingAlerts.length} em tratamento</small></article>
        <article><span>PROBLEMAS FÍSICOS</span><b class="${d.problems.length?'badText':''}">${d.problems.length}</b><small>situação atual</small></article>
      </div>
      <div class="ctReportTabs" role="tablist"><button class="active" onclick="ctReportTab('ranking',this)">Ranking</button><button onclick="ctReportTab('setores',this)">Setores</button><button onclick="ctReportTab('equipamentos',this)">Equipamentos</button><button onclick="ctReportTab('desvios',this)">Desvios</button><button onclick="ctReportTab('responsaveis',this)">Responsáveis</button><button onclick="ctReportTab('problemas',this)">Problemas</button></div>
      <section class="ctReportSection active" data-ct-tab="ranking"><div class="ctPanelHead"><div><span>RECORRÊNCIA</span><h3>Ranking de desvios</h3></div><small>Priorize os maiores reincidentes</small></div><div class="tableWrap"><table><thead><tr><th>#</th><th>Equipamento</th><th>Setor</th><th>Desvios</th><th>Último desvio</th><th>Classificação</th></tr></thead><tbody>${d.rec.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.equipment?.name||'—')}</b></td><td>${esc(sector(x.equipment?.sector_id)?.name||'Sem setor')}</td><td><b class="badText">${x.count}</b></td><td>${x.last?`${fmtDate(x.last.reading_date)} ${String(x.last.reading_time||'').slice(0,5)}`:'—'}</td><td>${x.recurring?'<span class="ctTagBad">RECORRENTE</span>':'Pontual'}</td></tr>`).join('')||'<tr><td colspan="6">Nenhum desvio no período.</td></tr>'}</tbody></table></div></section>
      <section class="ctReportSection" data-ct-tab="setores"><div class="ctPanelHead"><div><span>SETORES</span><h3>Desempenho por setor</h3></div></div><div class="tableWrap"><table><thead><tr><th>Setor</th><th>Equip.</th><th>Coletas</th><th>Desvios</th><th>Conformidade</th><th>Recorrentes</th><th>Problemas</th></tr></thead><tbody>${d.sectors.map(x=>`<tr><td><b>${esc(x.sector?.name||'Sem setor')}</b></td><td>${x.equipment}</td><td>${x.readings}</td><td>${x.deviations}</td><td>${x.conformity.toFixed(1)}%</td><td>${x.recurring}</td><td>${x.problem}</td></tr>`).join('')||'<tr><td colspan="7">Sem setores no filtro.</td></tr>'}</tbody></table></div></section>
      <section class="ctReportSection" data-ct-tab="equipamentos"><div class="ctPanelHead"><div><span>EQUIPAMENTOS</span><h3>Performance individual</h3></div></div><div class="tableWrap"><table><thead><tr><th>Equipamento</th><th>Setor</th><th>Coletas</th><th>Desvios</th><th>Conformidade</th><th>Recorrência</th><th>Última leitura</th></tr></thead><tbody>${d.equipmentStats.map(x=>`<tr><td><b>${esc(x.equipment.name)}</b></td><td>${esc(sector(x.equipment.sector_id)?.name||'Sem setor')}</td><td>${x.readings}</td><td>${x.deviations}</td><td>${x.conformity.toFixed(1)}%</td><td>${x.recurrence}</td><td>${x.last?`${num(x.last.temperature_avg??x.last.temperature,1)} °C • ${fmtDate(x.last.reading_date)}`:'—'}</td></tr>`).join('')||'<tr><td colspan="7">Sem equipamentos.</td></tr>'}</tbody></table></div></section>
      <section class="ctReportSection" data-ct-tab="desvios"><div class="ctPanelHead"><div><span>DESVIOS</span><h3>Todas as coletas fora da faixa</h3></div></div><div class="tableWrap"><table><thead><tr><th>Data/hora</th><th>Equipamento</th><th>Setor</th><th>Resultado</th><th>Faixa</th><th>Desvio além do limite</th><th>Responsável</th><th>Ação corretiva</th></tr></thead><tbody>${d.dev.map(r=>{const e=equipment(r.equipment_id),u=profile(r.created_by);return `<tr><td>${fmtDate(r.reading_date)} ${String(r.reading_time||'').slice(0,5)}</td><td><b>${esc(e?.name||'—')}</b></td><td>${esc(sector(e?.sector_id)?.name||'Sem setor')}</td><td class="badText"><b>${num(r.temperature_avg??r.temperature,1)} °C</b></td><td>${e?`${e.min_temp} a ${e.max_temp} °C`:'—'}</td><td>${ctDeviationMagnitude(r,e).toFixed(1)} °C</td><td>${esc(u?.full_name||r.responsible_name||'—')}</td><td>${esc(r.corrective_action||'—')}</td></tr>`}).join('')||'<tr><td colspan="8">Nenhum desvio.</td></tr>'}</tbody></table></div></section>
      <section class="ctReportSection" data-ct-tab="responsaveis"><div class="ctPanelHead"><div><span>EXECUÇÃO</span><h3>Coletas por responsável</h3></div></div><div class="tableWrap"><table><thead><tr><th>Responsável</th><th>Coletas</th><th>Desvios encontrados</th><th>Conformidade das coletas</th></tr></thead><tbody>${d.collectors.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${x.readings}</td><td>${x.deviations}</td><td>${x.conformity.toFixed(1)}%</td></tr>`).join('')||'<tr><td colspan="4">Sem coletas.</td></tr>'}</tbody></table></div></section>
      <section class="ctReportSection" data-ct-tab="problemas"><div class="ctPanelHead"><div><span>MANUTENÇÃO</span><h3>Equipamentos com problema atualmente</h3></div></div><div class="ctIssueGrid">${d.problems.map(e=>`<article><span class="operationalBadge ${operationalClass(e.operational_status)}">${operationalLabel(e.operational_status)}</span><h4>${esc(e.name)}</h4><p>${esc(sector(e.sector_id)?.name||'Sem setor')}</p><small>${esc(e.status_note||'Sem observação registrada.')}</small></article>`).join('')||'<div class="ctEmptyMini">Nenhum equipamento com problema atual.</div>'}</div></section>
    </div>`;
  };
  window.ctReportTab=(name,btn)=>{
    document.querySelectorAll('.ctReportTabs button').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.ctReportSection').forEach(x=>x.classList.toggle('active',x.dataset.ctTab===name));
  };

  function ctSheetFromRows(rows,columns){
    const data=rows.map(row=>{const out={};columns.forEach(([key,label])=>out[label]=row[key]??'');return out});
    const ws=XLSX.utils.json_to_sheet(data.length?data:[Object.fromEntries(columns.map(([,label])=>[label,'']))]);
    ws['!cols']=columns.map(([,label])=>({wch:Math.min(45,Math.max(12,label.length+3))}));
    if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};
    return ws;
  }
  function ctAddSheet(wb,name,rows,columns){XLSX.utils.book_append_sheet(wb,ctSheetFromRows(rows,columns),name.slice(0,31))}
  window.ctExportExcel=sidArg=>{
    if(!window.XLSX)return toast('O módulo de Excel ainda não carregou. Atualize a página e tente novamente.','warn');
    const sid=sidArg||currentScopeStore()||null,d=ctReportData(sid),scope=ctScopeName(sid);
    const wb=XLSX.utils.book_new();
    const resumo=[
      {indicador:'Escopo',valor:scope},{indicador:'Período',valor:ctDateRangeLabel()},{indicador:'Coletas',valor:d.rs.length},{indicador:'Coletas dentro da faixa',valor:d.rs.length-d.dev.length},{indicador:'Desvios',valor:d.dev.length},{indicador:'Conformidade (%)',valor:d.conformity},{indicador:'Equipamentos ativos no filtro',valor:d.eqs.length},{indicador:'Equipamentos com coleta',valor:d.covered},{indicador:'Cobertura (%)',valor:ctPct(d.covered,d.eqs.length)},{indicador:'Equipamentos recorrentes',valor:d.recurring.length},{indicador:'Desvio médio além do limite (°C)',valor:Number(d.avgDeviation.toFixed(2))},{indicador:'Alertas abertos atualmente',valor:d.openAlerts.length},{indicador:'Alertas em tratamento atualmente',valor:d.treatingAlerts.length},{indicador:'Problemas físicos atuais',valor:d.problems.length}
    ];
    ctAddSheet(wb,'Resumo',resumo,[['indicador','Indicador'],['valor','Valor']]);
    const coletas=d.rs.map(r=>{const e=equipment(r.equipment_id),u=profile(r.created_by);return {data:fmtDate(r.reading_date),hora:String(r.reading_time||'').slice(0,5),loja:store(e?.store_id)?.name||'',setor:sector(e?.sector_id)?.name||'Sem setor',equipamento:e?.name||'',categoria:e?.category||'',medicoes:Number(r.sample_count||1),temp1:r.temperature_1??r.temperature,temp2:r.temperature_2??'',temp3:r.temperature_3??'',media:r.temperature_avg??r.temperature,minima:r.temperature_min??r.temperature,maxima:r.temperature_max??r.temperature,faixa:e?`${e.min_temp} a ${e.max_temp} °C`:'',status:isReadingOutOfRange(r)?'Fora da faixa':'Normal',condicao:operationalLabel(r.equipment_condition),responsavel:u?.full_name||r.responsible_name||'',observacao:r.notes||'',acao:r.corrective_action||''}});
    ctAddSheet(wb,'Coletas',coletas,[['data','Data'],['hora','Hora'],['loja','Loja'],['setor','Setor'],['equipamento','Equipamento'],['categoria','Categoria'],['medicoes','Qtd. medições'],['temp1','Temperatura 1'],['temp2','Temperatura 2'],['temp3','Temperatura 3'],['media','Média °C'],['minima','Mínima °C'],['maxima','Máxima °C'],['faixa','Faixa permitida'],['status','Status'],['condicao','Condição equipamento'],['responsavel','Responsável'],['observacao','Observação'],['acao','Ação corretiva']]);
    const desvios=d.dev.map(r=>{const e=equipment(r.equipment_id),u=profile(r.created_by);return {data:fmtDate(r.reading_date),hora:String(r.reading_time||'').slice(0,5),loja:store(e?.store_id)?.name||'',setor:sector(e?.sector_id)?.name||'',equipamento:e?.name||'',resultado:r.temperature_avg??r.temperature,limite_min:e?.min_temp,limite_max:e?.max_temp,excesso:Number(ctDeviationMagnitude(r,e).toFixed(2)),responsavel:u?.full_name||r.responsible_name||'',acao:r.corrective_action||'',observacao:r.notes||''}});
    ctAddSheet(wb,'Desvios',desvios,[['data','Data'],['hora','Hora'],['loja','Loja'],['setor','Setor'],['equipamento','Equipamento'],['resultado','Resultado °C'],['limite_min','Limite mín. °C'],['limite_max','Limite máx. °C'],['excesso','Desvio além do limite °C'],['responsavel','Responsável'],['acao','Ação corretiva'],['observacao','Observação']]);
    const eqRows=d.equipmentStats.map(x=>({loja:store(x.equipment.store_id)?.name||'',setor:sector(x.equipment.sector_id)?.name||'',equipamento:x.equipment.name,categoria:x.equipment.category||'',min:x.equipment.min_temp,max:x.equipment.max_temp,ideal:x.equipment.target_temp,coletas:x.readings,desvios:x.deviations,conformidade:Number(x.conformity.toFixed(1)),recorrencia:x.recurrence,situacao:operationalLabel(x.equipment.operational_status),ultima:x.last?`${fmtDate(x.last.reading_date)} ${String(x.last.reading_time||'').slice(0,5)}`:''}));
    ctAddSheet(wb,'Equipamentos',eqRows,[['loja','Loja'],['setor','Setor'],['equipamento','Equipamento'],['categoria','Categoria'],['min','Mín. permitida °C'],['max','Máx. permitida °C'],['ideal','Ideal °C'],['coletas','Coletas'],['desvios','Desvios'],['conformidade','Conformidade %'],['recorrencia','Recorrência'],['situacao','Situação atual'],['ultima','Última coleta']]);
    const rank=d.rec.map((x,i)=>({posicao:i+1,loja:store(x.equipment?.store_id)?.name||'',setor:sector(x.equipment?.sector_id)?.name||'',equipamento:x.equipment?.name||'',desvios:x.count,classificacao:x.recurring?'Recorrente':'Pontual',ultimo:x.last?`${fmtDate(x.last.reading_date)} ${String(x.last.reading_time||'').slice(0,5)}`:''}));
    ctAddSheet(wb,'Ranking Desvios',rank,[['posicao','Posição'],['loja','Loja'],['setor','Setor'],['equipamento','Equipamento'],['desvios','Desvios'],['classificacao','Classificação'],['ultimo','Último desvio']]);
    const secRows=d.sectors.map(x=>({setor:x.sector?.name||'Sem setor',equipamentos:x.equipment,coletas:x.readings,desvios:x.deviations,conformidade:Number(x.conformity.toFixed(1)),recorrentes:x.recurring,problemas:x.problem}));
    ctAddSheet(wb,'Setores',secRows,[['setor','Setor'],['equipamentos','Equipamentos'],['coletas','Coletas'],['desvios','Desvios'],['conformidade','Conformidade %'],['recorrentes','Recorrentes'],['problemas','Problemas atuais']]);
    const alertRows=d.currentAlerts.map(a=>{const e=equipment(a.equipment_id),r=reading(a.reading_id);return {criado:a.created_at?new Date(a.created_at).toLocaleString('pt-BR'):'',loja:store(a.store_id)?.name||'',setor:sector(e?.sector_id)?.name||'',equipamento:e?.name||'',status:a.status==='open'?'Aberto':a.status==='acknowledged'?'Em tratamento':'Encerrado',temperatura:r?.temperature_avg??r?.temperature??'',faixa:e?`${e.min_temp} a ${e.max_temp} °C`:'',coleta:r?`${fmtDate(r.reading_date)} ${String(r.reading_time||'').slice(0,5)}`:''}});
    ctAddSheet(wb,'Alertas',alertRows,[['criado','Criado em'],['loja','Loja'],['setor','Setor'],['equipamento','Equipamento'],['status','Status'],['temperatura','Temperatura °C'],['faixa','Faixa permitida'],['coleta','Data da coleta']]);
    const incidentRows=state.incidents.filter(i=>(!sid||i.store_id===sid)&&(!analysisFilter.equipmentId||i.equipment_id===analysisFilter.equipmentId)).map(i=>{const e=equipment(i.equipment_id);return {loja:store(i.store_id)?.name||'',setor:sector(e?.sector_id)?.name||'',equipamento:e?.name||'',tipo:operationalLabel(i.incident_type),status:i.status==='open'?'Aberto':'Resolvido',aberto:i.opened_at?new Date(i.opened_at).toLocaleString('pt-BR'):'',descricao:i.description||'',resolucao:i.resolution||'',resolvido:i.resolved_at?new Date(i.resolved_at).toLocaleString('pt-BR'):''}});
    ctAddSheet(wb,'Ocorrencias',incidentRows,[['loja','Loja'],['setor','Setor'],['equipamento','Equipamento'],['tipo','Tipo'],['status','Status'],['aberto','Aberto em'],['descricao','Descrição'],['resolucao','Resolução'],['resolvido','Resolvido em']]);
    const respRows=d.collectors.map(x=>({responsavel:x.name,coletas:x.readings,desvios:x.deviations,conformidade:Number(x.conformity.toFixed(1))}));
    ctAddSheet(wb,'Responsaveis',respRows,[['responsavel','Responsável'],['coletas','Coletas'],['desvios','Desvios encontrados'],['conformidade','Conformidade %']]);
    const dayRows=d.daily.map(x=>({data:fmtDate(x.date),coletas:x.readings,desvios:x.deviations,conformidade:Number(ctPct(x.readings-x.deviations,x.readings).toFixed(1))}));
    ctAddSheet(wb,'Analise Diaria',dayRows,[['data','Data'],['coletas','Coletas'],['desvios','Desvios'],['conformidade','Conformidade %']]);
    const filename=`Central_Temp_${ctSafeFile(scope)}_${analysisFilter.start||'inicio'}_a_${analysisFilter.end||'hoje'}.xlsx`;
    XLSX.writeFile(wb,filename,{compression:true});toast('Relatório Excel gerado com 10 abas.','good');
  };

  window.ctPrintReport=sidArg=>{
    const sid=sidArg||currentScopeStore()||null,d=ctReportData(sid),scope=ctScopeName(sid);
    const w=window.open('','_blank');
    const rank=d.rec.slice(0,20).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.equipment?.name||'—')}</td><td>${esc(sector(x.equipment?.sector_id)?.name||'Sem setor')}</td><td>${x.count}</td><td>${x.recurring?'Recorrente':'Pontual'}</td></tr>`).join('');
    const sectors=d.sectors.map(x=>`<tr><td>${esc(x.sector?.name||'Sem setor')}</td><td>${x.readings}</td><td>${x.deviations}</td><td>${x.conformity.toFixed(1)}%</td><td>${x.recurring}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório Central Temp</title><style>body{font-family:Arial,sans-serif;color:#0b2146;margin:0;padding:28px}.head{background:#08285f;color:#fff;padding:20px;border-radius:12px}.head h1{margin:0 0 6px;font-size:22px}.head p{margin:0;color:#dce8ff}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.kpis div{border:1px solid #dce4ef;border-radius:9px;padding:10px}.kpis small{display:block;color:#6a7890;font-size:9px;text-transform:uppercase}.kpis b{font-size:20px}h2{font-size:15px;margin-top:22px;border-bottom:2px solid #e8edf5;padding-bottom:6px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #dfe5ee;padding:6px;text-align:left}th{background:#f4f7fb}@media print{body{padding:10px}.head{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="head"><h1>Relatório Gerencial — Central Temp</h1><p>${esc(scope)} • ${ctDateRangeLabel()}</p></div><div class="kpis"><div><small>Coletas</small><b>${d.rs.length}</b></div><div><small>Conformidade</small><b>${d.conformity.toFixed(1)}%</b></div><div><small>Desvios</small><b>${d.dev.length}</b></div><div><small>Recorrentes</small><b>${d.recurring.length}</b></div><div><small>Alertas abertos</small><b>${d.openAlerts.length}</b></div><div><small>Em tratamento</small><b>${d.treatingAlerts.length}</b></div><div><small>Cobertura</small><b>${ctPct(d.covered,d.eqs.length).toFixed(1)}%</b></div><div><small>Problemas atuais</small><b>${d.problems.length}</b></div></div><h2>Ranking de desvios</h2><table><thead><tr><th>#</th><th>Equipamento</th><th>Setor</th><th>Desvios</th><th>Classificação</th></tr></thead><tbody>${rank||'<tr><td colspan="5">Sem desvios.</td></tr>'}</tbody></table><h2>Desempenho por setor</h2><table><thead><tr><th>Setor</th><th>Coletas</th><th>Desvios</th><th>Conformidade</th><th>Recorrentes</th></tr></thead><tbody>${sectors||'<tr><td colspan="5">Sem dados.</td></tr>'}</tbody></table><p style="margin-top:22px;font-size:9px;color:#718096">Gerado pelo Central Temp • ${new Date().toLocaleString('pt-BR')}</p></body></html>`);
    w.document.close();setTimeout(()=>w.print(),180);
  };
  window.printReport=window.ctPrintReport;

  const ctBaseRenderActions=window.renderActions;
  window.renderActions=function(){
    if(typeof ctBaseRenderActions==='function')ctBaseRenderActions();
    const h=document.getElementById('actionHost');if(!h)return;
    if(state.page==='network')h.innerHTML=`<button class="ctHeaderPeriod" onclick="ctFocusPeriod()">${ctDateRangeLabel()}</button><button class="ctHeaderFilter" onclick="ctFocusPeriod()" aria-label="Filtrar período">⌕</button>`;
    if(state.page==='store')h.innerHTML=`<button class="btn ghost" onclick="ctExportExcel('${currentScopeStore()||''}')">Exportar Excel</button><button class="btn ghost" onclick="ctPrintReport('${currentScopeStore()||''}')">Imprimir</button>${can('readings.create')?'<button class="btn topCollectBtn" onclick="goToCollectForm()">Registrar coleta</button>':''}`;
    if(state.page==='reports')h.innerHTML=`<button class="btn ghost" onclick="ctExportExcel('${currentScopeStore()||''}')">Exportar Excel</button><button class="btn primary" onclick="ctPrintReport('${currentScopeStore()||''}')">Imprimir / PDF</button>`;
  };

  console.info('Central Temp analytics upgrade',CT_VERSION);
})();
