'use client';

import { useState, useEffect } from 'react';
import styles from './StreakMap.module.css';

interface StreakMapProps {
  activityLog: Record<string, number>;
  loading?: boolean;
}

export function StreakMap({ activityLog, loading }: StreakMapProps) {
  const [days, setDays] = useState<{ date: string; count: number; level: number; dayOfWeek: number; label: string }[]>([]);

  useEffect(() => {
    // Generate standard contribution graph (weeks x 7 days)
    // We want to fit exactly into the grid without overflow
    const weeksToShow = 18; // Fits nicely in ~300px width
    const totalDays = weeksToShow * 7;
    
    const today = new Date();
    // Align to the end of the current week (Saturday) to keep columns consistent
    // or align so today is the last dot. 
    // Usually contribution graphs align columns by week starting Sunday.
    
    // Find the Sunday of the week roughly 'totalDays' ago to start cleanly
    const endDate = new Date(today);
    const dayOfWeek = endDate.getDay(); // 0 (Sun) to 6 (Sat)
    
    // We want the grid to end exactly at the end of this week or today?
    // Let's generate 'totalDays' ending on the coming Saturday to complete the grid columns
    // But we only render up to today? 
    // Simpler: Generate fixed 18 weeks ending with the current week.
    
    // Find start date: Today minus (weeks * 7) days, then align to Sunday
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (totalDays - 1));
    // Align start to previous Sunday to make columns neat
    // If startDate is Wed, go back to Sun.
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const result = [];
    
    // Generate exactly (weeksToShow * 7) dots
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const count = activityLog[dateStr] || 0;
      
      // Don't show future days in the grid (optional, but looks cleaner if we just grey them out or hide?)
      // Standard is to show empty squares for future days in the current week row
      const isFuture = date > today;
      
      result.push({
        date: dateStr,
        count: isFuture ? 0 : count,
        level: isFuture ? -1 : (count === 0 ? 0 : count < 2 ? 1 : count < 5 ? 2 : 3),
        dayOfWeek: date.getDay(),
        label: `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${count} sessions`
      });
    }
    setDays(result);
  }, [activityLog]);

  if (loading) {
    return <div className={styles.loading}>Loading streak map...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.mapGrid}>
        {days.map((day) => (
          <div
            key={day.date}
            className={`${styles.square} ${styles[`level${day.level}`]}`}
            title={day.label}
          />
        ))}
      </div>
    </div>
  );
}
