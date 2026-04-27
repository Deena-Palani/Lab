// ========== PRODUCTION COUNTER ==========
function getProdConfig() { return JSON.parse(localStorage.getItem(userKey('prodCfg'))||'{"target":40}'); }
function getProdDay(key) { return JSON.parse(localStorage.getItem(userKey('prod_'+key))||'{"count":0,"special":0,"ratio":"1:1"}'); }

window.saveProdConfig = function() {
    let t = parseInt(document.getElementById('prod-target').value)||40;
    if(t<35) t=35; if(t>45) t=45;
    document.getElementById('prod-target').value = t;
    localStorage.setItem(userKey('prodCfg'), JSON.stringify({target:t}));
    updateProdUI();
};

window.saveProdToday = function() {
    const cfg = getProdConfig();
    let count = parseInt(document.getElementById('prod-achieved').value)||0;
    let special = parseInt(document.getElementById('prod-special').value)||0;
    const ratio = document.getElementById('prod-ratio').value||'1:1';
    const maxNormal = Math.floor(cfg.target * 2.5);
    if(count > maxNormal) { count = maxNormal; document.getElementById('prod-achieved').value = count; }
    if(special > 300) { special = 300; document.getElementById('prod-special').value = special; }
    localStorage.setItem(userKey('prod_'+todayKey()), JSON.stringify({count, special, ratio}));
    updateProdUI();
};

function parseRatio(r) {
    const p = (r||'1:1').split(':'); const a = parseInt(p[0])||1, b = parseInt(p[1])||1;
    return a / b;
}

function getEffective(day) {
    return day.count + Math.round(day.special * parseRatio(day.ratio));
}

function updateProdUI() {
    const cfg = getProdConfig();
    const today = getProdDay(todayKey());
    const eff = getEffective(today);
    const perc = Math.min(Math.round((eff/cfg.target)*100), 250);
    document.getElementById('prod-text').textContent = `${eff} / ${cfg.target}`;
    document.getElementById('prod-fill').style.width = Math.min(perc,100)+'%';
    document.getElementById('prod-perc').textContent = perc+'%';
    // Yesterday
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    const yData = getProdDay(getDateKey(yd));
    document.getElementById('prod-yesterday').textContent = getEffective(yData);
    // Week
    const now = new Date(); const dow = now.getDay()||7;
    let wTarget=0, wAch=0;
    for(let i=1;i<=dow;i++) { const d=new Date(now); d.setDate(now.getDate()-(dow-i)); wTarget+=cfg.target; wAch+=getEffective(getProdDay(getDateKey(d))); }
    document.getElementById('prod-week-target').textContent = wTarget;
    document.getElementById('prod-week-achieved').textContent = wAch;
    document.getElementById('prod-week-deficit').textContent = Math.max(0, wTarget-wAch);
    // Month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    let mAch=0, workDays=0;
    for(let i=1;i<=daysInMonth;i++) {
        const d=new Date(now.getFullYear(), now.getMonth(), i);
        if(d.getDay()!==0 && d.getDay()!==6) workDays++;
        if(i<=now.getDate()) mAch+=getEffective(getProdDay(getDateKey(d)));
    }
    document.getElementById('prod-month-target').textContent = workDays*cfg.target;
    document.getElementById('prod-month-achieved').textContent = mAch;
    document.getElementById('prod-month-deficit').textContent = Math.max(0, workDays*cfg.target - mAch);
    renderProdHistory();
}

function loadProdData() {
    const cfg = getProdConfig();
    document.getElementById('prod-target').value = cfg.target;
    const today = getProdDay(todayKey());
    document.getElementById('prod-achieved').value = today.count;
    document.getElementById('prod-special').value = today.special;
    document.getElementById('prod-ratio').value = today.ratio;
    updateProdUI();
}

window.renderProdHistory = function() {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const el = document.getElementById('prod-history');
    let html = '';
    for(let i=1;i<=daysInMonth;i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        const data = getProdDay(getDateKey(d));
        const eff = getEffective(data);
        const isToday = i===now.getDate();
        html += `<div class="prod-day-cell" style="${isToday?'border-color:var(--accent-primary);':''}"><div class="day-date">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div><div class="day-num">${eff}</div></div>`;
    }
    el.innerHTML = html;
};

