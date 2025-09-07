import React from 'react';

interface SectionProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  centered?: boolean;
  background?: 'primary' | 'secondary' | 'transparent';
}

export default function Section({ 
  title, 
  subtitle, 
  className = '', 
  children, 
  centered = false,
  background = 'transparent'
}: SectionProps) {
  const sectionClasses = [
    'section',
    background !== 'transparent' && `section--${background}`,
    centered && 'section--centered',
    className
  ].filter(Boolean).join(' ');

  return (
    <section className={sectionClasses}>
      <div className="container">
        {(title || subtitle) && (
          <div className="section__header">
            {title && (
              <h2 className="headline section__title">{title}</h2>
            )}
            {subtitle && (
              <p className="body-large section__subtitle">{subtitle}</p>
            )}
          </div>
        )}
        <div className="section__content">
          {children}
        </div>
      </div>
    </section>
  );
}
