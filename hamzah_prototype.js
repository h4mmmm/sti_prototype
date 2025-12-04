let assets = [
    { 
        id: 101, 
        name: "payroll_db.sql", 
        type: "RSA", 
        sensitivity: "Long", 
        harvested: false, 
        status: "Secure", 
        date: new Date().toISOString(), 
        location: "AWS S3" 
    },
    { 
        id: 105, 
        name: "meeting_minutes_11082025.txt", 
        type: "RSA", 
        sensitivity: "Short", 
        harvested: false, 
        status: "Secure", 
        date: new Date().toISOString(), 
        location: "AWS S3" 
    }
];

let securityLogs = [
    { time: new Date().toLocaleTimeString(), msg: "System initialized. Monitoring active.", type: "info" }
];

let currentYear = 2025;
let uploadMode = 'RSA';
let wizStep = 0;
let wizTargetId = null;
let currentUserRole = 'worker';
let isOfflineMode = false;

function login(role) {
    currentUserRole = role;
    isOfflineMode = document.getElementById('login-offline-mode').checked;
    
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    const roleBadge = document.getElementById('role-badge');
    const adminNav = document.getElementById('admin-nav');
    const adminNotify = document.getElementById('admin-notify');
    const netText = document.getElementById('net-text');
    const netDot = document.getElementById('net-dot');

    if(isOfflineMode) {
        netDot.style.backgroundColor = "#f59e0b";
        netText.innerText = "OFFLINE (Air-Gapped)";
        netText.style.color = "#f59e0b";
        document.body.classList.add('offline-mode');
        assets.forEach(a => a.location = "Localhost HSM");
    } else {
        netDot.style.backgroundColor = "#10b981";
        netText.innerText = "ONLINE (Cloud)";
        netText.style.color = "";
        document.body.classList.remove('offline-mode');
        assets.forEach(a => a.location = "AWS S3");
    }

    if (role === 'admin') {
        roleBadge.innerText = "ADMINISTRATOR";
        roleBadge.style.background = "#ea580c";
        adminNav.classList.remove('hidden');
        adminNotify.classList.remove('hidden');
        switchView('dashboard');
        
        currentYear = 2025;
        document.getElementById('time-slider').value = 2025;
        document.getElementById('year-display').innerText = 2025;
        
        refreshLogs(); 
    } else {
        roleBadge.innerText = "WORKER";
        roleBadge.style.background = "#3b82f6";
        adminNav.classList.add('hidden');
        adminNotify.classList.add('hidden');
        switchView('worker');
    }
    renderTables();
}

function logout() {
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
}

function switchView(view) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    renderTables();
}

function simulateExfiltration() {
    if(isOfflineMode) {
        alert("SECURITY TEST PASSED\n\nExfiltration Failed: Network is unreachable (Air-Gapped).\nThreat Intelligence module is offline.");
        addLog("Security Test: Exfiltration blocked by Air-Gap.", "success");
        return; 
    }

    assets.forEach(a => a.harvested = true);
    addLog("ALERT: Data Exfiltration Detected! All current assets marked as HARVESTED.", "danger");
    renderTables();
    refreshLogs(); 
    alert("ATTACK SIMULATION:\nFiles have been 'Harvested'.\n\nNow move the Time Slider to >2030 to see RSA encryption break.");
}

function openUploadModal() { 
    document.getElementById('modal-upload').style.display = 'flex'; 
    document.getElementById('upload-error').style.display = 'none';
}
function closeUploadModal() { document.getElementById('modal-upload').style.display = 'none'; }
function selectUploadMode(mode) {
    uploadMode = mode;
    document.getElementById('opt-rsa').className = `toggle-opt rsa ${mode==='RSA'?'selected':''}`;
    document.getElementById('opt-kyber').className = `toggle-opt kyber ${mode==='Kyber'?'selected':''}`;
}

