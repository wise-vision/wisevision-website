import React, { useEffect, useRef, useState } from 'react';

interface AIFlowAnimationProps {
  className?: string;
}

interface NeuralNode {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
}

interface FlowParticle {
  x: number;
  y: number;
  progress: number;
  opacity: number;
  size: number;
  color: string;
}

interface RobotIcon {
  x: number;
  y: number;
  scale: number;
  glowIntensity: number;
  type: 'drone' | 'rover' | 'arm';
}

export default function AIFlowAnimation({ className = '' }: AIFlowAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined');
  }, []);

  useEffect(() => {
    if (!isBrowser) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Ensure canvas has dimensions
      const width = Math.max(rect.width || 800, 800);
      const height = Math.max(rect.height || 400, 400);
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      ctx.scale(dpr, dpr);
      return { width, height };
    };

    const { width, height } = updateCanvasSize();
    
    // Initialize animation elements
    const neuralNodes: NeuralNode[] = [];
    const nodeCount = 15;
    
    // Create neural nodes (left side)
    for (let i = 0; i < nodeCount; i++) {
      neuralNodes.push({
        x: 50 + Math.random() * 200,
        y: 50 + Math.random() * (height - 100),
        radius: 2 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.5,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    // Flow particles
    const particles: FlowParticle[] = [];
    let lastParticleTime = 0;

    // Robot icons (right side)
    const robots: RobotIcon[] = [
      { x: width - 150, y: height * 0.25, scale: 1, glowIntensity: 0, type: 'drone' },
      { x: width - 120, y: height * 0.5, scale: 1, glowIntensity: 0, type: 'rover' },
      { x: width - 100, y: height * 0.75, scale: 1, glowIntensity: 0, type: 'arm' }
    ];

    // MCP hub (center)
    const mcpHub = {
      x: width / 2,
      y: height / 2,
      radius: 30,
      pulsePhase: 0,
      glowIntensity: 0
    };

    // Animation loop
    let startTime = Date.now();
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = (currentTime - startTime) * 0.001;

      // Clear canvas with dark background
      ctx.fillStyle = 'rgba(15, 20, 25, 0.95)';
      ctx.fillRect(0, 0, width, height);

      // Add subtle grid pattern
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Draw neural network (left side)
      ctx.save();
      
      // Neural connections
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < neuralNodes.length; i++) {
        for (let j = i + 1; j < neuralNodes.length; j++) {
          const dx = neuralNodes[j].x - neuralNodes[i].x;
          const dy = neuralNodes[j].y - neuralNodes[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 80) {
            const opacity = Math.max(0, 0.4 - distance / 200);
            ctx.strokeStyle = `rgba(0, 212, 255, ${opacity * (0.5 + 0.5 * Math.sin(elapsed * 2))})`;
            ctx.beginPath();
            ctx.moveTo(neuralNodes[i].x, neuralNodes[i].y);
            ctx.lineTo(neuralNodes[j].x, neuralNodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Neural nodes
      neuralNodes.forEach((node, index) => {
        const pulse = Math.sin(elapsed * 3 + node.pulsePhase) * 0.3 + 0.7;
        const glow = Math.sin(elapsed * 2 + index * 0.5) * 0.2 + 0.8;
        
        // Glow effect
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3);
        gradient.addColorStop(0, `rgba(0, 212, 255, ${node.opacity * pulse * 0.8})`);
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core node
        ctx.fillStyle = `rgba(0, 212, 255, ${node.opacity * glow})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // Draw MCP hub (center)
      ctx.save();
      
      const hubPulse = Math.sin(elapsed * 1.5) * 0.3 + 0.7;
      const hubGlow = Math.sin(elapsed * 0.8) * 0.4 + 0.6;

      // Outer rings
      for (let i = 3; i >= 1; i--) {
        const radius = mcpHub.radius * i * hubPulse;
        const opacity = (0.3 / i) * hubGlow;
        
        ctx.strokeStyle = `rgba(0, 255, 136, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mcpHub.x, mcpHub.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Central hub
      const centerGradient = ctx.createRadialGradient(mcpHub.x, mcpHub.y, 0, mcpHub.x, mcpHub.y, mcpHub.radius);
      centerGradient.addColorStop(0, `rgba(0, 255, 136, 0.8)`);
      centerGradient.addColorStop(0.7, `rgba(0, 255, 136, 0.4)`);
      centerGradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
      
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(mcpHub.x, mcpHub.y, mcpHub.radius * hubPulse, 0, Math.PI * 2);
      ctx.fill();

      // MCP text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MCP ROS2', mcpHub.x, mcpHub.y + 5);

      ctx.restore();

      // Draw robot icons (right side)
      ctx.save();
      
      robots.forEach((robot, index) => {
        const robotPulse = Math.sin(elapsed * 2 + index * 1.2) * 0.2 + 0.8;
        const robotGlow = Math.sin(elapsed * 1.5 + index * 0.8) * 0.3 + 0.7;

        // Robot glow
        const robotGradient = ctx.createRadialGradient(robot.x, robot.y, 0, robot.x, robot.y, 25);
        robotGradient.addColorStop(0, `rgba(255, 140, 0, ${robotGlow * 0.6})`);
        robotGradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
        
        ctx.fillStyle = robotGradient;
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, 25, 0, Math.PI * 2);
        ctx.fill();

        // Robot shape
        ctx.fillStyle = `rgba(255, 140, 0, ${0.8 * robotPulse})`;
        ctx.strokeStyle = `rgba(255, 140, 0, ${robotPulse})`;
        ctx.lineWidth = 2;

        if (robot.type === 'drone') {
          ctx.fillRect(robot.x - 12, robot.y - 8, 24, 16);
          ctx.strokeRect(robot.x - 12, robot.y - 8, 24, 16);
        } else if (robot.type === 'rover') {
          ctx.beginPath();
          ctx.arc(robot.x, robot.y, 10 * robotPulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (robot.type === 'arm') {
          ctx.fillRect(robot.x - 8, robot.y - 15, 16, 30);
          ctx.strokeRect(robot.x - 8, robot.y - 15, 16, 30);
        }

        // Robot labels
        ctx.fillStyle = 'rgba(178, 178, 178, 0.8)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        const labels = { drone: 'Drone', rover: 'Rover', arm: 'Robotic Arm' };
        ctx.fillText(labels[robot.type], robot.x, robot.y + 35);
      });

      ctx.restore();

      // Create flow particles
      if (currentTime - lastParticleTime > 1500) {
        // AI to MCP particle
        particles.push({
          x: 250,
          y: height * 0.4,
          progress: 0,
          opacity: 1,
          size: 3,
          color: '0, 212, 255'
        });

        // MCP to Robot particle
        particles.push({
          x: mcpHub.x + 40,
          y: mcpHub.y,
          progress: 0,
          opacity: 1,
          size: 3,
          color: '0, 255, 136'
        });

        lastParticleTime = currentTime;
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.progress += 0.008;

        if (particle.color === '0, 212, 255') {
          // AI to MCP path
          particle.x = 250 + (mcpHub.x - 250) * particle.progress;
          particle.y = height * 0.4 + (mcpHub.y - height * 0.4) * particle.progress;
        } else {
          // MCP to Robot path
          particle.x = mcpHub.x + 40 + (width - 150 - mcpHub.x - 40) * particle.progress;
          particle.y = mcpHub.y + (height * 0.5 - mcpHub.y) * particle.progress;
        }

        particle.opacity = Math.max(0, 1 - particle.progress);

        if (particle.progress > 1) {
          particles.splice(i, 1);
          continue;
        }

        // Draw particle
        const particleGradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 3);
        particleGradient.addColorStop(0, `rgba(${particle.color}, ${particle.opacity})`);
        particleGradient.addColorStop(1, `rgba(${particle.color}, 0)`);
        
        ctx.fillStyle = particleGradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${particle.color}, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Data flow arrows
      ctx.save();
      const arrowOpacity = Math.sin(elapsed * 2) * 0.3 + 0.7;
      
      // AI to MCP arrow
      ctx.strokeStyle = `rgba(0, 212, 255, ${arrowOpacity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(250, height * 0.4);
      ctx.lineTo(mcpHub.x - 50, mcpHub.y - 10);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = `rgba(0, 212, 255, ${arrowOpacity})`;
      ctx.beginPath();
      ctx.moveTo(mcpHub.x - 50, mcpHub.y - 10);
      ctx.lineTo(mcpHub.x - 60, mcpHub.y - 15);
      ctx.lineTo(mcpHub.x - 60, mcpHub.y - 5);
      ctx.closePath();
      ctx.fill();

      // MCP to Robot arrow
      ctx.strokeStyle = `rgba(0, 255, 136, ${arrowOpacity})`;
      ctx.beginPath();
      ctx.moveTo(mcpHub.x + 50, mcpHub.y);
      ctx.lineTo(width - 200, height * 0.5);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = `rgba(0, 255, 136, ${arrowOpacity})`;
      ctx.beginPath();
      ctx.moveTo(width - 200, height * 0.5);
      ctx.lineTo(width - 210, height * 0.5 - 5);
      ctx.lineTo(width - 210, height * 0.5 + 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    setIsLoaded(true);
    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isBrowser]);

  if (!isBrowser) {
    return (
      <div className={className} style={{ width: '100%', height: '100%', background: 'rgba(15, 20, 25, 0.8)' }}>
        <p style={{ color: '#666', textAlign: 'center', paddingTop: '100px' }}>Loading AI Flow Animation...</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'transparent'
        }}
        aria-label="AI to MCP ROS2 to Robotics Flow Animation"
      />
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontFamily: 'monospace'
        }}>
          Initializing AI Flow...
        </div>
      )}
    </div>
  );
}
