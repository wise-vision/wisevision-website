import React from 'react';
import LiquidGlassHero from './LiquidGlassHero';

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
    <LiquidGlassHero
      title={title}
      subtitle={subtitle}
      primaryCTA={primaryCTA}
      secondaryCTA={secondaryCTA}
      withAnimation={withAnimation}
    />
  );
}