function executeUpload() {
    const fileName = document.getElementById('upload-file-select').value;
    const retention = document.getElementById('upload-retention').value;
    const errorBox = document.getElementById('upload-error');
    const pqcPolicyActive = document.getElementById('policy-pqc-only').checked;

    if (fileName.endsWith('.exe')) {
        errorBox.innerHTML = `<strong>Security Blocked</strong><br>Executable files prohibited.`;
        errorBox.style.display = 'block';
        addLog(`Upload Blocked: Malicious file detected (${fileName}).`, "danger");
        refreshLogs();
        return;
    }

    if (retention === 'Long' && uploadMode === 'RSA') {
        const confirmHNDL = confirm("HNDL RISK WARNING\n\nYou classified this data as 'Long Term (>10 Years)'.\n\nLegacy RSA encryption will likely be broken before this data expires (Harvest Now, Decrypt Later).\n\nRecommended: Switch to Kyber.\n\nProceed with RSA anyway?");
        if (!confirmHNDL) return; 
        addLog(`Risk Accepted: Worker uploaded Long-Term asset using Legacy RSA.`, "warning");
    }

    let finalStatus = "Secure";
    if (pqcPolicyActive && uploadMode === 'RSA') {
        if (currentUserRole === 'admin') {
            errorBox.innerHTML = `<strong>Policy Violation</strong><br>Admin cannot override PQC Mandate.`;
            errorBox.style.display = 'block';
            return;
        } else {
            alert("⚠️ QUARANTINED\n\nFile uploaded but flagged for migration.");
            finalStatus = "Quarantined";
            addLog(`Policy Violation: RSA file (${fileName}) moved to Quarantine.`, "warning");
        }
    } else {
        addLog(`Success: ${fileName} uploaded (${uploadMode} / ${retention}).`, "info");
    }

    const loc = isOfflineMode ? "Localhost HSM" : "AWS S3";

    assets.unshift({ 
        id: Date.now(), 
        name: fileName, 
        type: uploadMode,
        sensitivity: retention, 
        harvested: false, 
        status: finalStatus,
        date: new Date().toISOString(),
        location: loc
    });
    
    closeUploadModal();
    renderTables();
    refreshLogs();
}

function openLinkModal(id) {
    const asset = assets.find(a => a.id === id);
    const modal = document.getElementById('modal-share'); 
    const content = document.getElementById('share-content');
    
    modal.style.display = 'flex';

    if (asset.status === 'Quarantined') {
        content.innerHTML = `
            <div style="text-align:center; color:#ef4444;">
                <div style="font-size:3rem; margin-bottom:10px;"><i class="fas fa-ban"></i></div>
                <h3>Access Denied</h3>
                <p>This asset is Quarantined. No access links generated.</p>
            </div>
        `;
        return;
    }

    if (asset.type === 'RSA') {
        content.innerHTML = `
            <div style="background:#fff7ed; border:1px solid #fed7aa; padding:15px; border-radius:8px; margin-bottom:15px;">
                <h4 style="margin:0; color:#c2410c;"><i class="fas fa-exclamation-triangle"></i> Vulnerable Access Link</h4>
                <p style="margin:5px 0 0 0; font-size:0.9rem; color:#9a3412;">
                    This link points to an <strong>RSA-encrypted</strong> object.
                    <br><strong>HNDL Risk:</strong> If this link is logged or intercepted today, the file contents can be decrypted in ~2030.
                </p>
            </div>
            <label>Object URI</label>
            <div style="display:flex; gap:10px; margin-top:5px;">
                <input type="text" value="s3://vault/rsa_${asset.id}" readonly style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; color:#64748b;">
                <button class="btn btn-outline">Copy</button>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:15px; border-radius:8px; margin-bottom:15px;">
                <h4 style="margin:0; color:#166534;"><i class="fas fa-shield-alt"></i> Quantum-Safe Link</h4>
                <p style="margin:5px 0 0 0; font-size:0.9rem; color:#15803d;">
                    This link points to a <strong>Kyber-encapsulated</strong> object.
                    <br><strong>HNDL Risk:</strong> Negligible. Even if harvested, the object remains secure against quantum decryption.
                </p>
            </div>
            <label>Object URI</label>
            <div style="display:flex; gap:10px; margin-top:5px;">
                <input type="text" value="s3://vault/kyber_${asset.id}" readonly style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; color:#64748b;">
                <button class="btn btn-outline">Copy</button>
            </div>
        `;
    }
}

