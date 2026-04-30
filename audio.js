/* ========================================
   PROCEDURAL AUDIO ENGINE
   All sounds generated via Web Audio API
   ======================================== */
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.volume = 0.7;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
    }

    setVolume(v) {
        this.volume = v;
        if (this.masterGain) {
            this.masterGain.gain.value = v;
        }
    }

    // Play noise burst for gunshots
    playNoise(duration, volume, filterFreq, filterQ) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq || 3000;
        filter.Q.value = filterQ || 1;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume || 0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }

    // Oscillator tone
    playTone(freq, duration, type, volume, detune) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume || 0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // --- WEAPON SOUNDS ---

    playPistolShot() {
        this.playNoise(0.12, 0.4, 4000, 2);
        this.playTone(180, 0.08, 'square', 0.25);
        this.playTone(120, 0.05, 'sawtooth', 0.15);
    }

    playRifleShot() {
        this.playNoise(0.15, 0.55, 2500, 1.5);
        this.playTone(100, 0.06, 'square', 0.3);
        this.playTone(60, 0.1, 'sawtooth', 0.2);
        this.playNoise(0.08, 0.2, 6000, 3);
    }

    playSniperShot() {
        this.playNoise(0.25, 0.7, 1800, 1);
        this.playTone(60, 0.15, 'square', 0.4);
        this.playTone(40, 0.2, 'sawtooth', 0.25);
        // Echo
        setTimeout(() => {
            this.playNoise(0.3, 0.15, 1200, 0.5);
        }, 150);
    }

    playDeagleShot() {
        this.playNoise(0.18, 0.6, 2200, 1.5);
        this.playTone(80, 0.1, 'square', 0.35);
        this.playTone(55, 0.12, 'sawtooth', 0.2);
    }

    playSMGShot() {
        this.playNoise(0.08, 0.35, 5000, 2);
        this.playTone(200, 0.05, 'square', 0.2);
    }

    // --- OTHER SOUNDS ---

    playReload() {
        // Click
        setTimeout(() => this.playTone(800, 0.03, 'square', 0.2), 0);
        // Slide
        setTimeout(() => this.playNoise(0.08, 0.15, 8000, 4), 200);
        // Magazine
        setTimeout(() => this.playTone(400, 0.05, 'square', 0.25), 500);
        // Chamber
        setTimeout(() => {
            this.playTone(600, 0.03, 'square', 0.2);
            this.playNoise(0.05, 0.1, 6000, 3);
        }, 800);
    }

    playHit() {
        this.playTone(1200, 0.08, 'sine', 0.2);
        this.playTone(800, 0.06, 'sine', 0.15);
    }

    playHeadshot() {
        this.playTone(1500, 0.1, 'sine', 0.3);
        this.playTone(2000, 0.08, 'sine', 0.25);
        this.playTone(1000, 0.12, 'triangle', 0.2);
    }

    playDamage() {
        this.playTone(200, 0.15, 'sawtooth', 0.15);
        this.playNoise(0.1, 0.1, 2000, 1);
    }

    playDeath() {
        this.playTone(300, 0.3, 'sawtooth', 0.2);
        this.playTone(200, 0.4, 'sine', 0.15);
        this.playTone(100, 0.5, 'sine', 0.1);
    }

    playBotDeath() {
        this.playTone(400, 0.15, 'sawtooth', 0.15);
        this.playTone(200, 0.2, 'sine', 0.1);
    }

    playFootstep() {
        this.playNoise(0.05, 0.05, 1500 + Math.random() * 500, 2);
    }

    playEmptyClip() {
        this.playTone(1000, 0.03, 'square', 0.15);
    }

    playBuyItem() {
        this.playTone(600, 0.08, 'sine', 0.2);
        setTimeout(() => this.playTone(900, 0.08, 'sine', 0.2), 100);
    }

    playRoundStart() {
        this.playTone(400, 0.15, 'sine', 0.2);
        setTimeout(() => this.playTone(500, 0.15, 'sine', 0.2), 150);
        setTimeout(() => this.playTone(700, 0.2, 'sine', 0.25), 300);
    }

    playRoundEnd() {
        this.playTone(700, 0.2, 'sine', 0.2);
        setTimeout(() => this.playTone(600, 0.2, 'sine', 0.2), 200);
        setTimeout(() => this.playTone(400, 0.3, 'sine', 0.25), 400);
    }

    playBulletImpact() {
        this.playNoise(0.04, 0.08, 3000 + Math.random() * 2000, 2);
        this.playTone(300 + Math.random() * 200, 0.03, 'triangle', 0.05);
    }

    playWeaponSwitch() {
        this.playTone(500, 0.04, 'sine', 0.1);
        setTimeout(() => this.playTone(700, 0.04, 'sine', 0.1), 80);
    }
}

// Global audio instance
const audioEngine = new AudioEngine();
