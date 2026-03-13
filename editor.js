const API_BASE = '/api';
let editor;

const pTitle = document.getElementById('pTitle');
const pDifficulty = document.getElementById('pDifficulty');
const pDesc = document.getElementById('pDesc');
const pInFormat = document.getElementById('pInFormat');
const pOutFormat = document.getElementById('pOutFormat');
const pConstraints = document.getElementById('pConstraints');
const pExIn = document.getElementById('pExIn');
const pExOut = document.getElementById('pExOut');
const pPoints = document.getElementById('pPoints');
const terminalInput = document.getElementById('terminalInput');
const consoleOutput = document.getElementById('consoleOutput');
const terminalConsole = document.getElementById('terminalConsole');
const runBtn = document.getElementById('runBtn');
const submitBtn = document.getElementById('submitBtn');
const languageSelect = document.getElementById('languageSelect');
const warningOverlay = document.getElementById('warningOverlay');

// Get Context from URL and Storage
const urlParams = new URLSearchParams(window.location.search);
let problemId = urlParams.get('id');
const userId = localStorage.getItem('contest_user_id') || 1; 

// Problem navigation state
let problemsList = [];
let currentProblemIndex = -1;

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

if (!problemId) {
    pTitle.innerText = "Error: No problem selected";
} else {
    initEditor();
}

async function initEditor() {
    await fetchProblems();
    await loadProblem();
    await checkSubmissionStatus();
}

async function fetchProblems() {
    try {
        const res = await fetch(`${API_BASE}/problems`);
        problemsList = await res.json();
        currentProblemIndex = problemsList.findIndex(p => p.id == problemId);
        updateNavButtons();
    } catch (err) {
        console.error("Failed to fetch problems", err);
    }
}

function updateNavButtons() {
    if (prevBtn) prevBtn.disabled = currentProblemIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentProblemIndex >= problemsList.length - 1 || currentProblemIndex === -1;
}

async function loadProblemById(id) {
    if (id == problemId) return;

    // Prevent full page reload to maintain fullscreen & anti-cheat status
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('id', id);
    window.history.pushState({ path: newUrl.href }, '', newUrl.href);

    problemId = id;
    currentProblemIndex = problemsList.findIndex(p => p.id == problemId);
    
    updateNavButtons();
    
    // Reset UI state for next problem
    submitBtn.innerText = "Submit Solution";
    submitBtn.disabled = false;
    consoleOutput.innerHTML = 'Welcome to Error 1.0 Terminal.';
    
    if (editor) {
        editor.setValue('# Write your solution here\n# Do not cheat!\n');
    }
    
    await loadProblem();
    await checkSubmissionStatus();
}

// Handle browser back/forward buttons
window.addEventListener('popstate', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id && id !== problemId) {
        problemId = id;
        currentProblemIndex = problemsList.findIndex(p => p.id == problemId);
        updateNavButtons();
        
        submitBtn.innerText = "Submit Solution";
        submitBtn.disabled = false;
        consoleOutput.innerHTML = 'Welcome to Error 1.0 Terminal.';
        
        if (editor) {
            editor.setValue('# Write your solution here\n# Do not cheat!\n');
        }
        
        await loadProblem();
        await checkSubmissionStatus();
    }
});

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentProblemIndex > 0) {
            loadProblemById(problemsList[currentProblemIndex - 1].id);
        }
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (currentProblemIndex < problemsList.length - 1) {
            loadProblemById(problemsList[currentProblemIndex + 1].id);
        }
    });
}

async function checkSubmissionStatus() {
    try {
        const res = await fetch(`${API_BASE}/problems?user_id=${userId}`);
        const problems = await res.json();
        const current = problems.find(p => p.id == problemId);
        if (current && current.status === 'Submitted') {
            submitBtn.innerText = "Submitted ✓";
            submitBtn.disabled = true;
        }
    } catch (err) {
        console.error("Failed to check submission status", err);
    }
}

