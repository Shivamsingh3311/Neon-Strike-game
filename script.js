
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const titleEl = document.getElementById("title");
const descriptionEl = document.getElementById("description");
const startButton = document.getElementById("startButton");

const W = canvas.width;
const H = canvas.height;

let player;
let bullets = [];
let enemies = [];
let particles = [];

let score = 0;
let health = 100;
let best = Number(localStorage.getItem("neonBest") || 0);
let running = false;
let lastTime = 0;
let spawnTimer = 0;
let shootTimer = 0;
let wave = 1;

const keys = {};
const mouse = {
  x: W / 2 + 100,
  y: H / 2,
  down: false
};

bestEl.textContent = best;

function startGame() {
  player = {
    x: W / 2,
    y: H / 2,
    speed: 270,
    radius: 15,
    angle: 0
  };

  bullets = [];
  enemies = [];
  particles = [];

  score = 0;
  health = 100;
  wave = 1;
  spawnTimer = 0.5;
  shootTimer = 0;

  scoreEl.textContent = score;
  healthEl.textContent = health;

  running = true;
  overlay.style.display = "none";

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createParticles(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i++) {
    const angle = random(0, Math.PI * 2);
    const speed = random(50, 230);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: random(0.25, 0.7),
      size: random(2, 5),
      color
    });
  }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);

  let x, y;

  if (side === 0) {
    x = random(0, W);
    y = -20;
  } else if (side === 1) {
    x = W + 20;
    y = random(0, H);
  } else if (side === 2) {
    x = random(0, W);
    y = H + 20;
  } else {
    x = -20;
    y = random(0, H);
  }

  const strong = Math.random() < 0.15;

  enemies.push({
    x,
    y,
    radius: strong ? 19 : 13,
    speed: random(55, 90) + wave * 5,
    hp: strong ? 3 : 1,
    maxHp: strong ? 3 : 1,
    color: strong ? "#ffb84d" : "#ff4d91"
  });
}

function shoot() {
  if (!running || shootTimer > 0) return;

  const angle = Math.atan2(
    mouse.y - player.y,
    mouse.x - player.x
  );

  player.angle = angle;

  bullets.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 600,
    vy: Math.sin(angle) * 600,
    radius: 4,
    life: 1.3
  });

  createParticles(
    player.x + Math.cos(angle) * 20,
    player.y + Math.sin(angle) * 20,
    "#ffe66d",
    3
  );

  shootTimer = 0.16;
}

function update(dt) {
  // Player movement
  if (keys["w"] || keys["arrowup"]) {
    player.y -= player.speed * dt;
  }

  if (keys["s"] || keys["arrowdown"]) {
    player.y += player.speed * dt;
  }

  if (keys["a"] || keys["arrowleft"]) {
    player.x -= player.speed * dt;
  }

  if (keys["d"] || keys["arrowright"]) {
    player.x += player.speed * dt;
  }

  player.x = clamp(player.x, player.radius, W - player.radius);
  player.y = clamp(player.y, player.radius, H - player.radius);

  player.angle = Math.atan2(
    mouse.y - player.y,
    mouse.x - player.x
  );

  // Shooting
  shootTimer -= dt;

  if (mouse.down || keys[" "]) {
    shoot();
  }

  // Difficulty and enemy spawning
  wave = 1 + Math.floor(score / 100);

  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(0.25, 1 - wave * 0.05);
  }

  // Move bullets
  bullets.forEach(bullet => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  });

  bullets = bullets.filter(bullet =>
    bullet.life > 0 &&
    bullet.x >= -20 &&
    bullet.x <= W + 20 &&
    bullet.y >= -20 &&
    bullet.y <= H + 20
  );

  // Move enemies toward the player
  enemies.forEach(enemy => {
    const angle = Math.atan2(
      player.y - enemy.y,
      player.x - enemy.x
    );

    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;
  });

  // Bullet-enemy collision
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    let hit = false;

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];

      if (distance(bullet, enemy) <
          bullet.radius + enemy.radius) {
        enemy.hp--;
        hit = true;

        createParticles(
          bullet.x,
          bullet.y,
          enemy.color,
          5
        );

        if (enemy.hp <= 0) {
          createParticles(
            enemy.x,
            enemy.y,
            enemy.color,
            18
          );

          enemies.splice(j, 1);

          score += enemy.maxHp === 3 ? 30 : 10;
          scoreEl.textContent = score;
        }

        break;
      }
    }

    if (hit) {
      bullets.splice(i, 1);
    }
  }

  // Enemy-player collision
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (distance(player, enemy) <
        player.radius + enemy.radius) {
      enemies.splice(i, 1);

      health = Math.max(0, health - 20);
      healthEl.textContent = health;

      createParticles(
        enemy.x,
        enemy.y,
        "#ff4d91",
        16
      );

      if (health <= 0) {
        endGame();
        return;
      }
    }
  }

  // Update particles
  particles.forEach(particle => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    particle.life -= dt;
  });

  particles = particles.filter(p => p.life > 0);
}