// Downtime
window.saveDowntime = function() {
    const ticket = document.getElementById('dt-ticket').value.trim();
    const reason = document.getElementById('dt-reason').value.trim();
    if(!ticket||!reason) return;
    const list = JSON.parse(localStorage.getItem(userKey('dt_'+todayKey()))||'[]');
    list.push({ticket, reason, time: new Date().toLocaleTimeString()});
    localStorage.setItem(userKey('dt_'+todayKey()), JSON.stringify(list));
    document.getElementById('dt-ticket').value=''; document.getElementById('dt-reason').value='';
    renderDowntimeList(); toast('Downtime logged');
};

window.renderDowntimeList = function() {
    const list = JSON.parse(localStorage.getItem(userKey('dt_'+todayKey()))||'[]');
    const el = document.getElementById('dt-list');
    if(!list.length) { el.innerHTML='<p class="muted">No downtime logged today.</p>'; return; }
    el.innerHTML = list.map(d => `<div class="break-item"><span><strong>${d.ticket}</strong> — ${d.reason}</span><span class="muted">${d.time}</span></div>`).join('');
};

// ========== TIME TRACKER ==========
const TARGET_WORK = 29700, TARGET_BREAK = 4500;
let timerInterval=null, breakInterval=null, currentSec=0, currentBreakSec=0, thisBreakSec=0, breaksList=[], timerState='OUT';

function formatT(s) { if(s<0)s=0; return `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; }
function formatTShort(s) { if(s<0)s=0; return `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}`; }

async function logTimeEvent(type, reason = '') {
    try {
        await apiCall('/time/event', 'POST', {
            eventType: type,
            timestamp: new Date().toISOString(),
            reason: reason
        });
    } catch(e) {
        console.error("Failed to log time event", e);
    }
}

function saveTimeState() {
    const state = {timerState, currentSec, currentBreakSec, breaksList, punchInTime: localStorage.getItem(userKey('punchIn'))};
    localStorage.setItem(userKey('timeState_'+todayKey()), JSON.stringify(state));
}

function loadTimeData() {
    const saved = JSON.parse(localStorage.getItem(userKey('timeState_'+todayKey()))||'null');
    if(saved) {
        currentSec=saved.currentSec||0; currentBreakSec=saved.currentBreakSec||0;
        breaksList=saved.breaksList||[]; timerState=saved.timerState||'OUT';
        updateTimerDisp(); renderBreaks();
        if(timerState==='WORK') {
            document.getElementById('btn-punch-in').disabled=true;
            document.getElementById('btn-break').disabled=false;
            document.getElementById('btn-punch-out').disabled=false;
            document.getElementById('timer-status').textContent='Working';
            timerInterval=setInterval(tick,1000);
        }
    }
}

function updateTimerDisp() {
    document.getElementById('timer-display').textContent=formatT(currentSec);
    document.getElementById('time-left').textContent=formatT(TARGET_WORK-currentSec);
    document.getElementById('break-left').textContent=formatT(TARGET_BREAK-currentBreakSec);
}

function tick() { currentSec++; updateTimerDisp(); if(currentSec%30===0) saveTimeState(); }
function tickBreak() { currentBreakSec++; thisBreakSec++; document.getElementById('break-left').textContent=formatT(TARGET_BREAK-currentBreakSec); document.getElementById('timer-status').textContent=`On Break (${formatT(thisBreakSec)})`; }

function renderBreaks() {
    document.getElementById('break-count').textContent=breaksList.length;
    const el=document.getElementById('break-list');
    if(!breaksList.length) { el.innerHTML='<p class="muted">No breaks yet.</p>'; return; }
    el.innerHTML=breaksList.map((b,i)=>`<div class="break-item"><span><strong>#${i+1}</strong> ${b.reason}</span><span>${b.duration}</span></div>`).join('');
}

const btnPI=document.getElementById('btn-punch-in'), btnBr=document.getElementById('btn-break'), btnPO=document.getElementById('btn-punch-out');