async function loadProblem() {
    try {
        const res = await fetch(`${API_BASE}/problems/${problemId}`);
        if (res.status === 403) {
            window.location.href = '/problems.html';
            return;
        }
        if (!res.ok) throw new Error("Not found");
        
        const problem = await res.json();
        
        pTitle.innerText = problem.title;
        pDifficulty.innerText = problem.difficulty;
        pDifficulty.className = `difficulty diff-${problem.difficulty.toLowerCase()}`;
        pDesc.innerText = problem.description;
        pInFormat.innerText = problem.input_format;
        pOutFormat.innerText = problem.output_format;
        pConstraints.innerText = problem.constraints;
        pExIn.innerText = problem.example_in;
        pExOut.innerText = problem.example_out;
        pPoints.innerText = `${problem.points || 0} Points`;
        
    } catch (err) {
         pTitle.innerText = "Failed to load problem.";
         console.error(err);
    }
}

// Anti-Cheat System
let violations = 0;
const MAX_VIOLATIONS = 3;

// Monaco Editor Initialization
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editorContainer'), {
        value: '# Write your solution here\n# Do not cheat!\n',
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false }
    });
    
    // Anti-Cheat: Disable Paste via Monaco configuration
    editor.onKeyDown(function(e) {
        if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV) {
            e.preventDefault();
            consoleOutput.innerHTML = `<span style="color:var(--danger-color);">[ANTI-CHEAT] Paste disabled.</span>`;
        }
    });

    languageSelect.addEventListener('change', (e) => {
        let lang = 'python';
        if(e.target.value === '50') lang = 'c';
        else if(e.target.value === '54') lang = 'cpp';
        monaco.editor.setModelLanguage(editor.getModel(), lang);
    });

    // Initial check for split screen
    checkWindowSize();
});

async function logViolation(type) {
    violations++;
    const message = type === 'tab_switch' ? "Tab switching or leaving the page is prohibited!" : 
                    type === 'fullscreen_exit' ? "Exiting fullscreen is prohibited!" :
                    "Window resizing or split-screen is prohibited!";
    
    warningOverlay.querySelector('p').innerText = `${message} Violation ${violations}/${MAX_VIOLATIONS}. Further violations will lead to disqualification.`;
    warningOverlay.classList.add('active');

    try {
        const res = await fetch(`${API_BASE}/anti-cheat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: parseInt(userId), event: type, count: 1 })
        });
        const data = await res.json();
        if (data.restricted) {
            alert("Disqualified! You have exceeded the violation limit.");
            submitBtn.disabled = true;
            submitBtn.innerText = "Disqualified";
            runBtn.disabled = true;
            editor.updateOptions({ readOnly: true });
        }
    } catch (e) {
        console.error("Failed to log violation", e);
    }
}

// 1. Fullscreen Enforcement
function enterFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
}

document.addEventListener('click', () => {
    if (violations < MAX_VIOLATIONS) enterFullscreen();
}, { once: true });

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && violations < MAX_VIOLATIONS) {
        logViolation('fullscreen_exit');
    }
});

// 2. Tab Switching Detection
document.addEventListener('visibilitychange', () => {
    if (document.hidden && violations < MAX_VIOLATIONS) {
        logViolation('tab_switch');
    }
});

// 3. Window Resize / Split Screen Detection
function checkWindowSize() {
    // If width is less than 85% of available screen width, it's likely split screen or small window
    const isSmall = window.innerWidth < (screen.availWidth * 0.85);
    if (!document.fullscreenElement && isSmall && violations < MAX_VIOLATIONS) {
        logViolation('window_resize');
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkWindowSize, 1000);
});

// Anti-Cheat: Context menu right click disable
document.addEventListener('contextmenu', event => event.preventDefault());

// Action Handlers
runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    runBtn.innerText = "Running...";
    consoleOutput.innerHTML += `\n\n<span style="color:var(--accent-color);">Executing on Judge0...</span>`;
    terminalConsole.scrollTop = terminalConsole.scrollHeight;
    
    try {
        const res = await fetch(`https://ce.judge0.com/submissions?base64_encoded=false&wait=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                source_code: editor.getValue(), 
                language_id: parseInt(languageSelect.value),
                stdin: terminalInput.value
            })
        });
        const data = await res.json();
        
        if (data.stderr) {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--danger-color);">Error / Stderr:</strong>\n${data.stderr}`;
        } else if (data.compile_output) {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--danger-color);">Compilation Error:</strong>\n${data.compile_output}`;
        } else if (data.stdout !== null && data.stdout !== undefined) {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--success-color);">Output:</strong>\n${data.stdout}\n<span style="color:var(--text-muted); font-size:0.8em;">Execution Time: ${data.time}s</span>`;
        } else {
           const desc = data.status ? data.status.description : 'Unknown Status';
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--accent-color);">Status:</strong> ${desc}`;
        }
    } catch (e) {
        consoleOutput.innerHTML += `\n\n<span style="color:var(--danger-color);">Judge0 API is unreachable or returned an error.</span>`;
    }
    
    terminalConsole.scrollTop = terminalConsole.scrollHeight;
    runBtn.disabled = false;
    runBtn.innerText = "Run Code";
});

