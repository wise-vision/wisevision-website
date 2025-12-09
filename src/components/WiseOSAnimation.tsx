import React, { useEffect, useState, useRef } from 'react';

interface DataPulse {
  id: string;
  pathId: string;
  delay: number;
  duration: number;
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

const pulses: DataPulse[] = [
  { id: 'pulse-robots-1', pathId: 'path-robots', delay: 0, duration: 3, color: 'var(--pulse-blue)' },
  { id: 'pulse-robots-2', pathId: 'path-robots', delay: 1.5, duration: 3, color: 'var(--pulse-blue)' },
  { id: 'pulse-sensors-1', pathId: 'path-sensors', delay: 0.5, duration: 3.2, color: 'var(--pulse-green)' },
  { id: 'pulse-sensors-2', pathId: 'path-sensors', delay: 2, duration: 3.2, color: 'var(--pulse-green)' },
  { id: 'pulse-twins-1', pathId: 'path-twins', delay: 0.3, duration: 2.8, color: 'var(--pulse-purple)' },
  { id: 'pulse-twins-2', pathId: 'path-twins', delay: 1.8, duration: 2.8, color: 'var(--pulse-purple)' },
  { id: 'pulse-agents-1', pathId: 'path-agents', delay: 0.6, duration: 2.6, color: 'var(--pulse-cyan)' },
  { id: 'pulse-agents-2', pathId: 'path-agents', delay: 1.9, duration: 2.6, color: 'var(--pulse-cyan)' },
  { id: 'pulse-blackbox-1', pathId: 'path-blackbox', delay: 0.8, duration: 2.5, color: 'var(--pulse-orange)' },
  { id: 'pulse-blackbox-2', pathId: 'path-blackbox', delay: 2.2, duration: 2.5, color: 'var(--pulse-orange)' },
];

export default function WiseOSAnimation(): JSX.Element {
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Check for mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const getClusterHighlight = (clusterId: string) => {
    if (!hoveredCluster) return 1;
    if (hoveredCluster === clusterId || hoveredCluster === 'wiseos') return 1;
    return 0.3;
  };

  const getPathHighlight = (pathId: string) => {
    if (!hoveredCluster) return 1;
    if (hoveredCluster === 'wiseos') return 1;
    if (pathId.includes(hoveredCluster)) return 1;
    return 0.2;
  };

  return (
    <div 
      ref={containerRef}
      className="wiseos-animation-container"
      role="img"
      aria-label="WiseOS architecture diagram showing data flow between robots, sensors, digital twins and the data black box through the WiseOS platform"
    >
      <style>{`
        .wiseos-animation-container {
          --pulse-blue: #00d4ff;
          --pulse-green: #00ff88;
          --pulse-purple: #a855f7;
          --pulse-orange: #ff8800;
          --pulse-cyan: #06b6d4;
          --node-bg: rgba(20, 20, 30, 0.9);
          --node-border: rgba(0, 212, 255, 0.5);
          --path-color: rgba(0, 212, 255, 0.3);
          --text-color: rgba(255, 255, 255, 0.9);
          --glow-color: rgba(0, 212, 255, 0.4);
          
          position: relative;
          width: 100%;
          max-width: 900px;
          margin: 2rem auto;
          padding: 1rem;
          min-height: 550px;
          overflow: visible;
        }

        @media (max-width: 767px) {
          .wiseos-animation-container {
            min-height: 800px;
          }
        }

        .wiseos-svg {
          width: 100%;
          height: 100%;
          min-height: inherit;
        }

        /* Glow filters */
        .glow-filter {
          filter: url(#glow);
        }

        /* Node styles */
        .node-group {
          cursor: pointer;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .node-group:hover {
          transform: scale(1.02);
        }

        .node-bg {
          fill: var(--node-bg);
          stroke: var(--node-border);
          stroke-width: 2;
          transition: all 0.3s ease;
        }

        .node-group:hover .node-bg {
          stroke: var(--pulse-blue);
          stroke-width: 3;
          filter: drop-shadow(0 0 20px var(--glow-color));
        }

        .wiseos-node .node-bg {
          fill: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(168, 85, 247, 0.2));
          stroke: var(--pulse-blue);
          stroke-width: 3;
        }

        .wiseos-node:hover .node-bg {
          stroke-width: 4;
          filter: drop-shadow(0 0 30px var(--glow-color));
        }

        .node-icon {
          font-size: 2rem;
          text-anchor: middle;
          dominant-baseline: central;
        }

        .node-label {
          fill: var(--text-color);
          font-size: 0.85rem;
          font-weight: 600;
          text-anchor: middle;
        }

        .node-sublabel {
          fill: rgba(255, 255, 255, 0.6);
          font-size: 0.7rem;
          text-anchor: middle;
        }

        .wiseos-label {
          fill: var(--pulse-blue);
          font-size: 1.4rem;
          font-weight: 700;
          text-anchor: middle;
          letter-spacing: 0.05em;
        }

        .wiseos-sublabel {
          fill: rgba(255, 255, 255, 0.7);
          font-size: 0.75rem;
          text-anchor: middle;
        }

        /* Path styles */
        .data-path {
          fill: none;
          stroke: var(--path-color);
          stroke-width: 2;
          stroke-linecap: round;
          transition: opacity 0.3s ease, stroke 0.3s ease;
        }

        .data-path.highlighted {
          stroke: var(--pulse-blue);
          stroke-width: 3;
        }

        /* Data pulse animation */
        .data-pulse {
          r: 6;
          filter: url(#pulseGlow);
        }

        @keyframes pulseFade {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
        }

        .pulse-animate {
          animation-name: pulseFade;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        /* Tooltip */
        .tooltip-group {
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .tooltip-group.visible {
          opacity: 1;
        }

        .tooltip-bg {
          fill: rgba(0, 0, 0, 0.9);
          stroke: var(--pulse-blue);
          stroke-width: 1;
          rx: 8;
        }

        .tooltip-text {
          fill: white;
          font-size: 0.75rem;
          text-anchor: middle;
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .data-pulse,
          .pulse-animate {
            animation: none !important;
            opacity: 0 !important;
          }
          
          .node-group:hover {
            transform: none;
          }
        }

        /* Hexagon pattern background */
        .hex-pattern {
          opacity: 0.05;
        }

        /* Central glow effect */
        .central-glow {
          animation: centralPulse 4s ease-in-out infinite;
        }

        @keyframes centralPulse {
          0%, 100% { opacity: 0.3; r: 80; }
          50% { opacity: 0.5; r: 100; }
        }

        /* Connection line decorations */
        .connection-dot {
          fill: var(--pulse-blue);
          opacity: 0.6;
        }

        /* Ring around WiseOS */
        .orbit-ring {
          fill: none;
          stroke: var(--path-color);
          stroke-width: 1;
          stroke-dasharray: 4 4;
          animation: orbitSpin 60s linear infinite;
        }

        @keyframes orbitSpin {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -100; }
        }

        @media (prefers-reduced-motion: reduce) {
          .orbit-ring,
          .central-glow {
            animation: none;
          }
          .central-glow {
            opacity: 0.3;
          }
        }
        .wiseos-legend {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 1rem;
        font-size: 0.75rem;
        opacity: 0.7;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .legend-dot.blue { background: var(--pulse-blue); }
      .legend-dot.green { background: var(--pulse-green); }
      .legend-dot.purple { background: var(--pulse-purple); }
      .legend-dot.cyan { background: var(--pulse-cyan); }
      .legend-dot.orange { background: var(--pulse-orange); }
    `}</style>

      <svg 
        className="wiseos-svg" 
        viewBox={isMobile ? "0 0 400 800" : "0 0 900 550"}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filter for nodes */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow filter for pulses */}
          <filter id="pulseGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for WiseOS node */}
          <radialGradient id="wiseosGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0.1)" />
          </radialGradient>

          {/* Gradient for central glow */}
          <radialGradient id="centralGlowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.4)" />
            <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
          </radialGradient>

          {/* Hex pattern */}
          <pattern id="hexPattern" width="50" height="43.4" patternUnits="userSpaceOnUse">
            <polygon 
              points="25,0 50,14.4 50,43.4 25,57.7 0,43.4 0,14.4" 
              fill="none" 
              stroke="rgba(0, 212, 255, 0.3)" 
              strokeWidth="0.5"
              transform="translate(0, -7)"
            />
          </pattern>

          {/* Path definitions - Desktop */}
          {!isMobile && (
            <>
              <path id="path-robots" d="M 180 380 Q 300 340 400 275" />
              <path id="path-sensors" d="M 720 380 Q 600 340 500 275" />
              <path id="path-twins" d="M 300 90 Q 350 150 400 220" />
              <path id="path-agents" d="M 600 90 Q 550 150 500 220" />
              <path id="path-blackbox" d="M 450 340 L 450 430" />
            </>
          )}

          {/* Path definitions - Mobile */}
          {isMobile && (
            <>
              <path id="path-robots" d="M 200 540 L 200 420" />
              <path id="path-sensors" d="M 200 630 L 200 540" />
              <path id="path-twins" d="M 200 120 L 200 200" />
              <path id="path-agents" d="M 200 200 L 200 280" />
              <path id="path-blackbox" d="M 200 420 L 200 720" />
            </>
          )}
        </defs>

        {/* Background pattern */}
        <rect width="100%" height="100%" fill="url(#hexPattern)" className="hex-pattern" />

        {/* Desktop Layout */}
        {!isMobile && (
          <>
            {/* Central glow effect */}
            <circle 
              cx="450" 
              cy="275" 
              r={prefersReducedMotion ? 80 : 90}
              className="central-glow"
              fill="url(#centralGlowGradient)"
            />

            {/* Orbit ring around WiseOS */}
            <circle 
              cx="450" 
              cy="275" 
              r="130" 
              className="orbit-ring"
            />

            {/* Data paths */}
            <path 
              d="M 180 380 Q 300 340 400 275" 
              className="data-path"
              style={{ opacity: getPathHighlight('robots') }}
            />
            <path 
              d="M 720 380 Q 600 340 500 275" 
              className="data-path"
              style={{ opacity: getPathHighlight('sensors') }}
            />
            <path 
              d="M 300 90 Q 350 150 400 220" 
              className="data-path"
              style={{ opacity: getPathHighlight('twins') }}
            />
            <path 
              d="M 600 90 Q 550 150 500 220" 
              className="data-path"
              style={{ opacity: getPathHighlight('agents') }}
            />
            <path 
              d="M 450 340 L 450 430" 
              className="data-path"
              style={{ opacity: getPathHighlight('blackbox') }}
            />

            {/* Animated data pulses */}
            {!prefersReducedMotion && pulses.map((pulse) => (
              <circle
                key={pulse.id}
                className="data-pulse pulse-animate"
                fill={pulse.color}
                style={{
                  animationDelay: `${pulse.delay}s`,
                  animationDuration: `${pulse.duration}s`,
                }}
              >
                <animateMotion
                  dur={`${pulse.duration}s`}
                  repeatCount="indefinite"
                  begin={`${pulse.delay}s`}
                >
                  <mpath href={`#${pulse.pathId}`} />
                </animateMotion>
              </circle>
            ))}

            {/* WiseOS Central Node */}
            <g 
              className="node-group wiseos-node"
              onMouseEnter={() => setHoveredCluster('wiseos')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect 
                x="370" 
                y="220" 
                width="160" 
                height="110" 
                rx="16"
                className="node-bg"
                fill="url(#wiseosGradient)"
              />
              <text x="450" y="260" className="wiseos-label">WiseOS</text>
              <text x="450" y="285" className="wiseos-sublabel">Operating System for</text>
              <text x="450" y="303" className="wiseos-sublabel">Robotics & IoT</text>
            </g>

            {/* Robots & Drones Node - Bottom Left */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('robots') }}
              onMouseEnter={() => setHoveredCluster('robots')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="80" y="350" width="200" height="90" rx="12" className="node-bg" />
              <text x="180" y="385" className="node-icon">🤖</text>
              <text x="180" y="415" className="node-label">Robots & Drones</text>
              <text x="180" y="432" className="node-sublabel">ROS 2 nodes, AMRs, UAVs</text>
            </g>

            {/* IoT & Sensors Node - Bottom Right */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('sensors') }}
              onMouseEnter={() => setHoveredCluster('sensors')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="620" y="350" width="200" height="90" rx="12" className="node-bg" />
              <text x="720" y="385" className="node-icon">📡</text>
              <text x="720" y="415" className="node-label">IoT & Sensors</text>
              <text x="720" y="432" className="node-sublabel">WiFi, 5G, Satellite, LoRaWAN</text>
            </g>

            {/* Digital Twins Node - Top Left */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('twins') }}
              onMouseEnter={() => setHoveredCluster('twins')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="100" y="30" width="200" height="90" rx="12" className="node-bg" />
              <text x="200" y="65" className="node-icon">🔬</text>
              <text x="200" y="93" className="node-label">Digital Twins</text>
              <text x="200" y="110" className="node-sublabel">O3DE, Isaac Sim, Genesis</text>
            </g>

            {/* AI Agents Node - Top Right */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('agents') }}
              onMouseEnter={() => setHoveredCluster('agents')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="600" y="30" width="200" height="90" rx="12" className="node-bg" />
              <text x="700" y="65" className="node-icon">🧠</text>
              <text x="700" y="93" className="node-label">AI Agents</text>
              <text x="700" y="110" className="node-sublabel">LLM tools, autonomous tasks</text>
            </g>

            {/* Data Black Box Node - Bottom Center */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('blackbox') }}
              onMouseEnter={() => setHoveredCluster('blackbox')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="350" y="430" width="200" height="80" rx="12" className="node-bg" />
              <text x="450" y="462" className="node-icon">📊</text>
              <text x="450" y="488" className="node-label">Data Black Box</text>
              <text x="450" y="503" className="node-sublabel">InfluxDB telemetry</text>
            </g>

            {/* Direction indicators */}
            <g className="direction-indicators" opacity="0.6">
              {/* Arrow from robots to WiseOS */}
              <polygon points="395,278 385,273 385,283" fill="var(--pulse-blue)" />
              {/* Arrow from sensors to WiseOS */}
              <polygon points="505,278 515,273 515,283" fill="var(--pulse-green)" />
              {/* Arrow from twins to WiseOS */}
              <polygon points="398,225 393,215 403,215" fill="var(--pulse-purple)" />
              {/* Arrow from agents to WiseOS */}
              <polygon points="502,225 507,215 497,215" fill="var(--pulse-cyan)" />
              {/* Arrow from WiseOS to blackbox */}
              <polygon points="450,425 445,415 455,415" fill="var(--pulse-orange)" />
            </g>
          </>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <>
            {/* Central glow effect */}
            <circle 
              cx="200" 
              cy="340" 
              r={prefersReducedMotion ? 60 : 70}
              className="central-glow"
              fill="url(#centralGlowGradient)"
            />

            {/* Data paths */}
            <path 
              d="M 200 120 L 200 220" 
              className="data-path"
              style={{ opacity: getPathHighlight('twins') }}
            />
            <path 
              d="M 200 220 L 200 280" 
              className="data-path"
              style={{ opacity: getPathHighlight('agents') }}
            />
            <path 
              d="M 200 460 L 200 540" 
              className="data-path"
              style={{ opacity: getPathHighlight('robots') }}
            />
            <path 
              d="M 200 620 L 200 700" 
              className="data-path"
              style={{ opacity: getPathHighlight('sensors') }}
            />
            <path 
              d="M 200 460 L 200 760" 
              className="data-path"
              style={{ opacity: getPathHighlight('blackbox') }}
            />

            {/* Digital Twins Node - Top */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('twins') }}
              onMouseEnter={() => setHoveredCluster('twins')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="50" y="30" width="300" height="80" rx="12" className="node-bg" />
              <text x="200" y="62" className="node-icon">🔬</text>
              <text x="200" y="90" className="node-label">Digital Twins</text>
            </g>

            {/* AI Agents Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('agents') }}
              onMouseEnter={() => setHoveredCluster('agents')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="50" y="130" width="300" height="80" rx="12" className="node-bg" />
              <text x="200" y="162" className="node-icon">🧠</text>
              <text x="200" y="190" className="node-label">AI Agents</text>
            </g>

            {/* WiseOS Central Node */}
            <g 
              className="node-group wiseos-node"
              onMouseEnter={() => setHoveredCluster('wiseos')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect 
                x="50" 
                y="280" 
                width="300" 
                height="110" 
                rx="16"
                className="node-bg"
                fill="url(#wiseosGradient)"
              />
              <text x="200" y="325" className="wiseos-label">WiseOS</text>
              <text x="200" y="355" className="wiseos-sublabel">Operating System for Robotics & IoT</text>
            </g>

            {/* Robots & Drones Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('robots') }}
              onMouseEnter={() => setHoveredCluster('robots')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="50" y="460" width="300" height="70" rx="12" className="node-bg" />
              <text x="200" y="490" className="node-icon">🤖</text>
              <text x="200" y="518" className="node-label">Robots & Drones</text>
            </g>

            {/* IoT & Sensors Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('sensors') }}
              onMouseEnter={() => setHoveredCluster('sensors')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="50" y="550" width="300" height="70" rx="12" className="node-bg" />
              <text x="200" y="580" className="node-icon">📡</text>
              <text x="200" y="608" className="node-label">IoT & Sensors</text>
            </g>

            {/* Data Black Box Node */}
            <g 
              className="node-group"
              style={{ opacity: getClusterHighlight('blackbox') }}
              onMouseEnter={() => setHoveredCluster('blackbox')}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <rect x="50" y="690" width="300" height="70" rx="12" className="node-bg" />
              <text x="200" y="720" className="node-icon">📊</text>
              <text x="200" y="748" className="node-label">Data Black Box (InfluxDB)</text>
            </g>
          </>
        )}

        {/* Tooltip */}
        {hoveredCluster && hoveredCluster !== 'wiseos' && (
          <g 
            className={`tooltip-group ${hoveredCluster ? 'visible' : ''}`}
            transform={
              isMobile 
                ? "translate(200, 250)"
                : hoveredCluster === 'robots' ? "translate(180, 300)"
                : hoveredCluster === 'sensors' ? "translate(720, 300)"
                : hoveredCluster === 'twins' ? "translate(200, 145)"
                : hoveredCluster === 'agents' ? "translate(700, 145)"
                : "translate(450, 395)"
            }
          >
            <rect 
              x="-140" 
              y="-20" 
              width="280" 
              height="40" 
              className="tooltip-bg"
            />
            <text y="5" className="tooltip-text">
              {clusters.find(c => c.id === hoveredCluster)?.description}
            </text>
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
