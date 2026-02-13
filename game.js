const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const powerEl = document.getElementById("power");

const GRAVITY = 0.55;
const GROUND_FRICTION = 0.82;
const AIR_FRICTION = 0.94;
const MAX_FALL = 14;

const world = {
  width: 3800,
  height: canvas.height,
  cameraX: 0,
  score: 0,
  lives: 3,
  gameOver: false,
  win: false,
  frame: 0,
};

const keys = { left: false, right: false, jump: false, grab: false };

const player = {
  x: 100,
  y: 100,
  w: 42,
  h: 58,
  vx: 0,
  vy: 0,
  speed: 1.1,
  jumpPower: -14,
  onGround: false,
  facing: 1,
  invincibleTimer: 0,
  superTimer: 0,
};

const platforms = [
  { x: 0, y: 510, w: 980, h: 30 },
  { x: 1060, y: 470, w: 240, h: 70 },
  { x: 1360, y: 420, w: 220, h: 120 },
  { x: 1630, y: 510, w: 1220, h: 30 },
  { x: 1930, y: 440, w: 150, h: 20 },
  { x: 2170, y: 370, w: 150, h: 20 },
  { x: 2390, y: 300, w: 150, h: 20 },
  { x: 2640, y: 510, w: 1140, h: 30 },
];

const blocks = [
  { x: 520, y: 360, w: 40, h: 40, type: "question", content: "coin", used: false, bounce: 0 },
  { x: 560, y: 360, w: 40, h: 40, type: "question", content: "mushroom", used: false, bounce: 0 },
  { x: 600, y: 360, w: 40, h: 40, type: "brick", used: false, bounce: 0 },
  { x: 1980, y: 300, w: 40, h: 40, type: "question", content: "mushroom", used: false, bounce: 0 },
  { x: 2020, y: 300, w: 40, h: 40, type: "question", content: "coin", used: false, bounce: 0 },
  { x: 2060, y: 300, w: 40, h: 40, type: "brick", used: false, bounce: 0 },
  { x: 2940, y: 380, w: 40, h: 40, type: "question", content: "mushroom", used: false, bounce: 0 },
];

const boss = {
  x: 3540,
  y: 445,
  w: 86,
  h: 64,
  vx: -1.6,
  minX: 3330,
  maxX: 3730,
  alive: true,
  grabbed: false,
  thrown: false,
  throwVx: 0,
  throwVy: 0,
  spin: 0,
  tailLength: 44,
};

const items = [];
const popupCoins = [];
const floatingTexts = [];
const fallingClouds = [];

const coins = Array.from({ length: 36 }, (_, i) => ({
  x: 170 + i * 98,
  y: i % 4 === 0 ? 320 : i % 2 ? 390 : 270,
  r: 11,
  taken: false,
}));

const enemies = [
  { x: 700, y: 484, w: 34, h: 26, vx: -1.8, minX: 560, maxX: 860, dead: false },
  { x: 1710, y: 484, w: 34, h: 26, vx: -2.2, minX: 1570, maxX: 2680, dead: false },
  { x: 2980, y: 484, w: 34, h: 26, vx: -1.7, minX: 2750, maxX: 3430, dead: false },
];

function renderHUD() {
  scoreEl.textContent = `Score: ${world.score}`;
  livesEl.textContent = `Lives: ${world.lives}`;
  if (!boss.alive) {
    powerEl.textContent = "Power: BOSS DOWN";
  } else {
    powerEl.textContent = `Power: ${player.superTimer > 0 ? "SUPER" : "NORMAL"}`;
  }
}

function addScore(points, x = player.x, y = player.y) {
  world.score += points;
  floatingTexts.push({ x, y, text: `+${points}`, life: 45 });
  renderHUD();
}

