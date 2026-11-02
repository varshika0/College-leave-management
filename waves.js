/* ============ Interactive wave background for splash ============
   Multiple layered sine waves that ripple/deflect when the
   cursor or a finger touches/moves across the screen. */
(function () {
  const canvas = document.getElementById('waveCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, dpr;
  const pointer = { x: -9999, y: -9999, active: false, vx: 0, vy: 0 };
  let ripples = [];

  const COLORS = [
    'rgba(255, 154, 60, 0.35)',
    'rgba(255, 107, 122, 0.30)',
    'rgba(255, 77, 148, 0.28)',
    'rgba(255, 122, 176, 0.16)'
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  function setPointer(x, y) {
    pointer.vx = x - pointer.x;
    pointer.vy = y - pointer.y;
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    const speed = Math.min(Math.hypot(pointer.vx, pointer.vy), 40);
    if (speed > 6) {
      ripples.push({ x, y, r: 4, max: 60 + speed * 3, alpha: 0.5, speed });
    }
  }

  canvas.parentElement.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    setPointer(e.clientX - rect.left, e.clientY - rect.top);
  });
  canvas.parentElement.addEventListener('mouseleave', () => {
    pointer.active = false;
    pointer.x = pointer.y = -9999;
  });
  canvas.parentElement.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    setPointer(t.clientX - rect.left, t.clientY - rect.top);
  }, { passive: true });
  canvas.parentElement.addEventListener('touchstart', (e) => {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    pointer.x = t.clientX - rect.left;
    pointer.y = t.clientY - rect.top;
    ripples.push({ x: pointer.x, y: pointer.y, r: 6, max: 110, alpha: 0.7, speed: 14 });
  }, { passive: true });
  canvas.parentElement.addEventListener('touchend', () => { pointer.active = false; });

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.02;

    // draw base wave lines
    for (let w = 0; w < 4; w++) {
      const baseY = H * (0.35 + w * 0.14);
      const amp = 18 + w * 8;
      const freq = 0.008 - w * 0.001;
      const phase = t * (0.6 + w * 0.25);
      ctx.beginPath();
      ctx.strokeStyle = COLORS[w];
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 6) {
        let y = baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.4) * amp * 0.3;
        // deflect near pointer
        if (pointer.active) {
          const dx = x - pointer.x;
          const dist = Math.abs(dx);
          const reach = 150;
          if (dist < reach) {
            const force = (1 - dist / reach);
            const push = force * force * (46 + Math.min(Math.abs(pointer.vy), 30) * 1.5);
            y -= push * (pointer.vy >= 0 ? 1 : -1);
          }
        }
        // deflect from ripples
        for (const r of ripples) {
          const dx = x - r.x;
          const d = Math.abs(dx);
          if (d < r.r * 1.4) {
            const f = Math.max(0, 1 - d / (r.r * 1.4));
            y -= f * f * 22 * (r.alpha / 0.5);
          }
        }
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // update & draw ripples
    ripples = ripples.filter(r => r.alpha > 0.01);
    for (const r of ripples) {
      r.r += r.speed * 0.12;
      r.alpha *= 0.95;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 122, 176, ${r.alpha * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // pointer glow
    if (pointer.active) {
      const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 90);
      g.addColorStop(0, 'rgba(255,122,176,0.20)');
      g.addColorStop(1, 'rgba(255,122,176,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 90, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize();
  draw();
})();
