/* Unbreak + speed: load last-good core, then cache overlay. Usage panel module at the bottom. */
(function(){
  var s=document.createElement('script');
  s.src="https://cdn.jsdelivr.net/gh/rubendiedericks24-eng/RD-Inevstment-Holdings-@210979731bea51d6380ef6fb7b38a2c65f7438e0/operations-dashboard.js";
  s.onload=function(){
    var a=document.createElement('script');
    a.text="\n/* Speed overlay: paint cache first; always refresh live. Cache is fallback only. Loads after core dashboard.js */\n(function(){\n  if(window.__nexDashFast) return; window.__nexDashFast=1;\n  const STORAGE_KEY='nexos_pe_dash_v1', FETCH_TIMEOUT_MS=12000, AUTO_REFRESH_MS=180000;\n  const TAB_KEYS=['quotes','invoices','jobs','stock','timesheets','leads'];\n  const loadedAt={}; let refreshInFlight=0;\n  function showChip(on){const c=document.getElementById('refreshChip'); if(!c) return; c.hidden=!on; c.classList.toggle('show',!!on);}\n  function beginRefresh(){refreshInFlight++; showChip(true);}\n  function endRefresh(){refreshInFlight=Math.max(0,refreshInFlight-1); if(!refreshInFlight) showChip(false);}\n  function fmtTime(ts){try{return new Date(ts).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});}catch{return '\u2014';}}\n  function saveCache(){try{const tabs={}; TAB_KEYS.forEach(k=>{if(window.loaded&&loaded[k])tabs[k]=loaded[k];}); const ts=Math.max(0,...Object.values(loadedAt).filter(Boolean)); localStorage.setItem(STORAGE_KEY,JSON.stringify({ts:ts||Date.now(),tabs}));}catch(e){}}\n  function readCache(){try{const raw=localStorage.getItem(STORAGE_KEY); if(!raw)return null; const d=JSON.parse(raw); return (d&&d.tabs)?d:null;}catch(e){return null;}}\n  const _fetchTab=window.fetchTab;\n  window.fetchTab=async function(tab){\n    let lastErr;\n    for(let attempt=0; attempt<2; attempt++){\n      const ctrl=new AbortController();\n      const timer=setTimeout(()=>ctrl.abort(), FETCH_TIMEOUT_MS);\n      try{\n        const url=`${SHEETS_SCRIPT_URL}?tab=${encodeURIComponent(tab)}&key=NexOS-PE&_=${Date.now()}`;\n        const res=await fetch(url,{cache:'no-store',signal:ctrl.signal});\n        clearTimeout(timer);\n        if(res.status===404) throw new Error('404 for '+tab);\n        if(!res.ok) throw new Error('Failed '+tab+': '+res.status);\n        const text=await res.text();\n        let data; try{data=JSON.parse(text);}catch(e){throw new Error('Non-JSON for '+tab);}\n        if(data&&data.error) throw new Error(String(data.error));\n        return Array.isArray(data)?data.filter(r=>Object.values(r).some(v=>v!==''&&v!=null)):[];\n      }catch(err){ clearTimeout(timer); lastErr=err; if(attempt===1) break; }\n    }\n    throw lastErr||new Error('Failed '+tab);\n  };\n  const _refreshAll=window.refreshAll;\n  window.refreshAll=async function(force){\n    const banner=document.getElementById('errorBanner'); if(banner) banner.classList.remove('show');\n    beginRefresh();\n    try{\n      await Promise.allSettled(TAB_KEYS.map(async (key)=>{\n        try{\n          const rows=await fetchTab(SHEET[key]);\n          loaded[key]=rows; loadedAt[key]=Date.now();\n          if(key==='quotes') renderQuotes(rows);\n          if(key==='invoices') renderInvoices(rows);\n          if(key==='jobs') renderJobs(rows);\n          if(key==='leads') renderLeads(rows);\n          if(key==='timesheets') renderTimesheet(rows);\n          if(key==='stock') renderStock(rows);\n          updateStats(loaded); bindExpand(document); saveCache();\n          document.getElementById('lastRefresh').textContent='Live from Google Sheets \u00b7 '+fmtTime(Date.now());\n        }catch(err){ console.warn(key, err); }\n      }));\n    } finally { endRefresh(); }\n  };\n  const cached=readCache();\n  if(cached&&cached.tabs){\n    TAB_KEYS.forEach(key=>{\n      if(Array.isArray(cached.tabs[key])){\n        loaded[key]=cached.tabs[key]; loadedAt[key]=cached.ts||Date.now();\n        if(key==='quotes') renderQuotes(loaded[key]);\n        if(key==='invoices') renderInvoices(loaded[key]);\n        if(key==='jobs') renderJobs(loaded[key]);\n        if(key==='leads') renderLeads(loaded[key]);\n        if(key==='timesheets') renderTimesheet(loaded[key]);\n        if(key==='stock') renderStock(loaded[key]);\n      }\n    });\n    updateStats(loaded); bindExpand(document);\n    document.getElementById('lastRefresh').textContent='Cached \u00b7 Updated '+fmtTime(cached.ts||Date.now());\n  }\n  setInterval(()=>{ if(document.visibilityState==='visible') refreshAll(true); }, AUTO_REFRESH_MS);\n  window.onload=function(){ refreshAll(true); };\n  if(document.readyState==='complete') refreshAll(true);\n})();\n";
    document.head.appendChild(a);
    if(window.__nexUsageHook) window.__nexUsageHook();
  };
  s.onerror=function(){
    var t=document.createElement('script');
    t.src='https://raw.githubusercontent.com/rubendiedericks24-eng/RD-Inevstment-Holdings-/210979731bea51d6380ef6fb7b38a2c65f7438e0/operations-dashboard.js';
    t.onload=s.onload;
    document.head.appendChild(t);
  };
  document.head.appendChild(s);
})();

