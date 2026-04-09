let audioCtx = null;

function note(frequency) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = frequency;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // attack
    gain.gain.linearRampToValueAtTime(0, now + 0.95); // release

    osc.start(now);
    osc.stop(now + 1);
}

function chord() {
    audioCtx = new AudioContext();
    note(500);
    note(600);
    note(800);
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PLAY_ALERT') {
        chord();
    }
});
