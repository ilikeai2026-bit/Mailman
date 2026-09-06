import * as THREE from 'three';
import {
  grassTopTexture,
  grassSideTexture,
  dirtTexture,
  cobblestoneTexture,
  gravelTexture,
  woodPlankTexture,
  logSideTexture,
  logTopTexture,
  leavesTexture,
  waterTexture,
  flowerGrassTexture
} from './textures.js';

// Tile type definitions
export const TILE = {
  GRASS: 0,
  COBBLE: 1,
  GRAVEL: 2,
  FLOWERS: 3,
  WATER: 4,
  HEDGE: 5,
  TREE: 6,
  BENCH: 7,
  FENCE: 8,
  LAMP: 9,
  GATE: 10
};

export class ParkMap {
  constructor(scene, size = 56) {
    this.scene = scene;
    this.size = size; // 56x56 grand grid
    this.halfSize = Math.floor(size / 2);
    this.grid = []; // 2D array [z][x]
    this.obstacles = []; // Array of { x, z, width, depth } for precise collision
    this.reachableTiles = []; // Accessible tiles verified by BFS

    // Player spawn point (near central grand fountain)
    this.spawnTile = { x: this.halfSize, z: this.halfSize - 4 };

    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    this.initGrid();
    this.carveParkLayout();
    this.computeReachability();
    this.build3DWorld();
  }

  initGrid() {
    this.grid = [];
    for (let z = 0; z < this.size; z++) {
      const row = [];
      for (let x = 0; x < this.size; x++) {
        // Outer border is solid fence/wall
        if (x === 0 || x === this.size - 1 || z === 0 || z === this.size - 1) {
          row.push(TILE.FENCE);
        } else {
          row.push(TILE.GRASS);
        }
      }
      this.grid.push(row);
    }

    // Add 4 locked park entrance gates that block the park exits
    const mid = this.halfSize;
    for (let off = -1; off <= 2; off++) {
      this.grid[0][mid + off] = TILE.GATE; // North Gate
      this.grid[this.size - 1][mid + off] = TILE.GATE; // South Gate
      this.grid[mid + off][0] = TILE.GATE; // West Gate
      this.grid[mid + off][this.size - 1] = TILE.GATE; // East Gate
    }
  }

