"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
}

export default function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = [
      "rgba(153,69,255,",
      "rgba(20,241,149,",
      "rgba(153,69,255,",
      "rgba(79,195,247,",
    ];

    let W = 0;
    let H = 0;
    let particles: Particle[] = [];

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };

    const makeParticle = (): Particle => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.4,
      opacity: Math.random() * 0.5 + 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    });

    const init = () => {
      resize();
      particles = Array.from({ length: 90 }, makeParticle);
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // mouse repel
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          p.vx += (dx / dist) * force * 0.06;
          p.vy += (dy / dist) * force * 0.06;
        }

        // speed cap
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1.2) { p.vx *= 0.98; p.vy *= 0.98; }

        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // wrap
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        const alpha = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

        // draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();

        // draw lines between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ex = p.x - q.x;
          const ey = p.y - q.y;
          const ed = Math.sqrt(ex * ex + ey * ey);
          if (ed < 110) {
            const lineAlpha = (1 - ed / 110) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(153,69,255,${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf.current = requestAnimationFrame(draw);
    };

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("mouseleave", onLeave);

    init();
    draw();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
