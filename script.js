const timerDisplay = document.getElementById('timerDisplay');
const modeLabel = document.getElementById('modeLabel');
const startPauseBtn = document.getElementById('startPauseBtn');
const stopBtn = document.getElementById('stopBtn');
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

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const updateDisplay = () => {
  timerDisplay.textContent = formatTime(remainingSeconds);
  modeLabel.textContent = isWorkMode
    ? `Work Session (${workMinutes} min)`
    : `Break Session (${breakMinutes} min)`;
};

const resetCurrentMode = () => {
  totalSeconds = (isWorkMode ? workMinutes : breakMinutes) * 60;
  remainingSeconds = totalSeconds;
  updateDisplay();
};

const addLogEntry = (secondsFocused) => {
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

presets.forEach((button) => {
  button.addEventListener('click', () => {
    presets.forEach((preset) => {
      preset.classList.remove('active');
      preset.setAttribute('aria-pressed', 'false');
    });

    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');

    workMinutes = Number(button.dataset.work);
    breakMinutes = Number(button.dataset.break);
    isWorkMode = true;
    stopTimer({ keepMode: true });
  });
});

updateDisplay();
