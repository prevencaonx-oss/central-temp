const TRAINING_SESSION_KEY="central-temp-training-active-v1";
let trainingStatusLoading=false;

function trainingActive(){return !!state.trainingMode}
window.isTrainingMode=trainingActive;
function trainingClone(value){return typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value))}
function trainingId(prefix){return `training-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function trainingDate(daysAgo=0){const d=new Date();d.setDate(d.getDate()-daysAgo);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function trainingIso(daysAgo=0,hour=9){const d=new Date();d.setDate(d.getDate()-daysAgo);d.setHours(hour,0,0,0);return d.toISOString()}

function snapshotProductionData(){
 if(state.trainingSnapshot)return;
 state.trainingSnapshot=trainingClone({
  stores:state.stores,sectors:state.sectors,equipment:state.equipment,readings:state.readings,
  profiles:state.profiles,alerts:state.alerts,incidents:state.incidents,audit:state.audit,
  activeStoreId:state.activeStoreId
 });
}

function buildTrainingDataset(){
 const scopedStoreId=!isGlobal()&&ownStoreId()?ownStoreId():"training-store-centro";
 const stores=[
  {id:scopedStoreId,code:"T01",name:"Loja Treinamento - Centro",city:"Nova Xavantina - MT",active:true,created_at:trainingIso(60)},
  ...(isGlobal()?[{id:"training-store-shopping",code:"T02",name:"Loja Treinamento - Shopping",city:"Nova Xavantina - MT",active:true,created_at:trainingIso(45)}]:[])
 ];
 const sectors=[
  {id:"training-sector-frios",store_id:stores[0].id,name:"Frios e Laticínios",active:true},
  {id:"training-sector-congelados",store_id:stores[0].id,name:"Congelados",active:true},
  {id:"training-sector-bebidas",store_id:stores[0].id,name:"Bebidas",active:true},
  ...(stores[1]?[{id:"training-sector-padaria",store_id:stores[1].id,name:"Padaria",active:true}]:[])
 ];
 const equipment=[
  {id:"training-eq-camara",store_id:stores[0].id,sector_id:sectors[0].id,name:"Câmara Fria 01",category:"Câmara fria",target_temp:3,min_temp:0,max_temp:5,samples_per_collection:3,active:true,operational_status:"operational"},
  {id:"training-eq-balcao",store_id:stores[0].id,sector_id:sectors[0].id,name:"Balcão de Frios",category:"Balcão refrigerado",target_temp:3,min_temp:1,max_temp:5,samples_per_collection:1,active:true,operational_status:"operational"},
  {id:"training-eq-freezer",store_id:stores[0].id,sector_id:sectors[1].id,name:"Freezer Sorvetes",category:"Freezer",target_temp:-18,min_temp:-22,max_temp:-16,samples_per_collection:3,active:true,operational_status:"operational"},
  {id:"training-eq-ilha",store_id:stores[0].id,sector_id:sectors[1].id,name:"Ilha de Congelados",category:"Ilha congelada",target_temp:-18,min_temp:-22,max_temp:-16,samples_per_collection:1,active:true,operational_status:"maintenance",status_note:"Treinamento: manutenção preventiva simulada."},
  {id:"training-eq-bebidas",store_id:stores[0].id,sector_id:sectors[2].id,name:"Expositor de Bebidas",category:"Expositor refrigerado",target_temp:5,min_temp:2,max_temp:8,samples_per_collection:1,active:true,operational_status:"operational"},
  ...(stores[1]?[{id:"training-eq-padaria",store_id:stores[1].id,sector_id:"training-sector-padaria",name:"Balcão Padaria",category:"Balcão refrigerado",target_temp:4,min_temp:1,max_temp:6,samples_per_collection:1,active:true,operational_status:"operational"}]:[])
 ];
 const demoAgent={id:"training-user-agent",username:"agente.treinamento",full_name:"Agente de Treinamento",role:"agent",store_id:stores[0].id,access_scope:"store",permissions:[],active:true,created_at:trainingIso(30)};
 const profiles=[state.profile,demoAgent];
 const readings=[];
 const addReading=(eqId,daysAgo,time,values,condition="operational",issue="")=>{
  const e=equipment.find(x=>x.id===eqId),samples=Array.isArray(values)?values:[values],avg=samples.reduce((a,b)=>a+b,0)/samples.length;
  readings.push({id:trainingId("reading"),equipment_id:eqId,store_id:e.store_id,temperature:avg,sample_count:samples.length,temperature_1:samples[0],temperature_2:samples[1]??null,temperature_3:samples[2]??null,temperature_avg:avg,temperature_min:Math.min(...samples),temperature_max:Math.max(...samples),reading_date:trainingDate(daysAgo),reading_time:`${time}:00`,responsible_name:demoAgent.full_name,notes:"Registro simulado para treinamento.",corrective_action:Math.min(...samples)<Number(e.min_temp)||Math.max(...samples)>Number(e.max_temp)?"Conferir abastecimento e repetir a medição.":"",equipment_condition:condition,equipment_issue_note:issue||null,created_by:demoAgent.id,created_at:trainingIso(daysAgo,Number(time.slice(0,2))) });
  return readings[readings.length-1];
 };
 addReading("training-eq-camara",0,"08:15",[3.1,3.4,3.2]);
 addReading("training-eq-camara",1,"15:10",[6.2,6.0,5.8]);
 addReading("training-eq-camara",3,"09:20",[5.7,5.9,6.1]);
 addReading("training-eq-balcao",0,"08:25",4.1);
 addReading("training-eq-balcao",2,"14:30",3.8);
 addReading("training-eq-freezer",0,"08:40",[-18.7,-18.9,-18.5]);
 addReading("training-eq-freezer",2,"16:05",[-14.6,-14.8,-14.5]);
 addReading("training-eq-ilha",0,"09:05",-17.5,"maintenance","Manutenção preventiva simulada em andamento.");
 addReading("training-eq-bebidas",0,"09:20",5.2);
 addReading("training-eq-bebidas",4,"10:10",7.1);
 if(stores[1])addReading("training-eq-padaria",0,"09:30",4.5);
 const deviations=readings.filter(r=>isReadingOutOfRange(r,equipment.find(e=>e.id===r.equipment_id)));
 const alerts=deviations.slice(0,3).map((r,index)=>({id:trainingId("alert"),reading_id:r.id,equipment_id:r.equipment_id,store_id:r.store_id,alert_type:Number(r.temperature_max)>Number(equipment.find(e=>e.id===r.equipment_id).max_temp)?"above_max":"below_min",status:index===2?"acknowledged":"open",message:"Alerta simulado de treinamento.",created_at:r.created_at,acknowledged_by:index===2?state.profile.id:null,acknowledged_at:index===2?trainingIso(0,10):null,closed_by:null,closed_at:null}));
 const incidents=[{id:"training-incident-maintenance",equipment_id:"training-eq-ilha",store_id:stores[0].id,sector_id:sectors[1].id,reading_id:readings.find(r=>r.equipment_id==="training-eq-ilha")?.id,incident_type:"maintenance",description:"Manutenção preventiva simulada em andamento.",status:"open",opened_by:demoAgent.id,opened_at:trainingIso(0,9),created_at:trainingIso(0,9),updated_at:trainingIso(0,9)}];
 const audit=[{id:"training-audit-1",user_id:state.profile.id,action:"training_mode_started",entity_type:"training_mode",entity_id:"session",details:{simulated:true},created_at:new Date().toISOString()}];
 return {stores,sectors,equipment,readings,profiles,alerts,incidents,audit};
}

function applyTrainingDataset(){
 snapshotProductionData();
 Object.assign(state,buildTrainingDataset());
 state.trainingMode=true;
 state.activeStoreId=isGlobal()?null:state.activeStoreId;
 analysisFilter={start:monthStartISO(),end:localISODate(),sectorId:"",equipmentId:""};
 renderTrainingChrome();
}

function renderTrainingChrome(){
 const banner=document.getElementById("trainingBanner"),active=trainingActive();
 document.body.classList.toggle("training-mode",active);
 banner?.classList.toggle("hidden",!active);
 if(active){
  const status=document.getElementById("connectionStatus");
  if(status)status.innerHTML='<span class="badge trainingConnection"><span class="dot"></span>Ambiente simulado</span>';
 }
}
window.renderTrainingChrome=renderTrainingChrome;

async function restoreTrainingModeIfNeeded(){
 if(sessionStorage.getItem(TRAINING_SESSION_KEY)!=="1")return false;
 applyTrainingDataset();
 return true;
}
window.restoreTrainingModeIfNeeded=restoreTrainingModeIfNeeded;

async function activateTrainingMode(){
 showLoad(true);
 try{
  if(state.channel){await sb.removeChannel(state.channel);state.channel=null}
  sessionStorage.setItem(TRAINING_SESSION_KEY,"1");
  applyTrainingDataset();
  buildNav();renderScope();renderIdentity();
  const destination=state.profile.role==="agent"?"readings":can("dashboard.network")?"network":can("dashboard.store")?"store":"readings";
  setPage(destination);toast("Modo de treinamento ativado. Nenhum dado real será alterado.","good");
 }finally{showLoad(false)}
}

window.exitTrainingMode=async()=>{
 if(!trainingActive())return;
 showLoad(true);
 try{
  sessionStorage.removeItem(TRAINING_SESSION_KEY);
  const snap=state.trainingSnapshot;
  state.trainingMode=false;state.trainingSnapshot=null;
  if(snap)Object.assign(state,snap);else await fetchAll();
  renderTrainingChrome();
  await subscribeRealtime();
  buildNav();renderScope();renderIdentity();
  const destination=state.profile.role==="agent"?"readings":(navItems().find(x=>x[0]!=="training")?.[0]||"readings");
  setPage(destination);toast("Modo de treinamento encerrado. Dados reais restaurados.","good");
 }catch(e){toast("Não foi possível sair do treinamento: "+(e?.message||e),"bad")}
 finally{showLoad(false)}
};

function clearTrainingModeState(){
 sessionStorage.removeItem(TRAINING_SESSION_KEY);
 document.body.classList.remove("training-mode");
 document.getElementById("trainingBanner")?.classList.add("hidden");
}
window.clearTrainingModeState=clearTrainingModeState;

async function loadTrainingStatus(){
 if(trainingStatusLoading)return;
 trainingStatusLoading=true;
 try{
  const {data,error}=await sb.rpc("training_mode_status");
  if(error)throw error;
  state.trainingStatus=data;state.trainingStatusError="";
 }catch(e){state.trainingStatusError=e?.message||String(e)}
 finally{trainingStatusLoading=false;if(state.page==="training")renderTraining()}
}

function renderTraining(){
 const active=trainingActive(),status=state.trainingStatus,isAdmin=state.profile?.role==="admin";
 if(!status&&!state.trainingStatusError&&!trainingStatusLoading)setTimeout(loadTrainingStatus,0);
 const statusBlock=state.trainingStatusError?`<div class="notice">Não foi possível consultar a configuração: ${esc(state.trainingStatusError)}</div>`:!status?'<div class="trainingStatusLoading">Consultando configuração...</div>':status.configured?'<span class="badge good">SENHA CONFIGURADA</span>':'<span class="badge warn">AGUARDANDO SENHA DO ADMIN</span>';
 document.getElementById("content").innerHTML=`
 <div class="trainingPage">
  <section class="trainingHero ${active?"active":""}">
   <div><span class="eyebrow">AMBIENTE SEGURO PARA PRÁTICA</span><h2>${active?"Modo de treinamento ativo":"Modo de treinamento"}</h2><p>${active?"Você está usando lojas, equipamentos, coletas e alertas simulados. Nenhuma alteração será gravada nos dados reais.":"Treine coletas, alertas e cadastros sem alterar a operação real."}</p></div>
   <div class="trainingShield">TR</div>
  </section>
  <div class="trainingGrid">
   <section class="panel trainingAccessCard">
    <div class="panelHead"><div><span class="eyebrow">ACESSO</span><h2>${active?"Treinamento em andamento":"Entrar no treinamento"}</h2></div>${statusBlock}</div>
    ${active?`
     <div class="trainingActiveSummary"><div><b>${state.stores.length}</b><span>lojas simuladas</span></div><div><b>${state.equipment.length}</b><span>equipamentos</span></div><div><b>${state.readings.length}</b><span>coletas simuladas</span></div><div><b>${state.alerts.filter(a=>a.status!=="closed").length}</b><span>alertas para praticar</span></div></div>
     <div class="trainingSafetyNote"><b>Ambiente isolado</b><span>Cadastros, exclusões, coletas e tratamentos de alertas ficam somente nesta sessão de treinamento.</span></div>
     <button class="btn danger trainingExitMain" onclick="exitTrainingMode()">Sair do modo de treinamento</button>
    `:status?.configured?`
     <label>Senha do modo de treinamento</label>
     <div class="trainingPasswordRow"><input id="trainingAccessPassword" type="password" autocomplete="off" placeholder="Digite a senha criada pelo administrador" onkeydown="if(event.key==='Enter')enterTrainingMode()"><button class="btn primary" onclick="enterTrainingMode()">Entrar no treinamento</button></div>
     <div class="passwordHint">A senha é verificada com segurança e não fica armazenada neste dispositivo.</div>
    `:`<div class="trainingSafetyNote"><b>O acesso ainda não foi liberado</b><span>${isAdmin?"Crie a primeira senha no painel administrativo ao lado.":"Peça a um administrador para criar a senha de treinamento."}</span></div>`}
   </section>
   <section class="panel trainingAdminCard">
    <div class="panelHead"><div><span class="eyebrow">ADMINISTRAÇÃO</span><h2>Senha de acesso</h2></div>${isAdmin?'<span class="adminOnlyNote">SOMENTE ADMIN</span>':''}</div>
    ${isAdmin?`<p>${status?.configured?"Troque a senha sempre que precisar controlar um novo ciclo de treinamento.":"Crie a senha que será usada pelos colaboradores para entrar no ambiente de treinamento."}</p><button class="btn ghost" onclick="openTrainingPasswordModal()">${status?.configured?"Alterar senha":"Criar senha de treinamento"}</button>`:`<div class="trainingSafetyNote"><b>Controle administrativo</b><span>Somente administradores podem criar ou alterar esta senha.</span></div>`}
   </section>
  </div>
 </div>`;
 renderTrainingChrome();
}
window.renderTraining=renderTraining;

window.openTrainingPasswordModal=()=>{
 if(state.profile?.role!=="admin")return toast("Somente administradores podem alterar a senha de treinamento.","warn");
 showModal(`<div class="modalHead"><div><span class="eyebrow">MODO DE TREINAMENTO</span><h2>${state.trainingStatus?.configured?"Alterar senha":"Criar senha de acesso"}</h2></div><button class="x" onclick="closeModal()">×</button></div>
 <div class="securityBanner"><b>Senha protegida</b>Ela será armazenada somente em formato criptografado. Após a troca, todos deverão usar a nova senha.</div>
 <label>Nova senha de treinamento</label><input id="trainingNewPassword" type="password" autocomplete="new-password" oninput="updatePasswordSecurityHint('trainingNewPassword','trainingPasswordHint')">
 <div id="trainingPasswordHint" class="passwordStrengthLine">10+ caracteres • maiúscula • minúscula • número • especial • sem espaços.</div>
 <label>Confirmar nova senha</label><input id="trainingNewPasswordConfirm" type="password" autocomplete="new-password">
 <div class="modalActions"><button class="btn ghost" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveTrainingPassword()">Salvar senha</button></div>`);
};

