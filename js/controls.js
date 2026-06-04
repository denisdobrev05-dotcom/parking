// Touch управление с поддръжка на задържане и мулти-тъч.
// Поддържа и клавиатура (за тестване на десктоп).
export class Controls {
  constructor(callbacks = {}) {
    this.input = { gas: false, brake: false, steerLeft: false, steerRight: false };
    this.callbacks = callbacks;

    this._bindHold('btn-gas', 'gas');
    this._bindHold('btn-brake', 'brake');
    this._bindHold('btn-left', 'steerLeft');
    this._bindHold('btn-right', 'steerRight');

    this._bindTap('btn-camera', () => callbacks.onCamera && callbacks.onCamera());
    this._bindTap('btn-sound', () => callbacks.onSound && callbacks.onSound());
    this._bindTap('btn-restart', () => callbacks.onRestart && callbacks.onRestart());

    this._bindKeyboard();
  }

  // Бутон, реагиращ на задържане (pointerdown..pointerup)
  _bindHold(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = (e) => {
      e.preventDefault();
      this.input[key] = true;
      el.classList.add('active');
    };
    const off = (e) => {
      e.preventDefault();
      this.input[key] = false;
      el.classList.remove('active');
    };
    el.addEventListener('pointerdown', on, { passive: false });
    el.addEventListener('pointerup', off, { passive: false });
    el.addEventListener('pointercancel', off, { passive: false });
    el.addEventListener('pointerleave', off, { passive: false });
    // ако пръстът напусне бутона при задържане
    el.addEventListener('lostpointercapture', off, { passive: false });
  }

  _bindTap(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }, { passive: false });
  }

  _bindKeyboard() {
    const map = {
      ArrowUp: 'gas', KeyW: 'gas',
      ArrowDown: 'brake', KeyS: 'brake',
      ArrowLeft: 'steerLeft', KeyA: 'steerLeft',
      ArrowRight: 'steerRight', KeyD: 'steerRight',
    };
    window.addEventListener('keydown', (e) => {
      if (map[e.code]) { this.input[map[e.code]] = true; e.preventDefault(); }
      if (e.code === 'KeyC' && this.callbacks.onCamera) this.callbacks.onCamera();
      if (e.code === 'KeyR' && this.callbacks.onRestart) this.callbacks.onRestart();
    });
    window.addEventListener('keyup', (e) => {
      if (map[e.code]) { this.input[map[e.code]] = false; e.preventDefault(); }
    });
  }

  reset() {
    this.input.gas = this.input.brake = this.input.steerLeft = this.input.steerRight = false;
    for (const id of ['btn-gas', 'btn-brake', 'btn-left', 'btn-right']) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    }
  }
}
