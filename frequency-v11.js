(()=>{
 const PROJECT='vwwkzenvcxedxiuopsgv';
 const URL='https://vwwkzenvcxedxiuopsgv.supabase.co';
 const KEY='sb_publishable_Vh9zdSxCUH0fMJOjf_G6Sw_UMU0t0to';
 const GOAL=3;
 let running=false, lastRun=0;
 function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
 function token(){try{const raw=localStorage.getItem(`sb-${PROJECT}-auth-token`);if(!raw)return null;const o=JSON.parse(raw);return o?.access_token||o?.currentSession?.access_token||null}catch{return null}}
 async function rest(path){const t=token();const h={apikey:KEY};if(t)h.Authorization=`Bearer ${t}`;const r=await fetch(`${URL}/rest/v1/${path}`,{headers:h});if(!r.ok)throw new Error(await r.text());return r.json()}
 function renameVisibleFrequency(){
   document.querySelectorAll('label').forEach(l=>{if(/Frequência padrão/i.test(l.textContent||'')){const box=l.parentElement;if(box){box.style.display='none'}}});
   document.querySelectorAll('th').forEach(th=>{if(/^Frequência$/i.test((th.textContent||'').trim()))th.textContent='Meta diária'});
   document.querySelectorAll('td').forEach(td=>{if(/^\s*\d+h\s*$/.test(td.textContent||'')){td.innerHTML='<b>3 coletas/dia</b><br><span class="muted">sem horário fixo</span>'}});
   document.querySelectorAll('.notice').forEach(n=>{if(/Frequência/i.test(n.textContent||''))return});
 }
 async function paintGoal(){
   const content=document.getElementById('content'); if(!content)return;
   const pageTitle=document.getElementById('pageTitle')?.textContent||'';
   if(!/Coletas/i.test(pageTitle)){renameVisibleFrequency();return}
   const host=[...document.querySelectorAll('.collectAsidePanel')].find(x=>/Precisam de coleta|Meta diária de coletas/i.test(x.textContent||''));
   if(!host)return;
   try{
     const today=localDate();
     const [eqs,reads]=await Promise.all([
       rest('equipment?select=id,name,store_id,samples_per_collection,active&active=eq.true'),
       rest(`readings?select=equipment_id,reading_date&reading_date=eq.${today}`)
     ]);
     const counts={}; reads.forEach(r=>counts[r.equipment_id]=(counts[r.equipment_id]||0)+1);
     const storeIds=[...new Set(eqs.map(e=>e.store_id).filter(Boolean))];
     let stores=[]; if(storeIds.length)stores=await rest(`stores?select=id,name&id=in.(${storeIds.join(',')})`);
     const sn=Object.fromEntries(stores.map(s=>[s.id,s.name]));
     eqs.sort((a,b)=>(counts[a.id]||0)-(counts[b.id]||0));
     host.innerHTML=`<h3>Meta diária de coletas</h3><p>Cada equipamento precisa ter no mínimo ${GOAL} coletas no dia. Não existem horários fixos.</p><div class="daily-goal-list">${eqs.slice(0,12).map(e=>{const c=counts[e.id]||0,met=c>=GOAL,p=Math.min(100,c/GOAL*100);return `<div class="daily-goal-row ${met?'met':''}"><div><b>${e.name}</b><small>${sn[e.store_id]||''} • coleta ${e.samples_per_collection||1}x</small><div class="daily-goal-bar"><span style="width:${p}%"></span></div><small><b>${c}/${GOAL}</b> coletas hoje ${met?'• meta concluída':`• faltam ${GOAL-c}`}</small></div>${met?'<span class="badge good">CONCLUÍDO</span>':''}</div>`}).join('')}</div>`;
   }catch(e){console.warn('Meta diária V11',e)}
   renameVisibleFrequency();
 }
 async function run(){const now=Date.now();if(running||now-lastRun<500)return;running=true;lastRun=now;try{await paintGoal()}finally{running=false}}
 const obs=new MutationObserver(()=>run());
 window.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{childList:true,subtree:true});setTimeout(run,800)});
 window.addEventListener('focus',run);
 setInterval(run,30000);
})();