'use client';

/**
 * ConceptQuizCheckpoint Component
 * 
 * An interactive quiz checkpoint for testing understanding of concepts.
 * Features:
 * - Multiple choice questions
 * - Immediate feedback
 * - Detailed explanations
 * - Progress tracking
 */

import { useState, useCallback } from 'react';
import styles from './ConceptQuizCheckpoint.module.css';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface ConceptQuizContent {
  type: 'concept_quiz' | 'CONCEPT_QUIZ';
  question: string;
  options: QuizOption[];
  explanation: string;
  incorrectFeedback?: Record<string, string>;
}

interface ConceptQuizCheckpointProps {
  content: ConceptQuizContent;
  title?: string;
  context?: string;
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  onComplete: () => void;
  onSaveArtifact?: (data: {
    type: 'concept_quiz';
    selectedOptionId: string;
    isCorrect: boolean;
    attempts: number;
  }) => Promise<void>;
}

export function ConceptQuizCheckpoint({
  content,
  title,
  context,
  estimatedTime,
  difficulty,
  onComplete,
  onSaveArtifact,
}: ConceptQuizCheckpointProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const selectedOptionData = content.options.find(o => o.id === selectedOption);
  const isCorrect = selectedOptionData?.isCorrect || false;

  // Handle option selection
  const handleSelect = useCallback((optionId: string) => {
    if (!hasSubmitted) {
      setSelectedOption(optionId);
    }
  }, [hasSubmitted]);

  // Handle submission
  const handleSubmit = useCallback(async () => {
    if (!selectedOption) return;

    setHasSubmitted(true);
    setAttempts(prev => prev + 1);

    if (onSaveArtifact) {
      await onSaveArtifact({
        type: 'concept_quiz',
        selectedOptionId: selectedOption,
        isCorrect,
        attempts: attempts + 1,
      });
    }
  }, [selectedOption, isCorrect, attempts, onSaveArtifact]);

  // Handle try again
  const handleTryAgain = useCallback(() => {
    setSelectedOption(null);
    setHasSubmitted(false);
  }, []);

  // Handle completion
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Get feedback for incorrect answer
  const getFeedback = () => {
    if (!hasSubmitted || !selectedOption) return null;
    
    if (isCorrect) {
      return content.explanation;
    }
    
    // Check for specific incorrect feedback
    if (content.incorrectFeedback && content.incorrectFeedback[selectedOption]) {
      return content.incorrectFeedback[selectedOption];
    }
    
    return 'Not quite. Try again or continue to see the explanation.';
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.typeIcon}>🧠</span>
          <span className={styles.typeLabel}>Quick Check</span>
          {difficulty && (
            <span className={`${styles.difficulty} ${styles[difficulty]}`}>
              {difficulty}
            </span>
          )}
        </div>
        {estimatedTime && (
          <span className={styles.estimatedTime}>~{estimatedTime}</span>
        )}
      </div>

      {/* Title and Context */}
      {title && <h3 className={styles.title}>{title}</h3>}
      {context && <p className={styles.context}>{context}</p>}

      {/* Question */}
      <div className={styles.questionBox}>
        <p className={styles.question}>{content.question}</p>
      </div>

      {/* Options */}
      <div className={styles.optionsGrid}>
        {content.options.map((option) => {
          const isSelected = selectedOption === option.id;
          const showResult = hasSubmitted && isSelected;
          
          let optionClass = styles.option;
          if (isSelected) optionClass += ` ${styles.selected}`;
          if (showResult && option.isCorrect) optionClass += ` ${styles.correct}`;
          if (showResult && !option.isCorrect) optionClass += ` ${styles.incorrect}`;
          if (hasSubmitted && option.isCorrect && !isSelected) optionClass += ` ${styles.correctAnswer}`;

          return (
            <button
              key={option.id}
              className={optionClass}
              onClick={() => handleSelect(option.id)}
              disabled={hasSubmitted}
            >
              <span className={styles.optionId}>{option.id.toUpperCase()}</span>
              <span className={styles.optionText}>{option.text}</span>
              {showResult && (
                <span className={styles.resultIcon}>
                  {option.isCorrect ? '✓' : '✗'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {hasSubmitted && (
        <div className={`${styles.feedbackBox} ${isCorrect ? styles.successFeedback : styles.errorFeedback}`}>
          <div className={styles.feedbackHeader}>
            {isCorrect ? '🎉 Correct!' : '💭 Not quite...'}
          </div>
          <p className={styles.feedbackText}>{getFeedback()}</p>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {!hasSubmitted ? (
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!selectedOption}
          >
            Check Answer
          </button>
        ) : (
          <div className={styles.postSubmitActions}>
            {!isCorrect && (
              <button
                className={styles.tryAgainButton}
                onClick={handleTryAgain}
              >
                Try Again
              </button>
            )}
            <button
              className={`${styles.continueButton} ${isCorrect ? styles.success : ''}`}
              onClick={handleComplete}
            >
              {isCorrect ? '✓ Continue' : 'Skip & Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