if (btnPI) btnPI.addEventListener('click', async ()=>{
    timerState='WORK'; document.getElementById('timer-status').textContent='Working';
    btnPI.disabled=true; btnBr.disabled=false; btnPO.disabled=false;
    localStorage.setItem(userKey('punchIn'), new Date().toISOString());
    timerInterval=setInterval(tick,1000); 
    saveTimeState();
    await logTimeEvent('LOGIN');
});

if (btnBr) btnBr.addEventListener('click', async ()=>{
    if(timerState!=='WORK') return;
    timerState='BREAK'; clearInterval(timerInterval); timerInterval=null;
    thisBreakSec=0; breakInterval=setInterval(tickBreak,1000);
    document.getElementById('timer-status').textContent='On Break (00:00:00)';
    btnPO.disabled=true; btnBr.disabled=true;
    document.getElementById('break-reason-container').style.display='block';
    saveTimeState();
    await logTimeEvent('BREAK_START');
});

const btnSubmitBreak = document.getElementById('btn-submit-break');
if (btnSubmitBreak) btnSubmitBreak.addEventListener('click', async ()=>{
    const reason=document.getElementById('break-reason').value.trim();
    if(!reason){alert('Please provide a reason.');return;}
    clearInterval(breakInterval); breakInterval=null;
    breaksList.push({reason, duration:formatT(thisBreakSec)});
    renderBreaks(); timerState='WORK';
    document.getElementById('timer-status').textContent='Working';
    document.getElementById('break-reason-container').style.display='none';
    document.getElementById('break-reason').value='';
    btnPO.disabled=false; btnBr.disabled=false;
    timerInterval=setInterval(tick,1000); 
    saveTimeState();
    await logTimeEvent('BREAK_END', reason);
});

if (btnPO) btnPO.addEventListener('click', async ()=>{
    timerState='OUT'; clearInterval(timerInterval); timerInterval=null;
    saveTimeState(); updateTimeSummary();
    document.getElementById('timer-status').textContent='Clocked Out';
    btnPI.disabled=false; btnBr.disabled=true; btnPO.disabled=true;
    await logTimeEvent('LOGOUT');
});

function updateTimeSummary() {
    const todayState = JSON.parse(localStorage.getItem(userKey('timeState_'+todayKey()))||'null');
    document.getElementById('ts-today').textContent = formatTShort(todayState?todayState.currentSec:currentSec);
    const yd=new Date(); yd.setDate(yd.getDate()-1);
    const ydState = JSON.parse(localStorage.getItem(userKey('timeState_'+getDateKey(yd)))||'null');
    document.getElementById('ts-yesterday').textContent = formatTShort(ydState?ydState.currentSec:0);
    // Week
    const now=new Date(); const dow=now.getDay()||7; let wSec=0;
    for(let i=1;i<=dow;i++){const d=new Date(now);d.setDate(now.getDate()-(dow-i));const s=JSON.parse(localStorage.getItem(userKey('timeState_'+getDateKey(d)))||'null');if(s)wSec+=s.currentSec;}
    document.getElementById('ts-week').textContent=formatTShort(wSec);
    // Month
    const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(); let mSec=0;
    for(let i=1;i<=dim;i++){const d=new Date(now.getFullYear(),now.getMonth(),i);const s=JSON.parse(localStorage.getItem(userKey('timeState_'+getDateKey(d)))||'null');if(s)mSec+=s.currentSec;}
    document.getElementById('ts-month').textContent=formatTShort(mSec);
}

window.loadTimeHistory = function() {
    const sel=document.getElementById('time-history-select').value;
    const el=document.getElementById('time-history-detail');
    const now=new Date(); let dates=[];
    if(sel==='today') dates=[todayKey()];
    else if(sel==='yesterday'){const d=new Date();d.setDate(d.getDate()-1);dates=[getDateKey(d)];}
    else if(sel==='week'){const dow=now.getDay()||7;for(let i=1;i<=dow;i++){const d=new Date(now);d.setDate(now.getDate()-(dow-i));dates.push(getDateKey(d));}}
    else{const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();for(let i=1;i<=dim;i++)dates.push(getDateKey(new Date(now.getFullYear(),now.getMonth(),i)));}
    let html='';
    dates.forEach(dk=>{
        const s=JSON.parse(localStorage.getItem(userKey('timeState_'+dk))||'null');
        if(s){
            html+=`<div class="time-history-item"><strong>${dk}</strong> — Worked: ${formatTShort(s.currentSec)} | Break: ${formatTShort(s.currentBreakSec)} | Breaks: ${(s.breaksList||[]).length}</div>`;
        }
    });
    el.innerHTML=html||'<p class="muted">No data for selected period.</p>';
};