window.saveTrainingPassword=async()=>{
 const password=val("trainingNewPassword"),confirmPassword=val("trainingNewPasswordConfirm"),errors=passwordSecurityErrors(password);
 if(errors.length)return toast("A senha ainda não atende à segurança exigida: "+errors.join(", ")+".","warn");
 if(password!==confirmPassword)return toast("As duas senhas não são iguais.","warn");
 showLoad(true);
 try{
  const {data,error}=await sb.rpc("set_training_password",{new_password:password});if(error)throw error;
  state.trainingStatus={...(state.trainingStatus||{}),...data,configured:true,can_manage:true};closeModal();renderTraining();toast("Senha do treinamento salva com segurança.","good");
 }catch(e){toast("Não foi possível salvar a senha: "+(e?.message||e),"bad")}
 finally{showLoad(false)}
};

window.enterTrainingMode=async()=>{
 const candidate=val("trainingAccessPassword");if(!candidate)return toast("Digite a senha do treinamento.","warn");
 showLoad(true);
 try{
  const {data,error}=await sb.rpc("verify_training_password",{candidate});if(error)throw error;
  if(!data?.ok){
   if(!data?.configured)return toast("A senha de treinamento ainda não foi criada.","warn");
   if(data?.locked)return toast(`Acesso temporariamente bloqueado. Tente novamente em ${Math.ceil(Number(data.retry_after_seconds||300)/60)} minuto(s).`,"bad");
   return toast(`Senha incorreta. ${data?.attempts_remaining??0} tentativa(s) restante(s).`,"bad");
  }
  await activateTrainingMode();
 }catch(e){toast("Não foi possível entrar no treinamento: "+(e?.message||e),"bad")}
 finally{showLoad(false)}
};

