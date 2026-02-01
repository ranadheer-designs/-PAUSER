import { useEffect, useState } from 'react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  label: string;
  value: number;
  goal?: number;
  subtext?: string;
  loading?: boolean;
  accent?: 'primary' | 'success' | 'highlight';
}

export function StatsCard({ label, value, goal, subtext, loading, accent }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Animate value on change
  useEffect(() => {
    if (loading) return;
    const duration = 800;
    const start = displayValue;
    const end = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      
      const current = Math.floor(start + (end - start) * easedProgress);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, loading]);

  if (loading) {
    return (
      <div className={`${styles.card} ${styles.loading}`}>
        <div className={styles.skeletonLabel}></div>
        <div className={styles.skeletonValue}></div>
      </div>
    );
  }

  const accentClass = accent ? styles[`accent${accent.charAt(0).toUpperCase() + accent.slice(1)}`] : '';
  const progress = goal ? Math.min((value / goal) * 100, 100) : 0;
  
  // SVG Progress Ring calculations
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`${styles.card} ${accentClass}`}>
      <div className={styles.content}>
        <div className={styles.info}>
          <h3 className={styles.label}>{label}</h3>
          <div className={styles.value}>{displayValue}</div>
          {subtext && <div className={styles.subtext}>{subtext}</div>}
        </div>
        
        {goal && (
          <div className={styles.progressWrapper}>
             <svg className={styles.progressRing} width="80" height="80">
              <circle
                className={styles.progressRingBg}
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                r={radius}
                cx="40"
                cy="40"
              />
              <circle
                className={styles.progressRingIndicator}
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={circumference}
                style={{ strokeDashoffset: offset }}
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx="40"
                cy="40"
              />
            </svg>
            <div className={styles.progressPercent}>
              {Math.round(progress)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

