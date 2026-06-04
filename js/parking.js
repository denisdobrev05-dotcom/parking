// Проверка за успешно паркиране.

function angleDiffMod(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  // приема и двете посоки (напред/назад в мястото)
  return Math.min(Math.abs(d), Math.abs(Math.abs(d) - Math.PI));
}

// car: Car инстанция; bounds: { x, z, yaw, halfW, halfL }
export function checkParked(car, bounds) {
  const corners = car.getFootprint();

  // Транслация/ротация в локалната рамка на мястото
  const cos = Math.cos(-bounds.yaw), sin = Math.sin(-bounds.yaw);
  const tolW = 0.18, tolL = 0.18;
  let inside = true;
  let maxOver = 0;
  for (const c of corners) {
    const dx = c.x - bounds.x;
    const dz = c.z - bounds.z;
    const lx = dx * cos + dz * sin;
    const lz = -dx * sin + dz * cos;
    const overX = Math.abs(lx) - (bounds.halfW + tolW);
    const overZ = Math.abs(lz) - (bounds.halfL + tolL);
    if (overX > 0 || overZ > 0) inside = false;
    maxOver = Math.max(maxOver, overX, overZ);
  }

  const yawErr = angleDiffMod(car.getWorldYaw(), bounds.yaw);
  const aligned = yawErr < 0.20; // ~11°
  const stopped = Math.abs(car.getSpeed()) < 0.25;

  return {
    inside,
    aligned,
    stopped,
    ok: inside && aligned && stopped,
    yawErr,
  };
}

// Точки: база - време*коеф - щети*коеф (минимум 0)
export function computeScore(parTime, elapsed, damage) {
  const base = 1000;
  const timePenalty = Math.round(Math.max(0, elapsed - parTime) * 8 + elapsed * 3);
  const damagePenalty = damage * 120;
  return Math.max(50, base - timePenalty - damagePenalty);
}
