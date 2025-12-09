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

interface LayerInfo {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const layers: LayerInfo[] = [
  {
    id: 'physical',
    label: 'Physical World',
    description: 'Real robots, sensors, and infrastructure',
    icon: '🏭',
    color: '#3b82f6',
  },
  {
    id: 'data',
    label: 'Data Layer',
    description: 'ROS 2 topics, telemetry, sensor streams',
    icon: '📊',
    color: '#10b981',
  },
  {
    id: 'twin',
    label: 'Digital Twin',
    description: 'Virtual mirror of physical assets',
    icon: '🔮',
    color: '#8b5cf6',
  },
  {
    id: 'simulation',
    label: 'Simulation',
    description: 'Test scenarios before deployment',
    icon: '🎮',
    color: '#f59e0b',
  },
];

const engines: { id: string; label: string; icon: string }[] = [
  { id: 'o3de', label: 'O3DE', icon: '🎮' },
  { id: 'isaac', label: 'Isaac Sim', icon: '🚀' },
  { id: 'genesis', label: 'Genesis', icon: '⚙️' },
];

// Generate stable particle positions
const generateStaticParticles = (count: number) => {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * 900,
      y: Math.random() * 550,
      opacity: 0.1 + Math.random() * 0.25,
      size: 1 + Math.random() * 1.5,
    });
  }
  return particles;
};

const staticParticles = generateStaticParticles(35);

