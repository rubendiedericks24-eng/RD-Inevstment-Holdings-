const SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzcv7Cbp_JeBZiCUTCWVEDkV6BvO4d3tDz8ivx-HR5qHos-xTROolb8F146G2SCyUPk/exec';
const SHEET = {
  quotes: 'Quotes',
  invoices: 'Invoices',
  jobs: 'Job Bookings',
  stock: 'Parts & Stock',
  timesheets: 'Timesheet',
  leads: 'Leads'
};
const CLOSED = ['done','complete','completed','cancelled','canceled','closed','paid'];

function esc(s){return String(s??'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');}
function gf(obj,...keys){
  for(const k of keys){
    const found = Object.keys(obj||{}).find(h => h.toLowerCase().trim() === k.toLowerCase());
    if(found && obj[found] !== '' && obj[found] != null) return obj[found];
  }
  return '';
}
function fmt(v){const n=parseFloat(String(v).replace(/[^0-9.]/g,''))||0;return 'R'+n.toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtDate(d){if(!d)return '—';try{const dt=new Date(d);if(isNaN(dt))return esc(d);return dt.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});}catch{return esc(d);}}
function isClosed(s){return CLOSED.includes(String(s||'').toLowerCase().trim());}
function pillClass(status){
  const s=String(status||'').toLowerCase();
  if(['accepted','done','paid','new','ok'].includes(s)) return 'ok';
  if(['outstanding','open','pending','sent'].includes(s)) return 'warn';
  if(['overdue','declined','cancelled'].includes(s)) return 'bad';
  return 'info';
}
async function fetchTab(tab){
  const url = `${SHEETS_SCRIPT_URL}?tab=${encodeURIComponent(tab)}&key=NexOS-PE&_=${Date.now()}`;
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error(`Failed ${tab}: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.filter(r => Object.values(r).some(v => v!=='' && v!=null)) : [];
}

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
    return new Date(d)>=weekStart;
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

const NEX_GATE_KEY='nexagent_pe_gate_v1';
const NEX_GATE_PW='NexOS-PE';
function nexUnlocked(){try{return sessionStorage.getItem(NEX_GATE_KEY)==='1';}catch(e){return false;}}
function nexUnlock(e){
  e.preventDefault();
  const v=(document.getElementById('nexGatePw').value||'').trim();
  if(v===NEX_GATE_PW){sessionStorage.setItem(NEX_GATE_KEY,'1');document.getElementById('nexGate').classList.add('ok');}
  else document.getElementById('nexGateErr').textContent='Wrong password';
  return false;
}
if(nexUnlocked()) document.getElementById('nexGate').classList.add('ok');
window.onload = () => refreshAll(false);
