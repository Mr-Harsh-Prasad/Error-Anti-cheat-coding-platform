const API_BASE = '/api';

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginBtn = document.getElementById('loginBtn');
let adminId = null;

// Login Logic
loginBtn.addEventListener('click', async () => {
    const name = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPass').value;
    
    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
        });
        const data = await res.json();
        if (data.success) {
            adminId = data.user.id;
            loginView.style.display = 'none';
            dashboardView.style.display = 'block';
            alert("Admin Login Successful!");
            fetchSubmissions();
            fetchCheatLogs();
        } else {
            alert(data.error);
        }
    } catch(err) {
        alert("Login failed.");
    }
});

// Update Timer
document.getElementById('updateTimeBtn').addEventListener('click', async () => {
    const start_time = document.getElementById('timeStart').value;
    const end_time = document.getElementById('timeEnd').value;
    
    try {
        const res = await fetch(`${API_BASE}/admin/time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId, start_time, end_time })
        });
        const data = await res.json();
        if(data.success) alert("Timer Updated Successfully!");
        else alert(data.error);
    } catch(err) { alert("Action failed"); }
});

// Add Registered User
document.getElementById('addUserBtn').addEventListener('click', async () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    
    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId, name, email })
        });
        const data = await res.json();
        if(data.success) {
            alert("User Registered!");
            document.getElementById('regName').value = "";
            document.getElementById('regEmail').value = "";
        }
        else alert(data.error);
    } catch(err) { alert("Action failed"); }
});

// Add Problem
document.getElementById('addProbBtn').addEventListener('click', async () => {
    const payload = {
        admin_id: adminId,
        title: document.getElementById('pTitle').value,
        difficulty: document.getElementById('pDiff').value,
        description: document.getElementById('pDesc').value,
        input_format: document.getElementById('pIn').value,
        output_format: document.getElementById('pOut').value,
        constraints: document.getElementById('pCons').value,
        example_in: document.getElementById('pExIn').value,
        example_out: document.getElementById('pExOut').value,
        test_cases: document.getElementById('pTest').value
    };
    
    try {
        const res = await fetch(`${API_BASE}/admin/problems`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            alert("Problem Added Successfully!");
        }
        else alert(data.error);
    } catch(err) { alert("Action failed"); }
});

// =============================================
// LIVE SUBMISSIONS — Grouped by Candidate
// =============================================

async function fetchSubmissions() {
    try {
        const res = await fetch(`${API_BASE}/admin/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId })
        });
        const data = await res.json();
        if (!data.success) return;

        const tbody = document.getElementById('subTableBody');
        tbody.innerHTML = '';

        if (data.grouped.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem; color:var(--text-muted); text-align:center;">No submissions yet.</td></tr>`;
            return;
        }

        data.grouped.forEach(candidate => {
            const candId = `cand-${candidate.candidate_id}`;

            // Count verdict colors for summary badge
            const accepted = candidate.submissions.filter(s => s.verdict === 'Accepted').length;
            const wrong = candidate.submissions.length - accepted;
            const summaryBadges = `
                <span style="background:rgba(0,255,204,0.15); color:var(--success-color); border:1px solid rgba(0,255,204,0.3); border-radius:1rem; padding:0.1rem 0.6rem; font-size:0.78rem; margin-left:0.5rem;">${accepted} AC</span>
                ${wrong > 0 ? `<span style="background:rgba(255,51,102,0.15); color:var(--danger-color); border:1px solid rgba(255,51,102,0.3); border-radius:1rem; padding:0.1rem 0.6rem; font-size:0.78rem; margin-left:0.3rem;">${wrong} WA</span>` : ''}
            `;

            // Parent expandable row
            const parentRow = document.createElement('tr');
            parentRow.className = 'candidate-row';
            parentRow.dataset.target = candId;
            parentRow.innerHTML = `
                <td style="padding:0.6rem 0.5rem; width:2rem;">
                    <span class="expand-icon" data-id="${candId}">▶</span>
                </td>
                <td style="padding:0.6rem 0.5rem; font-weight:600;">${escapeHtml(candidate.candidate)}</td>
                <td style="padding:0.6rem 0.5rem;">
                    <span style="font-family:var(--font-mono);">${candidate.total}</span>
                    ${summaryBadges}
                </td>
                <td style="padding:0.6rem 0.5rem;">
                    <button class="expand-btn" data-id="${candId}" style="background:transparent; border:1px solid var(--border-color); color:var(--text-muted); padding:0.2rem 0.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.82rem; transition:all 0.2s;">Expand</button>
                </td>
            `;
            tbody.appendChild(parentRow);

            // Detail rows container (hidden by default)
            const detailRow = document.createElement('tr');
            detailRow.id = candId;
            detailRow.className = 'detail-row';
            detailRow.style.display = 'none';

            const detailCell = document.createElement('td');
            detailCell.colSpan = 4;
            detailCell.style.padding = '0';

            const detailTable = document.createElement('table');
            detailTable.style.cssText = 'width:100%; border-collapse:collapse;';

            candidate.submissions.forEach((sub, idx) => {
                const isLast = idx === candidate.submissions.length - 1;
                const verdictColor = sub.verdict === 'Accepted' ? 'var(--success-color)' : 'var(--danger-color)';
                const prefix = isLast ? '└' : '├';
                const tr = document.createElement('tr');
                tr.className = 'sub-detail-row';
                tr.innerHTML = `
                    <td style="padding:0.4rem 0.5rem 0.4rem 2rem; color:var(--text-muted); width:1.5rem; font-family:var(--font-mono);">${prefix}</td>
                    <td style="padding:0.4rem 0.5rem; color:var(--accent-color); font-weight:500;">${escapeHtml(sub.problem)}</td>
                    <td style="padding:0.4rem 0.5rem; color:var(--text-muted);">${escapeHtml(sub.language)}</td>
                    <td style="padding:0.4rem 0.5rem; color:${verdictColor}; font-weight:600;">${escapeHtml(sub.verdict)}</td>
                    <td style="padding:0.4rem 0.5rem; color:var(--text-muted); font-size:0.8rem;">${new Date(sub.submitted_at).toLocaleString()}</td>
                    <td style="padding:0.4rem 0.5rem;">
                        <button onclick="window.viewCode(${sub.id}, '${escapeHtml(sub.language)}', '${escapeHtml(sub.problem)}')" 
                            style="background:transparent; border:1px solid var(--accent-color); color:var(--accent-color); padding:0.2rem 0.6rem; border-radius:0.25rem; cursor:pointer; font-size:0.8rem; transition:all 0.2s;"
                            onmouseover="this.style.background='rgba(0,255,204,0.1)'" 
                            onmouseout="this.style.background='transparent'">
                            View Code
                        </button>
                    </td>
                `;
                detailTable.appendChild(tr);
            });

            detailCell.appendChild(detailTable);
            detailRow.appendChild(detailCell);
            tbody.appendChild(detailRow);

            // Click handler on the parent row / expand button
            const toggleExpand = () => {
                const icon = document.querySelector(`.expand-icon[data-id="${candId}"]`);
                const btn = document.querySelector(`.expand-btn[data-id="${candId}"]`);
                const isOpen = detailRow.style.display !== 'none';
                if (isOpen) {
                    detailRow.style.display = 'none';
                    icon.classList.remove('expanded');
                    btn.textContent = 'Expand';
                    btn.style.color = 'var(--text-muted)';
                    btn.style.borderColor = 'var(--border-color)';
                } else {
                    detailRow.style.display = 'table-row';
                    icon.classList.add('expanded');
                    btn.textContent = 'Collapse';
                    btn.style.color = 'var(--accent-color)';
                    btn.style.borderColor = 'var(--accent-color)';
                }
            };

            parentRow.addEventListener('click', toggleExpand);
        });

    } catch(err) { console.error(err); }
}

