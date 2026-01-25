import React, { useEffect, useRef, useMemo } from 'react';
import { FocalPoint } from '../hooks/useNebulaActivity';

interface NebulaBackgroundProps {
  isActive: boolean;
  focalPoint: FocalPoint;
}

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  size: number;
  color: string;
}

const NebulaBackground: React.FC<NebulaBackgroundProps> = ({ isActive, focalPoint }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const prefersReducedMotion = useMemo(() => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const stars = useRef<Star[]>([]);
  const count = 300;

  const initStars = (width: number, height: number) => {
    stars.current = Array.from({ length: count }, () => ({
      x: Math.random() * width - width / 2,
      y: Math.random() * height - height / 2,
      z: Math.random() * width,
      px: 0,
      py: 0,
      size: 1 + Math.random() * 1.5,
      color: `rgba(${160 + Math.random() * 95}, ${180 + Math.random() * 75}, 255, ${0.4 + Math.random() * 0.4})`
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars(canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let speed = 0.4;
    const targetSpeed = isActive ? 50 : 0.4;

    const animate = () => {
      speed += (targetSpeed - speed) * (isActive ? 0.04 : 0.08);
      
      const { width, height } = canvas;
      ctx.fillStyle = isActive ? 'rgba(2, 6, 23, 0.15)' : 'rgba(2, 6, 23, 1)';
      ctx.fillRect(0, 0, width, height);

      const centerX = width * focalPoint.x;
      const centerY = height * focalPoint.y;

      stars.current.forEach(star => {
        star.z -= speed;

        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
          star.px = 0;
          star.py = 0;
        }

        const sx = (star.x / star.z) * width + centerX;
        const sy = (star.y / star.z) * width + centerY;

        if (star.px !== 0) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = star.size;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(star.px, star.py);
          ctx.stroke();
        }

        star.px = sx;
        star.py = sy;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, focalPoint]);

  const warpStyles: React.CSSProperties = !prefersReducedMotion ? {
    transform: isActive ? `scale(1.4) translate(${(0.5 - focalPoint.x) * 15}%, ${(0.5 - focalPoint.y) * 15}%)` : 'scale(1)',
    filter: isActive ? 'blur(5px) brightness(1.2)' : 'blur(0px) brightness(1)',
    transition: isActive ? 'transform 1.5s cubic-bezier(0.2, 0, 0.2, 1), filter 1.2s ease-in' : 'transform 1.2s ease-out, filter 1s ease-out'
  } : {
    opacity: isActive ? 0.5 : 1,
    transition: 'opacity 1s ease-in-out'
  };

  return (
    <div className="fixed inset-0 w-full h-full -z-50 overflow-hidden pointer-events-none bg-slate-950">
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          ...warpStyles,
          backgroundImage: `url('/nebula.jpg'), radial-gradient(circle at ${focalPoint.x * 100}% ${focalPoint.y * 100}%, rgba(99, 102, 241, 0.2) 0%, transparent 60%), radial-gradient(circle at 20% 30%, rgba(76, 29, 149, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(30, 58, 138, 0.4) 0%, transparent 50%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'screen'
        }}
      />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
        style={{ opacity: isActive ? 0.9 : 0.5 }}
      />
      {isActive && !prefersReducedMotion && (
        <div className="absolute inset-0 bg-indigo-500/5 animate-pulse mix-blend-overlay" />
      )}
    </div>
  );
};

export default NebulaBackground;