function resetGame(full = false) {
  player.x = 100;
  player.y = 140;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.invincibleTimer = 80;
  if (full) player.superTimer = 0;
  world.cameraX = 0;

  boss.x = 3540;
  boss.y = 445;
  boss.vx = -1.6;
  boss.alive = true;
  boss.grabbed = false;
  boss.thrown = false;
  boss.throwVx = 0;
  boss.throwVy = 0;
  boss.spin = 0;

  if (full) {
    world.score = 0;
    world.lives = 3;
    world.gameOver = false;
    world.win = false;
    coins.forEach((c) => (c.taken = false));
    enemies.forEach((e) => (e.dead = false));
    blocks.forEach((b) => {
      b.used = false;
      b.bounce = 0;
    });
    items.length = 0;
    popupCoins.length = 0;
    floatingTexts.length = 0;
    fallingClouds.length = 0;
  }

  renderHUD();
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function loseLife() {
  if (player.superTimer > 0) {
    player.superTimer = 0;
    player.invincibleTimer = 110;
    renderHUD();
    return;
  }
  world.lives -= 1;
  renderHUD();
  if (world.lives <= 0) {
    world.gameOver = true;
    return;
  }
  resetGame(false);
}

function spawnItemFromBlock(block) {
  items.push({
    type: block.content,
    x: block.x + 6,
    y: block.y - 24,
    w: 28,
    h: 28,
    vx: 1.4 * (player.facing || 1),
    vy: -1.2,
    emerging: 18,
    onGround: false,
    collected: false,
  });
}

function hitBlockFromBelow(block) {
  block.bounce = 8;
  if (block.type === "question" && !block.used) {
    block.used = true;
    if (block.content === "coin") {
      addScore(150, block.x, block.y - 20);
      popupCoins.push({ x: block.x + block.w / 2, y: block.y - 6, vy: -3.4, life: 30 });
    } else {
      spawnItemFromBlock(block);
    }
  }
}

function updatePlayer() {
  if (keys.left) {
    player.vx -= player.speed;
    player.facing = -1;
  }
  if (keys.right) {
    player.vx += player.speed;
    player.facing = 1;
  }

  player.vx *= player.onGround ? GROUND_FRICTION : AIR_FRICTION;
  player.vx = Math.max(Math.min(player.vx, 8.8), -8.8);

  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, MAX_FALL);

  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  const solids = [...platforms, ...blocks];
  for (const p of solids) {
    if (!overlaps(player, p)) continue;

    const prevBottom = player.y + player.h - player.vy;
    const prevTop = player.y - player.vy;
    const prevRight = player.x + player.w - player.vx;
    const prevLeft = player.x - player.vx;

    if (prevBottom <= p.y + 1) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (prevTop >= p.y + p.h - 1) {
      player.y = p.y + p.h;
      if (p.type) hitBlockFromBelow(p);
      player.vy = 0.5;
    } else if (prevRight <= p.x + 1) {
      player.x = p.x - player.w;
      player.vx = 0;
    } else if (prevLeft >= p.x + p.w - 1) {
      player.x = p.x + p.w;
      player.vx = 0;
    }
  }

  if (player.y > world.height + 200) loseLife();
  if (player.invincibleTimer > 0) player.invincibleTimer--;
  if (player.superTimer > 0 && --player.superTimer % 20 === 0) renderHUD();

  player.x = Math.max(0, Math.min(player.x, world.width - player.w));
  const cameraTarget = player.x - canvas.width * 0.38;
  world.cameraX = Math.max(0, Math.min(cameraTarget, world.width - canvas.width));
}

function resolveItemCollision(item, solid) {
  if (!overlaps(item, solid)) return;

  const prevBottom = item.y + item.h - item.vy;
  const prevTop = item.y - item.vy;
  const prevRight = item.x + item.w - item.vx;
  const prevLeft = item.x - item.vx;

  if (prevBottom <= solid.y + 1) {
    item.y = solid.y - item.h;
    item.vy = 0;
    item.onGround = true;
  } else if (prevTop >= solid.y + solid.h - 1) {
    item.y = solid.y + solid.h;
    item.vy = 0;
  } else if (prevRight <= solid.x + 1) {
    item.x = solid.x - item.w;
    item.vx = -Math.abs(item.vx);
  } else if (prevLeft >= solid.x + solid.w - 1) {
    item.x = solid.x + solid.w;
    item.vx = Math.abs(item.vx);
  }
}

