// main.js

// ======= PIANO KEYBOARD MAPPING =======

const WHITE_KEYS = [
  'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\', 'PageUp', 'PageDown'
];
// Add PgUp/PgDn as special keys for octave up/down (visual).

const BLACK_KEYS = [
  '2', '3',       // C# D#
  '5', '6', '7',  // F# G# A#
  '9', '0',       // C# D#
  '-', '=', "'"   // F# G# A#
  // (Leave out 'Delete')
];


const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 24, 24]; // Pad for PgUp/PgDn
const BLACK_OFFSETS = [1, 3, 6, 8, 10, 13, 15, 18, 20, 22, 25];


let currentOctave = 4;
const MIN_OCTAVE = 1, MAX_OCTAVE = 7;

// ======= UI: Render Piano =======
  function renderPiano() {
  const wrap = document.getElementById('piano-wrap');
  wrap.innerHTML = '';
  const piano = document.createElement('div');
  piano.className = 'piano';

  // Render white keys
  WHITE_KEYS.forEach((k, i) => {
    const isSpecial = k === 'PageUp' || k === 'PageDown';
    const midi = getWhiteKeyMidi(i);
    const div = document.createElement('div');
    div.className = 'piano-key white' + (isSpecial ? ' special' : '');
    div.dataset.key = k;
    if (!isSpecial) {
      div.dataset.midi = midi;
      div.innerHTML = `
        <span class="key-note">${midiToNote(midi)}</span>
      `;
      div.onmousedown = () => { playNote(midi); addToMelody(midi); };
    } else {
      div.innerHTML = `<span class="key-note"></span>`;
      div.onmousedown = () => shiftOctave(k === 'PageUp' ? 1 : -1);
    }
    piano.appendChild(div);
  });

  // Render black keys
  BLACK_KEYS.forEach((k, i) => {
    if (!k) return; // skip spacer slot
    const midi = getBlackKeyMidi(i);
    const div = document.createElement('div');
    div.className = 'piano-key black';
    div.dataset.midi = midi;
    div.dataset.key = k;
    div.style.left = `${blackKeyPosition(i)}px`;
    div.innerHTML = `<span class="key-note">${midiToNote(midi)}</span>`;
    div.onmousedown = () => { playNote(midi); addToMelody(midi); };
    piano.appendChild(div);
  });

  wrap.appendChild(piano);

  // Octave indicator
  let octDiv = document.getElementById('octave-indicator');
  if (!octDiv) {
    octDiv = document.createElement('div');
    octDiv.id = 'octave-indicator';
    octDiv.style = "margin: 8px 0 0 0; font-weight: bold; font-size: 1.1em; color: #888;";
    wrap.parentElement.insertBefore(octDiv, wrap.nextSibling);
  }
  octDiv.innerHTML = `Current Octave: <span id="octave-num">${currentOctave}</span>`;
}

  function blackKeyPosition(i) {
  // Shifted right .7 unit (from x.5 to x.6) for visual centering
  const positions = [
    1.6, 2.6,     // C#2 D#3 → between Q-W, W-E
    4.6, 5.6, 6.6,// F#5 G#6 A#7 → between R-T, T-Y, Y-U
    8.6, 9.6,     // C#9 D#0 → between I-O, O-P
    11.6, 12.6, 13.6 // F#- G#= A#'
  ];
  return positions[i] * 36;
}


function getWhiteKeyMidi(i) { return 12 * currentOctave + WHITE_OFFSETS[i]; }
function getBlackKeyMidi(i) { return 12 * currentOctave + BLACK_OFFSETS[i]; }
function midiToNote(m) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[m % 12] + Math.floor(m / 12 - 1);
}
function displayKeyLabel(k) {
  if (k === '\\') return '\\';
  if (k === '[') return '[';
  if (k === ']') return ']';
  if (k === '-') return '-';
  if (k === '=') return '=';
  if (k === "'") return "'";
  if (k === 'Delete') return 'Del';
  if (k === 'PageUp') return 'PgUp';
  if (k === 'PageDown') return 'PgDn';
  return k.length === 1 ? k.toUpperCase() : k;
}

// ======= OCTAVE SHIFT =======
function shiftOctave(dir) {
  const prev = currentOctave;
  currentOctave += dir;
  if (currentOctave < MIN_OCTAVE) currentOctave = MIN_OCTAVE;
  if (currentOctave > MAX_OCTAVE) currentOctave = MAX_OCTAVE;
  if (prev !== currentOctave) {
    renderPiano();
  }
}

