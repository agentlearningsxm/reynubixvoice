import React, { useEffect, useRef } from 'react';

interface VoiceOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
}

const VoiceOrb: React.FC<VoiceOrbProps> = ({ isActive, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    
    // Orb parameters
    const particles: { x: number; y: number; z: number; baseR: number }[] = [];
    const particleCount = 400;
    const radius = 80;

    // Initialize particles on a sphere
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      particles.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        baseR: radius
      });
    }

    const render = () => {
      time += 0.01;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Pulse effect based on speaking state
      const pulse = isSpeaking ? 1 + Math.sin(time * 10) * 0.1 : 1;
      const rotationSpeed = isSpeaking ? 0.02 : 0.005;

      particles.forEach((p) => {
        // Rotate particle
        const x1 = p.x * Math.cos(time * rotationSpeed) - p.z * Math.sin(time * rotationSpeed);
        const z1 = p.z * Math.cos(time * rotationSpeed) + p.x * Math.sin(time * rotationSpeed);
        
        // 3D Projection
        const scale = 300 / (300 + z1); // Perspective
        const x2d = x1 * scale + centerX;
        const y2d = p.y * scale * pulse + centerY;

        // Draw particle
        const alpha = (z1 + radius) / (2 * radius); // Depth fading
        ctx.beginPath();
        ctx.arc(x2d, y2d, isActive ? scale * 1.5 : scale, 0, Math.PI * 2);
        
        if (isActive) {
           // Electric Blue / Core color
           ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`; 
        } else {
           // Dormant grey
           ctx.fillStyle = `rgba(148, 163, 184, ${alpha * 0.5})`;
        }
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, isSpeaking]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={300} 
      className={`w-full h-full transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-70'}`}
    />
  );
};

export default VoiceOrb;