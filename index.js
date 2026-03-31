// index.js
/*
PROJECT DESCRIPTION:
Prototype of a functioning alarm app by Dina Nguyen
Idea by Team Sleep.

FUNCTIONS:
Allow for user input name for homescreen greeting
View alarms button (current set alarms and test button for each)
Set new alarm button (creates new alarm)
	- Select time
	- Select day(s)
	- Select crossword vs. wordle
	- Select difficulty (still considering if to add this)
	- Insert user selected image from gallery
	- Set alarm button (sends it to view all alarms)
	
Navbar
	- Consistently at bottom (similar to apps)
	
Alarm
	- Plays a sound
	- User interaction for 2+ minutes will muffle sound
	- Completion screen (user hits ok to return home)
	
Wordle
	- Has a keyboard so user can see which letters are in correct place
	- Cannot guess words that aren't real
	- For prototype only going to have a database of 5 words
	- 1:1 with the newyorktimes Wordle UI except with our color palette
	
Crossword 
	- Database of 2 puzzle sets
	- Hints are small on the top of screen
	- Doesn't need keyboard
 */

/* ==============================
   WORD BANKS
   ============================== */

// possible answers
const WORDLE_ANSWERS = ['TEACH', 'LEARN', 'SLEEP', 'AWAKE', 'CLOCK'];
const CROSSWORD_PUZZLES = [
  {
    name: "Crossword",
    rows: 5,
    cols: 5,
    entries: [
      { word: "SLEEP", row: 0, col: 0, direction: "across", clue: "What this app helps you get", number: 1 },
      { word: "SOLAR", row: 0, col: 0, direction: "down",   clue: "_____ energy/panel", number: 2 },
      { word: "BED",   row: 2, col: 2, direction: "across", clue: "Where you wake up from", number: 3 },
    ],
  },
	{
	  name: "Crossword",
	  rows: 5,
	  cols: 5,
	  entries: [
	    { word: "AWAKE", row: 0, col: 0, direction: "across", clue: "No longer sleeping", number: 1 },
	    { word: "ALARM", row: 0, col: 0, direction: "down",   clue: "What wakes you up", number: 2 },
	    { word: "RISE", row: 2, col: 1, direction: "across", clue: "Get out of bed", number: 3 },
	  ],
	}
];

/* ==============================
   STATE
   ============================== */

let state = {
  username:      localStorage.getItem('username') || 'user',
  theme:         localStorage.getItem('theme')    || 'dark',
  ringtone:      localStorage.getItem('ringtone') || 'beep',  // default ringtone
  alarms:        JSON.parse(localStorage.getItem('alarms') || '[]'),
  streak:        parseInt(localStorage.getItem('streak') || '0'),
  lastWakeDate:  localStorage.getItem('lastWakeDate') || null,
  currentScreen: 'home',
  wordle:        null,
  crossword:     null,
  activeAlarm:   null,
  pendingImage:  null,       // base64 for alarm being created
  alarmRingtone: 'beep',    // ringtone selected in set-alarm form
};

/* ==============================
   NAVIGATION
   ============================== */

function navigate(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + screenName);
  if (target) target.classList.add('active');
  state.currentScreen = screenName;

  // FR4: hide nav during active puzzle; show on all other screens
  const nav = document.getElementById('bottom-nav');
  const inGame = screenName === 'wordle' || screenName === 'crossword';
  if (nav) nav.classList.toggle('hidden', inGame);

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
  if (screenName === 'profile') {
    document.getElementById('nav-profile')?.classList.add('active-nav');
  }

  // update mini-clocks immediately on navigate
  updateMiniClocks();
}

/* ==============================
   CLOCK  (FR6)
   ============================== */

function updateClock() {
  const now = new Date();
  const h   = String(now.getHours()).padStart(2, '0');
  const m   = String(now.getMinutes()).padStart(2, '0');
  const s   = String(now.getSeconds()).padStart(2, '0');

  const el = document.getElementById('home-clock');
  if (el) el.textContent = `${h}:${m}:${s}`;

  const dateEl = document.getElementById('home-date');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  updateMiniClocks();
}