  carveParkLayout() {
    const s = this.size;
    const mid = this.halfSize;

    // 1. Grand Promenades (North-South & East-West Cross, 4 blocks wide)
    for (let i = 1; i < s - 1; i++) {
      for (let offset = -1; offset <= 2; offset++) {
        this.grid[i][mid + offset] = TILE.COBBLE;
        this.grid[mid + offset][i] = TILE.COBBLE;
      }
    }

    // 2. Grand Central Plaza with Fountain
    for (let dz = -6; dz <= 6; dz++) {
      for (let dx = -6; dx <= 6; dx++) {
        const dist = Math.hypot(dx, dz);
        const z = mid + dz;
        const x = mid + dx;
        if (x > 0 && x < s - 1 && z > 0 && z < s - 1) {
          if (dist <= 6.2) {
            this.grid[z][x] = TILE.COBBLE;
          }
        }
      }
    }

    // Central fountain pool (3x3 water)
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        this.grid[mid + dz][mid + dx] = TILE.WATER;
      }
    }

    // 3. Inner Ring Promenade (gravel)
    const innerRing = 13;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.03) {
      const rx = Math.round(mid + Math.cos(angle) * innerRing);
      const rz = Math.round(mid + Math.sin(angle) * innerRing);
      if (rx >= 2 && rx < s - 2 && rz >= 2 && rz < s - 2) {
        this.grid[rz][rx] = TILE.GRAVEL;
        if (rx + 1 < s - 2) this.grid[rz][rx + 1] = TILE.GRAVEL;
      }
    }

    // 4. Outer Ring Promenade (gravel)
    const outerRing = 21;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.02) {
      const rx = Math.round(mid + Math.cos(angle) * outerRing);
      const rz = Math.round(mid + Math.sin(angle) * outerRing);
      if (rx >= 2 && rx < s - 2 && rz >= 2 && rz < s - 2) {
        this.grid[rz][rx] = TILE.GRAVEL;
        if (rx + 1 < s - 2) this.grid[rz][rx + 1] = TILE.GRAVEL;
      }
    }

    // 5. Quadrant 1 (North-East): Grand Lake with Pier
    const pondCenterX = mid + 13;
    const pondCenterZ = mid - 13;
    for (let dz = -5; dz <= 5; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        const dist = Math.hypot(dx, dz);
        const z = pondCenterZ + dz;
        const x = pondCenterX + dx;
        if (z > 1 && z < s - 2 && x > 1 && x < s - 2) {
          if (dist <= 4.8) {
            this.grid[z][x] = TILE.WATER;
          } else if (dist <= 6.0) {
            this.grid[z][x] = TILE.GRAVEL;
          }
        }
      }
    }
    // Wooden walkway / pier reaching into lake
    for (let step = 0; step <= 3; step++) {
      this.grid[pondCenterZ][pondCenterX - 5 + step] = TILE.COBBLE;
    }

    // 6. Quadrant 2 (North-West): Royal Flower Garden & Geometric Pathways
    const gwX = mid - 13;
    const gwZ = mid - 13;
    for (let dz = -6; dz <= 6; dz++) {
      for (let dx = -6; dx <= 6; dx++) {
        const z = gwZ + dz;
        const x = gwX + dx;
        if (x > 1 && x < s - 2 && z > 1 && z < s - 2) {
          if (dx === 0 || dz === 0 || Math.abs(dx) === 6 || Math.abs(dz) === 6 || (dx + dz) % 4 === 0) {
            this.grid[z][x] = TILE.GRAVEL;
          } else {
            this.grid[z][x] = TILE.FLOWERS;
          }
        }
      }
    }

    // 7. Quadrant 3 (South-West): Expanded Hedge Labyrinth
    const hedgeX = mid - 13;
    const hedgeZ = mid + 13;
    for (let dz = -6; dz <= 6; dz += 2) {
      for (let dx = -6; dx <= 6; dx++) {
        const z = hedgeZ + dz;
        const x = hedgeX + dx;
        // Leave gaps for accessible maze paths
        const isGap = (dx === -3 && dz !== 0) || (dx === 3 && dz !== 0) || (dx === 0);
        if (!isGap && x > 1 && x < s - 2 && z > 1 && z < s - 2) {
          this.grid[z][x] = TILE.HEDGE;
        }
      }
    }

    // 8. Quadrant 4 (South-East): Ancient Birch & Oak Forest
    const groveX = mid + 13;
    const groveZ = mid + 13;
    for (let dz = -6; dz <= 6; dz++) {
      for (let dx = -6; dx <= 6; dx++) {
        const z = groveZ + dz;
        const x = groveX + dx;
        if (x > 1 && x < s - 2 && z > 1 && z < s - 2) {
          if (Math.abs(dx) === 6 || Math.abs(dz) === 6 || (dx === 0 && Math.abs(dz) <= 4)) {
            this.grid[z][x] = TILE.GRAVEL;
          }
        }
      }
    }

    // 9. Four Corner Plazas (with cobblestone & benches)
    const cornerOffsets = [
      { x: 8, z: 8 },
      { x: s - 9, z: 8 },
      { x: 8, z: s - 9 },
      { x: s - 9, z: s - 9 }
    ];
    cornerOffsets.forEach(c => {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          this.grid[c.z + dz][c.x + dx] = TILE.COBBLE;
        }
      }
    });

    // 10. Place Trees across grassy and forest areas
    const treeCandidates = [
      // Promenades borders
      { x: mid - 3, z: 6 }, { x: mid + 4, z: 6 },
      { x: mid - 3, z: 12 }, { x: mid + 4, z: 12 },
      { x: mid - 3, z: s - 7 }, { x: mid + 4, z: s - 7 },
      { x: mid - 3, z: s - 13 }, { x: mid + 4, z: s - 13 },
      { x: 6, z: mid - 3 }, { x: 6, z: mid + 4 },
      { x: 12, z: mid - 3 }, { x: 12, z: mid + 4 },
      { x: s - 7, z: mid - 3 }, { x: s - 7, z: mid + 4 },
      { x: s - 13, z: mid - 3 }, { x: s - 13, z: mid + 4 },

      // Forest trees
      { x: groveX - 3, z: groveZ - 3 },
      { x: groveX + 3, z: groveZ - 3 },
      { x: groveX - 3, z: groveZ + 3 },
      { x: groveX + 3, z: groveZ + 3 },
      { x: groveX - 1, z: groveZ - 4 },
      { x: groveX + 2, z: groveZ + 4 },
      { x: groveX - 4, z: groveZ + 1 },

      // Corner & Outer areas
      { x: 4, z: 4 }, { x: 12, z: 4 }, { x: 4, z: 12 },
      { x: s - 5, z: 4 }, { x: s - 13, z: 4 }, { x: s - 5, z: 12 },
      { x: 4, z: s - 5 }, { x: 12, z: s - 5 }, { x: 4, z: s - 13 },
      { x: s - 5, z: s - 5 }, { x: s - 13, z: s - 5 }, { x: s - 5, z: s - 13 }
    ];

    treeCandidates.forEach(pos => {
      if (this.grid[pos.z][pos.x] === TILE.GRASS || this.grid[pos.z][pos.x] === TILE.FLOWERS) {
        this.grid[pos.z][pos.x] = TILE.TREE;
      }
    });

    // 11. Place Park Benches
    const benchPositions = [
      // Central plaza
      { x: mid - 3, z: mid - 4, rot: 0 },
      { x: mid + 4, z: mid - 4, rot: 0 },
      { x: mid - 3, z: mid + 4, rot: Math.PI },
      { x: mid + 4, z: mid + 4, rot: Math.PI },
      // By the Lake
      { x: pondCenterX - 6, z: pondCenterZ, rot: Math.PI / 2 },
      { x: pondCenterX + 6, z: pondCenterZ, rot: -Math.PI / 2 },
      { x: pondCenterX - 2, z: pondCenterZ - 5, rot: 0 },
      // Flower Garden
      { x: gwX, z: gwZ - 7, rot: 0 },
      { x: gwX, z: gwZ + 7, rot: Math.PI },
      // Forest picnic clearing
      { x: groveX - 2, z: groveZ, rot: Math.PI / 2 },
      { x: groveX + 2, z: groveZ, rot: -Math.PI / 2 },
      // Hedge maze alcoves
      { x: hedgeX - 4, z: hedgeZ - 1, rot: 0 },
      { x: hedgeX + 4, z: hedgeZ + 1, rot: Math.PI },
      // Corner plazas
      { x: 8, z: 6, rot: 0 },
      { x: s - 9, z: 6, rot: 0 },
      { x: 8, z: s - 7, rot: Math.PI },
      { x: s - 9, z: s - 7, rot: Math.PI }
    ];

    benchPositions.forEach(b => {
      if (this.isWalkableTile(this.grid[b.z][b.x])) {
        this.grid[b.z][b.x] = TILE.BENCH;
      }
    });

    // Ensure player spawn and immediate surrounding tiles are completely open cobblestone
    this.grid[this.spawnTile.z][this.spawnTile.x] = TILE.COBBLE;
    this.grid[this.spawnTile.z + 1][this.spawnTile.x] = TILE.COBBLE;
    this.grid[this.spawnTile.z - 1][this.spawnTile.x] = TILE.COBBLE;
    this.grid[this.spawnTile.z][this.spawnTile.x + 1] = TILE.COBBLE;
    this.grid[this.spawnTile.z][this.spawnTile.x - 1] = TILE.COBBLE;
  }

  isWalkableTile(type) {
    return (
      type === TILE.GRASS ||
      type === TILE.COBBLE ||
      type === TILE.GRAVEL ||
      type === TILE.FLOWERS
    );
  }

  // Guaranteed Pathfinding Algorithm (BFS Flood Fill)
  computeReachability() {
    this.reachableTiles = [];
    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const queue = [{ x: this.spawnTile.x, z: this.spawnTile.z, dist: 0 }];

    visited[this.spawnTile.z][this.spawnTile.x] = true;

    const dirs = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 }
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      this.reachableTiles.push({
        x: current.x,
        z: current.z,
        dist: current.dist,
        type: this.grid[current.z][current.x]
      });

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const nz = current.z + d.dz;

        if (nx >= 0 && nx < this.size && nz >= 0 && nz < this.size) {
          if (!visited[nz][nx] && this.isWalkableTile(this.grid[nz][nx])) {
            visited[nz][nx] = true;
            queue.push({ x: nx, z: nz, dist: current.dist + 1 });
          }
        }
      }
    }

    console.log(`[ParkMap] Total reachable walkable tiles: ${this.reachableTiles.length}`);
  }

  // Select 5 guaranteed-accessible spawn spots spread nicely across the park
  getFiveAccessibleEnvelopeSpots() {
    // Filter to tiles with decent distance from spawn (>= 8 steps)
    const valid = this.reachableTiles.filter(t => t.dist >= 8);

    const chosen = [];
    let minDistanceBetween = Math.max(8, Math.floor(this.size * 0.23));

    for (let attempt = 0; attempt < 3 && chosen.length < 5; attempt++) {
      const shuffled = [...valid].sort(() => Math.random() - 0.5);
      for (const candidate of shuffled) {
        if (chosen.length >= 5) break;

        const tooClose = chosen.some(c => {
          const dist = Math.hypot(c.gridX - candidate.x, c.gridZ - candidate.z);
          return dist < minDistanceBetween;
        });

        if (!tooClose) {
          const worldPos = this.gridToWorld(candidate.x, candidate.z);
          chosen.push({
            gridX: candidate.x,
            gridZ: candidate.z,
            x: worldPos.x,
            z: worldPos.z,
            dist: candidate.dist
          });
        }
      }
      minDistanceBetween = Math.max(7, minDistanceBetween - 3);
    }

    // Fallback: If 5 spaced spots could not be picked, fill from farthest remaining
    if (chosen.length < 5) {
      const shuffled = [...valid].sort(() => Math.random() - 0.5);
      for (const candidate of shuffled) {
        if (chosen.length >= 5) break;
        if (!chosen.some(c => c.gridX === candidate.x && c.gridZ === candidate.z)) {
          const worldPos = this.gridToWorld(candidate.x, candidate.z);
          chosen.push({
            gridX: candidate.x,
            gridZ: candidate.z,
            x: worldPos.x,
            z: worldPos.z,
            dist: candidate.dist
          });
        }
      }
    }

    return chosen;
  }

  gridToWorld(gx, gz) {
    return {
      x: (gx - this.halfSize) * 1.0 + 0.5,
      z: (gz - this.halfSize) * 1.0 + 0.5
    };
  }

  worldToGrid(wx, wz) {
    return {
      gx: Math.floor(wx - 0.5 + this.halfSize),
      gz: Math.floor(wz - 0.5 + this.halfSize)
    };
  }

  isStoneTile(wx, wz) {
    const g = this.worldToGrid(wx, wz);
    if (g.gx < 0 || g.gx >= this.size || g.gz < 0 || g.gz >= this.size) return false;
    const tile = this.grid[g.gz][g.gx];
    return tile === TILE.COBBLE || tile === TILE.GRAVEL;
  }

  isBlocked(wx, wz, radius = 0.3) {
    // 1. Boundary check
    const minW = -this.halfSize + 0.5 + radius;
    const maxW = this.halfSize - 0.5 - radius;
    if (wx < minW || wx > maxW || wz < minW || wz > maxW) {
      return true;
    }

    // 2. Obstacle box collision check
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const halfW = obs.width / 2 + radius;
      const halfD = obs.depth / 2 + radius;
      if (
        Math.abs(wx - obs.x) < halfW &&
        Math.abs(wz - obs.z) < halfD
      ) {
        return true;
      }
    }

    return false;
  }

  build3DWorld() {
    this.obstacles = [];

    // Shared block geometries
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const halfCubeGeo = new THREE.BoxGeometry(1, 0.5, 1);

    // Ground Materials
    const grassTopMat = new THREE.MeshLambertMaterial({ map: grassTopTexture });
    const grassSideMat = new THREE.MeshLambertMaterial({ map: grassSideTexture });
    const dirtMat = new THREE.MeshLambertMaterial({ map: dirtTexture });
    const grassBlockMaterials = [
      grassSideMat, grassSideMat, grassTopMat, dirtMat, grassSideMat, grassSideMat
    ];

    const cobbleMat = new THREE.MeshLambertMaterial({ map: cobblestoneTexture });
    const gravelMat = new THREE.MeshLambertMaterial({ map: gravelTexture });
    const flowerMat = new THREE.MeshLambertMaterial({ map: flowerGrassTexture });
    const waterMat = new THREE.MeshLambertMaterial({
      map: waterTexture,
      transparent: true,
      opacity: 0.8
    });
    const hedgeMat = new THREE.MeshLambertMaterial({ map: leavesTexture });
    const woodMat = new THREE.MeshLambertMaterial({ map: woodPlankTexture });
    const logSideMat = new THREE.MeshLambertMaterial({ map: logSideTexture });
    const logTopMat = new THREE.MeshLambertMaterial({ map: logTopTexture });
    const logMaterials = [logSideMat, logSideMat, logTopMat, logTopMat, logSideMat, logSideMat];
    const leavesMat = new THREE.MeshLambertMaterial({
      map: leavesTexture,
      transparent: true,
      alphaTest: 0.1
    });

    // Counts for instanced meshes
    const instances = {
      grass: [],
      cobble: [],
      gravel: [],
      flowers: [],
      water: [],
      hedges: [],
      fences: []
    };

    for (let z = 0; z < this.size; z++) {
      for (let x = 0; x < this.size; x++) {
        const type = this.grid[z][x];
        const w = this.gridToWorld(x, z);

        // Ground level block at y = -0.5 (top at y = 0)
        const groundMatrix = new THREE.Matrix4().setPosition(w.x, -0.5, w.z);

        if (type === TILE.GRASS || type === TILE.TREE || type === TILE.BENCH) {
          instances.grass.push(groundMatrix);
        } else if (type === TILE.COBBLE) {
          instances.cobble.push(groundMatrix);
        } else if (type === TILE.GRAVEL) {
          instances.gravel.push(groundMatrix);
        } else if (type === TILE.FLOWERS) {
          instances.flowers.push(groundMatrix);
        } else if (type === TILE.WATER) {
          // Sunken water block
          const waterMatrix = new THREE.Matrix4().setPosition(w.x, -0.65, w.z);
          instances.water.push(waterMatrix);
          this.obstacles.push({ x: w.x, z: w.z, width: 1.0, depth: 1.0 });
        } else if (type === TILE.HEDGE) {
          instances.grass.push(groundMatrix);
          // 1-block high hedge on top
          const hedgeMatrix = new THREE.Matrix4().setPosition(w.x, 0.5, w.z);
          instances.hedges.push(hedgeMatrix);
          this.obstacles.push({ x: w.x, z: w.z, width: 1.0, depth: 1.0 });
        } else if (type === TILE.FENCE) {
          instances.cobble.push(groundMatrix);
          // Border stone / fence post
          const fenceMatrix = new THREE.Matrix4().setPosition(w.x, 0.5, w.z);
          instances.fences.push(fenceMatrix);
          this.obstacles.push({ x: w.x, z: w.z, width: 1.0, depth: 1.0 });
        } else if (type === TILE.GATE) {
          instances.cobble.push(groundMatrix);
          const orientation = (z === 0 || z === this.size - 1) ? 'horizontal' : 'vertical';
          this.buildGate(w.x, w.z, orientation, cubeGeo, cobbleMat);
        }

        // Additional obstacles & 3D props
        if (type === TILE.TREE) {
          this.buildTree(w.x, w.z, cubeGeo, logMaterials, leavesMat);
        } else if (type === TILE.BENCH) {
          this.buildBench(w.x, w.z, woodMat);
        }
      }
    }

    // Create InstancedMeshes for high rendering performance
    this.createInstancedMesh(cubeGeo, grassBlockMaterials, instances.grass);
    this.createInstancedMesh(cubeGeo, cobbleMat, instances.cobble);
    this.createInstancedMesh(cubeGeo, gravelMat, instances.gravel);
    this.createInstancedMesh(cubeGeo, flowerMat, instances.flowers);
    this.createInstancedMesh(cubeGeo, waterMat, instances.water);
    this.createInstancedMesh(cubeGeo, hedgeMat, instances.hedges);
    this.createInstancedMesh(cubeGeo, cobbleMat, instances.fences);

    // Decorative fountain monument in central pool
    this.buildFountainMonument(cubeGeo, cobbleMat);
  }

  createInstancedMesh(geometry, material, matrices) {
    if (matrices.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.mapGroup.add(mesh);
  }

  buildTree(x, z, cubeGeo, logMats, leavesMat) {
    // 3-block tall wood log trunk
    const trunkGroup = new THREE.Group();
    for (let y = 0; y < 3; y++) {
      const logMesh = new THREE.Mesh(cubeGeo, logMats);
      logMesh.position.set(x, 0.5 + y, z);
      logMesh.castShadow = true;
      logMesh.receiveShadow = true;
      trunkGroup.add(logMesh);
    }
    this.mapGroup.add(trunkGroup);

    // Solid obstacle for trunk
    this.obstacles.push({ x, z, width: 0.85, depth: 0.85 });

    // Leaf canopy: 3x3x2 cube on top (y = 2.5 to 4.5)
    const leavesGroup = new THREE.Group();
    for (let ly = 2; ly <= 4; ly++) {
      const radius = ly === 4 ? 1 : 2;
      for (let ox = -radius; ox <= radius; ox++) {
        for (let oz = -radius; oz <= radius; oz++) {
          // Skip corners on widest layer for rounded Minecraft look
          if (radius === 2 && Math.abs(ox) === 2 && Math.abs(oz) === 2) continue;
          if (ly < 3 && ox === 0 && oz === 0) continue; // Trunk occupies center

          const leaf = new THREE.Mesh(cubeGeo, leavesMat);
          leaf.position.set(x + ox, 0.5 + ly, z + oz);
          leaf.castShadow = true;
          leaf.receiveShadow = true;
          leavesGroup.add(leaf);
        }
      }
    }
    this.mapGroup.add(leavesGroup);
  }

  buildBench(x, z, woodMat) {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, 0, z);

    // Seat plank (0.9 wide x 0.12 thick x 0.5 deep) at height 0.35
    const seatGeo = new THREE.BoxGeometry(0.9, 0.12, 0.5);
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.set(0, 0.35, 0);
    seat.castShadow = true;
    benchGroup.add(seat);

    // Backrest plank
    const backGeo = new THREE.BoxGeometry(0.9, 0.35, 0.12);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(0, 0.65, -0.2);
    back.castShadow = true;
    benchGroup.add(back);

    // Bench legs
    const legGeo = new THREE.BoxGeometry(0.1, 0.35, 0.45);
    const legLeft = new THREE.Mesh(legGeo, woodMat);
    legLeft.position.set(-0.35, 0.175, 0);
    legLeft.castShadow = true;
    benchGroup.add(legLeft);

    const legRight = new THREE.Mesh(legGeo, woodMat);
    legRight.position.set(0.35, 0.175, 0);
    legRight.castShadow = true;
    benchGroup.add(legRight);

    this.mapGroup.add(benchGroup);
    this.obstacles.push({ x, z, width: 0.9, depth: 0.6 });
  }

  buildFountainMonument(cubeGeo, cobbleMat) {
    const center = this.gridToWorld(this.halfSize, this.halfSize);
    const monument = new THREE.Mesh(cubeGeo, cobbleMat);
    monument.scale.set(0.6, 1.6, 0.6);
    monument.position.set(center.x, 0.8, center.z);
    monument.castShadow = true;
    monument.receiveShadow = true;
    this.mapGroup.add(monument);
    this.obstacles.push({ x: center.x, z: center.z, width: 0.8, depth: 0.8 });
  }

  buildGate(x, z, orientation, cubeGeo, cobbleMat) {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(x, 0, z);

    // Materials
    const barMat = new THREE.MeshLambertMaterial({ color: 0x242424 }); // Wrought iron bars
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd700 }); // Brass lock
    const lanternMat = new THREE.MeshLambertMaterial({
      color: 0xffe082,
      emissive: 0xffa000,
      emissiveIntensity: 0.5
    });

    // Vertical Iron Bars
    const barGeo = new THREE.BoxGeometry(0.08, 1.8, 0.08);
    for (let offset = -0.36; offset <= 0.36; offset += 0.24) {
      const bar = new THREE.Mesh(barGeo, barMat);
      if (orientation === 'horizontal') {
        bar.position.set(offset, 0.9, 0);
      } else {
        bar.position.set(0, 0.9, offset);
      }
      bar.castShadow = true;
      gateGroup.add(bar);
    }

    // Horizontal Rails
    const railGeo = orientation === 'horizontal'
      ? new THREE.BoxGeometry(0.98, 0.08, 0.12)
      : new THREE.BoxGeometry(0.12, 0.08, 0.98);

    const railLower = new THREE.Mesh(railGeo, barMat);
    railLower.position.y = 0.4;
    railLower.castShadow = true;
    gateGroup.add(railLower);

    const railUpper = new THREE.Mesh(railGeo, barMat);
    railUpper.position.y = 1.4;
    railUpper.castShadow = true;
    gateGroup.add(railUpper);

    // Center Golden Lock
    const lockGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const lock = new THREE.Mesh(lockGeo, goldMat);
    lock.position.y = 0.9;
    lock.castShadow = true;
    gateGroup.add(lock);

    // Stone Arch Header
    const archGeo = orientation === 'horizontal'
      ? new THREE.BoxGeometry(1.0, 0.35, 0.35)
      : new THREE.BoxGeometry(0.35, 0.35, 1.0);
    const arch = new THREE.Mesh(archGeo, cobbleMat);
    arch.position.y = 2.0;
    arch.castShadow = true;
    gateGroup.add(arch);

    // Lantern on top of arch
    const lanternGeo = new THREE.BoxGeometry(0.24, 0.3, 0.24);
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.y = 2.3;
    gateGroup.add(lantern);

    this.mapGroup.add(gateGroup);
    // Add collision obstacle to solidly block entrance
    this.obstacles.push({ x, z, width: 1.0, depth: 1.0 });
  }
}
