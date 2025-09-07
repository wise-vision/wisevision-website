import React from 'react';
import ThreeAnimation from './ThreeAnimation';

interface HeroProps {
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

export default function Hero({ 
  title, 
  subtitle, 
  primaryCTA, 
  secondaryCTA, 
  withAnimation = false 
}: HeroProps) {
  return (
    <section className="hero">
      {withAnimation && <ThreeAnimation />}
      
      <div className="hero__content">
        <h1 className="display-large hero__headline">
          {title}
        </h1>
        
        <p className="body-large hero__subheadline">
          {subtitle}
        </p>
        
        <div className="hero__actions">
          {primaryCTA && (
            <a 
              href={primaryCTA.href} 
              className="btn btn--primary btn--large"
            >
              {primaryCTA.text}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
              className="btn btn--secondary btn--large"
            >
              {secondaryCTA.text}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