// FR6: mini clock visible during puzzle
function updateMiniClocks() {
  const now = new Date();
  const h   = String(now.getHours()).padStart(2, '0');
  const m   = String(now.getMinutes()).padStart(2, '0');
  const time = `${h}:${m}`;
  ['wordle-mini-clock', 'crossword-mini-clock'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = time;
  });
}

/* ==============================
   USERNAME
   ============================== */

function applyUsername(name) {
  const clean = name.trim() || 'user';
  state.username = clean;
  localStorage.setItem('username', clean);
  const el = document.getElementById('display-name');
  if (el) el.textContent = clean;
  const pd = document.getElementById('profile-name-display');
  if (pd) pd.textContent = clean;
}

/* ==============================
   THEME
   ============================== */

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.checked = (theme === 'light');
  const label = document.getElementById('theme-label');
  if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
}

/* ==============================
   RINGTONE
   ============================== */
   
// Initialize click listeners for the ringtone buttons
document.getElementById('ringtone-list').addEventListener('click', (e) => {
  // Find the closest button element in case the user clicks the icon or name span
  const btn = e.target.closest('.ringtone-btn');
  
  if (btn) {
    const selectedTone = btn.dataset.tone;
    selectRingtone(selectedTone);
  }
});

function selectRingtone(tone) {
  state.ringtone = tone;
  localStorage.setItem('ringtone', tone);

  // Update UI: Remove 'active' from all, add to the selected one
  const buttons = document.querySelectorAll('#ringtone-list .ringtone-btn');
  buttons.forEach(btn => {
    if (btn.dataset.tone === tone) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  console.log("Ringtone updated to:", tone);
}

/* ==============================
   ALARMS  (FR1 FR5 FR7)
   ============================== */

function saveAlarm() {
  const timeInput = document.getElementById('alarm-time');
  const labelInput = document.getElementById('alarm-label');
  const selectedDays = [...document.querySelectorAll('.day-btn.selected')].map(b => b.dataset.day);
  const activeGame = document.querySelector('.game-btn.active');

  // FR1: require time
  if (!timeInput.value) { showToast('Please pick a time.'); return; }

  // FR1: per-alarm sound
  const toneBtn = document.querySelector('#setalarm-ringtone-list .ringtone-btn.active');
  const tone = toneBtn ? toneBtn.dataset.tone : state.ringtone;

	const alarm = {
	  id: Date.now(),
	  label: labelInput?.value.trim() || '',
	  time: timeInput.value,
	  days: selectedDays,
	  game: activeGame ? activeGame.dataset.game : 'wordle',
	  tone: tone,
	  enabled: true,
	  rewardImage: state.pendingImage || null,
	  lastTriggered: null
	};

  state.alarms.push(alarm);
  localStorage.setItem('alarms', JSON.stringify(state.alarms));
  renderAlarmList();
  resetAlarmForm();
  navigate('home');
  showToast('Alarm set for ' + formatTime(alarm.time));
}

function resetAlarmForm() {
  const labelInput = document.getElementById('alarm-label');
  if (labelInput) labelInput.value = '';
  // reset image upload
  state.pendingImage = null;
  const preview = document.getElementById('reward-image-preview');
  const placeholder = document.getElementById('image-upload-placeholder');
  const removeBtn = document.getElementById('remove-img-btn');
  const input = document.getElementById('reward-image-input');
  if (preview)     { preview.style.display = 'none'; preview.src = ''; }
  if (placeholder) placeholder.style.display = 'flex';
  if (removeBtn)   removeBtn.style.display = 'none';
  if (input)       input.value = '';
  // reset day selection
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
  // reset game to wordle default (FR2)
  document.querySelectorAll('.game-btn').forEach(b => b.classList.remove('active'));
  const wordle = document.querySelector('.game-btn[data-game="wordle"]');
  if (wordle) wordle.classList.add('active');
  // reset ringtone in form to default
  syncFormRingtone(state.ringtone);
}

function syncFormRingtone(tone) {
  document.querySelectorAll('#setalarm-ringtone-list .ringtone-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tone === tone);
  });
}

function formatTime(t) {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

function renderAlarmList() {
  const list = document.getElementById('alarm-list');
  if (!list) return;

  if (state.alarms.length === 0) {
    list.innerHTML = '<div class="alarm-empty">No alarms set yet. Tap + to add one.</div>';
    return;
  }

  const sortedAlarms = [...state.alarms].sort((a, b) => {
  return a.time.localeCompare(b.time);
});

list.innerHTML = sortedAlarms.map(alarm => {
  const recurBadge = alarm.days.length
    ? `<span class="alarm-card-recurring">↻ ${alarm.days.join(' ')}</span>`
    : '';

  const labelLine = alarm.label
    ? `<div class="alarm-card-label">${alarm.label}</div>`
    : '';

  return `
  <div class="alarm-card" data-id="${alarm.id}">
    <div>
      ${labelLine}
      <div class="alarm-card-time">${formatTime(alarm.time)}</div>
      <div class="alarm-card-meta">${alarm.game} · ${alarm.tone}</div>
      ${recurBadge}
    </div>
    <div class="alarm-card-actions">
      <button class="card-action-btn" onclick="testAlarm(${alarm.id})">Test</button>
      <button class="card-action-btn" onclick="deleteAlarm(${alarm.id})">Delete</button>
    </div>
  </div>`;
}).join('');
}

function deleteAlarm(id) {
  state.alarms = state.alarms.filter(a => a.id !== id);
  localStorage.setItem('alarms', JSON.stringify(state.alarms));
  renderAlarmList();
}

// "play" on alarm card — launches its puzzle (FR2)
function testAlarm(id) {
  const alarm = state.alarms.find(a => a.id === id);
  if (!alarm) return;
  state.activeAlarm = alarm;
  if (alarm.game === 'wordle') startWordle();
  else startCrossword();
}

/* ==============================
   IMAGE UPLOAD  (FR3)
   ============================== */

function initImageUpload() {
  const area        = document.getElementById('image-upload-area');
  const input       = document.getElementById('reward-image-input');
  const placeholder = document.getElementById('image-upload-placeholder');
  const preview     = document.getElementById('reward-image-preview');
  const removeBtn   = document.getElementById('remove-img-btn');
  if (!area || !input) return;

  area.addEventListener('click', (e) => {
    if (e.target === removeBtn) return;
    input.click();
  });

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      state.pendingImage       = e.target.result;
      preview.src              = e.target.result;
      preview.style.display    = 'block';
      placeholder.style.display = 'none';
      removeBtn.style.display  = 'block';
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.pendingImage         = null;
    preview.src                = '';
    preview.style.display      = 'none';
    placeholder.style.display  = 'flex';
    removeBtn.style.display    = 'none';
    input.value                = '';
  });
}

