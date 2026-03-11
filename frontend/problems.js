const API_BASE = 'https://error-anti-cheat-coding-platform.vercel.app/api';

const problemsList = document.getElementById('problemsList');

async function loadProblems() {
    try {
        const res = await fetch(`${API_BASE}/problems`);
        if (res.status === 403) {
            problemsList.innerHTML = `<div class="status-msg">Contest is not active! Please return during the contest window.</div>`;
            return;
        }

        const problems = await res.json();
        
        if (problems.length === 0) {
            problemsList.innerHTML = `<p>No problems available yet.</p>`;
            return;
        }

        problemsList.innerHTML = problems.map(p => `
            <a href="/editor.html?id=${p.id}" class="problem-card">
                <div>
                    <h3 style="margin-bottom: 0.5rem;">${p.title}</h3>
                    <span class="difficulty diff-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
                </div>
                <div>
                    <button class="btn btn-secondary">Solve</button>
                </div>
            </a>
        `).join('');

    } catch (err) {
        console.error("Failed to fetch problems", err);
        problemsList.innerHTML = `<p style="color:var(--danger-color)">Failed to load problems.</p>`;
    }
}

// Email based strictly registered login
async function mockLogin() {
    let email = localStorage.getItem('contest_email');
    if (!email) {
        email = prompt("Enter your registered email for the contest:");
        if (!email) {
            alert("Email is required to join the contest.");
            window.location.href = '/';
            return;
        }
    }
    
    try {
        const res = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const user = await res.json();
        
        if (res.status === 403 || res.status === 401) {
            alert(user.error || "You are not registered. Contact Admin.");
            localStorage.removeItem('contest_email');
            window.location.href = '/';
            return;
        }

        localStorage.setItem('contest_email', email);
        localStorage.setItem('contest_user_id', user.id);
        localStorage.setItem('contest_username', user.name);
    } catch(err) {
        console.error("Auth failed", err);
        alert("Failed to connect to authentication server.");
        window.location.href = '/';
    }
}

mockLogin().then(loadProblems);
