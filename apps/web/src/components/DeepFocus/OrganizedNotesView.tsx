/**
 * Organized Notes View Component
 * 
 * Displays AI-organized notes grouped into sections.
 * Preserves learner's original wording verbatim.
 * 
 * FEATURES:
 * - Section headers (Main Ideas, Examples, Unclear Points)
 * - Timestamp links back to video position
 * - Transparency badge ("AI-organized")
 * - Trust notice ("Your original notes are unchanged")
 */

'use client';

import { useCallback } from 'react';
import type { OrganizedNotesSection } from '@pauser/common';
import { formatTimestamp } from '@/utils/format/time';
import styles from './OrganizedNotesView.module.css';

export interface OrganizedNotesViewProps {
  sections: OrganizedNotesSection[];
  onTimestampClick: (timestamp: number, noteId: string) => void;
  generatedAt?: string;
}

const SECTION_LABELS: Record<string, { emoji: string; description: string }> = {
  main_ideas: { emoji: '💡', description: 'Core points you captured' },
  examples: { emoji: '📌', description: 'Concrete instances you noted' },
  unclear_points: { emoji: '❓', description: 'Areas to revisit' },
  repeated_ideas: { emoji: '🔁', description: 'Concepts you emphasized' },
};

export function OrganizedNotesView({ 
  sections, 
  onTimestampClick,
  generatedAt 
}: OrganizedNotesViewProps) {
  
  const handleItemClick = useCallback((timestamp: number, noteId: string) => {
    onTimestampClick(timestamp, noteId);
  }, [onTimestampClick]);

  // Filter out empty sections
  const visibleSections = sections.filter(s => s.items.length > 0);

  if (visibleSections.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Could not organize notes into sections.</p>
        <p className={styles.hint}>Try adding more varied content to your notes.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Transparency Badge */}
      <div className={styles.badge}>
        <span className={styles.badgeIcon}>✨</span>
        <span className={styles.badgeText}>AI-organized view</span>
      </div>

      {/* Trust Notice */}
      <div className={styles.notice}>
        Your original notes are unchanged. This is just a different lens.
      </div>

      {/* Sections */}
      <div className={styles.sections}>
        {visibleSections.map((section) => {
          const meta = SECTION_LABELS[section.type] || { 
            emoji: '📝', 
            description: 'Notes' 
          };

          return (
            <div key={section.type} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionEmoji}>{meta.emoji}</span>
                <div className={styles.sectionTitleGroup}>
                  <h3 className={styles.sectionTitle}>{section.label}</h3>
                  <span className={styles.sectionDescription}>{meta.description}</span>
                </div>
                <span className={styles.sectionCount}>{section.items.length}</span>
              </div>

              <div className={styles.sectionItems}>
                {section.items.map((item, idx) => (
                  <div 
                    key={`${item.noteId}-${idx}`}
                    className={styles.item}
                    onClick={() => handleItemClick(item.timestamp, item.noteId)}
                  >
                    <span className={styles.itemTimestamp}>
                      {formatTimestamp(item.timestamp)}
                    </span>
                    <p className={styles.itemText}>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generation timestamp */}
      {generatedAt && (
        <div className={styles.footer}>
          Organized {new Date(generatedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
