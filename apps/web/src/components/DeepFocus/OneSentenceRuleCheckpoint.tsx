'use client';

/**
 * OneSentenceRuleCheckpoint Component
 * 
 * "One-Sentence Rule" - A cognitive checkpoint for compression.
 * 
 * Flow:
 * 1. Video pauses after a concept is explained
 * 2. User must compress understanding into ONE sentence
 * 3. Constraints:
 *    - Maximum word count enforced
 *    - Required keyword must be included
 * 4. Response saved as a high-signal learning artifact
 * 
 * Example: "Describe closures in one sentence using the word 'scope'"
 * 
 * Design: Focused, challenging but not punitive.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import styles from './CognitiveCheckpoint.module.css';

interface OneSentenceRuleContent {
  type: 'one_sentence_rule';
  conceptName: string;
  requiredKeyword: string;
  maxWords: number;
}

interface OneSentenceRuleCheckpointProps {
  content: OneSentenceRuleContent;
  onComplete: () => void;
  onSaveArtifact: (data: {
    type: 'one_sentence_rule';
    userText: string;
    conceptName: string;
    requiredKeyword: string;
    maxWords: number;
  }) => Promise<void>;
}

export function OneSentenceRuleCheckpoint({
  content,
  onComplete,
  onSaveArtifact,
}: OneSentenceRuleCheckpointProps) {
  const [sentence, setSentence] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Word count and validation
  const words = useMemo(() => 
    sentence.trim().split(/\s+/).filter(Boolean),
    [sentence]
  );
  const wordCount = words.length;
  const isOverLimit = wordCount > content.maxWords;
  
  // Check if required keyword is present (case insensitive)
  const hasKeyword = useMemo(() => {
    const lowerSentence = sentence.toLowerCase();
    const lowerKeyword = content.requiredKeyword.toLowerCase();
    return lowerSentence.includes(lowerKeyword);
  }, [sentence, content.requiredKeyword]);

  // Check if valid for submission
  const isValid = sentence.trim().length > 0 && !isOverLimit && hasKeyword;

  // Get word count class
  const getWordCountClass = () => {
    if (isOverLimit) return styles.error;
    if (wordCount > content.maxWords * 0.8) return styles.warning;
    return '';
  };

  // Handle save
  const handleSave = useCallback(async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      await onSaveArtifact({
        type: 'one_sentence_rule',
        userText: sentence.trim(),
        conceptName: content.conceptName,
        requiredKeyword: content.requiredKeyword,
        maxWords: content.maxWords,
      });

      setIsSaved(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (error) {
      console.error('[OneSentenceRuleCheckpoint] Failed to save:', error);
      onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [isValid, sentence, content, onSaveArtifact, onComplete]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isValid) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isValid, handleSave]);

  // Highlight keyword in input (visual feedback)
  const renderKeywordStatus = () => {
    if (!sentence.trim()) return null;
    
    return (
      <div className={styles.keywordStatus}>
        {hasKeyword ? (
          <>
            <span className={styles.keywordFound}>✓</span>
            <span className={styles.keywordLabel}>{content.requiredKeyword}</span>
          </>
        ) : (
          <span className={styles.keywordMissing}>
            Include: "{content.requiredKeyword}"
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.typeBadge} ${styles.oneSentence}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="14" y2="15" />
        </svg>
        One-Sentence Rule
      </div>

      <p className={styles.prompt}>
        Describe <span className={styles.conceptHighlight}>{content.conceptName}</span> in one sentence using the word "<span className={styles.conceptHighlight}>{content.requiredKeyword}</span>"
      </p>

      <div className={styles.context}>
        <strong>Rules:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Maximum {content.maxWords} words</li>
          <li>Must include the word "{content.requiredKeyword}"</li>
          <li>One sentence only</li>
        </ul>
      </div>

      <div className={styles.inputSection}>
        <input
          ref={inputRef}
          type="text"
          className={styles.singleLineInput}
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={`${content.conceptName} is...`}
          style={isOverLimit ? { borderColor: '#F06A6A' } : undefined}
        />
        <div className={styles.inputHelpers}>
          <span className={`${styles.wordCount} ${getWordCountClass()}`}>
            {wordCount} / {content.maxWords} words
          </span>
          {renderKeywordStatus()}
        </div>
      </div>

      {!isValid && sentence.trim() && (
        <div style={{ 
          fontSize: '13px', 
          color: '#F0A060', 
          marginBottom: '16px',
          padding: '8px 12px',
          background: 'rgba(240, 160, 96, 0.1)',
          borderRadius: '6px'
        }}>
          {isOverLimit && `Too many words. Remove ${wordCount - content.maxWords} word(s). `}
          {!hasKeyword && `Include the word "${content.requiredKeyword}".`}
        </div>
      )}

      <div className={styles.encouragement}>
        Compression is mastery. If you can say it in one sentence, you truly understand it.
      </div>

      {isSaved ? (
        <div className={styles.savedConfirmation}>
          <svg className={styles.savedIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Saved to your learning artifacts
        </div>
      ) : (
        <div className={styles.actions}>
          <button
            className={styles.skipButton}
            onClick={onComplete}
            disabled={isSaving}
          >
            Skip for now
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!isValid || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