// =============================================
// VIEW CODE MODAL — Lazy Load
// =============================================

const codeModal = document.getElementById('codeModal');
const closeCodeModal = document.getElementById('closeCodeModal');

closeCodeModal.addEventListener('click', () => codeModal.classList.remove('active'));
codeModal.addEventListener('click', (e) => { if (e.target === codeModal) codeModal.classList.remove('active'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') codeModal.classList.remove('active'); });

window.viewCode = async (submissionId, language, problemName) => {
    const title = document.getElementById('codeModalTitle');
    const codeEl = document.getElementById('codeModalCode');

    title.textContent = `${problemName} — ${language}`;
    codeEl.textContent = 'Loading...';
    codeModal.classList.add('active');

    try {
        const res = await fetch(`${API_BASE}/admin/submissions/${submissionId}/code?admin_id=${adminId}`);
        const data = await res.json();
        if (data.code !== undefined) {
            codeEl.textContent = data.code;
        } else {
            codeEl.textContent = data.error || 'Failed to load code.';
        }
    } catch(err) {
        codeEl.textContent = 'Server error loading code.';
    }
};

// =============================================
// ANTI-CHEAT LOGS (unchanged)
// =============================================

async function fetchCheatLogs() {
    try {
        const res = await fetch(`${API_BASE}/admin/anti-cheat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId })
        });
        const data = await res.json();
        if(data.success) {
            const tbody = document.getElementById('cheatTableBody');
            tbody.innerHTML = data.logs.map(l => `
                <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:0.5rem;">#${l.id}</td>
                    <td style="padding:0.5rem; font-weight:600;">${l.candidate}</td>
                    <td style="padding:0.5rem;">${l.event}</td>
                    <td style="padding:0.5rem; font-weight:800; color:var(--danger-color);">${l.count}</td>
                    <td style="padding:0.5rem; color:var(--text-muted);">${new Date(l.created_at).toLocaleString()}</td>
                    <td style="padding:0.5rem;">
                       <button onclick="window.deleteCheatLog(${l.id})" style="background:var(--danger-color); color:white; border:none; padding:0.25rem 0.5rem; border-radius:0.25rem; cursor:pointer;">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch(err) { console.error(err); }
}

window.deleteCheatLog = async (logId) => {
    if(!confirm("Are you sure you want to delete this log?")) return;
    try {
        const res = await fetch(`${API_BASE}/admin/anti-cheat/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId, log_id: logId })
        });
        const data = await res.json();
        if(data.success) fetchCheatLogs();
        else alert(data.error);
    } catch(err) { alert("Failed to delete log"); }
};

if(document.getElementById('refreshSubBtn')) document.getElementById('refreshSubBtn').addEventListener('click', fetchSubmissions);
if(document.getElementById('refreshCheatBtn')) document.getElementById('refreshCheatBtn').addEventListener('click', fetchCheatLogs);

// Helper: Escape HTML to prevent XSS in admin display
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
