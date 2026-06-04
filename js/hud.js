// Обновяване на HUD и съобщения (toast).
export class HUD {
  constructor() {
    this.el = {
      level: document.getElementById('hud-level'),
      time: document.getElementById('hud-time'),
      score: document.getElementById('hud-score'),
      damage: document.getElementById('hud-damage'),
      speed: document.getElementById('hud-speed'),
      gear: document.getElementById('hud-gear'),
      toast: document.getElementById('toast'),
    };
    this._toastTimer = null;
  }

  setLevel(n) { this.el.level.textContent = n; }
  setTime(t) { this.el.time.textContent = t.toFixed(1); }
  setScore(s) { this.el.score.textContent = s; }
  setDamage(d) { this.el.damage.textContent = d; }
  setSpeed(kmh) { this.el.speed.textContent = Math.round(kmh); }

  setGear(g) {
    this.el.gear.textContent = g;
    this.el.gear.classList.toggle('reverse', g === 'R');
  }

  toast(msg, type = 'warn', duration = 1600) {
    const t = this.el.toast;
    t.textContent = msg;
    t.className = `toast ${type}`;
    t.classList.remove('hidden');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
  }
}
