
'use client';

import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
}

const CONFETTI_COLORS = ['#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  shape: 'square' | 'circle' | 'triangle';
}

export const Confetti: React.FC<ConfettiProps> = ({ trigger, duration = 3000 }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);

      // Generate particles
      const newParticles: Particle[] = [];
      for (let i = 0; i < 100; i++) {
        newParticles.push({
          id: i,
          x: 50 + (Math.random() - 0.5) * 20,
          y: -10,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5,
          velocityX: (Math.random() - 0.5) * 15,
          velocityY: Math.random() * 3 + 2,
          rotationSpeed: (Math.random() - 0.5) * 20,
          shape: ['square', 'circle', 'triangle'][Math.floor(Math.random() * 3)] as Particle['shape'],
        });
      }
      setParticles(newParticles);

      // Clear after duration
      setTimeout(() => {
        setIsActive(false);
        setParticles([]);
      }, duration);
    }
  }, [trigger, duration, isActive]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animationDuration: `${2 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 0.5}s`,
            ['--velocity-x' as string]: `${particle.velocityX}vw`,
            ['--velocity-y' as string]: `${particle.velocityY}vh`,
            ['--rotation-speed' as string]: `${particle.rotationSpeed}deg`,
          }}
        >
          {particle.shape === 'square' && (
            <div
              className="w-3 h-3"
              style={{ backgroundColor: particle.color }}
            />
          )}
          {particle.shape === 'circle' && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: particle.color }}
            />
          )}
          {particle.shape === 'triangle' && (
            <div
              className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px]"
              style={{ borderBottomColor: particle.color }}
            />
          )}
        </div>
      ))}

      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--velocity-x)) rotate(calc(var(--rotation-speed) * 20));
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};