function trainingCollection(table){return ({stores:"stores",sectors:"sectors",equipment:"equipment",readings:"readings",temperature_alerts:"alerts",equipment_incidents:"incidents",profiles:"profiles"})[table]}
function trainingWrite(table,action,payload={},id=""){
 const key=trainingCollection(table),list=state[key];if(!key||!Array.isArray(list))return {data:null,error:{message:"Operação simulada não reconhecida."}};
 if(action==="insert"){
  const item={id:payload.id||trainingId(table),...trainingClone(payload),created_at:payload.created_at||new Date().toISOString()};list.unshift(item);return {data:item,error:null};
 }
 const item=list.find(x=>x.id===id);
 if(action==="update"){
  if(!item)return {data:null,error:{message:"Registro simulado não encontrado."}};
  Object.assign(item,trainingClone(payload),{updated_at:new Date().toISOString()});
  if(table==="equipment_incidents"&&payload.status==="resolved"){
   const e=equipment(item.equipment_id);if(e)Object.assign(e,{operational_status:"operational",status_note:null,status_updated_at:new Date().toISOString()});
  }
  return {data:item,error:null};
 }
 if(action==="delete"){
  const index=list.findIndex(x=>x.id===id);if(index<0)return {data:null,error:{message:"Registro simulado não encontrado."}};
  const [removed]=list.splice(index,1);
  if(table==="readings"){
   state.alerts=state.alerts.filter(a=>a.reading_id!==id);state.incidents=state.incidents.filter(i=>i.reading_id!==id);
  }
  return {data:removed,error:null};
 }
 return {data:null,error:{message:"Ação simulada não reconhecida."}};
}
window.trainingWrite=trainingWrite;