// ======= NOTE PLAYBACK =======
function playNote(midi, vol=0.18) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  const g = ctx.createGain();
  g.gain.value = vol;
  o.connect(g).connect(ctx.destination);
  o.start();
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
  o.stop(ctx.currentTime + 0.19);
  o.onended = () => ctx.close();
  highlightKey(midi);
}
function highlightKey(midi) {
  document.querySelectorAll('.piano-key').forEach(k => k.classList.remove('active'));
  const el = document.querySelector(`.piano-key[data-midi="${midi}"]`);
  if (el) { el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 140); }
}
// Tab switching
document.getElementById('tab-melody').onclick = function() {
  document.getElementById('melody-section').style.display = '';
  document.getElementById('led-section').style.display = 'none';
  this.classList.add('active');
  document.getElementById('tab-led').classList.remove('active');
  document.getElementById('tab-both').classList.remove('active');
};
document.getElementById('tab-led').onclick = function() {
  document.getElementById('melody-section').style.display = 'none';
  document.getElementById('led-section').style.display = '';
  this.classList.add('active');
  document.getElementById('tab-melody').classList.remove('active');
  document.getElementById('tab-both').classList.remove('active');
};
document.getElementById('tab-both').onclick = function() {
  // Optional: implement as you wish, or just show both
  document.getElementById('melody-section').style.display = '';
  document.getElementById('led-section').style.display = '';
  this.classList.add('active');
  document.getElementById('tab-melody').classList.remove('active');
  document.getElementById('tab-led').classList.remove('active');
};
// ======= MELODY REC/PLAY/SAVE =======
let melody = [];
let isRecording = false;
let melodyPlaybackTimer = null;
let melodyStartTime = null;

function addToMelody(midi) {
  if (isRecording) {
    const t = Date.now();
    const relTime = melodyStartTime ? t - melodyStartTime : 0;
    melody.push({ midi, time: relTime });
    updateMelodyBar();
  }
}
function backspaceMelody() {
  melody.pop();
  updateMelodyBar();
}
function updateMelodyBar() {
  const bar = document.getElementById('melody-bar');
  bar.innerHTML = '';
  melody.forEach((n, i) => {
    const d = document.createElement('span');
    d.className = 'melody-note';
    d.textContent = midiToNote(n.midi);
    bar.appendChild(d);
  });
}
function clearMelody() {
  melody = [];
  updateMelodyBar();
}
document.getElementById('melody-clear').onclick = clearMelody;

function startRecording() {
  melody = [];
  isRecording = true;
  melodyStartTime = Date.now();
  updateMelodyBar();
  updateMelodyButtons();
}
function stopRecording() {
  isRecording = false;
  melodyStartTime = null;
  updateMelodyButtons();
}
function playMelody() {
  if (!melody.length) return;
  let idx = 0;
  function playNext() {
    if (idx >= melody.length) {
      updateMelodyBar();
      updateMelodyButtons();
      return;
    }
    const n = melody[idx];
    highlightPlayingNote(idx);
    playNote(n.midi, 0.23);
    idx++;
    if (idx < melody.length) {
      const nextDelay = melody[idx].time - (idx > 0 ? melody[idx-1].time : 0);
      melodyPlaybackTimer = setTimeout(playNext, nextDelay > 0 ? nextDelay : 120);
    } else {
      melodyPlaybackTimer = setTimeout(() => {
        updateMelodyBar();
        updateMelodyButtons();
      }, 400);
    }
  }
  updateMelodyButtons(true);
  playNext();
}
function highlightPlayingNote(idx) {
  document.querySelectorAll('.melody-note').forEach((el, i) => {
    if (i === idx) el.classList.add('playing');
    else el.classList.remove('playing');
  });
}
function updateMelodyButtons(isPlaying) {
  document.getElementById('melody-record').disabled = isRecording || isPlaying;
  document.getElementById('melody-stop').disabled = !isRecording && !isPlaying;
  document.getElementById('melody-play').disabled = isRecording || isPlaying || melody.length === 0;
  document.getElementById('melody-save').disabled = melody.length === 0;
  document.getElementById('melody-load').disabled = isRecording || isPlaying;
}
document.getElementById('melody-record').onclick = startRecording;
document.getElementById('melody-stop').onclick = function() {
  if (isRecording) stopRecording();
  if (melodyPlaybackTimer) {
    clearTimeout(melodyPlaybackTimer);
    melodyPlaybackTimer = null;
    updateMelodyBar();
    updateMelodyButtons();
  }
};
document.getElementById('melody-play').onclick = playMelody;
document.getElementById('melody-save').onclick = function() {
  if (melody.length === 0) return;
  const blob = new Blob([JSON.stringify(melody)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'melody.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>document.body.removeChild(a), 100);
};
document.getElementById('melody-load').onclick = function() {
  document.getElementById('melody-file').click();
};
document.getElementById('melody-file').onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      melody = JSON.parse(e.target.result);
      updateMelodyBar();
      updateMelodyButtons();
    } catch {
      melody = [];
      updateMelodyBar();
      updateMelodyButtons();
    }
  };
  reader.readAsText(file);
};

