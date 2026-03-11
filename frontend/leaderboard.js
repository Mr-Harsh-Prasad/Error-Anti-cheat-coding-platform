const API_BASE = 'https://error-anti-cheat-coding-platform.vercel.app/api';
const leaderboardBody = document.getElementById('leaderboardBody');

async function fetchLeaderboard() {
    try {
        const res = await fetch(`${API_BASE}/leaderboard`);
        const data = await res.json();
        
        if (data.length === 0) {
            leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No submissions yet.</td></tr>`;
            return;
        }

        leaderboardBody.innerHTML = data.map(user => {
            let rankClass = '';
            if (user.rank === 1) rankClass = 'rank-1';
            else if (user.rank === 2) rankClass = 'rank-2';
            else if (user.rank === 3) rankClass = 'rank-3';

            return `
                <tr>
                    <td class="${rankClass}">#${user.rank}</td>
                    <td style="font-weight:600;">${user.name}</td>
                    <td style="font-family:var(--font-mono); color:var(--accent-color);">${user.score}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Failed to load leaderboard", err);
        leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger-color);">Error fetching rankings.</td></tr>`;
    }
}

// Fetch immediately
fetchLeaderboard();

// Poll every 10 seconds for real-time updates
setInterval(fetchLeaderboard, 10000);
