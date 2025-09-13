import React from 'react';

interface SectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  centered?: boolean;
  background?: 'primary' | 'secondary' | 'dark' | 'gradient' | 'transparent';
}

export default function Section({ 
  id,
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
    centered && 'text-center',
    className
  ].filter(Boolean).join(' ');

  const childrenString = typeof children === 'string' ? children : '';
  const hasContainer = childrenString.includes('container');

  return (
    <section id={id} className={sectionClasses}>
      {!hasContainer ? (
        <div className="container">
          {(title || subtitle) && (
            <div className={centered ? 'text-center mb-2xl' : 'mb-2xl'}>
              {title && (
                <h2 className="display-md mb-lg">{title}</h2>
              )}
              {subtitle && (
                <p className="body-xl">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </div>
      ) : (
        <>
          {(title || subtitle) && (
            <div className="container">
              <div className={centered ? 'text-center mb-2xl' : 'mb-2xl'}>
                {title && (
                  <h2 className="display-md mb-lg">{title}</h2>
                )}
                {subtitle && (
                  <p className="body-xl">{subtitle}</p>
                )}
              </div>
            </div>
          )}
          {children}
        </>
      )}
    </section>
  );
}
