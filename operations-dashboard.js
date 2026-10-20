/* NexAgent AI operations dashboard (self-contained; no external core, no access key in this file).
   Access: the client enters the PIN Ruben gave them. The PIN is sent once (POST body, never in a URL) to the
   feed, which checks it server-side (hashed + peppered, rate-limited) and returns a session token (6 h).
   Only that token is kept, in sessionStorage (this tab only). No sheet data is fetched before the PIN is
   accepted, and data caches live in sessionStorage only (cleared when the tab closes). */
const SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzcv7Cbp_JeBZiCUTCWVEDkV6BvO4d3tDz8ivx-HR5qHos-xTROolb8F146G2SCyUPk/exec';
const NEX_TOKEN_KEY='nexos_feed_token_v1', NEX_DEVICE_KEY='nexos_device_v1';
(function(){ /* remove client data cached in localStorage by older versions of this page */
  ['nexos_pe_dash_v1','nexos_pe_usage_v1','nexos_pe_topups_v2','nexos_pe_recon_v1'].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
  try{ sessionStorage.removeItem('nexagent_pe_gate_v1'); }catch(e){}
})();
function nexToken(){ try{ return sessionStorage.getItem(NEX_TOKEN_KEY)||''; }catch(e){ return ''; } }
function nexAuthed(){ return /^[0-9a-f]{64}$/.test(nexToken()); }
function nexDevice(){
  let d=''; try{ d=localStorage.getItem(NEX_DEVICE_KEY)||''; }catch(e){}
  if(!/^[0-9a-f]{32}$/.test(d)){ const a=new Uint8Array(16); crypto.getRandomValues(a); d=Array.from(a,b=>('0'+b.toString(16)).slice(-2)).join(''); try{ localStorage.setItem(NEX_DEVICE_KEY,d); }catch(e){} }
  return d;
}
async function nexPost(body, timeoutMs){
  const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(), timeoutMs||12000);
  try{
    const res=await fetch(SHEETS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),cache:'no-store',signal:ctrl.signal,redirect:'follow'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const text=await res.text();
    try{ return JSON.parse(text); }catch(e){ throw new Error('Feed did not return JSON'); }
  } finally { clearTimeout(timer); }
}
function nexShowGate(msg){
  const g=document.getElementById('nexGate'); if(g) g.classList.remove('ok');
  const er=document.getElementById('nexGateErr'); if(er) er.textContent=msg||'';
}
function nexLock(msg){ try{ sessionStorage.removeItem(NEX_TOKEN_KEY); }catch(e){} nexShowGate(msg); }
async function nexFeedTab(tab, timeoutMs){
  if(!nexAuthed()){ const e=new Error('PIN required'); e.final=true; throw e; }
  const data=await nexPost({action:'tab', token:nexToken(), tab:tab}, timeoutMs);
  if(data&&data.error){
    const e=new Error(String(data.error)); e.final=true;
    if(data.error==='Unauthorized') nexLock('Session ended. Enter your PIN again.');
    throw e;
  }
  if(!Array.isArray(data)) throw new Error('Unexpected feed shape');
  return data.filter(r=>Object.values(r).some(v=>v!==''&&v!=null));
}
async function nexUnlock(e){
  if(e) e.preventDefault();
  const inp=document.getElementById('nexGatePw'), er=document.getElementById('nexGateErr'), btn=document.querySelector('#nexGate button');
  const pin=String(inp&&inp.value||'').replace(/\s+/g,'');
  if(!/^\d{6,8}$/.test(pin)){ er.textContent='Enter your 6–8 digit PIN.'; return false; }
  if(btn) btn.disabled=true; er.textContent='Checking…';
  try{
    const r=await nexPost({action:'auth', pin:pin, device:nexDevice()}, 15000);
    if(r&&r.ok&&/^[0-9a-f]{64}$/.test(r.token||'')){
      try{ sessionStorage.setItem(NEX_TOKEN_KEY, r.token); }catch(x){}
      er.textContent='';
      document.getElementById('nexGate').classList.add('ok');
      if(typeof refreshAll==='function') refreshAll(true);
      if(typeof window.loadUsage==='function') window.loadUsage();
    } else if(r&&r.error==='Locked'){
      er.textContent='Too many wrong PINs. Try again in '+Math.max(1,Math.ceil((+r.retryAfter||900)/60))+' minutes.';
    } else if(r&&r.error==='Wrong PIN'){
      er.textContent='Wrong PIN'+(r.triesLeft>0?' · '+r.triesLeft+' tries left':'')+'.';
    } else er.textContent='Could not check the PIN. Try again.';
  }catch(x){ er.textContent='Could not reach the dashboard service. Check your connection and try again.'; }
  finally{ if(btn) btn.disabled=false; if(inp) inp.value=''; }
  return false;
}
if(nexAuthed()){ const g=document.getElementById('nexGate'); if(g) g.classList.add('ok'); }

