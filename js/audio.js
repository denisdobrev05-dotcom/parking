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

    // Мек нискочестотен филтър — премахва дразнещите високи честоти
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 480;
    this.engineFilter.Q.value = 0.6;
    this.engineGain.connect(this.engineFilter);
    this.engineFilter.connect(this.master);

    // Основен тон — мек триъгълник (вместо дразнещ sawtooth)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'triangle';
    this.osc1.frequency.value = 70;
    this.osc1.connect(this.engineGain);
    this.osc1.start();

    // Суб-октава — чист синус за плътност, без бръмчене
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.value = 35;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.6;
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
    // По-нисък и по-спокоен тон, плавна промяна
    const f = 62 + speedKmh * 2.4 + (gas ? 10 : 0);
    this.osc1.frequency.setTargetAtTime(f, t, 0.14);
    this.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.14);
    // Филтърът се отваря леко със скоростта (по-жив, но не дразнещ)
    const cutoff = 400 + Math.min(speedKmh / 60, 1) * 450 + (gas ? 100 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.18);
    // По-тих от преди
    const vol = 0.03 + Math.min(speedKmh / 70, 1) * 0.09 + (gas ? 0.025 : 0);
    this.engineGain.gain.setTargetAtTime(vol, t, 0.12);
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
