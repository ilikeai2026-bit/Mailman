import * as THREE from 'three';

// Helper to create a 16x16 canvas and draw pixels from a color palette or generator
function createPixelTexture(drawFn) {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  drawFn(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Simple deterministic random generator for seeded textures
function createNoise(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// 1. Grass Top
export const grassTopTexture = createPixelTexture((ctx) => {
  const noise = createNoise(42);
  const colors = ['#4f9e30', '#56aa35', '#46902b', '#5cb339', '#3f8226'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 2. Dirt Texture
export const dirtTexture = createPixelTexture((ctx) => {
  const noise = createNoise(123);
  const colors = ['#866043', '#775438', '#956b4d', '#6d4c31', '#5c3e26'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 3. Grass Side (Dirt with hanging grass fringe on top)
export const grassSideTexture = createPixelTexture((ctx) => {
  const noise = createNoise(789);
  const dirtColors = ['#866043', '#775438', '#956b4d', '#6d4c31'];
  const grassColors = ['#4f9e30', '#56aa35', '#46902b'];

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * dirtColors.length);
      ctx.fillStyle = dirtColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Top fringe
  for (let x = 0; x < 16; x++) {
    const hang = 2 + Math.floor(noise() * 3); // 2 to 4 pixels down
    for (let y = 0; y <= hang; y++) {
      const gIdx = Math.floor(noise() * grassColors.length);
      ctx.fillStyle = grassColors[gIdx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 4. Cobblestone (Alley Walkways)
export const cobblestoneTexture = createPixelTexture((ctx) => {
  const noise = createNoise(555);
  const stoneColors = ['#7c7c7c', '#8a8a8a', '#686868', '#969696', '#595959'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const isMortar = (x % 4 === 0 && (y % 4 !== 0)) || (y % 4 === 0);
      if (isMortar && noise() > 0.3) {
        ctx.fillStyle = '#474747';
      } else {
        const idx = Math.floor(noise() * stoneColors.length);
        ctx.fillStyle = stoneColors[idx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 5. Gravel / Side paths
export const gravelTexture = createPixelTexture((ctx) => {
  const noise = createNoise(901);
  const colors = ['#8f867e', '#9b928a', '#7f766e', '#aaa199', '#6e655d'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 6. Oak Planks (Benches, Fences)
export const woodPlankTexture = createPixelTexture((ctx) => {
  const noise = createNoise(333);
  const colors = ['#a17444', '#94693b', '#ad7d4b', '#865e33'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const isSeam = y % 4 === 0;
      if (isSeam) {
        ctx.fillStyle = '#5c3e1e';
      } else {
        const idx = Math.floor(noise() * colors.length);
        ctx.fillStyle = colors[idx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 7. Wood Log Side (Tree trunks)
export const logSideTexture = createPixelTexture((ctx) => {
  const noise = createNoise(612);
  const colors = ['#675232', '#5b472a', '#745e3c', '#4b381d'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const isGroove = x % 4 === 0;
      if (isGroove && noise() > 0.2) {
        ctx.fillStyle = '#3a2b15';
      } else {
        const idx = Math.floor(noise() * colors.length);
        ctx.fillStyle = colors[idx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 8. Wood Log Top
export const logTopTexture = createPixelTexture((ctx) => {
  const noise = createNoise(714);
  const wood = ['#9e7444', '#ab7e4c', '#8e663a'];
  const ring = '#5c4122';
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const dist = Math.sqrt((x - 7.5) ** 2 + (y - 7.5) ** 2);
      if (dist >= 6.5) {
        ctx.fillStyle = '#4b381d'; // Bark rim
      } else if (Math.abs(dist - 4) < 0.8 || Math.abs(dist - 2) < 0.8) {
        ctx.fillStyle = ring;
      } else {
        ctx.fillStyle = wood[Math.floor(noise() * wood.length)];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 9. Oak Leaves
export const leavesTexture = createPixelTexture((ctx) => {
  const noise = createNoise(888);
  const colors = ['#387723', '#42882c', '#2e631b', '#4fa034', '#265115'];
  ctx.clearRect(0, 0, 16, 16);
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      // Small cutout holes like Minecraft fast/fancy leaves
      if (noise() < 0.12) {
        ctx.clearRect(x, y, 1, 1);
      } else {
        const idx = Math.floor(noise() * colors.length);
        ctx.fillStyle = colors[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
});

// 10. Water Texture
export const waterTexture = createPixelTexture((ctx) => {
  const noise = createNoise(444);
  const colors = ['#2e74c9', '#3883da', '#2565b4', '#4592eb'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 10b. Ocean Water Texture (Expansive pixel sea with animated shimmering waves)
export const oceanWaterTexture = createPixelTexture((ctx) => {
  const noise = createNoise(999);
  const colors = ['#1a64ad', '#2171bd', '#155699', '#2a7ecf', '#3689d8'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const isWavePeak = (x * 2 + y * 3) % 9 === 0 && noise() > 0.45;
      if (isWavePeak) {
        ctx.fillStyle = '#6dc0fa';
      } else {
        const idx = Math.floor(noise() * colors.length);
        ctx.fillStyle = colors[idx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 10c. Coastal Sand Texture
export const sandTexture = createPixelTexture((ctx) => {
  const noise = createNoise(555);
  const colors = ['#ded095', '#d4c58a', '#e6d89e', '#cbbe80'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 11. Flower Patch Texture (Grass with blossoms)
export const flowerGrassTexture = createPixelTexture((ctx) => {
  const noise = createNoise(777);
  const grassColors = ['#4f9e30', '#56aa35', '#46902b'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * grassColors.length);
      ctx.fillStyle = grassColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Draw small red and yellow flowers
  const flowers = [
    { x: 3, y: 4, color: '#e53935', center: '#fbc02d' },
    { x: 12, y: 10, color: '#e53935', center: '#fbc02d' },
    { x: 5, y: 12, color: '#fbc02d', center: '#f57f17' },
    { x: 11, y: 3, color: '#fbc02d', center: '#f57f17' },
    { x: 8, y: 8, color: '#ab47bc', center: '#ffeb3b' }
  ];
  flowers.forEach(f => {
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x, f.y - 1, 1, 3);
    ctx.fillRect(f.x - 1, f.y, 3, 1);
    ctx.fillStyle = f.center;
    ctx.fillRect(f.x, f.y, 1, 1);
  });
});

// 12. Minecraft Envelope Texture
export const envelopeTexture = createPixelTexture((ctx) => {
  // Parchment paper background
  ctx.fillStyle = '#f6edd9';
  ctx.fillRect(0, 0, 16, 16);

  // Border outline
  ctx.strokeStyle = '#c8b693';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, 15, 15);

  // Envelope flap folds
  ctx.fillStyle = '#e8d9bc';
  ctx.beginPath();
  ctx.moveTo(1, 1);
  ctx.lineTo(8, 8);
  ctx.lineTo(15, 1);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#bfa980';
  ctx.beginPath();
  ctx.moveTo(1, 1);
  ctx.lineTo(8, 8);
  ctx.lineTo(15, 1);
  ctx.stroke();

  // Bottom corner fold lines
  ctx.beginPath();
  ctx.moveTo(1, 15);
  ctx.lineTo(6, 9);
  ctx.moveTo(15, 15);
  ctx.lineTo(10, 9);
  ctx.stroke();

  // Red wax seal in center
  ctx.fillStyle = '#b71c1c';
  ctx.fillRect(6, 6, 4, 4);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(7, 7, 2, 2);
  ctx.fillStyle = '#ff8a80';
  ctx.fillRect(7, 7, 1, 1);
});

// 13. Steve Player Character Textures
// Steve Face (front)
export const steveFaceTexture = createPixelTexture((ctx) => {
  // Skin base
  ctx.fillStyle = '#c68b6b';
  ctx.fillRect(0, 0, 16, 16);

  // Hair
  ctx.fillStyle = '#3c2415';
  ctx.fillRect(0, 0, 16, 4);
  ctx.fillRect(0, 4, 2, 2);
  ctx.fillRect(14, 4, 2, 2);

  // Eyes (whites + blue pupil)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(2, 7, 4, 2);
  ctx.fillRect(10, 7, 4, 2);
  ctx.fillStyle = '#385292';
  ctx.fillRect(4, 7, 2, 2);
  ctx.fillRect(10, 7, 2, 2);

  // Nose
  ctx.fillStyle = '#a6694b';
  ctx.fillRect(7, 9, 2, 2);

  // Beard/Mouth
  ctx.fillStyle = '#3c2415';
  ctx.fillRect(5, 11, 6, 1);
  ctx.fillRect(4, 12, 8, 2);
  ctx.fillStyle = '#9c5b40'; // Lip
  ctx.fillRect(6, 12, 4, 1);
});

// Steve Hair / Head side & top
export const steveHairTexture = createPixelTexture((ctx) => {
  const noise = createNoise(999);
  const colors = ['#3c2415', '#4a2d1a', '#2c1a0f'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Steve Shirt (Cyan torso)
export const steveShirtTexture = createPixelTexture((ctx) => {
  const noise = createNoise(111);
  const colors = ['#00a8a8', '#009797', '#0dbbbb', '#008787'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // V-neck collar showing skin
  ctx.fillStyle = '#c68b6b';
  ctx.fillRect(6, 0, 4, 2);
  ctx.fillRect(7, 2, 2, 1);
});

// Steve Arm (Cyan sleeve top + Skin lower)
export const steveArmTexture = createPixelTexture((ctx) => {
  const noise = createNoise(222);
  const sleeveColors = ['#00a8a8', '#009797', '#008787'];
  const skinColors = ['#c68b6b', '#bd8262', '#d09575'];

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      if (y < 4) {
        ctx.fillStyle = sleeveColors[Math.floor(noise() * sleeveColors.length)];
      } else {
        ctx.fillStyle = skinColors[Math.floor(noise() * skinColors.length)];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Steve Pants (Blue jeans)
export const stevePantsTexture = createPixelTexture((ctx) => {
  const noise = createNoise(333);
  const colors = ['#2c3d73', '#334685', '#243261', '#3b5196'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Steve Shoes (Dark gray)
export const steveShoeTexture = createPixelTexture((ctx) => {
  const noise = createNoise(444);
  const colors = ['#444444', '#4e4e4e', '#3a3a3a'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// --- Mailman Outfit Textures ---

// 1. Mailman Shirt: Postal light blue with white collar, gold courier badge, button placket, and belt
export const mailmanShirtTexture = createPixelTexture((ctx) => {
  const noise = createNoise(555);
  const blues = ['#4b8fc4', '#3d7bb0', '#5ca0d3', '#4383b5'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * blues.length);
      ctx.fillStyle = blues[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // White uniform collar
  ctx.fillStyle = '#f0f4f8';
  ctx.fillRect(5, 0, 6, 2);
  ctx.fillRect(6, 2, 4, 1);

  // Button placket down center
  ctx.fillStyle = '#326794';
  ctx.fillRect(7, 2, 2, 12);

  // Brass buttons
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(7, 4, 2, 1);
  ctx.fillRect(7, 8, 2, 1);
  ctx.fillRect(7, 12, 2, 1);

  // Left chest golden courier badge / postal horn
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(3, 4, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(4, 5, 1, 1);

  // Right chest pocket
  ctx.fillStyle = '#356e9c';
  ctx.fillRect(10, 5, 3, 3);
  ctx.fillStyle = '#2d5a80';
  ctx.fillRect(10, 5, 3, 1);

  // Leather belt at bottom
  ctx.fillStyle = '#3a2314';
  ctx.fillRect(0, 14, 16, 2);
  // Gold belt buckle
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(6, 14, 4, 2);
  ctx.fillStyle = '#22150c';
  ctx.fillRect(7, 14, 2, 2);
});

// 2. Mailman Arm: Postal blue shirt sleeve with navy uniform cuff + skin tone
export const mailmanArmTexture = createPixelTexture((ctx) => {
  const noise = createNoise(666);
  const blues = ['#4b8fc4', '#3d7bb0', '#5ca0d3'];
  const skinColors = ['#c68b6b', '#bd8262', '#d09575'];

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      if (y < 6) {
        ctx.fillStyle = blues[Math.floor(noise() * blues.length)];
      } else if (y < 8) {
        ctx.fillStyle = '#1e2c3e'; // Dark navy cuff
      } else {
        ctx.fillStyle = skinColors[Math.floor(noise() * skinColors.length)];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// 3. Mailman Pants: Postal navy trousers with side light blue uniform stripe
export const mailmanPantsTexture = createPixelTexture((ctx) => {
  const noise = createNoise(777);
  const navies = ['#1d2838', '#182230', '#223043', '#151c27'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * navies.length);
      ctx.fillStyle = navies[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Light blue side uniform stripe
  ctx.fillStyle = '#4b8fc4';
  ctx.fillRect(1, 0, 1, 16);
  ctx.fillRect(14, 0, 1, 16);
});

// 4. Mailman Cap: Dark navy cap with gold badge
export const mailmanCapTexture = createPixelTexture((ctx) => {
  const noise = createNoise(888);
  const capNavies = ['#182332', '#141d2a', '#1e2c3e'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * capNavies.length);
      ctx.fillStyle = capNavies[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Gold badge on front
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(6, 6, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 7, 2, 2);
});

// 5. Mailman Leather Satchel: Saddle brown leather with flap and brass buckle
export const mailmanBagTexture = createPixelTexture((ctx) => {
  const noise = createNoise(999);
  const leathers = ['#754422', '#63391b', '#854e28', '#543015'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(noise() * leathers.length);
      ctx.fillStyle = leathers[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Flap line
  ctx.fillStyle = '#42240e';
  ctx.fillRect(0, 6, 16, 2);
  // Gold buckle
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(6, 5, 4, 4);
  ctx.fillStyle = '#3a200c';
  ctx.fillRect(7, 6, 2, 2);
});