/* ---------- core (vendored from commit 2109797; access key removed, esc() fixed) ---------- */
const SHEET = {
  quotes: 'Quotes',
  invoices: 'Invoices',
  jobs: 'Job Bookings',
  stock: 'Parts & Stock',
  timesheets: 'Timesheet',
  leads: 'Leads'
};
const CLOSED = ['done','complete','completed','cancelled','canceled','closed','paid'];

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function gf(obj,...keys){
  for(const k of keys){
    const found = Object.keys(obj||{}).find(h => h.toLowerCase().trim() === k.toLowerCase());
    if(found && obj[found] !== '' && obj[found] != null) return obj[found];
  }
  return '';
}
function fmt(v){const n=parseFloat(String(v).replace(/[^0-9.]/g,''))||0;return 'R'+n.toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});}
function sheetDate(d){var s=String(d).trim();if(/^\d{4,5}(\.\d+)?$/.test(s)){var n=+s;if(n>20000&&n<80000){var x=new Date(Math.round((n-25569)*86400000));return new Date(x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate());}}if(/^\d{4}-\d{2}-\d{2}$/.test(s)){var q=s.split('-');return new Date(+q[0],+q[1]-1,+q[2]);}return new Date(d);}
function fmtDate(d){if(!d)return '—';try{const dt=sheetDate(d);if(isNaN(dt))return esc(d);return dt.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});}catch{return esc(d);}}
function isClosed(s){return CLOSED.includes(String(s||'').toLowerCase().trim());}
function pillClass(status){
  const s=String(status||'').toLowerCase();
  if(['accepted','done','paid','new','ok'].includes(s)) return 'ok';
  if(['outstanding','open','pending','sent'].includes(s)) return 'warn';
  if(['overdue','declined','cancelled'].includes(s)) return 'bad';
  return 'info';
}
async function fetchTab(tab){ return nexFeedTab(tab); }

function card({code,name,meta,line,status,details}){
  return `<article class="row">
    <button class="sum" type="button" aria-expanded="false">
      <div class="top"><div class="code">${esc(code)||'—'}</div><span class="pill ${pillClass(status)}">${esc(status)||'—'}</span></div>
      <div class="name">${esc(name)||'—'}</div>
      <div class="meta">${esc(meta)||''}</div>
      <div class="line">${line||''}</div>
    </button>
    <div class="detail"><dl>${details}</dl>
      <p class="hint" style="margin-top:12px;margin-bottom:0">Actions via WhatsApp only. Dashboard is browse-only.</p>
    </div>
  </article>`;
}

function bindExpand(root){
  root.querySelectorAll('.list').forEach(list => {
    list.onclick = (e) => {
      const btn = e.target.closest('.sum'); if(!btn) return;
      const row = btn.closest('.row');
      const open = row.classList.toggle('open');
      btn.setAttribute('aria-expanded', open?'true':'false');
    };
  });
}

