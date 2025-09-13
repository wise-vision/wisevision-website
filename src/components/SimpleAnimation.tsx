import React from 'react';

interface SimpleAnimationProps {
  className?: string;
}

export default function SimpleAnimation({ className = '' }: SimpleAnimationProps) {
  return (
    <div className={`${className}`} style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%', 
      height: '100%',
      background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 255, 136, 0.1) 100%)',
      overflow: 'hidden'
    }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 400"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
        aria-label="AI to Robotics Flow Visualization"
      >
        {/* Animated Neural Network */}
        <g>
          <circle cx="100" cy="100" r="4" fill="var(--neon-blue)" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="120" cy="130" r="3" fill="var(--neon-blue)" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="140" cy="160" r="4" fill="var(--neon-blue)" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="80" cy="180" r="3" fill="var(--neon-blue)" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="110" cy="200" r="4" fill="var(--neon-blue)" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2.2s" repeatCount="indefinite" />
          </circle>
          
          {/* Neural connections */}
          <line x1="100" y1="100" x2="120" y2="130" stroke="var(--neon-blue)" strokeWidth="1" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
          </line>
          <line x1="120" y1="130" x2="140" y2="160" stroke="var(--neon-blue)" strokeWidth="1" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" />
          </line>
          <line x1="100" y1="100" x2="80" y2="180" stroke="var(--neon-blue)" strokeWidth="1" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.8s" repeatCount="indefinite" />
          </line>
          <line x1="140" y1="160" x2="110" y2="200" stroke="var(--neon-blue)" strokeWidth="1" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
          </line>
        </g>

        {/* Animated MCP Hub */}
        <g transform="translate(400, 200)">
          <circle r="30" fill="none" stroke="var(--neon-green)" strokeWidth="2" opacity="0.8">
            <animate attributeName="r" values="30;35;30" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle r="20" fill="none" stroke="var(--neon-green)" strokeWidth="1" opacity="0.6">
            <animate attributeName="r" values="20;25;20" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="15" fill="var(--neon-green)" opacity="0.3">
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          
          {/* Central "eye" */}
          <circle r="5" fill="var(--neon-green)" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
          </circle>
          
          <text x="0" y="50" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontFamily="monospace" opacity="0.7">
            MCP ROS2
          </text>
        </g>

        {/* Animated Robot Icons */}
        <g transform="translate(650, 120)">
          <rect x="-10" y="-8" width="20" height="16" fill="var(--neon-orange)" opacity="0.7" rx="2">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite" />
          </rect>
          <text x="0" y="30" textAnchor="middle" fill="var(--text-muted)" fontSize="12">Drone</text>
        </g>
        
        <g transform="translate(680, 200)">
          <circle r="10" fill="var(--neon-orange)" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <text x="0" y="30" textAnchor="middle" fill="var(--text-muted)" fontSize="12">Rover</text>
        </g>
        
        <g transform="translate(720, 280)">
          <rect x="-8" y="-12" width="16" height="24" fill="var(--neon-orange)" opacity="0.7" rx="2">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2.2s" repeatCount="indefinite" />
          </rect>
          <text x="0" y="30" textAnchor="middle" fill="var(--text-muted)" fontSize="12">Robotic Arm</text>
        </g>

        {/* Animated Flow Lines */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
            refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--neon-blue)" opacity="0.8" />
          </marker>
          <marker id="arrowhead-green" markerWidth="10" markerHeight="7" 
            refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--neon-green)" opacity="0.8" />
          </marker>
        </defs>
        
        {/* AI to MCP flow */}
        <line x1="180" y1="150" x2="320" y2="180" stroke="var(--neon-blue)" strokeWidth="3" 
              opacity="0.6" markerEnd="url(#arrowhead)">
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="3;5;3" dur="2s" repeatCount="indefinite" />
        </line>
        
        {/* MCP to Robotics flow */}
        <line x1="480" y1="200" x2="600" y2="200" stroke="var(--neon-green)" strokeWidth="3" 
              opacity="0.6" markerEnd="url(#arrowhead-green)">
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-width" values="3;5;3" dur="2.5s" repeatCount="indefinite" />
        </line>

        {/* Data particles */}
        <circle r="2" fill="var(--neon-blue)" opacity="0.8">
          <animateMotion dur="4s" repeatCount="indefinite">
            <path d="M 180,150 Q 250,120 320,180" />
          </animateMotion>
          <animate attributeName="opacity" values="0;0.8;0" dur="4s" repeatCount="indefinite" />
        </circle>
        
        <circle r="2" fill="var(--neon-green)" opacity="0.8">
          <animateMotion dur="3s" repeatCount="indefinite">
            <path d="M 480,200 Q 540,180 600,200" />
          </animateMotion>
          <animate attributeName="opacity" values="0;0.8;0" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
      
      {/* Overlay text */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        zIndex: 10
      }}>
        <p className="body-sm text-muted" style={{ 
          background: 'rgba(15, 20, 25, 0.8)', 
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-md)',
          backdropFilter: 'blur(10px)'
        }}>
          AI → MCP ROS2 → Robotics Integration
        </p>
      </div>
    </div>
  );
}
