const frame_rate = 120;
const sim_tick_speed = 100;

let creature_multiplier = 1;
let simulation_speed = 1;
let containmentActive = true;

let containmentRangeX = window.innerWidth * 0.05; // 5%
let containmentRangeY = window.innerHeight * 0.05; // 5%

(() => {
  // Configuration tuned for a fast, GPU-backed swarm.
  const GRID_CELL_SIZE = 64;
  const LOGIC_STEP = 1 / sim_tick_speed;
  const BASE_DENSITY = 16000; // Pixels per fish at multiplier 1.0
  const MAX_FISH = 1200;
  const MIN_FISH = 8;
  const CONTAINMENT_PUSH = 260;

  const FISH_PROFILES = [
    {
      key: "shoal",
      color: 0x7cd9ff,
      scale: 0.9,
      maxSpeed: 230,
      minSpeed: 70,
      maxAccel: 420,
      vision: 90,
      separation: 22,
      quadrantRadius: 1,
      alignmentStrength: 0.055,
      cohesionStrength: 0.008,
      separationStrength: 150,
      jitterStrength: 16,
    },
    {
      key: "glider",
      color: 0x9ee6c4,
      scale: 1.05,
      maxSpeed: 190,
      minSpeed: 55,
      maxAccel: 320,
      vision: 105,
      separation: 26,
      quadrantRadius: 2,
      alignmentStrength: 0.065,
      cohesionStrength: 0.011,
      separationStrength: 140,
      jitterStrength: 12,
    },
    {
      key: "scout",
      color: 0xffc36f,
      scale: 0.95,
      maxSpeed: 245,
      minSpeed: 90,
      maxAccel: 480,
      vision: 130,
      separation: 24,
      quadrantRadius: 3,
      alignmentStrength: 0.05,
      cohesionStrength: 0.009,
      separationStrength: 170,
      jitterStrength: 18,
    },
  ];

  class SpatialGrid {
    constructor(cellSize) {
      this.cellSize = cellSize;
      this.cells = new Map();
    }

    _key(x, y) {
      return `${x}|${y}`;
    }

    clear() {
      this.cells.clear();
    }

    insert(fish) {
      const cx = Math.floor(fish.x / this.cellSize);
      const cy = Math.floor(fish.y / this.cellSize);
      fish.cellX = cx;
      fish.cellY = cy;
      const key = this._key(cx, cy);
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = [];
        this.cells.set(key, bucket);
      }
      bucket.push(fish);
    }

    rebuild(fishList) {
      this.clear();
      for (const fish of fishList) {
        this.insert(fish);
      }
    }

    gatherNeighbors(fish, radius, out) {
      out.length = 0;
      const startX = fish.cellX - radius;
      const endX = fish.cellX + radius;
      const startY = fish.cellY - radius;
      const endY = fish.cellY + radius;
      for (let gx = startX; gx <= endX; gx += 1) {
        for (let gy = startY; gy <= endY; gy += 1) {
          const bucket = this.cells.get(this._key(gx, gy));
          if (!bucket) {
            continue;
          }
          for (let i = 0; i < bucket.length; i += 1) {
            out.push(bucket[i]);
          }
        }
      }
    }
  }

  class Fish {
    constructor(profile, texture, width, height) {
      this.profile = profile;
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      const direction = Math.random() * Math.PI * 2;
      const speed =
        profile.minSpeed +
        Math.random() * (profile.maxSpeed - profile.minSpeed) * 0.7;
      this.vx = Math.cos(direction) * speed;
      this.vy = Math.sin(direction) * speed;
      this.visionSq = profile.vision * profile.vision;
      this.separationSq = profile.separation * profile.separation;
      this.quadrantRadius = profile.quadrantRadius;
      this.sprite = new PIXI.Sprite(texture);
      this.sprite.anchor.set(0.5);
      this.sprite.scale.set(profile.scale);
      this.sprite.tint = profile.color;
      this.sprite.alpha = 0.9;
      this.updateSprite();
    }

    updateSprite() {
      this.sprite.position.set(this.x, this.y);
      const speedSq = this.vx * this.vx + this.vy * this.vy;
      if (speedSq > 0.0001) {
        this.sprite.rotation = Math.atan2(this.vy, this.vx);
      }
    }
  }

  let app;
  let fishTexture;
  let fishContainer;
  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;
  let logicAccumulator = 0;
  const grid = new SpatialGrid(GRID_CELL_SIZE);
  const neighbors = [];
  const school = [];

  function createFishTexture(renderer) {
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff);
    g.drawPolygon([14, 0, -12, 8, -12, -8]);
    g.endFill();
    return renderer.generateTexture(g);
  }

  async function setupPixi(canvas) {
    app = new PIXI.Application();
    await app.init({
      canvas,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resizeTo: window,
    });
    if (app.ticker) {
      app.ticker.maxFPS = frame_rate;
    }
    fishContainer = new PIXI.ParticleContainer(MAX_FISH, {
      rotation: true,
      position: true,
      tint: true,
      scale: true,
    });
    app.stage.addChild(fishContainer);
    fishTexture = createFishTexture(app.renderer);
    handleResize();
  }

  function desiredCount() {
    const baseByArea = Math.max(
      MIN_FISH,
      Math.round((viewWidth * viewHeight) / BASE_DENSITY),
    );
    return Math.min(
      MAX_FISH,
      Math.max(MIN_FISH, Math.round(baseByArea * creature_multiplier)),
    );
  }

  function addFish(count) {
    for (let i = 0; i < count; i += 1) {
      const profile = FISH_PROFILES[i % FISH_PROFILES.length];
      const fish = new Fish(profile, fishTexture, viewWidth, viewHeight);
      school.push(fish);
      if (typeof fishContainer.addParticle === "function") {
        fishContainer.addParticle(fish.sprite);
      } else {
        fishContainer.addChild(fish.sprite);
      }
    }
  }

  function trimFish(newCount) {
    while (school.length > newCount) {
      const fish = school.pop();
      if (typeof fishContainer.removeParticle === "function") {
        fishContainer.removeParticle(fish.sprite);
      } else {
        fishContainer.removeChild(fish.sprite);
      }
      fish.sprite.destroy();
    }
  }

  function rebalanceSchool() {
    const target = desiredCount();
    const delta = target - school.length;
    if (delta > 0) {
      addFish(delta);
    } else if (delta < 0) {
      trimFish(target);
    }
  }

  function applyContainment(fish, outForce) {
    outForce.x = 0;
    outForce.y = 0;
    if (!containmentActive) {
      return;
    }
    if (fish.x < containmentRangeX) {
      outForce.x +=
        (containmentRangeX - fish.x) / containmentRangeX * CONTAINMENT_PUSH;
    } else if (fish.x > viewWidth - containmentRangeX) {
      outForce.x -=
        (fish.x - (viewWidth - containmentRangeX)) /
        containmentRangeX *
        CONTAINMENT_PUSH;
    }
    if (fish.y < containmentRangeY) {
      outForce.y +=
        (containmentRangeY - fish.y) / containmentRangeY * CONTAINMENT_PUSH;
    } else if (fish.y > viewHeight - containmentRangeY) {
      outForce.y -=
        (fish.y - (viewHeight - containmentRangeY)) /
        containmentRangeY *
        CONTAINMENT_PUSH;
    }
  }

  function computeSteering(dt) {
    grid.rebuild(school);
    const containForce = { x: 0, y: 0 };
    for (let i = 0; i < school.length; i += 1) {
      const fish = school[i];
      const profile = fish.profile;

      grid.gatherNeighbors(fish, fish.quadrantRadius, neighbors);

      let neighborCount = 0;
      let cohesionX = 0;
      let cohesionY = 0;
      let alignX = 0;
      let alignY = 0;
      let separationX = 0;
      let separationY = 0;

      for (let j = 0; j < neighbors.length; j += 1) {
        const other = neighbors[j];
        if (other === fish) {
          continue;
        }
        const dx = other.x - fish.x;
        const dy = other.y - fish.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > fish.visionSq) {
          continue;
        }
        neighborCount += 1;
        cohesionX += other.x;
        cohesionY += other.y;
        alignX += other.vx;
        alignY += other.vy;

        if (distSq < fish.separationSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const weight = 1 - dist / fish.profile.separation;
          const invDist = 1 / dist;
          separationX -= dx * invDist * weight;
          separationY -= dy * invDist * weight;
        }
      }

      let accelX = 0;
      let accelY = 0;

      if (neighborCount > 0) {
        const invCount = 1 / neighborCount;
        const avgX = cohesionX * invCount;
        const avgY = cohesionY * invCount;
        const cohesionVecX = avgX - fish.x;
        const cohesionVecY = avgY - fish.y;
        accelX += cohesionVecX * profile.cohesionStrength;
        accelY += cohesionVecY * profile.cohesionStrength;

        const avgVelX = alignX * invCount;
        const avgVelY = alignY * invCount;
        accelX += (avgVelX - fish.vx) * profile.alignmentStrength;
        accelY += (avgVelY - fish.vy) * profile.alignmentStrength;
      }

      accelX += separationX * profile.separationStrength;
      accelY += separationY * profile.separationStrength;

      applyContainment(fish, containForce);
      accelX += containForce.x;
      accelY += containForce.y;

      accelX += (Math.random() - 0.5) * profile.jitterStrength;
      accelY += (Math.random() - 0.5) * profile.jitterStrength;

      const accelMagSq = accelX * accelX + accelY * accelY;
      const maxAccel = profile.maxAccel;
      if (accelMagSq > maxAccel * maxAccel) {
        const scale = maxAccel / Math.sqrt(accelMagSq);
        accelX *= scale;
        accelY *= scale;
      }

      fish.vx += accelX * dt;
      fish.vy += accelY * dt;

      const speedSq = fish.vx * fish.vx + fish.vy * fish.vy;
      const maxSpeed = profile.maxSpeed;
      const minSpeed = profile.minSpeed;
      if (speedSq > maxSpeed * maxSpeed) {
        const scale = maxSpeed / Math.sqrt(speedSq);
        fish.vx *= scale;
        fish.vy *= scale;
      } else if (speedSq < minSpeed * minSpeed) {
        const scale = minSpeed / (Math.sqrt(speedSq) || 1);
        fish.vx *= scale;
        fish.vy *= scale;
      }
    }
  }

  function moveFish(dt) {
    const effectiveDt = dt * simulation_speed;
    for (let i = 0; i < school.length; i += 1) {
      const fish = school[i];
      fish.x += fish.vx * effectiveDt;
      fish.y += fish.vy * effectiveDt;

      if (!containmentActive) {
        if (fish.x < 0) {
          fish.x += viewWidth;
        } else if (fish.x > viewWidth) {
          fish.x -= viewWidth;
        }
        if (fish.y < 0) {
          fish.y += viewHeight;
        } else if (fish.y > viewHeight) {
          fish.y -= viewHeight;
        }
      } else {
        fish.x = Math.max(0, Math.min(viewWidth, fish.x));
        fish.y = Math.max(0, Math.min(viewHeight, fish.y));
      }
      fish.updateSprite();
    }
  }

  function tick() {
    const dtSeconds = app.ticker.deltaMS / 1000;
    logicAccumulator += dtSeconds;
    while (logicAccumulator >= LOGIC_STEP) {
      computeSteering(LOGIC_STEP);
      logicAccumulator -= LOGIC_STEP;
    }
    moveFish(dtSeconds);
  }

  function syncMenuFromInputs() {
    const speedSlider = document.getElementById("speedSlider");
    const countSlider = document.getElementById("countSlider");
    const wallSlider = document.getElementById("wallSlider");
    const speedDisplay = document.getElementById("simSpeedValue");
    const countDisplay = document.getElementById("creatureCountValue");
    const wallDisplay = document.getElementById("wallValue");

    if (speedSlider && speedDisplay) {
      simulation_speed = Number(speedSlider.value || 100) / 100;
      speedDisplay.textContent = `${Math.round(simulation_speed * 100)}%`;
    }
    if (countSlider && countDisplay) {
      creature_multiplier = Number(countSlider.value || 1);
      countDisplay.textContent = `${creature_multiplier.toFixed(1)}x`;
    }
    if (wallSlider && wallDisplay) {
      containmentActive = Number(wallSlider.value || 1) >= 0.5;
      wallDisplay.textContent = containmentActive ? "Active" : "Loop";
    }
  }

  function bindMenu() {
    const speedSlider = document.getElementById("speedSlider");
    const countSlider = document.getElementById("countSlider");
    const wallSlider = document.getElementById("wallSlider");
    const speedDisplay = document.getElementById("simSpeedValue");
    const countDisplay = document.getElementById("creatureCountValue");
    const wallDisplay = document.getElementById("wallValue");

    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        const value = Number(e.target.value);
        simulation_speed = value / 100;
        if (speedDisplay) {
          speedDisplay.textContent = `${value}%`;
        }
      });
    }
    if (countSlider) {
      countSlider.addEventListener("input", (e) => {
        creature_multiplier = Number(e.target.value);
        if (countDisplay) {
          countDisplay.textContent = `${creature_multiplier.toFixed(1)}x`;
        }
        rebalanceSchool();
      });
    }
    if (wallSlider) {
      wallSlider.step = "1";
      wallSlider.addEventListener("input", (e) => {
        containmentActive = Number(e.target.value) >= 0.5;
        if (wallDisplay) {
          wallDisplay.textContent = containmentActive ? "Active" : "Loop";
        }
      });
    }
    syncMenuFromInputs();
  }

  function handleResize() {
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    containmentRangeX = viewWidth * 0.05;
    containmentRangeY = viewHeight * 0.05;
    if (app && app.renderer) {
      app.renderer.resize(viewWidth, viewHeight);
    }
    for (let i = 0; i < school.length; i += 1) {
      const fish = school[i];
      fish.x = (fish.x + viewWidth) % viewWidth;
      fish.y = (fish.y + viewHeight) % viewHeight;
    }
    rebalanceSchool();
  }

  async function init() {
    const canvas = document.getElementById("canvas");
    if (!canvas || typeof PIXI === "undefined") {
      console.error("Pixi canvas not found or PIXI unavailable.");
      return;
    }
    await setupPixi(canvas);
    bindMenu();
    rebalanceSchool();
    if (app.ticker) {
      app.ticker.add(tick);
      if (!app.ticker.started) {
        app.ticker.start();
      }
    }
    window.addEventListener("resize", handleResize);
  }

  window.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => console.error(err));
  });
})();