/* ==============================
   STREAK  (NFR4)
   ============================== */

function renderStreak() {
  const bar     = document.getElementById('streak-bar');
  const countEl = document.getElementById('streak-count');
  if (!bar || !countEl) return;
  // only show when streak > 0 (NFR4)
  bar.style.display = state.streak > 0 ? 'flex' : 'none';
  countEl.textContent = state.streak;
}

function incrementStreak() {
  const today     = new Date().toDateString();
  if (state.lastWakeDate === today) return; // already counted today
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  state.streak    = (state.lastWakeDate === yesterday) ? state.streak + 1 : 1;
  state.lastWakeDate = today;
  localStorage.setItem('streak', state.streak);
  localStorage.setItem('lastWakeDate', today);
  renderStreak();
}

/* ==============================
   FR4: ABANDON WARNING
   — back btn during puzzle shows warning instead of instant exit
   ============================== */

function confirmAbandonGame() {
  showToast('Complete the puzzle to dismiss the alarm!');
  // gentle shake the game screen to reinforce FR4
  const screen = document.getElementById('screen-' + state.currentScreen);
  if (screen) {
    screen.style.animation = 'none';
    void screen.offsetWidth;
    screen.style.animation = '';
  }
}

/* ==============================
   WORDLE  (FR2)
   ============================== */

