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

// User Mock Login to get user ID
async function mockLogin() {
    let username = localStorage.getItem('contest_username');
    if (!username) {
        username = prompt("Enter your username for the contest:");
        if (!username) username = "Anonymous_" + Math.floor(Math.random() * 1000);
        localStorage.setItem('contest_username', username);
    }
    
    try {
        const res = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: username })
        });
        const user = await res.json();
        localStorage.setItem('contest_user_id', user.id);
    } catch(err) {
        console.error("Auth failed", err);
    }
}

mockLogin().then(loadProblems);
