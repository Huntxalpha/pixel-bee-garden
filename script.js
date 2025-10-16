/*
 * Pixel Bee Garden
 * Collect flowers while avoiding spiders. A simple endless game with retro pixel aesthetic.
 */

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // DOM elements
  const startScreen = document.getElementById('start-screen');
  const gameOverScreen = document.getElementById('game-over');
  const playBtn = document.getElementById('play-btn');
  const restartBtn = document.getElementById('restart-btn');
  const shareBtn = document.getElementById('share-btn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const finalScoreEl = document.getElementById('final-score');
  const finalBestEl = document.getElementById('final-best');

  let running = false;
  let lastTime = 0;
  let flowerTimer = 0;
  let spiderTimer = 0;
  let score = 0;
  let best = parseInt(localStorage.getItem('bee_best') || '0');
  bestEl.textContent = best;
  finalBestEl.textContent = best;

  // Player controlled bee
  const bee = {
    x: W / 2,
    y: H / 2,
    size: 14,
    speed: 2.5,
    moveX: 0,
    moveY: 0,
    update(dt) {
      // Normalize diagonal movement
      let dx = this.moveX;
      let dy = this.moveY;
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      }
      this.x += dx * this.speed * (dt * 60);
      this.y += dy * this.speed * (dt * 60);
      // clamp within bounds
      const half = this.size / 2;
      if (this.x < half) this.x = half;
      if (this.x > W - half) this.x = W - half;
      if (this.y < half) this.y = half;
      if (this.y > H - half) this.y = H - half;
    },
    draw() {
      // draw bee body (yellow)
      const half = this.size / 2;
      ctx.fillStyle = '#f9c74f';
      ctx.fillRect(this.x - half, this.y - half, this.size, this.size * 0.6);
      // draw stripes
      ctx.fillStyle = '#4d2800';
      ctx.fillRect(this.x - half + 2, this.y - half + 3, this.size - 4, 3);
      ctx.fillRect(this.x - half + 2, this.y - half + 8, this.size - 4, 3);
      // wings
      ctx.fillStyle = '#a5d8ff';
      ctx.fillRect(this.x - half - 3, this.y - half - 2, 6, 4);
      ctx.fillRect(this.x + half - 3, this.y - half - 2, 6, 4);
    }
  };

  // Flowers (collectables)
  const flowers = [];
  function spawnFlower() {
    // spawn at random location not too close to edges
    const margin = 20;
    const x = margin + Math.random() * (W - margin * 2);
    const y = margin + Math.random() * (H - margin * 2);
    const colors = ['#ff6f91', '#ffc857', '#9add7f', '#50bfa0', '#f0a6ca'];
    flowers.push({ x, y, size: 8, color: colors[Math.floor(Math.random() * colors.length)], age: 0 });
  }

  // Spiders (hazards)
  const spiders = [];
  function spawnSpider() {
    // spawn at random edge and move towards random direction
    const size = 12;
    // choose side: 0=top,1=bottom,2=left,3=right
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    switch (side) {
      case 0:
        x = Math.random() * W;
        y = -size;
        vx = (Math.random() - 0.5) * 1.5;
        vy = 1 + Math.random();
        break;
      case 1:
        x = Math.random() * W;
        y = H + size;
        vx = (Math.random() - 0.5) * 1.5;
        vy = -1 - Math.random();
        break;
      case 2:
        x = -size;
        y = Math.random() * H;
        vx = 1 + Math.random();
        vy = (Math.random() - 0.5) * 1.5;
        break;
      default:
        x = W + size;
        y = Math.random() * H;
        vx = -1 - Math.random();
        vy = (Math.random() - 0.5) * 1.5;
    }
    spiders.push({ x, y, size, vx, vy });
  }

  function resetGame() {
    running = true;
    score = 0;
    scoreEl.textContent = '0';
    flowers.length = 0;
    spiders.length = 0;
    bee.x = W / 2;
    bee.y = H / 2;
    flowerTimer = 0;
    spiderTimer = 0;
    lastTime = performance.now();
  }

  function update(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    if (running) {
      // spawn flowers every ~1.5-2s
      flowerTimer -= dt;
      if (flowerTimer <= 0) {
        spawnFlower();
        flowerTimer = 1.5 + Math.random() * 1.5;
      }
      // spawn spiders every ~3-4s
      spiderTimer -= dt;
      if (spiderTimer <= 0) {
        spawnSpider();
        spiderTimer = 3 + Math.random() * 2;
      }
      // update bee
      bee.update(dt);
      // update spiders
      for (let i = spiders.length - 1; i >= 0; i--) {
        const s = spiders[i];
        s.x += s.vx * (dt * 60);
        s.y += s.vy * (dt * 60);
        // remove if out of bounds (with margin)
        if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) {
          spiders.splice(i, 1);
        }
      }
      // collisions with flowers
      for (let i = flowers.length - 1; i >= 0; i--) {
        const f = flowers[i];
        const dist = Math.hypot(bee.x - f.x, bee.y - f.y);
        if (dist < (bee.size / 2 + f.size / 2)) {
          flowers.splice(i, 1);
          score += 10;
          scoreEl.textContent = score;
        }
        // fade older flowers (age not used currently)
      }
      // collisions with spiders
      for (const s of spiders) {
        const dist = Math.hypot(bee.x - s.x, bee.y - s.y);
        if (dist < (bee.size / 2 + s.size / 2)) {
          // game over
          running = false;
          if (score > best) {
            best = score;
            localStorage.setItem('bee_best', String(best));
            bestEl.textContent = best;
            finalBestEl.textContent = best;
          }
          finalScoreEl.textContent = score;
          gameOverScreen.hidden = false;
        }
      }
    }
    render();
    requestAnimationFrame(update);
  }

  function render() {
    // draw background (dark green grass pattern) – simple solid color
    ctx.fillStyle = '#1e4431';
    ctx.fillRect(0, 0, W, H);
    // grid pattern for pixel feel
    ctx.strokeStyle = '#173427';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // draw flowers
    for (const f of flowers) {
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size / 2, 0, Math.PI * 2);
      ctx.fill();
      // simple cross to mimic pixel petals
      ctx.fillRect(f.x - 1, f.y - 3, 2, 6);
      ctx.fillRect(f.x - 3, f.y - 1, 6, 2);
    }
    // draw spiders
    for (const s of spiders) {
      ctx.fillStyle = '#3a2a24';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
      // legs (simple lines)
      ctx.strokeStyle = '#3a2a24';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x - s.size / 2, s.y + i * 3);
        ctx.lineTo(s.x - s.size, s.y + i * 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x + s.size / 2, s.y + i * 3);
        ctx.lineTo(s.x + s.size, s.y + i * 4);
        ctx.stroke();
      }
    }
    // draw bee
    bee.draw();
  }

  // keyboard controls
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    updateBeeDirection();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    updateBeeDirection();
  });
  function updateBeeDirection() {
    bee.moveX = 0;
    bee.moveY = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) bee.moveX -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) bee.moveX += 1;
    if (keys['ArrowUp'] || keys['KeyW']) bee.moveY -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) bee.moveY += 1;
  }

  // button handlers
  playBtn.addEventListener('click', () => {
    startScreen.hidden = true;
    gameOverScreen.hidden = true;
    resetGame();
  });
  restartBtn.addEventListener('click', () => {
    gameOverScreen.hidden = true;
    resetGame();
  });
  shareBtn.addEventListener('click', () => {
    const tweetText = `J'ai pollinisé ${score} fleurs dans Pixel Bee Garden 🐝🌼 !`;
    const url = window.location.href;
    const u = new URL('https://twitter.com/intent/tweet');
    u.searchParams.set('text', tweetText);
    u.searchParams.set('url', url);
    window.open(u.toString(), '_blank');
  });

  // start animation loop
  requestAnimationFrame((now) => {
    lastTime = now;
    requestAnimationFrame(update);
  });
})();