// ======= KEYBOARD EVENTS =======
document.addEventListener('keydown', e => {
  if (e.repeat) return;
  const k = e.key;
  if (k === 'Backspace') {
    e.preventDefault();
    backspaceMelody();
    return;
  }
  if (k === 'PageUp') { shiftOctave(1); return; }
  if (k === 'PageDown') { shiftOctave(-1); return; }
  let idx = WHITE_KEYS.indexOf(k);
  if (idx !== -1 && k !== 'PageUp' && k !== 'PageDown') {
    const midi = getWhiteKeyMidi(idx);
    playNote(midi);
    addToMelody(midi);
    return;
  }
  idx = BLACK_KEYS.indexOf(k);
  if (idx !== -1) {
    const midi = getBlackKeyMidi(idx);
    playNote(midi);
    addToMelody(midi);
    return;
  }
});

// --- LED GRID STATE & UI ---
const ledGridRows = 5, ledGridCols = 5;
let ledGrid = Array.from({length: ledGridRows}, () => Array(ledGridCols).fill(false));
function renderLedGrid() {
  const gridWrap = document.getElementById('led-grid-wrap');
  gridWrap.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'led-grid';
  for (let row = 0; row < ledGridRows; row++) {
    for (let col = 0; col < ledGridCols; col++) {
      const cell = document.createElement('div');
      cell.className = 'led-cell' + (ledGrid[row][col] ? ' on' : '');
      cell.onclick = () => {
        ledGrid[row][col] = !ledGrid[row][col];
        renderLedGrid();
        updateLedGridHash();
      };
      grid.appendChild(cell);
    }
  }
  gridWrap.appendChild(grid);
}

// --- MELODY JSON SHA-256 AUTH ---
let loadedMelody = null;
let loadedMelodyFilename = '';

document.getElementById('led-melody-load').onclick = () =>
  document.getElementById('led-melody-file').click();

document.getElementById('led-melody-file').onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  loadedMelodyFilename = file.name;
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      loadedMelody = Array.isArray(data) ? data : (data.melody || []);
      document.getElementById('led-melody-filename').textContent = loadedMelodyFilename;
      await updateMelodyHash();
    } catch {
      loadedMelody = null;
      document.getElementById('led-melody-filename').textContent = 'Invalid file';
      document.getElementById('led-melody-hash').textContent = '';
    }
  };
  reader.readAsText(file);
};

async function updateMelodyHash() {
  if (!loadedMelody) {
    document.getElementById('led-melody-hash').textContent = '';
    return;
  }
  // Accept both [{midi, time}] and [int]
  const midiArr = loadedMelody.map(n => (typeof n === 'object' ? n.midi : n));
  const timingArr = loadedMelody.map(n => (typeof n === 'object' ? n.time || 0 : 0));
  const bytes = new Uint8Array([...midiArr, ...timingArr]);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  document.getElementById('led-melody-hash').textContent = hash;
}
document.getElementById('led-melody-copy').onclick = function() {
  const hash = document.getElementById('led-melody-hash').textContent;
  if (hash) {
    navigator.clipboard.writeText(hash).then(()=>{
      document.getElementById('led-melody-copy-status').textContent = "Copied!";
      setTimeout(()=>document.getElementById('led-melody-copy-status').textContent = '', 1200);
    });
  }
};

// --- LED GRID AUTH CODE ---
function getLedGridCode() {
  return ledGrid.map(row => row.map(c => (c ? '1' : '0')).join('')).join('');
}
function updateLedGridHash() {
  const code = getLedGridCode();
  document.getElementById('led-grid-hash').textContent = code;
}
document.getElementById('led-grid-copy').onclick = function() {
  const code = document.getElementById('led-grid-hash').textContent;
  if (code) {
    navigator.clipboard.writeText(code).then(()=>{
      document.getElementById('led-grid-copy-status').textContent = "Copied!";
      setTimeout(()=>document.getElementById('led-grid-copy-status').textContent = '', 1200);
    });
  }
};

