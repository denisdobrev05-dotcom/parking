import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Размери на купето (half-extents)
const CHASSIS_HX = 0.9;   // ширина/2
const CHASSIS_HY = 0.35;  // височина/2
const CHASSIS_HZ = 1.9;   // дължина/2
const WHEEL_RADIUS = 0.36;

export class Car {
  constructor(scene, world, materials) {
    this.scene = scene;
    this.world = world;
    this.materials = materials;

    // Състояние на управление
    this.steering = 0;          // текущ ъгъл на воланa (rad)
    this.maxSteer = 0.6;
    this.maxForce = 900;        // сила на двигателя (напред, на колело)
    this.maxReverseForce = 550;
    this.brakeStrength = 28;

    this.gear = 'D';            // 'D' или 'R'
    this.braking = false;       // светят ли стоповете
    this.reversing = false;     // свети ли фарът за заден ход

    this._buildPhysics();
    this._buildModel();
  }

  _buildPhysics() {
    const { world, materials } = this;

    const chassisShape = new CANNON.Box(new CANNON.Vec3(CHASSIS_HX, CHASSIS_HY, CHASSIS_HZ));
    const chassisBody = new CANNON.Body({ mass: 150, material: materials.chassis });
    // Малко повдигнат център на масата надолу за стабилност
    chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0, 0));
    chassisBody.angularDamping = 0.4;
    chassisBody.allowSleep = false; // да реагира винаги на газта
    this.chassisBody = chassisBody;

    const vehicle = new CANNON.RaycastVehicle({
      chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    const wheelOptions = {
      radius: WHEEL_RADIUS,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 32,
      suspensionRestLength: 0.32,
      frictionSlip: 2.2,
      dampingRelaxation: 2.4,
      dampingCompression: 4.4,
      maxSuspensionForce: 100000,
      rollInfluence: 0.02,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    const x = CHASSIS_HX - 0.05;
    const z = CHASSIS_HZ - 0.55;
    const y = 0;

    // Предницата на колата е -Z. Колела 0,1 = предни (управляеми, -Z);
    // колела 2,3 = задни (задвижващи, +Z).
    vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(x, y, -z) });
    vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(-x, y, -z) });
    vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(x, y, z) });
    vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new CANNON.Vec3(-x, y, z) });

    vehicle.addToWorld(world);
    this.vehicle = vehicle;

    // Тела за колелата (за визуална синхронизация)
    this.wheelBodies = vehicle.wheelInfos.map(() => null);
  }

  _buildModel() {
    const group = new THREE.Group();

    const bodyColor = 0xd92b3c;

    // Долно купе
    const lowerMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.55, roughness: 0.35 });
    const lower = new THREE.Mesh(
      new THREE.BoxGeometry(CHASSIS_HX * 2, CHASSIS_HY * 2 * 0.9, CHASSIS_HZ * 2),
      lowerMat
    );
    lower.position.y = 0.02;
    lower.castShadow = true;
    lower.receiveShadow = true;
    group.add(lower);

    // Кабина / покрив
    const cabinMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.55, roughness: 0.35 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(CHASSIS_HX * 1.7, 0.5, CHASSIS_HZ * 1.05), cabinMat);
    cabin.position.set(0, CHASSIS_HY + 0.25, -0.1);
    cabin.castShadow = true;
    group.add(cabin);

    // Прозорци (тъмно стъкло)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x101822, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.85,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(CHASSIS_HX * 1.73, 0.36, CHASSIS_HZ * 0.95), glassMat);
    glass.position.set(0, CHASSIS_HY + 0.27, -0.1);
    group.add(glass);

    // Преден капак (предницата е -Z)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(CHASSIS_HX * 1.85, 0.18, CHASSIS_HZ * 0.7), lowerMat);
    hood.position.set(0, CHASSIS_HY + 0.04, -CHASSIS_HZ * 0.62);
    hood.castShadow = true;
    group.add(hood);

    // Фарове (предни, -Z)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6cf, emissive: 0xfff0b0, emissiveIntensity: 1.1 });
    for (const sx of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.1), headMat);
      head.position.set(sx * (CHASSIS_HX - 0.28), CHASSIS_HY - 0.02, -CHASSIS_HZ + 0.02);
      group.add(head);
    }

    // Стопове (задни, +Z) — светят при спиране
    this.brakeMat = new THREE.MeshStandardMaterial({ color: 0x5a0d12, emissive: 0xff1a1a, emissiveIntensity: 0.25 });
    for (const sx of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.1), this.brakeMat);
      tail.position.set(sx * (CHASSIS_HX - 0.28), CHASSIS_HY - 0.02, CHASSIS_HZ - 0.02);
      group.add(tail);
    }

    // Фарове за заден ход (бели, светят на R) — задни, +Z
    this.reverseMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xffffff, emissiveIntensity: 0.0 });
    for (const sx of [-1, 1]) {
      const rev = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.09), this.reverseMat);
      rev.position.set(sx * (CHASSIS_HX - 0.62), CHASSIS_HY - 0.06, CHASSIS_HZ - 0.02);
      group.add(rev);
    }

    this.scene.add(group);
    this.mesh = group;

    // Колела
    this.wheelMeshes = [];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.25 });
    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.3, 20),
        wheelMat
      );
      tire.rotation.z = Math.PI / 2; // ос по X
      tire.castShadow = true;
      wheel.add(tire);
      // Джанта
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS * 0.55, WHEEL_RADIUS * 0.55, 0.32, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheel.add(rim);
      this.scene.add(wheel);
      this.wheelMeshes.push(wheel);
    }
  }

  // Управление през един кадър.
  // input: { gas, brake, steerLeft, steerRight }
  update(input, dt) {
    const vehicle = this.vehicle;
    const speed = this.getSpeed(); // m/s със знак (напред +)
    const absSpeed = Math.abs(speed);

    // --- Волан със зависимост от скоростта (по-малко при висока скорост) ---
    const speedFactor = 1 - Math.min(absSpeed / 22, 1) * 0.55;
    const targetSteer = (input.steerLeft ? 1 : 0) - (input.steerRight ? 1 : 0);
    const desired = targetSteer * this.maxSteer * speedFactor;
    // плавно завъртане на воланa
    const steerSpeed = 3.5 * dt;
    if (this.steering < desired) this.steering = Math.min(this.steering + steerSpeed, desired);
    else if (this.steering > desired) this.steering = Math.max(this.steering - steerSpeed, desired);
    vehicle.setSteeringValue(this.steering, 0);
    vehicle.setSteeringValue(this.steering, 1);

    // --- Газ / спирачка / заден ход ---
    // ВАЖНО: при тази конфигурация на RaycastVehicle положителна сила
    // придвижва колата напред (далеч от камерата).
    let engineForce = 0;
    let brake = 0;
    this.braking = false;
    this.reversing = false;

    const movingForward = speed > 0.6;
    const movingBackward = speed < -0.6;

    if (input.gas) {
      engineForce = this.maxForce; // напред
    } else if (input.brake) {
      if (movingForward) {
        // Спираме, докато се движим напред
        brake = this.brakeStrength;
        this.braking = true;
      } else {
        // Заден ход
        engineForce = -this.maxReverseForce;
        this.reversing = true;
      }
    }

    // Лек двигателен спирач/съпротивление, ако нищо не е натиснато
    if (!input.gas && !input.brake) {
      brake = 1.2;
    }

    // Прилага сила към задните колела
    vehicle.applyEngineForce(engineForce, 2);
    vehicle.applyEngineForce(engineForce, 3);

    // Спирачка на всички колела
    for (let i = 0; i < 4; i++) vehicle.setBrake(brake, i);

    // Предавка за HUD: R при заден ход или движение назад, иначе D
    if (this.reversing || movingBackward) {
      this.gear = 'R';
    } else {
      this.gear = 'D';
    }

    this._updateLights();
  }

  _updateLights() {
    // Стопове светят при спиране (или винаги леко при заден ход)
    this.brakeMat.emissiveIntensity = this.braking ? 1.6 : 0.25;
    // Фар за заден ход
    this.reverseMat.emissiveIntensity = this.reversing ? 1.4 : 0.0;
  }

  // Синхронизира 3D моделите с физиката
  syncMesh() {
    const b = this.chassisBody;
    this.mesh.position.copy(b.position);
    this.mesh.quaternion.copy(b.quaternion);

    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i);
      const t = this.vehicle.wheelInfos[i].worldTransform;
      const wm = this.wheelMeshes[i];
      wm.position.copy(t.position);
      wm.quaternion.copy(t.quaternion);
    }
  }

  // Скорост по надлъжната ос (m/s), положителна = напред
  getSpeed() {
    const v = this.chassisBody.velocity;
    // Локалната "напред" посока е -Z в световни координати
    const forward = new CANNON.Vec3(0, 0, -1);
    const worldForward = this.chassisBody.quaternion.vmult(forward);
    return v.dot(worldForward);
  }

  getSpeedKmh() {
    return Math.abs(this.getSpeed()) * 3.6;
  }

  // Връща позицията и ъгъла (за проверка на паркиране)
  getWorldYaw() {
    const e = new CANNON.Vec3();
    const q = this.chassisBody.quaternion;
    // yaw около Y
    const yaw = Math.atan2(
      2 * (q.w * q.y + q.x * q.z),
      1 - 2 * (q.y * q.y + q.x * q.x)
    );
    return yaw;
  }

  // Връща четирите ъгъла на купето в равнината XZ (за проверка дали е в мястото)
  getFootprint() {
    const yaw = this.getWorldYaw();
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const cx = this.chassisBody.position.x;
    const cz = this.chassisBody.position.z;
    const hx = CHASSIS_HX, hz = CHASSIS_HZ;
    const corners = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = sx * hx, lz = sz * hz;
        corners.push({
          x: cx + lx * cos + lz * sin,
          z: cz - lx * sin + lz * cos,
        });
      }
    }
    return corners;
  }

  reset(position, yaw = 0) {
    const b = this.chassisBody;
    b.position.set(position.x, position.y, position.z);
    b.velocity.setZero();
    b.angularVelocity.setZero();
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
    b.quaternion.copy(q);
    b.wakeUp();
    this.steering = 0;
    this.gear = 'D';
    for (let i = 0; i < 4; i++) {
      this.vehicle.setBrake(0, i);
      this.vehicle.applyEngineForce(0, i);
      this.vehicle.setSteeringValue(0, i);
    }
    this.syncMesh();
  }
}

export const CAR_DIMS = { CHASSIS_HX, CHASSIS_HY, CHASSIS_HZ, WHEEL_RADIUS };