/* Usage + company panels (display-only). Read sheet tabs "Usage", "Top-ups Ledger" and "Reconciliation"
   from the same Apps Script feed. Live load every refresh; localStorage cache is only a fallback when live
   fails. A tab that does not exist shows "unavailable", never an error. */
(function(){
  if(window.__nexUsage) return; window.__nexUsage=1;
  var FEED='https://script.google.com/macros/s/AKfycbzcv7Cbp_JeBZiCUTCWVEDkV6BvO4d3tDz8ivx-HR5qHos-xTROolb8F146G2SCyUPk/exec';
  var KEY='NexOS-PE', TIMEOUT_MS=12000, TZ='Africa/Johannesburg';
  var TABS={usage:'Usage', ledger:'Top-ups Ledger', recon:'Reconciliation'};
  var CACHE={usage:'nexos_pe_usage_v1', ledger:'nexos_pe_topups_v1', recon:'nexos_pe_recon_v1'};
  var INCL_CHATS=300, INCL_JOBS=60, PACK_CHATS=250, PACK_JOBS=50, PACK_PRICE=350;
  var inFlight=null, lastLoad=0;

  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function get(row,name){
    var want=String(name).toLowerCase().replace(/\s+/g,' ').trim();
    for(var k in row){ if(Object.prototype.hasOwnProperty.call(row,k) && String(k).toLowerCase().replace(/\s+/g,' ').trim()===want) return row[k]; }
    return '';
  }
  function num(v){ if(v===''||v==null) return NaN; var n=parseFloat(String(v).replace(/[^0-9.\-]/g,'')); return isNaN(n)?NaN:n; }
  function rands(n){ return 'R'+(isNaN(n)?0:n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function partsOf(d,withDay){
    try{ var o={}; new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).forEach(function(x){o[x.type]=x.value;});
      if(o.year&&o.month) return o.year+'-'+o.month+(withDay?'-'+o.day:''); }catch(e){}
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+(withDay?'-'+String(d.getDate()).padStart(2,'0'):'');
  }
  function ymOf(d){ return partsOf(d,false); }
  function currentMonth(){ return ymOf(new Date()); }
  /* any feed value -> YYYY-MM-DD in SAST ('' if unknown). Text without a zone is already SAST. */
  function dayOf(v){
    var s=String(v==null?'':v).trim(), m; if(!s) return '';
    if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/))) return m[1]+'-'+m[2]+'-'+m[3];
    if(/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)){ var d=new Date(s); if(!isNaN(d)) return partsOf(d,true); }
    if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
    return '';
  }
  function monthOf(v){
    var s=String(v==null?'':v).trim(); if(!s) return '';
    var m=s.match(/^(\d{4})[-\/](\d{1,2})$/); if(m) return m[1]+'-'+m[2].padStart(2,'0');
    var d=dayOf(s); if(d) return d.slice(0,7);
    var d2=new Date(s); if(!isNaN(d2)) return ymOf(d2);
    return s;
  }
  function monthLabel(ym){
    var m=String(ym).match(/^(\d{4})-(\d{2})$/); if(!m) return ym;
    try{ return new Date(Date.UTC(+m[1],+m[2]-1,15)).toLocaleDateString('en-ZA',{month:'long',year:'numeric',timeZone:'UTC'}); }catch(e){ return ym; }
  }
  function pct(used,limit,pctCol){
    if(!isNaN(used)&&!isNaN(limit)&&limit>0) return used/limit*100;
    var p=num(pctCol); if(isNaN(p)) return NaN;
    if(String(pctCol).indexOf('%')<0 && p<=1.5 && p>0 && p!==Math.round(p)) p=p*100;
    return p;
  }
  function level(p){ return isNaN(p)?'':(p>=100?'red':(p>=80?'amber':'')); }
  function packs(v,size){ var n=num(v); if(isNaN(n)||n<=0) return {packs:0,units:0};
    if(n>=size && n%size===0) return {packs:n/size,units:n};
    return {packs:n,units:n*size}; }
  function plural(n,w){ return n+' '+w+(n===1?'':'s'); }
  function fmtTime(ts){ try{ return new Date(ts).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return '—'; } }

  /* ---------- usage rows (shared by both panels) ---------- */
  function usageFor(r){
    var cu=num(get(r,'Chats Used')), ju=num(get(r,'Jobs Used'));
    var cl=num(get(r,'Chats Limit')), jl=num(get(r,'Jobs Limit'));
    var tc=packs(get(r,'Top-ups Chats'),PACK_CHATS), tj=packs(get(r,'Top-ups Jobs'),PACK_JOBS);
    if(isNaN(cl)) cl=INCL_CHATS+tc.units;
    if(isNaN(jl)) jl=INCL_JOBS+tj.units;
    var owed=num(get(r,'Top-up Amount Owed')); if(isNaN(owed)) owed=(tc.packs+tj.packs)*PACK_PRICE;
    var cp=pct(cu,cl,get(r,'Chats %')), jp=pct(ju,jl,get(r,'Jobs %'));
    return {shop:get(r,'Workshop'), mgr:get(r,'Manager Number'), cu:cu, ju:ju, cl:cl, jl:jl, tc:tc, tj:tj, owed:owed, cp:cp, jp:jp,
      worst:Math.max(isNaN(cp)?0:cp, isNaN(jp)?0:jp)};
  }
  function rowsForMonth(rows,ym){
    var byShop={};
    (rows||[]).forEach(function(r){
      if(monthOf(get(r,'Month'))!==ym) return;
      var shop=String(get(r,'Workshop')||'').trim()||'(unnamed workshop)';
      byShop[shop]=r; /* last row wins if duplicated */
    });
    return Object.keys(byShop).sort(function(a,b){return a.localeCompare(b);}).map(function(k){return byShop[k];});
  }
  function bar(label,used,limit,p){
    var lv=level(p), w=isNaN(p)?0:Math.max(0,Math.min(100,p));
    var u=isNaN(used)?'—':used.toLocaleString('en-ZA'), l=isNaN(limit)?'—':limit.toLocaleString('en-ZA');
    var ptxt=isNaN(p)?'—':Math.round(p)+'%';
    return '<div class="u-metric">'+
      '<div class="u-mhead"><span>'+label+'</span><span class="u-num'+(lv?' u-'+lv:'')+'">'+u+' / '+l+' · '+ptxt+'</span></div>'+
      '<div class="u-bar'+(lv?' u-'+lv:'')+'" role="progressbar" aria-label="'+label+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(isNaN(p)?0:Math.round(p))+'"><i style="width:'+w.toFixed(1)+'%"></i></div>'+
    '</div>';
  }
  function unavailableHtml(msg){ return '<div class="empty u-unavail">'+esc(msg.title)+(msg.sub?'<br><span>'+esc(msg.sub)+'</span>':'')+'</div>'; }

  function renderUsage(st,ym){
    var list=$('usageList'); if(!list) return;
    $('usageMonth').textContent=monthLabel(ym);
    var src=$('usageSrc');
    if(!st.rows){ list.innerHTML=unavailableHtml({title:'Usage data unavailable', sub:st.reason}); if(src) src.textContent='Sheet → Usage'; return; }
    var mine=rowsForMonth(st.rows,ym);
    if(!mine.length) list.innerHTML='<div class="empty">No usage rows for '+esc(monthLabel(ym))+' yet.</div>';
    else list.innerHTML=mine.map(function(r){
      var u=usageFor(r), lv=level(u.worst);
      var pill=lv==='red'?'<span class="pill bad">Over limit · top up</span>':(lv==='amber'?'<span class="pill warn">80%+ used</span>':'<span class="pill ok">OK</span>');
      var tu=[];
      tu.push(u.tc.packs?(plural(u.tc.packs,'chat pack')+' (+'+u.tc.units.toLocaleString('en-ZA')+' chats)'):'0 chat packs');
      tu.push(u.tj.packs?(plural(u.tj.packs,'job pack')+' (+'+u.tj.units.toLocaleString('en-ZA')+' jobs)'):'0 job packs');
      return '<article class="u-card'+(lv?' u-card-'+lv:'')+'">'+
        '<div class="top"><div><div class="name" style="margin-top:0">'+(esc(u.shop)||'—')+'</div>'+(u.mgr!==''?'<div class="meta">'+esc(u.mgr)+' · manager</div>':'')+'</div>'+pill+'</div>'+
        bar('AI chats',u.cu,u.cl,u.cp)+bar('Jobs',u.ju,u.jl,u.jp)+
        '<div class="u-foot"><span>Top-ups this month: '+esc(tu.join(' · '))+'</span><span class="u-owed">Top-ups owed: <b>'+rands(u.owed)+'</b></span></div>'+
        (lv==='red'?'<div class="u-soft">Soft limit — the AI keeps replying. Ask the workshop to top up (R350 per 250 chats or per 50 jobs, added to the next invoice).</div>':'')+
      '</article>';
    }).join('');
    if(src) src.textContent='Sheet → Usage · '+st.note;
  }

  /* ---------- company panel ---------- */
  function renderCompany(state,ym){
    if(!$('companyPanel')) return;
    $('companyMonth').textContent=monthLabel(ym);

    /* Reconciliation: latest row by date (ties -> last row) */
    var rc=$('coRecon'), r=state.recon;
    if(!r.rows) rc.innerHTML=unavailableHtml({title:'Reconciliation unavailable', sub:r.reason});
    else{
      var best=null, bestDay='';
      r.rows.forEach(function(x){ var d=dayOf(get(x,'date'))||String(get(x,'date')||''); if(d && d>=bestDay){ best=x; bestDay=d; } });
      if(!best) rc.innerHTML='<div class="empty">No check yet</div>';
      else{
        var stt=String(get(best,'status')||'').trim().toUpperCase(), ok=stt==='OK';
        var me=get(best,'make_errors');
        rc.innerHTML='<div class="co-recon '+(ok?'co-ok':'co-bad')+'">'+
          '<div class="top"><span class="pill '+(ok?'ok':'bad')+'">'+(ok?'OK':esc(stt||'MISMATCH'))+'</span><span class="u-num">'+esc(bestDay)+'</span></div>'+
          '<dl class="co-dl"><dt>Jobs</dt><dd>log '+esc(get(best,'jobs log'))+' · quotes '+esc(get(best,'jobs quotes'))+'</dd>'+
          '<dt>Chats</dt><dd>log '+esc(get(best,'chats log'))+' · inbound '+esc(get(best,'chats inbound'))+'</dd>'+
          '<dt>Make errors</dt><dd>'+esc(me===''?'—':me)+'</dd></dl>'+
          (get(best,'detail')!==''?'<div class="co-detail'+(ok?'':' co-detail-bad')+'">'+esc(get(best,'detail'))+'</div>':'')+
        '</div>';
      }
    }
    $('coReconSrc').textContent='Sheet → Reconciliation'+(r.rows?' · '+r.note:'');

    /* Top-ups this month (Void excluded) */
    var tl=$('coTopups'), l=state.ledger;
    if(!l.rows) tl.innerHTML=unavailableHtml({title:'Top-ups unavailable', sub:l.reason});
    else{
      var split={Pending:{n:0,r:0},Invoiced:{n:0,r:0},Paid:{n:0,r:0}}, other={n:0,r:0}, n=0, total=0;
      l.rows.forEach(function(x){
        var st=String(get(x,'status')||'').trim(), key=st.charAt(0).toUpperCase()+st.slice(1).toLowerCase();
        if(key==='Void') return;
        var mo=monthOf(get(x,'timestamp'));
        if(!/^\d{4}-\d{2}$/.test(mo)){ var id=String(get(x,'topup_id')||'').match(/^TU-(\d{2})(\d{2})/); mo=id?('20'+id[1]+'-'+id[2]):''; }
        if(mo!==ym) return;
        var price=num(get(x,'price')); if(isNaN(price)) price=PACK_PRICE;
        n++; total+=price;
        var b=split[key]||other; b.n++; b.r+=price;
      });
      tl.innerHTML='<div class="co-big"><b>'+n+'</b> top-up'+(n===1?'':'s')+' · <b>'+rands(total)+'</b></div>'+
        '<div class="co-split">'+
          '<span class="pill warn">Pending '+split.Pending.n+' · '+rands(split.Pending.r)+'</span>'+
          '<span class="pill info">Invoiced '+split.Invoiced.n+' · '+rands(split.Invoiced.r)+'</span>'+
          '<span class="pill ok">Paid '+split.Paid.n+' · '+rands(split.Paid.r)+'</span>'+
          (other.n?'<span class="pill">Other '+other.n+' · '+rands(other.r)+'</span>':'')+
        '</div><div class="u-num" style="white-space:normal;margin-top:6px">Void excluded</div>';
    }
    $('coTopupsSrc').textContent='Sheet → Top-ups Ledger'+(l.rows?' · '+l.note:'');

    /* Per-workshop usage % (same Usage data as the panel below) */
    var ul=$('coUsage'), u=state.usage;
    if(!u.rows) ul.innerHTML=unavailableHtml({title:'Usage data unavailable', sub:u.reason});
    else{
      var mine=rowsForMonth(u.rows,ym);
      ul.innerHTML=mine.length?mine.map(function(x){
        var v=usageFor(x);
        var p=function(label,val){ var lv=level(val); return '<span class="co-pct'+(lv?' u-'+lv:'')+'">'+label+' '+(isNaN(val)?'—':Math.round(val)+'%')+'</span>'; };
        return '<div class="co-row"><span class="co-shop">'+(esc(v.shop)||'—')+'</span><span>'+p('Chats',v.cp)+p('Jobs',v.jp)+'</span></div>';
      }).join(''):'<div class="empty">No usage rows for '+esc(monthLabel(ym))+' yet.</div>';
    }
  }

  /* ---------- loading ---------- */
  function readCache(k){ try{ var d=JSON.parse(localStorage.getItem(CACHE[k])||'null'); return (d&&Array.isArray(d.rows))?d:null; }catch(e){ return null; } }
  function saveCache(k,rows){ try{ localStorage.setItem(CACHE[k],JSON.stringify({ts:Date.now(),rows:rows})); }catch(e){} }

  async function fetchRows(tab){
    var lastErr;
    for(var attempt=0; attempt<2; attempt++){
      var ctrl=new AbortController(), timer=setTimeout(function(){ctrl.abort();},TIMEOUT_MS);
      try{
        var res=await fetch(FEED+'?tab='+encodeURIComponent(tab)+'&key='+encodeURIComponent(KEY)+'&_='+Date.now(),{cache:'no-store',signal:ctrl.signal});
        clearTimeout(timer);
        if(!res.ok) throw new Error('HTTP '+res.status);
        var text=await res.text(), data;
        try{ data=JSON.parse(text); }catch(e){ throw new Error('Feed did not return JSON'); }
        if(data&&data.error){ var e2=new Error(String(data.error)); e2.final=true; throw e2; }
        if(!Array.isArray(data)) throw new Error('Unexpected feed shape');
        return data.filter(function(r){ return Object.keys(r).some(function(k){ return k!=='__row' && r[k]!=='' && r[k]!=null; }); });
      }catch(err){ clearTimeout(timer); lastErr=err; if(err&&err.final) break; }
    }
    throw lastErr||new Error('Load failed');
  }

  async function loadOne(k){
    try{
      var rows=await fetchRows(TABS[k]);
      saveCache(k,rows);
      return {rows:rows, note:'live '+fmtTime(Date.now())};
    }catch(err){
      console.warn(TABS[k],err);
      var missing=/tab not found/i.test(String(err&&err.message));
      var c=missing?null:readCache(k);
      if(c) return {rows:c.rows, note:'live load failed — cached '+fmtTime(c.ts)};
      return {rows:null, reason:missing?('The "'+TABS[k]+'" sheet tab is not available yet.'):'Could not reach the live feed. Tap Refresh to retry.'};
    }
  }

  function loadUsage(){
    if(!$('usageList') && !$('companyPanel')) return Promise.resolve();
    if(inFlight) return inFlight;
    lastLoad=Date.now();
    inFlight=(async function(){
      try{
        var ym=currentMonth();
        var out=await Promise.all([loadOne('usage'),loadOne('ledger'),loadOne('recon')]);
        var state={usage:out[0], ledger:out[1], recon:out[2]};
        try{ renderUsage(state.usage,ym); }catch(e){ console.warn('usage render',e); }
        try{ renderCompany(state,ym); }catch(e){ console.warn('company render',e); }
      }finally{ inFlight=null; }
    })();
    return inFlight;
  }

  window.__nexUsageHook=function(){
    var orig=window.refreshAll;
    if(typeof orig==='function' && !orig.__usageWrapped){
      var wrapped=function(){ loadUsage(); return orig.apply(this,arguments); };
      wrapped.__usageWrapped=true;
      window.refreshAll=wrapped;
    }
  };
  window.loadUsage=loadUsage;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadUsage); else loadUsage();
  setInterval(function(){ if(document.visibilityState==='visible' && Date.now()-lastLoad>150000) loadUsage(); },60000);
})();