// --- LED GRID FILE CONTROLS ---
document.getElementById('led-clear').onclick = function() {
  ledGrid = Array.from({length: ledGridRows}, () => Array(ledGridCols).fill(false));
  renderLedGrid();
  updateLedGridHash();
};
document.getElementById('led-save').onclick = function() {
  const data = JSON.stringify(ledGrid);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ledgrid.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>document.body.removeChild(a), 100);
};
document.getElementById('led-load').onclick = function() {
  document.getElementById('led-file').click();
};
document.getElementById('led-file').onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data) && data.length === ledGridRows && data[0].length === ledGridCols) {
        ledGrid = data;
        renderLedGrid();
        updateLedGridHash();
      }
    } catch { /* ignore */ }
  };
  reader.readAsText(file);
};

// --- INIT LED TAB ---
function ledTabInit() {
  renderLedGrid();
  updateLedGridHash();
  document.getElementById('led-melody-filename').textContent = '';
  document.getElementById('led-melody-hash').textContent = '';
  document.getElementById('led-grid-hash').textContent = '';
}
if (document.readyState === "loading") {
  window.addEventListener('DOMContentLoaded', ledTabInit);
} else {
  ledTabInit();
}
// ======= Robust Encoding / Decoding (unchanged, but uses melody.map) =======
function melodyToHash() {
  // Use basic hash for demo
  return melody.map(n => n.midi).join(',');
}
// ledToHash, bothToHash, and cipher logic as before...

// ======= Piano Render on Load =======
window.onload = function () {
  renderPiano();
  updateMelodyBar();
  updateMelodyButtons();
  updateCapsStatus();
  // ... your other initializations ...
};
// --- Cipher: Encode/Decode melody lock using melody as password ---

// Base36 code alphabet, can be customized
const symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?! ';
const symbolToCode = {}, codeToSymbol = {};
for (let i = 0; i < symbols.length; ++i) {
  const code = i.toString(36);
  symbolToCode[symbols[i]] = code;
  codeToSymbol[code] = symbols[i];
}

function encodeTextToBase36(text) {
  text = text.toUpperCase();
  let code = '';
  for (let c of text) {
    let v = symbolToCode[c];
    if (!v) v = symbolToCode[' '];
    code += v;
  }
  return code;
}
function decodeBase36ToText(str) {
  let result = '';
  for (let ch of str) {
    let c = codeToSymbol[ch];
    if (!c) c = '?';
    result += c;
  }
  return result;
}

// Use your current melody (array of midi numbers) as password
async function hashMelody(mel) {
  const bytes = new Uint8Array(mel);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}


// ======= ROBUST ENCODING / DECODING =======
function melodyToHash() {
  return melody.map(n => n.midi).join(',');
}
function ledToHash() {
  return ledGrid.map(row => row.map(c => c ? 1 : 0).join('')).join('|');
}
function bothToHash() {
  return melodyToHash() + '||' + ledToHash();
}
document.getElementById('encode-btn').onclick = function () {
  const msg = document.getElementById('cipher-input').value;
  const mode = document.getElementById('unlock-mode').value;
  let pwHash;
  if (mode === 'melody') pwHash = melodyToHash();
  else if (mode === 'led') pwHash = ledToHash();
  else pwHash = bothToHash();
  document.getElementById('cipher-output').textContent =
    btoa(unescape(encodeURIComponent(msg))) + '::' + pwHash;
};
document.getElementById('decode-btn').onclick = function () {
  const val = document.getElementById('cipher-output').textContent.trim();
  if (!val.includes('::')) {
    document.getElementById('cipher-output').textContent = 'No encoded message to decode!';
    return;
  }
  const [enc, pwHash] = val.split('::');
  const mode = document.getElementById('unlock-mode').value;
  let inputHash;
  if (mode === 'melody') inputHash = melodyToHash();
  else if (mode === 'led') inputHash = ledToHash();
  else inputHash = bothToHash();
  if (inputHash !== pwHash) {
    document.getElementById('cipher-output').textContent = 'Wrong melody/pattern!';
    return;
  }
  const msg = decodeURIComponent(escape(atob(enc)));
  document.getElementById('cipher-output').textContent = `Decoded: ${msg}`;
};

// ======= INIT =======
window.onload = function () {
  renderPiano();
  updateMelodyBar();
  updateMelodyButtons();
  renderLedGrid();
};
