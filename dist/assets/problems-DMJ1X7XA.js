import"./style-oXTNnaZS.js";const n="/api",r=document.getElementById("problemsList");async function a(){try{const t=await fetch(`${n}/problems`);if(t.status===403){r.innerHTML='<div class="status-msg">Contest is not active! Please return during the contest window.</div>';return}const e=await t.json();if(e.length===0){r.innerHTML="<p>No problems available yet.</p>";return}r.innerHTML=e.map(o=>`
            <a href="/editor.html?id=${o.id}" class="problem-card">
                <div>
                    <h3 style="margin-bottom: 0.5rem;">${o.title}</h3>
                    <span class="difficulty diff-${o.difficulty.toLowerCase()}">${o.difficulty}</span>
                </div>
                <div>
                    <button class="btn btn-secondary">Solve</button>
                </div>
            </a>
        `).join("")}catch(t){console.error("Failed to fetch problems",t),r.innerHTML='<p style="color:var(--danger-color)">Failed to load problems.</p>'}}async function i(){let t=localStorage.getItem("contest_email");if(!t&&(t=prompt("Enter your registered email for the contest:"),!t)){alert("Email is required to join the contest."),window.location.href="/";return}try{const e=await fetch(`${n}/auth`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:t})}),o=await e.json();if(e.status===403||e.status===401){alert(o.error||"You are not registered. Contact Admin."),localStorage.removeItem("contest_email"),window.location.href="/";return}localStorage.setItem("contest_email",t),localStorage.setItem("contest_user_id",o.id),localStorage.setItem("contest_username",o.name)}catch(e){console.error("Auth failed",e),alert("Failed to connect to authentication server."),window.location.href="/"}}i().then(a);
