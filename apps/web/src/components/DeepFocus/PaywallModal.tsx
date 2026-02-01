'use client';

/**
 * PaywallModal Component
 * 
 * Displayed when user has exhausted their free credits.
 * Calm, non-intrusive design following Pauser aesthetic.
 */

import { useCallback } from 'react';
import styles from './PaywallModal.module.css';

interface PaywallModalProps {
  credits: number;
  totalUsed: number;
  onClose: () => void;
  onContinueWithout?: () => void;
}

export function PaywallModal({ 
  credits, 
  totalUsed, 
  onClose,
  onContinueWithout 
}: PaywallModalProps) {
  
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>🔒</span>
          </div>
          <h2 className={styles.title}>Checkpoint Credits Exhausted</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.message}>
            You've used your free checkpoint generation credit. 
            Upgrade to continue generating AI-powered learning checkpoints.
          </p>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{credits}</span>
              <span className={styles.statLabel}>Credits remaining</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>{totalUsed}</span>
              <span className={styles.statLabel}>Sessions generated</span>
            </div>
          </div>

          {/* Benefits */}
          <div className={styles.benefits}>
            <h3 className={styles.benefitsTitle}>What you get with Premium</h3>
            <ul className={styles.benefitsList}>
              <li>Unlimited checkpoint generation</li>
              <li>Multi-language coding challenges</li>
              <li>Priority AI model access</li>
              <li>Advanced progress analytics</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {onContinueWithout && (
            <button 
              className={styles.secondaryButton}
              onClick={onContinueWithout}
            >
              Continue without checkpoints
            </button>
          )}
          <button 
            className={styles.primaryButton}
            onClick={() => {
              // TODO: Integrate with payment system
              window.open('/pricing', '_blank');
            }}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}