function updateItems() {
  const solids = [...platforms, ...blocks];
  for (const item of items) {
    if (item.collected) continue;

    if (item.emerging > 0) {
      item.y -= 1.4;
      item.emerging--;
    } else {
      item.vy += GRAVITY * 0.75;
      item.vy = Math.min(item.vy, 8);
      item.x += item.vx;
      item.y += item.vy;
      item.onGround = false;

      for (const s of solids) resolveItemCollision(item, s);
    }

    if (overlaps(item, player)) {
      item.collected = true;
      addScore(500, item.x, item.y);
      player.superTimer = 900;
      player.invincibleTimer = 70;
    }
  }
}

function updateBlocks() {
  for (const block of blocks) {
    if (block.bounce > 0) block.bounce -= 1;
  }
}

function updateCoins() {
  for (const coin of coins) {
    if (coin.taken) continue;
    const dx = player.x + player.w / 2 - coin.x;
    const dy = player.y + player.h / 2 - coin.y;
    if (Math.hypot(dx, dy) < coin.r + player.w * 0.34) {
      coin.taken = true;
      addScore(100, coin.x, coin.y);
    }
  }
}

function updateEnemies() {
  for (const e of enemies) {
    if (e.dead) continue;
    e.x += e.vx;
    if (e.x < e.minX || e.x + e.w > e.maxX) e.vx *= -1;

    if (!overlaps(player, e)) continue;
    const playerBottomPrev = player.y + player.h - player.vy;
    if (playerBottomPrev <= e.y + 8 && player.vy > 0) {
      e.dead = true;
      player.vy = -9.5;
      addScore(250, e.x, e.y);
    } else if (player.superTimer > 0) {
      e.dead = true;
      addScore(150, e.x, e.y);
    } else if (player.invincibleTimer <= 0) {
      loseLife();
      return;
    }
  }
}

function bossTailHitbox() {
  const tailW = 26;
  const tailH = 18;
  const tailX = boss.x + (boss.vx >= 0 ? -tailW + 6 : boss.w - 6);
  const tailY = boss.y + 34;
  return { x: tailX, y: tailY, w: tailW, h: tailH };
}

function updateBoss() {
  if (!boss.alive) return;

  if (boss.thrown) {
    boss.x += boss.throwVx;
    boss.y += boss.throwVy;
    boss.throwVy += 0.28;

    if (boss.y > world.height + 140 || boss.x < -180 || boss.x > world.width + 180) {
      boss.alive = false;
      world.win = true;
      addScore(3000, player.x, player.y - 40);
      return;
    }
  } else if (boss.grabbed) {
    boss.spin += 0.18 + Math.min(Math.abs(player.vx), 7) * 0.03;
    const radius = 74;
    boss.x = player.x + player.w / 2 + Math.cos(boss.spin) * radius - boss.w / 2;
    boss.y = player.y + player.h / 2 + Math.sin(boss.spin) * (radius * 0.65) - boss.h / 2;

    if (!keys.grab) {
      boss.grabbed = false;
      boss.thrown = true;
      const throwPower = 9 + Math.min(Math.abs(player.vx), 4);
      boss.throwVx = Math.cos(boss.spin) * throwPower;
      boss.throwVy = Math.sin(boss.spin) * throwPower - 5.5;
    }
  } else {
    boss.x += boss.vx;
    if (boss.x < boss.minX || boss.x + boss.w > boss.maxX) boss.vx *= -1;

    const tail = bossTailHitbox();
    if (keys.grab && overlaps(player, tail)) {
      boss.grabbed = true;
      boss.spin = 0;
    }

    if (overlaps(player, boss) && player.invincibleTimer <= 0 && player.superTimer <= 0) {
      loseLife();
    }
  }
}

