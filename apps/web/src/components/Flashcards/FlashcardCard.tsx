'use client';

import type { Flashcard } from '@/actions/flashcardActions';
import styles from './FlashcardCard.module.css';

interface Props {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

export function FlashcardCard({ card, isFlipped, onFlip }: Props) {
  return (
    <div className={styles.scene} onClick={onFlip}>
      <div className={`${styles.card} ${isFlipped ? styles.isFlipped : ''}`}>
        {/* Front Face */}
        <div className={`${styles.face} ${styles.front}`}>
           <span className={styles.label}>Question</span>
           <div className={styles.content}>{card.front}</div>
           <div className={styles.hint}>Click or Spacebar to flip</div>
        </div>
        
        {/* Back Face */}
        <div className={`${styles.face} ${styles.back}`}>
           <span className={styles.label}>Answer</span>
           <div className={styles.content}>{card.back}</div>
        </div>
      </div>
    </div>
  );
}
