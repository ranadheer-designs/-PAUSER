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
