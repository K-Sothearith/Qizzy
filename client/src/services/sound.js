/**
 * Qizzy Sound Engine
 * Synthesizes arcade-style game show audio using Web Audio API.
 * 100% self-contained, zero external audio asset dependencies.
 */

let audioCtx = null;
let isMutedState = localStorage.getItem('qizzy_sound_muted') === 'true';
let lobbyMusicTimer = null;
let isLobbyMusicPlaying = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isMuted() {
  return isMutedState;
}

export function toggleMute() {
  isMutedState = !isMutedState;
  localStorage.setItem('qizzy_sound_muted', isMutedState ? 'true' : 'false');
  if (isMutedState) {
    stopLobbyMusic();
  }
  window.dispatchEvent(new CustomEvent('qizzy:mute_change', { detail: { isMuted: isMutedState } }));
  return isMutedState;
}

export function setMuted(muted) {
  isMutedState = Boolean(muted);
  localStorage.setItem('qizzy_sound_muted', isMutedState ? 'true' : 'false');
  if (isMutedState) {
    stopLobbyMusic();
  }
  window.dispatchEvent(new CustomEvent('qizzy:mute_change', { detail: { isMuted: isMutedState } }));
}

/**
 * 1. Single-Tap Selection Sound (Snap / Pop)
 */
export function playTap() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * 2. Countdown Tension Tick (Clock / Woodblock)
 */
export function playTick(urgent = false) {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = urgent ? 'triangle' : 'sine';
  const baseFreq = urgent ? 880 : 520;
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.03);

  gain.gain.setValueAtTime(urgent ? 0.35 : 0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (urgent ? 0.09 : 0.06));

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * 3. Question / Game Start Ascending Chime
 */
export function playStart() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  const now = ctx.currentTime;

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + index * 0.08);

    gain.gain.setValueAtTime(0, now + index * 0.08);
    gain.gain.linearRampToValueAtTime(0.25, now + index * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.36);
  });
}

/**
 * 4. Correct Answer Joyful Chime
 */
export function playCorrect() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major)

  chord.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = idx === chord.length - 1 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.07);

    gain.gain.setValueAtTime(0, now + idx * 0.07);
    gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.07 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.07);
    osc.stop(now + idx * 0.07 + 0.46);
  });
}

/**
 * 5. Incorrect Answer Soft Thud / Buzzer
 */
export function playIncorrect() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const tones = [260, 220, 180];

  tones.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + idx * 0.1);

    gain.gain.setValueAtTime(0.22, now + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.22);

    // Lowpass filter for warm game-show thud
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.1);
    osc.stop(now + idx * 0.1 + 0.25);
  });
}

/**
 * 6. Podium Victory Celebration Fanfare
 */
export function playPodium() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const melody = [
    { freq: 523.25, time: 0.0, dur: 0.18 }, // C5
    { freq: 659.25, time: 0.18, dur: 0.18 }, // E5
    { freq: 783.99, time: 0.36, dur: 0.18 }, // G5
    { freq: 1046.5, time: 0.54, dur: 0.5 },  // C6
    { freq: 880.0,  time: 1.1, dur: 0.18 },  // A5
    { freq: 1046.5, time: 1.3, dur: 0.18 },  // C6
    { freq: 1174.66, time: 1.5, dur: 0.7 }  // D6
  ];

  melody.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.3, now + time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur + 0.05);
  });
}

/**
 * 7. Ambient Upbeat Lobby Groove Loop
 */
export function playLobbyMusic() {
  if (isMutedState || isLobbyMusicPlaying) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  isLobbyMusicPlaying = true;

  const chords = [
    [261.63, 329.63, 392.00], // C Maj
    [220.00, 261.63, 329.63], // A Min
    [174.61, 220.00, 261.63], // F Maj
    [196.00, 246.94, 293.66]  // G Maj
  ];

  let chordIndex = 0;

  function playStep() {
    if (!isLobbyMusicPlaying || isMutedState) {
      stopLobbyMusic();
      return;
    }

    const currentChord = chords[chordIndex % chords.length];
    chordIndex++;

    const now = ctx.currentTime;
    currentChord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * (i === 0 ? 0.5 : 1), now + i * 0.1);

      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.75);
    });

    // Soft percussion blip
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.frequency.setValueAtTime(140, now);
    kick.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    kickGain.gain.setValueAtTime(0.12, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    kick.connect(kickGain);
    kickGain.connect(ctx.destination);
    kick.start(now);
    kick.stop(now + 0.13);

    lobbyMusicTimer = setTimeout(playStep, 800);
  }

  playStep();
}

export function stopLobbyMusic() {
  isLobbyMusicPlaying = false;
  if (lobbyMusicTimer) {
    clearTimeout(lobbyMusicTimer);
    lobbyMusicTimer = null;
  }
}
