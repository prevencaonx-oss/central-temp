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
    return {date:key,label:`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,count};
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
  const dots=points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4.6" fill="#ef3340" stroke="#fff" stroke-width="2"/>`).join('');
  const tip=maxPoint?`<g><rect x="${Math.min(w-90,Math.max(5,maxPoint.x-34))}" y="${Math.max(2,maxPoint.y-48)}" rx="5" width="72" height="38" fill="#082b70"/><text x="${Math.min(w-54,Math.max(41,maxPoint.x+2))}" y="${Math.max(15,maxPoint.y-31)}" text-anchor="middle" font-size="9" fill="#fff">${maxPoint.label}</text><text x="${Math.min(w-54,Math.max(41,maxPoint.x+2))}" y="${Math.max(27,maxPoint.y-19)}" text-anchor="middle" font-size="9" fill="#fff">${maxPoint.count} desvios</text></g>`:'';
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Recorrência de alertas nos últimos sete dias">${grids}<polyline fill="none" stroke="#ef3340" stroke-width="2.5" points="${poly}"/>${dots}${labels}${tip}</svg>`;
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
function vxInt(n){return Number(n||0).toLocaleString('pt-BR')}
function vxTrend(now,before){
  if(!before)return now?{text:'↑ Novas coletas hoje',cls:'up'}:{text:'Sem variação',cls:'neutral'};
  const value=Math.round(Math.abs((now-before)/before)*1000)/10;
  return {text:`${now>=before?'↑':'↓'} ${value}% vs ontem`,cls:now>=before?'up':'down'};
}
function vxTempValue(r){return Number(r?.temperature_avg??r?.temperature??0)}
function vxReadingClass(r){const e=equipment(r.equipment_id);if(!e)return 'warn';return isReadingOutOfRange(r,e)?'bad':'ok'}
function vxNavPolish(){
  const dash=document.querySelector('.nav[data-page="network"] .navText');
  if(dash&&dash.textContent!=='Dashboard')dash.textContent='Dashboard';
  const storeDash=document.querySelector('.nav[data-page="store"] .navText');
  if(storeDash&&storeDash.textContent!=='Dashboard da Loja')storeDash.textContent='Dashboard da Loja';
  const icons={network:'⌂',store:'⌂',stores:'▥',equipment:'♧',readings:'▣',pending:'♢',reports:'▥',users:'♙',audit:'▤',account:'⚙'};
  document.querySelectorAll('.nav[data-page]').forEach(nav=>{
    const el=nav.querySelector('.navIcon'),page=nav.dataset.page;
    if(el&&el.dataset.vxIcon!==page){el.textContent=icons[page]||'•';el.dataset.vxIcon=page}
  });
  document.querySelectorAll('.mobileBottomNav [data-mobile-page]').forEach(btn=>btn.classList.toggle('active',btn.dataset.mobilePage===state.page));
}
const vxNavObserver=new MutationObserver(vxNavPolish);const vxNavHost=document.getElementById('navHost');if(vxNavHost)vxNavObserver.observe(vxNavHost,{childList:true,subtree:true});

function vxSetDashboardHeader(){
  const t=document.getElementById('pageTitle'),s=document.getElementById('pageSub');
  if(t)t.textContent='Prevenção de Perdas';
  if(s)s.textContent='Acompanhe os indicadores de temperatura das lojas';
  vxNavPolish();
}