function startWordle() {
  const word = WORDLE_ANSWERS[Math.floor(Math.random() * WORDLE_ANSWERS.length)];
  state.wordle = {
    answer:       word,
    maxGuesses:   6,
    currentGuess: [],
    guesses:      [],
    keyStates:    {},
    done:         false,
  };
  buildWordleUI();
  navigate('wordle');
  // FR7: show alarm label in game header
  const lbl = document.getElementById('wordle-alarm-label');
  if (lbl) lbl.textContent = state.activeAlarm?.label || '';
}

function buildWordleUI() {
  const wl  = state.wordle;
  const len = wl.answer.length;

  const grid = document.getElementById('wordle-grid');
  grid.innerHTML = '';
  for (let r = 0; r < wl.maxGuesses; r++) {
    const row = document.createElement('div');
    row.className = 'wordle-row';
    row.id = `wrow-${r}`;
    for (let c = 0; c < len; c++) {
      const tile = document.createElement('div');
      tile.className = 'wordle-tile';
      tile.id = `wtile-${r}-${c}`;
      row.appendChild(tile);
    }
    grid.appendChild(row);
  }

  updateWordleAttemptsLabel();

  const kb = document.getElementById('wordle-keyboard');
  kb.innerHTML = '';
  [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫'],
  ].forEach(rowKeys => {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-kb-row';
    rowKeys.forEach(k => {
      const btn = document.createElement('button');
      btn.className   = 'wordle-key' + (k === 'ENTER' || k === '⌫' ? ' wide' : '');
      btn.textContent = k;
      btn.dataset.key = k;
      btn.addEventListener('click', () => handleWordleKey(k));
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });

  document.getElementById('wordle-message').textContent = '';
}

function updateWordleAttemptsLabel() {
  const wl   = state.wordle;
  const left = wl.maxGuesses - wl.guesses.length;
  const el   = document.getElementById('wordle-attempts-left');
  if (el) el.textContent = wl.done ? '' : `${left} attempt${left !== 1 ? 's' : ''} left`;
}

function handleWordleKey(key) {
  const wl  = state.wordle;
  if (wl.done) return;
  const len = wl.answer.length;

  if (key === '⌫' || key === 'Backspace') {
    wl.currentGuess.pop();
  } else if (key === 'ENTER' || key === 'Enter') {
    submitWordleGuess(); return;
  } else if (/^[A-Z]$/i.test(key) && wl.currentGuess.length < len) {
    wl.currentGuess.push(key.toUpperCase());
  }
  renderWordleCurrentRow();
}

function renderWordleCurrentRow() {
  const wl  = state.wordle;
  const row = wl.guesses.length;
  for (let c = 0; c < wl.answer.length; c++) {
    const tile   = document.getElementById(`wtile-${row}-${c}`);
    if (!tile) continue;
    const letter = wl.currentGuess[c] || '';
    tile.textContent = letter;
    tile.className   = 'wordle-tile' + (letter ? ' filled' : '');
  }
}

function submitWordleGuess() {
  const wl  = state.wordle;
  const len = wl.answer.length;

  if (wl.currentGuess.length < len) {
    shakeCurrentRow(); setWordleMessage(`Need ${len} letters`); return;
  }

	const guess = wl.currentGuess.join('');
	
	if (!/^[A-Z]+$/.test(guess)) {
	  setWordleMessage('Only letters allowed');
	  return;
	}

  const result = scoreWordleGuess(guess, wl.answer);
  const rowIdx = wl.guesses.length;
  wl.guesses.push({ guess, result });
  wl.currentGuess = [];

  result.forEach((res, c) => {
    setTimeout(() => {
      const tile = document.getElementById(`wtile-${rowIdx}-${c}`);
      if (!tile) return;
      tile.textContent = guess[c];
      tile.className   = `wordle-tile ${res}`;
    }, c * 120);
  });

  setTimeout(() => {
    result.forEach((res, c) => {
      const letter = guess[c];
      const cur    = wl.keyStates[letter];
      if (cur !== 'correct') {
        if (res === 'correct')                           wl.keyStates[letter] = 'correct';
        else if (res === 'present' && cur !== 'correct') wl.keyStates[letter] = 'present';
        else if (!cur)                                   wl.keyStates[letter] = 'absent';
      }
    });
    updateWordleKeys();
    updateWordleAttemptsLabel();

    if (guess === wl.answer) {
      wl.done = true;
      setWordleMessage('');
      setTimeout(onGameWon, 600);
    } else if (wl.guesses.length >= wl.maxGuesses) {
      wl.done = true;
      setWordleMessage(`The word was ${wl.answer}`);
      setTimeout(onGameWon, 1800);
    } else {
      setWordleMessage('');
    }
  }, len * 120 + 200);
}

function scoreWordleGuess(guess, answer) {
  const result    = Array(answer.length).fill('absent');
  const remaining = answer.split('');
  // pass 1: correct positions
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) { result[i] = 'correct'; remaining[i] = null; }
  }
  // pass 2: present letters
  for (let i = 0; i < answer.length; i++) {
    if (result[i] === 'correct') continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx !== -1) { result[i] = 'present'; remaining[idx] = null; }
  }
  return result;
}