function spawnFallingCloud() {
  const spawnX = world.cameraX + Math.random() * canvas.width;
  fallingClouds.push({
    x: Math.max(30, Math.min(world.width - 90, spawnX)),
    y: -40 - Math.random() * 180,
    w: 78,
    h: 44,
    vx: Math.random() * 1.6 - 0.8,
    vy: 3.2 + Math.random() * 2.2,
    life: 500,
    hit: false,
  });
}

function updateFallingClouds() {
  if (world.frame % 40 === 0) spawnFallingCloud();

  for (const cloud of fallingClouds) {
    cloud.x += cloud.vx;
    cloud.y += cloud.vy;
    cloud.life -= 1;

    if (!cloud.hit && overlaps(player, cloud)) {
      cloud.hit = true;
      cloud.life = 0;
      if (player.invincibleTimer <= 0) loseLife();
    }
  }

  for (let i = fallingClouds.length - 1; i >= 0; i--) {
    const c = fallingClouds[i];
    if (c.life <= 0 || c.y > world.height + 90) {
      fallingClouds.splice(i, 1);
    }
  }
}

function updateEffects() {
  for (const c of popupCoins) {
    c.y += c.vy;
    c.vy += 0.22;
    c.life -= 1;
  }
  for (const t of floatingTexts) {
    t.y -= 0.8;
    t.life -= 1;
  }
  for (let i = popupCoins.length - 1; i >= 0; i--) {
    if (popupCoins[i].life <= 0) popupCoins.splice(i, 1);
  }
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }
}

function drawRoundRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawBackground() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, "#7dc7ff");
  skyGrad.addColorStop(0.62, "#a6e2ff");
  skyGrad.addColorStop(1, "#d7f8ff");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = -1; i < 10; i++) {
    const x = i * 260 - (world.cameraX * 0.16) % 260;
    drawRoundRect(x, 360, 220, 180, 90, i % 2 ? "#7fd16d" : "#74ca61");
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 11; i++) {
    const x = i * 210 - (world.cameraX * 0.28) % 210;
    const y = 66 + (i % 3) * 42;
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 24, 0, Math.PI * 2);
    ctx.arc(x + 48, y, 30, 0, Math.PI * 2);
    ctx.arc(x + 84, y + 8, 25, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGroundDecor() {
  ctx.fillStyle = "#66b44f";
  ctx.fillRect(0, 505, canvas.width, 35);
  for (let i = 0; i < canvas.width; i += 24) {
    ctx.fillStyle = i % 48 ? "#8f5a2b" : "#7a4a24";
    ctx.fillRect(i, 520, 24, 20);
  }
}

function drawWorldRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x - world.cameraX), y, w, h);
}

function drawPlatformsAndBlocks() {
  for (const p of platforms) {
    drawWorldRect(p.x, p.y, p.w, p.h, "#8f5a2b");
    drawWorldRect(p.x, p.y, p.w, 6, "#ad6d35");
  }

  for (const b of blocks) {
    const bx = Math.floor(b.x - world.cameraX);
    const by = b.y - b.bounce * 0.8;

    if (b.type === "question" && !b.used) {
      drawRoundRect(bx, by, b.w, b.h, 7, "#f2a72f");
      ctx.fillStyle = "#f9de95";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", bx + b.w / 2, by + 29);
    } else if (b.type === "question" && b.used) {
      drawRoundRect(bx, by, b.w, b.h, 7, "#9d8d73");
      ctx.fillStyle = "#c6baa7";
      ctx.fillRect(bx + 8, by + 15, 24, 8);
    } else {
      drawRoundRect(bx, by, b.w, b.h, 7, "#b86f3a");
      ctx.strokeStyle = "#894921";
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + 4, by + 4, b.w - 8, b.h - 8);
    }
  }
}