function updateTimeline(year) {
    currentYear = parseInt(year);
    document.getElementById('year-display').innerText = currentYear;
    renderTables();
}

function openManageModal(id) {
    wizTargetId = id;
    const asset = assets.find(a => a.id === id);
    const modal = document.getElementById('modal-manage');
    
    document.getElementById('manage-filename').innerText = asset.name;
    document.getElementById('manage-sensitivity').innerText = (asset.sensitivity || 'Medium') + " Term";
    
    const recommendation = document.getElementById('manage-rec');
    if (asset.sensitivity === 'Short' && asset.type === 'RSA') {
        recommendation.innerHTML = `<i class="fas fa-trash-alt"></i> <strong>Recommendation: Prune</strong> (Data value < Migration cost)`;
        recommendation.style.color = "#d97706";
    } else if (asset.type === 'RSA') {
        recommendation.innerHTML = `<i class="fas fa-arrow-up"></i> <strong>Recommendation: Migrate</strong> (High Value Asset)`;
        recommendation.style.color = "#2563eb";
    } else {
        recommendation.innerHTML = `<i class="fas fa-check"></i> <strong>Status: Optimal</strong>`;
        recommendation.style.color = "#059669";
    }

    modal.style.display = 'flex';
}

function closeManageModal() { document.getElementById('modal-manage').style.display = 'none'; }

function pruneAsset() {
    if(!confirm("⚠️ CONFIRM DECOMMISSION\n\nAre you sure you want to permanently delete this asset?\nThis action simulates secure wiping and cannot be undone.")) return;
    assets = assets.filter(a => a.id !== wizTargetId);
    addLog(`Asset ID_${wizTargetId} decommissioned (Pruned) by Admin.`, "warning");
    closeManageModal();
    renderTables();
    refreshLogs();
}

function triggerMigration() {
    closeManageModal();
    startWizard(); 
}

function startWizard() {
    wizStep = 0;
    document.getElementById('modal-wizard').style.display = 'flex';
    updateWizUI(0);
}
function closeWizard() { document.getElementById('modal-wizard').style.display = 'none'; }

function runWizardStep() {
    const simFail = document.getElementById('sim-failure').checked;
    if (simFail && wizStep === 1) {
        const log = document.getElementById('wiz-log');
        const content = document.getElementById('wiz-content');
        
        content.innerHTML = `<h3 style="color:red">CRITICAL ERROR</h3><p>Network connection dropped during Lattice generation.</p>`;

        log.innerHTML += `
            <div class="term-line" style="color:#ef4444; font-weight:bold;">> [ERR] Connection Reset by Peer</div>
            <div class="term-line" style="color:#ef4444;">> [ROLLBACK] Reverting Transaction... SUCCESS</div>
        `;
        
        const btn = document.getElementById('wiz-btn');
        btn.innerText = "Retry";
        btn.onclick = () => { closeWizard(); }; 
        return;
    }
    wizStep++;
    updateWizUI(wizStep);
}

function updateWizUI(step) {
    const content = document.getElementById('wiz-content');
    const log = document.getElementById('wiz-log');
    const btn = document.getElementById('wiz-btn');
    btn.onclick = runWizardStep; 
    
    [1,2,3].forEach(i => document.getElementById(`wiz-step-${i}`).className = `step-dot ${i<=step+1 ? 'active' : ''} ${i<step+1 ? 'done' : ''}`);

    if (step === 0) {
        content.innerHTML = `<h3>Step 1: Key Unwrapping</h3>`;
        // USING DIVS FOR LINE BREAKS
        log.innerHTML = `
            <div class="term-line">> [INIT] Migration Process Started for Asset_${wizTargetId}...</div>
            <div class="term-line">> [RSA] Loading 2048-bit Private Key from HSM... OK</div>
            <div class="term-line">> [PKCS#1] Verifying padding scheme... Valid</div>
            <div class="term-line">> [DECRYPT] Unwrapping Session Key...</div>
            <div class="term-line">> [HEX] Key Extracted: 0x4A 0xF3 0x99 0x1B... (256-bit)</div>
            <div class="term-line term-success">> [READY] Symmetric Key prepared for re-encapsulation.</div>
        `;
        btn.innerText = "Next: Encapsulate";
    } else if (step === 1) {
        content.innerHTML = `<h3>Step 2: Quantum Encapsulation</h3>`;
        log.innerHTML += `
            <br>
            <div class="term-line">> [LOAD] Module: CRYSTALS-Kyber-512 (NIST Level 1)</div>
            <div class="term-line">> [MATH] Generating Matrix A (2x2 Polynomial Ring)...</div>
            <div class="term-line">> [NOISE] Sampling vectors s, e from Centered Binomial Distribution...</div>
            <div class="term-line">> [LATTICE] Computing t = As + e... </div>
            <div class="term-line">> [ENCAPS] Wrapping AES Key into Lattice Ciphertext...</div>
            <div class="term-line term-success">> [SUCCESS] Ciphertext Generated (768 bytes).</div>
        `;
        log.scrollTop = log.scrollHeight;
        btn.innerText = "Finalize";
    } else if (step === 2) {
        const asset = assets.find(a => a.id === wizTargetId);
        if(asset) {
            asset.type = 'Kyber';
            asset.status = "Secure";
        }
        addLog(`Migration: Asset ID_${wizTargetId} upgraded to Kyber-512.`, "success");
        closeWizard();
        renderTables();
        refreshLogs();
        alert("Migration Success: Asset is now Quantum-Safe.");
    }
}

