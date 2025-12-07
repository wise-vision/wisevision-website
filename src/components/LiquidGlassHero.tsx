import React, { useEffect, useRef, useState } from 'react';

interface LiquidGlassHeroProps {
  title: string;
  subtitle: string;
  primaryCTA?: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  withAnimation?: boolean;
}

interface NeuralNode {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
  connections: number[];
}

interface FlowParticle {
  x: number;
  y: number;
  progress: number;
  opacity: number;
  size: number;
  color: string;
  path: number[];
}

interface Robot3D {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  glowIntensity: number;
  type: 'industrial_arm' | 'autonomous_drone' | 'mobile_rover' | 'humanoid';
  animationPhase: number;
}

export default function LiquidGlassHero({ 
  title, 
  subtitle, 
  primaryCTA, 
  secondaryCTA, 
  withAnimation = false 
}: LiquidGlassHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBrowser, setIsBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [sweep, setSweep] = useState(false);
  const sweepTimeoutRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined');
  }, []);

  // Track mobile viewport to tailor layout/animation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobile(mq.matches);
    handleChange();
    mq.addEventListener?.('change', handleChange);
    return () => mq.removeEventListener?.('change', handleChange);
  }, []);

  // Detect prefers-reduced-motion to avoid auto reveal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const r = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setIsReducedMotion(r.matches);
    onChange();
    r.addEventListener?.('change', onChange);
    return () => r.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!isBrowser || !withAnimation) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enhanced responsive sizing
    let width = 0;
    let height = 0;
    let initialHeight = 0; // Lock height on mobile to prevent browser chrome resize issues
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // On mobile, lock height to initial value to prevent address bar show/hide from resizing
      const newWidth = rect.width;
      const newHeight = isMobile && initialHeight > 0 ? initialHeight : rect.height;
      
      if (isMobile && initialHeight === 0) {
        initialHeight = rect.height;
      }
      
      // Setting width/height resets the context state; set transform after
      canvas.width = Math.max(1, Math.floor(newWidth * dpr));
      canvas.height = Math.max(1, Math.floor(newHeight * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      canvas.style.width = newWidth + 'px';
      canvas.style.height = newHeight + 'px';
      width = newWidth;
      height = newHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation state
    let lastTime = 0;
  // initialize width/height once after initial resize
  const dprInit = window.devicePixelRatio || 1;
  width = canvas.width / dprInit;
  height = canvas.height / dprInit;

    // Neural Network (Top Right) - More compact positioning
    const neuralNodes: NeuralNode[] = Array.from({ length: 15 }, (_, i) => {
      const layer = Math.floor(i / 5); // 3 layers of 5 nodes each
      const nodeInLayer = i % 5;
      // Bring animation more into view on mobile
      const baseX = isMobile ? 0.42 : 0.65;
      const colSpread = isMobile ? 0.065 : 0.06;
      const baseY = isMobile ? 0.22 : 0.2;
      const rowSpread = isMobile ? 0.075 : 0.06;
      return {
        x: width * baseX + nodeInLayer * (width * colSpread) + (Math.random() - 0.5) * (isMobile ? 10 : 15),
        y: height * baseY + layer * (height * rowSpread) + (Math.random() - 0.5) * (isMobile ? 8 : 10),
        radius: (isMobile ? 5 : 4) + Math.random() * (isMobile ? 3.5 : 3),
        opacity: (isMobile ? 0.9 : 0.7) + Math.random() * 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        connections: []
      };
    });

    // MCP Hub (Center Right) - Closer to neural network
    const mcpHub = {
      x: width * (isMobile ? 0.6 : 0.75),
      y: height * 0.5,
      radius: 30
    };

    // Robots (Bottom Right) - Closer to MCP, more compact
  const robots: Robot3D[] = [
      {
  x: width * (isMobile ? 0.25 : 0.68), y: height * (isMobile ? 0.74 : 0.7), z: 0,
        rotationX: 0, rotationY: 0, rotationZ: 0,
        scale: 1, glowIntensity: 0, animationPhase: 0,
        type: 'industrial_arm'
      },
      {
  x: width * (isMobile ? 0.48 : 0.75), y: height * (isMobile ? 0.71 : 0.72), z: 20,
        rotationX: 0, rotationY: 0, rotationZ: 0,
        scale: 1, glowIntensity: 0, animationPhase: Math.PI / 3,
        type: 'autonomous_drone'
      },
      {
  x: width * (isMobile ? 0.70 : 0.82), y: height * (isMobile ? 0.71 : 0.72), z: 10,
        rotationX: 0, rotationY: 0, rotationZ: 0,
        scale: 1, glowIntensity: 0, animationPhase: Math.PI / 1.5,
        type: 'mobile_rover'
      },
      {
  x: width * (isMobile ? 0.90 : 0.89), y: height * (isMobile ? 0.74 : 0.7), z: 30,
        rotationX: 0, rotationY: 0, rotationZ: 0,
        scale: 1, glowIntensity: 0, animationPhase: Math.PI,
        type: 'humanoid'
      }
    ];

    // Flowing particles for bidirectional communication
    const particles: FlowParticle[] = [];

    function createDownwardParticle() {
      // Neural → MCP → Robot flow
      const startNode = neuralNodes[Math.floor(Math.random() * neuralNodes.length)];
      const endRobot = robots[Math.floor(Math.random() * robots.length)];
      
      particles.push({
        x: startNode.x,
        y: startNode.y,
        progress: 0,
        opacity: 1,
        size: 2 + Math.random() * 3,
        color: ['#00d4ff', '#00ff88'][Math.floor(Math.random() * 2)],
        path: [startNode.x, startNode.y, mcpHub.x, mcpHub.y, endRobot.x, endRobot.y]
      });
    }

    function createUpwardParticle() {
      // Robot → MCP → Neural feedback flow
      const startRobot = robots[Math.floor(Math.random() * robots.length)];
      const endNode = neuralNodes[Math.floor(Math.random() * neuralNodes.length)];
      
      particles.push({
        x: startRobot.x,
        y: startRobot.y,
        progress: 0,
        opacity: 1,
        size: 2 + Math.random() * 2,
        color: ['#8b5cf6', '#ff8c00'][Math.floor(Math.random() * 2)],
        path: [startRobot.x, startRobot.y, mcpHub.x, mcpHub.y, endNode.x, endNode.y]
      });
    }

    // Draw functions
    function drawLiquidGlassBackground(ctx: CanvasRenderingContext2D, time: number) {
      // Compact vertical gradient background
  const gradient = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.9);
  gradient.addColorStop(0, `rgba(0, 30, 60, ${isMobile ? 1 : 0.9})`);
  gradient.addColorStop(0.5, `rgba(20, 10, 40, ${isMobile ? 0.9 : 0.8})`);
  gradient.addColorStop(1, `rgba(40, 20, 10, ${isMobile ? 1 : 0.9})`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // More subtle liquid glass flow effects for compact design
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const waveX = Math.sin(time * 0.0008 + i * 0.8) * 20;
        const waveY = Math.cos(time * 0.0006 + i * 0.5) * 15;
        
        ctx.globalAlpha = isMobile ? 0.12 : 0.08;
        ctx.fillStyle = `hsl(${220 + i * 25}, 60%, 50%)`;
        
        // More compact vertical flow shapes; center more on mobile
        ctx.beginPath();
        ctx.ellipse(
          (isMobile ? width * 0.45 : width * 0.7) + i * (width * (isMobile ? 0.07 : 0.05)) + waveX, 
          height * 0.4 + waveY,
          15 + i * 5, 
          80 + i * 15,
          time * 0.0003 + i * 0.3, 0, Math.PI * 2
        );
        ctx.fill();
      }
      
      // Subtle data flow indicator lines
  ctx.globalAlpha = isMobile ? 0.1 : 0.06;
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const x = width * (isMobile ? (0.35 + i * 0.3) : (0.7 + i * 0.1));
        ctx.beginPath();
        ctx.moveTo(x, height * 0.15);
        ctx.quadraticCurveTo(
          x + Math.sin(time * 0.001 + i) * 15, 
          height * 0.5, 
          x + Math.sin(time * 0.001 + i + Math.PI) * 15, 
          height * 0.85
        );
        ctx.stroke();
      }
      
      ctx.restore();

      // Extra gentle pulsing glows on mobile so movement is visible even under card
      if (isMobile) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const t = time * 0.0015;
        const pulses = [
          { x: width * 0.25, y: height * 0.28, base: 28 },
          { x: width * 0.8, y: height * 0.6, base: 36 },
        ];
        pulses.forEach((p, i) => {
          const r = p.base + Math.sin(t + i) * 10;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          const color = i % 2 === 0 ? '0, 212, 255' : '139, 92, 246';
          g.addColorStop(0, `rgba(${color}, 0.28)`);
          g.addColorStop(1, `rgba(${color}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    }

    function drawAdvanced3DRobot(ctx: CanvasRenderingContext2D, robot: Robot3D, time: number) {
      ctx.save();
      ctx.translate(robot.x, robot.y);
      
      // Update animations
      robot.animationPhase += 0.02;
      robot.rotationY = Math.sin(robot.animationPhase) * 0.3;
      robot.scale = 1 + Math.sin(robot.animationPhase * 2) * 0.1;
      
      // 3D perspective transformation
      const perspective = 800;
      const zScale = perspective / (perspective + robot.z);
      ctx.scale(robot.scale * zScale, robot.scale * zScale);
      
      // Glow effect
      if (robot.glowIntensity > 0) {
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = robot.glowIntensity * 20;
      }

      switch (robot.type) {
        case 'industrial_arm':
          drawIndustrialArm(ctx, robot, time);
          break;
        case 'autonomous_drone':
          drawAutonomousDrone(ctx, robot, time);
          break;
        case 'mobile_rover':
          drawMobileRover(ctx, robot, time);
          break;
        case 'humanoid':
          drawHumanoid(ctx, robot, time);
          break;
      }
      
      ctx.restore();
    }

    function drawIndustrialArm(ctx: CanvasRenderingContext2D, robot: Robot3D, time: number) {
      // Base
      ctx.fillStyle = '#2a3441';
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.fillRect(-15, 15, 30, 20);
      ctx.strokeRect(-15, 15, 30, 20);
      
      // Realistic arm segments with controlled, rigid movement
      const segments = [
        { 
          length: 25, 
          angle: Math.sin(time * 0.0008) * 0.3, // Much slower, smaller movement
          maxAngle: 0.3 
        },
        { 
          length: 20, 
          angle: Math.sin(time * 0.0006 + Math.PI/4) * 0.2, // Offset timing, smaller range
          maxAngle: 0.2 
        },
        { 
          length: 15, 
          angle: Math.sin(time * 0.001 + Math.PI/2) * 0.15, // Even smaller movement for end effector
          maxAngle: 0.15 
        }
      ];
      
      let currentAngle = robot.rotationY;
      ctx.translate(0, 15);
      
      segments.forEach((segment, i) => {
        // Clamp angles to realistic ranges
        const clampedAngle = Math.max(-segment.maxAngle, Math.min(segment.maxAngle, segment.angle));
        currentAngle += clampedAngle;
        ctx.rotate(clampedAngle);
        
        // Segment with more realistic proportions
        const segmentWidth = 6 - i; // Tapers down
        ctx.fillStyle = i === segments.length - 1 ? '#00ff88' : '#3a4550';
        ctx.fillRect(-segmentWidth/2, -segment.length, segmentWidth, segment.length);
        ctx.strokeRect(-segmentWidth/2, -segment.length, segmentWidth, segment.length);
        
        // Joint - more realistic circular joint
        ctx.beginPath();
        ctx.arc(0, -segment.length, 3 + (2 - i), 0, Math.PI * 2);
        ctx.fillStyle = '#4a565f';
        ctx.fill();
        ctx.stroke();
        
        ctx.translate(0, -segment.length);
      });
      
      // End effector - gripper
      ctx.fillStyle = '#ff8c00';
      const gripperOpen = Math.sin(time * 0.003) * 0.3 + 0.7; // Slow gripper animation
      
      // Left gripper finger
      ctx.save();
      ctx.rotate(-gripperOpen * 0.2);
      ctx.fillRect(-1, 0, 2, 6);
      ctx.restore();
      
      // Right gripper finger
      ctx.save();
      ctx.rotate(gripperOpen * 0.2);
      ctx.fillRect(-1, 0, 2, 6);
      ctx.restore();
      
      // Central gripper body
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawAutonomousDrone(ctx: CanvasRenderingContext2D, robot: Robot3D, time: number) {
      // Body
      ctx.fillStyle = '#4a565f';
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.fillRect(-12, -6, 24, 12);
      ctx.strokeRect(-12, -6, 24, 12);
      
      // Propellers (4)
      const propellerPositions = [[-15, -15], [15, -15], [-15, 15], [15, 15]];
      const rotationSpeed = time * 0.01;
      
      propellerPositions.forEach(([px, py]) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rotationSpeed);
        
        // Propeller blades (blurred effect)
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, 8, i * Math.PI / 2, (i + 0.8) * Math.PI / 2);
          ctx.stroke();
        }
        ctx.restore();
      });
      
      // Center camera/sensor
      ctx.fillStyle = '#ff8c00';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawMobileRover(ctx: CanvasRenderingContext2D, robot: Robot3D, time: number) {
      // Main body
      ctx.fillStyle = '#3a4550';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.fillRect(-20, -8, 40, 16);
      ctx.strokeRect(-20, -8, 40, 16);
      
      // Wheels (6)
      const wheelY = [10, 10, 10];
      const wheelX = [-15, 0, 15];
      const wheelRotation = time * 0.005;
      
      wheelX.forEach((wx, i) => {
        ctx.save();
        ctx.translate(wx, wheelY[0]);
        ctx.rotate(wheelRotation);
        
        ctx.fillStyle = '#2a3441';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Wheel spokes
        for (let j = 0; j < 4; j++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(j * Math.PI / 2) * 4, Math.sin(j * Math.PI / 2) * 4);
          ctx.stroke();
        }
        ctx.restore();
      });
      
      // Sensor array
      ctx.fillStyle = '#neon-purple';
      ctx.fillRect(-5, -15, 10, 5);
      ctx.strokeRect(-5, -15, 10, 5);
    }

    function drawHumanoid(ctx: CanvasRenderingContext2D, robot: Robot3D, time: number) {
      // Torso
      ctx.fillStyle = '#4a565f';
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.fillRect(-8, -15, 16, 25);
      ctx.strokeRect(-8, -15, 16, 25);
      
      // Head
      ctx.fillStyle = '#5a676e';
      ctx.beginPath();
      ctx.arc(0, -20, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Eyes (LED)
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(-3, -22, 2, 2);
      ctx.fillRect(1, -22, 2, 2);
      
      // Arms (moving)
      const armSwing = Math.sin(robot.animationPhase * 2) * 0.3;
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(side * 10, -5);
        ctx.rotate(side * armSwing);
        
        ctx.fillStyle = '#3a4550';
        ctx.fillRect(-2, 0, 4, 15);
        ctx.strokeRect(-2, 0, 4, 15);
        ctx.restore();
      });
      
      // Legs
      ctx.fillStyle = '#3a4550';
      [-4, 4].forEach((side) => {
        ctx.fillRect(side - 2, 10, 4, 12);
        ctx.strokeRect(side - 2, 10, 4, 12);
      });
    }

    function drawNeuralNetwork(ctx: CanvasRenderingContext2D, time: number) {
      // Draw neural network connections (layer by layer)
      for (let layer = 0; layer < 2; layer++) {
        const currentLayerNodes = neuralNodes.slice(layer * 5, (layer + 1) * 5);
        const nextLayerNodes = neuralNodes.slice((layer + 1) * 5, (layer + 2) * 5);
        
        currentLayerNodes.forEach((currentNode) => {
          nextLayerNodes.forEach((nextNode) => {
            const distance = Math.sqrt(
              Math.pow(currentNode.x - nextNode.x, 2) + Math.pow(currentNode.y - nextNode.y, 2)
            );
            
            // Neural network synaptic connections with varying weights
            const connectionStrength = 0.3 + Math.sin(time * 0.002 + currentNode.pulsePhase) * 0.2;
            ctx.strokeStyle = `rgba(0, 212, 255, ${connectionStrength})`;
            ctx.lineWidth = 1 + connectionStrength;
            ctx.beginPath();
            ctx.moveTo(currentNode.x, currentNode.y);
            ctx.lineTo(nextNode.x, nextNode.y);
            ctx.stroke();
          });
        });
      }

      // Draw nodes with neural network styling
      neuralNodes.forEach((node, i) => {
        node.pulsePhase += 0.02;
        const activation = (Math.sin(node.pulsePhase) + 1) / 2;
        const layer = Math.floor(i / 5);
        
        // Different colors for different layers
        const layerColors = ['#00d4ff', '#00ff88', '#8b5cf6'];
        const nodeColor = layerColors[layer] || '#00d4ff';
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + activation * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${layer === 0 ? '0, 212, 255' : layer === 1 ? '0, 255, 136' : '139, 92, 246'}, ${0.7 + activation * 0.3})`;
        ctx.fill();
        
        // Neural activation glow
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = 8 + activation * 12;
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Synaptic activity indicator
        if (activation > 0.8) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${(activation - 0.8) * 2})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    function drawMCPHub(ctx: CanvasRenderingContext2D, time: number) {
      ctx.save();
      ctx.translate(mcpHub.x, mcpHub.y);
      
      // Hexagonal data matrix pattern instead of rotating ovals
      const pulseIntensity = (Math.sin(time * 0.003) + 1) / 2;
      const dataFlow = (Math.sin(time * 0.005) + 1) / 2;
      
      // Draw hexagonal grid pattern
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * (25 + pulseIntensity * 6); // Increased by 25%
        const y = Math.sin(angle) * (25 + pulseIntensity * 6); // Increased by 25%
        
        ctx.save();
        ctx.translate(x, y);
        
        // Hexagonal nodes
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const hexAngle = (j * Math.PI) / 3;
          const hexX = Math.cos(hexAngle) * 7.5; // Increased by 25%
          const hexY = Math.sin(hexAngle) * 7.5; // Increased by 25%
          if (j === 0) ctx.moveTo(hexX, hexY);
          else ctx.lineTo(hexX, hexY);
        }
        ctx.closePath();
        
        const nodeOpacity = 0.3 + Math.sin(time * 0.004 + i * Math.PI/3) * 0.2;
        ctx.strokeStyle = `rgba(139, 92, 246, ${nodeOpacity})`;
        ctx.fillStyle = `rgba(139, 92, 246, ${nodeOpacity * 0.3})`;
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
        
        // Connect to center with data streams
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.2 + dataFlow * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x * 0.7, y * 0.7);
        ctx.stroke();
      }
      
      // Central processing core
  const coreSize = (isMobile ? 24 : 20) + pulseIntensity * (isMobile ? 6 : 4);
      
      // Core background
      ctx.fillStyle = `rgba(139, 92, 246, 0.8)`;
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 20 + pulseIntensity * 10;
      ctx.beginPath();
      ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Data processing indicators (small moving dots)
      for (let i = 0; i < 8; i++) {
        const dotAngle = (time * 0.002 + i * Math.PI / 4) % (Math.PI * 2);
        const dotX = Math.cos(dotAngle) * (coreSize - 4);
        const dotY = Math.sin(dotAngle) * (coreSize - 4);
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // MCP label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ROS 2', 0, 3);
      ctx.font = 'bold 8px monospace';
      // ctx.fillText('MCP', 0, -8);
      ctx.restore();
    }

    function drawFlowingParticles(ctx: CanvasRenderingContext2D, deltaTime: number) {
  particles.forEach((particle, index) => {
        particle.progress += deltaTime * 0.0008;
        
        if (particle.progress >= 1) {
          particles.splice(index, 1);
          return;
        }
        
        // Bezier curve through path points
        const t = particle.progress;
        const [x1, y1, x2, y2, x3, y3] = particle.path;
        
        // Quadratic bezier through neural -> MCP -> robot
        let x, y;
        if (t < 0.5) {
          const t1 = t * 2;
          x = (1 - t1) * (1 - t1) * x1 + 2 * (1 - t1) * t1 * x2 + t1 * t1 * x2;
          y = (1 - t1) * (1 - t1) * y1 + 2 * (1 - t1) * t1 * y2 + t1 * t1 * y2;
        } else {
          const t2 = (t - 0.5) * 2;
          x = (1 - t2) * (1 - t2) * x2 + 2 * (1 - t2) * t2 * x2 + t2 * t2 * x3;
          y = (1 - t2) * (1 - t2) * y2 + 2 * (1 - t2) * t2 * y2 + t2 * t2 * y3;
        }
        
        particle.x = x;
        particle.y = y;
        particle.opacity = Math.sin(particle.progress * Math.PI);
        
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // Main animation loop
    function animate(currentTime: number) {
      if (!canvas || !ctx) return;
      
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      ctx.clearRect(0, 0, width, height);
      
      // Draw all elements
      drawLiquidGlassBackground(ctx, currentTime);
      drawNeuralNetwork(ctx, currentTime);
      drawMCPHub(ctx, currentTime);
      drawFlowingParticles(ctx, deltaTime);
      
      // Draw 3D robots
      robots.forEach((robot) => {
        drawAdvanced3DRobot(ctx, robot, currentTime);
      });
      
      // Create new particles periodically (bidirectional)
  if (Math.random() < (isMobile ? 0.02 : 0.015)) {
        createDownwardParticle(); // Neural → Robot
      }
  if (Math.random() < (isMobile ? 0.015 : 0.01)) {
        createUpwardParticle(); // Robot → Neural (feedback)
      }
      
      // Trigger robot activation
      if (Math.random() < 0.01) {
        const robot = robots[Math.floor(Math.random() * robots.length)];
        robot.glowIntensity = 1;
        setTimeout(() => {
          robot.glowIntensity = 0;
        }, 2000);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    }

    setIsLoaded(true);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isBrowser, withAnimation, isMobile]);

  return (
    <section className="section section--hero" style={{ 
      position: 'relative',
      minHeight: isMobile ? 'auto' : '80vh',
      display: isMobile ? 'block' : 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      overflow: 'hidden'
    }}>
      {/* Mobile: Animation block comes first */}
      {withAnimation && isMobile && (
        <div style={{
          position: 'relative',
          width: '100%',
          // Use svh (small viewport height) for mobile - accounts for browser chrome
          height: '85svh',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block'
            }}
          />
          {/* Animation labels */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 2
          }}>
            <div style={{
              color: 'rgba(0, 212, 255, 0.9)',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              position: 'absolute',
              top: '24%',
              left: '6%',
              textShadow: '0 2px 10px rgba(0,0,0,0.6)'
            }}>
              AI Agents
            </div>
            <div style={{
              color: 'rgba(139, 92, 246, 0.9)',
              fontSize: '1.05rem',
              fontWeight: 'bold',
              position: 'absolute',
              top: '46%',
              left: '6%',
              textShadow: '0 2px 10px rgba(0,0,0,0.6)'
            }}>
              WiseOS
            </div>
            <div style={{
              color: 'rgba(255, 140, 0, 0.9)',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              position: 'absolute',
              top: '66%',
              left: '6%',
              textShadow: '0 2px 10px rgba(0,0,0,0.6)'
            }}>
              Robot Fleet
            </div>
          </div>
        </div>
      )}

      {/* Desktop: Liquid Glass Animation Background */}
      {withAnimation && !isMobile && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1
        }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block'
            }}
          />
        </div>
      )}
      
      {/* Glass Morphism Content Container */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        minHeight: isMobile ? 'auto' : '70vh',
        width: '100%',
        padding: isMobile ? 'var(--space-lg) var(--space-md)' : '0 var(--space-xl)'
      }}>
        <div className={withAnimation ? "liquid-glass-hero-grid" : "liquid-glass-hero-centered"}>
          {/* Content Side - With Apple-style reveal on mobile */}
          <div 
            ref={contentRef}
            style={{
            background: isMobile ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)',
            backdropFilter: isMobile ? 'blur(12px)' : 'blur(25px)',
            border: isMobile ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-xl)',
            padding: isMobile ? 'var(--space-xl) var(--space-lg)' : 'var(--space-3xl) var(--space-2xl)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
            marginLeft: isMobile ? 0 : 'var(--space-lg)',
            width: isMobile ? '100%' : 'auto',
            position: 'relative',
            // Static visible text on mobile
            opacity: 1,
            transform: 'none',
            transition: 'background 450ms ease, backdrop-filter 450ms ease, border-color 450ms ease, box-shadow 450ms ease'
          }}
          // Tap to trigger sweep manually on mobile
          onClick={() => {
            if (!isMobile) return;
            setSweep(true);
            if (sweepTimeoutRef.current) window.clearTimeout(sweepTimeoutRef.current);
            sweepTimeoutRef.current = window.setTimeout(() => setSweep(false), 1500);
          }}
          >
            <h1 className="display-xl mb-lg animate-fadeInUp" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #00d4ff 50%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: '1.2',
              fontSize: 'clamp(1.75rem, 5.5vw, 2.75rem)',
              marginBottom: 'var(--space-xl)',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              {title}
            </h1>
            
            <p className="body-xl mb-2xl animate-fadeInUp" style={{
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.7',
              fontSize: 'clamp(1rem, 3.8vw, 1.2rem)',
              marginBottom: 'var(--space-2xl)',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              {subtitle}
            </p>
            
            {/* WiseVision concept explanation */}
            <div style={{
              background: 'rgba(0, 212, 255, 0.05)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-2xl)'
            }}>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                margin: 0,
                textAlign: isMobile ? 'center' : 'left'
              }}>
                <strong style={{ color: '#00d4ff' }}>How it works:</strong> From first sensor to fleet deployment - one platform to connect, simulate and automate. Connect with WiseOS, control via ROS 2, validate in Digital Twins, ship with AI Automations.
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              gap: 'var(--space-md)',
              flexDirection: 'column',
              alignItems: isMobile ? 'stretch' : 'flex-start'
            }} className="animate-fadeInUp">
              {primaryCTA && (
                <a 
                  href={primaryCTA.href} 
                  className="btn btn--primary"
                  style={{
                    fontSize: isMobile ? '1rem' : '1.125rem',
                    padding: isMobile ? 'var(--space-md) var(--space-lg)' : 'var(--space-lg) var(--space-xl)',
                    background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                    border: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    width: isMobile ? '100%' : 'fit-content'
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>
                    {primaryCTA.text}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{marginLeft: 'var(--space-sm)', position: 'relative', zIndex: 2}}>
                    <path 
                      d="M6 4L10 8L6 12" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              )}
              
              {secondaryCTA && (
                <a 
                  href={secondaryCTA.href} 
                  className="btn btn--secondary"
                  style={{
                    fontSize: isMobile ? '0.95rem' : '1rem',
                    padding: isMobile ? 'var(--space-sm) var(--space-md)' : 'var(--space-md) var(--space-lg)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    width: isMobile ? '100%' : 'fit-content'
                  }}
                >
                  {secondaryCTA.text}
                </a>
              )}
            </div>
          </div>
          
          {/* Animation labels: desktop fixed on right; mobile show during sweep on left */}
          {withAnimation && (
            <div
              style={{
                position: isMobile ? 'absolute' : 'relative',
                top: isMobile ? 0 : undefined,
                left: isMobile ? 0 : undefined,
                height: isMobile ? '100%' : '70vh',
                width: '100%',
                pointerEvents: 'none',
                display: isMobile ? (sweep ? 'block' : 'none') : 'flex',
                flexDirection: isMobile ? undefined : 'column',
                justifyContent: isMobile ? undefined : 'flex-start',
                alignItems: isMobile ? undefined : 'center',
                padding: isMobile ? 0 : 'var(--space-lg) 0',
                zIndex: 20
              }}
            >
              {/* AI Agents */}
              <div
                style={{
                  color: 'rgba(0, 212, 255, 0.9)',
                  fontSize: isMobile ? '0.95rem' : '0.9rem',
                  fontWeight: 'bold',
                  position: 'absolute',
                  top: isMobile ? '24%' : '28%',
                  left: isMobile ? '6%' : undefined,
                  right: isMobile ? undefined : '5%',
                  textShadow: '0 2px 10px rgba(0,0,0,0.6)'
                }}
              >
                AI Agents
              </div>

              {/* WiseOS */}
              <div
                style={{
                  color: 'rgba(139, 92, 246, 0.9)',
                  fontSize: isMobile ? '1.05rem' : '1rem',
                  fontWeight: 'bold',
                  position: 'absolute',
                  top: isMobile ? '46%' : '48%',
                  left: isMobile ? '6%' : undefined,
                  right: isMobile ? undefined : '5%',
                  textShadow: '0 2px 10px rgba(0,0,0,0.6)'
                }}
              >
                WiseOS
              </div>

              {/* Robot Fleet */}
              <div
                style={{
                  color: 'rgba(255, 140, 0, 0.9)',
                  fontSize: isMobile ? '0.95rem' : '0.9rem',
                  fontWeight: 'bold',
                  position: 'absolute',
                  top: isMobile ? '66%' : '62%',
                  left: isMobile ? '6%' : undefined,
                  right: isMobile ? undefined : '5%',
                  textShadow: '0 2px 10px rgba(0,0,0,0.6)'
                }}
              >
                Robot Fleet
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
