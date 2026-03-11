const API_BASE = '/api';

const rulesModal = document.getElementById('rulesModal');
const openRulesBtn = document.getElementById('openRulesBtn');
const rulesLink = document.getElementById('rulesLink');
const closeRulesBtn = document.getElementById('closeRulesBtn');

const enterContestBtn = document.getElementById('enterContestBtn');
const statusMessage = document.getElementById('statusMessage');

// Modal logic
const openModal = (e) => { e?.preventDefault(); rulesModal.classList.add('active'); };
const closeModal = () => rulesModal.classList.remove('active');

openRulesBtn.addEventListener('click', openModal);
rulesLink.addEventListener('click', openModal);
closeRulesBtn.addEventListener('click', closeModal);
rulesModal.addEventListener('click', (e) => {
  if (e.target === rulesModal) closeModal();
});

// Timer Logic
const updateTimer = (serverTimeInfo) => {
  const { current_time, start_time, end_time, is_active } = serverTimeInfo;
  const now = new Date(current_time).getTime();
  const start = new Date(start_time).getTime();
  const end = new Date(end_time).getTime();

  let targetTime;
  let label = "Contest Starts In";

  if (now < start) {
    targetTime = start;
    enterContestBtn.disabled = true;
    statusMessage.innerText = "";
  } else if (now >= start && now <= end) {
    targetTime = end;
    label = "Contest Ends In";
    enterContestBtn.disabled = false;
    enterContestBtn.onclick = () => window.location.href = './problems.html';
    statusMessage.innerText = "Contest is Active!";
    statusMessage.style.color = "var(--success-color)";
  } else {
    targetTime = now - 1000; // Past
    label = "Contest Ended";
    enterContestBtn.disabled = true;
    statusMessage.innerText = "The contest has officially ended.";
  }

  document.getElementById('timerLabel').innerText = label;

  const difference = targetTime - now;

  if (difference <= 0) {
    document.getElementById('days').innerText = '00';
    document.getElementById('hours').innerText = '00';
    document.getElementById('minutes').innerText = '00';
    document.getElementById('seconds').innerText = '00';
    return;
  }

  const d = Math.floor(difference / (1000 * 60 * 60 * 24));
  const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((difference % (1000 * 60)) / 1000);

  document.getElementById('days').innerText = d.toString().padStart(2, '0');
  document.getElementById('hours').innerText = h.toString().padStart(2, '0');
  document.getElementById('minutes').innerText = m.toString().padStart(2, '0');
  document.getElementById('seconds').innerText = s.toString().padStart(2, '0');
};

let serverTimeOffset = 0;
let contestData = null;

const initTimer = async () => {
    try {
        const res = await fetch(`${API_BASE}/time`);
        const data = await res.json();
        contestData = data;
        const localNow = Date.now();
        const serverNow = new Date(data.current_time).getTime();
        serverTimeOffset = serverNow - localNow;
        
        setInterval(() => {
            const currentSimulatedServerTime = new Date(Date.now() + serverTimeOffset).toISOString();
            updateTimer({ ...contestData, current_time: currentSimulatedServerTime });
        }, 1000);
    } catch (err) {
        console.error("Failed to fetch time", err);
        statusMessage.innerText = "Error connecting to server...";
    }
};

initTimer();
