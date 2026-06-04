import * as THREE from 'three';

// Помощни линии за паркиране (като камера за заден ход).
// Две извити ленти зад колата + цветни маркери за разстояние.
// Лентите се извиват според ъгъла на воланa.
export class GuideLines {
  constructor(scene) {
    this.scene = scene;
    this.N = 24;          // точки по дължина
    this.length = 6.0;    // дължина на линиите (m)
    this.halfWidth = 0.95;
    this.wheelbase = 2.7;

    this.group = new THREE.Group();
    scene.add(this.group);

    // Две ленти (ляво/дясно)
    this.ribbons = [this._makeRibbon(0x36d399), this._makeRibbon(0x36d399)];

    // Цветни напречни маркери (зелено/жълто/червено)
    this.ticks = [
      this._makeTick(0x36d399), // ~2m
      this._makeTick(0xfacc15), // ~4m
      this._makeTick(0xef4444), // ~6m
    ];
  }

  _makeRibbon(color) {
    const N = this.N;
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array(N * 2 * 3); // 2 реда точки
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    const idx = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
      idx.push(a, b, c, b, d, c);
    }
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 5;
    this.group.add(mesh);
    return mesh;
  }

  _makeTick(color) {
    const geo = new THREE.PlaneGeometry(this.halfWidth * 2.1, 0.16);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 6;
    this.group.add(mesh);
    return mesh;
  }

  setVisible(v) { this.group.visible = v; }

  // car: { x, z, yaw, steering }
  update(car) {
    const N = this.N;
    const k = Math.tan(car.steering) / this.wheelbase; // кривина
    const ribbonW = 0.09;

    // Локални централни точки по дъгата (зад колата = +Z локално)
    const cx = car.x, cz = car.z, yaw = car.yaw;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);

    const toWorld = (lx, lz) => ({
      x: cx + lx * cosY + lz * sinY,
      z: cz - lx * sinY + lz * cosY,
    });

    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const pos = this.ribbons[side].geometry.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const s = (i / (N - 1)) * this.length;
        // централна линия на дъгата
        let lx, lz, heading;
        if (Math.abs(k) < 1e-4) {
          lx = 0; lz = s; heading = 0;
        } else {
          heading = k * s;
          lx = (1 - Math.cos(heading)) / k;
          lz = Math.sin(heading) / k;
        }
        // перпендикуляр спрямо посоката на движение
        const nx = Math.cos(heading);
        const nz = -Math.sin(heading);
        // двата ръба на лентата
        for (let edge = 0; edge < 2; edge++) {
          const off = sign * this.halfWidth + (edge === 0 ? -ribbonW : ribbonW);
          const px = lx + nx * off;
          const pz = lz + nz * off;
          const w = toWorld(px, pz);
          const vi = (i * 2 + edge) * 3;
          pos[vi] = w.x;
          pos[vi + 1] = 0.06;
          pos[vi + 2] = w.z;
        }
      }
      this.ribbons[side].geometry.attributes.position.needsUpdate = true;
      this.ribbons[side].geometry.computeBoundingSphere();
    }

    // Маркери за разстояние
    const dists = [2, 4, 6];
    for (let t = 0; t < this.ticks.length; t++) {
      const s = dists[t];
      let lx, lz, heading;
      if (Math.abs(k) < 1e-4) { lx = 0; lz = s; heading = 0; }
      else { heading = k * s; lx = (1 - Math.cos(heading)) / k; lz = Math.sin(heading) / k; }
      const w = toWorld(lx, lz);
      this.ticks[t].position.set(w.x, 0.065, w.z);
      this.ticks[t].rotation.y = -(yaw + heading);
    }
  }
}
