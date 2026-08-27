window.toggleLoginPassword=()=>{
  const el=document.getElementById('loginPassword');
  if(el)el.type=el.type==='password'?'text':'password';
};

function vxDateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function vxLastDays(n=7){
  const days=[];const now=new Date();
  for(let i=n-1;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push(d)}
  return days;
}
function vxDeviationSeries(n=7){
  const rs=filteredReadings();
  return vxLastDays(n).map(d=>{
    const key=vxDateKey(d),count=rs.filter(r=>r.reading_date===key&&isReadingOutOfRange(r)).length;
    return {date:key,label:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()],count};
  });
}
function vxLineChart(series){
  const w=520,h=230,left=34,right=14,top=20,bottom=34,plotW=w-left-right,plotH=h-top-bottom;
  const max=Math.max(5,...series.map(x=>x.count));
  const ceil=Math.ceil(max/5)*5;
  const points=series.map((x,i)=>({x:left+i*(plotW/(series.length-1||1)),y:top+plotH-(x.count/ceil)*plotH,...x}));
  const poly=points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const maxPoint=points.reduce((a,b)=>b.count>a.count?b:a,points[0]||{x:0,y:0,count:0,label:''});
  const grids=[0,.25,.5,.75,1].map(k=>{const y=top+plotH*(1-k),v=Math.round(ceil*k);return `<line x1="${left}" y1="${y}" x2="${w-right}" y2="${y}" stroke="#e7ebf1" stroke-width="1"/><text x="2" y="${y+4}" font-size="10" fill="#758198">${v}</text>`}).join('');
  const labels=points.map(p=>`<text x="${p.x}" y="${h-8}" text-anchor="middle" font-size="10" fill="#66748d">${p.label}</text>`).join('');
  const dots=points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4.6" fill="#092b70" stroke="#fff" stroke-width="2"/>`).join('');
  const tip=maxPoint?`<g><rect x="${Math.min(w-90,Math.max(5,maxPoint.x-34))}" y="${Math.max(2,maxPoint.y-48)}" rx="5" width="72" height="38" fill="#082b70"/><text x="${Math.min(w-54,Math.max(41,maxPoint.x+2))}" y="${Math.max(15,maxPoint.y-31)}" text-anchor="middle" font-size="9" fill="#fff">${maxPoint.label}</text><text x="${Math.min(w-54,Math.max(41,maxPoint.x+2))}" y="${Math.max(27,maxPoint.y-19)}" text-anchor="middle" font-size="9" fill="#fff">${maxPoint.count} desvios</text></g>`:'';
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Recorrência de desvios nos últimos sete dias">${grids}<polyline fill="none" stroke="#092b70" stroke-width="2.5" points="${poly}"/>${dots}${labels}${tip}</svg>`;
}
function vxAgo(r){
  try{
    const iso=`${r.reading_date}T${String(r.reading_time||'00:00').slice(0,8)}`;const t=new Date(iso).getTime();
    if(!Number.isFinite(t))return '';
    const m=Math.max(0,Math.round((Date.now()-t)/60000));
    if(m<60)return `Há ${m||1} min`;
    const h=Math.round(m/60);if(h<24)return `Há ${h} h`;
    return fmtDate(r.reading_date);
  }catch{return ''}
}
function vxLatestReadings(limit=5){
  return filteredReadings().slice().sort((a,b)=>(`${b.reading_date}${b.reading_time||''}`).localeCompare(`${a.reading_date}${a.reading_time||''}`)).slice(0,limit);
}
function vxEquipmentStatusCounts(eqs){
  let ok=0,attention=0,bad=0,none=0;
  eqs.forEach(e=>{const r=lastReading(e.id);if(!r){none++;return}if(isReadingOutOfRange(r,e)){bad++;return}if(e.operational_status&&e.operational_status!=='operational'){attention++;return}ok++});
  return {ok,attention,bad,none,total:eqs.length};
}
function vxPercent(n,total){return total?Math.round(n*1000/total)/10:0}
function vxTempValue(r){return Number(r?.temperature_avg??r?.temperature??0)}
function vxReadingClass(r){const e=equipment(r.equipment_id);if(!e)return 'warn';return isReadingOutOfRange(r,e)?'bad':'ok'}
function vxNavPolish(){
  const dash=document.querySelector('.nav[data-page="network"] .navText');if(dash)dash.textContent='Dashboard';
  const storeDash=document.querySelector('.nav[data-page="store"] .navText');if(storeDash)storeDash.textContent='Dashboard da Loja';
}
const vxNavObserver=new MutationObserver(vxNavPolish);const vxNavHost=document.getElementById('navHost');if(vxNavHost)vxNavObserver.observe(vxNavHost,{childList:true,subtree:true});

