import"./style-oXTNnaZS.js";const d="/api",e=document.getElementById("leaderboardBody");async function o(){try{const a=await(await fetch(`${d}/leaderboard`)).json();if(a.length===0){e.innerHTML='<tr><td colspan="3" style="text-align:center;">No submissions yet.</td></tr>';return}e.innerHTML=a.map(t=>{let r="";return t.rank===1?r="rank-1":t.rank===2?r="rank-2":t.rank===3&&(r="rank-3"),`
                <tr>
                    <td class="${r}">#${t.rank}</td>
                    <td style="font-weight:600;">${t.name}</td>
                    <td style="font-family:var(--font-mono); color:var(--accent-color);">${t.score}</td>
                </tr>
            `}).join("")}catch(n){console.error("Failed to load leaderboard",n),e.innerHTML='<tr><td colspan="3" style="text-align:center; color:var(--danger-color);">Error fetching rankings.</td></tr>'}}o();setInterval(o,1e4);
