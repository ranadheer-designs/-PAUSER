'use client';

/**
 * Premium Auth Page
 * 
 * Unified login/signup experience for Pauser.
 * Following design language: calm, premium, authoritative dark theme.
 * 
 * Features:
 * - Toggle between Sign In / Sign Up
 * - Social login (Google, GitHub)
 * - Email + Password form
 * - Premium glassmorphism design
 */

import { useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Logo } from '@/components/Common/Logo';
import styles from './page.module.css';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        setMessage('Check your email for a confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  }, [mode, email, password, router, supabase.auth]);

  const handleSocialLogin = useCallback(async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social login failed');
      setIsLoading(false);
    }
  }, [supabase.auth]);

  const toggleMode = useCallback(() => {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError(null);
    setMessage(null);
  }, []);

  return (
    <main className={styles.main}>
      {/* Background gradient */}
      <div className={styles.background} />

      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logoWrapper}>
          <Logo size="large" />
        </div>

        {/* Auth Card */}
        <div className={styles.card}>
          <h1 className={styles.title}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className={styles.subtitle}>
            {mode === 'signin' 
              ? 'Sign in to continue your focused learning journey' 
              : 'Start transforming how you learn from videos'}
          </p>

          {/* Social Login */}
          <div className={styles.socialButtons}>
            <button 
              type="button" 
              className={styles.socialButton}
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M18.171 8.368h-.67v-.035H10v3.333h4.709A4.998 4.998 0 015 10a5 5 0 015-5c1.275 0 2.434.477 3.317 1.26l2.357-2.357A8.295 8.295 0 0010 1.667a8.333 8.333 0 100 16.666 8.333 8.333 0 008.171-10.035v.07z" fill="#FFC107"/>
                <path d="M2.628 6.121l2.74 2.009A4.998 4.998 0 0110 5c1.275 0 2.434.477 3.317 1.26l2.357-2.357A8.295 8.295 0 0010 1.667a8.32 8.32 0 00-7.372 4.454z" fill="#FF3D00"/>
                <path d="M10 18.333a8.294 8.294 0 005.587-2.163l-2.579-2.183A4.963 4.963 0 0110 15a4.998 4.998 0 01-4.701-3.306l-2.716 2.092A8.32 8.32 0 0010 18.333z" fill="#4CAF50"/>
                <path d="M18.171 8.368h-.67v-.035H10v3.333h4.709a5.023 5.023 0 01-1.706 2.32l.003-.002 2.579 2.183C15.374 16.38 18.333 14.167 18.333 10c0-.565-.057-1.117-.162-1.632z" fill="#1976D2"/>
              </svg>
              Continue with Google
            </button>
            <button 
              type="button" 
              className={styles.socialButton}
              onClick={() => handleSocialLogin('github')}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Divider */}
          <div className={styles.divider}>
            <span>or continue with email</span>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            {message && (
              <div className={styles.success}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading 
                ? 'Please wait...' 
                : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Mode Toggle */}
          <p className={styles.modeToggle}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button 
              type="button" 
              className={styles.modeToggleButton}
              onClick={toggleMode}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className={styles.footer}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