function renderQuotes(rows){
  const el=document.getElementById('quotesList');
  if(!rows.length){el.innerHTML='<div class="empty">No quotes in sheet</div>';return;}
  el.innerHTML=[...rows].reverse().map(q=>{
    const no=gf(q,'Quote No','quoteNo','Quote');
    const client=gf(q,'Client','client','Customer Name','name');
    const phone=gf(q,'Phone','Phone ','phone','Contact Number');
    const items=gf(q,'Items','items','Job','Description');
    const vehicle=gf(q,'Reference','Vehicle','vehicle');
    const sub=gf(q,'Subtotal','subtotal'); const vat=gf(q,'VAT','vat'); const total=gf(q,'Total','total');
    const status=gf(q,'Status','status'); const date=gf(q,'Date','date');
    return card({
      code:no, name:client, meta:phone, line:`${esc(items)} · <b>${total?fmt(total):'—'}</b>`, status,
      details:`<dt>Client</dt><dd>${esc(client)}</dd><dt>Phone</dt><dd>${esc(phone)}</dd><dt>Quote / job code</dt><dd>${esc(no)}</dd><dt>Vehicle / ref</dt><dd>${esc(vehicle)}</dd><dt>Items</dt><dd>${esc(items)}</dd><dt>Subtotal</dt><dd>${sub?fmt(sub):'—'}</dd><dt>VAT</dt><dd>${vat?fmt(vat):'—'}</dd><dt>Total</dt><dd>${total?fmt(total):'—'}</dd><dt>Status</dt><dd>${esc(status)}</dd><dt>Date</dt><dd>${fmtDate(date)}</dd>`
    });
  }).join('');
}

function renderInvoices(rows){
  const el=document.getElementById('invoicesList');
  if(!rows.length){el.innerHTML='<div class="empty">No invoices in sheet</div>';return;}
  el.innerHTML=[...rows].reverse().map(i=>{
    const no=gf(i,'Invoice No','Invoice','invNo');
    const client=gf(i,'Client','client','name');
    const phone=gf(i,'Phone','phone');
    const qref=gf(i,'Quote Ref','quoteRef');
    const jref=gf(i,'Job Ref','Job Ref ','jobRef');
    const desc=gf(i,'Description','Items','items');
    const total=gf(i,'Total','total'); const status=gf(i,'Status','status');
    const due=gf(i,'Due Date','dueDate');
    return card({
      code:no, name:client, meta:phone, line:`${esc(desc)} · <b>${total?fmt(total):'—'}</b>`, status,
      details:`<dt>Invoice</dt><dd>${esc(no)}</dd><dt>Client</dt><dd>${esc(client)}</dd><dt>Phone</dt><dd>${esc(phone)}</dd><dt>Quote ref</dt><dd>${esc(qref)}</dd><dt>Job ref</dt><dd>${esc(jref)||'—'}</dd><dt>Description</dt><dd>${esc(desc)}</dd><dt>Total</dt><dd>${total?fmt(total):'—'}</dd><dt>Status</dt><dd>${esc(status)}</dd><dt>Due</dt><dd>${fmtDate(due)}</dd>`
    });
  }).join('');
}

function renderJobs(rows){
  const el=document.getElementById('jobsList');
  if(!rows.length){el.innerHTML='<div class="empty">No job bookings in sheet</div>';return;}
  el.innerHTML=[...rows].reverse().map(j=>{
    const client=gf(j,'Customer Name','customerName','name');
    const phone=gf(j,'Contact Number','phone','Phone');
    const vehicle=gf(j,'Vehicle','vehicle');
    const job=gf(j,'Job Type','jobType','Items');
    const status=gf(j,'Status','status');
    const date=gf(j,'Date','date');
    return card({
      code:phone, name:client, meta:`${phone} · manager ref`, line:`${esc(job)} · ${esc(vehicle)}`, status:status||'OPEN',
      details:`<dt>Customer</dt><dd>${esc(client)}</dd><dt>Phone</dt><dd>${esc(phone)}</dd><dt>Vehicle</dt><dd>${esc(vehicle)}</dd><dt>Job type</dt><dd>${esc(job)}</dd><dt>Status</dt><dd>${esc(status)}</dd><dt>Logged</dt><dd>${fmtDate(date)}</dd>`
    });
  }).join('');
}

function renderLeads(rows){
  const el=document.getElementById('leadsList');
  if(!rows.length){el.innerHTML='<div class="empty">No leads in sheet</div>';return;}
  el.innerHTML=[...rows].reverse().map(l=>{
    const name=gf(l,'Customer Name','name','Name');
    const phone=gf(l,'Contact Number','phone');
    const enquiry=gf(l,'Enquiry Type','enquiry');
    const vehicle=gf(l,'Vehicle','vehicle');
    const details=gf(l,'Details','details','Items');
    const status=gf(l,'Status','status')||'New';
    const date=gf(l,'Date','date');
    return card({
      code:enquiry, name, meta:phone, line:`${esc(details)} · ${esc(vehicle)}`, status,
      details:`<dt>Name</dt><dd>${esc(name)}</dd><dt>Phone</dt><dd>${esc(phone)}</dd><dt>Enquiry</dt><dd>${esc(enquiry)}</dd><dt>Vehicle</dt><dd>${esc(vehicle)}</dd><dt>Details</dt><dd>${esc(details)}</dd><dt>Status</dt><dd>${esc(status)}</dd><dt>When</dt><dd>${fmtDate(date)}</dd>`
    });
  }).join('');
}