submitBtn.addEventListener('click', async () => {
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";
    consoleOutput.innerHTML = `<span style="color:var(--accent-color);">Executing on Judge0...</span>\n`;
    
    try {
        // 1. Run on Judge0
        const judgeRes = await fetch(`https://ce.judge0.com/submissions?base64_encoded=false&wait=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                source_code: editor.getValue(), 
                language_id: parseInt(languageSelect.value),
                stdin: terminalInput.value // Optional: use actual problem test cases if available in frontend
            })
        });
        const judgeData = await judgeRes.json();
        
        let verdict = judgeData.status ? judgeData.status.description : 'Error';
        let time = judgeData.time || 0;

        // 2. Clear output and show submitting
        consoleOutput.innerHTML += `Judge0 Result: ${verdict}\nSaving submission...`;

        // 3. Save to Database
        const res = await fetch(`${API_BASE}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                problem_id: problemId,
                code: editor.getValue(),
                language_id: parseInt(languageSelect.value),
                language_name: languageSelect.options[languageSelect.selectedIndex].text,
                verdict: verdict,
                time: time
            })
        });
        const data = await res.json();
        
        if (res.status === 409) {
            consoleOutput.innerHTML = `<span style="color:var(--danger-color); font-size:1.1rem; font-weight:600;">⚠ ${data.error}</span>`;
            submitBtn.innerText = "Already Submitted";
            return;
        }

        let color = verdict === 'Accepted' ? 'var(--success-color)' : 'var(--danger-color)';
        consoleOutput.innerHTML = `Verdict: <strong style="color:${color}; font-size:1.2rem;">${verdict}</strong>\nTime: ${time}s`;
        
        if (verdict === 'Accepted') {
            submitBtn.innerText = "Submitted ✓";
        } else {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Solution";
        }
        
    } catch(e) {
        consoleOutput.innerHTML = `<span style="color:var(--danger-color);">Error during submission process.</span>`;
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Solution";
    }
});

// Contest Window Enforcement
async function checkContestStatus() {
    try {
        const res = await fetch(`${API_BASE}/time`);
        const data = await res.json();
        
        const now = new Date(data.current_time).getTime();
        const start = new Date(data.start_time).getTime();
        const end = new Date(data.end_time).getTime();
        
        if (now < start) {
            runBtn.disabled = true;
            submitBtn.disabled = true;
            runBtn.innerText = "Locked";
            submitBtn.innerText = "Locked";
            consoleOutput.innerHTML = `<span style="color:var(--accent-color);">Contest has not started yet.</span>`;
        } else if (now > end) {
            runBtn.disabled = true;
            submitBtn.disabled = true;
            runBtn.innerText = "Ended";
            submitBtn.innerText = "Ended";
            consoleOutput.innerHTML = `<span style="color:var(--danger-color);">Contest has ended. Submissions closed.</span>`;
        } else {
            // Contest is active - don't re-enable if already submitted successfully
            if (submitBtn.innerText !== "Submitted ✓" && submitBtn.innerText !== "Already Submitted") {
                runBtn.disabled = false;
                submitBtn.disabled = false;
                runBtn.innerText = "Run Code";
                submitBtn.innerText = "Submit Solution";
            }
        }
    } catch (e) {
        console.error("Timer failed", e);
    }
}

// Initial check and periodic poll
checkContestStatus();
setInterval(checkContestStatus, 30000);
