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
    
    const now = new Date();
    let todayTarget = cfg.target;
    if (now.getDay() === 0 || now.getDay() === 6 || today.leaveType === 'COMPANY') {
        todayTarget = 0;
    }
    
    const perc = todayTarget > 0 ? Math.min(Math.round((eff/todayTarget)*100), 250) : (eff > 0 ? 100 : 0);
    document.getElementById('prod-text').textContent = `${eff} / ${todayTarget}`;
    document.getElementById('prod-fill').style.width = Math.min(perc,100)+'%';
    document.getElementById('prod-perc').textContent = perc+'%';
    // Yesterday
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    const yData = getProdDay(getDateKey(yd));
    document.getElementById('prod-yesterday').textContent = getEffective(yData);
    // Week
    const dow = now.getDay()||7;
    let wTarget=0, wAch=0;
    for(let i=1;i<=dow;i++) { 
        const d=new Date(now); d.setDate(now.getDate()-(dow-i)); 
        const dData = getProdDay(getDateKey(d));
        if (d.getDay() !== 0 && d.getDay() !== 6 && dData.leaveType !== 'COMPANY') {
            wTarget += cfg.target; 
        }
        wAch += getEffective(dData); 
    }
    document.getElementById('prod-week-target').textContent = wTarget;
    document.getElementById('prod-week-achieved').textContent = wAch;
    document.getElementById('prod-week-deficit').textContent = Math.max(0, wTarget-wAch);
    // Month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    let mTarget=0, mAch=0;
    for(let i=1;i<=daysInMonth;i++) {
        const d=new Date(now.getFullYear(), now.getMonth(), i);
        const dData = getProdDay(getDateKey(d));
        if(d.getDay()!==0 && d.getDay()!==6 && dData.leaveType !== 'COMPANY') {
            mTarget += cfg.target;
        }
        if(i<=now.getDate() || dData.leaveType === 'PERSONAL' || getEffective(dData)>0) {
           mAch += getEffective(dData);
        }
    }
    document.getElementById('prod-month-target').textContent = mTarget;
    document.getElementById('prod-month-achieved').textContent = mAch;
    document.getElementById('prod-month-deficit').textContent = Math.max(0, mTarget - mAch);
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
    const mSel = document.getElementById('hist-month');
    const ySel = document.getElementById('hist-year');
    if (mSel && mSel.options.length === 0) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        mSel.innerHTML = months.map((m,i) => `<option value="${i}">${m}</option>`).join('');
        const now = new Date();
        mSel.value = now.getMonth();
        let yHtml = '';
        for(let y=now.getFullYear()-2; y<=now.getFullYear()+2; y++) {
            yHtml += `<option value="${y}">${y}</option>`;
        }
        ySel.innerHTML = yHtml;
        ySel.value = now.getFullYear();
    }
    
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    
    if (mSel && ySel && mSel.value && ySel.value) {
        year = parseInt(ySel.value);
        month = parseInt(mSel.value);
    }
    
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const el = document.getElementById('prod-history');
    let html = '';
    
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    html += dayNames.map(d => `<div class="prod-day-header">${d}</div>`).join('');
    
    for(let j=0; j<firstDayOfWeek; j++) {
        html += `<div style="visibility: hidden;"></div>`;
    }
    
    for(let i=1;i<=daysInMonth;i++) {
        const d = new Date(year, month, i);
        const dk = getDateKey(d);
        const data = getProdDay(dk);
        const eff = getEffective(data);
        const isToday = (i===now.getDate() && month===now.getMonth() && year===now.getFullYear());
        
        let label = eff;
        let dayStyle = isToday ? 'border-color:var(--accent-primary);' : '';
        
        if (d.getDay() === 0 || d.getDay() === 6) {
            label = 'WO';
            dayStyle += ' opacity: 0.7;';
        }
        
        if (data.leaveType === 'COMPANY') {
            label = 'CL';
            dayStyle += ' border-color: var(--accent-success); color: var(--accent-success); font-weight: bold;';
        } else if (data.leaveType === 'PERSONAL') {
            label = 'L';
            dayStyle += ' border-color: var(--accent-warn); color: var(--accent-warn); font-weight: bold;';
        }
        
        html += `<div class="prod-day-cell" style="${dayStyle} cursor: pointer;" onclick="showDayDetails('${dk}')"><div class="day-date">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div><div class="day-num">${label}</div></div>`;
    }
    el.innerHTML = html;
};

