import * as CANNON from 'cannon-es';

// Създава физичния свят (cannon-es) с материали за земя, колела и препятствия.
export function createPhysicsWorld() {
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.3;

  const materials = {
    ground: new CANNON.Material('ground'),
    wheel: new CANNON.Material('wheel'),
    obstacle: new CANNON.Material('obstacle'),
    chassis: new CANNON.Material('chassis'),
  };

  // Колело <-> земя: добро сцепление
  world.addContactMaterial(new CANNON.ContactMaterial(materials.wheel, materials.ground, {
    friction: 0.9,
    restitution: 0,
    contactEquationStiffness: 1000,
  }));

  // Купе <-> препятствие: слаб отскок
  world.addContactMaterial(new CANNON.ContactMaterial(materials.chassis, materials.obstacle, {
    friction: 0.4,
    restitution: 0.15,
  }));

  // Купе <-> земя
  world.addContactMaterial(new CANNON.ContactMaterial(materials.chassis, materials.ground, {
    friction: 0.4,
    restitution: 0,
  }));

  return { world, materials };
}
