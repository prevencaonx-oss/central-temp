const createClient=window.supabase.createClient;

const CFG=window.CENTRAL_TEMP_CONFIG||{};
const configured=CFG.SUPABASE_URL && !CFG.SUPABASE_URL.startsWith("COLE_") && CFG.SUPABASE_KEY && !CFG.SUPABASE_KEY.startsWith("COLE_");
const sb=configured?createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:"central-temp-auth-v1"}}):null;

const PERMS={
 "dashboard.network":"Dashboard geral da rede",
 "dashboard.store":"Dashboard da loja",
 "stores.view":"Visualizar lojas",
 "stores.manage":"Adicionar/editar/desativar lojas",
 "equipment.view":"Visualizar equipamentos",
 "equipment.manage":"Adicionar/editar/desativar equipamentos",
 "readings.view":"Visualizar coletas de temperatura",
 "readings.create":"Realizar coletas de temperatura",
 "alerts.view":"Visualizar alertas de temperatura",
 "alerts.manage":"Tratar/encerrar alertas",
 "reports.view":"Visualizar relatórios",
 "users.view":"Visualizar usuários",
 "users.manage_agents":"Gerenciar Agentes da própria loja",
 "users.manage_all":"Gerenciar todos os usuários",
 "audit.view":"Visualizar auditoria"
};
const ROLE_LABEL={admin:"Admin",leader:"Líder",agent:"Agente de Prevenção",custom:"Personalizado"};
const BUILTIN={
 admin:Object.keys(PERMS),
 leader:["dashboard.store","equipment.view","equipment.manage","readings.view","readings.create","alerts.view","alerts.manage","reports.view","users.view","users.manage_agents"],
 agent:["readings.view","readings.create"],
 custom:[]
};

let state={session:null,profile:null,stores:[],sectors:[],equipment:[],readings:[],profiles:[],alerts:[],incidents:[],audit:[],activeStoreId:null,page:null,channel:null};
let lastOwnReadingId=null;
window.state=state;

