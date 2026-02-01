'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Flashcard } from '@/actions/flashcardActions';
import { FlashcardCard } from './FlashcardCard';
import { AddVideoModal } from '../Dashboard/AddVideoModal';
import styles from './StudySession.module.css';

interface Props {
  initialCards: Flashcard[];
}

export function StudySession({ initialCards }: Props) {
  const router = useRouter();
  // Queue state
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // UI state
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);

  // Initialize queue on mount
  useEffect(() => {
    if (initialCards.length > 0) {
      const shuffled = [...initialCards].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
    }
  }, [initialCards]);

  const currentCard = queue[currentIndex];
  // Progress is based on "Cards processed so far" vs "Total initial cards" roughly,
  // or simply position in current queue. Standard Anki: Remaining count.
  const cardsRemaining = queue.length - currentIndex;
  const progressPercent = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0;

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleNext = useCallback((rating: 'again' | 'hard' | 'good' | 'easy') => {
    console.log(`[Study] Card ${currentCard.id} rated: ${rating}`);

    // LOGIC: If 'Again', re-queue the card at the end of the session
    if (rating === 'again') {
       setQueue(prev => [...prev, currentCard]);
    } else {
       // Hard/Good/Easy -> Count as "Review complete" for this session
       setCardsReviewed(prev => prev + 1);
    }

    setIsFlipped(false);
    
    // Slight delay for visual smoothness
    setTimeout(() => {
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
      }
    }, 150);
  }, [currentIndex, queue.length, currentCard]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || !currentCard) return;
      
      if (e.code === 'Space') {
         e.preventDefault(); 
         if (!isFlipped) {
             handleFlip();
         }
      }

      if (isFlipped) {
        if (e.key === '1') handleNext('again');
        if (e.key === '2') handleNext('hard');
        if (e.key === '3') handleNext('good');
        if (e.key === '4') handleNext('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isFinished, handleFlip, handleNext, currentCard]);

  // Restart handler
  const handleRestart = () => {
    const shuffled = [...initialCards].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrentIndex(0);
    setIsFinished(false);
    setCardsReviewed(0);
    setIsFlipped(false);
  };

  const [showAddVideoModal, setShowAddVideoModal] = useState(false);

  if (initialCards.length === 0) {
    return (
      <>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h2>No flashcards ready</h2>
          <p style={{marginTop: 8, color: '#6F7A96'}}>Create flashcards from your Learning Artifacts to start studying.</p>
          <div className={styles.emptyActions}>
            <button 
               className={styles.primaryBtn} 
               onClick={() => router.push('/dashboard?tab=artifacts')}
               style={{ maxWidth: 200 }}
            >
              Go to Artifacts
            </button>
            <button 
               className={styles.secondaryBtn} 
               onClick={() => setShowAddVideoModal(true)}
               style={{ maxWidth: 200 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Video
            </button>
          </div>
        </div>
        <AddVideoModal isOpen={showAddVideoModal} onClose={() => setShowAddVideoModal(false)} />
      </>
    );
  }

  if (isFinished) {
    return (
      <div className={styles.container}>
        <div className={styles.finishScreen}>
          <div className={styles.finishEmoji}>🎉</div>
          <h1 className={styles.finishTitle}>Session Complete!</h1>
          <p className={styles.finishStats}>
            You reviewed {cardsReviewed} cards.
          </p>
          
          <div className={styles.finishActions}>
            <button className={styles.primaryBtn} onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </button>
            <button className={styles.secondaryBtn} onClick={handleRestart}>
              Study Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      {/* Header Info */}
      <div className={styles.header}>
        <span>Remaining: {cardsRemaining}</span>
        <span>{cardsReviewed} Done</span>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar} style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Card */}
      <FlashcardCard 
        card={currentCard} 
        isFlipped={isFlipped} 
        onFlip={handleFlip}
      />

      {/* Controls */}
      <div className={styles.controls}>
        {!isFlipped ? (
          <button className={styles.revealBtn} onClick={handleFlip}>
            Show Answer <span style={{opacity: 0.6, fontSize: '0.9em', marginLeft: 8}}>Space</span>
          </button>
        ) : (
          <>
            <button className={styles.rateAgain} onClick={() => handleNext('again')}>
              Again (1)
            </button>
            <button className={styles.rateHard} onClick={() => handleNext('hard')}>
              Hard (2)
            </button>
            <button className={styles.rateGood} onClick={() => handleNext('good')}>
              Good (3)
            </button>
            <button className={styles.rateEasy} onClick={() => handleNext('easy')}>
              Easy (4)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