function updateWordleKeys() {
  document.querySelectorAll('.wordle-key').forEach(btn => {
    const k = btn.dataset.key;
    const s = state.wordle.keyStates[k];
    btn.className = 'wordle-key'
      + (k === 'ENTER' || k === '⌫' ? ' wide' : '')
      + (s ? ` ${s}` : '');
  });
}

function shakeCurrentRow() {
  const row = document.getElementById(`wrow-${state.wordle.guesses.length}`);
  if (!row) return;
  row.querySelectorAll('.wordle-tile').forEach(t => {
    t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
  });
}

function setWordleMessage(msg) {
  const el = document.getElementById('wordle-message');
  if (el) el.textContent = msg;
}

// physical keyboard support for Wordle
document.addEventListener('keydown', (e) => {
  if (state.currentScreen !== 'wordle') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Backspace')          handleWordleKey('⌫');
  else if (e.key === 'Enter')         handleWordleKey('ENTER');
  else if (/^[a-zA-Z]$/.test(e.key)) handleWordleKey(e.key.toUpperCase());
});

/* ==============================
/* ==============================
   CROSSWORD  (FR2)
   — follows the React example pattern:
     · cells turn green instantly when correct
     · auto-completes when all cells are right (no Check button)
     · clues shown with → / ↓ arrows like the example
   ============================== */

function startCrossword() {
  const puzzle = CROSSWORD_PUZZLES[Math.floor(Math.random() * CROSSWORD_PUZZLES.length)];

  const rows = puzzle.rows;
  const cols = puzzle.cols;

  const answerGrid = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  const cellMeta = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  puzzle.entries.forEach(entry => {
    for (let i = 0; i < entry.word.length; i++) {
      const r = entry.direction === "across" ? entry.row : entry.row + i;
      const c = entry.direction === "across" ? entry.col + i : entry.col;

      answerGrid[r][c] = entry.word[i];

      if (!cellMeta[r][c]) cellMeta[r][c] = { numbers: [] };
      if (i === 0) cellMeta[r][c].numbers.push(entry.number);
    }
  });

  state.crossword = {
    puzzle,
    rows,
    cols,
    answerGrid,
    cellMeta,
    done: false,
  };

  buildCrosswordUI();
  navigate("crossword");

  // FR7: show alarm label in game header
  const lbl = document.getElementById('crossword-alarm-label');
  if (lbl) lbl.textContent = state.activeAlarm?.label || '';

  // Give-up button: show after 5 minutes if puzzle not done
  const giveUpBtn = document.getElementById('give-up-btn');
  if (giveUpBtn) {
    giveUpBtn.style.display = 'none';
    giveUpBtn.onclick = () => {
      state.crossword.done = true;
      stopAlarmSound();
      showToast('Alarm dismissed.');
      navigate('home');
    };
    setTimeout(() => {
      if (state.crossword && !state.crossword.done) {
        giveUpBtn.style.display = 'block';
      }
    }, 5 * 60 * 1000);
  }
}