function renderTimesheet(rows){
  const el=document.getElementById('timesheetList');
  if(!rows.length){el.innerHTML='<div class="empty">No timesheet entries in sheet</div>';return;}
  el.innerHTML=[...rows].reverse().map(t=>{
    const staff=gf(t,'Staff Name','staffName','name');
    const date=gf(t,'Date','date');
    const hrs=gf(t,'Hours Worked','hours');
    const pay=gf(t,'Day Pay','dayPay');
    const jobr=gf(t,'Job Ref','jobRef');
    return card({
      code:fmtDate(date), name:staff, meta:jobr, line:`${esc(hrs)} hrs · ${pay?fmt(pay):'—'}`, status:'Entry',
      details:`<dt>Staff</dt><dd>${esc(staff)}</dd><dt>Date</dt><dd>${fmtDate(date)}</dd><dt>Hours</dt><dd>${esc(hrs)}</dd><dt>Day pay</dt><dd>${pay?fmt(pay):'—'}</dd><dt>Job ref</dt><dd>${esc(jobr)||'—'}</dd>`
    });
  }).join('');
}

function renderStock(rows){
  const body=document.getElementById('stockBody');
  if(!rows.length){body.innerHTML='<tr><td colspan="5" class="empty">No parts in sheet</td></tr>';return;}
  body.innerHTML=rows.map(s=>{
    const name=gf(s,'Part Name','partName','name');
    const cat=gf(s,'Category','category');
    const level=gf(s,'Stock Level','StockLevel','qty');
    const reorder=gf(s,'Reorder Level','reorderLevel');
    const range=gf(s,'Price Range','priceRange');
    return `<tr><td>${esc(name)}</td><td>${esc(cat)}</td><td class="mono">${esc(level)}</td><td class="mono">${esc(reorder)}</td><td class="mono">${esc(range)}</td></tr>`;
  }).join('');
}

function updateStats({jobs,quotes,invoices,leads,stock,timesheet}){
  const openJobs=(jobs||[]).filter(j=>!isClosed(gf(j,'Status','status')));
  const unpaid=(invoices||[]).filter(i=>{const s=gf(i,'Status','status').toLowerCase();return s==='outstanding'||s==='overdue';});
  const unpaidTotal=unpaid.reduce((sum,i)=>sum+(parseFloat(String(gf(i,'Total','total')).replace(/[^0-9.]/g,''))||0),0);
  const newLeads=(leads||[]).filter(l=>{const s=gf(l,'Status','status').toLowerCase();return s==='new'||s==='';});
  const low=(stock||[]).filter(s=>{
    const level=parseInt(gf(s,'Stock Level','StockLevel','qty'))||0;
    const reorder=parseInt(gf(s,'Reorder Level','reorderLevel'))||0;
    return level<=reorder;
  });
  const weekStart=new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay()+1);
  const weekEntries=(timesheet||[]).filter(t=>{
    const raw=String(gf(t,'Date','date'));
    const d=raw.match(/^(\d{4}-\d{2}-\d{2})/) ? raw.slice(0,10) : raw;
    return sheetDate(d)>=weekStart;
  });
  const weekHours=weekEntries.reduce((s,t)=>s+(parseFloat(String(gf(t,'Hours Worked','hours')).replace(/[^0-9.]/g,''))||0),0);
  document.getElementById('statJobs').textContent=openJobs.length;
  document.getElementById('statQuotes').textContent=(quotes||[]).length;
  document.getElementById('statInvoices').textContent=unpaidTotal>0?fmt(unpaidTotal):String(unpaid.length);
  document.getElementById('statLeads').textContent=newLeads.length;
  document.getElementById('statTimesheetHours').textContent=weekHours.toFixed(1);
  document.getElementById('statLowStock').textContent=low.length;
  document.getElementById('subJobs').textContent=`${openJobs.length} open · Job Bookings`;
  document.getElementById('subQuotes').textContent=`${(quotes||[]).length} rows · Quotes`;
  document.getElementById('subInvoices').textContent=`${unpaid.length} unpaid · Invoices`;
  document.getElementById('subLeads').textContent=`${newLeads.length} new · Leads`;
  document.getElementById('subTimesheetHours').textContent=`${weekEntries.length} shifts · Timesheet`;
  document.getElementById('subLowStock').textContent=`at/below reorder · Parts & Stock`;
}

