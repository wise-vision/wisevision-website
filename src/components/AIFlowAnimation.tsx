import React, { useEffect, useRef, useState } from 'react';

interface AIFlowAnimationProps {
  className?: string;
}

interface NeuralNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
  connections: string[];
}

interface FlowParticle {
  id: string;
  x: number;
  y: number;
  progress: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  opacity: number;
  size: number;
}

interface RobotIcon {
  id: string;
  type: 'drone' | 'rover' | 'arm';
  x: number;
  y: number;
  scale: number;
  glowIntensity: number;
  lastActivation: number;
}

export default function AIFlowAnimation({ className = '' }: AIFlowAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined');
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      
      const handleChange = () => setReducedMotion(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser || !canvasRef.current || reducedMotion) {
      setIsLoaded(true);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(rect.width, 800); // Ensure minimum width
      const height = Math.max(rect.height, 400); // Ensure minimum height
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      // Reset scale and apply new scale
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      return { width, height };
    };

    const { width, height } = updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    console.log('AIFlowAnimation: Canvas dimensions:', width, height);
    console.log('AIFlowAnimation: Starting animation...');

    // Animation state
    const centerX = width / 2;
    const centerY = height / 2;

    // Neural network nodes (left side - AI brain)
    const neuralNodes: NeuralNode[] = [];
    const nodeCount = 12;
    const neuralArea = { x: width * 0.05, y: height * 0.2, width: width * 0.25, height: height * 0.6 };

    for (let i = 0; i < nodeCount; i++) {
      const x = neuralArea.x + Math.random() * neuralArea.width;
      const y = neuralArea.y + Math.random() * neuralArea.height;
      neuralNodes.push({
        id: `node_${i}`,
        x,
        y,
        radius: 2 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.4,
        pulsePhase: Math.random() * Math.PI * 2,
        connections: []
      });
    }

    // Create connections between nearby nodes
    neuralNodes.forEach((node, i) => {
      neuralNodes.forEach((other, j) => {
        if (i !== j) {
          const distance = Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2);
          if (distance < 80 && Math.random() > 0.7) {
            node.connections.push(other.id);
          }
        }
      });
    });

    // MCP Hub (center)
    const mcpHub = {
      x: centerX,
      y: centerY,
      radius: 20,
      glow: 0,
      pulsePhase: 0
    };

    // Robot icons (right side)
    const robots: RobotIcon[] = [
      {
        id: 'drone',
        type: 'drone',
        x: width * 0.75,
        y: height * 0.25,
        scale: 1,
        glowIntensity: 0,
        lastActivation: 0
      },
      {
        id: 'rover',
        type: 'rover',
        x: width * 0.8,
        y: height * 0.5,
        scale: 1,
        glowIntensity: 0,
        lastActivation: 0
      },
      {
        id: 'arm',
        type: 'arm',
        x: width * 0.75,
        y: height * 0.75,
        scale: 1,
        glowIntensity: 0,
        lastActivation: 0
      }
    ];

    // Flow particles
    const particles: FlowParticle[] = [];
    let lastParticleTime = 0;
    const particleInterval = 2000; // 2 seconds

    // Animation loop
    let startTime = Date.now();
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      if (frameCount % 60 === 0) {
        console.log('AIFlowAnimation: Frame', frameCount, 'Canvas size:', canvas.width, canvas.height);
      }
      
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const deltaTime = elapsed * 0.001; // Convert to seconds

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Debug: Draw background to ensure canvas is working
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Red background for visibility
      ctx.fillRect(0, 0, width, height);
      
      // Debug: Draw border
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Green border
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, width, height);

      // Draw neural network (left side)
      drawNeuralNetwork(ctx, neuralNodes, deltaTime);

      // Draw MCP hub (center)
      drawMCPHub(ctx, mcpHub, deltaTime);

      // Draw robot icons (right side)
      drawRobotIcons(ctx, robots, deltaTime);

      // Create flow particles
      if (currentTime - lastParticleTime > particleInterval) {
        createFlowParticle();
        lastParticleTime = currentTime;
      }

      // Update and draw flow particles
      updateAndDrawParticles(ctx, particles, deltaTime);

      animationRef.current = requestAnimationFrame(animate);
    };

    // Helper functions
    function drawNeuralNetwork(ctx: CanvasRenderingContext2D, nodes: NeuralNode[], time: number) {
      // Draw connections first
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 1;
      
      nodes.forEach(node => {
        node.connections.forEach(connId => {
          const connectedNode = nodes.find(n => n.id === connId);
          if (!connectedNode) return;

          const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7;
          ctx.globalAlpha = 0.1 + pulse * 0.2;
          
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connectedNode.x, connectedNode.y);
          ctx.stroke();
        });
      });

      // Draw nodes
      nodes.forEach(node => {
        const pulse = Math.sin(time * 3 + node.pulsePhase) * 0.4 + 0.6;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3);
        gradient.addColorStop(0, `rgba(0, 255, 255, ${pulse * 0.8})`);
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        ctx.globalAlpha = 1;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core node
        ctx.fillStyle = '#00FFFF';
        ctx.globalAlpha = node.opacity * pulse;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawMCPHub(ctx: CanvasRenderingContext2D, hub: any, time: number) {
      const pulse = Math.sin(time * 2) * 0.3 + 0.7;
      hub.pulsePhase = time;

      // Outer ring
      const gradient = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, hub.radius * 2);
      gradient.addColorStop(0, `rgba(0, 128, 255, ${pulse * 0.6})`);
      gradient.addColorStop(0.7, `rgba(0, 128, 255, ${pulse * 0.3})`);
      gradient.addColorStop(1, 'rgba(0, 128, 255, 0)');
      
      ctx.globalAlpha = 1;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hub.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Inner core
      ctx.fillStyle = '#0080FF';
      ctx.globalAlpha = 0.8 + pulse * 0.2;
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hub.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw WiseVision "eye" pattern
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      
      // Iris
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hub.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      
      // Pupil
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hub.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawRobotIcons(ctx: CanvasRenderingContext2D, robots: RobotIcon[], time: number) {
      robots.forEach(robot => {
        const timeSinceActivation = time - robot.lastActivation;
        robot.glowIntensity = Math.max(0, 1 - timeSinceActivation / 2); // Fade over 2 seconds
        robot.scale = 1 + robot.glowIntensity * 0.2; // Scale effect

        ctx.save();
        ctx.translate(robot.x, robot.y);
        ctx.scale(robot.scale, robot.scale);

        // Glow effect
        if (robot.glowIntensity > 0) {
          const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
          glowGradient.addColorStop(0, `rgba(0, 255, 127, ${robot.glowIntensity * 0.6})`);
          glowGradient.addColorStop(1, 'rgba(0, 255, 127, 0)');
          
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw robot icon based on type
        ctx.strokeStyle = '#00FF7F';
        ctx.fillStyle = 'rgba(0, 255, 127, 0.2)';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7 + robot.glowIntensity * 0.3;

        if (robot.type === 'drone') {
          drawDroneIcon(ctx);
        } else if (robot.type === 'rover') {
          drawRoverIcon(ctx);
        } else if (robot.type === 'arm') {
          drawArmIcon(ctx);
        }

        ctx.restore();
      });
    }

    function drawDroneIcon(ctx: CanvasRenderingContext2D) {
      // Drone body
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Propellers
      const propPositions = [[-12, -8], [12, -8], [-12, 8], [12, 8]];
      propPositions.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Connecting lines
      propPositions.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.stroke();
      });
    }

    function drawRoverIcon(ctx: CanvasRenderingContext2D) {
      // Body
      ctx.beginPath();
      ctx.rect(-12, -6, 24, 12);
      ctx.fill();
      ctx.stroke();

      // Wheels
      const wheelY = 8;
      [-8, 0, 8].forEach(x => {
        ctx.beginPath();
        ctx.arc(x, wheelY, 3, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Antenna
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -12, 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawArmIcon(ctx: CanvasRenderingContext2D) {
      // Base
      ctx.beginPath();
      ctx.rect(-6, 8, 12, 6);
      ctx.fill();
      ctx.stroke();

      // Arm segments
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-4, -10);
      ctx.stroke();

      // Joints
      [0, -8, -4].forEach((y, i) => {
        const x = i === 0 ? 0 : i === 1 ? -8 : -4;
        const jointY = y === 0 ? 8 : y;
        ctx.beginPath();
        ctx.arc(x, jointY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // End effector
      ctx.beginPath();
      ctx.arc(-4, -10, 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    function createFlowParticle() {
      // Random neural node as start point
      const startNode = neuralNodes[Math.floor(Math.random() * neuralNodes.length)];
      
      particles.push({
        id: `particle_${Date.now()}`,
        x: startNode.x,
        y: startNode.y,
        progress: 0,
        startX: startNode.x,
        startY: startNode.y,
        endX: mcpHub.x,
        endY: mcpHub.y,
        opacity: 1,
        size: 3
      });
    }

    function updateAndDrawParticles(ctx: CanvasRenderingContext2D, particles: FlowParticle[], time: number) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Update progress
        particle.progress += 0.008; // Speed of flow

        if (particle.progress <= 1) {
          // Moving to MCP hub
          particle.x = particle.startX + (particle.endX - particle.startX) * easeInOutCubic(particle.progress);
          particle.y = particle.startY + (particle.endY - particle.startY) * easeInOutCubic(particle.progress);
          
          // Check if reached MCP hub
          if (particle.progress > 0.9) {
            mcpHub.glow = 1; // Activate hub glow
          }
        } else if (particle.progress <= 2) {
          // Reached hub, now split to robots
          if (particle.progress > 1 && particle.progress < 1.1) {
            // Create particles to each robot
            robots.forEach(robot => {
              particles.push({
                id: `robot_particle_${robot.id}_${Date.now()}`,
                x: mcpHub.x,
                y: mcpHub.y,
                progress: 1,
                startX: mcpHub.x,
                startY: mcpHub.y,
                endX: robot.x,
                endY: robot.y,
                opacity: 0.8,
                size: 2
              });
            });
          }
        } else {
          // Remove completed particles
          particles.splice(i, 1);
          continue;
        }

        // Draw particle
        if (particle.progress <= 2) {
          const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 2);
          gradient.addColorStop(0, `rgba(138, 43, 226, ${particle.opacity})`);
          gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
          
          ctx.globalAlpha = 1;
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#8A2BE2';
          ctx.globalAlpha = particle.opacity;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Check if particle reached a robot
        robots.forEach(robot => {
          const distance = Math.sqrt((particle.x - robot.x) ** 2 + (particle.y - robot.y) ** 2);
          if (distance < 20 && particle.progress > 1) {
            robot.lastActivation = time;
            particles.splice(i, 1);
          }
        });
      }
    }

    function easeInOutCubic(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Start animation
    setIsLoaded(true);
    console.log('AIFlowAnimation: Animation loop starting...');
    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [isBrowser, reducedMotion]);

  if (!isBrowser) {
    return (
      <div className={`${className} relative`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <p className="body-sm text-muted">Loading AI Flow Animation...</p>
        </div>
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div className={`${className} relative`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 400"
          className="absolute"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          aria-label="AI to Robotics Flow Diagram"
        >
          {/* Neural Network (left) */}
          <g>
            <circle cx="100" cy="100" r="4" fill="#00FFFF" opacity="0.6" />
            <circle cx="120" cy="130" r="3" fill="#00FFFF" opacity="0.5" />
            <circle cx="80" cy="160" r="4" fill="#00FFFF" opacity="0.7" />
            <circle cx="140" cy="180" r="3" fill="#00FFFF" opacity="0.6" />
            <circle cx="110" cy="200" r="4" fill="#00FFFF" opacity="0.5" />
            
            <line x1="100" y1="100" x2="120" y2="130" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />
            <line x1="120" y1="130" x2="80" y2="160" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />
            <line x1="80" y1="160" x2="140" y2="180" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />
            <line x1="140" y1="180" x2="110" y2="200" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />
          </g>

          {/* MCP Hub (center) */}
          <g>
            <circle cx="400" cy="200" r="25" fill="#0080FF" opacity="0.6" />
            <circle cx="400" cy="200" r="15" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" />
            <circle cx="400" cy="200" r="8" fill="#FFFFFF" opacity="0.9" />
          </g>

          {/* Flow Lines */}
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#8A2BE2" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00FF7F" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <line x1="150" y1="150" x2="375" y2="200" stroke="url(#flowGradient)" strokeWidth="2" />
          <line x1="425" y1="200" x2="600" y2="100" stroke="url(#flowGradient)" strokeWidth="2" />
          <line x1="425" y1="200" x2="640" y2="200" stroke="url(#flowGradient)" strokeWidth="2" />
          <line x1="425" y1="200" x2="600" y2="300" stroke="url(#flowGradient)" strokeWidth="2" />

          {/* Robot Icons (right) */}
          <g>
            {/* Drone */}
            <g transform="translate(600, 100)">
              <ellipse cx="0" cy="0" rx="8" ry="4" fill="none" stroke="#00FF7F" strokeWidth="2" />
              <circle cx="-12" cy="-8" r="4" fill="none" stroke="#00FF7F" strokeWidth="1" />
              <circle cx="12" cy="-8" r="4" fill="none" stroke="#00FF7F" strokeWidth="1" />
              <circle cx="-12" cy="8" r="4" fill="none" stroke="#00FF7F" strokeWidth="1" />
              <circle cx="12" cy="8" r="4" fill="none" stroke="#00FF7F" strokeWidth="1" />
            </g>
            
            {/* Rover */}
            <g transform="translate(640, 200)">
              <rect x="-12" y="-6" width="24" height="12" rx="2" fill="none" stroke="#00FF7F" strokeWidth="2" />
              <circle cx="-8" cy="8" r="3" fill="none" stroke="#00FF7F" strokeWidth="1" />
              <circle cx="0" cy="8" r="3" fill="none" stroke="#00FF7F" strokeWidth="1" />
              <circle cx="8" cy="8" r="3" fill="none" stroke="#00FF7F" strokeWidth="1" />
              <line x1="0" y1="-6" x2="0" y2="-12" stroke="#00FF7F" strokeWidth="1" />
              <circle cx="0" cy="-12" r="2" fill="none" stroke="#00FF7F" strokeWidth="1" />
            </g>
            
            {/* Robot Arm */}
            <g transform="translate(600, 300)">
              <rect x="-6" y="8" width="12" height="6" fill="none" stroke="#00FF7F" strokeWidth="2" />
              <line x1="0" y1="8" x2="-8" y2="0" stroke="#00FF7F" strokeWidth="2" />
              <line x1="-8" y1="0" x2="-4" y2="-10" stroke="#00FF7F" strokeWidth="2" />
              <circle cx="0" cy="8" r="2" fill="#00FF7F" />
              <circle cx="-8" cy="0" r="2" fill="#00FF7F" />
              <circle cx="-4" cy="-10" r="3" fill="none" stroke="#00FF7F" strokeWidth="1" />
            </g>
          </g>
        </svg>
        
        <div className="relative text-center" style={{ zIndex: 10 }}>
          <p className="body-sm text-muted">AI → MCP ROS2 → Robotics Integration</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ 
          position: 'absolute',
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'transparent'
        }}
        aria-label="Animated AI to Robotics Flow Visualization"
      />
      {!isLoaded && (
        <div className="absolute flex items-center justify-center" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="text-center">
            <div className="animate-pulse" style={{ 
              width: '2rem', 
              height: '2rem', 
              border: '2px solid var(--neon-blue)', 
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              margin: '0 auto var(--space-sm)',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p className="body-sm text-muted">Loading visualization...</p>
          </div>
        </div>
      )}
    </div>
  );
}
