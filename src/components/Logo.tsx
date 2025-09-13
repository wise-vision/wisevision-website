import React from 'react';

interface LogoProps {
  variant?: 'horizontal' | 'vertical';
  theme?: 'light' | 'dark' | 'color';
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ 
  variant = 'horizontal', 
  theme = 'light',
  className = '',
  width,
  height 
}: LogoProps) {
  // Determine the appropriate logo file based on variant and theme
  const getLogoSrc = () => {
    if (theme === 'color') {
      return variant === 'horizontal' 
        ? '/img/logo-color.svg' 
        : '/img/logo-color.svg';
    }
    
    if (theme === 'light') {
      return variant === 'horizontal'
        ? '/img/logo.svg'  // white on dark
        : '/img/logo.svg';
    }
    
    // dark theme
    return '/img/logo.svg';
  };

  const logoStyle = {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
  };

  return (
    <img 
      src={getLogoSrc()}
      alt="WiseVision"
      className={`logo ${className}`}
      style={logoStyle}
    />
  );
}
