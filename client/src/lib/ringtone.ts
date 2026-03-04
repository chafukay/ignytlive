let audioContext: AudioContext | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let isPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playRingBurst() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(440, now);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(480, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
  gain.gain.setValueAtTime(0.15, now + 0.4);
  gain.gain.linearRampToValueAtTime(0, now + 0.5);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.5);
  osc2.stop(now + 0.5);

  setTimeout(() => {
    if (!isPlaying) return;
    const osc3 = ctx.createOscillator();
    const osc4 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const t = ctx.currentTime;

    osc3.type = "sine";
    osc3.frequency.setValueAtTime(440, t);
    osc4.type = "sine";
    osc4.frequency.setValueAtTime(480, t);

    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.15, t + 0.05);
    gain2.gain.setValueAtTime(0.15, t + 0.4);
    gain2.gain.linearRampToValueAtTime(0, t + 0.5);

    osc3.connect(gain2);
    osc4.connect(gain2);
    gain2.connect(ctx.destination);

    osc3.start(t);
    osc4.start(t);
    osc3.stop(t + 0.5);
    osc4.stop(t + 0.5);
  }, 600);
}

export function startRingtone() {
  if (isPlaying) return;
  isPlaying = true;
  playRingBurst();
  ringtoneInterval = setInterval(() => {
    if (isPlaying) playRingBurst();
  }, 3000);
}

export function stopRingtone() {
  isPlaying = false;
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}
