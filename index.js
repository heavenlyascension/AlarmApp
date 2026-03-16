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

VOLERE MAPPING:
  FR1  — alarm with time + per-alarm sound selection
  FR2  — Wordle (default) or Crossword puzzle to dismiss alarm
  FR3  — user-selected reward image shown after puzzle completion
  FR4  — no snooze; back button during puzzle shows warning, not instant exit
  FR5  — recurring alarm via day picker; badge shown on card
  FR6  — clock visible on home AND as mini-clock during puzzle solving
  FR7  — optional alarm label/title; shown on card, game header, reward screen
  NFR1 — minimal steps: set alarm in ≤4 taps
  NFR2 — puzzle screen renders instantly (no async delay)
  NFR4 — streak counter increments on each successful puzzle completion
*/

/* ==============================
   WORD BANKS
   ============================== */

const WORDLE_WORDS = ['ANGEL', 'PRINCE', 'SLEEP', 'AWAKE', 'CLOCK'];

const CROSSWORD_PUZZLES = [
  {
    name: 'Puzzle 1', size: 9,
    entries: [
      { word: 'CLOCK',  row: 0, col: 0, dir: 'across', clue: 'Tells the time',        number: 1 },
      { word: 'SLEEP',  row: 0, col: 0, dir: 'down',   clue: 'What you do at night',  number: 1 },
      { word: 'ANGEL',  row: 2, col: 2, dir: 'across', clue: 'A heavenly being',      number: 2 },
      { word: 'AWAKE',  row: 0, col: 4, dir: 'down',   clue: 'Not asleep',            number: 3 },
      { word: 'PRINCE', row: 4, col: 0, dir: 'across', clue: 'Royalty, below a king', number: 4 },
    ]
  },
  {
    name: 'Puzzle 2', size: 9,
    entries: [
      { word: 'AWAKE',  row: 0, col: 0, dir: 'across', clue: 'Alert and conscious',   number: 1 },
      { word: 'ANGEL',  row: 0, col: 0, dir: 'down',   clue: 'Wings and a halo',      number: 1 },
      { word: 'SLEEP',  row: 2, col: 2, dir: 'across', clue: 'Rest your eyes',        number: 2 },
      { word: 'CLOCK',  row: 0, col: 4, dir: 'down',   clue: 'Tick tock',             number: 3 },
      { word: 'PRINCE', row: 4, col: 1, dir: 'across', clue: 'Fairy tale hero',       number: 4 },
    ]
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
   RINGTONE (profile default)
   ============================== */

function selectRingtone(tone) {
  state.ringtone = tone;
  localStorage.setItem('ringtone', tone);
  document.querySelectorAll('#ringtone-list .ringtone-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tone === tone);
  });
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
    id:           Date.now(),
    label:        labelInput?.value.trim() || '',   // FR7: optional name
    time:         timeInput.value,
    days:         selectedDays,                      // FR5: recurring
    game:         activeGame ? activeGame.dataset.game : 'wordle', // FR2: default wordle
    tone:         tone,                              // FR1: per-alarm sound
    enabled:      true,
    rewardImage:  state.pendingImage || null,        // FR3
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

  list.innerHTML = state.alarms.map(alarm => {
    // FR5: recurring badge
    const recurBadge = alarm.days.length
      ? `<span class="alarm-card-recurring">↻ ${alarm.days.join(' ')}</span>`
      : '';
    // FR7: label shown on card
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
  const word = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
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
  if (!WORDLE_WORDS.includes(guess)) {
    shakeCurrentRow(); setWordleMessage('Not in word list'); return;
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
   CROSSWORD  (FR2)
   ============================== */

function startCrossword() {
  const puzzle = CROSSWORD_PUZZLES[Math.floor(Math.random() * CROSSWORD_PUZZLES.length)];
  const size   = puzzle.size;

  const answerGrid = Array.from({ length: size }, () => Array(size).fill(null));
  const cellMeta   = Array.from({ length: size }, () => Array(size).fill(null));

  puzzle.entries.forEach(entry => {
    for (let i = 0; i < entry.word.length; i++) {
      const r = entry.dir === 'across' ? entry.row     : entry.row + i;
      const c = entry.dir === 'across' ? entry.col + i : entry.col;
      answerGrid[r][c] = entry.word[i];
      if (!cellMeta[r][c]) cellMeta[r][c] = { numbers: [] };
      if (i === 0) cellMeta[r][c].numbers.push(entry.number);
    }
  });

  state.crossword = { puzzle, size, answerGrid, cellMeta, done: false };
  buildCrosswordUI();
  navigate('crossword');
  // FR7: alarm label in game header
  const lbl = document.getElementById('crossword-alarm-label');
  if (lbl) lbl.textContent = state.activeAlarm?.label || '';
}

function buildCrosswordUI() {
  const { puzzle, size, answerGrid, cellMeta } = state.crossword;

  // clues panel
  const cluesEl = document.getElementById('crossword-clues');
  cluesEl.innerHTML = '';
  puzzle.entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'clue-row';
    row.innerHTML = `
      <span class="clue-num">${entry.number}</span>
      <span class="clue-dir">${entry.dir === 'across' ? 'ACR' : 'DWN'}</span>
      <span class="clue-text">${entry.clue}</span>`;
    cluesEl.appendChild(row);
  });

  // grid
  const gridEl = document.getElementById('crossword-grid');
  gridEl.style.gridTemplateColumns = `repeat(${size}, 36px)`;
  gridEl.style.gridTemplateRows    = `repeat(${size}, 36px)`;
  gridEl.innerHTML = '';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className   = 'cw-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (answerGrid[r][c] === null) {
        cell.classList.add('blocked');
      } else {
        const meta = cellMeta[r][c];
        if (meta?.numbers?.length) {
          const numEl = document.createElement('span');
          numEl.className   = 'cw-cell-num';
          numEl.textContent = meta.numbers[0];
          cell.appendChild(numEl);
        }
        const inp = document.createElement('input');
        inp.type        = 'text';
        inp.maxLength   = 1;
        inp.dataset.row = r;
        inp.dataset.col = c;
        inp.addEventListener('input', onCrosswordInput);
        inp.addEventListener('focus', onCrosswordFocus);
        cell.appendChild(inp);
      }
      gridEl.appendChild(cell);
    }
  }

  document.getElementById('crossword-message').textContent = '';
  document.getElementById('crossword-check-btn').onclick = checkCrossword;
}