function showLoad(v){document.getElementById("loading").classList.toggle("hidden",!v)}
function toast(msg,type=""){const t=document.getElementById("toast");t.textContent=msg;t.className="toast"+(type?" "+type:"");t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),4200)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmtDate(v){if(!v)return"—";const [y,m,d]=v.split("-");return `${d}/${m}/${y}`}
function num(v,d=1){return Number(v).toFixed(d)}
function parseTemp(v){return Number(String(v??"").trim().replace(",", "."))}
function localISODate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function initials(name){return String(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function monthStartISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`}
let analysisFilter={start:monthStartISO(),end:localISODate(),sectorId:"",equipmentId:""};
function sector(id){return (state.sectors||[]).find(s=>s.id===id)}
function incident(id){return (state.incidents||[]).find(i=>i.id===id)}
function filteredSectors(){const sid=currentScopeStore();return (state.sectors||[]).filter(s=>(!sid||s.store_id===sid)&&s.active)}
function operationalLabel(v){return ({operational:"Operacional",broken:"Com defeito",maintenance:"Em manutenção",unavailable:"Indisponível"})[v]||v||"Operacional"}
function operationalClass(v){return ["broken","maintenance","unavailable"].includes(v)?v:"operational"}
function isReadingOutOfRange(r,e=equipment(r?.equipment_id)){
 if(!r||!e)return false;
 const lo=Number(r.temperature_min??r.temperature),hi=Number(r.temperature_max??r.temperature);
 return lo<Number(e.min_temp)||hi>Number(e.max_temp);
}
function readingsInAnalysisPeriod(){
 const ids=new Set(filteredEquipment().map(e=>e.id));
 return state.readings.filter(r=>{
   if(!ids.has(r.equipment_id))return false;
   if(analysisFilter.start&&r.reading_date<analysisFilter.start)return false;
   if(analysisFilter.end&&r.reading_date>analysisFilter.end)return false;
   const e=equipment(r.equipment_id);
   if(analysisFilter.sectorId&&e?.sector_id!==analysisFilter.sectorId)return false;
   if(analysisFilter.equipmentId&&r.equipment_id!==analysisFilter.equipmentId)return false;
   return true;
 });
}
function recurrenceData(){
 const rs=readingsInAnalysisPeriod(),map={};
 rs.forEach(r=>{const e=equipment(r.equipment_id);if(e&&isReadingOutOfRange(r,e)){(map[e.id]??=[]).push(r)}});
 return Object.entries(map).map(([id,arr])=>{
   const e=equipment(id),sorted=arr.slice().sort((a,b)=>(b.reading_date+b.reading_time).localeCompare(a.reading_date+a.reading_time));
   return {equipment:e,count:arr.length,last:sorted[0],recurring:arr.length>=2}
 }).sort((a,b)=>b.count-a.count);
}
function openIncidents(){
 const sid=currentScopeStore();
 return (state.incidents||[]).filter(i=>i.status==="open"&&(!sid||i.store_id===sid));
}
function sectorAnalysis(){
 const rs=readingsInAnalysisPeriod(),secs=filteredSectors();
 return secs.map(s=>{
  const eqs=filteredEquipment().filter(e=>e.sector_id===s.id&&e.active);
  const eqIds=new Set(eqs.map(e=>e.id));
  const sr=rs.filter(r=>eqIds.has(r.equipment_id));
  const dev=sr.filter(r=>isReadingOutOfRange(r)).length;
  const rec=new Set(recurrenceData().filter(x=>x.recurring&&x.equipment?.sector_id===s.id).map(x=>x.equipment.id)).size;
  return {sector:s,equipmentCount:eqs.length,readings:sr.length,deviations:dev,recurring:rec};
 }).sort((a,b)=>b.deviations-a.deviations);
}
function analysisFilterBar(){
 const secs=filteredSectors(),eqs=filteredEquipment().filter(e=>e.active&&(analysisFilter.sectorId?e.sector_id===analysisFilter.sectorId:true));
 return `<div class="analysisFilterBar">
   <div class="analysisFilterHead"><div><b>Pesquisar período e origem</b><small>Os indicadores abaixo usam este recorte.</small></div><span class="muted" style="font-size:8px">Recorrência = 2+ desvios no período</span></div>
   <div class="analysisFilterGrid">
     <div><label>De</label><input id="afStart" type="date" value="${analysisFilter.start}"></div>
     <div><label>Até</label><input id="afEnd" type="date" value="${analysisFilter.end}"></div>
     <div><label>Setor</label><select id="afSector"><option value="">Todos os setores</option>${secs.map(s=>`<option value="${s.id}" ${analysisFilter.sectorId===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div>
     <div><label>Equipamento</label><select id="afEquipment"><option value="">Todos os equipamentos</option>${eqs.map(e=>`<option value="${e.id}" ${analysisFilter.equipmentId===e.id?"selected":""}>${esc(e.name)}</option>`).join("")}</select></div>
     <button class="btn primary" onclick="applyAnalysisFilter()">Aplicar</button>
     <button class="btn ghost" onclick="clearAnalysisFilter()">Limpar</button>
   </div>
 </div>`;
}
window.applyAnalysisFilter=()=>{
 analysisFilter.start=val("afStart")||"";
 analysisFilter.end=val("afEnd")||"";
 analysisFilter.sectorId=val("afSector")||"";
 analysisFilter.equipmentId=val("afEquipment")||"";
 if(analysisFilter.start&&analysisFilter.end&&analysisFilter.start>analysisFilter.end)return toast("A data inicial não pode ser maior que a final.","warn");
 renderPage();
};
window.clearAnalysisFilter=()=>{analysisFilter={start:monthStartISO(),end:localISODate(),sectorId:"",equipmentId:""};renderPage()};

function reading(id){return state.readings.find(r=>r.id===id)}
function alertById(id){return state.alerts.find(a=>a.id===id)}
function renderIdentity(){const h=document.getElementById("identityHost");if(!h||!state.profile)return;h.innerHTML=`<div class="userIdentity" title="Usuário logado"><div class="userAvatar">${esc(initials(state.profile.full_name))}</div><div class="userWho"><b>${esc(state.profile.full_name)}</b><small>@${esc(state.profile.username)} • ${esc(roleLabel(state.profile.role))}</small></div></div>`}
function emailFor(username){return username.trim().toLowerCase()+"@"+(CFG.USER_EMAIL_DOMAIN||"centraltemp.invalid")}
const PRIMARY_ADMIN_ID="cba42ab2-7d12-47be-a7e0-c8aba4618796";
function isPrimaryAdmin(p=state.profile){return String(p?.id||"")===PRIMARY_ADMIN_ID}
function validUsernameSecure(u){return /^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$/.test(String(u||""))}
function passwordSecurityErrors(password,username=""){
 const p=String(password||""),u=String(username||"").toLowerCase(),low=p.toLowerCase(),errors=[];
 if(p.length<10)errors.push("mínimo de 10 caracteres");
 if(/\s/.test(p))errors.push("sem espaços");
 if(!/[a-z]/.test(p))errors.push("uma letra minúscula");
 if(!/[A-Z]/.test(p))errors.push("uma letra maiúscula");
 if(!/[0-9]/.test(p))errors.push("um número");
 if(!/[^A-Za-z0-9]/.test(p))errors.push("um caractere especial");
 if(u.length>=3&&low.includes(u))errors.push("não conter o nome de usuário");
 if(["123456","password","senha","admin","centraltemp"].some(x=>low.includes(x)))errors.push("evitar termos previsíveis");
 return errors;
}
function passwordSecurityHint(password,username=""){
 const errors=passwordSecurityErrors(password,username);
 return errors.length?`Falta: ${errors.join(" • ")}`:"Senha forte ✓";
}
window.updatePasswordSecurityHint=(inputId,hintId,usernameId)=>{
 const p=val(inputId),u=usernameId?val(usernameId):state.profile?.username||"";
 const el=document.getElementById(hintId);if(!el)return;
 const errors=passwordSecurityErrors(p,u);
 el.textContent=passwordSecurityHint(p,u);
 el.classList.toggle("goodText",!errors.length&&!!p);
 el.classList.toggle("badText",errors.length>0&&!!p);
};

function roleLabel(r){return ROLE_LABEL[r]||r}
function isGlobal(){return state.profile?.role==="admin" || (state.profile?.role==="custom"&&state.profile?.access_scope==="global")}
function effectivePerms(){
 if(!state.profile)return [];
 if(state.profile.role!=="custom")return BUILTIN[state.profile.role]||[];
 return Array.isArray(state.profile.permissions)?state.profile.permissions:Object.keys(state.profile.permissions||{}).filter(k=>state.profile.permissions[k]);
}
function can(p){return effectivePerms().includes(p)}
function ownStoreId(){return state.profile?.store_id||null}
function currentScopeStore(){return state.activeStoreId||(!isGlobal()?ownStoreId():null)}
function filteredStores(){const sid=currentScopeStore();return sid?state.stores.filter(s=>s.id===sid):state.stores}
function filteredEquipment(){const sid=currentScopeStore();return sid?state.equipment.filter(e=>e.store_id===sid):state.equipment}
function filteredReadings(){const ids=new Set(filteredEquipment().map(e=>e.id));return state.readings.filter(r=>ids.has(r.equipment_id))}
function equipment(id){return state.equipment.find(e=>e.id===id)}
function store(id){return state.stores.find(s=>s.id===id)}
function profile(id){return state.profiles.find(p=>p.id===id)}
function lastReading(eqId){return state.readings.filter(r=>r.equipment_id===eqId).sort((a,b)=>(b.reading_date+b.reading_time).localeCompare(a.reading_date+a.reading_time))[0]||null}
function statusOf(eq,r=lastReading(eq.id)){
 if(!eq.active)return {k:"inactive",l:"INATIVO",c:"neutral"};
 if(!r)return {k:"pending",l:"PENDENTE",c:"warn"};
 const low=Number(r.temperature_min??r.temperature),high=Number(r.temperature_max??r.temperature);
 return low>=Number(eq.min_temp)&&high<=Number(eq.max_temp)?{k:"ok",l:"NORMAL",c:"good"}:{k:"bad",l:"FORA DO PADRÃO",c:"bad"};
}

const DAILY_COLLECTION_GOAL=3;
function dailyCollectionsForEquipment(equipmentId,date=localISODate()){
 return state.readings.filter(r=>r.equipment_id===equipmentId&&r.reading_date===date).length;
}
function dailyGoalInfo(e,date=localISODate()){
 const count=dailyCollectionsForEquipment(e.id,date);
 return {count,goal:DAILY_COLLECTION_GOAL,remaining:Math.max(0,DAILY_COLLECTION_GOAL-count),met:count>=DAILY_COLLECTION_GOAL};
}
function dailyReadingCounts(days=7){
 const out=[];
 for(let i=days-1;i>=0;i--){
  const d=new Date();d.setDate(d.getDate()-i);
  const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  out.push({date:key,count:filteredReadings().filter(r=>r.reading_date===key).length});
 }
 return out;
}
function compliance(eqs){const a=eqs.filter(e=>e.active);return a.length?Math.round(a.filter(e=>statusOf(e).k==="ok").length/a.length*100):0}
function pageMeta(p){
 return {
  network:["Dashboard Geral","Visão consolidada da rede de lojas."],
  store:["Dashboard da Loja","Indicadores e situação da unidade selecionada."],
  readings:["Coletas","Registre e acompanhe as medições de temperatura."],
  pending:["Alertas","Desvios de temperatura que exigem acompanhamento."],
  equipment:["Equipamentos","Cadastro, faixas e situação dos equipamentos."],
  stores:["Lojas","Administração das unidades da rede."],
  reports:["Relatórios","Indicadores e análises da operação."],
  users:["Usuários","Gestão de acessos e permissões."],
  audit:["Auditoria","Rastreabilidade das ações no sistema."],
  account:["Minha Conta","Dados e permissões do seu acesso."]
 }[p]||["Central Temp",""];
}
function navItems(){
 const out=[],sid=currentScopeStore(),openAlerts=state.alerts.filter(a=>a.status==="open"&&(!sid||a.store_id===sid)).length;
 if(can("dashboard.network"))out.push(["network","DG","Dashboard Geral","","Visão geral"]);
 if(can("dashboard.store"))out.push(["store","DL","Dashboard da Loja","","Visão geral"]);

 if(can("stores.view")||can("stores.manage"))out.push(["stores","LJ","Lojas","","Operação"]);
 if(can("equipment.view")||can("equipment.manage"))out.push(["equipment","EQ","Equipamentos","","Operação"]);
 if(can("readings.view")||can("readings.create"))out.push(["readings","CT","Coletas","","Operação"]);
 if(can("alerts.view")&&state.profile.role!=="agent")out.push(["pending","AL","Alertas",openAlerts||"","Operação"]);

 if(can("reports.view"))out.push(["reports","RP","Relatórios","","Gestão"]);
 if(can("users.view")||can("users.manage_agents")||can("users.manage_all"))out.push(["users","US","Usuários","","Gestão"]);
 if(can("audit.view"))out.push(["audit","AU","Auditoria","","Gestão"]);
 out.push(["account","MC","Minha Conta","","Conta"]);
 return out;
}