function trainingInsertReading(payload){
 const result=trainingWrite("readings","insert",payload);if(result.error)return result;
 const saved=result.data,e=equipment(saved.equipment_id),bad=e&&isReadingOutOfRange(saved,e);
 if(bad)trainingWrite("temperature_alerts","insert",{reading_id:saved.id,equipment_id:saved.equipment_id,store_id:saved.store_id,alert_type:Number(saved.temperature_max)>Number(e.max_temp)?"above_max":"below_min",status:"open",message:"Alerta simulado gerado pela coleta de treinamento."});
 if(saved.equipment_condition&&saved.equipment_condition!=="operational"){
  if(e)Object.assign(e,{operational_status:saved.equipment_condition,status_note:saved.equipment_issue_note,status_updated_at:new Date().toISOString()});
  trainingWrite("equipment_incidents","insert",{equipment_id:saved.equipment_id,store_id:saved.store_id,sector_id:e?.sector_id||null,reading_id:saved.id,incident_type:saved.equipment_condition,description:saved.equipment_issue_note,status:"open",opened_by:state.profile.id,opened_at:new Date().toISOString()});
 }
 return result;
}
window.trainingInsertReading=trainingInsertReading;

async function trainingManageUser(body){
 if(body.action==="self_update")throw new Error("Credenciais reais não podem ser alteradas durante o treinamento.");
 if(body.action==="delete"){const i=state.profiles.findIndex(p=>p.id===body.user_id);if(i>=0)state.profiles.splice(i,1);return {ok:true}}
 if(body.action==="create"){
  state.profiles.push({id:trainingId("user"),full_name:body.full_name,username:body.username,role:body.role,store_id:body.store_id||null,access_scope:body.access_scope,permissions:body.permissions||[],active:body.active,created_at:new Date().toISOString()});return {ok:true};
 }
 const p=state.profiles.find(x=>x.id===body.user_id);if(!p)throw new Error("Usuário simulado não encontrado.");
 Object.assign(p,{full_name:body.full_name,username:body.username,role:body.role,store_id:body.store_id||null,access_scope:body.access_scope,permissions:body.permissions||[],active:body.active});return {ok:true};
}
window.trainingManageUser=trainingManageUser;
