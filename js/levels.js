// Дефиниции на нивата с растяща трудност.
// Координатна система: forward на колата е -Z при yaw = 0.
// spot.yaw = 0 => входът на мястото е откъм +Z (стрелките сочат навътре по -Z).
//
// obstacles: { kind: 'car'|'pole'|'cone', x, z, yaw?, color? }

export const LEVELS = [
  // --- Ниво 1: Прав вход (лесно, широко място) ---
  {
    name: 'Прав вход',
    hint: 'Карай напред и вкарай колата право в зеленото място.',
    carStart: { x: 0, z: 13, yaw: 0 },
    spot: { x: 0, z: 0, yaw: 0, width: 3.0, length: 5.4 },
    parTime: 35,
    obstacles: [
      { kind: 'car', x: -3.4, z: 0, yaw: 0, color: 0x2e7d46 },
      { kind: 'car', x: 3.4, z: 0, yaw: 0, color: 0xb8902a },
      { kind: 'cone', x: 1.4, z: 7 },
      { kind: 'cone', x: -1.4, z: 7 },
    ],
  },

  // --- Ниво 2: Паркиране на заден ход ---
  {
    name: 'Заден ход',
    hint: 'Подмини мястото, после влез на заден ход (бутон ▼).',
    carStart: { x: 0.5, z: -7, yaw: Math.PI }, // обърната с гръб към мястото
    spot: { x: 0, z: 0, yaw: 0, width: 2.9, length: 5.4 },
    parTime: 45,
    obstacles: [
      { kind: 'car', x: -3.3, z: 0, yaw: 0, color: 0x8a2be2 },
      { kind: 'car', x: 3.3, z: 0, yaw: 0, color: 0xc23b3b },
      { kind: 'pole', x: -3.3, z: 6.5 },
      { kind: 'pole', x: 3.3, z: 6.5 },
    ],
  },

  // --- Ниво 3: Паралелно паркиране ---
  {
    name: 'Паралелно паркиране',
    hint: 'Влез на заден ход в свободното място между двете коли край бордюра.',
    carStart: { x: 3.6, z: 6.5, yaw: 0 },
    spot: { x: 0, z: 0, yaw: 0, width: 2.5, length: 5.6 },
    parTime: 60,
    obstacles: [
      { kind: 'car', x: 0, z: 4.6, yaw: 0, color: 0x3a6ea5 },
      { kind: 'car', x: 0, z: -4.6, yaw: 0, color: 0x6b6b6b },
      { kind: 'pole', x: -2.0, z: 0, r: 0.18, h: 4 },
      { kind: 'cone', x: 2.2, z: 8 },
    ],
  },

  // --- Ниво 4: Тясно място с много коли ---
  {
    name: 'Тясно място',
    hint: 'Тесен паркинг с много коли, стълбове и конуси. Внимавай!',
    carStart: { x: 6, z: 12, yaw: 0 },
    spot: { x: 0, z: 0, yaw: 0, width: 2.45, length: 5.3 },
    parTime: 75,
    obstacles: [
      { kind: 'car', x: -2.75, z: 0, yaw: 0, color: 0x2e7d46 },
      { kind: 'car', x: 2.75, z: 0, yaw: 0, color: 0xb8902a },
      { kind: 'car', x: -5.5, z: 0, yaw: 0, color: 0x444a55 },
      { kind: 'car', x: 5.5, z: 0, yaw: 0, color: 0xa33b3b },
      { kind: 'car', x: -2.75, z: 7.5, yaw: Math.PI, color: 0x3a6ea5 },
      { kind: 'car', x: 2.75, z: 7.5, yaw: Math.PI, color: 0x7a4ca0 },
      { kind: 'pole', x: 4.2, z: 4 },
      { kind: 'pole', x: -4.2, z: 4 },
      { kind: 'cone', x: 1.2, z: 9.5 },
      { kind: 'cone', x: -1.2, z: 9.5 },
      { kind: 'cone', x: 0, z: 9.5 },
    ],
  },
];
