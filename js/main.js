import * as THREE from 'three';

// ?v= е за избягване на кеширане — увеличи числото при нова версия
import { createPhysicsWorld } from './physics.js?v=3';
import { setupLighting, createGround, createCity, createParkingSpot,
         createParkedCar, createPole, createCone } from './environment.js?v=3';
import { Car } from './car.js?v=3';
import { LEVELS } from './levels.js?v=3';
import { Controls } from './controls.js?v=3';
import { HUD } from './hud.js?v=3';
import { AudioFX } from './audio.js?v=3';
import { GuideLines } from './guidelines.js?v=3';
import { checkParked, computeScore } from './parking.js?v=3';

class Game {
  constructor() {
    this.state = 'menu';            // menu | playing | levelComplete
    this.levelIndex = 0;
    this.totalScore = 0;
    this.elapsed = 0;
    this.damage = 0;
    this._collisionCooldown = 0;
    this._parkedTimer = 0;
    this.cameraMode = 'chase';      // chase | top

    this.levelObjects = [];         // { mesh, body, dynamic }
    this.spot = null;

    this._initRenderer();
    this._initScene();
    this._initPhysics();
    this._initGameObjects();
    this._initUI();

    window.addEventListener('resize', () => this._onResize());
    this._clock = new THREE.Clock();
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  // ===== Инициализация =====
  _initRenderer() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87a7d4);
    this.scene.fog = new THREE.Fog(0x9db4d6, 60, 180);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 8, 16);

    setupLighting(this.scene);
    createCity(this.scene);
  }

  _initPhysics() {
    const { world, materials } = createPhysicsWorld();
    this.world = world;
    this.materials = materials;
    createGround(this.scene, world, materials);
  }

  _initGameObjects() {
    this.car = new Car(this.scene, this.world, this.materials);
    this.guides = new GuideLines(this.scene);

    // Отчитане на сблъсъци с препятствия
    this.car.chassisBody.addEventListener('collide', (e) => this._onCollide(e));
  }

  _initUI() {
    this.hud = new HUD();
    this.audio = new AudioFX();

    this.controls = new Controls({
      onCamera: () => this._toggleCamera(),
      onRestart: () => this._restartLevel(),
      onSound: () => this._toggleSound(),
    });

    // Старт
    document.getElementById('btn-start').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.audio.init();
      document.getElementById('start-overlay').classList.add('hidden');
      this._startLevel(0);
    });

    // Следващо ниво
    document.getElementById('btn-next').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      document.getElementById('level-overlay').classList.add('hidden');
      const next = (this.levelIndex + 1) % LEVELS.length;
      this._startLevel(next);
    });
  }

  // ===== Управление на нивата =====
  _clearLevel() {
    for (const o of this.levelObjects) {
      if (o.mesh) this.scene.remove(o.mesh);
      if (o.body) this.world.removeBody(o.body);
    }
    this.levelObjects = [];
    if (this.spot) { this.scene.remove(this.spot.group); this.spot = null; }
  }

  _startLevel(index) {
    this._clearLevel();
    this.levelIndex = index;
    const lvl = LEVELS[index];

    // Място за паркиране
    this.spot = createParkingSpot(this.scene, lvl.spot);

    // Препятствия
    for (const ob of lvl.obstacles) {
      let obj;
      if (ob.kind === 'car') obj = createParkedCar(this.scene, this.world, this.materials, ob);
      else if (ob.kind === 'pole') obj = createPole(this.scene, this.world, this.materials, ob);
      else if (ob.kind === 'cone') obj = createCone(this.scene, this.world, this.materials, ob);
      if (obj) this.levelObjects.push(obj);
    }

    // Кола
    this.car.reset({ x: lvl.carStart.x, y: 1.2, z: lvl.carStart.z }, lvl.carStart.yaw);

    // Нулиране на състоянието
    this.elapsed = 0;
    this.damage = 0;
    this._parkedTimer = 0;
    this._collisionCooldown = 0;
    this.controls.reset();

    this.hud.setLevel(index + 1);
    this.hud.setScore(this.totalScore);
    this.hud.setDamage(0);
    this.hud.setTime(0);
    this.hud.toast(`Ниво ${index + 1}: ${lvl.name}`, 'ok', 2600);

    this.state = 'playing';
  }

  _restartLevel() {
    if (this.state === 'menu') return;
    document.getElementById('level-overlay').classList.add('hidden');
    this._startLevel(this.levelIndex);
  }

  // ===== Сблъсъци =====
  _onCollide(e) {
    if (this.state !== 'playing') return;
    const other = e.body;
    if (!other.userData || !other.userData.obstacle) return;
    if (this._collisionCooldown > 0) return;

    let impact = 0;
    if (e.contact) impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (impact < 1.2) return; // игнорирай съвсем леки допири

    this.damage++;
    this._collisionCooldown = 0.9;
    this.hud.setDamage(this.damage);
    this.hud.toast('⚠ Удар! Внимавай!', 'warn', 1300);
    this.audio.collision();
  }

  // ===== Камера / звук =====
  _toggleCamera() {
    this.cameraMode = this.cameraMode === 'chase' ? 'top' : 'chase';
    this.hud.toast(this.cameraMode === 'top' ? 'Изглед отгоре' : 'Изглед зад колата', 'ok', 1000);
  }

  _toggleSound() {
    const on = !this.audio.enabled;
    this.audio.setEnabled(on);
    document.getElementById('btn-sound').classList.toggle('off', !on);
    document.getElementById('btn-sound').textContent = on ? '🔊' : '🔇';
  }

  _updateCamera(dt) {
    const b = this.car.chassisBody;
    const yaw = this.car.getWorldYaw();
    const target = new THREE.Vector3(b.position.x, b.position.y, b.position.z);

    let desired;
    if (this.cameraMode === 'chase') {
      // зад колата (forward е -Z, значи "зад" е +Z локално)
      const back = 9, up = 4.5;
      desired = new THREE.Vector3(
        b.position.x + Math.sin(yaw) * back,
        b.position.y + up,
        b.position.z + Math.cos(yaw) * back
      );
    } else {
      // отгоре
      desired = new THREE.Vector3(b.position.x, b.position.y + 22, b.position.z + 0.01);
    }

    const lerp = 1 - Math.pow(0.001, dt); // плавно следване
    this.camera.position.lerp(desired, lerp);

    if (this.cameraMode === 'top') {
      this.camera.up.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    } else {
      this.camera.up.set(0, 1, 0);
    }
    this.camera.lookAt(target);
  }

  // ===== Главен цикъл =====
  _animate() {
    requestAnimationFrame(this._animate);
    const dt = Math.min(this._clock.getDelta(), 0.05);

    if (this.state === 'playing') {
      this._step(dt);
    }

    this._updateCamera(dt || 0.016);
    this.renderer.render(this.scene, this.camera);
  }

  _step(dt) {
    // Управление
    this.car.update(this.controls.input, dt);

    // Физика
    this.world.step(1 / 60, dt, 3);

    // Синхронизация на модели
    this.car.syncMesh();
    for (const o of this.levelObjects) {
      if (o.dynamic && o.mesh && o.body) {
        o.mesh.position.copy(o.body.position);
        o.mesh.quaternion.copy(o.body.quaternion);
      }
    }

    // Помощни линии
    this.guides.setVisible(true);
    this.guides.update({
      x: this.car.chassisBody.position.x,
      z: this.car.chassisBody.position.z,
      yaw: this.car.getWorldYaw(),
      steering: this.car.steering,
    });

    // Таймери
    this.elapsed += dt;
    if (this._collisionCooldown > 0) this._collisionCooldown -= dt;

    // HUD
    const kmh = this.car.getSpeedKmh();
    this.hud.setTime(this.elapsed);
    this.hud.setSpeed(kmh);
    this.hud.setGear(this.car.gear);

    // Звук
    this.audio.updateEngine(kmh, this.controls.input.gas);
    if (this.car.braking && kmh > 12) {
      if (!this._brakeSoundCd || this._brakeSoundCd <= 0) {
        this.audio.brake();
        this._brakeSoundCd = 0.5;
      }
    }
    if (this._brakeSoundCd > 0) this._brakeSoundCd -= dt;

    // Проверка за паркиране
    const res = checkParked(this.car, this.spot.bounds);
    if (res.ok) {
      this._parkedTimer += dt;
      if (this._parkedTimer === dt) this.hud.toast('Задръж позицията... 🅿️', 'ok', 1200);
      if (this._parkedTimer > 0.8) this._completeLevel();
    } else {
      this._parkedTimer = 0;
    }
  }

  _completeLevel() {
    this.state = 'levelComplete';
    const lvl = LEVELS[this.levelIndex];
    const score = computeScore(lvl.parTime, this.elapsed, this.damage);
    this.totalScore += score;
    this.hud.setScore(this.totalScore);

    const isLast = this.levelIndex === LEVELS.length - 1;
    document.getElementById('level-title').textContent =
      isLast ? 'Поздравления! Всички нива завършени! 🏆' : 'Паркирано успешно! 🎉';

    document.getElementById('level-stats').innerHTML = `
      <div class="stat-row"><span>Време</span><b>${this.elapsed.toFixed(1)} сек</b></div>
      <div class="stat-row"><span>Щети</span><b>${this.damage}</b></div>
      <div class="stat-row"><span>Точки за нивото</span><b>+${score}</b></div>
      <div class="stat-row"><span>Общо точки</span><b>${this.totalScore}</b></div>
    `;
    document.getElementById('btn-next').textContent = isLast ? '▶ Започни отначало' : '▶ Следващо ниво';
    document.getElementById('level-overlay').classList.remove('hidden');
    this.controls.reset();
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Старт
new Game();
