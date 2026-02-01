/**
 * Popup Component
 *
 * Premium, crisp popup for quick access to Pauser stats and actions.
 */

import { useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

interface Stats {
  streak: number;
  dueCards: number;
  focusPoints: number;
  authenticated: boolean;
}

// ============================================================================
// Icons (inline SVGs for crispness)
// ============================================================================

const FlameIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const CardsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M7 8h10"/>
    <path d="M7 12h6"/>
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// ============================================================================
// Component
// ============================================================================

export function Popup() {
  const [stats, setStats] = useState<Stats>({ 
    streak: 0, 
    dueCards: 0, 
    focusPoints: 0,
    authenticated: false 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all stats at once
    chrome.runtime.sendMessage({ type: 'GET_ALL_STATS' }, (response) => {
      if (chrome.runtime.lastError) {
        setError('Unable to connect');
        setIsLoading(false);
        return;
      }
      
      if (response) {
        setStats({
          streak: response.streak || 0,
          dueCards: response.dueCards || 0,
          focusPoints: response.focusPoints || 0,
          authenticated: response.authenticated || false
        });
      }
      setIsLoading(false);
    });
  }, []);

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  };

  const handleSignIn = () => {
    // Open the dashboard which will redirect to login if not authenticated
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  };

  const handleStartReview = () => {
    // TODO: Open review page when available
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  };

  return (
    <div className="popup">
      {/* Header */}
      <header className="popup-header">
        <div className="brand">
          <h1 className="popup-title">Pauser</h1>
          <span className="popup-tagline">Deep Focus Learning</span>
        </div>
        {stats.authenticated ? (
          <span className="popup-status active">Connected</span>
        ) : (
          <button className="popup-status inactive" onClick={handleSignIn}>
            Sign In
          </button>
        )}
      </header>

      {/* Stats Grid */}
      <main className="popup-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span className="loading-text">Loading...</span>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="stats-grid">
            {/* Streak Card */}
            <div className="stat-card stat-streak">
              <div className="stat-icon">
                <FlameIcon />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.streak}</span>
                <span className="stat-label">Day Streak</span>
              </div>
            </div>

            {/* Cards Due */}
            <div className="stat-card stat-cards">
              <div className="stat-icon">
                <CardsIcon />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.dueCards}</span>
                <span className="stat-label">Cards Due</span>
              </div>
            </div>

            {/* Focus Points - Full Width */}
            <div className="stat-card stat-points full-width">
              <div className="stat-icon">
                <StarIcon />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.focusPoints}</span>
                <span className="stat-label">Focus Points</span>
              </div>
              <div className="points-progress">
                <div 
                  className="points-bar" 
                  style={{ width: `${Math.min(100, (stats.focusPoints % 100))}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Actions */}
      <footer className="popup-footer">
        {stats.dueCards > 0 && (
          <button className="btn btn-accent" onClick={handleStartReview}>
            Review {stats.dueCards} Card{stats.dueCards !== 1 ? 's' : ''}
          </button>
        )}
        <button className="btn btn-primary" onClick={handleOpenDashboard}>
          Open Dashboard
        </button>
      </footer>
    </div>
  );
}
