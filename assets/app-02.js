function buildNav(){
 const items=navItems(),sections={};
 items.forEach(x=>(sections[x[4]||"Geral"]??=[]).push(x));
 document.getElementById("navHost").innerHTML=Object.entries(sections).map(([sec,arr])=>`<div class="sec">${sec}</div>${arr.map(([p,i,l,count])=>`<button class="nav ${p==="readings"?"collectNav":""} ${state.page===p?"active":""}" data-page="${p}" onclick="go('${p}');closeMobileNav()"><span class="navIcon">${i}</span><span class="navText">${l}</span>${count?`<span class="navCount ${p==="pending"&&count?"bad":""}">${count}</span>`:""}</button>`).join("")}`).join("");
 const shortcut=document.getElementById("collectShortcutHost");
 if(shortcut)shortcut.innerHTML=can("readings.create")?`<button onclick="goToCollectForm()">REGISTRAR COLETA</button>`:"";
}
function renderScope(){
 const host=document.getElementById("scopeHost");
 if(!isGlobal()){host.innerHTML=`<div class="scope"><span>Loja:</span><b>${esc(store(ownStoreId())?.name||"—")}</b></div>`;return}
 const opts=[`<option value="">Rede Geral</option>`,...state.stores.filter(s=>s.active).map(s=>`<option value="${s.id}" ${state.activeStoreId===s.id?"selected":""}>${esc(s.name)}</option>`)];
 host.innerHTML=`<div class="scope"><b>Escopo:</b><select style="border:0;padding:2px;width:auto;min-width:150px" onchange="changeScope(this.value)">${opts.join("")}</select></div>`;
}
window.changeScope=v=>{state.activeStoreId=v||null;analysisFilter.sectorId="";analysisFilter.equipmentId="";if(state.page)renderPage()};
function setConnection(ok=true){document.getElementById("connectionStatus").innerHTML=ok?`<span class="badge good"><span class="dot"></span>Tempo real conectado</span>`:`<span class="offline">Reconectando...</span>`}
function setPage(p){
 state.page=p;document.body.classList.toggle("vx-network-page",p==="network");buildNav();const [t,s]=pageMeta(p);document.getElementById("pageTitle").textContent=t;document.getElementById("pageSub").textContent=s;renderActions();renderPage();
}
window.go=setPage;
window.openMobileNav=()=>{
 document.querySelector(".sidebar")?.classList.add("mobileOpen");
 document.getElementById("mobileOverlay")?.classList.add("show");
};
window.closeMobileNav=()=>{
 document.querySelector(".sidebar")?.classList.remove("mobileOpen");
 document.getElementById("mobileOverlay")?.classList.remove("show");
};