function addLog(msg, type) {
    const time = new Date().toLocaleTimeString();
    securityLogs.unshift({ time, msg, type });
    if(currentUserRole === 'admin') refreshLogs();
}

function refreshLogs() {
    const logContainer = document.getElementById('live-logs');
    if (logContainer) {
        logContainer.innerHTML = securityLogs.map(log => `
            <div class="log-entry">
                <span class="log-time">${log.time}</span>
                <span class="log-msg ${log.type}">${log.msg}</span>
            </div>
        `).join('');
    }
    
    const qCount = assets.filter(a => a.status === 'Quarantined').length;
    const badge = document.getElementById('notify-badge');
    const banner = document.getElementById('alert-banner');
    if(qCount > 0) {
        if(badge) { badge.innerText = qCount; badge.classList.remove('hidden'); }
        if(banner) { banner.classList.remove('hidden'); document.getElementById('quarantine-count').innerText = qCount; }
    } else {
        if(badge) badge.classList.add('hidden');
        if(banner) banner.classList.add('hidden');
    }
}

function renderTables() {
    // 1. WORKER TABLE
    const workerBody = document.getElementById('worker-table');
    if(workerBody) {
        workerBody.innerHTML = assets.map(a => {
            let sensitivityBadge = "background:#f1f5f9; color:#475569";
            if (a.sensitivity === 'Long') sensitivityBadge = "background:#fee2e2; color:#b91c1c; border:1px solid #fecaca"; // Red
            if (a.sensitivity === 'Medium') sensitivityBadge = "background:#ffedd5; color:#c2410c; border:1px solid #fed7aa"; // Orange

            return `
            <tr>
                <td>
                    <div style="font-weight:600; color:#334155;">${a.name}</div>
                    <div style="font-size:0.75rem; color:#94a3b8">${a.location}</div>
                </td>
                <td><span style="font-size:0.75rem; padding:2px 6px; border-radius:4px; ${sensitivityBadge}">${a.sensitivity || 'Medium'} Term</span></td>
                <td><span class="badge badge-${a.type.toLowerCase()}">${a.type}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="openLinkModal(${a.id})">
                        <i class="fas fa-link"></i> Get Link
                    </button>
                </td>
            </tr>
        `}).join('');
    }

    const invBody = document.getElementById('inventory-table');
    if(invBody) {
        const sortedAssets = [...assets].sort((a, b) => {
            if (a.status === 'Quarantined') return -1;
            return 1;
        });

        invBody.innerHTML = sortedAssets.map(a => {
            let riskText = a.status;
            let action = "";
            let rowStyle = "";
            let riskColor = "#334155";

            if (a.status === 'Quarantined') {
                riskText = "POLICY VIOLATION";
                action = `<button class="btn btn-sm btn-danger-outline" onclick="openManageModal(${a.id})">Resolve</button>`;
                rowStyle = "background:#fff7ed";
                riskColor = "#c2410c";
            } 
            else if (a.type === 'RSA') {
                if (currentYear >= 2030) {
                     riskText = a.harvested ? "DECRYPTED (HNDL)" : "Obsolete (Broken)";
                     riskColor = "red";
                     action = `<button class="btn btn-sm btn-primary" onclick="openManageModal(${a.id})">Manage</button>`;
                } else {
                    riskText = "Legacy (RSA)";
                    action = `<button class="btn btn-sm btn-primary" onclick="openManageModal(${a.id})">Manage</button>`;
                }
            } 
            else {
                riskText = "Quantum Safe";
                riskColor = "#10b981";
                action = `<button class="btn btn-sm btn-outline" onclick="openManageModal(${a.id})">Manage</button>`;
            }

            return `
            <tr style="${rowStyle}">
                <td style="font-family:monospace">ID_${a.id.toString().substr(-4)}</td>
                <td><span style="font-size:0.8rem; color:#64748b">${a.location}</span></td>
                <td><span class="badge badge-${a.type.toLowerCase()}">${a.type}</span></td>
                <td style="font-weight:bold; color:${riskColor}">${riskText}</td>
                <td>${action}</td>
            </tr>
        `}).join('');
    }
}

