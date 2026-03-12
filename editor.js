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
const terminalInput = document.getElementById('terminalInput');
const consoleOutput = document.getElementById('consoleOutput');
const terminalConsole = document.getElementById('terminalConsole');
const runBtn = document.getElementById('runBtn');
const submitBtn = document.getElementById('submitBtn');
const languageSelect = document.getElementById('languageSelect');
const warningOverlay = document.getElementById('warningOverlay');

// Get Problem ID from URL
const urlParams = new URLSearchParams(window.location.search);
const problemId = urlParams.get('id');
const userId = localStorage.getItem('contest_user_id') || 1; 

if (!problemId) {
    pTitle.innerText = "Error: No problem selected";
} else {
    loadProblem();
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
        
    } catch (err) {
         pTitle.innerText = "Failed to load problem.";
         console.error(err);
    }
}

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
        // block ctrl+v and cmd+v
        if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV) {
            e.preventDefault();
            consoleOutput.innerHTML = `<span style="color:var(--danger-color);">[ANTI-CHEAT] Paste disabled.</span>`;
        }
    });

    languageSelect.addEventListener('change', (e) => {
        let lang = 'python';
        if(e.target.value === '50') lang = 'c';
        else if(e.target.value === '54') lang = 'cpp';
        else if(e.target.value === '62') lang = 'java';
        
        monaco.editor.setModelLanguage(editor.getModel(), lang);
    });
});

// Anti-Cheat: Context menu right click disable
document.addEventListener('contextmenu', event => event.preventDefault());

// Anti-Cheat: Tab Switch Detection
let tabSwitches = 0;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        tabSwitches++;
        warningOverlay.classList.add('active');
        fetch(`${API_BASE}/anti-cheat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: userId, event: 'tab_switch', count: tabSwitches })
        }).catch(e=>console.log(e));
    }
});

// Action Handlers
runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    runBtn.innerText = "Running...";
    consoleOutput.innerHTML += `\n\n<span style="color:var(--accent-color);">Compiling and executing...</span>`;
    terminalConsole.scrollTop = terminalConsole.scrollHeight;
    
    try {
        const res = await fetch(`${API_BASE}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                code: editor.getValue(), 
                language_id: parseInt(languageSelect.value),
                stdin: terminalInput.value
            })
        });
        const data = await res.json();
        
        if (data.error) {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--danger-color);">Server Error:</strong>\n${data.error}`;
        } else if(data.stderr) {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--danger-color);">Error / Stderr:</strong>\n${data.stderr}`;
        } else if (data.compile_output) {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--danger-color);">Compilation Error:</strong>\n${data.compile_output}`;
        } else if (data.stdout !== null && data.stdout !== undefined) {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--success-color);">Output:</strong>\n${data.stdout}\n<span style="color:var(--text-muted); font-size:0.8em;">Execution Time: ${data.time}s</span>`;
        } else if (data.message) {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--danger-color);">Message:</strong>\n${data.message}`;
        } else {
           consoleOutput.innerHTML += `\n\n<strong style="color:var(--danger-color);">Status:</strong> ${data.status ? data.status.description : 'Unknown Error'}\nNo output returned.`;
        }
    } catch (e) {
        consoleOutput.innerHTML += `\n\n<span style="color:var(--danger-color);">Server error or Judge0 API is unreachable.</span>`;
    }
    
    terminalConsole.scrollTop = terminalConsole.scrollHeight;
    runBtn.disabled = false;
    runBtn.innerText = "Run Code";
});

submitBtn.addEventListener('click', async () => {
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";
    consoleOutput.innerText = "Submitting code against hidden test cases...\n";
    
    try {
        const res = await fetch(`${API_BASE}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                problem_id: problemId,
                code: editor.getValue(),
                language_id: parseInt(languageSelect.value),
                language_name: languageSelect.options[languageSelect.selectedIndex].text
            })
        });
        const data = await res.json();
        
        if (res.status === 409) {
            // Already submitted — show error and keep button permanently disabled
            consoleOutput.innerHTML = `<span style="color:var(--danger-color); font-size:1.1rem; font-weight:600;">⚠ ${data.error}</span>`;
            submitBtn.innerText = "Already Submitted";
            // Keep button disabled
            return;
        }

        let color = data.verdict === 'Accepted' ? 'var(--success-color)' : 'var(--danger-color)';
        consoleOutput.innerHTML = `Verdict: <strong style="color:${color}; font-size:1.2rem;">${data.verdict}</strong>\nTime: ${data.time}s`;
        
        if (data.verdict === 'Accepted') {
            submitBtn.innerText = "Submitted ✓";
            // Keep disabled — one submission only
        } else {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Solution";
        }
        
    } catch(e) {
        consoleOutput.innerHTML = `<span style="color:var(--danger-color);">Server error during submission.</span>`;
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Solution";
    }
});
