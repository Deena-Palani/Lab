// Live Render Backend URL
const API_BASE = 'https://arcaller-backend.onrender.com/api';

window.togglePwd = function(id, icon, forceShow) {
    const input = document.getElementById(id);
    if (!input) return;
    
    if (forceShow === true) {
        input.type = 'text';
        icon.style.opacity = '1';
    } else if (forceShow === false) {
        input.type = 'password';
        icon.style.opacity = '0.7';
    } else {
        // Fallback for click toggle
        if (input.type === 'password') {
            input.type = 'text';
            icon.style.opacity = '1';
        } else {
            input.type = 'password';
            icon.style.opacity = '0.7';
        }
    }
};

let token = localStorage.getItem('ar_token') || null;
let currentUser = localStorage.getItem('ar_user') || null;

// Clean up old session if corrupted
if (token === "null" || currentUser === "null") {
    localStorage.removeItem('ar_token');
    localStorage.removeItem('ar_user');
    token = null;
    currentUser = null;
}

const UI = {
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    loginError: document.getElementById('login-error')
};

function init() {
    UI.authContainer.style.display = 'none';
    UI.appContainer.style.display = 'block';
    
    // Set User Info & Greeting
    document.getElementById('user-display').textContent = currentUser;
    document.getElementById('user-greeting').textContent = getGreeting();

    // Show Admin Panel if Deena is logged in
    if (currentUser === 'Deena') {
        const adminTab = document.getElementById('tab-admin');
        if (adminTab) adminTab.style.display = 'flex';
        loadPendingUsers();
        loadActiveUserCount();
        loadAllUsers();
    }

    // Populate User Profile Modal
    document.getElementById('upm-username').textContent = currentUser;
    document.getElementById('upm-role').textContent = currentUser === 'Deena' ? 'ADMINISTRATOR' : 'USER';
    document.getElementById('upm-access-level').textContent = currentUser === 'Deena' ? 'Full Access' : 'Standard Access';
    
    updateISTTime();
    setInterval(updateISTTime, 1000);

    renderDirectory();
    loadProdData();
    loadTimeData();
    updateTimeSummary();
    loadTimeHistory();
    renderProdHistory();
    renderDowntimeList();
    
    // Load new sections
    loadDailyProd();
    loadAppealsWorkflow();

    // Online Status Heartbeat
    updateOnlineStatus();
    setInterval(updateOnlineStatus, 30000); // Every 30s
}

async function loadAppealsWorkflow() {
    await renderSentAppeals();
    await renderReceivedAppeals();
    
    // If user has received appeals but no sent ones, switch to Received tab automatically
    const sentCount = document.getElementById('sent-appeals-list').children.length;
    const recvCount = document.getElementById('received-appeals-list').children.length;
    
    if (recvCount > 0 && sentCount === 0) {
        const recvBtn = document.querySelector('.appeal-tab-btn[data-tab="received"]');
        if (recvBtn) recvBtn.click();
    }
}

function getGreeting(d) {
    let istDate = d;
    if (!istDate) {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        istDate = new Date(utc + (3600000 * 5.5));
    }
    const hours = istDate.getHours();

    if (hours < 12) return "Good Morning,";
    if (hours < 17) return "Good Afternoon,";
    if (hours < 21) return "Good Evening,";
    return "Good Working,"; // Replaces Good Night with a professional alternative
}

function updateISTTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istDate = new Date(utc + (3600000 * 5.5));
    const timeStr = istDate.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    
    const sessionTimeEl = document.getElementById('upm-session-time');
    if (sessionTimeEl) sessionTimeEl.textContent = timeStr;
    
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) greetingEl.textContent = getGreeting(istDate);
}

// On page load: if already logged in, go straight to app
if (token && currentUser) {
    init();
}

// Auth
// Auth Toggling
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const btnToggleAuth = document.getElementById('btn-toggle-auth');
const toggleText = document.getElementById('toggle-text');

btnToggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    if (loginForm.style.display !== 'none') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        toggleText.textContent = 'Already have an account?';
        btnToggleAuth.textContent = 'Login here';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        toggleText.textContent = "Don't have an account?";
        btnToggleAuth.textContent = 'Register here';
    }
    UI.loginError.textContent = '';
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    loginBtn.textContent = 'Authenticating...'; loginBtn.disabled = true;
    UI.loginError.className = 'error-msg';
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username, password})
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            token = data.token; localStorage.setItem('ar_token', token);
            currentUser = data.username; localStorage.setItem('ar_user', currentUser);
            UI.loginError.textContent = ''; init();
        } else if (res.status === 403) {
            // Account pending admin approval
            UI.loginError.className = 'error-msg pending-msg';
            UI.loginError.textContent = data.message || 'Your account is pending administrator approval. Please wait for Deena to authorize your access.';
        } else {
            UI.loginError.className = 'error-msg';
            UI.loginError.textContent = data.message || 'Invalid username or password.';
        }
    } catch(err) {
        UI.loginError.className = 'error-msg';
        UI.loginError.innerHTML = '<b>Connection Error</b><br>The frontend cannot reach the backend server at ' + API_BASE + '.<br><br><b>How to fix:</b><br>1. Ensure the backend server is running (Run start_backend.bat).<br>2. Check if port 8080 is blocked by a firewall.<br>3. Verify the server started without errors in the terminal.';
    } finally {
        loginBtn.textContent = 'Login'; loginBtn.disabled = false;
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    UI.loginError.className = 'error-msg';

    // Client-side password policy check
    const hasMin = password.length >= 8;
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    if (!hasMin || !hasNum || !hasSpecial) {
        UI.loginError.className = 'error-msg';
        UI.loginError.textContent = 'Password must be at least 8 characters and include at least one number and one special character (e.g. @, #, !).';
        return;
    }

    const regBtn = registerForm.querySelector('button[type="submit"]');
    regBtn.textContent = 'Submitting...'; regBtn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/users/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username, password})
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            UI.loginError.className = 'error-msg pending-msg';
            UI.loginError.textContent = data.message || 'Registration submitted. Awaiting administrator approval.';
            registerForm.reset();
            // Switch to login view after a brief delay
            setTimeout(() => btnToggleAuth.click(), 4000);
        } else {
            UI.loginError.className = 'error-msg';
            UI.loginError.textContent = data.message || 'Registration failed. Please try a different username.';
        }
    } catch(err) {
        UI.loginError.className = 'error-msg';
        UI.loginError.innerHTML = '<b>Connection Error</b><br>The frontend cannot reach the backend server at ' + API_BASE + '.<br><br><b>How to fix:</b><br>1. Ensure the backend server is running (Run start_backend.bat).<br>2. Check if port 8080 is blocked by a firewall.<br>3. Verify the server started without errors in the terminal.';
    } finally {
        regBtn.textContent = 'Submit Registration'; regBtn.disabled = false;
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    // Remove auth keys to log out but keep local tracker data
    localStorage.removeItem('ar_token');
    localStorage.removeItem('ar_user');
    token = null;
    currentUser = null;
    UI.appContainer.style.display = 'none';
    UI.authContainer.style.display = 'flex';
    location.reload(); 
});

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${token}` };
    if(body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
    if (res.status === 401 || res.status === 403) { localStorage.removeItem('ar_token'); location.reload(); }
    if (!res.ok && res.status !== 204) throw new Error("API Error");
    if (res.status === 204) return null;
    return res.json();
}

function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
}

function getDateKey(d) { 
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function todayKey() { return getDateKey(new Date()); }
function userKey(k) { return `${currentUser}_${k}`; }

async function updateOnlineStatus() {
    try {
        const data = await apiCall('/users/active-count');
        const indicator = document.getElementById('online-indicator');
        if (indicator) indicator.classList.add('active');
        if (data.count !== undefined && document.getElementById('active-user-count')) {
            document.getElementById('active-user-count').textContent = data.count;
        }
    } catch (e) {
        if (document.getElementById('online-indicator')) document.getElementById('online-indicator').classList.remove('active');
    }
}

// Navigation
const tabs = ['tfl', 'dos', 'denial', 'callog', 'prod', 'time', 'julian', 'appeals', 'admin'];
tabs.forEach(tab => {
    const el = document.getElementById(`tab-${tab}`);
    if (el) {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => { 
                const btn = document.getElementById(`tab-${t}`);
                const view = document.getElementById(`view-${t}`);
                if (btn) btn.classList.remove('active'); 
                if (view) view.style.display = 'none'; 
            });
            el.classList.add('active');
            const targetView = document.getElementById(`view-${tab}`);
            if (targetView) targetView.style.display = 'block';
        });
    }
});

window.toggleUserManagement = function() {
    const card = document.getElementById('user-mgmt-card');
    if (card.style.display === 'none') {
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth' });
    } else {
        card.style.display = 'none';
    }
};

// Format helper
function formatDateOutput(d, format) {
    const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
    if (format === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
    if (format === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
    if (format === 'WORD') return d.toLocaleDateString('en-US', {year:'numeric', month:'long', day:'2-digit'});
    if (format === 'DAY_WORD') return d.toDateString();
    return `${mm}/${dd}/${yyyy}`;
}

function copyableResult(text) {
    return `<span style="user-select:all;cursor:pointer;background:rgba(255,255,255,0.05);padding:0.2rem 0.4rem;border-radius:4px;" title="Double-click to copy">${text}</span>`;
}

// 1. TFL Calculator
window.calculateTfl = function() {
    const dos = document.getElementById('tfl-dos').value;
    const limit = parseInt(document.getElementById('tfl-limit').value);
    const format = document.getElementById('tfl-format').value;
    const box = document.getElementById('tfl-result');
    if(!dos || isNaN(limit)) { box.innerHTML='--'; return; }
    const d = new Date(dos);
    if(isNaN(d.getTime())) { box.innerHTML='<span style="color:var(--accent-danger)">Invalid Date</span>'; return; }
    d.setDate(d.getDate() + limit);
    box.innerHTML = copyableResult(formatDateOutput(d, format));
};

// 2. DOS Range Calculator
window.calculateDosRange = function() {
    const start = document.getElementById('dos-start').value;
    const end = document.getElementById('dos-end').value;
    const format = document.getElementById('dos-format').value;
    const box = document.getElementById('dos-result');
    if(!start || !end) { box.innerHTML='--'; return; }
    const d1 = new Date(start), d2 = new Date(end);
    if(isNaN(d1.getTime()) || isNaN(d2.getTime())) { box.innerHTML='<span style="color:var(--accent-danger)">Invalid Date</span>'; return; }
    const diffDays = Math.ceil(Math.abs(d2-d1) / (1000*60*60*24));
    if(format === 'DAYS') { box.innerHTML = copyableResult(`${diffDays} Days`); return; }
    box.innerHTML = copyableResult(`${diffDays} Days — ${formatDateOutput(d1, format)} to ${formatDateOutput(d2, format)}`);
};

// 3. Denial Reason Analyzer
const denialDB = {
    "CO-4": { desc: "Procedure code inconsistent with modifier or required modifier missing.", action: "Review for missing/invalid modifiers (25, 59). Bind correct modifier and rebill.", notes: "Check if modifier was dropped during billing. Verify CPT-modifier pairing with coding guidelines.", tags: ["modifier","coding"], callNotes: "Ask rep to verify if modifier is on file. If not, ask if verbal correction is allowed or if corrected claim is required.", webNotes: "Check clearinghouse to see if modifier dropped. Rebill via portal with correct modifier." },
    "CO-11": { desc: "Diagnosis inconsistent with procedure.", action: "Check medical records. Ensure ICD-10 supports CPT. Consult coding team.", notes: "Cross-reference diagnosis with LCD/NCD policies. May need updated diagnosis from provider.", tags: ["diagnosis","coding"], callNotes: "Verify exactly which diagnosis code is causing the conflict. Ask if there are alternative covered DX codes.", webNotes: "Review coding guidelines online. Submit corrected claim with updated ICD-10 if supported by medical records." },
    "CO-16": { desc: "Claim lacks information or has submission/billing error(s).", action: "Review clearinghouse report for missing info. Correct and resubmit.", notes: "Common causes: missing NPI, invalid taxonomy, missing referring provider. Check claim scrubber.", tags: ["billing","submission"], callNotes: "Ask rep what specific information is missing (e.g., NPI, taxonomy, referring doc). Ask if it can be updated on the call.", webNotes: "Check EDI rejection report. Correct the missing field in the billing system and resubmit." },
    "CO-18": { desc: "Duplicate claim/service.", action: "Verify if previous claim paid. Check same DOS/CPT. Appeal if distinct service.", notes: "Pull EOB of original claim. If different provider/location, include documentation proving distinct service.", tags: ["duplicate"], callNotes: "Verify claim ID of the original processed claim. If this was a distinct service, ask what modifier is needed (e.g., 76, 77) to bypass duplicate logic.", webNotes: "Check portal for prior payment. If distinct, add appropriate modifier and submit as a corrected claim." },
    "CO-22": { desc: "Care may be covered by another payer per coordination of benefits.", action: "Check patient file for Primary/Secondary insurance. Bill appropriate payer.", notes: "Verify COB with patient. Update insurance order in system. May need COB letter from primary.", tags: ["cob","coordination"], callNotes: "Ask rep which payer they show as primary. Ask for the effective dates of the COB on file.", webNotes: "Check eligibility portal for active COB. If primary EOB is available, attach it and submit to secondary." },
    "CO-29": { desc: "Time limit for filing has expired.", action: "Gather proof of timely filing. Submit appeal with documentation.", notes: "Collect original submission confirmation, clearinghouse reports, or prior denial dates as proof.", tags: ["timely filing","tfl"], callNotes: "Verify the exact timely filing limit days for this plan. Ask for the fax number or address to send the Timely Filing Appeal.", webNotes: "Gather EDI acceptance reports. Submit appeal packet via portal with proof of timely filing." },
    "CO-45": { desc: "Charge exceeds fee schedule/maximum allowable.", action: "Review contracted rates. If correct, appeal with fee schedule documentation.", notes: "Compare billed amount vs contracted rate. May need updated fee schedule from payer.", tags: ["fee schedule"], callNotes: "If amount seems wrong, ask rep to send claim back for reprocessing based on contracted rate.", webNotes: "Write off the contractual adjustment. If incorrect, submit a pricing dispute via the portal." },
    "CO-50": { desc: "Non-covered service - not deemed medically necessary.", action: "Appeal with medical records and Letter of Medical Necessity.", notes: "Obtain physician's detailed clinical notes. Reference LCD/NCD policies supporting necessity.", tags: ["medical necessity"], callNotes: "Ask if a peer-to-peer review is available or if a formal written appeal with records is required.", webNotes: "Upload medical records and letter of medical necessity to the payer's appeals portal." },
    "CO-97": { desc: "Payment adjusted - already adjudicated.", action: "Review if benefit already applied. Check EOB for prior payment.", notes: "May overlap with CO-18. Verify claim wasn't split-billed or partially paid.", tags: ["duplicate","adjudicated"], callNotes: "Ask rep to explain the previous adjudication and provide the check number/date.", webNotes: "Review remittance advice on the portal to see how the previous claim was paid/adjusted." },
    "CO-197": { desc: "Pre-certification/authorization absent.", action: "Obtain retro-auth if possible. Appeal with clinical documentation.", notes: "Contact payer for retro-auth process. Some payers allow within 14 days post-service. Include medical necessity docs.", tags: ["auth","authorization"], callNotes: "Ask if the auth is on file under a different provider or DOS. If no auth, ask for the retro-authorization process and timeframe.", webNotes: "Check auth portal to see if it was approved but not linked to the claim. Appeal with auth approval letter." },
    "CO-15": { desc: "Authorization number missing, invalid, or does not apply to billed service.", action: "Verify auth # on file. Resubmit with correct authorization number.", notes: "Check if auth expired, wrong CPT authorized, or units exceeded. May need auth amendment.", tags: ["auth","authorization"], callNotes: "Provide the auth number to the rep and ask them to reprocess the claim. Verify CPTs match the auth.", webNotes: "Update the authorization number in Box 23 of the CMS-1500 and submit a corrected claim." },
    "PR-1": { desc: "Deductible Amount.", action: "Bill patient for their deductible responsibility.", notes: "Verify deductible met date. If met, appeal with proof. Check accumulator.", tags: ["patient responsibility"], callNotes: "Verify the total deductible amount and how much has been met for the year.", webNotes: "Check eligibility portal to confirm the deductible amount. Transfer balance to patient." },
    "PR-2": { desc: "Coinsurance Amount.", action: "Bill patient for coinsurance per their plan benefits.", notes: "Calculate correct percentage per plan. Verify in-network vs out-of-network rates.", tags: ["patient responsibility","coinsurance"], callNotes: "Verify the coinsurance percentage for this specific service type (e.g., 80/20).", webNotes: "Transfer the coinsurance balance to the patient based on the ERA." },
    "PR-3": { desc: "Co-payment Amount.", action: "Collect co-pay from patient.", notes: "Verify correct copay tier. Specialist vs PCP copay may differ.", tags: ["patient responsibility","copay"], callNotes: "Verify the copay amount for this specific place of service.", webNotes: "Transfer the copay balance to the patient statement." },
    "PR-50": { desc: "Non-covered services - not deemed medical necessity.", action: "Review records. Appeal with medical records and Letter of Medical Necessity.", notes: "Get detailed clinical justification from physician. Reference peer-reviewed literature if needed.", tags: ["medical necessity"], callNotes: "Confirm if patient signed an ABN (Advance Beneficiary Notice) for this non-covered service.", webNotes: "If ABN is on file, bill patient. Otherwise, submit clinical appeal." },
    "N54": { desc: "Claim info inconsistent with pre-certified/authorized services.", action: "Compare billed codes vs authorized codes. Request auth amendment if needed.", notes: "Units, CPT, or DOS may mismatch authorization. Verify exact auth details with payer.", tags: ["auth","authorization"], callNotes: "Ask rep exactly which field (CPT, DOS, Units, Provider) does not match the authorization on file.", webNotes: "Review the authorization approval on the portal and correct the claim to match." },
    "AUTH-ADMIN": { desc: "Administrative Auth Denial — Missing/invalid auth number, typos, or clerical errors.", action: "Verify auth # in system. Correct and resubmit. Call payer to confirm valid auth on file.", notes: "Type: Soft denial — usually correctable.\n• Check auth was entered on claim correctly\n• Verify auth # matches payer records\n• Confirm auth covers correct DOS range\n• Re-check NPI/TIN on auth vs claim", tags: ["auth","authorization","administrative"], callNotes: "Provide correct auth number and ask for verbal reprocessing.", webNotes: "Correct the auth number in the billing system and resubmit." },
    "AUTH-CLINICAL": { desc: "Clinical/Medical Necessity Auth Denial — Payer challenges medical necessity even with auth request.", action: "Gather clinical notes, prior treatment history. Request Peer-to-Peer (P2P) review with payer medical director.", notes: "Type: Hard denial — requires clinical appeal.\n• Obtain detailed physician clinical notes\n• Document failed prior treatments\n• Reference clinical guidelines (LCD/NCD)\n• Request P2P review within appeal window\n• Include Letter of Medical Necessity", tags: ["auth","authorization","medical necessity","clinical"], callNotes: "Request a Peer-to-Peer review. Note the reference number and the timeframe to schedule.", webNotes: "Upload clinicals and initiate a formal clinical appeal via the portal." },
    "AUTH-SCOPE": { desc: "Scope/Mismatched Services Auth Denial — Procedure billed differs from procedure authorized.", action: "Compare authorized CPT vs billed CPT. Request auth amendment or corrected claim.", notes: "Type: May be soft or hard denial.\n• Billed CPT differs from authorized CPT\n• Units billed exceed authorized units\n• DOS outside authorized date range\n• May need new auth for additional services", tags: ["auth","authorization","mismatch"], callNotes: "Ask if the authorization can be amended retroactively for the changed CPT codes.", webNotes: "Contact the authorization department via portal to request an amendment." },
    "AUTH-COVERAGE": { desc: "Coverage-Related Auth Denial — Service not a covered benefit under patient's plan.", action: "Verify patient benefits. If covered, appeal. If not, bill patient or seek alternative coverage.", notes: "Type: Hard denial.\n• Verify plan benefits and exclusions\n• Check if service requires different plan tier\n• Review if benefit exception applies\n• May need to explore alternative billing codes", tags: ["auth","authorization","coverage"], callNotes: "Ask rep to verify the policy exclusions. Ask if there's any scenario where this service is covered.", webNotes: "Review the plan's policy documents online. If excluded, transfer to patient responsibility." },
    "AUTH-RETRO": { desc: "Retro Authorization Denial — Auth requested after service was rendered.", action: "Check payer retro-auth policy. Submit within retro-auth window with clinical justification.", notes: "Steps to resolve:\n1. Call payer for retro-auth timeframe (usually 14-30 days)\n2. Submit retro-auth request with clinical notes\n3. Include reason for delayed auth request\n4. If denied, appeal with medical necessity docs\n5. Document all call references", tags: ["auth","authorization","retro"], callNotes: "Ask rep for the specific retro-authorization fax number and required forms.", webNotes: "Submit a retro-authorization request through the utilization management portal." }
};

document.getElementById('denial-search').addEventListener('input', (e) => {
    const val = e.target.value.trim().toUpperCase();
    const container = document.getElementById('denial-results-container');
    if(!val) { container.innerHTML = ''; return; }
    
    const matches = Object.entries(denialDB).filter(([code, data]) => {
        if(code.toUpperCase().includes(val)) return true;
        if(data.tags && data.tags.some(t => t.toUpperCase().includes(val))) return true;
        if(data.desc.toUpperCase().includes(val)) return true;
        return false;
    });
    
    if(matches.length === 0) { container.innerHTML = '<p class="muted" style="margin-top:1rem;">No matching denial codes found.</p>'; return; }
    
    container.innerHTML = matches.map(([code, data]) => `
        <div class="denial-card hover-lift" onclick="openDenialModal('${code}')" style="cursor: pointer; transition: transform 0.2s; border-left: 4px solid var(--accent-primary);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h4>${code}</h4>
                <span class="status-badge status-WORKING" style="font-size: 0.7rem;">Click for Action Plan</span>
            </div>
            <p style="margin-top: 0.5rem;">${data.desc}</p>
        </div>
    `).join('');
});

window.openDenialModal = function(code) {
    const data = denialDB[code];
    if(!data) return;
    
    document.getElementById('dm-code').textContent = code;
    document.getElementById('dm-desc').textContent = data.desc;
    document.getElementById('dm-action').textContent = data.action;
    document.getElementById('dm-notes').textContent = data.notes || 'N/A';
    
    document.getElementById('dm-call-notes').textContent = data.callNotes || 'Call the payer provider services line to review the claim details. Ask the rep for exactly what is missing or incorrect, and if it can be resolved verbally.';
    document.getElementById('dm-web-notes').textContent = data.webNotes || 'Check the payer web portal for claim status. Review the EDI/clearinghouse reports to ensure no data was dropped. Submit corrected claim or appeal via portal if supported.';
    
    document.getElementById('denial-detail-modal').style.display = 'flex';
};

// 4. Payer Directory
const defaultPayers = {
    "Medicare": { id:"MED01", tfl:"365", ccfl:"365", appealTfl:"120", mailAddress:"Medicare Part B\nPO Box 1234\nFargo, ND 58127", ccMail:"Medicare Claims\nPO Box 5678\nFargo, ND 58127", appealMail:"Medicare Appeals\nPO Box 9101\nFargo, ND 58127", fax:"1-800-444-0001", email:"N/A (Use Portal)", phone:"1-800-MEDICARE", quickReach:"1* 2* 1*" },
    "BCBS TX": { id:"BCBS-TX", tfl:"180", ccfl:"180", appealTfl:"180", mailAddress:"BCBS Claims\nPO Box 660058\nDallas, TX 75266", ccMail:"BCBS CC\nPO Box 660555\nDallas, TX 75266", appealMail:"BCBS Appeals\nPO Box 660999\nDallas, TX 75266", fax:"888-222-3333", email:"provider.bcbs.com", phone:"1-800-451-0287", quickReach:"1* 1* 2* 3*" },
    "UHC": { id:"87726", tfl:"90", ccfl:"90", appealTfl:"365", mailAddress:"UHC Claims\nPO Box 30555\nSalt Lake City, UT 84130", ccMail:"UHC Recons\nPO Box 30556\nSalt Lake City, UT 84130", appealMail:"UHC Appeals\nPO Box 30557\nSalt Lake City, UT 84130", fax:"888-333-4444", email:"uhcprovider.com", phone:"1-877-842-3210", quickReach:"2* 4* 1*" },
    "Aetna": { id:"60054", tfl:"90", ccfl:"90", appealTfl:"180", mailAddress:"Aetna Claims\nPO Box 14079\nLexington, KY 40512", ccMail:"Aetna Claims\nPO Box 14079\nLexington, KY 40512", appealMail:"Aetna Appeals\nPO Box 14079\nLexington, KY 40512", fax:"888-555-6666", email:"aetna.com/provider", phone:"1-888-632-3862", quickReach:"1* 2*" },
    "Cigna": { id:"62308", tfl:"180", ccfl:"180", appealTfl:"180", mailAddress:"Cigna Claims\nPO Box 182223\nChattanooga, TN 37422", ccMail:"Cigna Claims\nPO Box 182223\nChattanooga, TN 37422", appealMail:"Cigna Appeals\nPO Box 182223\nChattanooga, TN 37422", fax:"888-777-8888", email:"cignaforhcp.com", phone:"1-800-882-4462", quickReach:"1* 3* 1*" },
    "Humana": { id:"61101", tfl:"180", ccfl:"180", appealTfl:"180", mailAddress:"Humana Claims\nPO Box 14601\nLexington, KY 40512", ccMail:"Humana Recons\nPO Box 14601\nLexington, KY 40512", appealMail:"Humana Appeals\nPO Box 14601\nLexington, KY 40512", fax:"888-111-2222", email:"humana.com/provider", phone:"1-800-448-6262", quickReach:"2* 1* 4*" }
};

function getPayerDir() {
    const stored = localStorage.getItem(userKey('payers'));
    return stored ? JSON.parse(stored) : { ...defaultPayers };
}
function savePayerDir(dir) { localStorage.setItem(userKey('payers'), JSON.stringify(dir)); }

window.renderDirectory = function() {
    const q = (document.getElementById('dir-search').value || '').toLowerCase();
    const dir = getPayerDir();
    const list = document.getElementById('dir-list');
    list.innerHTML = Object.keys(dir).filter(k => k.toLowerCase().includes(q))
        .map(k => `<button onclick="selectPayer('${k.replace(/'/g,"\\'")}')">${k}</button>`).join('');
};

