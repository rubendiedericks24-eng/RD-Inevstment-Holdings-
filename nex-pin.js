/* NexAgent OS shared PIN session for the module pages (same session as /operations-dashboard.html).
   The PIN is sent once (POST body) to the feed, which checks it server-side and returns a 6 h session token.
   Only the token is kept, in sessionStorage. No access key in this file. Without a token no sheet data is fetched. */
(function(){
  var FEED='https://script.google.com/macros/s/AKfycbzcv7Cbp_JeBZiCUTCWVEDkV6BvO4d3tDz8ivx-HR5qHos-xTROolb8F146G2SCyUPk/exec';
  var TOKEN_KEY='nexos_feed_token_v1', DEVICE_KEY='nexos_device_v1';
  try{ sessionStorage.removeItem('nexagent_pe_gate_v1'); }catch(e){}
  function token(){ try{ return sessionStorage.getItem(TOKEN_KEY)||''; }catch(e){ return ''; } }
  function authed(){ return /^[0-9a-f]{64}$/.test(token()); }
  function device(){
    var d=''; try{ d=localStorage.getItem(DEVICE_KEY)||''; }catch(e){}
    if(!/^[0-9a-f]{32}$/.test(d)){ var a=new Uint8Array(16); crypto.getRandomValues(a); d=Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2);}).join(''); try{ localStorage.setItem(DEVICE_KEY,d); }catch(e){} }
    return d;
  }
  async function post(body,ms){
    var ctrl=new AbortController(), t=setTimeout(function(){ctrl.abort();},ms||15000);
    try{
      var res=await fetch(FEED,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),cache:'no-store',signal:ctrl.signal,redirect:'follow'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      var txt=await res.text(); try{ return JSON.parse(txt); }catch(e){ throw new Error('Feed did not return JSON'); }
    } finally { clearTimeout(t); }
  }
  function gate(show,msg){
    function go(){ var g=document.getElementById('nexGate'); if(g) g.classList.toggle('ok',!show); var er=document.getElementById('nexGateErr'); if(er&&msg!==undefined) er.textContent=msg||''; }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
  }
  /* Response-like wrapper so existing page code (`const res = await nexFetchTab(tab); const rows = await res.json();`) keeps working. */
  window.nexFetchTab=async function(tab){
    if(!authed()){ gate(true); throw new Error('PIN required'); }
    var data=await post({action:'tab',token:token(),tab:tab},15000);
    if(data&&data.error==='Unauthorized'){ try{ sessionStorage.removeItem(TOKEN_KEY); }catch(e){} gate(true,'Session ended. Enter your PIN again.'); throw new Error('Session ended'); }
    return { ok:true, status:200, json:async function(){ return data; } };
  };
  window.nexAuthed=authed;
  window.nexUnlock=async function(e){
    if(e) e.preventDefault();
    var inp=document.getElementById('nexGatePw'), er=document.getElementById('nexGateErr'), btn=document.querySelector('#nexGate button');
    var pin=String(inp&&inp.value||'').replace(/\s+/g,'');
    if(!/^\d{6,8}$/.test(pin)){ er.textContent='Enter your 6–8 digit PIN.'; return false; }
    if(btn) btn.disabled=true; er.textContent='Checking…';
    try{
      var r=await post({action:'auth',pin:pin,device:device()},15000);
      if(r&&r.ok&&/^[0-9a-f]{64}$/.test(r.token||'')){
        try{ sessionStorage.setItem(TOKEN_KEY,r.token); }catch(x){}
        er.textContent='Loading…'; location.reload();
      } else if(r&&r.error==='Locked'){ er.textContent='Too many wrong PINs. Try again in '+Math.max(1,Math.ceil((+r.retryAfter||900)/60))+' minutes.'; }
      else if(r&&r.error==='Wrong PIN'){ er.textContent='Wrong PIN'+(r.triesLeft>0?' · '+r.triesLeft+' tries left':'')+'.'; }
      else er.textContent='Could not check the PIN. Try again.';
    }catch(x){ er.textContent='Could not reach the dashboard service. Check your connection and try again.'; }
    finally{ if(btn) btn.disabled=false; if(inp) inp.value=''; }
    return false;
  };
  gate(!authed());
})();