function vxRenderNetworkExact(){
  vxSetDashboardHeader();
  const allStores=filteredStores(),stores=allStores.filter(s=>s.active),allEqs=filteredEquipment(),eqs=allEqs.filter(e=>e.active),today=localISODate();
  const yesterdayDate=new Date();yesterdayDate.setDate(yesterdayDate.getDate()-1);const yesterday=vxDateKey(yesterdayDate);
  const todayReadings=filteredReadings().filter(r=>r.reading_date===today).length;
  const yesterdayReadings=filteredReadings().filter(r=>r.reading_date===yesterday).length,readingTrend=vxTrend(todayReadings,yesterdayReadings);
  const scoped=scopedAlerts(),openAlerts=scoped.filter(a=>a.status==='open').length,alertsCreatedToday=scoped.filter(a=>String(a.created_at||'').slice(0,10)===today).length;
  const series=vxDeviationSeries(7),maxDay=series.reduce((a,b)=>b.count>a.count?b:a,series[0]||{label:'—',count:0});
  const st=vxEquipmentStatusCounts(eqs),total=st.total||1,offline=st.none+st.attention,p1=vxPercent(st.ok,total),p2=p1+vxPercent(st.bad,total);
  const latest=vxLatestReadings(5);
  const latestHtml=latest.map(r=>{
    const e=equipment(r.equipment_id),s=store(r.store_id||e?.store_id),cls=vxReadingClass(r),temp=vxTempValue(r);
    return `<tr><td data-label="Data/Hora">${fmtDate(r.reading_date)} ${String(r.reading_time||'').slice(0,5)}</td><td data-label="Loja">${esc(s?.name||'Loja')}</td><td data-label="Equipamento">${esc(e?.name||'Equipamento')}</td><td data-label="Temperatura"><b>${num(temp,1)} °C</b></td><td data-label="Status"><span class="vxTableStatus ${cls}">${cls==='bad'?'Alerta':'Normal'}</span></td></tr>`;
  }).join('');
  const firstName=esc(String(state.profile?.full_name||'André').trim().split(/\s+/)[0]||'André');

  document.getElementById('content').innerHTML=`
  <div class="vxDashboard">
    <div class="vxMobileHello"><div><b>Olá, ${firstName}!</b><span>Acompanhe os indicadores das lojas</span></div><time>${fmtDate(today)}</time></div>
    <div class="vxKpis">
      <div class="vxKpi"><span class="vxKpiIcon vxBlue">♨</span><div><div class="vxKpiValue">${vxInt(todayReadings)}</div><div class="vxKpiLabel">Total de Coletas</div><div class="vxKpiSub">Hoje</div><div class="vxKpiFoot ${readingTrend.cls}">${readingTrend.text}</div></div></div>
      <div class="vxKpi"><span class="vxKpiIcon vxRed">♢</span><div><div class="vxKpiValue">${vxInt(openAlerts)}</div><div class="vxKpiLabel">Alertas Ativos</div><div class="vxKpiSub">Hoje</div><div class="vxKpiFoot ${alertsCreatedToday?'risk':'neutral'}">${alertsCreatedToday?`↑ ${alertsCreatedToday} novo(s) hoje`:'Sem novos alertas hoje'}</div></div></div>
      <div class="vxKpi"><span class="vxKpiIcon vxGreen">▥</span><div><div class="vxKpiValue">${vxInt(stores.length)}</div><div class="vxKpiLabel">Lojas Monitoradas</div><div class="vxKpiSub">Ativas</div><div class="vxKpiFoot up">${vxPercent(stores.length,allStores.length||1)}% do total</div></div></div>
      <div class="vxKpi"><span class="vxKpiIcon vxYellow">♨</span><div><div class="vxKpiValue">${vxInt(eqs.length)}</div><div class="vxKpiLabel">Equipamentos</div><div class="vxKpiSub">Ativos</div><div class="vxKpiFoot up">${vxPercent(eqs.length,allEqs.length||1)}% do total</div></div></div>
    </div>

    <div class="vxMidGrid">
      <section class="vxPanel">
        <div class="vxPanelTitle"><h3>Recorrência de Alertas</h3><select class="vxPeriod" onchange="vxChangePeriod(this.value)"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="month">Este mês</option></select></div>
        <div class="vxChart">${vxLineChart(series)}<div class="vxChartNote">${maxDay.count?`${maxDay.label} concentrou o maior número de alertas (${maxDay.count}).`:'Nenhum alerta registrado nos últimos 7 dias.'}</div></div>
      </section>
      <section class="vxPanel">
        <div class="vxPanelTitle"><h3>Situação dos Equipamentos</h3></div>
        <div class="vxDonutArea">
          <div class="vxDonut" style="--p1:${p1}%;--p2:${p2}%"><div class="vxDonutCenter"><b>${st.total}</b><span>no total</span></div></div>
          <div class="vxLegend">
            <div class="vxLegendRow"><span class="vxLegendDot" style="background:#08a446"></span><div><b>Normal</b><small>${st.ok} (${vxPercent(st.ok,total)}%)</small></div></div>
            <div class="vxLegendRow"><span class="vxLegendDot" style="background:#ef3340"></span><div><b>Alerta</b><small>${st.bad} (${vxPercent(st.bad,total)}%)</small></div></div>
            <div class="vxLegendRow"><span class="vxLegendDot" style="background:#f6a000"></span><div><b>Offline</b><small>${offline} (${vxPercent(offline,total)}%)</small></div></div>
          </div>
        </div>
      </section>
    </div>

    <section class="vxLatest"><div class="vxLatestHead"><h3>Últimas Coletas</h3><button onclick="go('readings')">Ver todas</button></div><div class="vxTableWrap"><table><thead><tr><th>Data/Hora</th><th>Loja</th><th>Equipamento</th><th>Temperatura</th><th>Status</th></tr></thead><tbody>${latestHtml||'<tr><td colspan="5">Nenhuma coleta registrada ainda.</td></tr>'}</tbody></table></div></section>
    <div class="vxLossBanner"><img class="vxLossMascot" src="assets/nilo-mascote.webp" alt="Mascote Nilo"><div class="vxLossText"><b>NO QUIETO NO QUIETO, O <em>NILO</em> VENDE MAIS BARATO!</b><p>Prevenção hoje, segurança sempre.</p></div><div class="vxLossWave"></div></div>
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
