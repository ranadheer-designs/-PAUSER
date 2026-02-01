/**
 * Modal Component
 *
 * A centered overlay dialog for checkpoints and confirmations.
 * Uses the calm, authoritative Pauser aesthetic.
 * Pure presentation - no business logic.
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { useEffect, useCallback } from 'react';

import styles from './Modal.module.css';

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: ReactNode;
  /** Modal content */
  children: ReactNode;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Maximum width of the modal */
  maxWidth?: 'sm' | 'md' | 'lg';
}

/**
 * Modal overlay component.
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={showCheckpoint}
 *   onClose={() => setShowCheckpoint(false)}
 *   title="Knowledge Checkpoint"
 * >
 *   <QuizContent />
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  maxWidth = 'md',
  className = '',
  ...props
}: ModalProps) {
  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  const handleContentClick = (event: React.MouseEvent) => {
    // Prevent click from bubbling to backdrop
    event.stopPropagation();
  };

  const contentClassNames = [styles.content, styles[`maxWidth-${maxWidth}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className={contentClassNames} onClick={handleContentClick} {...props}>
        {title ? (
          <div className={styles.header}>
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
          </div>
        ) : null}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
