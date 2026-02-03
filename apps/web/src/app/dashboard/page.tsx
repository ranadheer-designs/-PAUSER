'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { CompactStatsHeader } from '@/components/Dashboard/CompactStatsHeader';
import { NotesSection } from '@/components/Dashboard/NotesSection';
import { VideosSection } from '@/components/Dashboard/VideosSection';
import { ArtifactsSection } from '@/components/Dashboard/ArtifactsSection';
import { FlashcardsSection } from '@/components/Dashboard/FlashcardsSection';
import { AutoSync } from '@/components/Dashboard/AutoSync';
import { StreakMap } from '@/components/Dashboard/StreakMap';
import { Sidebar } from '@/components/Navigation/Sidebar';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { Logo } from '@/components/Common/Logo';
import styles from './page.module.css';

type Tab = 'videos' | 'notes' | 'artifacts' | 'flashcards';

export default function DashboardPage() {
  const { streak, checkpointsCompletedToday, activityLog, loading } = useAnalytics();
  const [activeTab, setActiveTab] = useState<Tab>('videos');

  return (
    <ProtectedRoute>
    <div className={styles.layout}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className={styles.container}>
        {/* Mobile Header with Pauser branding */}
        <div className={styles.mobileHeader}>
          <Logo size="small" />
        </div>

        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Your Progress</h1>
            <p className={styles.subtitle}>Consistency over intensity.</p>
          </div>
        </header>

        {/* Compact Header for Mobile (Sticky) */}
        <div className={styles.mobileStatsWrapper}>
          <CompactStatsHeader 
            streak={streak}
            checkpointsCompleted={checkpointsCompletedToday}
            checkpointsGoal={10}
            loading={loading}
          />
        </div>
        
        {/* Auto-sync notes in background */}
        <AutoSync />

        <div className={styles.statsGrid}>
          <StatsCard 
            label="Current Streak" 
            value={streak} 
            goal={7}
            subtext="days in a row"
            loading={loading}
            accent="primary"
          />
          <StatsCard 
            label="Checkpoints" 
            value={checkpointsCompletedToday} 
            goal={10}
            subtext="completed today"
            loading={loading}
            accent="success"
          />
          <StreakMap activityLog={activityLog} loading={loading} />
        </div>

        {/* Mobile Tab Bar - visible only on mobile when sidebar is hidden */}
        <div className={styles.mobileTabBar}>
          <button
            className={`${styles.mobileTab} ${activeTab === 'videos' ? styles.mobileTabActive : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Videos</span>
          </button>
          <button
            className={`${styles.mobileTab} ${activeTab === 'notes' ? styles.mobileTabActive : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Notes</span>
          </button>
          <button
            className={`${styles.mobileTab} ${activeTab === 'artifacts' ? styles.mobileTabActive : ''}`}
            onClick={() => setActiveTab('artifacts')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <path d="M20.5 8.5L12 12l-4-6.5" />
            </svg>
            <span>Reflections</span>
          </button>
          <button
            className={`${styles.mobileTab} ${activeTab === 'flashcards' ? styles.mobileTabActive : ''}`}
            onClick={() => setActiveTab('flashcards')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>Cards</span>
          </button>
        </div>

        {/* Content Area */}
        <div className={styles.folderContent}>
          {activeTab === 'videos' && <VideosSection />}
          {activeTab === 'artifacts' && <ArtifactsSection />}
          {activeTab === 'notes' && <NotesSection />}
          {activeTab === 'flashcards' && <FlashcardsSection />}
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
