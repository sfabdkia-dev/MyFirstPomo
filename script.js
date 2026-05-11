const timerDisplay = document.getElementById('timerDisplay');
const modeLabel = document.getElementById('modeLabel');
const statusMessage = document.getElementById('statusMessage');
const startPauseBtn = document.getElementById('startPauseBtn');
const stopBtn = document.getElementById('stopBtn');
const resetHistoryBtn = document.getElementById('resetHistoryBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const taskHandle = document.getElementById('taskHandle');
const taskSidebar = document.getElementById('taskSidebar');
const applyCustomBtn = document.getElementById('applyCustomBtn');
const customWorkInput = document.getElementById('customWork');
const customBreakInput = document.getElementById('customBreak');
const soundSelect = document.getElementById('soundSelect');
const previewSoundBtn = document.getElementById('previewSoundBtn');
const totalFocusedTime = document.getElementById('totalFocusedTime');
const presets = document.querySelectorAll('.preset');
const activityLog = document.getElementById('activityLog');
const emptyState = document.getElementById('emptyState');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const focusCard = document.getElementById('focusCard');

let workMinutes = 50; let breakMinutes = 10; let isWorkMode = true; let totalSeconds = workMinutes * 60;
let remainingSeconds = totalSeconds; let isRunning = false; let intervalId = null; let workSessionStart = null;
let focusedSecondsTotal = 0; let waitingForManualStart = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const playAlert = (times = 1) => {
  const sound = soundSelect.value;
  if (sound === 'off') return;
  const patterns = {
    simple: [660],
    bell: [900, 650],
    chime: [700, 900, 1200]
  };

  let delay = 0;
  for (let repeat = 0; repeat < times; repeat += 1) {
    patterns[sound].forEach((freq) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.22);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + delay); osc.stop(audioCtx.currentTime + delay + 0.25);
    delay += 0.18;
  });
    delay += 0.25;
  }
};

const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const formatDuration = (seconds) => `${Math.floor(seconds / 3600).toString().padStart(2, '0')}h ${Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')}m ${(seconds % 60).toString().padStart(2, '0')}s`;

const updateDisplay = () => { timerDisplay.textContent = formatTime(remainingSeconds); modeLabel.textContent = isWorkMode ? `Work Session (${workMinutes} min)` : `Break Session (${breakMinutes} min)`; };
const updateFocusedTotal = () => { totalFocusedTime.textContent = formatDuration(focusedSecondsTotal); };
const resetCurrentMode = () => { totalSeconds = (isWorkMode ? workMinutes : breakMinutes) * 60; remainingSeconds = totalSeconds; updateDisplay(); };

const addLogEntry = (secondsFocused) => {
  focusedSecondsTotal += secondsFocused; updateFocusedTotal();
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Focused ${Math.floor(secondsFocused / 60)}m ${secondsFocused % 60}s`;
  activityLog.prepend(item); emptyState.classList.add('hidden');
};

const stopTimer = ({ keepMode = true } = {}) => {
  clearInterval(intervalId); intervalId = null; isRunning = false; waitingForManualStart = false; startPauseBtn.textContent = 'Start'; statusMessage.textContent = '';
  if (!keepMode) isWorkMode = true;
  workSessionStart = null; resetCurrentMode();
};

const onSessionFinished = () => {
  clearInterval(intervalId); intervalId = null; isRunning = false;
  if (isWorkMode && workSessionStart !== null) {
    const focusedSeconds = totalSeconds - remainingSeconds;
    if (focusedSeconds > 0) addLogEntry(focusedSeconds);
    workSessionStart = null;
  }

  isWorkMode = !isWorkMode;
  resetCurrentMode();
  playAlert(isWorkMode ? 1 : 2);
  waitingForManualStart = true;
  startPauseBtn.textContent = 'Start';
  statusMessage.textContent = isWorkMode
    ? 'Break finished. Press Start when ready for focus.'
    : 'Focus finished. Press Start when ready for break.';
};

const tick = () => {
  if (remainingSeconds > 0) { remainingSeconds -= 1; updateDisplay(); return; }
  onSessionFinished();
};

const setPresetState = (activeButton = null) => presets.forEach((preset) => {
  const isActive = preset === activeButton; preset.classList.toggle('active', isActive); preset.setAttribute('aria-pressed', isActive ? 'true' : 'false');
});

startPauseBtn.addEventListener('click', async () => {
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (!isRunning) {
    isRunning = true; waitingForManualStart = false; statusMessage.textContent = ''; startPauseBtn.textContent = 'Pause';
    if (isWorkMode && workSessionStart === null) workSessionStart = Date.now();
    intervalId = setInterval(tick, 1000); return;
  }
  isRunning = false; startPauseBtn.textContent = 'Start'; clearInterval(intervalId); intervalId = null;
});

stopBtn.addEventListener('click', () => {
  if (isWorkMode && workSessionStart !== null) {
    const focusedSeconds = totalSeconds - remainingSeconds;
    if (focusedSeconds > 0) addLogEntry(focusedSeconds);
  }
  stopTimer({ keepMode: false });
});

applyCustomBtn.addEventListener('click', () => {
  const customWork = Number(customWorkInput.value); const customBreak = Number(customBreakInput.value);
  if (!Number.isFinite(customWork) || !Number.isFinite(customBreak) || customWork < 1 || customBreak < 1) { alert('Please enter valid focus and break durations.'); return; }
  workMinutes = customWork; breakMinutes = customBreak; isWorkMode = true; setPresetState(null); stopTimer({ keepMode: true });
});

presets.forEach((button) => button.addEventListener('click', () => {
  setPresetState(button); workMinutes = Number(button.dataset.work); breakMinutes = Number(button.dataset.break); isWorkMode = true; stopTimer({ keepMode: true });
}));

resetHistoryBtn.addEventListener('click', () => { focusedSecondsTotal = 0; activityLog.innerHTML = ''; emptyState.classList.remove('hidden'); updateFocusedTotal(); });
themeToggleBtn.addEventListener('click', () => { const darkActive = document.body.classList.toggle('dark'); themeToggleBtn.textContent = darkActive ? '☀️ Light Mode' : '🌙 Dark Mode'; });
taskHandle.addEventListener('click', () => { taskSidebar.classList.toggle('open'); });
previewSoundBtn.addEventListener('click', async () => {
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  playAlert(1);
});

addTaskBtn.addEventListener('click', () => {
  const taskText = taskInput.value.trim();
  if (!taskText) return;
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.textContent = taskText;
  btn.addEventListener('click', () => {
    taskList.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    focusCard.textContent = `🎯 Current Task: ${taskText}`;
  });
  li.appendChild(btn); taskList.appendChild(li); taskInput.value = '';
});

updateDisplay(); updateFocusedTotal();
