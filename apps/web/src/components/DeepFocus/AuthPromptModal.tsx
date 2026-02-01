'use client';

/**
 * AuthPromptModal Component
 * 
 * Non-intrusive modal prompting unauthenticated users to sign in
 * to access AI-powered checkpoints.
 * 
 * Following Pauser design language: calm, authoritative, premium.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AuthPromptModal.module.css';

interface AuthPromptModalProps {
  onClose: () => void;
  onContinueWithout?: () => void;
}

export function AuthPromptModal({ onClose, onContinueWithout }: AuthPromptModalProps) {
  const router = useRouter();

  const handleSignIn = useCallback(() => {
    router.push('/auth');
  }, [router]);

  const handleContinue = useCallback(() => {
    if (onContinueWithout) {
      onContinueWithout();
    }
    onClose();
  }, [onClose, onContinueWithout]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Icon */}
        <div className={styles.iconContainer}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#3B4BD8" strokeWidth="2" strokeDasharray="4 4"/>
            <path d="M24 16V26M24 32V32.01" stroke="#22C3A6" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Content */}
        <h2 className={styles.title}>Unlock AI Checkpoints</h2>
        <p className={styles.description}>
          Sign in to access personalized coding challenges, quizzes, and flashcards 
          generated specifically for this video content.
        </p>

        {/* Benefits */}
        <ul className={styles.benefits}>
          <li>
            <span className={styles.checkmark}>✓</span>
            Content-aligned challenges
          </li>
          <li>
            <span className={styles.checkmark}>✓</span>
            Track your progress
          </li>
          <li>
            <span className={styles.checkmark}>✓</span>
            1 free checkpoint on signup
          </li>
        </ul>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={handleSignIn}>
            Sign In to Start
          </button>
          {onContinueWithout && (
            <button className={styles.secondaryButton} onClick={handleContinue}>
              Continue without checkpoints
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