// ========== JULIAN CALCULATOR ==========
window.fromJulian = function() {
    const jul=document.getElementById('julian-day').value;
    const year=parseInt(document.getElementById('julian-year').value);
    const format=document.getElementById('julian-format').value;
    const box=document.getElementById('julian-result1');
    if(!jul)return;
    const d=new Date(year,0,parseInt(jul));
    box.style.display='flex'; box.innerHTML=copyableResult(formatDateOutput(d,format));
};

window.toJulian = function() {
    const std=document.getElementById('julian-standard').value;
    const box=document.getElementById('julian-result2');
    if(!std)return;
    const d=new Date(std); if(isNaN(d.getTime()))return;
    const start=new Date(d.getFullYear(),0,0);
    const diff=(d-start)+((start.getTimezoneOffset()-d.getTimezoneOffset())*60000);
    const day=Math.floor(diff/86400000);
    box.style.display='flex'; box.innerHTML=copyableResult(`${day.toString().padStart(3,'0')} (Year: ${d.getFullYear()})`);
};

const julRes1 = document.getElementById('julian-result1');
if (julRes1) julRes1.addEventListener('dblclick', function(){ const text=this.textContent.trim(); navigator.clipboard.writeText(text).then(()=>toast('Copied: '+text)); });
const julRes2 = document.getElementById('julian-result2');
if (julRes2) julRes2.addEventListener('dblclick', function(){ const text=this.textContent.trim(); navigator.clipboard.writeText(text).then(()=>toast('Copied: '+text)); });

// ========== APPEALS TRACKER (REFINED) ==========
document.querySelectorAll('.appeal-tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
        document.querySelectorAll('.appeal-tab-btn').forEach(b=>{b.classList.remove('active');b.classList.add('btn-secondary');b.classList.remove('btn-primary');});
        btn.classList.add('active'); btn.classList.remove('btn-secondary');
        document.querySelectorAll('.appeal-tab-content').forEach(c=>c.style.display='none');
        document.getElementById('appeal-tab-'+btn.dataset.tab).style.display='block';
    });
});

window.confirmSendAppeal = function() {
    const fin = document.getElementById('appeal-fin').value.trim();
    const user = document.getElementById('appeal-assign-to').value.trim();
    if (!fin || !user) { alert('Please enter FIN Number and Assign To username.'); return; }
    
    if (confirm(`ARE YOU SURE?\n\nYou are about to send Appeal FIN: ${fin} to ${user}.\nThis process is irreversible. Please double-check all details before proceeding.`)) {
        sendAppeal();
    }
};

window.sendAppeal = async function() {
    const finNumber = document.getElementById('appeal-fin').value.trim();
    const payer = document.getElementById('appeal-payer').value.trim();
    const dos = document.getElementById('appeal-dos').value.trim();
    const tflExpiry = document.getElementById('appeal-tfl-exp').value.trim();
    const billedAmount = parseFloat(document.getElementById('appeal-amount').value) || 0;
    const assignTo = document.getElementById('appeal-assign-to').value.trim();
    const notes = document.getElementById('appeal-notes').value.trim();
    const priority = document.getElementById('appeal-priority').value;

    try {
        await apiCall(`/appeals/send-to/${assignTo}`, 'POST', {
            finNumber, payer, dos, tflExpiry, billedAmount, notes, priority, status: 'PENDING'
        });
        ['appeal-fin','appeal-payer','appeal-dos','appeal-tfl-exp','appeal-amount','appeal-assign-to','appeal-notes'].forEach(id=>document.getElementById(id).value='');
        renderSentAppeals();
        toast('Appeal successfully dispatched to ' + assignTo);
    } catch (e) {
        toast('Error: ' + (e.message || 'Check if username exists'));
    }
};

