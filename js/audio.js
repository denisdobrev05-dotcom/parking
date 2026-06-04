// Прости звуци чрез WebAudio (мотор, спирачки, сблъсък). Без външни файлове.
export class AudioFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.started = false;
  }

  // Стартира се при първо докосване (заради autoplay политиките)
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    // Мотор: два осцилатора през gain
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;
    this.master.connect(this.ctx.destination);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineGain.connect(this.master);

    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.value = 60;
    this.osc1.connect(this.engineGain);
    this.osc1.start();

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'square';
    this.osc2.frequency.value = 30;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.5;
    this.osc2.connect(g2);
    g2.connect(this.engineGain);
    this.osc2.start();

    this.master.gain.value = this.enabled ? 0.5 : 0.0;
    this.started = true;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.5 : 0.0;
  }

  // Обновяване според скоростта и натиска на газ
  updateEngine(speedKmh, gas) {
    if (!this.started || !this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 55 + speedKmh * 4.5 + (gas ? 25 : 0);
    this.osc1.frequency.setTargetAtTime(f, t, 0.08);
    this.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    const vol = 0.04 + Math.min(speedKmh / 60, 1) * 0.16 + (gas ? 0.06 : 0);
    this.engineGain.gain.setTargetAtTime(vol, t, 0.1);
  }

  // Кратък шум за спирачка
  brake() {
    if (!this.started || !this.enabled) return;
    this._noiseBurst(0.25, 1800, 0.12);
  }

  // По-силен удар при сблъсък
  collision() {
    if (!this.started || !this.enabled) return;
    this._noiseBurst(0.3, 220, 0.4);
  }

  _noiseBurst(duration, freq, gain) {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master || ctx.destination);
    src.start();
  }
}