function buildCrosswordUI() {
  const { puzzle, rows, cols, answerGrid, cellMeta } = state.crossword;

  // ---- Clues panel (→ across, ↓ down like the example) ----
  const cluesEl = document.getElementById('crossword-clues');
  cluesEl.innerHTML = '';

  const acrossEntries = puzzle.entries.filter(e => e.direction === 'across')
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const downEntries   = puzzle.entries.filter(e => e.direction === 'down')
    .sort((a, b) => a.row - b.row || a.col - b.col);

  const acrossHead = document.createElement('div');
  acrossHead.className = 'clue-section-head';
  acrossHead.textContent = 'Across';
  cluesEl.appendChild(acrossHead);

  acrossEntries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'clue-row';
    row.innerHTML = `<span class="clue-arrow">→</span><span class="clue-num">${entry.number}</span><span class="clue-text">${entry.clue}</span>`;
    cluesEl.appendChild(row);
  });

  const downHead = document.createElement('div');
  downHead.className = 'clue-section-head';
  downHead.textContent = 'Down';
  cluesEl.appendChild(downHead);

  downEntries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'clue-row';
    row.innerHTML = `<span class="clue-arrow">↓</span><span class="clue-num">${entry.number}</span><span class="clue-text">${entry.clue}</span>`;
    cluesEl.appendChild(row);
  });

  // ---- Grid ----
  const gridEl = document.getElementById('crossword-grid');
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
  gridEl.style.gridTemplateRows    = `repeat(${rows}, 40px)`;
  gridEl.innerHTML = '';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className   = 'cw-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (answerGrid[r][c] === null) {
        cell.classList.add('blocked');
      } else {
        // Cell number label — only on cells that START a word
        const nums = cellMeta[r][c]?.numbers;
        if (nums && nums.length > 0) {
          const numEl = document.createElement('span');
          numEl.className   = 'cw-cell-num';
          numEl.textContent = nums[0];
          cell.appendChild(numEl);
        }
        const inp = document.createElement('input');
        inp.type        = 'text';
        inp.maxLength   = 1;
        inp.dataset.row = r;
        inp.dataset.col = c;
        inp.addEventListener('input',  onCrosswordInput);
        inp.addEventListener('focus',  onCrosswordFocus);
        inp.addEventListener('keydown', onCrosswordKeydown);
        cell.appendChild(inp);
      }
      gridEl.appendChild(cell);
    }
  }

  // Hide the manual check button — auto-completes now
  const checkBtn = document.getElementById('crossword-check-btn');
  if (checkBtn) checkBtn.style.display = 'none';

  document.getElementById('crossword-message').textContent = 'Fill in the grid — correct letters turn green!';
}

function onCrosswordInput(e) {
  const inp = e.target;
  inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);

  const r = parseInt(inp.dataset.row);
  const c = parseInt(inp.dataset.col);

  // Immediately colour the cell green if correct, white if wrong
  checkCellCorrectness(r, c, inp);

  // Auto-advance to next cell in word directionection
  if (inp.value) focusNextCrosswordCell(r, c);

  // Check if entire puzzle is solved
  autoCheckCrosswordComplete();
}

function onCrosswordFocus(e) {
  clearCrosswordHighlights();
  const inp = e.target;
  inp.parentElement.classList.add('active');
  highlightWord(parseInt(inp.dataset.row), parseInt(inp.dataset.col));
}

// Backspace support
function onCrosswordKeydown(e) {
  if (e.key === 'Backspace') {
    const inp = e.target;
    const r   = parseInt(inp.dataset.row);
    const c   = parseInt(inp.dataset.col);
    if (!inp.value) {
      // Move back one cell in word directionection
      focusPrevCrosswordCell(r, c);
    } else {
      inp.value = '';
      checkCellCorrectness(r, c, inp);
    }
    e.preventDefault();
  }
}

function clearCrosswordHighlights() {
  document.querySelectorAll('.cw-cell').forEach(c => c.classList.remove('active', 'highlighted'));
}