window.selectPayer = function(key) {
    const dir = getPayerDir(); const p = dir[key]; if(!p) return;
    document.getElementById('dir-placeholder').style.display = 'none';
    document.getElementById('dir-details').style.display = 'block';
    document.getElementById('dd-name').textContent = key;
    document.getElementById('dd-id').textContent = p.id;
    document.getElementById('dd-phone').textContent = p.phone;
    document.getElementById('dd-fax').textContent = p.fax;
    document.getElementById('dd-tfl').textContent = (p.tfl||'--') + ' Days';
    document.getElementById('dd-ccfl').textContent = (p.ccfl||'--') + ' Days';
    document.getElementById('dd-appeal-tfl').textContent = (p.appealTfl||'--') + ' Days';
    document.getElementById('dd-mail').textContent = p.mailAddress||'--';
    document.getElementById('dd-cc-mail').textContent = p.ccMail||'--';
    document.getElementById('dd-appeal-mail').textContent = p.appealMail||'--';
    document.getElementById('dd-email').textContent = p.email||'--';
    document.getElementById('dd-quick').textContent = p.quickReach||'--';
};

document.getElementById('btn-add-payer').addEventListener('click', () => { document.getElementById('add-payer-modal').style.display = 'flex'; });
document.getElementById('btn-cancel-payer').addEventListener('click', () => { document.getElementById('add-payer-modal').style.display = 'none'; });
document.getElementById('add-payer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dir = getPayerDir();
    const name = document.getElementById('ap-name').value.trim();
    dir[name] = {
        id: document.getElementById('ap-id').value, phone: document.getElementById('ap-phone').value,
        fax: document.getElementById('ap-fax').value, tfl: document.getElementById('ap-tfl').value,
        ccfl: document.getElementById('ap-ccfl').value, appealTfl: document.getElementById('ap-appeal-tfl').value,
        quickReach: document.getElementById('ap-quick').value, mailAddress: document.getElementById('ap-mail').value,
        ccMail: document.getElementById('ap-cc-mail').value, appealMail: document.getElementById('ap-appeal-mail').value,
        email: document.getElementById('ap-email').value
    };
    savePayerDir(dir); renderDirectory();
    document.getElementById('add-payer-modal').style.display = 'none';
    document.getElementById('add-payer-form').reset();
    toast('Payer saved!');
});

window.submitPasswordChange = async function() {
    const oldP = document.getElementById('cp-old').value;
    const newP = document.getElementById('cp-new').value;
    const confP = document.getElementById('cp-confirm').value;
    if (!oldP || !newP || !confP) return alert('Please fill all fields.');
    if (newP !== confP) return alert('New passwords do not match.');
    try {
        const res = await fetch(`${API_BASE}/users/me/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ oldPassword: oldP, newPassword: newP })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            toast('Password updated successfully');
            document.getElementById('pwd-change-modal').style.display = 'none';
            document.getElementById('cp-old').value = '';
            document.getElementById('cp-new').value = '';
            document.getElementById('cp-confirm').value = '';
        } else {
            alert(data.message || 'Failed to update password');
        }
    } catch(e) {
        alert(e.message || 'Failed to update password');
    }
};