export default function DigitalTwinsAnimation(): JSX.Element {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 450, y: 275 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const particleIdRef = useRef(0);

  const parallaxOffset = useMemo(() => ({
    x: (mousePos.x - 450) * 0.015,
    y: (mousePos.y - 275) * 0.015,
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
      y: ((e.clientY - rect.top) / rect.height) * 550,
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
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.3, // Float upward
        life: 1,
        maxLife: 60 + Math.random() * 60,
        size: 1 + Math.random() * 2,
        color,
      };
    };

    const spawnPoints = [
      { x: 450, y: 450, color: '#3b82f6' },
      { x: 450, y: 330, color: '#10b981' },
      { x: 450, y: 210, color: '#8b5cf6' },
      { x: 450, y: 90, color: '#f59e0b' },
    ];

    let lastTime = 0;
    const animate = (time: number) => {
      const delta = time - lastTime;
      if (delta > 100) {
        lastTime = time;
        const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        setParticles(prev => [...prev, spawnParticle(point.x, point.y, point.color)].slice(-45));
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

  const getLayerHighlight = (layerId: string) => {
    if (!hoveredLayer) return 1;
    if (hoveredLayer === layerId) return 1;
    return 0.35;
  };

  return (
    <div 
      ref={containerRef}
      className="dt-animation-container"
      role="img"
      aria-label="Digital Twins architecture showing layers from physical world to simulation"
      onMouseMove={handleMouseMove}
    >
      <style>{`
        .dt-animation-container {
          --pulse-blue: #3b82f6;
          --pulse-green: #10b981;
          --pulse-purple: #8b5cf6;
          --pulse-amber: #f59e0b;
          --pulse-cyan: #06b6d4;
          --node-bg: rgba(12, 12, 20, 0.95);
          --node-border: rgba(139, 92, 246, 0.4);
          --path-color: rgba(139, 92, 246, 0.25);
          --text-color: rgba(255, 255, 255, 0.95);
          --glow-color: rgba(139, 92, 246, 0.5);
          
          position: relative;
          width: 100%;
          max-width: 950px;
          margin: 2rem auto;
          padding: 1.5rem;
          min-height: 580px;
          overflow: visible;
          background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 70%);
          border-radius: 24px;
        }

        [data-theme='light'] .dt-animation-container {
          --node-bg: rgba(255, 255, 255, 0.95);
          --node-border: rgba(120, 80, 200, 0.5);
          --path-color: rgba(120, 80, 200, 0.3);
          --text-color: rgba(20, 20, 40, 0.95);
          --glow-color: rgba(139, 92, 246, 0.4);
          background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
        }

        @media (max-width: 767px) {
          .dt-animation-container {
            min-height: 850px;
            padding: 1rem;
          }
        }

        .dt-svg {
          width: 100%;
          height: 100%;
          min-height: inherit;
          filter: drop-shadow(0 0 40px rgba(139, 92, 246, 0.1));
        }

        [data-theme='light'] .dt-svg {
          filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.08));
        }

        .layer-group {
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .layer-group:hover {
          filter: drop-shadow(0 0 30px var(--glow-color));
        }

        .layer-bg {
          fill: var(--node-bg);
          stroke: var(--node-border);
          stroke-width: 1.5;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .layer-group:hover .layer-bg {
          stroke-width: 2.5;
        }

        .layer-icon {
          font-size: 1.8rem;
          text-anchor: middle;
          dominant-baseline: central;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
        }

        .layer-label {
          fill: var(--text-color);
          font-size: 0.9rem;
          font-weight: 700;
          text-anchor: middle;
          letter-spacing: 0.02em;
        }

        .layer-sublabel {
          fill: var(--text-color);
          font-size: 0.65rem;
          text-anchor: middle;
          opacity: 0.6;
        }

        .engine-group {
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.2));
        }

        .engine-group:hover {
          filter: drop-shadow(0 4px 20px var(--glow-color));
        }

        .engine-bg {
          fill: var(--node-bg);
          stroke: var(--pulse-amber);
          stroke-width: 1.5;
          transition: all 0.3s ease;
        }

        .engine-group:hover .engine-bg {
          stroke-width: 2;
        }

        .engine-label {
          fill: var(--text-color);
          font-size: 0.7rem;
          font-weight: 600;
          text-anchor: middle;
        }

        .engine-icon {
          font-size: 1.2rem;
          text-anchor: middle;
        }

        .sync-arrow {
          fill: none;
          stroke: var(--path-color);
          stroke-width: 2;
          stroke-linecap: round;
          marker-end: url(#dtArrowHead);
          transition: all 0.4s ease;
        }

        .sync-arrow.bidirectional {
          marker-start: url(#dtArrowHeadReverse);
        }

        .sync-arrow-glow {
          fill: none;
          stroke-width: 10;
          stroke-linecap: round;
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .layer-group:hover ~ .sync-arrow-glow,
        .sync-arrow-glow.active {
          opacity: 0.15;
        }

        .data-pulse {
          filter: url(#dtPulseGlow);
        }

        @keyframes pulseFade {
          0%, 100% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }

        .pulse-animate {
          animation-name: pulseFade;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          animation-iteration-count: infinite;
        }

        @keyframes particleRise {
          0%, 100% { transform: translateY(0px); opacity: 0.3; }
          50% { transform: translateY(-15px); opacity: 0.6; }
        }

        .ambient-particle {
          animation: particleRise 5s ease-in-out infinite;
        }

        @keyframes layerGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .layer-glow {
          animation: layerGlow 4s ease-in-out infinite;
        }

        .mirror-line {
          stroke: var(--pulse-purple);
          stroke-width: 2;
          stroke-dasharray: 8 4;
          opacity: 0.4;
          animation: mirrorPulse 3s ease-in-out infinite;
        }

        @keyframes mirrorPulse {
          0%, 100% { opacity: 0.3; stroke-dashoffset: 0; }
          50% { opacity: 0.6; stroke-dashoffset: 12; }
        }

        .grid-pattern {
          opacity: 0.03;
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
          stroke: var(--pulse-purple);
          stroke-width: 1;
          rx: 8;
          filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
        }

        [data-theme='light'] .tooltip-bg {
          fill: rgba(255, 255, 255, 0.98);
          stroke: #7c3aed;
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

        .dt-legend {
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

        .legend-dot.blue { background: var(--pulse-blue); color: var(--pulse-blue); }
        .legend-dot.green { background: var(--pulse-green); color: var(--pulse-green); }
        .legend-dot.purple { background: var(--pulse-purple); color: var(--pulse-purple); }
        .legend-dot.amber { background: var(--pulse-amber); color: var(--pulse-amber); }

        @media (prefers-reduced-motion: reduce) {
          .data-pulse, .pulse-animate, .layer-glow,
          .ambient-particle, .status-dot, .mirror-line {
            animation: none !important;
          }
          .data-pulse { opacity: 0 !important; }
          .layer-glow { opacity: 0.4 !important; }
          .mirror-line { opacity: 0.4 !important; }
        }

        @keyframes layerPulse {
          0%, 100% { stroke-opacity: 0.4; }
          50% { stroke-opacity: 0.8; }
        }

        .layer-group:hover .layer-bg {
          animation: layerPulse 1.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .layer-group:hover .layer-bg { animation: none; }
        }
      `}</style>

      <svg 
        className="dt-svg" 
        viewBox={isMobile ? "0 0 400 850" : "0 0 900 550"}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="dtGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="dtPulseGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="dtSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <marker id="dtArrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--pulse-purple)" opacity="0.6" />
          </marker>

          <marker id="dtArrowHeadReverse" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
            <polygon points="10 0, 0 3.5, 10 7" fill="var(--pulse-purple)" opacity="0.6" />
          </marker>

          <linearGradient id="layerGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.25)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.15)" />
          </linearGradient>

          <linearGradient id="layerGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.15)" />
            <stop offset="50%" stopColor="rgba(16, 185, 129, 0.25)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.15)" />
          </linearGradient>

          <linearGradient id="layerGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.15)" />
            <stop offset="50%" stopColor="rgba(139, 92, 246, 0.25)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.15)" />
          </linearGradient>

          <linearGradient id="layerGradient4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0.15)" />
            <stop offset="50%" stopColor="rgba(245, 158, 11, 0.25)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0.15)" />
          </linearGradient>

          <pattern id="dtGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--pulse-purple)" strokeWidth="0.5" opacity="0.3" />
          </pattern>

          {/* Path definitions for pulses */}
          {!isMobile && (
            <>
              <path id="dt-path-1-2" d="M 450 440 L 450 360" />
              <path id="dt-path-2-3" d="M 450 320 L 450 240" />
              <path id="dt-path-3-4" d="M 450 200 L 450 120" />
            </>
          )}

          {isMobile && (
            <>
              <path id="dt-path-1-2" d="M 200 200 L 200 280" />
              <path id="dt-path-2-3" d="M 200 380 L 200 460" />
              <path id="dt-path-3-4" d="M 200 560 L 200 640" />
            </>
          )}
        </defs>

        {/* Background */}
        <rect width="100%" height="100%" fill="url(#dtGridPattern)" className="grid-pattern" />
        
        {/* Ambient particles */}
        <g className="ambient-particles" style={{ transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }}>
          {staticParticles.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.size} fill="var(--pulse-purple)" opacity={p.opacity} className="ambient-particle" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </g>

        {/* Dynamic particles */}
        {!prefersReducedMotion && isVisible && (
          <g className="dynamic-particles">
            {particles.map(p => (
              <circle key={p.id} cx={p.x} cy={p.y} r={p.size * p.life} fill={p.color} opacity={p.life * 0.5} />
            ))}
          </g>
        )}

        {/* Desktop Layout - Stacked layers */}
        {!isMobile && (
          <>
            {/* Mirror/sync lines between layers */}
            <line x1="100" y1="390" x2="100" y2="160" className="mirror-line" />
            <line x1="800" y1="390" x2="800" y2="160" className="mirror-line" />

            {/* Sync arrows between layers */}
            <path d="M 450 440 L 450 365" className="sync-arrow bidirectional" style={{ opacity: hoveredLayer ? (hoveredLayer === 'physical' || hoveredLayer === 'data' ? 0.8 : 0.2) : 0.5 }} />
            <path d="M 450 320 L 450 245" className="sync-arrow bidirectional" style={{ opacity: hoveredLayer ? (hoveredLayer === 'data' || hoveredLayer === 'twin' ? 0.8 : 0.2) : 0.5 }} />
            <path d="M 450 200 L 450 125" className="sync-arrow bidirectional" style={{ opacity: hoveredLayer ? (hoveredLayer === 'twin' || hoveredLayer === 'simulation' ? 0.8 : 0.2) : 0.5 }} />

            {/* Layer glow effects */}
            <rect x="100" y="440" width="700" height="75" rx="12" fill="url(#layerGradient1)" className="layer-glow" style={{ animationDelay: '0s' }} />
            <rect x="100" y="325" width="700" height="75" rx="12" fill="url(#layerGradient2)" className="layer-glow" style={{ animationDelay: '1s' }} />
            <rect x="100" y="205" width="700" height="75" rx="12" fill="url(#layerGradient3)" className="layer-glow" style={{ animationDelay: '2s' }} />
            <rect x="100" y="85" width="700" height="75" rx="12" fill="url(#layerGradient4)" className="layer-glow" style={{ animationDelay: '3s' }} />

            {/* Animated data pulses */}
            {!prefersReducedMotion && isVisible && (
              <g className="data-pulses">
                {[0, 2].map((delay, i) => (
                  <circle key={`p1-${i}`} r="5" fill="var(--pulse-blue)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '2.5s' }}>
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#dt-path-1-2" /></animateMotion>
                  </circle>
                ))}
                {[0.5, 2.5].map((delay, i) => (
                  <circle key={`p2-${i}`} r="5" fill="var(--pulse-green)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '2.5s' }}>
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#dt-path-2-3" /></animateMotion>
                  </circle>
                ))}
                {[1, 3].map((delay, i) => (
                  <circle key={`p3-${i}`} r="5" fill="var(--pulse-purple)" className="data-pulse pulse-animate" style={{ animationDelay: `${delay}s`, animationDuration: '2.5s' }}>
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${delay}s`}><mpath href="#dt-path-3-4" /></animateMotion>
                  </circle>
                ))}
              </g>
            )}

            {/* Layer 1: Physical World (bottom) */}
            <g 
              className="layer-group"
              style={{ opacity: getLayerHighlight('physical'), transform: `translate(${parallaxOffset.x * 0.2}px, ${parallaxOffset.y * 0.2}px)` }}
              onMouseEnter={() => setHoveredLayer('physical')}
              onMouseLeave={() => setHoveredLayer(null)}
            >
              <rect x="100" y="440" width="700" height="75" rx="12" className="layer-bg" style={{ stroke: 'var(--pulse-blue)' }} />
              <circle cx="785" cy="455" r="3" fill="var(--pulse-blue)" className="status-dot" filter="url(#dtSoftGlow)" />
              <text x="160" y="485" className="layer-icon">🏭</text>
              <text x="300" y="478" className="layer-label">Physical World</text>
              <text x="550" y="478" className="layer-sublabel">Real robots, sensors, and infrastructure</text>
            </g>

            {/* Layer 2: Data Layer */}
            <g 
              className="layer-group"
              style={{ opacity: getLayerHighlight('data'), transform: `translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.3}px)` }}
              onMouseEnter={() => setHoveredLayer('data')}
              onMouseLeave={() => setHoveredLayer(null)}
            >
              <rect x="100" y="325" width="700" height="75" rx="12" className="layer-bg" style={{ stroke: 'var(--pulse-green)' }} />
              <circle cx="785" cy="340" r="3" fill="var(--pulse-green)" className="status-dot" filter="url(#dtSoftGlow)" />
              <text x="160" y="370" className="layer-icon">📊</text>
              <text x="300" y="363" className="layer-label">Data Layer</text>
              <text x="530" y="363" className="layer-sublabel">ROS 2 topics, telemetry, sensor streams</text>
            </g>

            {/* Layer 3: Digital Twin */}
            <g 
              className="layer-group"
              style={{ opacity: getLayerHighlight('twin'), transform: `translate(${parallaxOffset.x * 0.4}px, ${parallaxOffset.y * 0.4}px)` }}
              onMouseEnter={() => setHoveredLayer('twin')}
              onMouseLeave={() => setHoveredLayer(null)}
            >
              <rect x="100" y="205" width="700" height="75" rx="12" className="layer-bg" style={{ stroke: 'var(--pulse-purple)' }} />
              <circle cx="785" cy="220" r="3" fill="var(--pulse-purple)" className="status-dot" filter="url(#dtSoftGlow)" />
              <text x="160" y="250" className="layer-icon">🔮</text>
              <text x="300" y="243" className="layer-label">Digital Twin</text>
              <text x="520" y="243" className="layer-sublabel">Virtual mirror of physical assets</text>
            </g>

            {/* Layer 4: Simulation (top) */}
            <g 
              className="layer-group"
              style={{ opacity: getLayerHighlight('simulation'), transform: `translate(${parallaxOffset.x * 0.5}px, ${parallaxOffset.y * 0.5}px)` }}
              onMouseEnter={() => setHoveredLayer('simulation')}
              onMouseLeave={() => setHoveredLayer(null)}
            >
              <rect x="100" y="85" width="700" height="75" rx="12" className="layer-bg" style={{ stroke: 'var(--pulse-amber)' }} />
              <circle cx="785" cy="100" r="3" fill="var(--pulse-amber)" className="status-dot" filter="url(#dtSoftGlow)" />
              <text x="160" y="130" className="layer-icon">🎮</text>
              <text x="300" y="123" className="layer-label">Simulation</text>
              <text x="510" y="123" className="layer-sublabel">Test scenarios before deployment</text>
            </g>

            {/* Simulation engines */}
            <g className="engines" style={{ transform: `translate(${parallaxOffset.x * 0.5}px, ${parallaxOffset.y * 0.5}px)` }}>
              {engines.map((engine, i) => (
                <g key={engine.id} className="engine-group" transform={`translate(${650 + i * 85}, 35)`}>
                  <rect x="-35" y="-20" width="70" height="45" rx="8" className="engine-bg" />
                  <text x="0" y="-2" className="engine-icon">{engine.icon}</text>
                  <text x="0" y="16" className="engine-label">{engine.label}</text>
                </g>
              ))}
            </g>

            {/* Corner decorations */}
            <g opacity="0.4">
              <path d="M 20 20 L 20 50 M 20 20 L 50 20" stroke="var(--node-border)" strokeWidth="1" fill="none" />
              <path d="M 880 20 L 880 50 M 880 20 L 850 20" stroke="var(--node-border)" strokeWidth="1" fill="none" />
              <path d="M 20 530 L 20 500 M 20 530 L 50 530" stroke="var(--node-border)" strokeWidth="1" fill="none" />
              <path d="M 880 530 L 880 500 M 880 530 L 850 530" stroke="var(--node-border)" strokeWidth="1" fill="none" />
            </g>
          </>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <>
            {/* Sync arrows */}
            <path d="M 200 200 L 200 280" className="sync-arrow bidirectional" style={{ opacity: 0.5 }} />
            <path d="M 200 380 L 200 460" className="sync-arrow bidirectional" style={{ opacity: 0.5 }} />
            <path d="M 200 560 L 200 640" className="sync-arrow bidirectional" style={{ opacity: 0.5 }} />

            {/* Mobile animated pulses */}
            {!prefersReducedMotion && isVisible && (
              <g className="data-pulses">
                <circle r="4" fill="var(--pulse-blue)" className="data-pulse pulse-animate" style={{ animationDelay: '0s', animationDuration: '2s' }}>
                  <animateMotion dur="2s" repeatCount="indefinite"><mpath href="#dt-path-1-2" /></animateMotion>
                </circle>
                <circle r="4" fill="var(--pulse-green)" className="data-pulse pulse-animate" style={{ animationDelay: '0.7s', animationDuration: '2s' }}>
                  <animateMotion dur="2s" repeatCount="indefinite" begin="0.7s"><mpath href="#dt-path-2-3" /></animateMotion>
                </circle>
                <circle r="4" fill="var(--pulse-purple)" className="data-pulse pulse-animate" style={{ animationDelay: '1.4s', animationDuration: '2s' }}>
                  <animateMotion dur="2s" repeatCount="indefinite" begin="1.4s"><mpath href="#dt-path-3-4" /></animateMotion>
                </circle>
              </g>
            )}

            {/* Layers - Mobile */}
            {layers.map((layer, i) => (
              <g key={layer.id} className="layer-group" style={{ opacity: getLayerHighlight(layer.id) }} onMouseEnter={() => setHoveredLayer(layer.id)} onMouseLeave={() => setHoveredLayer(null)}>
                <rect x="40" y={110 + i * 180} width="320" height="90" rx="14" className="layer-bg" style={{ stroke: layer.color }} />
                <circle cx="345" cy={125 + i * 180} r="3" fill={layer.color} className="status-dot" filter="url(#dtSoftGlow)" />
                <text x="200" y={150 + i * 180} className="layer-icon">{layer.icon}</text>
                <text x="200" y={178 + i * 180} className="layer-label">{layer.label}</text>
              </g>
            ))}

            {/* Engines - Mobile */}
            <g className="engines">
              {engines.map((engine, i) => (
                <g key={engine.id} className="engine-group" transform={`translate(${80 + i * 110}, 50)`}>
                  <rect x="-30" y="-18" width="60" height="36" rx="6" className="engine-bg" />
                  <text x="0" y="2" className="engine-icon" style={{ fontSize: '1rem' }}>{engine.icon}</text>
                  <text x="0" y="14" className="engine-label" style={{ fontSize: '0.55rem' }}>{engine.label}</text>
                </g>
              ))}
            </g>
          </>
        )}

        {/* Tooltips */}
        {hoveredLayer && !isMobile && (
          <g className={`tooltip-group ${hoveredLayer ? 'visible' : ''}`}>
            {hoveredLayer === 'physical' && (
              <g transform="translate(450, 420)"><rect x="-150" y="-16" width="300" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{layers[0].description}</text></g>
            )}
            {hoveredLayer === 'data' && (
              <g transform="translate(450, 305)"><rect x="-150" y="-16" width="300" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{layers[1].description}</text></g>
            )}
            {hoveredLayer === 'twin' && (
              <g transform="translate(450, 185)"><rect x="-140" y="-16" width="280" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{layers[2].description}</text></g>
            )}
            {hoveredLayer === 'simulation' && (
              <g transform="translate(450, 65)"><rect x="-140" y="-16" width="280" height="32" rx="8" className="tooltip-bg" /><text y="0" className="tooltip-text">{layers[3].description}</text></g>
            )}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="dt-legend">
        <span className="legend-item">
          <span className="legend-dot blue"></span>
          Physical
        </span>
        <span className="legend-item">
          <span className="legend-dot green"></span>
          Data
        </span>
        <span className="legend-item">
          <span className="legend-dot purple"></span>
          Twin
        </span>
        <span className="legend-item">
          <span className="legend-dot amber"></span>
          Simulation
        </span>
      </div>
    </div>
  );
}