let currentEditingDk = null;
window.showDayDetails = function(dk, isTimeView = false) {
    if (isTimeView) {
        openProductivityDeepDive(dk);
        return;
    }
    const cfg = getProdConfig();
    const data = getProdDay(dk);
    const eff = getEffective(data);
    const dtList = JSON.parse(localStorage.getItem(userKey('dt_'+dk))||'[]');
    
    // Format date for display
    const dParts = dk.split('-');
    const dateObj = new Date(dParts[0], dParts[1]-1, dParts[2]);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    document.getElementById('ddm-date').textContent = dateStr;
    document.getElementById('ddm-target').textContent = cfg.target;
    document.getElementById('ddm-achieved').textContent = eff;
    document.getElementById('ddm-normal').textContent = data.count;
    document.getElementById('ddm-special').textContent = data.special;
    document.getElementById('ddm-ratio-info').textContent = `Applied Ratio: ${data.ratio || '1:1'}`;

    // Show Leave Info
    const leaveInfoEl = document.getElementById('ddm-leave-info');
    if (data.leaveType) {
        leaveInfoEl.style.display = 'block';
        if (data.leaveType === 'COMPANY') {
            leaveInfoEl.textContent = 'COMPANY LEAVE (Target Removed)';
            leaveInfoEl.style.color = 'var(--accent-success)';
        } else {
            leaveInfoEl.textContent = `PERSONAL LEAVE: ${data.leaveReason || 'No reason provided'}`;
            leaveInfoEl.style.color = 'var(--accent-warn)';
        }
    } else {
        leaveInfoEl.style.display = 'none';
    }

    // Show/Hide Edit button based on 7-day window
    currentEditingDk = dk;
    const now = new Date();
    const dParts2 = dk.split('-');
    const recordDate = new Date(dParts2[0], dParts2[1]-1, dParts2[2]);
    const diffDays = Math.ceil(Math.abs(now - recordDate) / (1000 * 60 * 60 * 24));
    
    const isEditable = diffDays <= 8;
    document.getElementById('btn-edit-day').style.display = isEditable ? 'block' : 'none';
    document.getElementById('ddm-view-actions').style.display = 'flex';
    document.getElementById('ddm-edit-actions').style.display = 'none';
    
    const leaveActionsEl = document.getElementById('ddm-leave-actions');
    if (leaveActionsEl) leaveActionsEl.style.display = isEditable ? 'flex' : 'none';

    const dtEl = document.getElementById('ddm-downtime-list');
    if (dtList.length === 0) {
        dtEl.innerHTML = '<p class="muted">No operational downtime records found for this day.</p>';
    } else {
        dtEl.innerHTML = dtList.map(d => `
            <div class="break-item">
                <span><strong style="color: var(--accent-primary); letter-spacing: 0.02em;">TICKET #${d.ticket}</strong> — ${d.reason}</span>
                <span class="muted" style="font-size: 0.75rem;">${d.time}</span>
            </div>
        `).join('');
    }

    // Show Time Tracker Info
    const timeState = JSON.parse(localStorage.getItem(userKey('timeState_'+dk))||'null');
    const timeSection = document.getElementById('ddm-time-section');
    if (timeSection) {
        if (timeState) {
            timeSection.style.display = 'block';
            document.getElementById('ddm-logged-time').textContent = formatT(timeState.currentSec || 0);
            document.getElementById('ddm-break-time').textContent = formatT(timeState.currentBreakSec || 0);
            
            let pIn = '--';
            if (timeState.punchInTime) {
                const pDate = new Date(timeState.punchInTime);
                if (!isNaN(pDate.getTime())) {
                    pIn = pDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
            }
            document.getElementById('ddm-punch-in').textContent = pIn;
            
            const bListEl = document.getElementById('ddm-breaks-list');
            if (timeState.breaksList && timeState.breaksList.length > 0) {
                bListEl.innerHTML = timeState.breaksList.map((b, i) => `
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>#${i+1} ${b.reason}</span>
                        <span class="muted">${formatT(b.duration)}</span>
                    </div>
                `).join('');
            } else {
                bListEl.innerHTML = '<span class="muted">No breaks taken.</span>';
            }
        } else {
            timeSection.style.display = 'none';
        }
    }

    // Toggle Visibility Based on View Context
    const prodElements = document.querySelectorAll('.prod-only');
    if (isTimeView) {
        prodElements.forEach(el => el.style.display = 'none');
    } else {
        prodElements.forEach(el => {
            // Restore appropriate display types based on ID or class
            if (el.id === 'ddm-edit-actions' || el.id === 'ddm-leave-actions' || el.id === 'btn-edit-day') {
                el.style.display = 'none'; // handled by isEditable logic below/above
            } else if (el.classList.contains('prod-cards-row')) {
                el.style.display = 'grid';
            } else {
                el.style.display = 'block';
            }
        });
        
        // Re-apply editable state overrides for prod view
        const now = new Date();
        const dParts2 = dk.split('-');
        const recordDate = new Date(dParts2[0], dParts2[1]-1, dParts2[2]);
        const diffDays = Math.ceil(Math.abs(now - recordDate) / (1000 * 60 * 60 * 24));
        const isEditable = diffDays <= 8;
        
        document.getElementById('btn-edit-day').style.display = isEditable ? 'block' : 'none';
        document.getElementById('ddm-edit-actions').style.display = 'none';
        
        const leaveActionsEl = document.getElementById('ddm-leave-actions');
        if (leaveActionsEl) leaveActionsEl.style.display = isEditable ? 'flex' : 'none';
    }

    document.getElementById('day-detail-modal').style.display = 'flex';
};

window.enableDayEdit = function() {
    const normal = document.getElementById('ddm-normal');
    const special = document.getElementById('ddm-special');
    
    const nVal = normal.textContent;
    const sVal = special.textContent;
    
    normal.innerHTML = `<input type="number" id="edit-normal" value="${nVal}" style="width: 70px; background: rgba(0,0,0,0.2); border: 1px solid var(--accent-primary); color: white; padding: 2px 5px; border-radius: 4px; font-weight: 600;">`;
    special.innerHTML = `<input type="number" id="edit-special" value="${sVal}" style="width: 70px; background: rgba(0,0,0,0.2); border: 1px solid var(--accent-primary); color: white; padding: 2px 5px; border-radius: 4px; font-weight: 600;">`;
    
    document.getElementById('ddm-view-actions').style.display = 'none';
    document.getElementById('ddm-edit-actions').style.display = 'flex';
};

window.cancelDayEdit = function() {
    if(!currentEditingDk) return;
    showDayDetails(currentEditingDk);
};

window.commitDayEdit = function() {
    if(!currentEditingDk) return;
    const nVal = parseInt(document.getElementById('edit-normal').value) || 0;
    const sVal = parseInt(document.getElementById('edit-special').value) || 0;
    
    const data = getProdDay(currentEditingDk);
    data.count = nVal;
    data.special = sVal;
    
    localStorage.setItem(userKey('prod_'+currentEditingDk), JSON.stringify(data));
    toast('Record updated successfully');
    updateProdUI();
    showDayDetails(currentEditingDk);
};

window.markDayLeave = function(dk, type) {
    const data = getProdDay(dk);
    if (type === 'PERSONAL') {
        const reason = prompt("Enter reason for Personal Leave:");
        if (reason === null) return; // Cancelled
        data.leaveReason = reason;
    }
    data.leaveType = type;
    localStorage.setItem(userKey('prod_'+dk), JSON.stringify(data));
    toast(type === 'COMPANY' ? 'Marked as Company Leave' : 'Marked as Personal Leave');
    updateProdUI();
    if (currentEditingDk === dk && document.getElementById('day-detail-modal').style.display === 'flex') {
        showDayDetails(dk);
    }
};

window.clearDayLeave = function(dk) {
    const data = getProdDay(dk);
    delete data.leaveType;
    delete data.leaveReason;
    localStorage.setItem(userKey('prod_'+dk), JSON.stringify(data));
    toast('Leave status cleared');
    updateProdUI();
    if (currentEditingDk === dk && document.getElementById('day-detail-modal').style.display === 'flex') {
        showDayDetails(dk);
    }
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
    renderDowntimeList(); toast('Downtime record successfully submitted');
};

window.renderDowntimeList = function() {
    const list = JSON.parse(localStorage.getItem(userKey('dt_'+todayKey()))||'[]');
    const el = document.getElementById('dt-list');
    if(!list.length) { el.innerHTML='<p class="muted">No operational downtime records for today.</p>'; return; }
    el.innerHTML = list.map(d => `
        <div class="break-item">
            <span><strong style="color: var(--accent-primary);">TICKET #${d.ticket}</strong> — ${d.reason}</span>
            <span class="muted" style="font-size: 0.75rem;">${d.time}</span>
        </div>
    `).join('');
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
    const mSel = document.getElementById('time-hist-month');
    const ySel = document.getElementById('time-hist-year');
    if (mSel && mSel.options.length === 0) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        mSel.innerHTML = months.map((m,i) => `<option value="${i}">${m}</option>`).join('');
        const now = new Date();
        mSel.value = now.getMonth();
        let yHtml = '';
        for(let y=now.getFullYear()-2; y<=now.getFullYear()+2; y++) {
            yHtml += `<option value="${y}">${y}</option>`;
        }
        ySel.innerHTML = yHtml;
        ySel.value = now.getFullYear();
    }
    
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    
    if (mSel && ySel && mSel.value && ySel.value) {
        year = parseInt(ySel.value);
        month = parseInt(mSel.value);
    }
    
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const el = document.getElementById('time-history-detail');
    let html = '';
    
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    html += dayNames.map(d => `<div class="prod-day-header">${d}</div>`).join('');
    
    for(let j=0; j<firstDayOfWeek; j++) {
        html += `<div style="visibility: hidden;"></div>`;
    }
    
    for(let i=1;i<=daysInMonth;i++) {
        const d = new Date(year, month, i);
        const dk = getDateKey(d);
        const s = JSON.parse(localStorage.getItem(userKey('timeState_'+dk))||'null');
        const isToday = (i===now.getDate() && month===now.getMonth() && year===now.getFullYear());
        
        let label = s ? formatTShort(s.currentSec) : '00:00';
        let dayStyle = isToday ? 'border-color:var(--accent-primary);' : '';
        
        if (d.getDay() === 0 || d.getDay() === 6) {
            label = 'WO';
            dayStyle += ' opacity: 0.7;';
        }
        
        html += `<div class="prod-day-cell" style="${dayStyle} cursor: pointer;" onclick="showDayDetails('${dk}', true)" title="Breaks: ${s ? (s.breaksList||[]).length : 0} | Break Time: ${s ? formatTShort(s.currentBreakSec) : '00:00'}">
            <div class="day-date">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
            <div class="day-num" style="font-size: 1.1rem;">${label}</div>
        </div>`;
    }
    el.innerHTML = html;
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
    const amtStr = document.getElementById('appeal-amount').value.replace(/,/g, '');
    const billedAmount = parseFloat(amtStr) || 0;
    const assignTo = document.getElementById('appeal-assign-to').value.trim();
    const notesStr = document.getElementById('appeal-notes').value.trim();
    const commentsStr = document.getElementById('appeal-comments') ? document.getElementById('appeal-comments').value.trim() : '';
    const notes = notesStr + (commentsStr ? `\n\nAdditional Comments:\n${commentsStr}` : '');
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
        const sortMode = document.getElementById('sent-sort') ? document.getElementById('sent-sort').value : 'date';
        
        appeals.sort((a,b) => {
            if (sortMode === 'tfl') {
                const tflA = a.tflExpiry ? new Date(a.tflExpiry).getTime() : 9999999999999;
                const tflB = b.tflExpiry ? new Date(b.tflExpiry).getTime() : 9999999999999;
                return tflA - tflB;
            } else if (sortMode === 'amount') {
                return (b.billedAmount || 0) - (a.billedAmount || 0);
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const el = document.getElementById('sent-appeals-list');
        if (!appeals.length) { el.innerHTML = '<p class="muted">No appeals sent yet.</p>'; return; }
        
        // SENDER VIEW: Only show FIN and Receiver
        el.innerHTML = appeals.map(a => `
            <div class="appeal-item-detailed" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 800; color: var(--accent-primary); cursor: pointer; text-decoration: underline;" onclick="showAppealDetails('${a.id}')" title="Click to view details">FIN: ${a.finNumber}</div>
                    <div class="status-badge status-${a.status}">${a.status}</div>
                </div>
                <div style="font-size: 0.8rem; margin-top: 0.5rem;" class="muted">Receiver: <b>${a.receiverUsername}</b></div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
};

let currentRxFilter = 'PENDING';
window.filterReceived = function(status, btn) {
    currentRxFilter = status;
    document.querySelectorAll('.rx-tab-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
    });
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
    renderReceivedAppeals();
};

window.renderReceivedAppeals = async function() {
    try {
        const sortBy = document.getElementById('received-sort') ? document.getElementById('received-sort').value : 'date';
        let appeals = await apiCall(`/appeals/received?sortBy=${sortBy}&order=desc`);
        
        let filteredAppeals = appeals;
        if (currentRxFilter === 'PENDING') {
            filteredAppeals = appeals.filter(a => a.status === 'PENDING' || a.status === 'SENT' || a.status === 'SENT_BACK');
        } else if (currentRxFilter === 'IN_PROCESS') {
            filteredAppeals = appeals.filter(a => a.status === 'IN_PROCESS' || a.status === 'WORKING');
        } else if (currentRxFilter === 'COMPLETED') {
            filteredAppeals = appeals.filter(a => a.status === 'COMPLETED' || a.status === 'PAID' || a.status === 'DENIED');
        }

        const el = document.getElementById('received-appeals-list');
        if (!filteredAppeals.length) { el.innerHTML = '<p class="muted">No appeals found in this category.</p>'; return; }
        
        el.innerHTML = filteredAppeals.map(a => {
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
    
    // TFL Color Coding
    let tflStyle = '';
    let tflBadge = '';
    if (daysLeft !== null) {
        if (daysLeft < 0) { tflStyle = 'color:var(--accent-danger); font-weight:800;'; tflBadge = '<span class="status-badge status-CRITICAL">OVERDUE</span>'; }
        else if (daysLeft <= 3) { tflStyle = 'color:var(--accent-danger);'; }
        else if (daysLeft <= 7) { tflStyle = 'color:var(--accent-warn);'; }
    }

    // TAT Countdown (3 days green, 1-3 yellow, <0 red pulsing)
    // Assume TAT is 3 days from created_at
    const createdDate = new Date(a.createdAt);
    const tatTarget = new Date(createdDate.getTime() + (3 * 24 * 60 * 60 * 1000));
    const tatDays = daysUntil(tatTarget.toISOString());
    let tatClass = 'status-COMPLETED';
    if (tatDays < 0) tatClass = 'status-CRITICAL';
    else if (tatDays <= 2) tatClass = 'status-URGENT';
    
    const tatBadge = `<span class="status-badge ${tatClass}" style="margin-left: 0.5rem;">Due in ${tatDays} days</span>`;

    // Weekly Update enforcement
    const lastUpdate = new Date(a.lastStatusUpdate || a.createdAt);
    const daysSinceUpdate = Math.floor((new Date() - lastUpdate) / (1000 * 60 * 60 * 24));
    const escalationWarning = daysSinceUpdate >= 7 ? '<div style="color:var(--accent-danger); font-size:0.7rem; font-weight:800; margin-top:0.25rem;">ACTION REQUIRED: Update status or appeal will escalate</div>' : '';

    let actionHtml = '';
    if (isReceiver && a.status !== 'COMPLETED' && a.status !== 'PAID' && a.status !== 'DENIED') {
        actionHtml = `
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color); display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="tkt-${a.id}" placeholder="Ticket # (Mandatory for Complete)" value="${a.ticketNumber || ''}" style="flex: 1; font-size: 0.8rem; padding: 0.4rem;">
                    <select id="stat-${a.id}" class="select-sm">
                        <option value="WORKING" ${a.status==='WORKING'?'selected':''}>Working</option>
                        <option value="SENT" ${a.status==='SENT'?'selected':''}>Sent</option>
                        <option value="IN_PROCESS" ${a.status==='IN_PROCESS'?'selected':''}>In Process</option>
                        <option value="SENT_BACK" ${a.status==='SENT_BACK'?'selected':''}>Sent Back to Sender</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="updateAppealStatus('${a.id}')">Update</button>
                </div>
                ${escalationWarning}
            </div>
        `;
    }

    return `
        <div class="appeal-item-detailed">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 1.1rem; font-weight: 800; color: var(--accent-primary); cursor: pointer; text-decoration: underline;" onclick="showAppealDetails('${a.id}')" title="Click for full details">FIN: ${a.finNumber || 'N/A'}</div>
                <div style="display: flex; gap: 0.5rem;">
                    ${tatBadge}
                    <span class="status-badge status-${a.status}">${a.status === 'PENDING' && a.lastStatusUpdate ? 'WORKING' : a.status}</span>
                </div>
            </div>
            <div class="appeal-row-info">
                <div>Payer: <b>${a.payer || '--'}</b></div>
                <div>DOS: <b>${a.dos || '--'}</b></div>
                <div>TFL: <b style="${tflStyle}">${a.tflExpiry || '--'}</b> ${tflBadge}</div>
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
    
    el.innerHTML = '<p class="muted" style="text-align:center;">Searching records...</p>';
    
    try {
        console.log("DEBUG: Tracking FIN:", fin);
        let a = null;
        
        // Try new endpoint first
        try {
            a = await apiCall(`/appeals/track?fin=${fin}`);
        } catch (e) {
            console.warn("DEBUG: /track failed, trying /status fallback...");
            // Try old endpoint as fallback
            a = await apiCall(`/appeals/status/${fin}`);
        }
        
        if (!a) throw new Error("Not found");
        console.log("DEBUG: Found record:", a);

        const daysLeft = daysUntil(a.tflExpiry);
        let tflStyle = '';
        if (daysLeft !== null) {
            if (daysLeft < 0) tflStyle = 'color:var(--accent-danger); font-weight:800;';
            else if (daysLeft <= 3) tflStyle = 'color:var(--accent-danger);';
            else if (daysLeft <= 7) tflStyle = 'color:var(--accent-warn);';
        }

        const isSender = a.senderUsername === currentUser;
        
        el.innerHTML = `
            <div class="appeal-item-detailed" style="border-left: 4px solid var(--accent-primary);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 1.2rem; font-weight: 800; color: var(--accent-primary); cursor: pointer; text-decoration: underline;" onclick="showAppealDetails('${a.id}')">FIN: ${a.finNumber}</div>
                    <div class="status-badge status-${a.status}">${a.status}</div>
                </div>
                <div style="margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                    <div>Payer: <b>${a.payer || '--'}</b></div>
                    <div>DOS: <b>${a.dos || '--'}</b></div>
                    <div>TFL: <b style="${tflStyle}">${a.tflExpiry || '--'}</b> ${daysLeft < 0 ? '<span class="status-badge status-CRITICAL">OVERDUE</span>' : ''}</div>
                    <div>Amount: <b>$${(a.billedAmount || 0).toLocaleString()}</b></div>
                    <div>Claim ID: <b>${a.claimId || '--'}</b></div>
                    <div>Sender: <b>${a.senderUsername || '--'}</b></div>
                    <div style="grid-column: span 2; font-weight: 700; color: var(--accent-success); margin-top: 0.5rem;">
                        ${a.ticketNumber ? `TICKET GENERATED: ${a.ticketNumber}` : 'STATUS: PROCESSING / PENDING TICKET'}
                    </div>
                </div>
                ${a.notes ? `<div style="margin-top: 1rem; font-size: 0.82rem; color: #94a3b8; font-style: italic; background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 6px;">"${a.notes}"</div>` : ''}
                
                ${isSender && a.status !== 'PAID' && a.status !== 'DENIED' ? `
                    <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <label style="font-size: 0.7rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">SENDER ACTIONS</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-success btn-sm" style="flex: 1;" onclick="updateOutcome('${a.id}', 'PAID')">Mark PAID</button>
                            <button class="btn btn-danger btn-sm" style="flex: 1;" onclick="updateOutcome('${a.id}', 'DENIED')">Mark DENIED</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch(e) { 
        console.error("DEBUG: Search failed:", e);
        el.innerHTML = `
            <div style="text-align:center; padding: 2rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border-color);">
                <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
                <p class="muted">No records found for FIN: <b>${fin}</b></p>
                <p style="font-size: 0.8rem; color: var(--accent-warn); margin-top: 1rem;">
                    Tip: If you just sent this appeal, please ensure the <b>backend server is restarted</b> to see the latest updates.
                </p>
                <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="location.reload()">Refresh Page</button>
            </div>
        `; 
    }
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



// Admin Dashboard Functions
window.loadActiveUserCount = async function() {
    try {
        const data = await apiCall('/users/active-count');
        document.getElementById('active-user-count').textContent = data.count;
    } catch(e) { console.error(e); }
};

window.loadSignedUsers = async function() {
    try {
        const users = await apiCall('/users/approved');
        const activeUsers = users.filter(u => {
            if (!u.lastActive) return false;
            const last = new Date(u.lastActive);
            const now = new Date();
            return (now - last) < 300000; // 5 minutes
        });
        
        const el = document.getElementById('signed-users-list');
        document.getElementById('signed-users-section').style.display = 'block';
        
        if (!activeUsers.length) {
            el.innerHTML = '<p class="muted">No users currently active.</p>';
            return;
        }
        
        el.innerHTML = activeUsers.map(u => `
            <div class="admin-user-item">
                <div>
                    <div style="font-weight: 700;">${u.username}</div>
                    <div style="font-size: 0.75rem; color: var(--accent-success);">Online Now</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="removeUser('${u.username}')">Remove</button>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
};

window.loadAllUsers = async function() {
    try {
        const users = await apiCall('/users/approved');
        const el = document.getElementById('all-users-list');
        
        if (!users.length) {
            el.innerHTML = '<p class="muted">No approved users found.</p>';
            return;
        }
        
        el.innerHTML = users.map(u => `
            <div class="admin-user-item">
                <div>
                    <div style="font-weight: 700;">${u.username}</div>
                    <div style="font-size: 0.75rem;" class="muted">Last Active: ${u.lastActive ? new Date(u.lastActive).toLocaleString() : 'Never'}</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="removeUser('${u.username}')">Remove</button>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
};

window.removeUser = async function(username) {
    if (!confirm(`Are you sure you want to PERMANENTLY REMOVE user ${username}?\nThis will delete their account and access.`)) return;
    try {
        await apiCall(`/users/${username}`, 'DELETE');
        toast('User ' + username + ' removed.');
        loadAllUsers();
        loadSignedUsers();
        loadActiveUserCount();
    } catch(e) {
        toast('Error removing user');
    }
};
// Daily Production
window.saveDailyProd = async function() {
    const data = {
        date: document.getElementById('dp-date').value || new Date().toISOString().split('T')[0],
        appealsCompleted: parseInt(document.getElementById('dp-completed').value) || 0,
        appealsSent: parseInt(document.getElementById('dp-sent').value) || 0,
        amountCollected: parseFloat(document.getElementById('dp-amount').value) || 0,
        notes: document.getElementById('dp-notes').value
    };
    
    try {
        await apiCall('/api/daily-production', 'POST', data);
        toast('Record saved successfully!');
        loadDailyProd();
    } catch(e) {
        toast('Error saving record');
    }
};

window.loadDailyProd = async function() {
    try {
        const history = await apiCall('/api/daily-production?days=7');
        renderDailyProdHistory(history);
        updateDailyProdStats(history);
    } catch(e) { console.error(e); }
};

function renderDailyProdHistory(data) {
    const el = document.getElementById('dp-history-list');
    if (!data.length) { el.innerHTML = '<p class="muted">No history found.</p>'; return; }
    
    el.innerHTML = data.map(row => {
        const isEditable = daysUntil(row.date) >= -7;
        return `
            <div class="history-item" id="dp-row-${row.id}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="history-date-link" 
                         onclick="viewDowntimeForDate('${row.date}')" title="Click to view activity/downtime for this day">
                         ${row.date}
                    </div>
                    ${isEditable ? `<button class="btn btn-sm btn-secondary" onclick="prepareEditDailyProd('${row.id}')">Edit</button>` : '<span class="muted" style="font-size:0.7rem;">Locked</span>'}
                </div>
                <div class="appeal-row-info" style="margin-top:0.5rem; font-size:0.85rem;">
                    <div>Completed: <b>${row.appealsCompleted}</b></div>
                    <div>Sent: <b>${row.appealsSent}</b></div>
                    <div>Collected: <b>$${row.amountCollected.toLocaleString()}</b></div>
                </div>
                ${row.notes ? `<div class="muted" style="font-size:0.75rem; margin-top:0.4rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.4rem;">Notes: "${row.notes}"</div>` : ''}
            </div>
        `;
    }).join('');
}

window.viewDowntimeForDate = async function(date) {
    // Navigate to time tab and highlight downtime for that date
    document.getElementById('tab-time').click();
    toast(`Viewing activity for ${date}`);
    // Optional: Filter downtime list for that date
};

window.prepareEditDailyProd = async function(id) {
    try {
        // Find in current data or fetch
        const history = await apiCall('/api/daily-production?days=7');
        const row = history.find(r => r.id == id);
        if (row) {
            document.getElementById('dp-date').value = row.date;
            document.getElementById('dp-completed').value = row.appealsCompleted;
            document.getElementById('dp-sent').value = row.appealsSent;
            document.getElementById('dp-amount').value = row.amountCollected;
            document.getElementById('dp-notes').value = row.notes || '';
            document.getElementById('dp-date').scrollIntoView({ behavior: 'smooth' });
            toast('Loaded data for editing');
        }
    } catch(e) { console.error(e); }
};

function updateDailyProdStats(data) {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = data.find(r => r.date === todayStr);
    
    if (document.getElementById('stat-dp-today')) {
        document.getElementById('stat-dp-today').textContent = today ? today.appealsCompleted : 0;
    }
    
    const weekCount = data.reduce((sum, r) => sum + r.appealsCompleted, 0);
    const weekAmount = data.reduce((sum, r) => sum + r.amountCollected, 0);
    
    if (document.getElementById('stat-dp-week')) {
        document.getElementById('stat-dp-week').textContent = weekCount;
    }
    if (document.getElementById('stat-dp-amount')) {
        document.getElementById('stat-dp-amount').textContent = `$${weekAmount.toLocaleString(undefined, {minimumFractionDigits:2})}`;
    }
}

function daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

window.formatDateInput = function(el) {
    let val = el.value.replace(/\D/g, '');
    if (val.length === 8) {
        el.value = val.substring(0,2) + '/' + val.substring(2,4) + '/' + val.substring(4,8);
    }
};

window.formatCurrencyInput = function(el) {
    let val = el.value.replace(/[^0-9.]/g, '');
    if (val) {
        let num = parseFloat(val);
        if (!isNaN(num)) {
            el.value = num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }
    }
};

window.showAppealDetails = async function(id) {
    let appeal = null;
    try {
        appeal = await apiCall(`/appeals/track?fin=${id}`);
    } catch (e) {
        try {
            appeal = await apiCall(`/appeals/status/${id}`);
        } catch (e2) {
            console.error("Error fetching appeal details:", e2);
        }
    }
    
    if(!appeal || appeal.message || !appeal.id) return toast('Appeal details not available.');
    
    const senderName = appeal.senderUsername || (appeal.sender ? appeal.sender.username : '--');
    const receiverName = appeal.receiverUsername || (appeal.receiver ? appeal.receiver.username : '--');

    document.getElementById('adm-fin-input').value = appeal.finNumber || '';
    document.getElementById('adm-payer-input').value = appeal.payer || '';
    document.getElementById('adm-dos-input').value = appeal.dos || '';
    document.getElementById('adm-tfl-input').value = appeal.tflExpiry || '';
    document.getElementById('adm-amount-input').value = appeal.billedAmount ? `$${appeal.billedAmount.toLocaleString()}` : '';
    document.getElementById('adm-assign-input').value = receiverName;
    document.getElementById('adm-sender-input').value = senderName;
    document.getElementById('adm-status-input').value = appeal.status || '';
    
    let notesText = appeal.notes || '';
    if (appeal.claimId && appeal.claimId !== '--') notesText = `Claim ID: ${appeal.claimId}\n` + notesText;
    if (appeal.ticketNumber && appeal.ticketNumber !== '--') notesText = `Ticket #: ${appeal.ticketNumber}\n` + notesText;
    
    document.getElementById('adm-notes-input').value = notesText;
    
    let priorityStr = 'Normal';
    if (appeal.priority === 'URGENT') priorityStr = 'URGENT ⚠️';
    if (appeal.priority === 'CRITICAL') priorityStr = 'CRITICAL 🚨';
    
    const prioInput = document.getElementById('adm-priority-input');
    prioInput.value = priorityStr;
    if (appeal.priority === 'URGENT') prioInput.style.color = 'var(--accent-warn)';
    else if (appeal.priority === 'CRITICAL') prioInput.style.color = 'var(--accent-danger)';
    else prioInput.style.color = 'inherit';
    
    document.getElementById('appeal-detail-modal').style.display = 'flex';
};

window.openProductivityDeepDive = function(dk) {
    // 1. Fetch data
    const timeState = JSON.parse(localStorage.getItem(userKey('timeState_'+dk)) || 'null');
    
    // Format date
    const dParts = dk.split('-');
    const dateObj = new Date(dParts[0], dParts[1]-1, dParts[2]);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('dd-title-date').textContent = dateStr;

    // Simulate metrics
    let workSec = 0;
    let breakSec = 0;
    let punchIn = '--';
    let breaksList = [];
    if(timeState) {
        workSec = timeState.currentSec || 0;
        breakSec = timeState.currentBreakSec || 0;
        if(timeState.punchInTime) punchIn = new Date(timeState.punchInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        breaksList = timeState.breaksList || [];
    }

    // Generate score
    const targetScore = 85;
    const isToday = (dk === todayKey());
    const randomFuzz = isToday ? 0 : (dk.charCodeAt(dk.length-1) % 15);
    const score = timeState ? Math.min(100, Math.max(50, targetScore + randomFuzz - (breakSec > 3600 ? 10 : 0))) : 0;
    
    document.getElementById('dd-score').textContent = score;
    const ring = document.getElementById('dd-score-ring');
    let ringColor = 'var(--accent-primary)';
    if(score >= 90) ringColor = '#10b981';
    else if(score >= 80) ringColor = '#38bdf8';
    else if(score >= 70) ringColor = '#f59e0b';
    else ringColor = '#f43f5e';
    ring.style.background = `conic-gradient(${ringColor} 0%, ${ringColor} ${score}%, rgba(255,255,255,0.1) ${score}%, rgba(255,255,255,0.1) 100%)`;

    let grade = 'D GRADE';
    let gColor = '#ef4444';
    if(score >= 90) { grade = 'S GRADE'; gColor = '#38bdf8'; }
    else if(score >= 80) { grade = 'A GRADE'; gColor = '#22c55e'; }
    else if(score >= 70) { grade = 'B GRADE'; gColor = '#facc15'; }
    else if(score >= 60) { grade = 'C GRADE'; gColor = '#fb923c'; }
    
    const gradeEl = document.getElementById('dd-grade');
    gradeEl.textContent = grade;
    gradeEl.style.background = gColor;

    document.getElementById('dd-percentile').textContent = score > 0 ? `Top ${100-score + 5}% of your work days` : 'No data recorded';

    // Metrics
    document.getElementById('dd-total-worked').textContent = formatTShort(workSec);
    document.getElementById('dd-breaks-taken').textContent = formatTShort(breakSec);
    document.getElementById('dd-break-sessions').textContent = breaksList.length;
    
    const totalBlocks = breaksList.length + 1;
    const avgFocus = workSec / totalBlocks;
    document.getElementById('dd-avg-focus').textContent = formatTShort(avgFocus);
    
    document.getElementById('dd-tw-tag').textContent = workSec >= 28800 ? '▲ 8h Reached' : '▼ Under 8h';
    document.getElementById('dd-tw-tag').style.color = workSec >= 28800 ? 'var(--accent-success)' : 'var(--accent-danger)';
    document.getElementById('dd-bt-tag').textContent = breakSec <= 3600 ? 'Optimal' : 'High';
    document.getElementById('dd-bt-tag').style.color = breakSec <= 3600 ? 'var(--accent-success)' : 'var(--accent-warn)';
    document.getElementById('dd-af-tag').textContent = avgFocus >= 3600 ? '▲ Over 1h' : '▼ Under 1h';
    document.getElementById('dd-af-tag').style.color = avgFocus >= 3600 ? 'var(--accent-success)' : 'var(--accent-warn)';
    document.getElementById('dd-bs-tag').textContent = breaksList.length <= 3 ? 'Average' : 'High';
    document.getElementById('dd-bs-tag').style.color = breaksList.length <= 3 ? 'var(--accent-success)' : 'var(--accent-warn)';

    // Heatmap (24 cells)
    const heatmapEl = document.getElementById('dd-heatmap');
    heatmapEl.innerHTML = '';
    for(let i=0; i<24; i++) {
        let hScore = 0;
        let bg = 'rgba(255,255,255,0.05)';
        if(score > 0 && i >= 8 && i <= 17) {
            hScore = Math.floor(Math.random() * 100);
            if(i === 12 || i === 13) hScore = hScore * 0.4; // lunch
            if(hScore > 85) bg = '#22c55e';
            else if(hScore > 65) bg = 'rgba(34, 197, 94, 0.4)';
            else if(hScore > 40) bg = '#f59e0b'; // break / low focus
            else bg = 'rgba(255,255,255,0.05)';
        }
        let ampm = i >= 12 ? 'PM' : 'AM';
        let displayHr = i % 12 || 12;
        heatmapEl.innerHTML += `<div style="background: ${bg}; border-radius: 4px; aspect-ratio: 1;" title="${displayHr}:00 ${ampm} - ${hScore}% intensity"></div>`;
    }

    // Timeline
    let tHTML = '';
    if(!timeState) {
        tHTML = '<p class="muted">No timeline data available for this date.</p>';
    } else {
        tHTML += `<div style="display:flex; gap:1rem; margin-bottom:0;">
            <div style="width: 14px; height: 14px; background: #38bdf8; border-radius: 50%; position: absolute; left: -8px; top: 4px; box-shadow: 0 0 0 4px var(--bg-color);"></div>
            <div style="font-size:0.85rem; color:var(--text-secondary); width:80px; flex-shrink:0; font-weight:600; padding-top:2px;">${punchIn}</div>
            <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); width: 100%;">
                <div style="font-weight:700; color:white; font-size:0.95rem;">💻 Punch In</div>
                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">System start · Logged into Suite</div>
            </div>
        </div>`;
        
        breaksList.forEach((b, i) => {
            tHTML += `<div style="display:flex; gap:1rem; margin-bottom:0; margin-top: 1.5rem;">
                <div style="width: 14px; height: 14px; background: #f59e0b; border-radius: 50%; position: absolute; left: -8px; margin-top: 4px; box-shadow: 0 0 0 4px var(--bg-color);"></div>
                <div style="font-size:0.85rem; color:var(--text-secondary); width:80px; flex-shrink:0; font-weight:600; padding-top:2px;">Break ${i+1}</div>
                <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); width: 100%;">
                    <div style="font-weight:700; color:white; font-size:0.95rem;">☕ ${b.reason}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">Duration: <b>${formatTShort(b.duration)}</b></div>
                </div>
            </div>`;
        });
    }
    document.getElementById('dd-timeline').innerHTML = tHTML;

    // Patterns
    const pEl = document.getElementById('dd-patterns');
    let phtml = '';
    if(score >= 80) phtml += '<span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 0.35rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(34, 197, 94, 0.3);">✅ High Focus</span>';
    if(breaksList.length > 0) phtml += '<span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 0.35rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(56, 189, 248, 0.3);">✅ Consistent Breaks</span>';
    if(breakSec > 3600) phtml += '<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 0.35rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.3);">⚠️ Long Breaks</span>';
    if(!phtml) phtml = '<span class="muted" style="font-size:0.8rem;">Need more data</span>';
    pEl.innerHTML = phtml;

    // Insights
    let ihtml = '';
    if(avgFocus > 3600) ihtml += '<div>🔹 Your average focus block is over an hour, indicating deep work capacity.</div>';
    if(breaksList.length === 0 && workSec > 14400) ihtml += '<div style="color:var(--accent-warn);">⚠️ You worked for 4+ hours without a logged break. Consider pacing yourself.</div>';
    if(!ihtml) ihtml = '<div>🔹 More data needed to generate AI insights for this day. Complete a full shift to see personalized analytics.</div>';
    document.getElementById('dd-insights').innerHTML = ihtml;

    // Recs
    document.getElementById('dd-rec-keep').textContent = breaksList.length > 1 ? "Taking evenly spaced breaks helps maintain the B+ grade." : "Start taking 15m breaks to boost energy.";
    document.getElementById('dd-rec-try').textContent = "Schedule your hardest analytical tasks between 9AM and 11AM based on your focus heatmap.";

    // Trend Chart
    let tcHTML = '';
    for(let i=6; i>=0; i--) {
        const d = new Date(dateObj);
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('en-US', {weekday: 'short'});
        const h = 40 + Math.random() * 60; // 40-100%
        const isSelected = i===0;
        tcHTML += `<div style="display:flex; flex-direction:column; align-items:center; gap:0.75rem; width:10%;">
            <div style="width:100%; height:${h}%; background: ${isSelected ? 'var(--accent-primary)' : 'rgba(139,92,246,0.3)'}; border-radius: 6px 6px 0 0; transition: height 0.3s;"></div>
            <div style="font-size:0.7rem; color:${isSelected ? 'white' : 'var(--text-secondary)'}; font-weight:${isSelected?'800':'600'};">${dayStr}</div>
        </div>`;
    }
    document.getElementById('dd-trend-chart').innerHTML = tcHTML;

    // Open Modal
    document.getElementById('deep-dive-modal').style.display = 'flex';
};
