'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ThinkingField from './ThinkingField';
import { Logo } from '../Common/Logo';
import { AuthModal } from '../Auth/AuthModal';
import styles from './Hero.module.css';

interface HeroProps {
  onStart?: () => void;
}

export default function Hero({ onStart }: HeroProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  // Typing effect logic
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [delta, setDelta] = useState(150);
  const toRotate = ['happens', 'occurs', 'emerges', 'unfolds', 'takes place', 'arises'];
  const period = 2000;

  useEffect(() => {
    let ticker = setInterval(() => {
      tick();
    }, delta);

    return () => clearInterval(ticker);
  }, [text, delta]);

  const tick = () => {
    let i = loopNum % toRotate.length;
    let fullText = toRotate[i];
    let updatedText = isDeleting ? fullText.substring(0, text.length - 1) : fullText.substring(0, text.length + 1);

    setText(updatedText);

    if (isDeleting) {
      setDelta(prevDelta => prevDelta / 2);
    }

    if (!isDeleting && updatedText === fullText) {
      setIsDeleting(true);
      setDelta(period);
    } else if (isDeleting && updatedText === '') {
      setIsDeleting(false);
      setLoopNum(loopNum + 1);
      setDelta(150);
    } else {
      setDelta(100); // Typing speed
    }
  };

  // Parallax Scroll logic
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 150]); // Moves background slower than content

  const extractVideoId = (input: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = input.match(regex);
    return match ? match[1] : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    if (!user) {
      if (onStart) onStart(); // Open sign-in modal
      return;
    }

    router.push(`/deepfocus/${videoId}`);
  };

  return (
    <section className={styles.heroSection}>
      {/* Navigation Header */}
      <motion.nav 
        className={styles.navHeader}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className={styles.navLogo}>
          <Logo size="small" />
        </div>
        <div className={styles.navButtons}>
          {loading ? (
            <div className={styles.navLoading}>Loading...</div>
          ) : user ? (
            <button 
              onClick={() => router.push('/dashboard')} 
              className={styles.dashboardButton}
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button 
                onClick={handleSignIn} 
                className={styles.signInBtn}
              >
                Sign In
              </button>
              <button 
                onClick={handleSignUp} 
                className={styles.signUpBtn}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </motion.nav>

      {/* Background Layer (Grid Wave) with Parallax */}
      <motion.div style={{ y, position: 'absolute', inset: 0, zIndex: 0 }}>
        <ThinkingField className={styles.bgLayer} />
      </motion.div>
      
      {/* Content Layer */}
      <div className={styles.contentContainer}>
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 10 }}
        >
          <h1 className={styles.title}>
            Capture understanding as it <br />
            <span 
              className={styles.highlightText} 
              style={{ 
                fontFamily: 'var(--font-instrument-serif)', 
                fontStyle: 'italic',
                fontWeight: 400
              }}
            >
              {text}
            </span>
          </h1>
          
          <p className={styles.subtitle}>
            Pauser pauses videos at the right time so you can write what you actually understand.
            No generic notes. Just structured thinking built around your learning.
          </p>

          <form onSubmit={handleSubmit} className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                placeholder="Paste YouTube video link..."
                className={styles.inputField}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <AnimatePresence>
                {error && (
                  <motion.span 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={styles.errorText}
                  >
                    {error}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <button type="submit" className={styles.buttonPrimary}>
              Start Learning →
            </button>
          </form>

          <p className={styles.microCopy}>
            Because learning doesn't happen at 1.25× speed.
          </p>
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </section>
  );
}
