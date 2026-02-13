const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

const GRAVITY = 0.55;
const GROUND_FRICTION = 0.82;
const AIR_FRICTION = 0.94;
const MAX_FALL = 14;

const world = {
  width: 3200,
  height: canvas.height,
  cameraX: 0,
  score: 0,
  lives: 3,
  gameOver: false,
  win: false,
  frame: 0,
};

const keys = { left: false, right: false, jump: false };

const player = {
  x: 100,
  y: 100,
  w: 42,
  h: 58,
  vx: 0,
  vy: 0,
  speed: 1.05,
  jumpPower: -14,
  onGround: false,
  facing: 1,
  invincibleTimer: 0,
};

const platforms = [
  { x: 0, y: 510, w: 840, h: 30 },
  { x: 890, y: 460, w: 220, h: 80 },
  { x: 1160, y: 420, w: 200, h: 120 },
  { x: 1420, y: 510, w: 980, h: 30 },
  { x: 1760, y: 445, w: 140, h: 22 },
  { x: 1980, y: 390, w: 140, h: 22 },
  { x: 2190, y: 335, w: 140, h: 22 },
  { x: 2410, y: 510, w: 760, h: 30 },
];

const blocks = [
  { x: 520, y: 360, w: 40, h: 40, type: "question" },
  { x: 560, y: 360, w: 40, h: 40, type: "brick" },
  { x: 600, y: 360, w: 40, h: 40, type: "brick" },
  { x: 1730, y: 300, w: 40, h: 40, type: "question" },
  { x: 1770, y: 300, w: 40, h: 40, type: "brick" },
];

const coins = Array.from({ length: 30 }, (_, i) => ({
  x: 170 + i * 95,
  y: i % 4 === 0 ? 320 : i % 2 ? 390 : 270,
  r: 11,
  taken: false,
}));

const enemies = [
  { x: 700, y: 484, w: 34, h: 26, vx: -1.8, minX: 560, maxX: 820, dead: false },
  { x: 1610, y: 484, w: 34, h: 26, vx: -2.2, minX: 1450, maxX: 2350, dead: false },
  { x: 2580, y: 484, w: 34, h: 26, vx: -1.7, minX: 2450, maxX: 3020, dead: false },
];

const goal = { x: 3090, y: 380, w: 16, h: 130 };

function renderHUD() {
  scoreEl.textContent = `Score: ${world.score}`;
  livesEl.textContent = `Lives: ${world.lives}`;
}

