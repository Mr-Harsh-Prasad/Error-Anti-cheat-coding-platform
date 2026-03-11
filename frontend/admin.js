const API_BASE = 'https://error-anti-cheat-coding-platform.vercel.app/api';

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