function onCrosswordInput(e) {
  const inp = e.target;
  inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
  if (inp.value) focusNextCell(parseInt(inp.dataset.row), parseInt(inp.dataset.col));
}

function onCrosswordFocus(e) {
  clearCrosswordHighlights();
  const inp = e.target;
  inp.parentElement.classList.add('active');
  highlightWord(parseInt(inp.dataset.row), parseInt(inp.dataset.col));
}

function clearCrosswordHighlights() {
  document.querySelectorAll('.cw-cell').forEach(c => c.classList.remove('active', 'highlighted'));
}

function highlightWord(r, c) {
  state.crossword.puzzle.entries.forEach(entry => {
    for (let i = 0; i < entry.word.length; i++) {
      const er = entry.dir === 'across' ? entry.row     : entry.row + i;
      const ec = entry.dir === 'across' ? entry.col + i : entry.col;
      if (er === r && ec === c) {
        for (let j = 0; j < entry.word.length; j++) {
          const hr = entry.dir === 'across' ? entry.row     : entry.row + j;
          const hc = entry.dir === 'across' ? entry.col + j : entry.col;
          document.querySelector(`.cw-cell[data-row="${hr}"][data-col="${hc}"]`)
            ?.classList.add('highlighted');
        }
        return;
      }
    }
  });
}

function focusNextCell(r, c) {
  const { puzzle, size } = state.crossword;
  let dir = 'across';
  puzzle.entries.forEach(entry => {
    for (let i = 0; i < entry.word.length; i++) {
      const er = entry.dir === 'across' ? entry.row     : entry.row + i;
      const ec = entry.dir === 'across' ? entry.col + i : entry.col;
      if (er === r && ec === c) { dir = entry.dir; return; }
    }
  });
  const nr = dir === 'down'   ? r + 1 : r;
  const nc = dir === 'across' ? c + 1 : c;
  if (nr < size && nc < size) {
    document.querySelector(`input[data-row="${nr}"][data-col="${nc}"]`)?.focus();
  }
}

function checkCrossword() {
  const { answerGrid, size } = state.crossword;
  let correct = 0, total = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (answerGrid[r][c] === null) continue;
      total++;
      const inp  = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
      const cell = document.querySelector(`.cw-cell[data-row="${r}"][data-col="${c}"]`);
      if (!inp || !cell) continue;
      if (inp.value === answerGrid[r][c]) {
        correct++;
        cell.classList.add('correct-cell');
      } else {
        cell.style.borderColor = '#8c4a4a';
      }
    }
  }

  const msgEl = document.getElementById('crossword-message');
  if (correct === total) {
    msgEl.textContent = '✓ Perfect!';
    state.crossword.done = true;
    setTimeout(onGameWon, 800);
  } else {
    msgEl.textContent = `${correct} / ${total} correct — keep going!`;
    setTimeout(() => {
      document.querySelectorAll('.cw-cell:not(.correct-cell)').forEach(c => c.style.borderColor = '');
    }, 1200);
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
   INIT
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
});