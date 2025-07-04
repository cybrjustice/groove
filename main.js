// --- Accessibility: Zoom Button ---
document.getElementById('zoom-btn').onclick = function() {
  document.body.classList.toggle('body-zoomed');
  this.textContent = document.body.classList.contains('body-zoomed') ? "Reset Zoom" : "Zoom 200%";
};

// --- Tab switching logic ---
function showTab(tab) {
  document.getElementById('melody-section').style.display = (tab === 'melody' || tab === 'both') ? '' : 'none';
  document.getElementById('led-section').style.display = (tab === 'led' || tab === 'both') ? '' : 'none';
  document.getElementById('tab-melody').classList.toggle('active', tab === 'melody');
  document.getElementById('tab-led').classList.toggle('active', tab === 'led');
  document.getElementById('tab-both').classList.toggle('active', tab === 'both');
  if (tab === 'led' || tab === 'both') {
    setTimeout(renderLedGrid, 0);
    setTimeout(updateLedPattern, 0);
  }
  if (tab === 'melody' || tab === 'both') {
    setTimeout(renderPiano, 0);
  }
}
document.getElementById('tab-melody').onclick = () => showTab('melody');
document.getElementById('tab-led').onclick = () => showTab('led');
document.getElementById('tab-both').onclick = () => showTab('both');

// --- Piano Logic ---
const WHITE_KEYS = ['q','w','e','r','t','y','u','i','o','p','[',']','\\','PageUp','PageDown'];
const BLACK_KEYS = ['2','3','5','6','7','9','0','-','=','\''];
const WHITE_OFFSETS = [0,2,4,5,7,9,11,12,14,16,17,19,21,24,24];
const BLACK_OFFSETS = [1,3,6,8,10,13,15,18,20,22,25];
let currentOctave = 4, MIN_OCTAVE=1, MAX_OCTAVE=7;

function renderPiano() {
  const wrap = document.getElementById('piano-wrap');
  wrap.innerHTML = '';
  const piano = document.createElement('div');
  piano.className = 'piano';
  WHITE_KEYS.forEach((k, i) => {
    const isSpecial = k === 'PageUp' || k === 'PageDown';
    const midi = getWhiteKeyMidi(i);
    const div = document.createElement('div');
    div.className = 'piano-key white' + (isSpecial ? ' special' : '');
    div.dataset.key = k;
    if (!isSpecial) {
      div.dataset.midi = midi;
      div.innerHTML = `<span class="key-note">${midiToNote(midi)}</span>`;
      div.onmousedown = () => { playNote(midi); addToMelody(midi); };
    } else {
      div.innerHTML = `<span class="key-note"></span>`;
      div.onmousedown = () => shiftOctave(k === 'PageUp' ? 1 : -1);
    }
    piano.appendChild(div);
  });
  BLACK_KEYS.forEach((k, i) => {
    if (!k) return;
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
  let octDiv = document.getElementById('octave-indicator');
  if(octDiv) octDiv.innerHTML = `Current Octave: <span id="octave-num">${currentOctave}</span>`;
}
function blackKeyPosition(i) {
  const positions = [1.6,2.6,4.6,5.6,6.6,8.6,9.6,11.6,12.6,13.6];
  return positions[i] * 36;
}
function getWhiteKeyMidi(i) { return 12 * currentOctave + WHITE_OFFSETS[i]; }
function getBlackKeyMidi(i) { return 12 * currentOctave + BLACK_OFFSETS[i]; }
function midiToNote(m) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[m % 12] + Math.floor(m / 12 - 1);
}
function shiftOctave(dir) {
  const prev = currentOctave;
  currentOctave += dir;
  if (currentOctave < MIN_OCTAVE) currentOctave = MIN_OCTAVE;
  if (currentOctave > MAX_OCTAVE) currentOctave = MAX_OCTAVE;
  if (prev !== currentOctave) renderPiano();
}
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
// Melody Recording
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
    updateMelodyHash();
  }
}
function backspaceMelody() {
  melody.pop();
  updateMelodyBar();
  updateMelodyHash();
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
  updateMelodyHash();
}
document.getElementById('melody-clear').onclick = clearMelody;
function startRecording() {
  melody = [];
  isRecording = true;
  melodyStartTime = Date.now();
  updateMelodyBar();
  updateMelodyButtons();
  updateMelodyHash();
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
      updateMelodyHash();
    } catch {
      melody = [];
      updateMelodyBar();
      updateMelodyButtons();
      updateMelodyHash();
    }
  };
  reader.readAsText(file);
};
// Melody SHA-256
async function updateMelodyHash() {
  if (!melody || !melody.length) {
    document.getElementById('melody-hash').textContent = '';
    return;
  }
  const midiArr = melody.map(n => n.midi);
  const timingArr = melody.map(n => n.time || 0);
  const bytes = new Uint8Array([...midiArr, ...timingArr]);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  document.getElementById('melody-hash').textContent = hash;
}
document.getElementById('melody-copy').onclick = function() {
  const hash = document.getElementById('melody-hash').textContent;
  if (hash) {
    navigator.clipboard.writeText(hash).then(()=>{
      document.getElementById('melody-copy-status').textContent = "Copied!";
      setTimeout(()=>document.getElementById('melody-copy-status').textContent = '', 1200);
    });
  }
};
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
// ENCODE (melody page)
document.getElementById('encode-btn').onclick = async function() {
  const msg = document.getElementById('encode-msg').value;
  if (!msg.trim()) {
    document.getElementById('encode-out').textContent = "Type a message.";
    return;
  }
  if (!melody.length) {
    document.getElementById('encode-out').textContent = "Record a melody first.";
    return;
  }
  const midiArr = melody.map(n => n.midi);
  const timingArr = melody.map(n => n.time || 0);
  const bytes = new Uint8Array([...midiArr, ...timingArr]);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const enc = btoa(unescape(encodeURIComponent(msg)));
  document.getElementById('encode-out').textContent = enc + "::" + hash;
};

