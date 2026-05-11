const timerDisplay = document.getElementById('timerDisplay');
const modeLabel = document.getElementById('modeLabel');
const statusMessage = document.getElementById('statusMessage');
const startPauseBtn = document.getElementById('startPauseBtn');
const stopBtn = document.getElementById('stopBtn');
const resetHistoryBtn = document.getElementById('resetHistoryBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const bgImageInput = document.getElementById('bgImageInput');
const bgOpacity = document.getElementById('bgOpacity');
const opacityLabel = document.getElementById('opacityLabel');
const applyBgBtn = document.getElementById('applyBgBtn');
const doneSettingsBtn = document.getElementById('doneSettingsBtn');
const preloadedThumbs = document.getElementById('preloadedThumbs');
const tasksRailBtn = document.getElementById('tasksRailBtn');
const summaryRailBtn = document.getElementById('summaryRailBtn');
const sideRail = document.querySelector('.side-rail');
const taskSidebar = document.getElementById('taskSidebar');
const summarySidebar = document.getElementById('summarySidebar');
const heatmapHeader = document.getElementById('heatmapHeader');
const heatmapGrid = document.getElementById('heatmapGrid');
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

let workMinutes = 50; let breakMinutes = 10; let isWorkMode = true;
let totalSeconds = workMinutes * 60; let remainingSeconds = totalSeconds;
let isRunning = false; let intervalId = null;
let focusedSecondsTotal = 0; let waitingForManualStart = false;
let targetEndTimestampMs = null; let lastPerfNow = null;
let bgImageData = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const preloadedImageNames = ['bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg'];

const renderPreloadedThumbs = () => {
  preloadedThumbs.innerHTML = '';
  preloadedImageNames.forEach((name) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'thumb-item';
    const img = document.createElement('img');
    const url = `assets/backgrounds/${name}`;
    img.src = url;
    img.alt = name;
    img.onerror = () => { item.style.display = 'none'; };
    item.appendChild(img);
    item.addEventListener('click', () => {
      preloadedThumbs.querySelectorAll('.thumb-item').forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      bgImageData = url;
    });
    preloadedThumbs.appendChild(item);
  });
};

const syncRailVisibility = () => {
  const hide = taskSidebar.classList.contains('open') || summarySidebar.classList.contains('open');
  sideRail.classList.toggle('hidden', hide);
};


