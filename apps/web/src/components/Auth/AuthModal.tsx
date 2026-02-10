'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { getURL } from '@/utils/getURL';
import styles from './AuthModal.module.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { signIn, signUp } = useAuth();

  // Track when component is mounted (for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync mode with defaultMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        onClose();
      } else {
        const data = await signUp(email.trim(), password);
        if (data?.user && !data?.session) {
          setSuccessMessage('Account created! Please check your email to confirm your account before signing in.');
        } else {
          onClose();
        }
      }
      if (mode === 'signin') {
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Auth Error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google login error:', err);
      setError(err instanceof Error ? err.message : 'Google login failed');
      setLoading(false);
    }
  };

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <h2 className={styles.title}>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>

        <div className={styles.tabs}>
          <button
            className={mode === 'signin' ? styles.tabActive : styles.tab}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            className={mode === 'signup' ? styles.tabActive : styles.tab}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M18.171 8.368h-.67v-.035H10v3.333h4.709A4.998 4.998 0 015 10a5 5 0 015-5c1.275 0 2.434.477 3.317 1.26l2.357-2.357A8.295 8.295 0 0010 1.667a8.333 8.333 0 100 16.666 8.333 8.333 0 008.171-10.035v.07z" fill="#FFC107"/>
            <path d="M2.628 6.121l2.74 2.009A4.998 4.998 0 0110 5c1.275 0 2.434.477 3.317 1.26l2.357-2.357A8.295 8.295 0 0010 1.667a8.32 8.32 0 00-7.372 4.454z" fill="#FF3D00"/>
            <path d="M10 18.333a8.294 8.294 0 005.587-2.163l-2.579-2.183A4.963 4.963 0 0110 15a4.998 4.998 0 01-4.701-3.306l-2.716 2.092A8.32 8.32 0 0010 18.333z" fill="#4CAF50"/>
            <path d="M18.171 8.368h-.67v-.035H10v3.333h4.709a5.023 5.023 0 01-1.706 2.32l.003-.002 2.579 2.183C15.374 16.38 18.333 14.167 18.333 10c0-.565-.057-1.117-.162-1.632z" fill="#1976D2"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className={styles.divider}>
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {successMessage && <div className={styles.success}>{successMessage}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
