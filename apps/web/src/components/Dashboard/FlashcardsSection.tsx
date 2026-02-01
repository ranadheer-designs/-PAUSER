'use client';

import { useState, useEffect } from 'react';
import { getFlashcards, type Flashcard } from '@/actions/flashcardActions';
import { StudySession } from '@/components/Flashcards/StudySession';
import styles from './FlashcardsSection.module.css';

export function FlashcardsSection() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getFlashcards();
        setCards(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Loading flashcards...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <StudySession initialCards={cards} />
    </div>
  );
}