function highlightWord(r, c) {
  state.crossword.puzzle.entries.forEach(entry => {
    for (let i = 0; i < entry.word.length; i++) {
      const er = entry.direction === 'across' ? entry.row     : entry.row + i;
      const ec = entry.direction === 'across' ? entry.col + i : entry.col;
      if (er === r && ec === c) {
        for (let j = 0; j < entry.word.length; j++) {
          const hr = entry.direction === 'across' ? entry.row     : entry.row + j;
          const hc = entry.direction === 'across' ? entry.col + j : entry.col;
          document.querySelector(`.cw-cell[data-row="${hr}"][data-col="${hc}"]`)
            ?.classList.add('highlighted');
        }
        return;
      }
    }
  });
}

// Turn a cell green immediately if the letter is correct
function checkCellCorrectness(r, c, inp) {
  const { answerGrid } = state.crossword;
  const cell = document.querySelector(`.cw-cell[data-row="${r}"][data-col="${c}"]`);
  if (!cell) return;
  if (inp.value && inp.value === answerGrid[r][c]) {
    cell.classList.add('correct-cell');
  } else {
    cell.classList.remove('correct-cell');
    cell.style.borderColor = '';
  }
}

// Auto-complete: check all cells silently — no button needed
function autoCheckCrosswordComplete() {
  const { answerGrid, rows, cols } = state.crossword;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (answerGrid[r][c] === null) continue;
      const inp = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
      if (!inp || inp.value !== answerGrid[r][c]) return; // not done yet
    }
  }
  // All correct!
  state.crossword.done = true;
  document.getElementById('crossword-message').textContent = '✓ Perfect!';
  setTimeout(onGameWon, 800);
}

function focusNextCrosswordCell(r, c) {
  const { puzzle, rows, cols } = state.crossword;
  let direction = 'across';
  // Find which word this cell belongs to and get its directionection
  for (const entry of puzzle.entries) {
    for (let i = 0; i < entry.word.length; i++) {
      const er = entry.direction === 'across' ? entry.row     : entry.row + i;
      const ec = entry.direction === 'across' ? entry.col + i : entry.col;
      if (er === r && ec === c) { direction = entry.direction; break; }
    }
  }
  const nr = direction === 'down'   ? r + 1 : r;
  const nc = direction === 'across' ? c + 1 : c;
  if (nr < rows && nc < cols) {
    const next = document.querySelector(`input[data-row="${nr}"][data-col="${nc}"]`);
    if (next) next.focus();
  }
}

function focusPrevCrosswordCell(r, c) {
  const { puzzle } = state.crossword;
  let direction = 'across';
  for (const entry of puzzle.entries) {
    for (let i = 0; i < entry.word.length; i++) {
      const er = entry.direction === 'across' ? entry.row     : entry.row + i;
      const ec = entry.direction === 'across' ? entry.col + i : entry.col;
      if (er === r && ec === c) { direction = entry.direction; break; }
    }
  }
  const pr = direction === 'down'   ? r - 1 : r;
  const pc = direction === 'across' ? c - 1 : c;
  if (pr >= 0 && pc >= 0) {
    const prev = document.querySelector(`input[data-row="${pr}"][data-col="${pc}"]`);
    if (prev) prev.focus();
  }
}

/* ==============================
   GAME WON
   ============================== */

function onGameWon() {
  incrementStreak();   // NFR4
  showReward(state.activeAlarm);
}

/* ==============================
   REWARD SCREEN  (FR3 FR7 NFR4)
   ============================== */

