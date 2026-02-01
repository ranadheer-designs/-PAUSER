'use client';

/**
 * PracticeSidebar Component
 *
 * A resizable sidebar for embedding practice problems (LeetCode, HackerRank, etc.)
 * Allows users to attempt problems while watching the video.
 *
 * Features:
 * - Resizable width (drag to resize)
 * - Collapsible (minimize to icon)
 * - Fallback to "Open in New Tab" if iframe is blocked
 * - Remembers user's preferred width
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import styles from './PracticeSidebar.module.css';

interface PracticeSidebarProps {
  url: string;
  title: string;
  platform?: 'leetcode' | 'hackerrank' | 'codewars';
  onClose: () => void;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const STORAGE_KEY = 'pauser-practice-sidebar-width';

export function PracticeSidebar({
  url,
  title,
  platform = 'leetcode',
  onClose,
  defaultWidth = 500,
  minWidth = 350,
  maxWidth = 800,
}: PracticeSidebarProps) {
  // Load saved width from localStorage
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : defaultWidth;
    }
    return defaultWidth;
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(width);

  // Save width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, width.toString());
    }
  }, [width]);

  // Handle resize dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minWidth, maxWidth]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Handle iframe error (likely blocked by X-Frame-Options)
  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setIframeBlocked(true);
  }, []);

  // Detect iframe blocking after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        // If still loading after 5s, assume blocked
        setIsLoading(false);
        setIframeBlocked(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleOpenInNewTab = useCallback(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const getPlatformIcon = () => {
    switch (platform) {
      case 'leetcode': return '🟧';
      case 'hackerrank': return '🟩';
      case 'codewars': return '🟥';
      default: return '💻';
    }
  };

  return (
    <div
      ref={sidebarRef}
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
      style={{ width: isCollapsed ? undefined : width }}
    >
      {/* Resizer */}
      {!isCollapsed && (
        <div
          className={styles.resizer}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.platformIcon}>
            {getPlatformIcon()}
          </div>
          <span className={styles.problemTitle}>{title}</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.headerButton}
            onClick={handleOpenInNewTab}
            title="Open in new tab"
          >
            ↗
          </button>
          <button
            className={styles.headerButton}
            onClick={handleToggleCollapse}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '◀' : '▶'}
          </button>
          <button
            className={`${styles.headerButton} ${styles.closeButton}`}
            onClick={onClose}
            title="Close sidebar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Collapsed Indicator */}
      {isCollapsed && (
        <div className={styles.collapsedIndicator}>
          <button
            className={styles.expandButton}
            onClick={handleToggleCollapse}
            title="Expand sidebar"
          >
            {getPlatformIcon()}
          </button>
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <div className={styles.content}>
          {isLoading && !iframeBlocked && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Loading problem...</span>
            </div>
          )}

          {iframeBlocked ? (
            <div className={styles.fallback}>
              <div className={styles.fallbackIcon}>🔒</div>
              <h3 className={styles.fallbackTitle}>Embedding Blocked</h3>
              <p className={styles.fallbackMessage}>
                {platform === 'leetcode' ? 'LeetCode' : platform} doesn't allow embedding 
                in iframes. Click below to open in a new tab.
              </p>
              <button
                className={styles.fallbackButton}
                onClick={handleOpenInNewTab}
              >
                <span>↗</span>
                Open in New Tab
              </button>
            </div>
          ) : (
            <iframe
              className={styles.iframe}
              src={url}
              title={title}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </div>
      )}
    </div>
  );
}
