(()=>{
  window.showModal=function(content,closable=true){
    const host=document.getElementById('modalHost');
    if(!host)return;
    host.innerHTML='';
    const overlay=document.createElement('div');
    overlay.className='modal';
    if(closable){
      overlay.addEventListener('click',(ev)=>{
        if(ev.target===overlay && typeof window.closeModal==='function') window.closeModal();
      });
    }
    const box=document.createElement('div');
    box.className='modalBox';
    box.innerHTML=String(content??'');
    overlay.appendChild(box);
    host.appendChild(overlay);
  };
  window.closeModal=function(){
    const host=document.getElementById('modalHost');
    if(host)host.innerHTML='';
  };
  console.info('Central Temp hotfix v13 carregado');
})();