function vxSetDashboardHeader(){
  const t=document.getElementById('pageTitle'),s=document.getElementById('pageSub');
  if(t)t.textContent='CONTROLE DE TEMPERATURA';
  if(s)s.textContent='Monitoramento inteligente para lojas sempre seguras.';
  vxNavPolish();
}

function vxRenderNetworkExact(){
  vxSetDashboardHeader();
  const stores=filteredStores().filter(s=>s.active),eqs=filteredEquipment().filter(e=>e.active),today=localISODate();
  const todayReadings=filteredReadings().filter(r=>r.reading_date===today).length;
  const openAlerts=scopedAlerts().filter(a=>a.status==='open').length;
  const outEq=eqs.filter(e=>{const r=lastReading(e.id);return !!r&&isReadingOutOfRange(r,e)}).length;
  const series=vxDeviationSeries(7),maxDay=series.reduce((a,b)=>b.count>a.count?b:a,series[0]||{label:'—',count:0});
  const st=vxEquipmentStatusCounts(eqs),total=st.total||1,p1=vxPercent(st.ok,total),p2=p1+vxPercent(st.attention,total),p3=p2+vxPercent(st.bad,total);
  const latest=vxLatestReadings(5);
  const dailyDone=eqs.filter(e=>dailyGoalInfo(e,today).met).length;
  const latestHtml=latest.map(r=>{
    const e=equipment(r.equipment_id),s=store(r.store_id||e?.store_id),cls=vxReadingClass(r),temp=vxTempValue(r);
    const icon=cls==='bad'?'!':'✓';
    return `<div class="vxLatestItem"><span class="vxStatusCircle ${cls}">${icon}</span><div class="vxLatestMain"><b>${esc(s?.name||'Loja')}</b><small>${esc(e?.name||'Equipamento')}</small></div><div class="vxTemp"><b class="${cls==='bad'?'vxBad':'vxGood'}">${num(temp,1)} °C</b><small>${vxAgo(r)}</small></div><span>›</span></div>`;
  }).join('');

  document.getElementById('content').innerHTML=`
  <div class="vxDashboard">
    <div class="vxKpis">
      <div class="vxKpi"><span class="vxKpiIcon vxBlue">▢</span><div><div class="vxKpiLabel">Coletas do dia</div><div class="vxKpiValue">${todayReadings}</div><div class="vxKpiFoot vxGood">${dailyDone}/${eqs.length} equipamentos com meta 3/3</div></div></div>
      <div class="vxKpi"><span class="vxKpiIcon vxOrange">!</span><div><div class="vxKpiLabel">Equipamentos<br>fora do padrão</div><div class="vxKpiValue">${outEq}</div><div class="vxKpiFoot ${outEq?'vxBad':'vxGood'}">${outEq?'Requer acompanhamento':'Todos dentro do padrão'}</div></div></div>
      <div class="vxKpi"><span class="vxKpiIcon vxGreen">⌂</span><div><div class="vxKpiLabel">Lojas<br>monitoradas</div><div class="vxKpiValue">${stores.length}</div><div class="vxKpiFoot vxGood">${stores.length?'100% ativas':'Nenhuma ativa'}</div></div></div>
      <div class="vxKpi"><span class="vxKpiIcon vxRed">♢</span><div><div class="vxKpiLabel">Alertas<br>ativos</div><div class="vxKpiValue">${openAlerts}</div><div class="vxKpiFoot ${openAlerts?'vxBad':'vxGood'}">${openAlerts?'Requer atenção':'Sem alertas abertos'}</div></div></div>
    </div>

    <div class="vxMainColumn">
      <div class="vxMidGrid">
        <section class="vxPanel">
          <div class="vxPanelTitle"><h3>RECORRÊNCIA DE DESVIOS</h3><select class="vxPeriod" onchange="vxChangePeriod(this.value)"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="month">Este mês</option></select></div>
          <div class="vxChart">${vxLineChart(series)}<div class="vxChartNote">ⓘ &nbsp; ${maxDay.count?`${maxDay.label} teve o maior número de desvios no período (${maxDay.count}).`:'Nenhum desvio registrado nos últimos 7 dias.'}</div></div>
        </section>
        <section class="vxPanel">
          <div class="vxPanelTitle"><h3>SITUAÇÃO POR SETOR</h3></div>
          <div class="vxDonutArea">
            <div class="vxDonut" style="--p1:${p1}%;--p2:${p2}%;--p3:${p3}%"><div class="vxDonutCenter"><b>${st.total}</b><span>Equipamentos<br>no total</span></div></div>
            <div class="vxLegend">
              <div class="vxLegendRow"><span class="vxLegendDot" style="background:#08a446"></span><div><b>Dentro do padrão</b><small>${st.ok} (${vxPercent(st.ok,total)}%)</small></div></div>
              <div class="vxLegendRow"><span class="vxLegendDot" style="background:#f6a000"></span><div><b>Atenção</b><small>${st.attention} (${vxPercent(st.attention,total)}%)</small></div></div>
              <div class="vxLegendRow"><span class="vxLegendDot" style="background:#ec3540"></span><div><b>Fora do padrão</b><small>${st.bad} (${vxPercent(st.bad,total)}%)</small></div></div>
              <div class="vxLegendRow"><span class="vxLegendDot" style="background:#9aa3b2"></span><div><b>Sem coleta</b><small>${st.none} (${vxPercent(st.none,total)}%)</small></div></div>
            </div>
          </div>
          <button class="vxDetailsBtn" onclick="go('equipment')">Ver detalhes por setor &nbsp; ›</button>
        </section>
      </div>
      <div class="vxLossBanner"><img class="vxLossMascot" src="assets/nilo-mascote.webp" alt="Mascote Nilo"><div class="vxLossText"><b>Prevenir perdas é proteger resultados.</b><p>Dados confiáveis, ação rápida e disciplina operacional fazem a diferença todos os dias.</p></div><div class="vxLossTips"><div class="vxTip"><div class="vxTipIcon">▣</div>Monitore<br>regularmente</div><div class="vxTip"><div class="vxTipIcon">♨</div>Aja rápido<br>em desvios</div><div class="vxTip"><div class="vxTipIcon">✓</div>Garanta qualidade<br>e segurança</div></div></div>
    </div>

    <aside class="vxLatest"><div class="vxLatestHead"><h3>ÚLTIMAS COLETAS</h3><button onclick="go('readings')">Ver todas</button></div>${latestHtml||'<div class="emptyState"><b>Sem coletas</b><span>Nenhuma coleta registrada ainda.</span></div>'}<button class="vxAllBtn" onclick="go('readings')">Ver todas as coletas &nbsp; ›</button></aside>
  </div>`;
}

const vxBaseRenderNetwork=window.renderNetwork;
window.renderNetwork=function(){
  try{return vxRenderNetworkExact()}
  catch(e){
    console.error('DASHBOARD_VISUAL_ERROR',e);
    const msg=document.getElementById('loginMsg');
    if(msg)msg.textContent='';
    if(typeof vxBaseRenderNetwork==='function')return vxBaseRenderNetwork();
    throw e;
  }
};

window.vxChangePeriod=v=>{
  if(v==='7'){const d=new Date();d.setDate(d.getDate()-6);analysisFilter.start=vxDateKey(d);analysisFilter.end=localISODate()}
  else if(v==='30'){const d=new Date();d.setDate(d.getDate()-29);analysisFilter.start=vxDateKey(d);analysisFilter.end=localISODate()}
  else{analysisFilter.start=monthStartISO();analysisFilter.end=localISODate()}
  window.renderNetwork();
};

setTimeout(vxNavPolish,0);