const playAlert = (times = 1) => {
  const sound = soundSelect.value;
  if (sound === 'off') return;
  const patterns = { simple: [660], bell: [900, 650], chime: [700, 900, 1200] };
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

const updateDisplay = () => {
  timerDisplay.textContent = formatTime(remainingSeconds);
  modeLabel.textContent = isWorkMode ? `Work Session (${workMinutes} min)` : `Break Session (${breakMinutes} min)`;
};

const updateFocusedTotal = () => { totalFocusedTime.textContent = formatDuration(focusedSecondsTotal); };
const resetCurrentMode = () => { totalSeconds = (isWorkMode ? workMinutes : breakMinutes) * 60; remainingSeconds = totalSeconds; updateDisplay(); };

const dailyFocus = {};

const slotKeyFromDate = (dateObj) => {
  const h = dateObj.getHours();
  const m = dateObj.getMinutes();
  if (h < 7 || h >= 22) return null;
  return (h - 7) * 2 + (m >= 30 ? 1 : 0);
};

const dateKey = (d) => d.toISOString().slice(0,10);

const renderHeatmap = () => {
  heatmapHeader.innerHTML = '';
  for (let i = 0; i < 30; i += 1) {
    const mark = document.createElement('span');
    mark.textContent = i % 2 === 0 ? `${7 + i/2}` : '';
    heatmapHeader.appendChild(mark);
  }
  heatmapGrid.innerHTML = '';
  for (let back = 0; back < 7; back += 1) {
    const d = new Date(); d.setDate(d.getDate() - back);
    const key = dateKey(d);
    const row = document.createElement('div'); row.className = 'heatmap-row';
    const label = document.createElement('div'); label.className = 'heatmap-day'; label.textContent = key.slice(5); row.appendChild(label);
    for (let slot = 0; slot < 30; slot += 1) {
      const v = dailyFocus[key]?.[slot] || 0;
      const cell = document.createElement('div');
      let level = 0; if (v > 0) level = 1; if (v >= 10) level = 2; if (v >= 20) level = 3; if (v >= 30) level = 4;
      cell.className = `heatmap-cell ${level ? `heatmap-level-${level}` : ''}`;
      row.appendChild(cell);
    }
    heatmapGrid.appendChild(row);
  }
};

const addLogEntry = (secondsFocused) => {
  focusedSecondsTotal += secondsFocused;
  updateFocusedTotal();
renderHeatmap();
renderPreloadedThumbs();
syncRailVisibility();
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Focused ${Math.floor(secondsFocused / 60)}m ${secondsFocused % 60}s`;
  activityLog.prepend(item);
  emptyState.classList.add('hidden');

  const now = new Date();
  const key = dateKey(now);
  const slot = slotKeyFromDate(now);
  if (slot !== null) {
    if (!dailyFocus[key]) dailyFocus[key] = {};
    dailyFocus[key][slot] = (dailyFocus[key][slot] || 0) + Math.round(secondsFocused / 60);
  }
  renderHeatmap();
};

const clearRunningInterval = () => {
  clearInterval(intervalId);
  intervalId = null;
  targetEndTimestampMs = null;
  lastPerfNow = null;
};

const onSessionFinished = () => {
  clearRunningInterval();
  isRunning = false;

  if (isWorkMode) {
    addLogEntry(totalSeconds);
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

const syncRemainingFromClock = () => {
  if (!isRunning || targetEndTimestampMs === null) return;
  const nowMs = Date.now();
  const remainingMs = Math.max(0, targetEndTimestampMs - nowMs);
  const nextSeconds = Math.ceil(remainingMs / 1000);
  if (nextSeconds !== remainingSeconds) {
    remainingSeconds = nextSeconds;
    updateDisplay();
  }
  if (remainingMs <= 0) onSessionFinished();
};

const startAccurateTimer = () => {
  const nowDateMs = Date.now();
  const perfNow = performance.now();
  targetEndTimestampMs = nowDateMs + remainingSeconds * 1000;
  lastPerfNow = perfNow;

  intervalId = setInterval(() => {
    const perfDelta = performance.now() - lastPerfNow;
    lastPerfNow = performance.now();
    if (perfDelta > 1500) {
      syncRemainingFromClock();
      return;
    }
    syncRemainingFromClock();
  }, 250);
};

const stopTimer = ({ keepMode = true } = {}) => {
  clearRunningInterval();
  isRunning = false;
  waitingForManualStart = false;
  startPauseBtn.textContent = 'Start';
  statusMessage.textContent = '';
  if (!keepMode) isWorkMode = true;
  resetCurrentMode();
};

const setPresetState = (activeButton = null) => presets.forEach((preset) => {
  const isActive = preset === activeButton;
  preset.classList.toggle('active', isActive);
  preset.setAttribute('aria-pressed', isActive ? 'true' : 'false');
});

startPauseBtn.addEventListener('click', async () => {
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (!isRunning) {
    isRunning = true;
    waitingForManualStart = false;
    statusMessage.textContent = '';
    startPauseBtn.textContent = 'Pause';
    startAccurateTimer();
    return;
  }
  syncRemainingFromClock();
  clearRunningInterval();
  isRunning = false;
  startPauseBtn.textContent = 'Start';
});

stopBtn.addEventListener('click', () => {
  if (isWorkMode && isRunning) {
    syncRemainingFromClock();
    const focusedSeconds = Math.max(0, totalSeconds - remainingSeconds);
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

resetHistoryBtn.addEventListener('click', () => { focusedSecondsTotal = 0; activityLog.innerHTML = ''; emptyState.classList.remove('hidden'); updateFocusedTotal();
renderHeatmap();
renderPreloadedThumbs();
syncRailVisibility(); });
themeToggleBtn.addEventListener('click', () => { const darkActive = document.body.classList.toggle('dark'); themeToggleBtn.textContent = darkActive ? '☀️ Light Mode' : '🌙 Dark Mode'; });
tasksRailBtn.addEventListener('click', () => { taskSidebar.classList.toggle('open'); summarySidebar.classList.remove('open'); syncRailVisibility(); });
summaryRailBtn.addEventListener('click', () => { summarySidebar.classList.toggle('open'); taskSidebar.classList.remove('open'); syncRailVisibility(); });
previewSoundBtn.addEventListener('click', async () => { if (audioCtx.state === 'suspended') await audioCtx.resume(); playAlert(1); });



document.addEventListener('click', (event) => {
  const target = event.target;
  const insideTask = taskSidebar.contains(target);
  const insideSummary = summarySidebar.contains(target);
  const insideRail = sideRail.contains(target);
  if (!insideTask && !insideSummary && !insideRail) {
    taskSidebar.classList.remove('open');
    summarySidebar.classList.remove('open');
    syncRailVisibility();
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    syncRemainingFromClock();
  }
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

settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
doneSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

bgOpacity.addEventListener('input', () => {
  opacityLabel.textContent = `${bgOpacity.value}%`;
});

applyBgBtn.addEventListener('click', () => {
  const opacity = Number(bgOpacity.value) / 100;
  document.body.style.setProperty('--custom-bg-opacity', opacity.toString());
  if (bgImageData) {
    document.body.style.setProperty('--custom-bg-image', `url(${bgImageData})`);
  }
});

bgImageInput.addEventListener('change', () => {
  const file = bgImageInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    bgImageData = event.target?.result;
  };
  reader.readAsDataURL(file);
});

updateDisplay();
updateFocusedTotal();
renderHeatmap();
renderPreloadedThumbs();
syncRailVisibility();