const loaded = {};
async function loadModule(key, {force=false, silent=false}={}){
  if(loaded[key] && !force) return loaded[key];
  if(!silent){
    document.getElementById('loadingOverlay').classList.add('show');
    document.getElementById('loadingText').textContent=`Loading ${SHEET[key]} from Google Sheets…`;
  }
  try{
    const rows = await fetchTab(SHEET[key]);
    loaded[key]=rows;
    if(key==='quotes') renderQuotes(rows);
    if(key==='invoices') renderInvoices(rows);
    if(key==='jobs') renderJobs(rows);
    if(key==='leads') renderLeads(rows);
    if(key==='timesheets') renderTimesheet(rows);
    if(key==='stock') renderStock(rows);
    bindExpand(document);
    return rows;
  } finally {
    if(!silent) document.getElementById('loadingOverlay').classList.remove('show');
  }
}

async function refreshAll(silent){
  const banner=document.getElementById('errorBanner');
  banner.classList.remove('show');
  if(!silent){
    document.getElementById('loadingOverlay').classList.add('show');
    document.getElementById('loadingText').textContent='Refreshing all tabs from Google Sheets…';
  }
  try{
    const keys=['quotes','invoices','jobs','stock','timesheets','leads'];
    const results=await Promise.allSettled(keys.map(k=>fetchTab(SHEET[k])));
    results.forEach((r,i)=>{
      const key=keys[i];
      if(r.status==='fulfilled'){
        loaded[key]=r.value;
        if(key==='quotes') renderQuotes(r.value);
        if(key==='invoices') renderInvoices(r.value);
        if(key==='jobs') renderJobs(r.value);
        if(key==='leads') renderLeads(r.value);
        if(key==='timesheets') renderTimesheet(r.value);
        if(key==='stock') renderStock(r.value);
      } else {
        console.warn(key, r.reason);
      }
    });
    updateStats(loaded);
    bindExpand(document);
    document.getElementById('lastRefresh').textContent=`Live from Google Sheets · ${new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}`;
  } catch(err){
    banner.textContent=`Could not load sheets: ${err.message}`;
    banner.classList.add('show');
  } finally {
    document.getElementById('loadingOverlay').classList.remove('show');
  }
}

document.querySelector('.tabs').addEventListener('click', async (e)=>{
  const btn=e.target.closest('.tab'); if(!btn) return;
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected', t===btn?'true':'false'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id===btn.dataset.tab));
  // Always re-fetch live when opening a tab (no stale cache for expanded module)
  try{
    await loadModule(btn.dataset.tab, {force:true, silent:false});
    updateStats(loaded);
    document.getElementById('lastRefresh').textContent=`Live ${SHEET[btn.dataset.tab]} · ${new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}`;
  }catch(err){
    const banner=document.getElementById('errorBanner');
    banner.textContent=`Could not load ${SHEET[btn.dataset.tab]}: ${err.message}`;
    banner.classList.add('show');
  }
});

