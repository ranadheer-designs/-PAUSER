import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  hideText?: boolean;
}

export function Logo({ className = '', size = 'medium', hideText = false }: LogoProps) {
  const sizeClass = styles[size];
  
  return (
    <div className={`${styles.logo} ${className} ${sizeClass}`}>
      <svg className={styles.logoIcon} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="46" height="30" rx="10" stroke="currentColor" strokeWidth="2.5"/>
        <rect x="18" y="10" width="3" height="12" rx="1" fill="currentColor"/>
        <rect x="27" y="10" width="3" height="12" rx="1" fill="currentColor"/>
      </svg>
      {!hideText && (
        <span className={styles.logoText}>
          PAUSE<span className={styles.logoTextAccent}>R</span>
        </span>
      )}
    </div>
  );
}
