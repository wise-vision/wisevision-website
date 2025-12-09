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

interface NodeInfo {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const leftNodes: NodeInfo[] = [
  {
    id: 'claude',
    label: 'Claude',
    description: 'Anthropic Claude AI assistant',
    icon: '🧠',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    description: 'AI-powered code editor',
    icon: '💻',
  },
  {
    id: 'agents',
    label: 'Custom Agents',
    description: 'Your own LLM-powered agents',
    icon: '🤖',
  },
];

const rightNodes: NodeInfo[] = [
  {
    id: 'topics',
    label: 'Topics',
    description: 'Subscribe & publish to ROS 2 topics',
    icon: '📡',
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Call ROS 2 services synchronously',
    icon: '⚙️',
  },
  {
    id: 'actions',
    label: 'Actions',
    description: 'Execute long-running ROS 2 actions',
    icon: '🎯',
  },
];

// Generate stable particle positions
const generateStaticParticles = (count: number) => {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * 900,
      y: Math.random() * 500,
      opacity: 0.1 + Math.random() * 0.25,
      size: 1 + Math.random() * 1.5,
    });
  }
  return particles;
};

const staticParticles = generateStaticParticles(35);

export default function MCPROS2Animation(): JSX.Element {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 450, y: 250 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const particleIdRef = useRef(0);

  const parallaxOffset = useMemo(() => ({
    x: (mousePos.x - 450) * 0.015,
    y: (mousePos.y - 250) * 0.015,
  }), [mousePos]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 900,
      y: ((e.clientY - rect.top) / rect.height) * 500,
    });
  }, [prefersReducedMotion]);

  // Particle system
  useEffect(() => {
    if (prefersReducedMotion || !isVisible) return;

    const spawnParticle = (baseX: number, baseY: number, color: string) => {
      const id = particleIdRef.current++;
      return {
        id,
        x: baseX + (Math.random() - 0.5) * 15,
        y: baseY + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        life: 1,
        maxLife: 50 + Math.random() * 50,
        size: 1 + Math.random() * 1.5,
        color,
      };
    };

    const pathPoints = [
      { x: 450, y: 250, color: '#10b981' },  // center
      { x: 150, y: 150, color: '#8b5cf6' },  // AI side
      { x: 750, y: 150, color: '#f59e0b' },  // ROS side
    ];

    let lastTime = 0;
    const animate = (time: number) => {
      const delta = time - lastTime;
      if (delta > 120) {
        lastTime = time;
        const point = pathPoints[Math.floor(Math.random() * pathPoints.length)];
        setParticles(prev => [...prev, spawnParticle(point.x, point.y, point.color)].slice(-40));
      }
      setParticles(prev => prev
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 / p.maxLife }))
        .filter(p => p.life > 0)
      );
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [prefersReducedMotion, isVisible]);

  const getNodeHighlight = (nodeId: string) => {
    if (!hoveredNode) return 1;
    if (hoveredNode === nodeId || hoveredNode === 'mcp') return 1;
    return 0.3;
  };

  const isPathActive = (side: 'left' | 'right') => {
    if (!hoveredNode) return false;
    if (hoveredNode === 'mcp') return true;
    if (side === 'left') return ['claude', 'cursor', 'agents'].includes(hoveredNode);
    return ['topics', 'services', 'actions'].includes(hoveredNode);
  };

  return (
    <div 
      ref={containerRef}
      className="mcp-animation-container"
      role="img"
      aria-label="MCP ROS2 architecture diagram showing AI agents connected to ROS 2 systems through the MCP protocol"
      onMouseMove={handleMouseMove}
    >
      <style>{`
        .mcp-animation-container {
          --pulse-purple: #8b5cf6;
          --pulse-green: #10b981;
          --pulse-amber: #f59e0b;
          --pulse-blue: #3b82f6;
          --pulse-cyan: #06b6d4;
          --node-bg: rgba(12, 12, 20, 0.95);
          --node-border: rgba(16, 185, 129, 0.4);
          --path-color: rgba(16, 185, 129, 0.25);
          --text-color: rgba(255, 255, 255, 0.95);
          --glow-color: rgba(16, 185, 129, 0.5);
          
          position: relative;
          width: 100%;
          max-width: 950px;
          margin: 2rem auto;
          padding: 1.5rem;
          min-height: 520px;
          overflow: visible;
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(16, 185, 129, 0.03) 0%, transparent 70%);
          border-radius: 24px;
        }

        [data-theme='light'] .mcp-animation-container {
          --node-bg: rgba(255, 255, 255, 0.95);
          --node-border: rgba(16, 150, 100, 0.5);
          --path-color: rgba(16, 150, 100, 0.3);
          --text-color: rgba(20, 20, 40, 0.95);
          --glow-color: rgba(16, 185, 129, 0.4);
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 70%);
        }

        @media (max-width: 767px) {
          .mcp-animation-container {
            min-height: 750px;
            padding: 1rem;
          }
        }

        .mcp-svg {
          width: 100%;
          height: 100%;
          min-height: inherit;
          filter: drop-shadow(0 0 40px rgba(16, 185, 129, 0.1));
        }

        [data-theme='light'] .mcp-svg {
          filter: drop-shadow(0 0 30px rgba(16, 185, 129, 0.08));
        }

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
          stroke: var(--pulse-green);
          stroke-width: 0;
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .node-group:hover .node-bg {
          stroke: var(--pulse-green);
          stroke-width: 2;
        }

        .node-group:hover .node-inner-glow {
          stroke-width: 8;
          opacity: 0.15;
        }

        .mcp-node {
          filter: drop-shadow(0 0 60px rgba(16, 185, 129, 0.3));
        }

        .mcp-node:hover {
          filter: drop-shadow(0 0 80px rgba(16, 185, 129, 0.5));
        }

        .mcp-node .node-bg {
          stroke: var(--pulse-green);
          stroke-width: 2;
        }

        .node-icon {
          font-size: 1.6rem;
          text-anchor: middle;
          dominant-baseline: central;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
        }

        .node-label {
          fill: var(--text-color);
          font-size: 0.8rem;
          font-weight: 600;
          text-anchor: middle;
          letter-spacing: 0.02em;
          opacity: 0.9;
        }

        .node-sublabel {
          fill: var(--text-color);
          font-size: 0.6rem;
          text-anchor: middle;
          opacity: 0.5;
        }

        .mcp-label {
          fill: var(--pulse-green);
          font-size: 1.4rem;
          font-weight: 800;
          text-anchor: middle;
          letter-spacing: 0.08em;
        }

        [data-theme='light'] .mcp-label {
          fill: #059669;
        }

        .mcp-sublabel {
          fill: var(--text-color);
          font-size: 0.65rem;
          text-anchor: middle;
          opacity: 0.6;
        }

        .section-label {
          fill: var(--text-color);
          font-size: 0.7rem;
          font-weight: 700;
          text-anchor: middle;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.5;
        }

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

        .data-pulse {
          filter: url(#mcpPulseGlow);
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

        @keyframes particleFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-8px) scale(1.15); opacity: 0.5; }
        }

        .ambient-particle {
          animation: particleFloat 4s ease-in-out infinite;
        }

        .central-glow {
          animation: centralPulse 5s ease-in-out infinite;
        }

        @keyframes centralPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }

        .orbit-ring {
          fill: none;
          stroke: var(--path-color);
          stroke-width: 1;
          stroke-dasharray: 6 10;
          animation: orbitSpin 60s linear infinite;
        }

        @keyframes orbitSpin {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -160; }
        }

        .grid-pattern {
          opacity: 0.03;
        }

        .arrow-head {
          fill: var(--pulse-green);
          opacity: 0.6;
        }

        .bidirectional-indicator {
          animation: arrowPulse 2s ease-in-out infinite;
        }

        @keyframes arrowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .tooltip-group {
          pointer-events: none;
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tooltip-group.visible {
          opacity: 1;
        }

        .tooltip-bg {
          fill: rgba(0, 0, 0, 0.95);
          stroke: var(--pulse-green);
          stroke-width: 1;
          rx: 8;
          filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
        }

        [data-theme='light'] .tooltip-bg {
          fill: rgba(255, 255, 255, 0.98);
          stroke: #059669;
        }

        .tooltip-text {
          fill: white;
          font-size: 0.7rem;
          text-anchor: middle;
          dominant-baseline: central;
          font-weight: 500;
        }

        [data-theme='light'] .tooltip-text {
          fill: #1a1a2e;
        }

        .status-dot {
          animation: statusBlink 2s ease-in-out infinite;
        }

        @keyframes statusBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .mcp-legend {
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
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }

        .legend-dot.purple { background: var(--pulse-purple); color: var(--pulse-purple); }
        .legend-dot.green { background: var(--pulse-green); color: var(--pulse-green); }
        .legend-dot.amber { background: var(--pulse-amber); color: var(--pulse-amber); }

        @media (prefers-reduced-motion: reduce) {
          .data-pulse, .pulse-animate, .central-glow, .orbit-ring,
          .ambient-particle, .status-dot, .bidirectional-indicator {
            animation: none !important;
          }
          .data-pulse { opacity: 0 !important; }
          .central-glow { opacity: 0.25 !important; }
        }

        @keyframes nodePulse {
          0%, 100% { stroke-opacity: 0.4; }
          50% { stroke-opacity: 0.8; }
        }

        .node-group:hover .node-bg {
          animation: nodePulse 1.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .node-group:hover .node-bg { animation: none; }
        }
      `}</style>

      <svg 
        className="mcp-svg" 
        viewBox={isMobile ? "0 0 400 750" : "0 0 900 500"}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="mcpGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="mcpPulseGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="mcpSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="mcpGradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)" />
            <stop offset="50%" stopColor="rgba(139, 92, 246, 0.15)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.05)" />
          </radialGradient>

          <radialGradient id="mcpCentralGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.35)" />
            <stop offset="40%" stopColor="rgba(139, 92, 246, 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          <pattern id="mcpGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--pulse-green)" strokeWidth="0.5" opacity="0.3" />
          </pattern>

          {/* Path definitions */}
          {!isMobile && (
            <>
              <path id="path-left-1" d="M 200 120 Q 320 140 380 250" />
              <path id="path-left-2" d="M 200 250 L 380 250" />
              <path id="path-left-3" d="M 200 380 Q 320 360 380 250" />
              <path id="path-right-1" d="M 520 250 Q 580 140 700 120" />
              <path id="path-right-2" d="M 520 250 L 700 250" />
              <path id="path-right-3" d="M 520 250 Q 580 360 700 380" />
            </>
          )}

          {isMobile && (
            <>
              <path id="path-left-1" d="M 200 100 L 200 200" />
              <path id="path-left-2" d="M 200 170 L 200 270" />
              <path id="path-left-3" d="M 200 240 L 200 340" />
              <path id="path-right-1" d="M 200 440 L 200 540" />
              <path id="path-right-2" d="M 200 510 L 200 610" />
              <path id="path-right-3" d="M 200 580 L 200 680" />
            </>
          )}
        </defs>

        {/* Background */}
        <rect width="100%" height="100%" fill="url(#mcpGridPattern)" className="grid-pattern" />
        
        {/* Ambient particles */}
        <g className="ambient-particles" style={{ transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }}>
          {staticParticles.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.size} fill="var(--pulse-green)" opacity={p.opacity} className="ambient-particle" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </g>

        {/* Dynamic particles */}
        {!prefersReducedMotion && isVisible && (
          <g className="dynamic-particles">
            {particles.map(p => (
              <circle key={p.id} cx={p.x} cy={p.y} r={p.size * p.life} fill={p.color} opacity={p.life * 0.6} />
            ))}
          </g>
        )}

        {/* Desktop Layout */}
        {!isMobile && (
          <>
            {/* Section labels */}
            <text x="150" y="45" className="section-label">AI Clients</text>
            <text x="750" y="45" className="section-label">ROS 2 Systems</text>

            {/* Central glow */}
            <g style={{ transform: `translate(${parallaxOffset.x * 2}px, ${parallaxOffset.y * 2}px)` }}>
              <circle cx="450" cy="250" r={prefersReducedMotion ? 80 : 100} className="central-glow" fill="url(#mcpCentralGlow)" />
            </g>

            {/* Orbit ring */}
            <ellipse cx="450" cy="250" rx="120" ry="80" className="orbit-ring" />

            {/* Data path glows */}
            <path d="M 200 120 Q 320 140 380 250" className={`data-path-glow ${isPathActive('left') ? 'active' : ''}`} stroke="var(--pulse-purple)" />
            <path d="M 200 250 L 380 250" className={`data-path-glow ${isPathActive('left') ? 'active' : ''}`} stroke="var(--pulse-purple)" />
            <path d="M 200 380 Q 320 360 380 250" className={`data-path-glow ${isPathActive('left') ? 'active' : ''}`} stroke="var(--pulse-purple)" />
            <path d="M 520 250 Q 580 140 700 120" className={`data-path-glow ${isPathActive('right') ? 'active' : ''}`} stroke="var(--pulse-amber)" />
            <path d="M 520 250 L 700 250" className={`data-path-glow ${isPathActive('right') ? 'active' : ''}`} stroke="var(--pulse-amber)" />
            <path d="M 520 250 Q 580 360 700 380" className={`data-path-glow ${isPathActive('right') ? 'active' : ''}`} stroke="var(--pulse-amber)" />

            {/* Data paths */}
            <path d="M 200 120 Q 320 140 380 250" className={`data-path ${isPathActive('left') ? 'active' : ''}`} stroke={isPathActive('left') ? 'var(--pulse-purple)' : undefined} style={{ opacity: hoveredNode ? (isPathActive('left') ? 1 : 0.15) : 0.6 }} />
            <path d="M 200 250 L 380 250" className={`data-path ${isPathActive('left') ? 'active' : ''}`} stroke={isPathActive('left') ? 'var(--pulse-purple)' : undefined} style={{ opacity: hoveredNode ? (isPathActive('left') ? 1 : 0.15) : 0.6 }} />
            <path d="M 200 380 Q 320 360 380 250" className={`data-path ${isPathActive('left') ? 'active' : ''}`} stroke={isPathActive('left') ? 'var(--pulse-purple)' : undefined} style={{ opacity: hoveredNode ? (isPathActive('left') ? 1 : 0.15) : 0.6 }} />
            <path d="M 520 250 Q 580 140 700 120" className={`data-path ${isPathActive('right') ? 'active' : ''}`} stroke={isPathActive('right') ? 'var(--pulse-amber)' : undefined} style={{ opacity: hoveredNode ? (isPathActive('right') ? 1 : 0.15) : 0.6 }} />
            <path d="M 520 250 L 700 250" className={`data-path ${isPathActive('right') ? 'active' : ''}`} stroke={isPathActive('right') ? 'var(--pulse-amber)' : undefined} style={{ opacity: hoveredNode ? (isPathActive('right') ? 1 : 0.15) : 0.6 }} />
            <path d="M 520 250 Q 580 360 700 380" className={`data-path ${isPathActive('right') ? 'active' : ''}`} stroke={isPathActive('right') ? 'var(--pulse-amber)' : undefined} style={{ opacity: hoveredNode ? (isPathActive('right') ? 1 : 0.15) : 0.6 }} />

            {/* Bidirectional arrows */}
            <g className="bidirectional-indicator">
              <polygon points="375,245 365,240 365,250" className="arrow-head" style={{ fill: 'var(--pulse-purple)' }} />
              <polygon points="525,245 535,240 535,250" className="arrow-head" style={{ fill: 'var(--pulse-amber)' }} />
            </g>

            {/* Animated pulses */}
            {!prefersReducedMotion && isVisible && (
              <g className="data-pulses">
                {[0, 1.5, 3].map((delay, i) => (
                  <circle key={`l1-${i}`} r="4" fill="var(--pulse-purple)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '3s' }}>
                    <animateMotion dur="3s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#path-left-1" /></animateMotion>
                  </circle>
                ))}
                {[0.5, 2, 3.5].map((delay, i) => (
                  <circle key={`l2-${i}`} r="4" fill="var(--pulse-purple)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '2.5s' }}>
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#path-left-2" /></animateMotion>
                  </circle>
                ))}
                {[1, 2.5].map((delay, i) => (
                  <circle key={`l3-${i}`} r="4" fill="var(--pulse-purple)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '3s' }}>
                    <animateMotion dur="3s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#path-left-3" /></animateMotion>
                  </circle>
                ))}
                {[0.3, 1.8, 3.3].map((delay, i) => (
                  <circle key={`r1-${i}`} r="4" fill="var(--pulse-amber)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '3s' }}>
                    <animateMotion dur="3s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#path-right-1" /></animateMotion>
                  </circle>
                ))}
                {[0.8, 2.3].map((delay, i) => (
                  <circle key={`r2-${i}`} r="4" fill="var(--pulse-amber)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '2.5s' }}>
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#path-right-2" /></animateMotion>
                  </circle>
                ))}
                {[1.3, 2.8].map((delay, i) => (
                  <circle key={`r3-${i}`} r="4" fill="var(--pulse-amber)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '3s' }}>
                    <animateMotion dur="3s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#path-right-3" /></animateMotion>
                  </circle>
                ))}
              </g>
            )}

            {/* MCP Central Node */}
            <g className="node-group mcp-node" onMouseEnter={() => setHoveredNode('mcp')} onMouseLeave={() => setHoveredNode(null)} style={{ transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }}>
              <rect x="380" y="200" width="140" height="100" rx="18" className="node-inner-glow" />
              <rect x="380" y="200" width="140" height="100" rx="18" className="node-bg" fill="url(#mcpGradient)" />
              <circle cx="505" cy="215" r="4" fill="var(--pulse-green)" className="status-dot" filter="url(#mcpSoftGlow)" />
              <text x="450" y="240" className="mcp-label">MCP</text>
              <text x="450" y="262" className="mcp-sublabel">Model Context</text>
              <text x="450" y="278" className="mcp-sublabel">Protocol</text>
            </g>

            {/* Left side - AI Clients */}
            {leftNodes.map((node, i) => (
              <g key={node.id} className="node-group" style={{ opacity: getNodeHighlight(node.id), transform: `translate(${parallaxOffset.x * 0.4}px, ${parallaxOffset.y * 0.4}px)` }} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}>
                <rect x="80" y={70 + i * 130} width="180" height="85" rx="14" className="node-bg" />
                <circle cx="245" cy={85 + i * 130} r="3" fill="var(--pulse-purple)" className="status-dot" filter="url(#mcpSoftGlow)" />
                <text x="170" y={102 + i * 130} className="node-icon">{node.icon}</text>
                <text x="170" y={128 + i * 130} className="node-label">{node.label}</text>
              </g>
            ))}

            {/* Right side - ROS 2 Systems */}
            {rightNodes.map((node, i) => (
              <g key={node.id} className="node-group" style={{ opacity: getNodeHighlight(node.id), transform: `translate(${parallaxOffset.x * 0.4}px, ${parallaxOffset.y * 0.4}px)` }} onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}>
                <rect x="640" y={70 + i * 130} width="180" height="85" rx="14" className="node-bg" />
                <circle cx="805" cy={85 + i * 130} r="3" fill="var(--pulse-amber)" className="status-dot" filter="url(#mcpSoftGlow)" />
                <text x="730" y={102 + i * 130} className="node-icon">{node.icon}</text>
                <text x="730" y={128 + i * 130} className="node-label">{node.label}</text>
              </g>
            ))}

            {/* Corner decorations */}
            <g opacity="0.4">
              <path d="M 20 20 L 20 50 M 20 20 L 50 20" stroke="var(--node-border)" strokeWidth="1" fill="none" />
              <path d="M 880 20 L 880 50 M 880 20 L 850 20" stroke="var(--node-border)" strokeWidth="1" fill="none" />
              <path d="M 20 480 L 20 450 M 20 480 L 50 480" stroke="var(--node-border)" strokeWidth="1" fill="none" />
              <path d="M 880 480 L 880 450 M 880 480 L 850 480" stroke="var(--node-border)" strokeWidth="1" fill="none" />
            </g>
          </>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <>
            <text x="200" y="30" className="section-label">AI Clients</text>
            <text x="200" y="430" className="section-label">ROS 2 Systems</text>

            <circle cx="200" cy="340" r={prefersReducedMotion ? 50 : 60} className="central-glow" fill="url(#mcpCentralGlow)" />

            {/* Mobile paths */}
            <path d="M 200 100 L 200 270" className="data-path" style={{ opacity: 0.6 }} />
            <path d="M 200 410 L 200 540" className="data-path" style={{ opacity: 0.6 }} />

            {/* AI Clients - Mobile */}
            {leftNodes.map((node, i) => (
              <g key={node.id} className="node-group" onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}>
                <rect x="50" y={50 + i * 75} width="300" height="65" rx="12" className="node-bg" />
                <text x="200" y={78 + i * 75} className="node-icon">{node.icon}</text>
                <text x="200" y={100 + i * 75} className="node-label">{node.label}</text>
              </g>
            ))}

            {/* MCP Central - Mobile */}
            <g className="node-group mcp-node" onMouseEnter={() => setHoveredNode('mcp')} onMouseLeave={() => setHoveredNode(null)}>
              <rect x="50" y="280" width="300" height="120" rx="16" className="node-bg" fill="url(#mcpGradient)" />
              <circle cx="335" cy="295" r="4" fill="var(--pulse-green)" className="status-dot" filter="url(#mcpSoftGlow)" />
              <text x="200" y="330" className="mcp-label">MCP ROS2</text>
              <text x="200" y="360" className="mcp-sublabel">Model Context Protocol</text>
            </g>

            {/* ROS 2 Systems - Mobile */}
            {rightNodes.map((node, i) => (
              <g key={node.id} className="node-group" onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}>
                <rect x="50" y={450 + i * 75} width="300" height="65" rx="12" className="node-bg" />
                <text x="200" y={478 + i * 75} className="node-icon">{node.icon}</text>
                <text x="200" y={500 + i * 75} className="node-label">{node.label}</text>
              </g>
            ))}
          </>
        )}

        {/* Tooltips */}
        {hoveredNode && hoveredNode !== 'mcp' && (
          <g className={`tooltip-group ${hoveredNode ? 'visible' : ''}`}>
            {!isMobile && hoveredNode === 'claude' && (
              <g transform="translate(170, 50)"><rect x="-120" y="-16" width="240" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{leftNodes[0].description}</text></g>
            )}
            {!isMobile && hoveredNode === 'cursor' && (
              <g transform="translate(170, 180)"><rect x="-120" y="-16" width="240" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{leftNodes[1].description}</text></g>
            )}
            {!isMobile && hoveredNode === 'agents' && (
              <g transform="translate(170, 310)"><rect x="-120" y="-16" width="240" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{leftNodes[2].description}</text></g>
            )}
            {!isMobile && hoveredNode === 'topics' && (
              <g transform="translate(730, 50)"><rect x="-130" y="-16" width="260" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{rightNodes[0].description}</text></g>
            )}
            {!isMobile && hoveredNode === 'services' && (
              <g transform="translate(730, 180)"><rect x="-130" y="-16" width="260" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{rightNodes[1].description}</text></g>
            )}
            {!isMobile && hoveredNode === 'actions' && (
              <g transform="translate(730, 310)"><rect x="-140" y="-16" width="280" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{rightNodes[2].description}</text></g>
            )}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="mcp-legend">
        <span className="legend-item">
          <span className="legend-dot purple"></span>
          AI requests
        </span>
        <span className="legend-item">
          <span className="legend-dot green"></span>
          MCP protocol
        </span>
        <span className="legend-item">
          <span className="legend-dot amber"></span>
          ROS 2 commands
        </span>
      </div>
    </div>
  );
}