function showReward(alarm) {
  // FR3: reward image
  const imgWrap   = document.getElementById('reward-img-wrap');
  const rewardImg = document.getElementById('reward-img');
  if (alarm?.rewardImage) {
    rewardImg.src         = alarm.rewardImage;
    imgWrap.style.display = 'block';
  } else {
    imgWrap.style.display = 'none';
  }

  // FR7: alarm name on reward screen
  const nameEl = document.getElementById('reward-alarm-name');
  if (nameEl) {
    nameEl.textContent    = alarm?.label || '';
    nameEl.style.display  = alarm?.label ? 'block' : 'none';
  }

  // NFR4: streak
  const rewardStreak      = document.getElementById('reward-streak');
  const rewardStreakCount = document.getElementById('reward-streak-count');
  if (state.streak > 0 && rewardStreak && rewardStreakCount) {
    rewardStreakCount.textContent = state.streak;
    rewardStreak.style.display   = 'flex';
    const sub = document.getElementById('reward-sub');
    if (sub) sub.textContent = state.streak === 1
      ? 'first day — keep it going!'
      : `${state.streak} days in a row!`;
  }

  navigate('reward');
  launchConfetti();
}

function dismissReward() {
  renderStreak();
  navigate('home');
}

/* ==============================
   CONFETTI
   ============================== */

function launchConfetti() {
  const container = document.getElementById('reward-confetti');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#e2dadb','#a2a7a5','#dae2df','#6d696a','#ffffff','#c9d4d0'];
  for (let i = 0; i < 90; i++) {
    const piece = document.createElement('div');
    piece.className              = 'confetti-piece';
    piece.style.left             = Math.random() * 100 + 'vw';
    piece.style.top              = '-10px';
    piece.style.background       = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width            = (5 + Math.random() * 8) + 'px';
    piece.style.height           = (5 + Math.random() * 8) + 'px';
    piece.style.borderRadius     = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.animationDuration = (1.8 + Math.random() * 2.4) + 's';
    piece.style.animationDelay   = (Math.random() * 1.2) + 's';
    container.appendChild(piece);
  }
}

/* ==============================
   TOAST
   ============================== */

let toastTimeout;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ==============================
   INITIAL
   ============================== */

document.addEventListener('DOMContentLoaded', () => {
	
  // FR6: live clock
  updateClock();
  setInterval(updateClock, 1000);

  applyUsername(state.username);
  applyTheme(state.theme);
  selectRingtone(state.ringtone);
  syncFormRingtone(state.ringtone);
  renderAlarmList();
  renderStreak();
  initImageUpload();

  // prefill name input
  const nameInput = document.getElementById('name-input');
  if (nameInput) nameInput.value = state.username === 'user' ? '' : state.username;

  // save name
  document.getElementById('save-name-btn')?.addEventListener('click', () => {
    const val = document.getElementById('name-input').value;
    if (!val.trim()) { showToast('Please enter a name.'); return; }
    applyUsername(val); showToast('Name updated!');
  });

  // theme toggle
  document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
    applyTheme(e.target.checked ? 'light' : 'dark');
  });

	// alarm triggers on time
	setInterval(() => {
	  const now = new Date();
	  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	  const today = ['Su','Mo','Tu','We','Th','Fr','Sa'][now.getDay()];
	  const todayDate = now.toDateString();

	  state.alarms.forEach(alarm => {
		if (!alarm.enabled) return;
		if (alarm.time !== currentTime) return;

		if (alarm.days.length > 0 && !alarm.days.includes(today)) return;
		if (alarm.lastTriggered === todayDate) return;
		if (state.activeAlarm?.id === alarm.id) return;

		// dont trigger if alr triggered
		alarm.lastTriggered = todayDate;
		localStorage.setItem('alarms', JSON.stringify(state.alarms));

		state.activeAlarm = alarm;

		if (alarm.game === 'wordle') startWordle();
		else startCrossword();
	  });
	}, 10000); // check for time every 10s

  // profile ringtone (default)
  document.querySelectorAll('#ringtone-list .ringtone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectRingtone(btn.dataset.tone);
      syncFormRingtone(btn.dataset.tone); // sync to set-alarm form too
    });
  });

  // set-alarm form ringtone (per-alarm, FR1)
  document.querySelectorAll('#setalarm-ringtone-list .ringtone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#setalarm-ringtone-list .ringtone-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // day picker (FR5)
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });

  // game picker (FR2 — wordle default)
  document.querySelectorAll('.game-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.game-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // save alarm (FR1)
  document.getElementById('save-alarm-btn')?.addEventListener('click', saveAlarm);
})
