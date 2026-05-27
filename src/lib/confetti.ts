/**
 * Tiny inline canvas confetti — kept minimal so we don't ship a dependency.
 * Call `burst()` from anywhere; it self-cleans the canvas after particles fade.
 */

const COLORS = ['#3a93f0', '#56b389', '#f0b73a', '#ef6f6c', '#9b6cf2', '#3acdef'];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number; size: number; color: string; life: number; maxLife: number;
}

export function burst(opts: { count?: number; origin?: { x: number; y: number } } = {}) {
  const count = opts.count ?? 90;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const ox = opts.origin?.x ?? canvas.width / 2;
  const oy = opts.origin?.y ?? canvas.height / 2;

  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const speed = 5 + Math.random() * 9;
    return {
      x: ox, y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 0,
      maxLife: 70 + Math.random() * 40,
    };
  });

  let raf = 0;
  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life > p.maxLife) continue;
      alive = true;
      p.life++;
      p.vy += 0.18; // gravity
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const fade = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (alive) {
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  }
  raf = requestAnimationFrame(frame);
}
