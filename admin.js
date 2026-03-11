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

// Fetch Submissions
async function fetchSubmissions() {
    try {
        const res = await fetch(`${API_BASE}/admin/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId })
        });
        const data = await res.json();
        if(data.success) {
            const tbody = document.getElementById('subTableBody');
            tbody.innerHTML = data.submissions.map(s => `
                <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:0.5rem;">#${s.id}</td>
                    <td style="padding:0.5rem; font-weight:600;">${s.candidate}</td>
                    <td style="padding:0.5rem; color:var(--accent-color);">${s.problem}</td>
                    <td style="padding:0.5rem;">${s.language}</td>
                    <td style="padding:0.5rem; color:${s.verdict === 'Accepted' ? 'var(--success-color)' : 'var(--danger-color)'}">${s.verdict}</td>
                    <td style="padding:0.5rem; color:var(--text-muted);">${new Date(s.created_at).toLocaleString()}</td>
                </tr>
            `).join('');
        }
    } catch(err) { console.error(err); }
}

// Fetch Cheat Logs
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
                </tr>
            `).join('');
        }
    } catch(err) { console.error(err); }
}

if(document.getElementById('refreshSubBtn')) document.getElementById('refreshSubBtn').addEventListener('click', fetchSubmissions);
if(document.getElementById('refreshCheatBtn')) document.getElementById('refreshCheatBtn').addEventListener('click', fetchCheatLogs);