function drawCoins() {
  const pulse = Math.sin(world.frame * 0.16) * 1.8;
  for (const coin of coins) {
    if (coin.taken) continue;
    const x = coin.x - world.cameraX;
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.ellipse(x, coin.y, coin.r + pulse * 0.4, coin.r + pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawItems() {
  for (const item of items) {
    if (item.collected) continue;
    const x = item.x - world.cameraX;
    const y = item.y;

    if (item.type === "mushroom") {
      drawRoundRect(x + 2, y + 12, 24, 14, 6, "#f7ebd5");
      drawRoundRect(x, y, 28, 16, 8, "#e6362f");
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + 9, y + 8, 3.5, 0, Math.PI * 2);
      ctx.arc(x + 19, y + 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b2b";
      ctx.fillRect(x + 8, y + 18, 3, 3);
      ctx.fillRect(x + 17, y + 18, 3, 3);
    }
  }
}

function drawFallingClouds() {
  for (const cloud of fallingClouds) {
    const x = cloud.x - world.cameraX;
    const y = cloud.y;

    ctx.fillStyle = "rgba(236, 246, 255, 0.96)";
    ctx.beginPath();
    ctx.arc(x + 20, y + 20, 15, 0, Math.PI * 2);
    ctx.arc(x + 38, y + 16, 18, 0, Math.PI * 2);
    ctx.arc(x + 58, y + 20, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(135, 188, 241, 0.68)";
    ctx.fillRect(x + 15, y + 30, 46, 6);
  }
}

function drawEffects() {
  for (const c of popupCoins) {
    const x = c.x - world.cameraX;
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.ellipse(x, c.y, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const t of floatingTexts) {
    const alpha = Math.max(0, t.life / 45);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x - world.cameraX, t.y);
  }
}

function drawEnemies() {
  for (const e of enemies) {
    if (e.dead) continue;
    const x = Math.floor(e.x - world.cameraX);
    drawRoundRect(x, e.y, e.w, e.h, 8, "#8f5232");
    ctx.fillStyle = "#f8efe6";
    ctx.fillRect(x + 5, e.y + 8, 6, 6);
    ctx.fillRect(x + e.w - 11, e.y + 8, 6, 6);
    ctx.fillStyle = "#5c2d17";
    ctx.fillRect(x + 2, e.y + e.h - 6, e.w - 4, 6);
  }
}

function drawBoss() {
  if (!boss.alive) return;
  const x = boss.x - world.cameraX;
  const y = boss.y;

  drawRoundRect(x, y + 18, boss.w, boss.h - 18, 14, "#2e7d32");
  drawRoundRect(x + 8, y, boss.w - 16, 28, 12, "#3fa447");
  ctx.fillStyle = "#f7e6c8";
  ctx.fillRect(x + 24, y + 16, 14, 10);
  ctx.fillRect(x + 48, y + 16, 14, 10);

  const tail = bossTailHitbox();
  const tx = tail.x - world.cameraX;
  drawRoundRect(tx, tail.y, tail.w, tail.h, 8, boss.grabbed ? "#ffd54f" : "#66bb6a");
}

function drawMarioLikeCharacter() {
  if (player.invincibleTimer % 6 >= 3) return;

  const px = Math.floor(player.x - world.cameraX);
  const py = Math.floor(player.y);
  const runCycle = Math.sin(world.frame * 0.32 + player.x * 0.06) * Math.min(Math.abs(player.vx), 1);
  const armSwing = runCycle * 5;
  const legSwing = runCycle * 7;
  const scale = player.superTimer > 0 ? 1.18 : 1;

  ctx.save();
  ctx.translate(px + player.w / 2, py + player.h / 2);
  ctx.scale(player.facing * scale, scale);

  if (player.superTimer > 0) {
    ctx.shadowColor = "rgba(255, 237, 84, 0.7)";
    ctx.shadowBlur = 14;
  }

  drawRoundRect(-12 - legSwing * 0.2, 16, 12, 16, 4, "#1c56d8");
  drawRoundRect(2 + legSwing * 0.2, 16, 12, 16, 4, "#1c56d8");
  drawRoundRect(-14 - legSwing * 0.2, 28, 14, 6, 3, "#6e3b1d");
  drawRoundRect(2 + legSwing * 0.2, 28, 14, 6, 3, "#6e3b1d");

  drawRoundRect(-14, -6, 28, 26, 9, "#e5392f");
  drawRoundRect(-11, 2, 22, 20, 8, "#1f5fff");
  ctx.fillStyle = "#ffdc9f";
  ctx.beginPath();
  ctx.arc(0, -10, 11, 0, Math.PI * 2);
  ctx.fill();

  drawRoundRect(-14, -22, 28, 12, 6, "#d62923");
  drawRoundRect(-11, -12, 22, 5, 2, "#b71f1a");
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, -16, 5.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cc1f19";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("M", 0, -13.7);

  ctx.fillStyle = "#fff";
  ctx.fillRect(-7, -13, 4, 5);
  ctx.fillRect(2, -13, 4, 5);
  ctx.fillStyle = "#2d67d8";
  ctx.fillRect(-6, -12, 2, 3);
  ctx.fillRect(3, -12, 2, 3);
  drawRoundRect(-3, -8, 6, 5, 2.5, "#f0ba84");
  drawRoundRect(-8, -3, 16, 4, 2, "#1d1d1d");

  drawRoundRect(-20, -2 + armSwing * 0.25, 8, 16, 4, "#e5392f");
  drawRoundRect(12, -2 - armSwing * 0.25, 8, 16, 4, "#e5392f");
  drawRoundRect(-22, 8 + armSwing * 0.25, 10, 8, 4, "#ffffff");
  drawRoundRect(12, 8 - armSwing * 0.25, 10, 8, 4, "#ffffff");

  ctx.fillStyle = "#ffe37a";
  ctx.beginPath();
  ctx.arc(-5, 8, 2.2, 0, Math.PI * 2);
  ctx.arc(5, 8, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawOverlay() {
  if (!world.gameOver && !world.win) {
    if (boss.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("X 長押しでボスのしっぽをつかむ → 離して投げる", 16, 28);
    }
    return;
  }

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 56px sans-serif";
  ctx.fillText(world.win ? "BOSS CLEAR!" : "GAME OVER", canvas.width / 2, 230);
  ctx.font = "28px sans-serif";
  ctx.fillText("R キーでリスタート", canvas.width / 2, 295);
}

function drawScene() {
  drawBackground();
  drawFallingClouds();
  drawGroundDecor();
  drawPlatformsAndBlocks();
  drawCoins();
  drawItems();
  drawEffects();
  drawEnemies();
  drawBoss();
  drawMarioLikeCharacter();
  drawOverlay();
}

function gameLoop() {
  world.frame += 1;
  if (!world.gameOver && !world.win) {
    updatePlayer();
    updateBlocks();
    updateItems();
    updateCoins();
    updateEnemies();
    updateBoss();
    updateFallingClouds();
    updateEffects();
  }
  drawScene();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft") keys.left = true;
  if (e.code === "ArrowRight") keys.right = true;
  if (e.code === "KeyX") keys.grab = true;
  if (e.code === "Space") {
    if (!keys.jump && player.onGround && !world.gameOver && !world.win) {
      player.vy = player.jumpPower;
      player.onGround = false;
    }
    keys.jump = true;
  }
  if (e.code === "KeyR") resetGame(true);
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft") keys.left = false;
  if (e.code === "ArrowRight") keys.right = false;
  if (e.code === "KeyX") keys.grab = false;
  if (e.code === "Space") keys.jump = false;
});

resetGame(true);
gameLoop();
