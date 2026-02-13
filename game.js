const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

const GRAVITY = 0.58;
const FRICTION = 0.8;
const MAX_FALL = 13;

const world = {
  width: 2800,
  height: canvas.height,
  cameraX: 0,
  groundY: 470,
  score: 0,
  lives: 3,
  gameOver: false,
  win: false,
};

const keys = { left: false, right: false, jump: false };

const player = {
  x: 120,
  y: 100,
  w: 36,
  h: 48,
  vx: 0,
  vy: 0,
  speed: 0.8,
  jumpPower: -13,
  onGround: false,
  facing: 1,
  invincibleTimer: 0,
};

const platforms = [
  { x: 0, y: 510, w: 900, h: 30 },
  { x: 920, y: 470, w: 200, h: 70 },
  { x: 1180, y: 430, w: 180, h: 110 },
  { x: 1460, y: 510, w: 700, h: 30 },
  { x: 1780, y: 440, w: 140, h: 20 },
  { x: 1980, y: 380, w: 140, h: 20 },
  { x: 2180, y: 320, w: 140, h: 20 },
  { x: 2360, y: 510, w: 460, h: 30 },
];

const coins = Array.from({ length: 24 }, (_, i) => ({
  x: 180 + i * 105,
  y: i % 3 === 0 ? 330 : i % 2 === 0 ? 280 : 390,
  r: 10,
  taken: false,
}));

const enemies = [
  { x: 620, y: 482, w: 30, h: 28, vx: -1.5, minX: 500, maxX: 760, dead: false },
  { x: 1660, y: 482, w: 30, h: 28, vx: -2, minX: 1490, maxX: 2070, dead: false },
  { x: 2460, y: 482, w: 30, h: 28, vx: -1.8, minX: 2380, maxX: 2720, dead: false },
];

const goal = { x: 2720, y: 390, w: 16, h: 120 };

function resetGame(full = false) {
  player.x = 120;
  player.y = 100;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.invincibleTimer = 90;
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

function renderHUD() {
  scoreEl.textContent = `Score: ${world.score}`;
  livesEl.textContent = `Lives: ${world.lives}`;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

  player.vx *= FRICTION;
  player.vx = Math.max(Math.min(player.vx, 7.5), -7.5);

  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, MAX_FALL);

  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  for (const p of platforms) {
    if (!overlaps(player, p)) continue;

    const prevBottom = player.y + player.h - player.vy;
    const prevTop = player.y - player.vy;
    const prevRight = player.x + player.w - player.vx;
    const prevLeft = player.x - player.vx;

    if (prevBottom <= p.y) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (prevTop >= p.y + p.h) {
      player.y = p.y + p.h;
      player.vy = 0;
    } else if (prevRight <= p.x) {
      player.x = p.x - player.w;
      player.vx = 0;
    } else if (prevLeft >= p.x + p.w) {
      player.x = p.x + p.w;
      player.vx = 0;
    }
  }

  if (player.y > world.height + 200) {
    loseLife();
  }

  if (player.invincibleTimer > 0) player.invincibleTimer--;

  player.x = Math.max(0, Math.min(player.x, world.width - player.w));

  const cameraTarget = player.x - canvas.width * 0.4;
  world.cameraX = Math.max(0, Math.min(cameraTarget, world.width - canvas.width));
}

function updateCoins() {
  for (const coin of coins) {
    if (coin.taken) continue;
    const dx = player.x + player.w / 2 - coin.x;
    const dy = player.y + player.h / 2 - coin.y;
    if (Math.hypot(dx, dy) < coin.r + player.w * 0.35) {
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
    if (e.x < e.minX || e.x + e.w > e.maxX) {
      e.vx *= -1;
    }

    if (!overlaps(player, e)) continue;

    const playerBottomPrev = player.y + player.h - player.vy;
    if (playerBottomPrev <= e.y + 6 && player.vy > 0) {
      e.dead = true;
      player.vy = -9;
      world.score += 250;
      renderHUD();
    } else if (player.invincibleTimer <= 0) {
      loseLife();
      return;
    }
  }
}

function checkGoal() {
  if (overlaps(player, goal)) {
    world.win = true;
  }
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

function drawBackground() {
  ctx.fillStyle = "#5c94fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < 8; i++) {
    const x = ((i * 280 - world.cameraX * 0.3) % (canvas.width + 300)) - 150;
    const y = 60 + (i % 3) * 45;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.arc(x + 24, y - 10, 24, 0, Math.PI * 2);
    ctx.arc(x + 48, y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWorldRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x - world.cameraX), y, w, h);
}

function drawEntities() {
  for (const p of platforms) {
    drawWorldRect(p.x, p.y, p.w, p.h, "#8b4513");
    drawWorldRect(p.x, p.y, p.w, 6, "#a0522d");
  }

  for (const coin of coins) {
    if (coin.taken) continue;
    const x = coin.x - world.cameraX;
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(x, coin.y, coin.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  for (const e of enemies) {
    if (e.dead) continue;
    drawWorldRect(e.x, e.y, e.w, e.h, "#8c4b2f");
    drawWorldRect(e.x + 4, e.y + 8, 6, 6, "#fff");
    drawWorldRect(e.x + e.w - 10, e.y + 8, 6, 6, "#fff");
  }

  drawWorldRect(goal.x, goal.y, goal.w, goal.h, "#fefefe");
  drawWorldRect(goal.x + 16, goal.y, 6, 18, "#2ecc71");

  if (player.invincibleTimer % 6 < 3) {
    drawWorldRect(player.x, player.y, player.w, player.h, "#ff3c28");
    drawWorldRect(player.x + 6, player.y + 8, player.w - 12, 10, "#ffddb3");
    drawWorldRect(player.x, player.y + player.h - 10, player.w, 10, "#1f4bb8");
  }
}

function drawOverlay() {
  if (!world.gameOver && !world.win) return;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 56px sans-serif";
  ctx.fillText(world.win ? "CLEAR!" : "GAME OVER", canvas.width / 2, 220);
  ctx.font = "28px sans-serif";
  ctx.fillText("R キーでリスタート", canvas.width / 2, 290);
}

function gameLoop() {
  if (!world.gameOver && !world.win) {
    updatePlayer();
    updateCoins();
    updateEnemies();
    checkGoal();
  }

  drawBackground();
  drawEntities();
  drawOverlay();

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
  if (e.code === "KeyR") {
    resetGame(true);
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft") keys.left = false;
  if (e.code === "ArrowRight") keys.right = false;
  if (e.code === "Space") keys.jump = false;
});

resetGame(true);
gameLoop();
