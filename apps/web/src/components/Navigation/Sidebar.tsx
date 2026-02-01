import { useState } from 'react';
import { AuthButton } from '../Auth/AuthButton';
import { Logo } from '../Common/Logo';

import styles from './Sidebar.module.css';

type Tab = 'videos' | 'notes' | 'artifacts' | 'flashcards';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);


  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <div className={styles.logoWrapper}>
          <Logo size={isCollapsed ? "small" : "medium"} hideText={isCollapsed} />
        </div>
        <button 
          className={styles.toggleButton} 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <polyline points="9 18 15 12 9 6" /> 
            ) : (
               <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" /> // Frame
            )}
             {!isCollapsed && <line x1="9" y1="3" x2="9" y2="21" strokeWidth="2" />} // Sidebar divider line
             {!isCollapsed && <path d="M15 10l-2 2 2 2" strokeWidth="1.5" />} // Tiny arrow pointing left
          </svg>
        </button>
      </div>
      
      <nav className={styles.nav}>
        <button
          className={`${styles.navItem} ${activeTab === 'videos' ? styles.navItemActive : ''}`}
          onClick={() => onTabChange('videos')}
          title={isCollapsed ? "Your Videos" : ""}
        >
          <svg className={styles.icon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          {!isCollapsed && <span>Your Videos</span>}
        </button>

        <button
          className={`${styles.navItem} ${activeTab === 'notes' ? styles.navItemActive : ''}`}
          onClick={() => onTabChange('notes')}
          title={isCollapsed ? "Your Notes" : ""}
        >
          <svg className={styles.icon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          {!isCollapsed && <span>Your Notes</span>}
        </button>

        <button
          className={`${styles.navItem} ${activeTab === 'artifacts' ? styles.navItemActive : ''}`}
          onClick={() => onTabChange('artifacts')}
          title={isCollapsed ? "Reflections" : ""}
        >
          <svg className={styles.icon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
            <path d="M20.5 8.5L12 12l-4-6.5" />
          </svg>
          {!isCollapsed && <span>Reflections</span>}
        </button>

        <button
          className={`${styles.navItem} ${activeTab === 'flashcards' ? styles.navItemActive : ''}`}
          onClick={() => onTabChange('flashcards')}
          title={isCollapsed ? "Flashcards" : ""}
        >
          <svg className={styles.icon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          {!isCollapsed && <span>Flashcards</span>}
        </button>
      </nav>

      <div className={styles.footer}>

        <div className={styles.authWrapper}>
          <AuthButton isCollapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
}