///// --- LED GRID LOGIC + DECODE/CIPHER FEATURES --- /////
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
        updateLedPattern();
      };
      grid.appendChild(cell);
    }
  }
  gridWrap.appendChild(grid);
  updateLedPattern();
}
function getLedPattern() {
  return ledGrid.flat().map(v => v ? '1' : '0').join('');
}
function updateLedPattern() {
  document.getElementById('led-pattern').textContent = getLedPattern();
}
document.getElementById('led-pattern-copy').onclick = function() {
  const pattern = document.getElementById('led-pattern').textContent;
  if (pattern) {
    navigator.clipboard.writeText(pattern).then(()=>{
      document.getElementById('led-pattern-copy-status').textContent = "Copied!";
      setTimeout(()=>document.getElementById('led-pattern-copy-status').textContent = '', 1200);
    });
  }
};
document.getElementById('led-clear').onclick = function() {
  ledGrid = Array.from({length: ledGridRows}, () => Array(ledGridCols).fill(false));
  renderLedGrid();
  updateLedPattern();
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
        updateLedPattern();
      }
    } catch { /* ignore */ }
  };
  reader.readAsText(file);
};

// --- Pastel Palette ---
const pastelPalette = [
  "#a3cef1", "#ffb3c6", "#caffbf", "#fdffb6", "#ffd6a5",
  "#b5ead7", "#bdb2ff", "#ffc6ff", "#fffffc", "#ffe5d9",
  "#b2f7ef", "#f6dfeb", "#e7c6ff", "#e0aaff", "#f1c0e8"
];

// --- Morse Map (A-Z 0-9 space) ---
const morseMap = {
  A: ".-",    B: "-...",  C: "-.-.",  D: "-..",  E: ".",    F: "..-.",
  G: "--.",   H: "....",  I: "..",    J: ".---", K: "-.-",  L: ".-..",
  M: "--",    N: "-.",    O: "---",   P: ".--.", Q: "--.-", R: ".-.",
  S: "...",   T: "-",     U: "..-",   V: "...-", W: ".--",  X: "-..-",
  Y: "-.--",  Z: "--..",  1: ".----", 2: "..---",3: "...--",4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..",9: "----.",0: "-----",
  " ": "/"
};