window.renderSentAppeals = async function() {
    try {
        let appeals = await apiCall('/appeals/sent');
        appeals.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        const el = document.getElementById('sent-appeals-list');
        if (!appeals.length) { el.innerHTML = '<p class="muted">No appeals sent yet.</p>'; return; }
        
        // SENDER VIEW: Only show FIN and Receiver
        el.innerHTML = appeals.map(a => `
            <div class="appeal-item-detailed" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 800; color: var(--accent-primary);">FIN: ${a.finNumber}</div>
                    <div class="status-badge status-${a.status}">${a.status}</div>
                </div>
                <div style="font-size: 0.8rem; margin-top: 0.5rem;" class="muted">Receiver: <b>${a.receiverUsername}</b></div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
};

window.renderReceivedAppeals = async function() {
    try {
        let appeals = await apiCall('/appeals/received');
        const el = document.getElementById('received-appeals-list');
        if (!appeals.length) { el.innerHTML = '<p class="muted">No appeals assigned to you.</p>'; return; }
        
        // RECEIVER VIEW: Show all details
        el.innerHTML = appeals.map(a => {
            try {
                return renderAppealCardFull(a, true);
            } catch (e) {
                console.error("Error rendering appeal card:", e);
                return `<div class="appeal-item-detailed error">Error rendering appeal data for FIN: ${a.finNumber}</div>`;
            }
        }).join('');
    } catch(e) { console.error(e); }
};

function renderAppealCardFull(a, isReceiver) {
    const daysLeft = daysUntil(a.tflExpiry);
    const isUrgent = a.priority === 'URGENT' || a.priority === 'CRITICAL' || (daysLeft !== null && daysLeft < 15);
    
    let actionHtml = '';
    if (isReceiver && a.status !== 'COMPLETED' && a.status !== 'PAID' && a.status !== 'DENIED') {
        actionHtml = `
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color); display: flex; gap: 0.5rem;">
                <input type="text" id="tkt-${a.id}" placeholder="Ticket #" value="${a.ticketNumber || ''}" style="flex: 1; font-size: 0.8rem; padding: 0.4rem;">
                <select id="stat-${a.id}" class="select-sm">
                    <option value="WORKING" ${a.status==='WORKING'?'selected':''}>Working</option>
                    <option value="SENT" ${a.status==='SENT'?'selected':''}>Sent</option>
                    <option value="IN_PROCESS" ${a.status==='IN_PROCESS'?'selected':''}>In Process</option>
                    <option value="COMPLETED">Completed</option>
                </select>
                <button class="btn btn-primary btn-sm" onclick="updateAppealStatus('${a.id}')">Update</button>
            </div>
        `;
    }

    return `
        <div class="appeal-item-detailed">
            <div style="display: flex; justify-content: space-between;">
                <div style="font-size: 1.1rem; font-weight: 800; color: var(--accent-primary);">FIN: ${a.finNumber || 'N/A'}</div>
                <span class="status-badge status-${a.status}">${a.status}</span>
            </div>
            <div class="appeal-row-info">
                <div>Payer: <b>${a.payer || '--'}</b></div>
                <div>DOS: <b>${a.dos || '--'}</b></div>
                <div>TFL: <b style="${isUrgent?'color:var(--accent-danger)':''}">${a.tflExpiry || '--'}</b></div>
                <div>Amount: <b>$${(a.billedAmount || 0).toLocaleString()}</b></div>
            </div>
            <div style="margin-top: 0.75rem; font-size: 0.82rem; color: #cbd5e1;">Claim ID: ${a.claimId || '--'} | From: <b>${a.senderUsername}</b></div>
            ${a.notes ? `<div style="margin-top: 0.5rem; font-size: 0.82rem; color: #94a3b8; font-style: italic;">"${a.notes}"</div>` : ''}
            ${actionHtml}
        </div>
    `;
}

window.updateAppealStatus = async function(id) {
    const status = document.getElementById('stat-'+id).value;
    const ticketNumber = document.getElementById('tkt-'+id).value.trim();
    try {
        await apiCall(`/appeals/${id}/status`, 'PATCH', { status, ticketNumber });
        toast('Status updated!');
        renderReceivedAppeals();
    } catch(e) { toast('Update failed.'); }
};

window.checkAppealStatus = async function() {
    const fin = document.getElementById('status-fin').value.trim();
    const el = document.getElementById('appeal-status-result');
    if (!fin) { el.innerHTML = ''; return; }
    
    try {
        const a = await apiCall(`/appeals/status/${fin}`);
        const isSender = a.senderUsername === currentUser;
        
        el.innerHTML = `
            <div class="appeal-item-detailed" style="border-left: 4px solid var(--accent-primary); cursor: pointer;" onclick="toggleTrackingDetails()">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 1.2rem; font-weight: 800;">FIN: ${fin}</div>
                    <div class="status-badge status-${a.status}">${a.status}</div>
                </div>
                <div style="margin-top: 0.5rem; font-weight: 600; color: var(--accent-success);">
                    ${a.ticketNumber ? `Ticket: ${a.ticketNumber}` : 'Processing...'}
                </div>
                <div id="tracking-details" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <div class="appeal-row-info">
                        <div>Payer: <b>${a.payer || '--'}</b></div>
                        <div>DOS: <b>${a.dos || '--'}</b></div>
                        <div>Amount: <b>$${a.billedAmount}</b></div>
                        <div>Assigned: <b>${a.receiverUsername}</b></div>
                    </div>
                    ${isSender ? `
                        <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">SENDER ACTION: UPDATE FINAL OUTCOME</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-success btn-sm" style="flex: 1;" onclick="updateOutcome('${a.id}', 'PAID')">Mark as PAID</button>
                                <button class="btn btn-danger btn-sm" style="flex: 1;" onclick="updateOutcome('${a.id}', 'DENIED')">Mark as DENIED</button>
                                <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="updateOutcome('${a.id}', 'REVIEW')">Still in Review</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div id="expand-hint" style="text-align: center; font-size: 0.7rem; margin-top: 0.75rem;" class="muted">Click to view full details</div>
            </div>
        `;
    } catch(e) { el.innerHTML = '<p class="muted">No records found for FIN: ' + fin + '</p>'; }
};

window.toggleTrackingDetails = function() {
    const details = document.getElementById('tracking-details');
    const hint = document.getElementById('expand-hint');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        hint.textContent = 'Click to collapse';
    } else {
        details.style.display = 'none';
        hint.textContent = 'Click to view full details';
    }
};

