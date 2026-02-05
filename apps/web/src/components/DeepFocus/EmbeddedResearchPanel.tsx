'use client';

/**
 * EmbeddedResearchPanel Component
 * 
 * A reflection panel for general/casual learning checkpoints.
 * Features:
 * - Free-form reflection writing
 * - Optional deep-dive content
 * - Character/word counting
 * - AI follow-up questions
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './EmbeddedResearchPanel.module.css';

interface ResearchCheckpoint {
  id: string;
  title: string;
  context: string;
  estimatedTime: string;
  prompt: {
    question: string;
    characterLimit: number;
    followUp?: string;
  };
  optionalDeepDive?: {
    topics: string[];
    resources?: Array<{
      title: string;
      url: string;
      type: 'article' | 'video' | 'wiki';
    }>;
  };
}

interface EmbeddedResearchPanelProps {
  checkpoint: ResearchCheckpoint;
  onComplete: (data: { reflection: string; wordCount: number }) => void;
  onSkip: () => void;
}

export function EmbeddedResearchPanel({
  checkpoint,
  onComplete,
  onSkip,
}: EmbeddedResearchPanelProps) {
  const [reflection, setReflection] = useState('');
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Calculate word count
  const wordCount = reflection.trim() ? reflection.trim().split(/\s+/).length : 0;
  const charCount = reflection.length;
  const minChars = 50;
  const maxChars = checkpoint.prompt.characterLimit;
  const isValidLength = charCount >= minChars && charCount <= maxChars;

  // Handle submission
  const handleComplete = useCallback(async () => {
    if (reflection.length < minChars) return;

    setIsSubmitting(true);
    try {
      onComplete({
        reflection,
        wordCount,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [reflection, wordCount, onComplete]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <span className={styles.typeIcon}>📝</span>
            <h3 className={styles.title}>{checkpoint.title}</h3>
          </div>
          <span className={styles.estimatedTime}>~{checkpoint.estimatedTime}</span>
        </div>
        <p className={styles.context}>{checkpoint.context}</p>
      </div>

      {/* Reflection Area */}
      <div className={styles.reflectionArea}>
        <label className={styles.prompt}>{checkpoint.prompt.question}</label>
        <div className={styles.textareaWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={reflection}
            onChange={(e) => setReflection(e.target.value.slice(0, maxChars))}
            placeholder="Take a moment to reflect and write your thoughts..."
            maxLength={maxChars}
          />
          <div className={styles.charCounter}>
            <span className={charCount < minChars ? styles.belowMin : ''}>
              {wordCount} words
            </span>
            <span className={charCount >= maxChars * 0.9 ? styles.nearMax : ''}>
              {charCount}/{maxChars} chars
            </span>
          </div>
        </div>
        {charCount < minChars && charCount > 0 && (
          <p className={styles.minWarning}>
            Write at least {minChars - charCount} more characters
          </p>
        )}
      </div>

      {/* Follow-up Question */}
      {checkpoint.prompt.followUp && reflection.length >= 100 && (
        <div className={styles.followUpBox}>
          <span className={styles.followUpIcon}>💭</span>
          <p className={styles.followUpText}>{checkpoint.prompt.followUp}</p>
        </div>
      )}

      {/* Deep Dive Section */}
      {checkpoint.optionalDeepDive && (
        <div className={styles.deepDiveSection}>
          <button
            className={`${styles.deepDiveToggle} ${showDeepDive ? styles.active : ''}`}
            onClick={() => setShowDeepDive(!showDeepDive)}
          >
            <span>🔍 Want to explore more?</span>
            <span className={styles.toggleIcon}>{showDeepDive ? '−' : '+'}</span>
          </button>

          {showDeepDive && (
            <div className={styles.deepDiveContent}>
              <div className={styles.topicsSection}>
                <h4>Related Topics</h4>
                <div className={styles.topicTags}>
                  {checkpoint.optionalDeepDive.topics.map((topic, index) => (
                    <span key={index} className={styles.topicTag}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {checkpoint.optionalDeepDive.resources && (
                <div className={styles.resourcesSection}>
                  <h4>Suggested Resources</h4>
                  <ul className={styles.resourceList}>
                    {checkpoint.optionalDeepDive.resources.map((resource, index) => (
                      <li key={index} className={styles.resourceItem}>
                        <span className={styles.resourceIcon}>
                          {resource.type === 'video' ? '🎬' : 
                           resource.type === 'wiki' ? '📚' : '📄'}
                        </span>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.resourceLink}
                        >
                          {resource.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.skipButton} onClick={onSkip}>
          Skip
        </button>
        <button
          className={`${styles.completeButton} ${isValidLength ? styles.ready : ''}`}
          onClick={handleComplete}
          disabled={charCount < minChars || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 
           charCount < minChars ? `${minChars - charCount} more chars` :
           '✓ Complete Reflection'}
        </button>
      </div>
    </div>
  );
}

export default EmbeddedResearchPanel;