function resetGame(full = false) {
  player.x = 100;
  player.y = 140;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.invincibleTimer = 85;
  world.cameraX = 0;

  if (full) {
    world.score = 0;
    world.lives = 3;
    world.gameOver = false;
    world.win = false;
    coins.forEach((c) => (c.taken = false));
    enemies.forEach((e) => (e.dead = false));
  }

  renderHUD();
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function loseLife() {
  world.lives -= 1;
  renderHUD();
  if (world.lives <= 0) {
    world.gameOver = true;
    return;
  }
  resetGame(false);
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
  player.vx = Math.max(Math.min(player.vx, 8.5), -8.5);

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
      if (p.type === "question") {
        world.score += 50;
        renderHUD();
      }
      player.vy = 0.4;
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

  player.x = Math.max(0, Math.min(player.x, world.width - player.w));
  const cameraTarget = player.x - canvas.width * 0.38;
  world.cameraX = Math.max(0, Math.min(cameraTarget, world.width - canvas.width));
}

function updateCoins() {
  for (const coin of coins) {
    if (coin.taken) continue;
    const dx = player.x + player.w / 2 - coin.x;
    const dy = player.y + player.h / 2 - coin.y;
    if (Math.hypot(dx, dy) < coin.r + player.w * 0.34) {
      coin.taken = true;
      world.score += 100;
      renderHUD();
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
      world.score += 250;
      renderHUD();
    } else if (player.invincibleTimer <= 0) {
      loseLife();
      return;
    }
  }
}

function checkGoal() {
  if (overlaps(player, goal)) world.win = true;
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
  skyGrad.addColorStop(0.62, "#9edbff");
  skyGrad.addColorStop(1, "#b6f3ff");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Far hills
  for (let i = -1; i < 8; i++) {
    const x = i * 260 - (world.cameraX * 0.16) % 260;
    drawRoundRect(x, 360, 220, 180, 90, "#7fd16d");
  }

  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 9; i++) {
    const x = i * 220 - (world.cameraX * 0.28) % 220;
    const y = 70 + (i % 3) * 42;
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
    if (b.type === "question") {
      drawRoundRect(bx, b.y, b.w, b.h, 7, "#f2a72f");
      ctx.fillStyle = "#f9de95";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", bx + b.w / 2, b.y + 29);
    } else {
      drawRoundRect(bx, b.y, b.w, b.h, 7, "#b86f3a");
      ctx.strokeStyle = "#894921";
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + 4, b.y + 4, b.w - 8, b.h - 8);
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

function drawMarioLikeCharacter() {
  if (player.invincibleTimer % 6 >= 3) return;

  const px = Math.floor(player.x - world.cameraX);
  const py = Math.floor(player.y);
  const runCycle = Math.sin(world.frame * 0.32 + player.x * 0.06) * Math.min(Math.abs(player.vx), 1);
  const armSwing = runCycle * 5;
  const legSwing = runCycle * 7;

  ctx.save();
  ctx.translate(px + player.w / 2, py + player.h / 2);
  ctx.scale(player.facing, 1);

  // legs/shoes
  drawRoundRect(-12 - legSwing * 0.2, 16, 12, 16, 4, "#1c56d8");
  drawRoundRect(2 + legSwing * 0.2, 16, 12, 16, 4, "#1c56d8");
  drawRoundRect(-14 - legSwing * 0.2, 28, 14, 6, 3, "#6e3b1d");
  drawRoundRect(2 + legSwing * 0.2, 28, 14, 6, 3, "#6e3b1d");

  // body + overalls
  drawRoundRect(-14, -6, 28, 26, 9, "#e5392f");
  drawRoundRect(-11, 2, 22, 20, 8, "#1f5fff");
  ctx.fillStyle = "#ffdc9f";
  ctx.beginPath();
  ctx.arc(0, -10, 11, 0, Math.PI * 2);
  ctx.fill();

  // cap
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

  // eyes + nose + moustache
  ctx.fillStyle = "#fff";
  ctx.fillRect(-7, -13, 4, 5);
  ctx.fillRect(2, -13, 4, 5);
  ctx.fillStyle = "#2d67d8";
  ctx.fillRect(-6, -12, 2, 3);
  ctx.fillRect(3, -12, 2, 3);
  drawRoundRect(-3, -8, 6, 5, 2.5, "#f0ba84");
  drawRoundRect(-8, -3, 16, 4, 2, "#1d1d1d");

  // gloves/arms
  drawRoundRect(-20, -2 + armSwing * 0.25, 8, 16, 4, "#e5392f");
  drawRoundRect(12, -2 - armSwing * 0.25, 8, 16, 4, "#e5392f");
  drawRoundRect(-22, 8 + armSwing * 0.25, 10, 8, 4, "#ffffff");
  drawRoundRect(12, 8 - armSwing * 0.25, 10, 8, 4, "#ffffff");

  // buttons
  ctx.fillStyle = "#ffe37a";
  ctx.beginPath();
  ctx.arc(-5, 8, 2.2, 0, Math.PI * 2);
  ctx.arc(5, 8, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGoal() {
  drawWorldRect(goal.x, goal.y, goal.w, goal.h, "#ffffff");
  const fx = goal.x + 16 - world.cameraX;
  drawWorldRect(goal.x + 16, goal.y, 5, 20, "#35c96a");
  ctx.fillStyle = "#35c96a";
  ctx.beginPath();
  ctx.moveTo(fx + 5, goal.y + 2);
  ctx.lineTo(fx + 45, goal.y + 10);
  ctx.lineTo(fx + 5, goal.y + 18);
  ctx.closePath();
  ctx.fill();
}

function drawOverlay() {
  if (!world.gameOver && !world.win) return;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 56px sans-serif";
  ctx.fillText(world.win ? "COURSE CLEAR!" : "GAME OVER", canvas.width / 2, 230);
  ctx.font = "28px sans-serif";
  ctx.fillText("R キーでリスタート", canvas.width / 2, 295);
}

function drawScene() {
  drawBackground();
  drawGroundDecor();
  drawPlatformsAndBlocks();
  drawCoins();
  drawEnemies();
  drawGoal();
  drawMarioLikeCharacter();
  drawOverlay();
}

function gameLoop() {
  world.frame += 1;
  if (!world.gameOver && !world.win) {
    updatePlayer();
    updateCoins();
    updateEnemies();
    checkGoal();
  }
  drawScene();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft") keys.left = true;
  if (e.code === "ArrowRight") keys.right = true;
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
  if (e.code === "Space") keys.jump = false;
});

resetGame(true);
gameLoop();
