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

/* Usage panel (display-only). Reads sheet tab "Usage" from the same Apps Script feed.
   Live load every refresh; localStorage cache is only a fallback when live fails. */
(function(){
  if(window.__nexUsage) return; window.__nexUsage=1;
  var FEED='https://script.google.com/macros/s/AKfycbzcv7Cbp_JeBZiCUTCWVEDkV6BvO4d3tDz8ivx-HR5qHos-xTROolb8F146G2SCyUPk/exec';
  var TAB='Usage', KEY='NexOS-PE', CACHE_KEY='nexos_pe_usage_v1', TIMEOUT_MS=12000, TZ='Africa/Johannesburg';
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
  function ymOf(d){
    try{ var p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit'}).formatToParts(d), y='', m='';
      p.forEach(function(x){ if(x.type==='year') y=x.value; if(x.type==='month') m=x.value; }); if(y&&m) return y+'-'+m; }catch(e){}
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function currentMonth(){ return ymOf(new Date()); }
  function monthOf(v){
    var s=String(v==null?'':v).trim(); if(!s) return '';
    var m=s.match(/^(\d{4})[-\/](\d{1,2})$/); if(m) return m[1]+'-'+m[2].padStart(2,'0');
    if(/^\d{4}-\d{2}-\d{2}T/.test(s)){ var d=new Date(s); if(!isNaN(d)) return ymOf(d); }
    m=s.match(/^(\d{4})-(\d{2})-\d{2}$/); if(m) return m[1]+'-'+m[2];
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
    if(String(pctCol).indexOf('%')<0 && p<=1.5) p=p*100;
    return p;
  }
  function level(p){ return isNaN(p)?'':(p>=100?'red':(p>=80?'amber':'')); }
  function packs(v,size){ var n=num(v); if(isNaN(n)||n<=0) return {packs:0,units:0};
    if(n>=size && n%size===0) return {packs:n/size,units:n};
    return {packs:n,units:n*size}; }
  function plural(n,w){ return n+' '+w+(n===1?'':'s'); }

  function bar(label,used,limit,p){
    var lv=level(p), w=isNaN(p)?0:Math.max(0,Math.min(100,p));
    var u=isNaN(used)?'—':used.toLocaleString('en-ZA'), l=isNaN(limit)?'—':limit.toLocaleString('en-ZA');
    var ptxt=isNaN(p)?'—':Math.round(p)+'%';
    return '<div class="u-metric">'+
      '<div class="u-mhead"><span>'+label+'</span><span class="u-num'+(lv?' u-'+lv:'')+'">'+u+' / '+l+' · '+ptxt+'</span></div>'+
      '<div class="u-bar'+(lv?' u-'+lv:'')+'" role="progressbar" aria-label="'+label+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+(isNaN(p)?0:Math.round(p))+'"><i style="width:'+w.toFixed(1)+'%"></i></div>'+
    '</div>';
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

  function render(rows,ym,note){
    var list=$('usageList'); if(!list) return;
    $('usageMonth').textContent=monthLabel(ym);
    var mine=rowsForMonth(rows,ym);
    if(!mine.length){
      list.innerHTML='<div class="empty">No usage rows for '+esc(monthLabel(ym))+' yet.</div>';
    } else {
      list.innerHTML=mine.map(function(r){
        var shop=get(r,'Workshop'), mgr=get(r,'Manager Number');
        var cu=num(get(r,'Chats Used')), ju=num(get(r,'Jobs Used'));
        var cl=num(get(r,'Chats Limit')), jl=num(get(r,'Jobs Limit'));
        var tc=packs(get(r,'Top-ups Chats'),PACK_CHATS), tj=packs(get(r,'Top-ups Jobs'),PACK_JOBS);
        if(isNaN(cl)) cl=INCL_CHATS+tc.units;
        if(isNaN(jl)) jl=INCL_JOBS+tj.units;
        var cp=pct(cu,cl,get(r,'Chats %')), jp=pct(ju,jl,get(r,'Jobs %'));
        var owedRaw=get(r,'Top-up Amount Owed'), owed=num(owedRaw);
        if(isNaN(owed)) owed=(tc.packs+tj.packs)*PACK_PRICE;
        var worst=Math.max(isNaN(cp)?0:cp, isNaN(jp)?0:jp), lv=level(worst);
        var pill=lv==='red'?'<span class="pill bad">Over limit · top up</span>':(lv==='amber'?'<span class="pill warn">80%+ used</span>':'<span class="pill ok">OK</span>');
        var tu=[];
        tu.push(tc.packs?(plural(tc.packs,'chat pack')+' (+'+tc.units.toLocaleString('en-ZA')+' chats)'):'0 chat packs');
        tu.push(tj.packs?(plural(tj.packs,'job pack')+' (+'+tj.units.toLocaleString('en-ZA')+' jobs)'):'0 job packs');
        return '<article class="u-card'+(lv?' u-card-'+lv:'')+'">'+
          '<div class="top"><div><div class="name" style="margin-top:0">'+(esc(shop)||'—')+'</div>'+(mgr!==''?'<div class="meta">'+esc(mgr)+' · manager</div>':'')+'</div>'+pill+'</div>'+
          bar('AI chats',cu,cl,cp)+bar('Jobs',ju,jl,jp)+
          '<div class="u-foot"><span>Top-ups this month: '+esc(tu.join(' · '))+'</span><span class="u-owed">Top-ups owed: <b>'+rands(owed)+'</b></span></div>'+
          (lv==='red'?'<div class="u-soft">Soft limit — the AI keeps replying. Ask the workshop to top up (R350 per 250 chats or per 50 jobs, added to the next invoice).</div>':'')+
        '</article>';
      }).join('');
    }
    var src=$('usageSrc'); if(src) src.textContent='Sheet → Usage'+(note?' · '+note:'');
  }

  function unavailable(msg){
    var list=$('usageList'); if(!list) return;
    $('usageMonth').textContent=monthLabel(currentMonth());
    list.innerHTML='<div class="empty u-unavail">Usage data unavailable'+(msg?'<br><span>'+esc(msg)+'</span>':'')+'</div>';
    var src=$('usageSrc'); if(src) src.textContent='Sheet → Usage';
  }

  function fmtTime(ts){ try{ return new Date(ts).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return '—'; } }
  function readCache(){ try{ var d=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); return (d&&Array.isArray(d.rows))?d:null; }catch(e){ return null; } }
  function saveCache(rows){ try{ localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),rows:rows})); }catch(e){} }

  async function fetchUsage(){
    var lastErr;
    for(var attempt=0; attempt<2; attempt++){
      var ctrl=new AbortController(), timer=setTimeout(function(){ctrl.abort();},TIMEOUT_MS);
      try{
        var res=await fetch(FEED+'?tab='+encodeURIComponent(TAB)+'&key='+encodeURIComponent(KEY)+'&_='+Date.now(),{cache:'no-store',signal:ctrl.signal});
        clearTimeout(timer);
        if(!res.ok) throw new Error('HTTP '+res.status);
        var text=await res.text(), data;
        try{ data=JSON.parse(text); }catch(e){ throw new Error('Feed did not return JSON'); }
        if(data&&data.error){ var e2=new Error(String(data.error)); e2.final=true; throw e2; }
        if(!Array.isArray(data)) throw new Error('Unexpected feed shape');
        return data.filter(function(r){ return Object.keys(r).some(function(k){ return k!=='__row' && r[k]!=='' && r[k]!=null; }); });
      }catch(err){ clearTimeout(timer); lastErr=err; if(err&&err.final) break; }
    }
    throw lastErr||new Error('Usage load failed');
  }

  function loadUsage(){
    if(!$('usageList')) return Promise.resolve();
    if(inFlight) return inFlight;
    lastLoad=Date.now();
    inFlight=(async function(){
      var ym=currentMonth();
      try{
        var rows=await fetchUsage();
        saveCache(rows);
        render(rows,ym,'live '+fmtTime(Date.now()));
      }catch(err){
        console.warn('usage',err);
        var c=readCache();
        if(c && !/tab not found/i.test(String(err&&err.message))) render(c.rows,ym,'live load failed — cached '+fmtTime(c.ts));
        else unavailable(/tab not found/i.test(String(err&&err.message))?'The Usage sheet tab is not available yet.':'Could not reach the live feed. Tap Refresh to retry.');
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
