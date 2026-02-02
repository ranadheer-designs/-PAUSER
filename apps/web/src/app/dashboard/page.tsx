'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { NotesSection } from '@/components/Dashboard/NotesSection';
import { VideosSection } from '@/components/Dashboard/VideosSection';
import { ArtifactsSection } from '@/components/Dashboard/ArtifactsSection';
import { FlashcardsSection } from '@/components/Dashboard/FlashcardsSection';
import { AutoSync } from '@/components/Dashboard/AutoSync';
import { StreakMap } from '@/components/Dashboard/StreakMap';
import { Sidebar } from '@/components/Navigation/Sidebar';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
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
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Your Progress</h1>
            <p className={styles.subtitle}>Consistency over intensity.</p>
          </div>
        </header>
        
        {/* Auto-sync notes in background */}
        <AutoSync />

        <div className={styles.grid}>
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