function runStressTest() {
    document.getElementById('modal-stress').style.display = 'flex';
    document.getElementById('stress-year').innerText = `Target Year: ${currentYear}`;
    
    const consoleBody = document.getElementById('stress-body');
    consoleBody.innerHTML = `<div style="color:#64748b;">> Initializing Cryptanalysis Suite (Year ${currentYear})...</div>`;

    let delay = 500;

    assets.forEach((asset, index) => {
        setTimeout(() => {
            let resultHtml = "";
            
            if (asset.type === 'RSA') {
                if (currentYear >= 2030) {
                    resultHtml = `
                        <div style="margin-top:10px; border-left:3px solid #ef4444; padding-left:10px;">
                            <div style="color:#fff;">Target: ${asset.name}</div>
                            <div style="color:#94a3b8;">Algo: RSA-2048 | Method: Integer Factorization</div>
                            <div style="color:#ef4444; font-weight:bold;">[CRITICAL] KEY FACTORED (Shor's Algo)</div>
                            <div style="color:#ef4444;">> Plaintext Exposed.</div>
                        </div>`;
                } else {
                    resultHtml = `
                        <div style="margin-top:10px; border-left:3px solid #f59e0b; padding-left:10px;">
                            <div style="color:#fff;">Target: ${asset.name}</div>
                            <div style="color:#94a3b8;">Algo: RSA-2048 | Method: Brute Force</div>
                            <div style="color:#f59e0b;">[WARN] Computationally Expensive</div>
                            <div style="color:#10b981;">> Attack Failed (Current Compute Power Insufficient).</div>
                        </div>`;
                }
            } else {
                resultHtml = `
                    <div style="margin-top:10px; border-left:3px solid #10b981; padding-left:10px;">
                        <div style="color:#fff;">Target: ${asset.name}</div>
                        <div style="color:#94a3b8;">Algo: Kyber-512 | Method: Lattice Reduction</div>
                        <div style="color:#10b981; font-weight:bold;">[SECURE] RESISTANT</div>
                        <div style="color:#10b981;">> No Shortest Vector Found.</div>
                    </div>`;
            }

            consoleBody.innerHTML += resultHtml;
            consoleBody.scrollTop = consoleBody.scrollHeight;

        }, delay * (index + 1));
    });
    
    setTimeout(() => {
        const rsaCount = assets.filter(a => a.type === 'RSA').length;
        const failed = (currentYear >= 2030) ? rsaCount : 0;
        consoleBody.innerHTML += `
            <br><div style="border-top:1px solid #334155; padding-top:10px; color:${failed > 0 ? '#ef4444' : '#10b981'}">
                > ANALYSIS COMPLETE<br>
                > VULNERABLE ASSETS FOUND: ${failed}
            </div>`;
        consoleBody.scrollTop = consoleBody.scrollHeight;
    }, delay * (assets.length + 1));
}

function closeStressModal() {
    document.getElementById('modal-stress').style.display = 'none';
}

// Init
renderTables();