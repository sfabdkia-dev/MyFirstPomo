const timerDisplay = document.getElementById('timerDisplay');
const modeLabel = document.getElementById('modeLabel');
const startPauseBtn = document.getElementById('startPauseBtn');
const stopBtn = document.getElementById('stopBtn');
const resetHistoryBtn = document.getElementById('resetHistoryBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const applyCustomBtn = document.getElementById('applyCustomBtn');
const customWorkInput = document.getElementById('customWork');
const customBreakInput = document.getElementById('customBreak');
const totalFocusedTime = document.getElementById('totalFocusedTime');
const presets = document.querySelectorAll('.preset');
const activityLog = document.getElementById('activityLog');
const emptyState = document.getElementById('emptyState');

let workMinutes = 50;
let breakMinutes = 10;
let isWorkMode = true;
let totalSeconds = workMinutes * 60;
let remainingSeconds = totalSeconds;
let isRunning = false;
let intervalId = null;
let workSessionStart = null;
let focusedSecondsTotal = 0;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${hours}h ${mins}m ${secs}s`;
};

const updateDisplay = () => {
  timerDisplay.textContent = formatTime(remainingSeconds);
  modeLabel.textContent = isWorkMode
    ? `Work Session (${workMinutes} min)`
    : `Break Session (${breakMinutes} min)`;
};

const updateFocusedTotal = () => {
  totalFocusedTime.textContent = formatDuration(focusedSecondsTotal);
};

const resetCurrentMode = () => {
  totalSeconds = (isWorkMode ? workMinutes : breakMinutes) * 60;
  remainingSeconds = totalSeconds;
  updateDisplay();
};

const addLogEntry = (secondsFocused) => {
  focusedSecondsTotal += secondsFocused;
  updateFocusedTotal();

  const mins = Math.floor(secondsFocused / 60);
  const secs = secondsFocused % 60;
  const item = document.createElement('li');
  const now = new Date();
  item.textContent = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Focused ${mins}m ${secs}s`;
  activityLog.prepend(item);
  emptyState.classList.add('hidden');
};

const stopTimer = ({ keepMode = true } = {}) => {
  clearInterval(intervalId);
  intervalId = null;
  isRunning = false;
  startPauseBtn.textContent = 'Start';

  if (!keepMode) {
    isWorkMode = true;
  }

  workSessionStart = null;
  resetCurrentMode();
};

const switchMode = () => {
  if (isWorkMode && workSessionStart !== null) {
    const focusedSeconds = totalSeconds - remainingSeconds;
    if (focusedSeconds > 0) {
      addLogEntry(focusedSeconds);
    }
    workSessionStart = null;
  }

  isWorkMode = !isWorkMode;
  totalSeconds = (isWorkMode ? workMinutes : breakMinutes) * 60;
  remainingSeconds = totalSeconds;
  updateDisplay();
};

const tick = () => {
  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
    updateDisplay();
    return;
  }
  switchMode();
};

const setPresetState = (activeButton = null) => {
  presets.forEach((preset) => {
    const isActive = preset === activeButton;
    preset.classList.toggle('active', isActive);
    preset.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
};

startPauseBtn.addEventListener('click', () => {
  if (!isRunning) {
    isRunning = true;
    startPauseBtn.textContent = 'Pause';
    if (isWorkMode && workSessionStart === null) {
      workSessionStart = Date.now();
    }
    intervalId = setInterval(tick, 1000);
    return;
  }

  isRunning = false;
  startPauseBtn.textContent = 'Start';
  clearInterval(intervalId);
  intervalId = null;
});

stopBtn.addEventListener('click', () => {
  if (isWorkMode && workSessionStart !== null) {
    const focusedSeconds = totalSeconds - remainingSeconds;
    if (focusedSeconds > 0) {
      addLogEntry(focusedSeconds);
    }
  }
  stopTimer({ keepMode: false });
});

applyCustomBtn.addEventListener('click', () => {
  const customWork = Number(customWorkInput.value);
  const customBreak = Number(customBreakInput.value);

  if (!Number.isFinite(customWork) || !Number.isFinite(customBreak) || customWork < 1 || customBreak < 1) {
    alert('Please enter valid focus and break durations (at least 1 minute each).');
    return;
  }

  workMinutes = customWork;
  breakMinutes = customBreak;
  isWorkMode = true;
  setPresetState(null);
  stopTimer({ keepMode: true });
});

presets.forEach((button) => {
  button.addEventListener('click', () => {
    setPresetState(button);
    workMinutes = Number(button.dataset.work);
    breakMinutes = Number(button.dataset.break);
    isWorkMode = true;
    stopTimer({ keepMode: true });
  });
});

resetHistoryBtn.addEventListener('click', () => {
  focusedSecondsTotal = 0;
  activityLog.innerHTML = '';
  emptyState.classList.remove('hidden');
  updateFocusedTotal();
});

themeToggleBtn.addEventListener('click', () => {
  const darkActive = document.body.classList.toggle('dark');
  themeToggleBtn.textContent = darkActive ? '☀️ Light Mode' : '🌙 Dark Mode';
});

updateDisplay();
updateFocusedTotal();