/* ---------- speed overlay ---------- */
/* Speed overlay: paint cache first; always refresh live. Cache (sessionStorage) is fallback only. */
(function(){
  if(window.__nexDashFast) return; window.__nexDashFast=1;
  const STORAGE_KEY='nexos_pe_dash_v1', FETCH_TIMEOUT_MS=12000, AUTO_REFRESH_MS=180000;
  const TAB_KEYS=['quotes','invoices','jobs','stock','timesheets','leads'];
  const loadedAt={}; let refreshInFlight=0;
  function showChip(on){const c=document.getElementById('refreshChip'); if(!c) return; c.hidden=!on; c.classList.toggle('show',!!on);}
  function beginRefresh(){refreshInFlight++; showChip(true);}
  function endRefresh(){refreshInFlight=Math.max(0,refreshInFlight-1); if(!refreshInFlight) showChip(false);}
  function fmtTime(ts){try{return new Date(ts).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});}catch{return '—';}}
  function saveCache(){try{const tabs={}; TAB_KEYS.forEach(k=>{if(window.loaded&&loaded[k])tabs[k]=loaded[k];}); const ts=Math.max(0,...Object.values(loadedAt).filter(Boolean)); sessionStorage.setItem(STORAGE_KEY,JSON.stringify({ts:ts||Date.now(),tabs}));}catch(e){}}
  function readCache(){try{const raw=sessionStorage.getItem(STORAGE_KEY); if(!raw)return null; const d=JSON.parse(raw); return (d&&d.tabs)?d:null;}catch(e){return null;}}
  const _fetchTab=window.fetchTab;
  window.fetchTab=async function(tab){
    let lastErr;
    for(let attempt=0; attempt<2; attempt++){
      try{ return await nexFeedTab(tab, FETCH_TIMEOUT_MS); }
      catch(err){ lastErr=err; if(err&&err.final) break; }
    }
    throw lastErr||new Error('Failed '+tab);
  };
  const _refreshAll=window.refreshAll;
  window.refreshAll=async function(force){
    const banner=document.getElementById('errorBanner'); if(banner) banner.classList.remove('show');
    beginRefresh();
    try{
      await Promise.allSettled(TAB_KEYS.map(async (key)=>{
        try{
          const rows=await fetchTab(SHEET[key]);
          loaded[key]=rows; loadedAt[key]=Date.now();
          if(key==='quotes') renderQuotes(rows);
          if(key==='invoices') renderInvoices(rows);
          if(key==='jobs') renderJobs(rows);
          if(key==='leads') renderLeads(rows);
          if(key==='timesheets') renderTimesheet(rows);
          if(key==='stock') renderStock(rows);
          updateStats(loaded); bindExpand(document); saveCache();
          document.getElementById('lastRefresh').textContent='Live from Google Sheets · '+fmtTime(Date.now());
        }catch(err){ console.warn(key, err); }
      }));
    } finally { endRefresh(); }
  };
  const cached=nexAuthed()?readCache():null;
  if(cached&&cached.tabs){
    TAB_KEYS.forEach(key=>{
      if(Array.isArray(cached.tabs[key])){
        loaded[key]=cached.tabs[key]; loadedAt[key]=cached.ts||Date.now();
        if(key==='quotes') renderQuotes(loaded[key]);
        if(key==='invoices') renderInvoices(loaded[key]);
        if(key==='jobs') renderJobs(loaded[key]);
        if(key==='leads') renderLeads(loaded[key]);
        if(key==='timesheets') renderTimesheet(loaded[key]);
        if(key==='stock') renderStock(loaded[key]);
      }
    });
    updateStats(loaded); bindExpand(document);
    document.getElementById('lastRefresh').textContent='Cached · Updated '+fmtTime(cached.ts||Date.now());
  }
  setInterval(()=>{ if(document.visibilityState==='visible' && nexAuthed()) refreshAll(true); }, AUTO_REFRESH_MS);
  window.onload=function(){ if(nexAuthed()) refreshAll(true); };
  if(document.readyState==='complete' && nexAuthed()) refreshAll(true);
})();

/* Usage panel (display-only, client view). Reads sheet tab "Usage" from the same feed (PIN session). Live load every
   refresh; sessionStorage cache is only a fallback when live fails. A missing tab shows "unavailable", never an error.
   Top-ups: one pack adds +250 chats AND +50 jobs. Limits come from the Usage tab. */