// --- Fibonacci Generator ---
function* fibonacci() {
  let a = 1, b = 2;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// --- Map MIDI Pitch to Grid Cell (lowest = top left, highest = bottom right) ---
function midiToGridCell(midi, minMidi = 48, maxMidi = 72) {
  // Maps [minMidi, maxMidi] to grid 0..24 (row-major)
  let idx = Math.round(((midi - minMidi) / (maxMidi - minMidi)) * 24);
  idx = Math.max(0, Math.min(24, idx));
  return { row: Math.floor(idx / 5), col: idx % 5 };
}

// --- Convert Message to Morse String ---
function messageToMorseSequence(message) {
  return message.toUpperCase().split('').map(ch => morseMap[ch] || '').join(' ');
}

// --- Morse Sequence to Light+Sound Frames (Fibonacci-timed) ---
function morseToFrames(morse, color="#ffe600", durationBase=80, soundMidi=72) {
  let frames = [];
  let fib = fibonacci();
  let pos = { row: 2, col: 2 }; // Morse in center LED
  for (let symbol of morse) {
    if(symbol === ".") {
      let dur = fib.next().value * durationBase;
      frames.push({ leds: [{...pos, color}], duration: dur, sound: {midi: soundMidi, type: "dot"} });
      frames.push({ leds: [], duration: durationBase, sound: null }); // gap
    } else if(symbol === "-") {
      let dur = fib.next().value * durationBase * 2;
      frames.push({ leds: [{...pos, color}], duration: dur, sound: {midi: soundMidi, type: "dash"} });
      frames.push({ leds: [], duration: durationBase, sound: null }); // gap
    } else if(symbol === " ") {
      // Gap between letters
      frames.push({ leds: [], duration: durationBase * 4, sound: null });
      fib = fibonacci(); // reset Fibonacci for next letter
    } else {
      // e.g. "/", treat as word gap
      frames.push({ leds: [], duration: durationBase * 6, sound: null });
      fib = fibonacci();
    }
  }
  return frames;
}

// --- Melody to Frames (pitch-mapped, pastel color, pause handled, sound) ---
function melodyToFrames(melody, pastelPalette, minMidi=48, maxMidi=72) {
  let frames = [];
  let lastTime = 0;
  for(let i=0; i<melody.length; ++i) {
    let note = melody[i];
    let { row, col } = midiToGridCell(note.midi, minMidi, maxMidi);
    let color = pastelPalette[note.midi % pastelPalette.length];
    // Pause if needed
    if(i > 0 && note.time - lastTime > 300) {
      frames.push({ leds: [], duration: note.time - lastTime, sound: null });
    }
    frames.push({
      leds: [{ row, col, color }],
      duration: (melody[i+1]?.time || note.time + 300) - note.time,
      sound: { midi: note.midi, type: "melody" }
    });
    lastTime = note.time;
  }
  return frames;
}

// --- Playback Function for Frames (with sound) ---
function playFrames(frames, renderLedGrid, onDone) {
  let idx = 0;
  function showFrame() {
    if(idx >= frames.length) {
      if (onDone) onDone();
      return;
    }
    let frame = frames[idx];
    renderLedGrid(frame.leds);
    if(frame.sound) {
      playNote(frame.sound.midi, frame.sound.type);
    }
    setTimeout(showFrame, frame.duration);
    idx++;
  }
  showFrame();
}

// --- Render LED Grid: expects 25 .led-cell elements row-major order ---
function renderLedGrid(leds=[]) {
  let grid = Array.from({length: 5}, () => Array(5).fill("#20273c"));
  leds.forEach(({row, col, color}) => {
    if(row >= 0 && row < 5 && col >= 0 && col < 5) grid[row][col] = color;
  });
  let cells = document.querySelectorAll('.led-cell');
  for(let i=0;i<25;++i) {
    let row = Math.floor(i/5), col = i%5;
    cells[i].style.background = grid[row][col];
  }
}

// --- Play Note Function (triangle for melody, short blip for Morse) ---
function playNote(midi, type="melody") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    let freq = 440 * Math.pow(2, (midi - 69) / 12);
    o.frequency.value = freq;
    if (type === "melody") {
      o.type = 'triangle';
      g.gain.value = 0.18;
      o.connect(g).connect(ctx.destination);
      o.start();
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
      o.stop(ctx.currentTime + 0.19);
    } else if (type === "dot") {
      o.type = 'square';
      g.gain.value = 0.09;
      o.connect(g).connect(ctx.destination);
      o.start();
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.09);
      o.stop(ctx.currentTime + 0.10);
    } else if (type === "dash") {
      o.type = 'square';
      g.gain.value = 0.12;
      o.connect(g).connect(ctx.destination);
      o.start();
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.19);
      o.stop(ctx.currentTime + 0.20);
    }
    o.onended = () => { ctx.close(); };
  } catch (e) {}
}

// --- Hook up to button and run ---
document.addEventListener("DOMContentLoaded", function() {
  // Add this to your HTML: <button id="led-fib-morse">Fibonacci Morse Lightshow</button>
  const fibBtn = document.getElementById("led-fib-morse");
  if (!fibBtn) return;
  fibBtn.onclick = function() {
    if (!window.melody || !Array.isArray(window.melody) || window.melody.length === 0) {
      alert("Record or load a melody first!");
      return;
    }
    const userMsg = prompt("Enter a short message (A-Z 0-9):", "GO!");
    if (!userMsg) return;
    // Pick a Morse pitch (center C5: midi 72), or any
    const morsePitch = 72;
    const morse = messageToMorseSequence(userMsg);
    const morseFrames = morseToFrames(morse, "#ffe600", 80, morsePitch);
    const melodyFrames = melodyToFrames(window.melody, pastelPalette, 48, 72);
    const frames = [...morseFrames, ...melodyFrames];
    playFrames(frames, renderLedGrid, () => {
      // Optionally, reset grid after show
      setTimeout(() => renderLedGrid([]), 500);
    });
  };
});
// --- LED Playback with Loop, BPM, and Pastel Colors ---

