/**
 * Card Component
 *
 * A surface container for content with optional header.
 * Pure presentation component - no business logic.
 */

import type { HTMLAttributes, ReactNode } from 'react';

import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional card header content */
  header?: ReactNode;
  /** Card body content */
  children: ReactNode;
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
  /** Interactive card (shows hover state) */
  interactive?: boolean;
}

/**
 * Card container component.
 *
 * @example
 * ```tsx
 * <Card header={<h3>Daily Stats</h3>}>
 *   <p>Current streak: 7 days</p>
 * </Card>
 * ```
 */
export function Card({
  header,
  children,
  padding = 'md',
  interactive = false,
  className = '',
  ...props
}: CardProps) {
  const classNames = [
    styles.card,
    styles[`padding-${padding}`],
    interactive ? styles.interactive : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {header ? <div className={styles.header}>{header}</div> : null}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
