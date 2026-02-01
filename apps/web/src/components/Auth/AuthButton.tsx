'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import styles from './AuthButton.module.css';

interface AuthButtonProps {
  isCollapsed?: boolean;
}

export function AuthButton({ isCollapsed }: AuthButtonProps) {
  const { user, loading, signOut } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return <div className={styles.loading}>{isCollapsed ? '...' : 'Loading...'}</div>;
  }

  if (user) {
    return (
      <div className={`${styles.container} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.userInfo} title={user.email || ''}>
          <div className={styles.avatar}>
            {user.email?.[0].toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className={styles.userDetails}>
              <span className={styles.email}>{user.email}</span>
              <span className={styles.status}>Pro Member</span>
            </div>
          )}
        </div>
        <button onClick={signOut} className={styles.signOutButton} title="Sign Out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.guestContainer} ${isCollapsed ? styles.collapsed : ''}`}>
      <button 
        onClick={() => setShowModal(true)} 
        className={styles.signInButton}
        title="Sign In"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        {!isCollapsed && <span>Sign In</span>}
      </button>
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