window.updateOutcome = async function(id, status) {
    event.stopPropagation(); // Prevent card collapse
    if (!confirm(`Update appeal status to ${status}?`)) return;
    try {
        await apiCall(`/appeals/${id}/outcome`, 'PATCH', { status });
        toast('Outcome updated!');
        checkAppealStatus(); // Refresh view
    } catch(e) { toast('Failed to update outcome'); }
};

// ========== ADMIN PANEL (DEENA) ==========
window.loadPendingUsers = async function() {
    try {
        const users = await apiCall('/users/pending');
        const el = document.getElementById('pending-users-list');
        if (!users.length) { el.innerHTML = '<p class="muted">No pending approvals at this time.</p>'; return; }
        
        el.innerHTML = users.map(u => `
            <div class="admin-user-item">
                <div>
                    <div style="font-weight: 700;">${u.username}</div>
                    <div style="font-size: 0.8rem;" class="muted">Requested Role: ${u.role}</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-primary btn-sm" onclick="approveUser('${u.username}')">Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectUser('${u.username}')">Reject</button>
                </div>
            </div>
        `).join('');
    } catch(e) {
        console.error(e);
    }
};

window.approveUser = async function(username) {
    if (!confirm(`Approve access for ${username}?`)) return;
    try {
        await apiCall(`/users/approve/${username}`, 'POST');
        toast('User ' + username + ' approved!');
        loadPendingUsers();
    } catch(e) {
        toast('Error approving user');
    }
};

window.rejectUser = async function(username) {
    if (!confirm(`REJECT and DELETE registration request for ${username}?`)) return;
    try {
        await apiCall(`/users/reject/${username}`, 'DELETE');
        toast('User ' + username + ' rejected.');
        loadPendingUsers();
    } catch(e) {
        toast('Error rejecting user');
    }
};