function renderActions(){
 const h=document.getElementById("actionHost");h.innerHTML="";
 if(state.page==="network")h.innerHTML=`<button class="vxHeaderDate" type="button" aria-label="Data de hoje">${fmtDate(localISODate())}<span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/></svg></span></button><button class="vxHeaderFilter" type="button" onclick="document.querySelector('.vxPeriod')?.focus()" aria-label="Filtrar período"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v5l-4 2v-7Z"/></svg></button>`;
 if(state.page==="store"&&can("reports.view"))h.innerHTML=`<button class="btn ghost" onclick="printReport('${currentScopeStore()||""}')">Exportar relatório</button>${can("readings.create")?'<button class="btn topCollectBtn" onclick="goToCollectForm()">Registrar coleta</button>':""}`;
 if(state.page==="readings"&&can("readings.create"))h.innerHTML=`<button class="btn topCollectBtn" onclick="focusInlineCollect()">Registrar coleta</button>`;
 if(state.page==="equipment"&&can("equipment.manage"))h.innerHTML=`<button class="btn ghost" onclick="openSectors()">Setores</button><button class="btn primary" onclick="openEquipment()">Novo equipamento</button>`;
 if(state.page==="stores"&&can("stores.manage"))h.innerHTML=`<button class="btn primary" onclick="openStore()">Nova loja</button>`;
 if(state.page==="users"&&(can("users.manage_all")||can("users.manage_agents")))h.innerHTML=`<button class="btn primary" onclick="openUser()">Novo usuário</button>`;
}
function renderPage(){
 renderScope();renderIdentity();
 ({network:renderNetwork,store:renderStoreDash,stores:renderStores,equipment:renderEquipment,readings:renderReadings,pending:renderPending,reports:renderReports,users:renderUsers,audit:renderAudit,account:renderAccount}[state.page]||renderReadings)();
}
function withTimeout(promise,ms=10000,message="Tempo esgotado ao conectar. Tente novamente."){
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms)});
 return Promise.race([Promise.resolve(promise),timeout]).finally(()=>clearTimeout(timer));
}
async function fetchAll(){
 showLoad(true);
 try{
  const queries=Promise.all([
   sb.from("stores").select("*").order("name"),
   sb.from("sectors").select("*").order("name"),
   sb.from("equipment").select("*").order("name"),
   sb.from("readings").select("*").order("reading_date",{ascending:false}).order("reading_time",{ascending:false}).limit(5000),
   sb.from("profiles").select("id,username,full_name,role,store_id,access_scope,permissions,active,created_at").order("full_name"),
   sb.from("temperature_alerts").select("*").order("created_at",{ascending:false}).limit(2000),
   sb.from("equipment_incidents").select("*").order("opened_at",{ascending:false}).limit(2000),
   can("audit.view")?sb.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(1000):Promise.resolve({data:[],error:null})
  ]);
  const res=await withTimeout(queries,12000,"Tempo esgotado ao carregar os dados. Tente novamente.");
  res.forEach(r=>{if(r.error)throw r.error});
  state.stores=res[0].data||[];
  state.sectors=res[1].data||[];
  state.equipment=res[2].data||[];
  state.readings=res[3].data||[];
  state.profiles=res[4].data||[];
  state.alerts=res[5].data||[];
  state.incidents=res[6].data||[];
  state.audit=res[7].data||[];
 }finally{showLoad(false)}
}
async function getMyProfile(){
 const {data,error}=await withTimeout(sb.from("profiles").select("*").eq("id",state.session.user.id).single(),10000,"Tempo esgotado ao carregar o perfil.");if(error)throw error;state.profile=data;
}
async function subscribeRealtime(){
 if(state.channel)await sb.removeChannel(state.channel);
 state.channel=sb.channel("central-temp-live")
  .on("postgres_changes",{event:"*",schema:"public",table:"readings"},async()=>{await fetchAll();renderPage();})
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"temperature_alerts"},async payload=>{
    await fetchAll();renderPage();
    const a=alertById(payload.new.id);
    if(a&&a.reading_id!==lastOwnReadingId){toast("Novo alerta de temperatura fora do padrão.","bad");notifyBrowserAlert(a)}
  })
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"temperature_alerts"},async()=>{await fetchAll();renderPage();})
  .on("postgres_changes",{event:"*",schema:"public",table:"equipment_incidents"},async()=>{await fetchAll();renderPage()})
  .on("postgres_changes",{event:"*",schema:"public",table:"sectors"},async()=>{await fetchAll();renderPage()})
  .on("postgres_changes",{event:"*",schema:"public",table:"equipment"},async()=>{await fetchAll();renderPage()})
  .on("postgres_changes",{event:"*",schema:"public",table:"stores"},async()=>{await fetchAll();renderPage()})
  .on("postgres_changes",{event:"*",schema:"public",table:"profiles"},async()=>{await getMyProfile();await fetchAll();buildNav();renderPage()})
  .subscribe(status=>setConnection(status==="SUBSCRIBED"));
}
async function boot(){
 if(!configured){document.getElementById("configWarning").classList.remove("hidden");return}
 state.session=null;state.profile=null;state.activeStoreId=null;document.body.classList.remove("app-open","vx-network-page");
 document.getElementById("loginPage").classList.remove("hidden");
 document.getElementById("app").classList.add("hidden");
 showLoad(false);
}
async function enterApp(){
 await fetchAll();document.getElementById("loginPage").classList.add("hidden");document.getElementById("app").classList.remove("hidden");document.body.classList.add("app-open");
 document.getElementById("sideName").textContent=state.profile.full_name;document.getElementById("sideRole").textContent=roleLabel(state.profile.role);
 buildNav();renderScope();renderIdentity();await subscribeRealtime();
 const first=state.profile.role==="agent"?"readings":(navItems()[0]?.[0]||"readings");try{setPage(first)}finally{showLoad(false)};
}
function showAdminStoreChoice(){
 showLoad(false);
 const choices=[`<option value="">Rede Geral</option>`,...state.stores.filter(s=>s.active).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`)];
 showModal(`<div class="modalHead"><div><h2>Escolha onde deseja entrar</h2><div class="muted" style="font-size:12px;margin-top:3px">Conta Admin: você pode entrar na Rede Geral ou diretamente em uma loja.</div></div></div>
 <label>Escopo inicial</label><select id="adminEntryStore">${choices.join("")}</select>
 <div class="modalActions"><button class="btn danger" onclick="cancelAdminLogin()">Cancelar</button><button class="btn primary" onclick="confirmAdminEntry()">Entrar</button></div>`,false);
}
window.confirmAdminEntry=async()=>{
 state.activeStoreId=document.getElementById("adminEntryStore").value||null;closeModal();
 try{await enterApp()}catch(e){console.error("ENTER_APP_ERROR",e);showLoad(false);toast(e?.message||"Não foi possível carregar o sistema.","bad")}
};
window.cancelAdminLogin=async()=>{closeModal();await sb.auth.signOut();state={session:null,profile:null,stores:[],sectors:[],equipment:[],readings:[],profiles:[],alerts:[],incidents:[],audit:[],activeStoreId:null,page:null,channel:null}};
window.signIn=async()=>{
 if(!configured){document.getElementById("configWarning").classList.remove("hidden");return}
 const username=document.getElementById("loginUsername").value.trim().toLowerCase(),password=document.getElementById("loginPassword").value;
 if(!username||!password){document.getElementById("loginMsg").textContent="Informe usuário e senha.";return}
 showLoad(true);document.getElementById("loginMsg").textContent="";
 try{
  const {data,error}=await withTimeout(sb.auth.signInWithPassword({email:emailFor(username),password}),10000,"Tempo esgotado ao autenticar. Tente novamente.");if(error)throw error;
  state.session=data.session;await getMyProfile();
  if(!state.profile.active)throw new Error("Este usuário está inativo.");
  if(state.profile.role==="admin"){
    try{
      const {data:storesData,error:storesError}=await withTimeout(sb.from("stores").select("*").order("name"),8000,"Tempo esgotado ao carregar as lojas.");
      if(storesError)throw storesError;
      state.stores=storesData||[];
    }catch(storeErr){console.warn("STORE_LIST_WARNING",storeErr);state.stores=[]}
    showAdminStoreChoice();
  }else{
    state.activeStoreId=state.profile.store_id;
    await enterApp();
  }
 }catch(e){
  console.error("LOGIN_ERROR",e);
  const raw=String(e?.message||"");
  const friendly=/invalid login credentials/i.test(raw)?"Usuário ou senha inválidos.":/failed to fetch|network/i.test(raw)?"Não foi possível conectar ao servidor. Verifique a internet e tente novamente.":"Não foi possível concluir o acesso. Tente novamente.";
  document.getElementById("loginMsg").textContent=friendly;showLoad(false)
 }
};
window.signOut=async()=>{
 if(state.channel)await sb.removeChannel(state.channel);
 try{await sb.auth.signOut()}catch{}
 state={session:null,profile:null,stores:[],sectors:[],equipment:[],readings:[],profiles:[],alerts:[],incidents:[],audit:[],activeStoreId:null,page:null,channel:null};
 window.state=state;
 document.getElementById("app").classList.add("hidden");document.body.classList.remove("app-open","vx-network-page");
 document.getElementById("loginPage").classList.remove("hidden");
 document.getElementById("loginUsername").value="";
 document.getElementById("loginPassword").value="";
 document.getElementById("loginMsg").textContent="";
};
