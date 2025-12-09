import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ClusterInfo {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const clusters: ClusterInfo[] = [
  {
    id: 'robots',
    label: 'Robots & Drones',
    description: 'ROS 2 robots, AMRs, inspection drones',
    icon: '🤖',
  },
  {
    id: 'sensors',
    label: 'IoT & Environmental',
    description: '5G, Satellite, LoRaWAN, edge, industrial IoT',
    icon: '📡',
  },
  {
    id: 'twins',
    label: 'Digital Twins',
    description: 'O3DE, Isaac Sim, Genesis, operator dashboards',
    icon: '🔬',
  },
  {
    id: 'agents',
    label: 'AI Agents',
    description: 'LLM agents, autonomous task execution, MCP tools',
    icon: '🧠',
  },
  {
    id: 'blackbox',
    label: 'Data Black Box',
    description: 'InfluxDB telemetry & observability',
    icon: '📊',
  },
];

// Generate stable particle positions for static fallback
const generateStaticParticles = (count: number) => {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * 900,
      y: Math.random() * 600,
      opacity: 0.1 + Math.random() * 0.3,
      size: 1 + Math.random() * 2,
    });
  }
  return particles;
};

const staticParticles = generateStaticParticles(40);

export default function WiseOSAnimation(): JSX.Element {
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 450, y: 275 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const particleIdRef = useRef(0);

  // Parallax offset calculation
  const parallaxOffset = useMemo(() => ({
    x: (mousePos.x - 450) * 0.02,
    y: (mousePos.y - 275) * 0.02,
  }), [mousePos]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Intersection observer for performance
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Mouse tracking for parallax
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 900,
      y: ((e.clientY - rect.top) / rect.height) * 600,
    });
  }, [prefersReducedMotion]);

  // Particle system
  useEffect(() => {
    if (prefersReducedMotion || !isVisible) return;

    const spawnParticle = (baseX: number, baseY: number, color: string) => {
      const id = particleIdRef.current++;
      return {
        id,
        x: baseX + (Math.random() - 0.5) * 20,
        y: baseY + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        size: 1 + Math.random() * 2,
        color,
      };
    };

    const pathPoints = [
      { x: 180, y: 380, color: '#00d4ff' },  // robots
      { x: 720, y: 380, color: '#00ff88' },  // sensors
      { x: 200, y: 75, color: '#a855f7' },   // twins
      { x: 700, y: 75, color: '#06b6d4' },   // agents
      { x: 450, y: 470, color: '#ff8800' },  // blackbox
      { x: 450, y: 275, color: '#00d4ff' },  // center
    ];

    let lastTime = 0;
    const animate = (time: number) => {
      const delta = time - lastTime;
      
      if (delta > 100) { // Spawn particles every ~100ms
        lastTime = time;
        const point = pathPoints[Math.floor(Math.random() * pathPoints.length)];
        setParticles(prev => {
          const newParticles = [...prev, spawnParticle(point.x, point.y, point.color)];
          return newParticles.slice(-50); // Limit particles
        });
      }

      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 1 / p.maxLife,
        }))
        .filter(p => p.life > 0)
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [prefersReducedMotion, isVisible]);

  const getClusterHighlight = (clusterId: string) => {
    if (!hoveredCluster) return 1;
    if (hoveredCluster === clusterId || hoveredCluster === 'wiseos') return 1;
    return 0.3;
  };

  const getPathHighlight = (pathId: string) => {
    if (!hoveredCluster) return 0.6;
    if (hoveredCluster === 'wiseos') return 1;
    if (pathId.includes(hoveredCluster)) return 1;
    return 0.15;
  };

  const isPathActive = (pathId: string) => {
    if (!hoveredCluster) return false;
    if (hoveredCluster === 'wiseos') return true;
    return pathId.includes(hoveredCluster);
  };

  return (
    <div 
      ref={containerRef}
      className="wiseos-animation-container"
      role="img"
      aria-label="WiseOS architecture diagram showing data flow between robots, sensors, digital twins and the data black box through the WiseOS platform"
      onMouseMove={handleMouseMove}
    >
      <style>{`
        .wiseos-animation-container {
          --pulse-blue: #00d4ff;
          --pulse-green: #00ff88;
          --pulse-purple: #a855f7;
          --pulse-orange: #ff8800;
          --pulse-cyan: #06b6d4;
          --node-bg: rgba(12, 12, 20, 0.95);
          --node-border: rgba(0, 212, 255, 0.4);
          --path-color: rgba(0, 212, 255, 0.25);
          --text-color: rgba(255, 255, 255, 0.95);
          --glow-color: rgba(0, 212, 255, 0.5);
          --surface-glass: rgba(255, 255, 255, 0.03);
          
          position: relative;
          width: 100%;
          max-width: 950px;
          margin: 2rem auto;
          padding: 1.5rem;
          min-height: 580px;
          overflow: visible;
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0, 212, 255, 0.03) 0%, transparent 70%);
          border-radius: 24px;
        }

        [data-theme='light'] .wiseos-animation-container {
          --node-bg: rgba(255, 255, 255, 0.95);
          --node-border: rgba(0, 150, 200, 0.5);
          --path-color: rgba(0, 150, 200, 0.3);
          --text-color: rgba(20, 20, 40, 0.95);
          --glow-color: rgba(0, 180, 220, 0.4);
          --surface-glass: rgba(0, 0, 0, 0.02);
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0, 180, 220, 0.05) 0%, transparent 70%);
        }

        @media (max-width: 767px) {
          .wiseos-animation-container {
            min-height: 820px;
            padding: 1rem;
          }
        }

        .wiseos-svg {
          width: 100%;
          height: 100%;
          min-height: inherit;
          filter: drop-shadow(0 0 40px rgba(0, 212, 255, 0.1));
        }

        [data-theme='light'] .wiseos-svg {
          filter: drop-shadow(0 0 30px rgba(0, 150, 200, 0.08));
        }

        /* === GLASS MORPHISM NODES === */
        .node-group {
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3));
        }

        .node-group:hover {
          filter: drop-shadow(0 8px 40px var(--glow-color));
        }

        .node-bg {
          fill: var(--node-bg);
          stroke: var(--node-border);
          stroke-width: 1.5;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .node-inner-glow {
          fill: none;
          stroke: var(--pulse-blue);
          stroke-width: 0;
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .node-group:hover .node-bg {
          stroke: var(--pulse-blue);
          stroke-width: 2;
        }

        .node-group:hover .node-inner-glow {
          stroke-width: 8;
          opacity: 0.15;
        }

        /* === WISEOS CENTRAL NODE === */
        .wiseos-node {
          filter: drop-shadow(0 0 60px rgba(0, 212, 255, 0.3));
        }

        .wiseos-node:hover {
          filter: drop-shadow(0 0 80px rgba(0, 212, 255, 0.5));
        }

        .wiseos-node .node-bg {
          stroke: var(--pulse-blue);
          stroke-width: 2;
        }

        .wiseos-node:hover .node-bg {
          stroke-width: 3;
        }

        /* === TYPOGRAPHY === */
        .node-icon {
          font-size: 1.8rem;
          text-anchor: middle;
          dominant-baseline: central;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
        }

        .node-label {
          fill: var(--text-color);
          font-size: 0.85rem;
          font-weight: 600;
          text-anchor: middle;
          letter-spacing: 0.02em;
          opacity: 0.9;
          transition: all 0.3s ease;
        }

        .node-group:hover .node-label {
          opacity: 1;
        }

        .node-sublabel {
          fill: var(--text-color);
          font-size: 0.65rem;
          text-anchor: middle;
          opacity: 0.5;
          transition: all 0.3s ease;
        }

        .node-group:hover .node-sublabel {
          opacity: 0.7;
        }

        .wiseos-label {
          fill: var(--pulse-blue);
          font-size: 1.6rem;
          font-weight: 800;
          text-anchor: middle;
          letter-spacing: 0.08em;
          text-shadow: 0 0 30px var(--pulse-blue);
        }

        [data-theme='light'] .wiseos-label {
          fill: #0088aa;
          text-shadow: none;
        }

        .wiseos-sublabel {
          fill: var(--text-color);
          font-size: 0.7rem;
          text-anchor: middle;
          opacity: 0.6;
          letter-spacing: 0.03em;
        }

        /* === DATA PATHS === */
        .data-path {
          fill: none;
          stroke: var(--path-color);
          stroke-width: 2;
          stroke-linecap: round;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .data-path.active {
          stroke-width: 3;
          filter: drop-shadow(0 0 8px currentColor);
        }

        .data-path-glow {
          fill: none;
          stroke-width: 12;
          stroke-linecap: round;
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        .data-path-glow.active {
          opacity: 0.15;
        }

        /* === ANIMATED DATA PULSES === */
        .data-pulse {
          filter: url(#pulseGlow);
        }

        .pulse-trail {
          opacity: 0.4;
        }

        @keyframes pulseFade {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          15% { opacity: 1; transform: scale(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.5); }
        }

        .pulse-animate {
          animation-name: pulseFade;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          animation-iteration-count: infinite;
        }

        /* === FLOATING PARTICLES === */
        .particle {
          pointer-events: none;
        }

        @keyframes particleFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-10px) scale(1.2); opacity: 0.6; }
        }

        .ambient-particle {
          animation: particleFloat 4s ease-in-out infinite;
        }

        /* === CENTRAL EFFECTS === */
        .central-glow {
          animation: centralPulse 5s ease-in-out infinite;
        }

        @keyframes centralPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }

        .central-rings {
          animation: ringExpand 8s ease-in-out infinite;
        }

        @keyframes ringExpand {
          0% { r: 100; opacity: 0.2; }
          50% { r: 140; opacity: 0.05; }
          100% { r: 100; opacity: 0.2; }
        }

        .orbit-ring {
          fill: none;
          stroke: var(--path-color);
          stroke-width: 1;
          stroke-dasharray: 8 12;
          animation: orbitSpin 80s linear infinite;
        }

        .orbit-ring-inner {
          animation-direction: reverse;
          animation-duration: 60s;
          stroke-dasharray: 4 8;
          opacity: 0.5;
        }

        @keyframes orbitSpin {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -200; }
        }

        /* === GRID PATTERN === */
        .grid-pattern {
          opacity: 0.03;
        }

        [data-theme='light'] .grid-pattern {
          opacity: 0.04;
        }

        /* === SCANLINE EFFECT === */
        .scanline {
          animation: scanMove 6s linear infinite;
          opacity: 0.03;
        }

        @keyframes scanMove {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        /* === TOOLTIP === */
        .tooltip-group {
          pointer-events: none;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tooltip-group.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .tooltip-bg {
          fill: rgba(0, 0, 0, 0.95);
          stroke: var(--pulse-blue);
          stroke-width: 1;
          rx: 10;
          filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
        }

        [data-theme='light'] .tooltip-bg {
          fill: rgba(255, 255, 255, 0.98);
          stroke: #0088aa;
        }

        .tooltip-text {
          fill: white;
          font-size: 0.72rem;
          text-anchor: middle;
          dominant-baseline: central;
          font-weight: 500;
        }

        [data-theme='light'] .tooltip-text {
          fill: #1a1a2e;
        }

        /* === CORNER DECORATIONS === */
        .corner-decoration {
          stroke: var(--node-border);
          stroke-width: 1;
          fill: none;
          opacity: 0.3;
        }

        /* === LEGEND === */
        .wiseos-legend {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1.2rem;
          margin-top: 1.5rem;
          font-size: 0.72rem;
          opacity: 0.7;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: opacity 0.3s ease;
        }

        .legend-item:hover {
          opacity: 1;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }

        .legend-dot.blue { background: var(--pulse-blue); color: var(--pulse-blue); }
        .legend-dot.green { background: var(--pulse-green); color: var(--pulse-green); }
        .legend-dot.purple { background: var(--pulse-purple); color: var(--pulse-purple); }
        .legend-dot.cyan { background: var(--pulse-cyan); color: var(--pulse-cyan); }
        .legend-dot.orange { background: var(--pulse-orange); color: var(--pulse-orange); }

        /* === STATUS INDICATOR === */
        .status-dot {
          animation: statusBlink 2s ease-in-out infinite;
        }

        @keyframes statusBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* === REDUCED MOTION === */
        @media (prefers-reduced-motion: reduce) {
          .data-pulse,
          .pulse-animate,
          .central-glow,
          .central-rings,
          .orbit-ring,
          .scanline,
          .ambient-particle,
          .status-dot {
            animation: none !important;
          }
          
          .data-pulse {
            opacity: 0 !important;
          }
          
          .central-glow {
            opacity: 0.25 !important;
          }

          .node-group:hover {
            filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3));
          }

          .node-group:hover .node-icon {
            transform: none;
          }
        }

        /* === NODE PULSE ANIMATION ON HOVER === */
        @keyframes nodePulse {
          0%, 100% { stroke-opacity: 0.4; }
          50% { stroke-opacity: 0.8; }
        }

        .node-group:hover .node-bg {
          animation: nodePulse 1.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .node-group:hover .node-bg {
            animation: none;
          }
        }
      `}</style>

      <svg 
        className="wiseos-svg" 
        viewBox={isMobile ? "0 0 400 820" : "0 0 900 580"}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Enhanced glow filters */}
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="pulseGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradients */}
          <radialGradient id="wiseosGradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.25)" />
            <stop offset="50%" stopColor="rgba(168, 85, 247, 0.15)" />
            <stop offset="100%" stopColor="rgba(0, 212, 255, 0.05)" />
          </radialGradient>

          <radialGradient id="centralGlowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.3)" />
            <stop offset="40%" stopColor="rgba(168, 85, 247, 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <radialGradient id="nodeGlowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <linearGradient id="pathGradientBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--pulse-blue)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="var(--pulse-blue)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--pulse-blue)" stopOpacity="0.1" />
          </linearGradient>

          {/* Grid pattern */}
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--pulse-blue)" strokeWidth="0.5" opacity="0.3" />
          </pattern>

          {/* Hex pattern */}
          <pattern id="hexPattern" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon 
              points="30,0 60,15 60,45 30,60 0,45 0,15" 
              fill="none" 
              stroke="var(--pulse-blue)" 
              strokeWidth="0.3"
              opacity="0.2"
              transform="translate(0, -4) scale(0.9)"
            />
          </pattern>

          {/* Path definitions */}
          {!isMobile && (
            <>
              <path id="path-robots" d="M 180 395 Q 280 350 380 290" />
              <path id="path-sensors" d="M 720 395 Q 620 350 520 290" />
              <path id="path-twins" d="M 220 115 Q 300 180 380 250" />
              <path id="path-agents" d="M 680 115 Q 600 180 520 250" />
              <path id="path-blackbox" d="M 450 350 L 450 455" />
            </>
          )}

          {isMobile && (
            <>
              <path id="path-robots" d="M 200 510 L 200 420" />
              <path id="path-sensors" d="M 200 600 L 200 510" />
              <path id="path-twins" d="M 200 110 L 200 200" />
              <path id="path-agents" d="M 200 200 L 200 290" />
              <path id="path-blackbox" d="M 200 420 L 200 720" />
            </>
          )}
        </defs>

        {/* Background layers */}
        <rect width="100%" height="100%" fill="url(#gridPattern)" className="grid-pattern" />
        
        {/* Ambient particles (static for reduced motion) */}
        <g className="ambient-particles" style={{ transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }}>
          {staticParticles.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill="var(--pulse-blue)"
              opacity={p.opacity}
              className="ambient-particle"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </g>

        {/* Dynamic particles (only when not reduced motion) */}
        {!prefersReducedMotion && isVisible && (
          <g className="dynamic-particles">
            {particles.map(p => (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={p.size * p.life}
                fill={p.color}
                opacity={p.life * 0.6}
                className="particle"
              />
            ))}
          </g>
        )}

        {/* Scanline effect */}
        {!prefersReducedMotion && (
          <rect 
            x="0" 
            y="0" 
            width="100%" 
            height="4" 
            fill="var(--pulse-blue)" 
            className="scanline"
          />
        )}

        {/* Desktop Layout */}
        {!isMobile && (
          <>
            {/* Central effects */}
            <g style={{ transform: `translate(${parallaxOffset.x * 2}px, ${parallaxOffset.y * 2}px)` }}>
              <circle 
                cx="450" 
                cy="290" 
                r={prefersReducedMotion ? 100 : 120}
                className="central-glow"
                fill="url(#centralGlowGradient)"
              />
              <circle 
                cx="450" 
                cy="290" 
                r="100"
                className="central-rings"
                fill="none"
                stroke="var(--pulse-blue)"
                strokeWidth="1"
                opacity="0.1"
              />
            </g>

            {/* Orbit rings */}
            <circle cx="450" cy="290" r="155" className="orbit-ring" />
            <circle cx="450" cy="290" r="125" className="orbit-ring orbit-ring-inner" />

            {/* Data path glows (behind paths) */}
            <path 
              d="M 180 395 Q 280 350 380 290" 
              className={`data-path-glow ${isPathActive('robots') ? 'active' : ''}`}
              stroke="var(--pulse-blue)"
            />
            <path 
              d="M 720 395 Q 620 350 520 290" 
              className={`data-path-glow ${isPathActive('sensors') ? 'active' : ''}`}
              stroke="var(--pulse-green)"
            />
            <path 
              d="M 220 115 Q 300 180 380 250" 
              className={`data-path-glow ${isPathActive('twins') ? 'active' : ''}`}
              stroke="var(--pulse-purple)"
            />
            <path 
              d="M 680 115 Q 600 180 520 250" 
              className={`data-path-glow ${isPathActive('agents') ? 'active' : ''}`}
              stroke="var(--pulse-cyan)"
            />
            <path 
              d="M 450 350 L 450 455" 
              className={`data-path-glow ${isPathActive('blackbox') ? 'active' : ''}`}
              stroke="var(--pulse-orange)"
            />

            {/* Data paths */}
            <path 
              d="M 180 395 Q 280 350 380 290" 
              className={`data-path ${isPathActive('robots') ? 'active' : ''}`}
              stroke={isPathActive('robots') ? 'var(--pulse-blue)' : undefined}
              style={{ opacity: getPathHighlight('robots') }}
            />
            <path 
              d="M 720 395 Q 620 350 520 290" 
              className={`data-path ${isPathActive('sensors') ? 'active' : ''}`}
              stroke={isPathActive('sensors') ? 'var(--pulse-green)' : undefined}
              style={{ opacity: getPathHighlight('sensors') }}
            />
            <path 
              d="M 220 115 Q 300 180 380 250" 
              className={`data-path ${isPathActive('twins') ? 'active' : ''}`}
              stroke={isPathActive('twins') ? 'var(--pulse-purple)' : undefined}
              style={{ opacity: getPathHighlight('twins') }}
            />
            <path 
              d="M 680 115 Q 600 180 520 250" 
              className={`data-path ${isPathActive('agents') ? 'active' : ''}`}
              stroke={isPathActive('agents') ? 'var(--pulse-cyan)' : undefined}
              style={{ opacity: getPathHighlight('agents') }}
            />
            <path 
              d="M 450 350 L 450 455" 
              className={`data-path ${isPathActive('blackbox') ? 'active' : ''}`}
              stroke={isPathActive('blackbox') ? 'var(--pulse-orange)' : undefined}
              style={{ opacity: getPathHighlight('blackbox') }}
            />

            {/* Animated data pulses */}
            {!prefersReducedMotion && isVisible && (
              <g className="data-pulses">
                {/* Robots pulses */}
                {[0, 1.8].map((delay, i) => (
                  <circle key={`r${i}`} r="5" fill="var(--pulse-blue)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '3.5s' }}>
                    <animateMotion dur="3.5s" repeatCount="indefinite" begin={`${delay}s`}>
                      <mpath href="#path-robots" />
                    </animateMotion>
                  </circle>
                ))}
                {/* Sensors pulses */}
                {[0.4, 2.2].map((delay, i) => (
                  <circle key={`s${i}`} r="5" fill="var(--pulse-green)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '3.2s' }}>
                    <animateMotion dur="3.2s" repeatCount="indefinite" begin={`${delay}s`}>
                      <mpath href="#path-sensors" />
                    </animateMotion>
                  </circle>
                ))}
                {/* Twins pulses */}
                {[0.2, 1.6].map((delay, i) => (
                  <circle key={`t${i}`} r="5" fill="var(--pulse-purple)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '2.8s' }}>
                    <animateMotion dur="2.8s" repeatCount="indefinite" begin={`${delay}s`}>
                      <mpath href="#path-twins" />
                    </animateMotion>
                  </circle>
                ))}
                {/* Agents pulses */}
                {[0.6, 2].map((delay, i) => (
                  <circle key={`a${i}`} r="5" fill="var(--pulse-cyan)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '2.6s' }}>
                    <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${delay}s`}>
                      <mpath href="#path-agents" />
                    </animateMotion>
                  </circle>
                ))}
                {/* Blackbox pulses */}
                {[0.8, 2.4].map((delay, i) => (
                  <circle key={`b${i}`} r="5" fill="var(--pulse-orange)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '2.2s' }}>
                    <animateMotion dur="2.2s" repeatCount="indefinite" begin={`${delay}s`}>
                      <mpath href="#path-blackbox" />
                    </animateMotion>
                  </circle>
                ))}
              </g>
            )}

            {/* WiseOS Central Node */}
            <g 
              className="node-group wiseos-node"
              onMouseEnter={() => setHoveredCluster('wiseos')}
              onMouseLeave={() => setHoveredCluster(null)}
              style={{ transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }}
            >
              <rect x="370" y="230" width="160" height="120" rx="20" className="node-inner-glow" />
              <rect 
                x="370" 
                y="230" 
                width="160" 
                height="120" 
                rx="20"
                className="node-bg"
                fill="url(#wiseosGradient)"
              />
              {/* Status indicator */}
              <circle cx="515" cy="245" r="4" fill="var(--pulse-green)" className="status-dot" filter="url(#softGlow)" />
              <text x="450" y="278" className="wiseos-label">WiseOS</text>
              <text x="450" y="302" className="wiseos-sublabel">Operating System for</text>
              <text x="450" y="318" className="wiseos-sublabel">Robotics & IoT</text>
            </g>

            {/* Robots & Drones Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('robots'), transform: `translate(${parallaxOffset.x * 0.5}px, ${parallaxOffset.y * 0.5}px)` }}
              onMouseEnter={() => setHoveredCluster('robots')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <ellipse cx="180" cy="440" rx="110" ry="50" className="node-inner-glow" />
              <rect x="60" y="365" width="240" height="100" rx="16" className="node-bg" />
              <circle cx="285" cy="380" r="3" fill="var(--pulse-blue)" className="status-dot" filter="url(#softGlow)" />
              <text x="180" y="402" className="node-icon">🤖</text>
              <text x="180" y="432" className="node-label">Robots & Drones</text>
              <text x="180" y="452" className="node-sublabel">ROS 2 nodes, AMRs, UAVs</text>
            </g>

            {/* IoT & Sensors Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('sensors'), transform: `translate(${parallaxOffset.x * 0.5}px, ${parallaxOffset.y * 0.5}px)` }}
              onMouseEnter={() => setHoveredCluster('sensors')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <ellipse cx="720" cy="440" rx="110" ry="50" className="node-inner-glow" />
              <rect x="600" y="365" width="240" height="100" rx="16" className="node-bg" />
              <circle cx="825" cy="380" r="3" fill="var(--pulse-green)" className="status-dot" filter="url(#softGlow)" />
              <text x="720" y="402" className="node-icon">📡</text>
              <text x="720" y="432" className="node-label">IoT & Sensors</text>
              <text x="720" y="452" className="node-sublabel">WiFi, 5G, Satellite, LoRaWAN</text>
            </g>

            {/* Digital Twins Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('twins'), transform: `translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.3}px)` }}
              onMouseEnter={() => setHoveredCluster('twins')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <ellipse cx="160" cy="90" rx="100" ry="45" className="node-inner-glow" />
              <rect x="60" y="30" width="200" height="95" rx="16" className="node-bg" />
              <circle cx="245" cy="45" r="3" fill="var(--pulse-purple)" className="status-dot" filter="url(#softGlow)" />
              <text x="160" y="68" className="node-icon">🔬</text>
              <text x="160" y="96" className="node-label">Digital Twins</text>
              <text x="160" y="114" className="node-sublabel">O3DE, Isaac Sim, Genesis</text>
            </g>

            {/* AI Agents Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('agents'), transform: `translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.3}px)` }}
              onMouseEnter={() => setHoveredCluster('agents')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <ellipse cx="740" cy="90" rx="100" ry="45" className="node-inner-glow" />
              <rect x="640" y="30" width="200" height="95" rx="16" className="node-bg" />
              <circle cx="825" cy="45" r="3" fill="var(--pulse-cyan)" className="status-dot" filter="url(#softGlow)" />
              <text x="740" y="68" className="node-icon">🧠</text>
              <text x="740" y="96" className="node-label">AI Agents</text>
              <text x="740" y="114" className="node-sublabel">LLM tools, autonomous tasks</text>
            </g>

            {/* Data Black Box Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('blackbox'), transform: `translate(${parallaxOffset.x * 0.4}px, ${parallaxOffset.y * 0.4}px)` }}
              onMouseEnter={() => setHoveredCluster('blackbox')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <ellipse cx="450" cy="500" rx="100" ry="40" className="node-inner-glow" />
              <rect x="340" y="455" width="220" height="90" rx="16" className="node-bg" />
              <circle cx="545" cy="470" r="3" fill="var(--pulse-orange)" className="status-dot" filter="url(#softGlow)" />
              <text x="450" y="490" className="node-icon">📊</text>
              <text x="450" y="518" className="node-label">Data Black Box</text>
              <text x="450" y="536" className="node-sublabel">InfluxDB telemetry</text>
            </g>

            {/* Corner decorations */}
            <g className="corner-decorations" opacity="0.4">
              <path d="M 20 20 L 20 50 M 20 20 L 50 20" className="corner-decoration" />
              <path d="M 880 20 L 880 50 M 880 20 L 850 20" className="corner-decoration" />
              <path d="M 20 560 L 20 530 M 20 560 L 50 560" className="corner-decoration" />
              <path d="M 880 560 L 880 530 M 880 560 L 850 560" className="corner-decoration" />
            </g>
          </>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <>
            {/* Central glow */}
            <circle 
              cx="200" 
              cy="355" 
              r={prefersReducedMotion ? 60 : 70}
              className="central-glow"
              fill="url(#centralGlowGradient)"
            />

            {/* Orbit ring */}
            <circle cx="200" cy="355" r="90" className="orbit-ring" />

            {/* Data paths with glows */}
            <path d="M 200 110 L 200 200" className={`data-path-glow ${isPathActive('twins') ? 'active' : ''}`} stroke="var(--pulse-purple)" />
            <path d="M 200 200 L 200 290" className={`data-path-glow ${isPathActive('agents') ? 'active' : ''}`} stroke="var(--pulse-cyan)" />
            <path d="M 200 420 L 200 510" className={`data-path-glow ${isPathActive('robots') ? 'active' : ''}`} stroke="var(--pulse-blue)" />
            <path d="M 200 510 L 200 600" className={`data-path-glow ${isPathActive('sensors') ? 'active' : ''}`} stroke="var(--pulse-green)" />
            <path d="M 200 420 L 200 720" className={`data-path-glow ${isPathActive('blackbox') ? 'active' : ''}`} stroke="var(--pulse-orange)" />

            <path d="M 200 110 L 200 200" className={`data-path ${isPathActive('twins') ? 'active' : ''}`} stroke={isPathActive('twins') ? 'var(--pulse-purple)' : undefined} style={{ opacity: getPathHighlight('twins') }} />
            <path d="M 200 200 L 200 290" className={`data-path ${isPathActive('agents') ? 'active' : ''}`} stroke={isPathActive('agents') ? 'var(--pulse-cyan)' : undefined} style={{ opacity: getPathHighlight('agents') }} />
            <path d="M 200 420 L 200 510" className={`data-path ${isPathActive('robots') ? 'active' : ''}`} stroke={isPathActive('robots') ? 'var(--pulse-blue)' : undefined} style={{ opacity: getPathHighlight('robots') }} />
            <path d="M 200 510 L 200 600" className={`data-path ${isPathActive('sensors') ? 'active' : ''}`} stroke={isPathActive('sensors') ? 'var(--pulse-green)' : undefined} style={{ opacity: getPathHighlight('sensors') }} />
            <path d="M 200 420 L 200 720" className={`data-path ${isPathActive('blackbox') ? 'active' : ''}`} stroke={isPathActive('blackbox') ? 'var(--pulse-orange)' : undefined} style={{ opacity: getPathHighlight('blackbox') }} />

            {/* Mobile animated pulses */}
            {!prefersReducedMotion && isVisible && (
              <g className="data-pulses">
                <circle r="4" fill="var(--pulse-purple)" className="data-pulse pulse-animate" style={{ animationDelay: '0s', animationDuration: '2.5s' }}>
                  <animateMotion dur="2.5s" repeatCount="indefinite"><mpath href="#path-twins" /></animateMotion>
                </circle>
                <circle r="4" fill="var(--pulse-cyan)" className="data-pulse pulse-animate" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.5s"><mpath href="#path-agents" /></animateMotion>
                </circle>
                <circle r="4" fill="var(--pulse-blue)" className="data-pulse pulse-animate" style={{ animationDelay: '1s', animationDuration: '2.5s' }}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin="1s"><mpath href="#path-robots" /></animateMotion>
                </circle>
                <circle r="4" fill="var(--pulse-green)" className="data-pulse pulse-animate" style={{ animationDelay: '1.5s', animationDuration: '2.5s' }}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin="1.5s"><mpath href="#path-sensors" /></animateMotion>
                </circle>
                <circle r="4" fill="var(--pulse-orange)" className="data-pulse pulse-animate" style={{ animationDelay: '2s', animationDuration: '3s' }}>
                  <animateMotion dur="3s" repeatCount="indefinite" begin="2s"><mpath href="#path-blackbox" /></animateMotion>
                </circle>
              </g>
            )}

            {/* Digital Twins Node */}
            <g className="node-group" style={{ opacity: getClusterHighlight('twins') }} onMouseEnter={() => setHoveredCluster('twins')} onMouseLeave={() => setHoveredCluster(null)}>
              <rect x="40" y="30" width="320" height="75" rx="14" className="node-bg" />
              <circle cx="345" cy="45" r="3" fill="var(--pulse-purple)" className="status-dot" filter="url(#softGlow)" />
              <text x="200" y="62" className="node-icon">🔬</text>
              <text x="200" y="88" className="node-label">Digital Twins</text>
            </g>

            {/* AI Agents Node */}
            <g className="node-group" style={{ opacity: getClusterHighlight('agents') }} onMouseEnter={() => setHoveredCluster('agents')} onMouseLeave={() => setHoveredCluster(null)}>
              <rect x="40" y="125" width="320" height="75" rx="14" className="node-bg" />
              <circle cx="345" cy="140" r="3" fill="var(--pulse-cyan)" className="status-dot" filter="url(#softGlow)" />
              <text x="200" y="157" className="node-icon">🧠</text>
              <text x="200" y="183" className="node-label">AI Agents</text>
            </g>

            {/* WiseOS Central Node */}
            <g className="node-group wiseos-node" onMouseEnter={() => setHoveredCluster('wiseos')} onMouseLeave={() => setHoveredCluster(null)}>
              <rect x="40" y="290" width="320" height="130" rx="18" className="node-bg" fill="url(#wiseosGradient)" />
              <circle cx="345" cy="305" r="4" fill="var(--pulse-green)" className="status-dot" filter="url(#softGlow)" />
              <text x="200" y="345" className="wiseos-label">WiseOS</text>
              <text x="200" y="378" className="wiseos-sublabel">Operating System for Robotics & IoT</text>
            </g>

            {/* Robots & Drones Node */}
            <g className="node-group" style={{ opacity: getClusterHighlight('robots') }} onMouseEnter={() => setHoveredCluster('robots')} onMouseLeave={() => setHoveredCluster(null)}>
              <rect x="40" y="475" width="320" height="75" rx="14" className="node-bg" />
              <circle cx="345" cy="490" r="3" fill="var(--pulse-blue)" className="status-dot" filter="url(#softGlow)" />
              <text x="200" y="507" className="node-icon">🤖</text>
              <text x="200" y="533" className="node-label">Robots & Drones</text>
            </g>

            {/* IoT & Sensors Node */}
            <g className="node-group" style={{ opacity: getClusterHighlight('sensors') }} onMouseEnter={() => setHoveredCluster('sensors')} onMouseLeave={() => setHoveredCluster(null)}>
              <rect x="40" y="570" width="320" height="75" rx="14" className="node-bg" />
              <circle cx="345" cy="585" r="3" fill="var(--pulse-green)" className="status-dot" filter="url(#softGlow)" />
              <text x="200" y="602" className="node-icon">📡</text>
              <text x="200" y="628" className="node-label">IoT & Sensors</text>
            </g>

            {/* Data Black Box Node */}
            <g className="node-group" style={{ opacity: getClusterHighlight('blackbox') }} onMouseEnter={() => setHoveredCluster('blackbox')} onMouseLeave={() => setHoveredCluster(null)}>
              <rect x="40" y="715" width="320" height="75" rx="14" className="node-bg" />
              <circle cx="345" cy="730" r="3" fill="var(--pulse-orange)" className="status-dot" filter="url(#softGlow)" />
              <text x="200" y="747" className="node-icon">📊</text>
              <text x="200" y="773" className="node-label">Data Black Box</text>
            </g>
          </>
        )}

        {/* Tooltip */}
        {hoveredCluster && hoveredCluster !== 'wiseos' && (
          <g className={`tooltip-group ${hoveredCluster ? 'visible' : ''}`}>
            {/* Position tooltip above or below each node */}
            {!isMobile && hoveredCluster === 'robots' && (
              <g transform="translate(180, 345)">
                <rect x="-150" y="-18" width="300" height="36" rx="8" className="tooltip-bg" />
                <text y="0" className="tooltip-text">{clusters.find(c => c.id === 'robots')?.description}</text>
              </g>
            )}
            {!isMobile && hoveredCluster === 'sensors' && (
              <g transform="translate(720, 345)">
                <rect x="-150" y="-18" width="300" height="36" rx="8" className="tooltip-bg" />
                <text y="0" className="tooltip-text">{clusters.find(c => c.id === 'sensors')?.description}</text>
              </g>
            )}
            {!isMobile && hoveredCluster === 'twins' && (
              <g transform="translate(160, 145)">
                <rect x="-150" y="-18" width="300" height="36" rx="8" className="tooltip-bg" />
                <text y="0" className="tooltip-text">{clusters.find(c => c.id === 'twins')?.description}</text>
              </g>
            )}
            {!isMobile && hoveredCluster === 'agents' && (
              <g transform="translate(740, 145)">
                <rect x="-150" y="-18" width="300" height="36" rx="8" className="tooltip-bg" />
                <text y="0" className="tooltip-text">{clusters.find(c => c.id === 'agents')?.description}</text>
              </g>
            )}
            {!isMobile && hoveredCluster === 'blackbox' && (
              <g transform="translate(450, 435)">
                <rect x="-150" y="-18" width="300" height="36" rx="8" className="tooltip-bg" />
                <text y="0" className="tooltip-text">{clusters.find(c => c.id === 'blackbox')?.description}</text>
              </g>
            )}
            {/* Mobile tooltip */}
            {isMobile && (
              <g transform="translate(200, 260)">
                <rect x="-150" y="-18" width="300" height="36" rx="8" className="tooltip-bg" />
                <text y="0" className="tooltip-text">{clusters.find(c => c.id === hoveredCluster)?.description}</text>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="wiseos-legend">
        <span className="legend-item">
          <span className="legend-dot blue"></span>
          Robot data
        </span>
        <span className="legend-item">
          <span className="legend-dot green"></span>
          Sensor data
        </span>
        <span className="legend-item">
          <span className="legend-dot purple"></span>
          Twin sync
        </span>
        <span className="legend-item">
          <span className="legend-dot cyan"></span>
          AI Agents
        </span>
        <span className="legend-item">
          <span className="legend-dot orange"></span>
          Telemetry
        </span>
      </div>
    </div>
  );
}
