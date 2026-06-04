import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ===== Осветление с меки сенки =====
export function setupLighting(scene) {
  scene.add(new THREE.AmbientLight(0xb8c6e0, 0.55));

  const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x4a4a52, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d6, 1.5);
  sun.position.set(40, 60, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  const s = 60;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  return { sun };
}

// ===== Земя (асфалт) + физична плоскост =====
export function createGround(scene, world, materials) {
  // Физика
  const groundBody = new CANNON.Body({ mass: 0, material: materials.ground });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);

  // Визуален асфалт
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.95, metalness: 0.0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), asphalt);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Тревни ивици по края на паркинга за контекст
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 1 });
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(8, 120), grassMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(sx * 34, 0.01, 0);
    strip.receiveShadow = true;
    scene.add(strip);
  }

  return groundBody;
}

// ===== Околна среда / град =====
export function createCity(scene) {
  const group = new THREE.Group();
  const palette = [0x556070, 0x6b7280, 0x4b5563, 0x7a8290, 0x60707f];
  // Сгради около паркинга
  const positions = [];
  for (let i = 0; i < 26; i++) {
    const ring = i < 13 ? 1 : 2;
    const angle = (i % 13) / 13 * Math.PI * 2;
    const r = 55 + ring * 22 + Math.random() * 10;
    positions.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  for (const [x, z] of positions) {
    const h = 8 + Math.random() * 30;
    const w = 8 + Math.random() * 10;
    const d = 8 + Math.random() * 10;
    const mat = new THREE.MeshStandardMaterial({ color: palette[(Math.random() * palette.length) | 0], roughness: 0.85 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, h / 2, z);
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
  }
  scene.add(group);
  return group;
}

// Помощник: рисува бяла линия на асфалта (тънък box)
function paintLine(parent, x, z, w, l, yaw = 0, color = 0xf4f4f4) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: color, emissiveIntensity: 0.05 });
  const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, l), mat);
  line.position.set(x, 0.02, z);
  line.rotation.y = yaw;
  line.receiveShadow = true;
  parent.add(line);
  return line;
}

// ===== Маркирано място за паркиране (линии + стрелки) =====
// spec: { x, z, yaw, width, length, color }
export function createParkingSpot(scene, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  group.rotation.y = spec.yaw;

  const w = spec.width;   // напречна (локален X)
  const l = spec.length;  // надлъжна (локален Z)
  const lineColor = 0x57e389;

  // Две странични линии
  paintLine(group, -w / 2, 0, 0.12, l, 0, lineColor);
  paintLine(group, w / 2, 0, 0.12, l, 0, lineColor);
  // Задна линия
  paintLine(group, 0, -l / 2, w, 0.12, 0, lineColor);

  // Стрелки навътре (показват посоката за вкарване)
  const arrowMat = new THREE.MeshStandardMaterial({ color: lineColor, emissive: lineColor, emissiveIntensity: 0.25, roughness: 0.5 });
  for (let i = -1; i <= 1; i++) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 4), arrowMat);
    arrow.rotation.x = -Math.PI / 2; // сочи по -Z (навътре)
    arrow.position.set(i * (w / 3.2), 0.04, l / 2 - 0.6);
    group.add(arrow);
  }

  scene.add(group);

  return {
    group,
    bounds: {
      x: spec.x, z: spec.z, yaw: spec.yaw,
      halfW: w / 2, halfL: l / 2,
    },
  };
}

// ===== Препятствия =====

// Паркирана кола (статична)
export function createParkedCar(scene, world, materials, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  group.rotation.y = spec.yaw || 0;

  const color = spec.color ?? 0x3b5ea8;
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x101822, metalness: 0.2, roughness: 0.1 });

  const hx = 0.9, hy = 0.35, hz = 1.9;
  const body = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat);
  body.position.y = hy + 0.36;
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(hx * 1.7, 0.5, hz * 1.05), mat);
  cabin.position.set(0, hy * 2 + 0.36 + 0.15, -0.1);
  cabin.castShadow = true;
  group.add(cabin);
  const win = new THREE.Mesh(new THREE.BoxGeometry(hx * 1.73, 0.34, hz * 0.95), glass);
  win.position.copy(cabin.position);
  group.add(win);

  // Колела (само визуални)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 16), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx * (hx - 0.05), 0.36, sz * (hz - 0.55));
    wheel.castShadow = true;
    group.add(wheel);
  }

  scene.add(group);

  // Физика (статично тяло)
  const body3 = new CANNON.Body({ mass: 0, material: materials.obstacle });
  body3.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy + 0.5, hz)), new CANNON.Vec3(0, hy + 0.5, 0));
  body3.position.set(spec.x, 0, spec.z);
  body3.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), spec.yaw || 0);
  body3.userData = { obstacle: true, type: 'car' };
  world.addBody(body3);

  return { mesh: group, body: body3, type: 'car' };
}

// Стълб
export function createPole(scene, world, materials, spec) {
  const r = spec.r ?? 0.22, h = spec.h ?? 4.5;
  const mat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.7, roughness: 0.4 });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat);
  mesh.position.set(spec.x, h / 2, spec.z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);

  const body = new CANNON.Body({ mass: 0, material: materials.obstacle });
  body.addShape(new CANNON.Cylinder(r, r, h, 12));
  body.position.set(spec.x, h / 2, spec.z);
  body.userData = { obstacle: true, type: 'pole' };
  world.addBody(body);

  return { mesh, body, type: 'pole' };
}

// Конус (събаряем — динамичен, лек)
export function createCone(scene, world, materials, spec) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.6 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 16), mat);
  cone.position.y = 0.35;
  cone.castShadow = true;
  group.add(cone);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), mat);
  base.position.y = 0.03;
  group.add(base);
  // Бяла лента
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  band.position.y = 0.38;
  group.add(band);
  group.position.set(spec.x, 0, spec.z);
  scene.add(group);

  const body = new CANNON.Body({ mass: 2, material: materials.obstacle });
  body.addShape(new CANNON.Cylinder(0.28, 0.28, 0.7, 10), new CANNON.Vec3(0, 0.35, 0));
  body.position.set(spec.x, 0, spec.z);
  body.userData = { obstacle: true, type: 'cone' };
  world.addBody(body);

  return { mesh: group, body, type: 'cone', dynamic: true };
}
