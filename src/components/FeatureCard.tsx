import React from 'react';

interface FeatureCardProps {
  icon?: string;
  title: string;
  description: string;
  highlight?: boolean;
}

export default function FeatureCard({ icon, title, description, highlight }: FeatureCardProps) {
  return (
    <div className={`card ${highlight ? 'card--highlight' : ''}`}>
      {icon && (
        <div className="feature-icon" style={{ textAlign: 'center' }}>
          {icon}
        </div>
      )}
      <h3 style={{ 
        marginBottom: '1rem',
        color: 'var(--ifm-heading-color)',
        fontSize: '1.25rem'
      }}>
        {title}
      </h3>
      <p style={{ 
        color: 'var(--ifm-color-content-secondary)',
        lineHeight: '1.6',
        marginBottom: '0'
      }}>
        {description}
      </p>
    </div>
  );
}