(function(){
  if(window.__nexUsage) return; window.__nexUsage=1;
  var TIMEOUT_MS=12000, TZ='Africa/Johannesburg';
  var TABS={usage:'Usage'};
  var CACHE={usage:'nexos_pe_usage_v1'};
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
  function level(p){ return isNaN(p)?'':(p>=100?'red':(p>=80?'amber':'')); }
  function plural(n,w){ return n+' '+w+(n===1?'':'s'); }
  function fmtTime(ts){ try{ return new Date(ts).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return '—'; } }
  /* ---------- per-workshop usage (used, limits and owed all from the Usage tab) ---------- */
  function usageFor(r){
    var cu=num(get(r,'Chats Used')), ju=num(get(r,'Jobs Used'));
    var tabCl=num(get(r,'Chats Limit')), tabJl=num(get(r,'Jobs Limit')), tabOwed=num(get(r,'Top-up Amount Owed'));
    var v={shop:get(r,'Workshop'), mgr:get(r,'Manager Number'), cu:cu, ju:ju};
    v.cl=isNaN(tabCl)?INCL_CHATS:tabCl; v.jl=isNaN(tabJl)?INCL_JOBS:tabJl;
    v.packs=Math.max(0,Math.round((v.cl-INCL_CHATS)/PACK_CHATS)); v.rand=isNaN(tabOwed)?v.packs*PACK_PRICE:tabOwed;
    v.cp=(!isNaN(cu)&&v.cl>0)?cu/v.cl*100:NaN; v.jp=(!isNaN(ju)&&v.jl>0)?ju/v.jl*100:NaN;
    v.worst=Math.max(isNaN(v.cp)?0:v.cp, isNaN(v.jp)?0:v.jp);
    return v;
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

  function renderUsage(state,ym){
    var list=$('usageList'); if(!list) return;
    var st=state.usage;
    $('usageMonth').textContent=monthLabel(ym);
    var src=$('usageSrc');
    if(!st.rows){ list.innerHTML=unavailableHtml({title:'Usage data unavailable', sub:st.reason}); if(src) src.textContent='Sheet → Usage'; return; }
    var mine=rowsForMonth(st.rows,ym);
    if(!mine.length) list.innerHTML='<div class="empty">No usage rows for '+esc(monthLabel(ym))+' yet.</div>';
    else list.innerHTML=mine.map(function(r){
      var u=usageFor(r), lv=level(u.worst);
      var pill=lv==='red'?'<span class="pill bad">Over limit · top up</span>':(lv==='amber'?'<span class="pill warn">80%+ used</span>':'<span class="pill ok">OK</span>');
      var tu=u.packs?(plural(u.packs,'top-up pack')+' (+'+(PACK_CHATS*u.packs).toLocaleString('en-ZA')+' chats, +'+(PACK_JOBS*u.packs).toLocaleString('en-ZA')+' jobs)'):'0 top-up packs';
      return '<article class="u-card'+(lv?' u-card-'+lv:'')+'">'+
        '<div class="top"><div><div class="name" style="margin-top:0">'+(esc(u.shop)||'—')+'</div>'+'<div class="meta">Workshop account · all client chats counted</div>'+'</div>'+pill+'</div>'+
        bar('AI chats',u.cu,u.cl,u.cp)+bar('Jobs',u.ju,u.jl,u.jp)+
        '<div class="u-foot"><span>Top-ups this month: '+esc(tu)+'</span><span class="u-owed">Top-ups owed: <b>'+rands(u.rand)+'</b></span></div>'+
        (lv==='red'?'<div class="u-soft">Soft limit — the AI keeps replying. To top up, send TOPUP on WhatsApp: one top-up pack adds +250 chats and +50 jobs, one charge on the next invoice.</div>':'')+
      '</article>';
    }).join('');
    if(src) src.textContent='Sheet → Usage · '+st.note;
  }

  /* ---------- loading ---------- */
  function readCache(k){ try{ var d=JSON.parse(sessionStorage.getItem(CACHE[k])||'null'); return (d&&Array.isArray(d.rows))?d:null; }catch(e){ return null; } }
  function saveCache(k,rows){ try{ sessionStorage.setItem(CACHE[k],JSON.stringify({ts:Date.now(),rows:rows})); }catch(e){} }

  async function fetchRows(tab){
    var lastErr;
    for(var attempt=0; attempt<2; attempt++){
      try{
        var data=await nexFeedTab(tab, TIMEOUT_MS);
        return data.filter(function(r){ return Object.keys(r).some(function(k){ return k!=='__row' && r[k]!=='' && r[k]!=null; }); });
      }catch(err){ lastErr=err; if(err&&err.final) break; }
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
    if(!$('usageList') || !nexAuthed()) return Promise.resolve();
    if(inFlight) return inFlight;
    lastLoad=Date.now();
    inFlight=(async function(){
      try{
        var ym=currentMonth(), state={usage:await loadOne('usage')};
        try{ renderUsage(state,ym); }catch(e){ console.warn('usage render',e); }
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
if(window.__nexUsageHook) window.__nexUsageHook();