const pastelPalette = [
  "#a3cef1", "#ffb3c6", "#caffbf", "#fdffb6", "#ffd6a5",
  "#b5ead7", "#bdb2ff", "#ffc6ff", "#fffffc", "#ffe5d9",
  "#b2f7ef", "#f6dfeb", "#e7c6ff", "#e0aaff", "#f1c0e8",
  "#f3d2c1", "#d0f4de", "#fcf6bd", "#f7d6e0", "#ccfff6"
];

let ledPlaybackActive = false;
let ledPlaybackIdx = 0;
let ledPlaybackTimer = null;

function getLedPatternArray() {
  // Returns array of {row, col} for cells that are ON
  const arr = [];
  for (let row = 0; row < ledGridRows; row++) {
    for (let col = 0; col < ledGridCols; col++) {
      if (ledGrid[row][col]) arr.push({ row, col });
    }
  }
  return arr;
}

function ledPlayStep(pattern, bpm) {
  if (!ledPlaybackActive) return;
  if (!pattern.length) return;
  const gridCells = Array.from(document.querySelectorAll('.led-cell'));
  // Remove previous animations/colors
  gridCells.forEach(cell => {
    cell.classList.remove('anim');
    cell.style.background = '';
  });

  // Get which cell to animate
  const step = ledPlaybackIdx % pattern.length;
  const { row, col } = pattern[step];
  const cellIdx = row * ledGridCols + col;
  const cell = gridCells[cellIdx];
  const color = pastelPalette[step % pastelPalette.length];
  if (cell) {
    cell.style.background = color;
    cell.classList.add('anim');
  }

  ledPlaybackIdx = (ledPlaybackIdx + 1) % pattern.length;
  // BPM: quarter notes per minute, step interval in ms
  const interval = 60000 / bpm;
  ledPlaybackTimer = setTimeout(() => ledPlayStep(pattern, bpm), interval);
}

function ledStartPlayback() {
  const pattern = getLedPatternArray();
  if (!pattern.length) {
    alert("No pattern to play!");
    return;
  }
  const bpm = parseInt(document.getElementById('led-bpm').value, 10) || 120;
  ledPlaybackActive = true;
  ledPlaybackIdx = 0;
  document.getElementById('led-play').disabled = true;
  document.getElementById('led-stop').disabled = false;
  ledPlayStep(pattern, bpm);
}

function ledStopPlayback() {
  ledPlaybackActive = false;
  clearTimeout(ledPlaybackTimer);
  document.getElementById('led-play').disabled = false;
  document.getElementById('led-stop').disabled = true;
  // Reset grid colors
  Array.from(document.querySelectorAll('.led-cell')).forEach(cell => {
    cell.classList.remove('anim');
    cell.style.background = '';
  });
}

document.getElementById('led-play').onclick = ledStartPlayback;
document.getElementById('led-stop').onclick = ledStopPlayback;

// If BPM changes during playback, update the interval
document.getElementById('led-bpm').onchange = function() {
  if (ledPlaybackActive) {
    ledStopPlayback();
    ledStartPlayback();
  }
};
// --- LED CIPHER --- //
function melodyToHash() {
  return melody.map(n => n.midi).join(',');
}
function ledToHash() {
  return ledGrid.map(row => row.map(c => c ? 1 : 0).join('')).join('|');
}
function bothToHash() {
  return melodyToHash() + '||' + ledToHash();
}
document.getElementById('encode-btn-led').onclick = function () {
  const msg = document.getElementById('cipher-input').value;
  const mode = document.getElementById('unlock-mode').value;
  let pwHash;
  if (mode === 'melody') pwHash = melodyToHash();
  else if (mode === 'led') pwHash = ledToHash();
  else pwHash = bothToHash();
  document.getElementById('cipher-output').textContent =
    btoa(unescape(encodeURIComponent(msg))) + '::' + pwHash;
};
document.getElementById('decode-btn-led').onclick = function () {
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
// Initial render
window.onload = function () {
  renderPiano();
  updateMelodyBar();
  updateMelodyButtons();
  renderLedGrid();
};
