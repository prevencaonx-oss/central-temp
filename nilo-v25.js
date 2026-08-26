(()=>{
 const safeShowModal=(html,closable=true)=>{
  const host=document.getElementById('modalHost');
  if(!host)return;
  host.replaceChildren();
  const overlay=document.createElement('div');
  overlay.className='modal';
  if(closable){overlay.addEventListener('click',ev=>{if(ev.target===overlay&&typeof window.closeModal==='function')window.closeModal()})}
  const box=document.createElement('div');
  box.className='modalBox';
  box.innerHTML=String(html??'');
  overlay.appendChild(box);
  host.appendChild(overlay);
 };
 window.showModal=safeShowModal;
 const reinforce=()=>{window.showModal=safeShowModal};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reinforce,{once:true});else reinforce();
 setTimeout(reinforce,0);
})();

(()=>{
 const run=()=>{
  const login=document.getElementById('loginPage');
  if(login){
   const hero=login.querySelector('.hero');
   if(hero&&!hero.querySelector('.niloLoginHero'))hero.insertAdjacentHTML('beforeend','<div class="niloLoginHero"><div class="niloWordmark">NILO<small>SUPERMERCADO</small></div><div class="niloRule"></div><div class="niloSlogan">NO QUIETO NO QUIETO<br>O <b>NILO</b> VENDE<br>MAIS BARATO</div><div class="niloRule"></div><div class="niloHeroFeatures"><span>Temperatura em tempo real</span><span>Alertas inteligentes</span><span>Gestão por loja</span><span>Segurança e confiabilidade</span></div></div>');
   const box=login.querySelector('.loginBox');
   if(box&&!box.querySelector('.niloLoginCardHead')){box.insertAdjacentHTML('afterbegin','<div class="niloLoginCardHead"><div class="niloMascotBadge"></div><h1>CONTROLE DE TEMPERATURA</h1><p>Monitoramento inteligente para lojas sempre seguras.</p></div>');const msg=box.querySelector('#loginMsg');if(msg)msg.insertAdjacentHTML('afterend','<div class="niloSecureNote">🔒 Acesso seguro e criptografado</div>')}
  }
  const side=document.querySelector('#app .sidebar');
  if(side&&!side.querySelector('.niloPreventionSide')){const user=side.querySelector('.sideUser');const h='<section class="niloPreventionSide"><strong>Prevenção de Perdas</strong><i>◇✓</i><p>Monitoramento, disciplina operacional e ação preventiva.</p><span>Operação segura</span></section>';user?user.insertAdjacentHTML('beforebegin',h):side.insertAdjacentHTML('beforeend',h)}
  const content=document.getElementById('content');
  if(content){const page=document.querySelector('.nav.active')?.dataset.page||'';const dash=page==='network'||page==='store';const old=content.querySelector('.niloPreventionBanner');if(!dash&&old)old.remove();if(dash&&!old)content.insertAdjacentHTML('beforeend','<section class="niloPreventionBanner"><div class="niloMascotBadge"></div><div><h3>Prevenir perdas é proteger resultados.</h3><p>Dados confiáveis, ação rápida e disciplina operacional fazem a diferença todos os dias.</p></div><div class="niloPrinciples"><div><b>✓</b>Monitore regularmente</div><div><b>°</b>Aja rápido em desvios</div><div><b>◇</b>Garanta qualidade e segurança</div></div></section>');if(page==='network'){const t=document.getElementById('pageTitle'),s=document.getElementById('pageSub');if(t)t.textContent='CONTROLE DE TEMPERATURA';if(s)s.textContent='Monitoramento inteligente para lojas sempre seguras.'}}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 new MutationObserver(()=>requestAnimationFrame(run)).observe(document.documentElement,{childList:true,subtree:true});
})();