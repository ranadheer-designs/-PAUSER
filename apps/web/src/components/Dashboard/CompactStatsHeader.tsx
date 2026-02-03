'use client';

import styles from './CompactStatsHeader.module.css';

interface CompactStatsHeaderProps {
  streak: number;
  checkpointsCompleted: number;
  checkpointsGoal: number;
  loading: boolean;
  onOpenStats?: () => void;
}

export function CompactStatsHeader({
  streak,
  checkpointsCompleted,
  checkpointsGoal,
  loading,
  onOpenStats
}: CompactStatsHeaderProps) {
  
  const progressPercent = Math.min(100, Math.round((checkpointsCompleted / checkpointsGoal) * 100));

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.container} onClick={onOpenStats}>
      {/* Streak Card */}
      <div className={`${styles.statsCard} ${styles.streakCard}`}>
        <div className={styles.iconWrapperFlame}>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
             <path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13.08 3.23 12.17 3.75 11.46 4.32C8.96 6.4 7.92 10.07 9.12 13.22C9.23 13.5 9.47 13.88 9.26 14.21C9.08 14.5 8.59 14.37 8.35 14.22C7.26 13.53 6.7 11.96 7.32 10.96C6.33 11.37 5.46 12.41 5.11 13.53C4.04 16.96 6.01 21 9.61 21C13.59 21 17.06 17.92 17.66 14.16C17.85 13 18 11.72 17.66 11.2ZM12.17 17.56C11.33 17.77 10.87 17.13 11 16.4C11.5 13.69 14.5 12.67 15.09 10.08C15.82 12.06 15.19 14.23 14.21 15.87C13.84 16.47 13.04 17.34 12.17 17.56Z" />
           </svg>
        </div>
        <div>
          <div className={styles.statsValue}>{streak}</div>
          <div className={styles.statsLabel}>Day Streak</div>
        </div>
      </div>

      {/* Checkpoints Card */}
      <div className={`${styles.statsCard} ${styles.checkpointsCard}`}>
        <div className={styles.iconWrapperCheck}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <div className={styles.statsValue}>
             {checkpointsCompleted}
             <span className={styles.statsGoal}>/{checkpointsGoal}</span>
          </div>
          <div className={styles.statsLabel}>Checkpoints</div>
        </div>
        
        {/* Subtle background progress bar */}
        <div className={styles.cardProgress} style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