function drawBackground() {
  ctx.fillStyle = "#080f1b";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#15283c";
  ctx.lineWidth = 1;

  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Decorative stars
  ctx.fillStyle = "#4df5ff44";

  for (let i = 0; i < 45; i++) {
    const x = (i * 173) % W;
    const y = (i * 97) % H;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawPlayer() {
  ctx.save();

  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  ctx.shadowBlur = 20;
  ctx.shadowColor = "#4df5ff";

  ctx.fillStyle = "#4df5ff";
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.lineTo(-12, -12);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();
  ctx.arc(2, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();

  ctx.translate(enemy.x, enemy.y);

  ctx.shadowBlur = 18;
  ctx.shadowColor = enemy.color;
  ctx.fillStyle = enemy.color;

  ctx.beginPath();
  ctx.moveTo(enemy.radius + 3, 0);
  ctx.lineTo(0, -enemy.radius);
  ctx.lineTo(-enemy.radius, 0);
  ctx.lineTo(0, enemy.radius);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#250e24";

  ctx.beginPath();
  ctx.arc(2, 0, enemy.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (enemy.maxHp > 1) {
    ctx.fillStyle = "#411d2b";
    ctx.fillRect(enemy.x - 20, enemy.y - 28, 40, 4);

    ctx.fillStyle = "#ffb84d";
    ctx.fillRect(
      enemy.x - 20,
      enemy.y - 28,
      40 * enemy.hp / enemy.maxHp,
      4
    );
  }
}

function draw() {
  drawBackground();

  bullets.forEach(bullet => {
    ctx.save();

    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffe66d";
    ctx.fillStyle = "#ffe66d";

    ctx.beginPath();
    ctx.arc(
      bullet.x,
      bullet.y,
      bullet.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  });

  enemies.forEach(drawEnemy);

  particles.forEach(particle => {
    ctx.globalAlpha = Math.max(0, particle.life / 0.7);
    ctx.fillStyle = particle.color;

    ctx.fillRect(
      particle.x,
      particle.y,
      particle.size,
      particle.size
    );
  });

  ctx.globalAlpha = 1;

  if (player) {
    drawPlayer();
  }
}

function endGame() {
  running = false;

  best = Math.max(best, score);
  localStorage.setItem("neonBest", best);
  bestEl.textContent = best;

  titleEl.textContent = "GAME OVER";
  descriptionEl.textContent =
    `Your score: ${score} | Wave reached: ${wave}`;

  startButton.textContent = "PLAY AGAIN";
  overlay.style.display = "flex";

  draw();
}

function gameLoop(now) {
  if (!running) return;

  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  update(dt);
  draw();

  if (running) {
    requestAnimationFrame(gameLoop);
  }
}

// Start button
startButton.addEventListener("click", startGame);

// Keyboard controls
window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ([
    "arrowup", "arrowdown", "arrowleft",
    "arrowright", " "
  ].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
});

// Mouse aiming
function updateMouse(event) {
  const rect = canvas.getBoundingClientRect();

  mouse.x = (event.clientX - rect.left) * W / rect.width;
  mouse.y = (event.clientY - rect.top) * H / rect.height;
}

canvas.addEventListener("pointermove", updateMouse);

canvas.addEventListener("pointerdown", event => {
  updateMouse(event);
  mouse.down = true;
});

window.addEventListener("pointerup", () => {
  mouse.down = false;
});

// Touch controls
document.querySelectorAll("[data-key]").forEach(button => {
  const key = button.dataset.key;

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    keys[key.toLowerCase()] = true;
  });

  const release = () => {
    keys[key.toLowerCase()] = false;
  };

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

const fireButton = document.getElementById("fireButton");

fireButton.addEventListener("pointerdown", event => {
  event.preventDefault();
  mouse.down = true;
});

fireButton.addEventListener("pointerup", () => {
  mouse.down = false;
});

fireButton.addEventListener("pointercancel", () => {
  mouse.down = false;
});

fireButton.addEventListener("lostpointercapture", () => {
  mouse.down = false;
});

// Initial screen
player = {
  x: W / 2,
  y: H / 2,
  speed: 270,
  radius: 15,
  angle: 0
};

bullets = [];
enemies = [];
particles = [];

draw();
