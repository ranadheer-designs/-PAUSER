'use client';

/**
 * NotesSection Component
 * Displays notes grouped by video.
 * Supports AI-organized view toggle per video group.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getNotesWithVideos, deleteNote } from '@/actions/notes';
import { AIService } from '@pauser/common';
import type { NoteWithVideo, OrganizedNotesSection } from '@pauser/common';
import { AddVideoModal } from './AddVideoModal';
import { generateNotesHash, getCachedOrganizedNotes, setCachedOrganizedNotes } from '@/utils/organizedNotesCache';
import styles from './NotesSection.module.css';

interface VideoGroup {
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  notes: NoteWithVideo[];
  lastUpdated: Date;
}

type ViewMode = 'raw' | 'organized';

interface GroupViewState {
  mode: ViewMode;
  isOrganizing: boolean;
  organizedSections: OrganizedNotesSection[] | null;
  error: string | null;
}

export function NotesSection() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteWithVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  
  // Track view state per video group
  const [groupViewStates, setGroupViewStates] = useState<Record<string, GroupViewState>>({});
  
  // Track collapsed state per video group (collapsed by default)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleCollapse = (videoId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [videoId]: !prev[videoId] // Toggle: undefined/false -> true (expanded), true -> false (collapsed)
    }));
  };

  const isExpanded = (videoId: string) => {
    return collapsedGroups[videoId] === true; // Only expanded if explicitly set to true
  };

  useEffect(() => {
    async function fetchNotes() {
      try {
        setLoading(true);
        const data = await getNotesWithVideos();
        // Sort by updated desc
        data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setNotes(data);
      } catch (err) {
        console.error('Failed to load notes', err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, []);

  const handleDelete = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note?')) return;
    
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle toggle for a specific video group
  const handleGroupToggle = useCallback(async (videoId: string, mode: ViewMode, groupNotes: NoteWithVideo[]) => {
    const currentState = groupViewStates[videoId] || { 
      mode: 'raw', 
      isOrganizing: false, 
      organizedSections: null, 
      error: null 
    };

    if (mode === 'raw') {
      setGroupViewStates(prev => ({
        ...prev,
        [videoId]: { ...currentState, mode: 'raw' }
      }));
      return;
    }

    // mode === 'organized'
    if (currentState.organizedSections) {
      setGroupViewStates(prev => ({
        ...prev,
        [videoId]: { ...currentState, mode: 'organized' }
      }));
      return;
    }

    // Need to organize
    if (groupNotes.length < 2) {
      setGroupViewStates(prev => ({
        ...prev,
        [videoId]: { ...currentState, mode: 'organized', error: 'Need 2+ notes to organize' }
      }));
      return;
    }

    // Check cache
    const notesForHash = groupNotes.map(n => ({
      id: n.id,
      body: n.body,
      startTimeSeconds: n.startTimeSeconds,
    }));
    const hash = generateNotesHash(notesForHash);
    const cached = getCachedOrganizedNotes(videoId, hash);

    if (cached) {
      setGroupViewStates(prev => ({
        ...prev,
        [videoId]: { mode: 'organized', isOrganizing: false, organizedSections: cached.sections, error: null }
      }));
      return;
    }

    // Start organizing
    setGroupViewStates(prev => ({
      ...prev,
      [videoId]: { ...currentState, mode: 'organized', isOrganizing: true, error: null }
    }));

    try {
      const openRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
      const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      const apiKey = openRouterKey || geminiKey;
      
      if (!apiKey) throw new Error('API key not configured');

      console.log('[NotesSection] Organizing notes for video:', videoId);

      const aiService = new AIService({
        enabled: true,
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        apiKey,
      });

      const result = await aiService.organizeNotes({ notes: notesForHash });

      if (!result || result.sections.length === 0) throw new Error('AI could not organize notes');

      // Cache result
      setCachedOrganizedNotes(videoId, {
        sections: result.sections,
        generatedAt: new Date().toISOString(),
        notesHash: hash,
      });

      setGroupViewStates(prev => ({
        ...prev,
        [videoId]: { mode: 'organized', isOrganizing: false, organizedSections: result.sections, error: null }
      }));

    } catch (err) {
      setGroupViewStates(prev => ({
        ...prev,
        [videoId]: { mode: 'organized', isOrganizing: false, organizedSections: null, error: err instanceof Error ? err.message : 'Failed' }
      }));
    }
  }, [groupViewStates]);

  const groupedNotes = useMemo(() => {
    const groups: Record<string, VideoGroup> = {};
    
    const filtered = notes.filter(n => 
      n.body.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (n.video?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.forEach(note => {
      const videoId = note.video?.externalId || note.contentId;
      if (!groups[videoId]) {
        groups[videoId] = {
          videoId,
          videoTitle: note.video?.title || 'Unknown Video',
          thumbnailUrl: note.video?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/default.jpg`,
          notes: [],
          lastUpdated: new Date(note.updatedAt)
        };
      }
      groups[videoId].notes.push(note);
      if (new Date(note.updatedAt) > groups[videoId].lastUpdated) {
        groups[videoId].lastUpdated = new Date(note.updatedAt);
      }
    });

    // Sort groups by lastUpdated
    return Object.values(groups).sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }, [notes, searchTerm]);

  if (loading) return <div className={styles.loading}>Loading notes...</div>;

  if (notes.length === 0) {
    return (
      <>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No notes yet</p>
          <p className={styles.emptyDesc}>Take notes while watching videos. They'll sync automatically here.</p>
          <button className={styles.addVideoBtn} onClick={() => setShowAddVideoModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Video
          </button>
        </div>
        <AddVideoModal isOpen={showAddVideoModal} onClose={() => setShowAddVideoModal(false)} />
      </>
    );
  }

  return (
    <div>
      <div className={styles.controls}>
        <input 
          type="text" 
          placeholder="Search notes..." 
          className={styles.searchInput}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles.gridContainer}>
        {groupedNotes.map(group => {
          const viewState = groupViewStates[group.videoId] || { 
            mode: 'raw', 
            isOrganizing: false, 
            organizedSections: null, 
            error: null 
          };
          const canOrganize = group.notes.length >= 2;

          return (
            <div 
              key={group.videoId} 
              className={styles.card}
              style={{ height: 'auto', minHeight: '200px' }}
            >
              <div className={styles.cardHeader}>
                <div 
                  className={styles.cardHeaderContent}
                  onClick={() => {
                    const lastNote = group.notes[0];
                    router.push(`/deepfocus/${group.videoId}?t=${Math.floor(lastNote?.startTimeSeconds || 0)}`);
                  }}
                >
                  <img src={group.thumbnailUrl} alt="" className={styles.cardThumbnail} />
                  <div className={styles.cardMeta}>
                    <div className={styles.cardVideoTitle} title={group.videoTitle}>
                      {group.videoTitle}
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>
                      {group.notes.length} note{group.notes.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <button 
                  className={`${styles.collapseBtn} ${isExpanded(group.videoId) ? styles.expanded : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleCollapse(group.videoId); }}
                  title={isExpanded(group.videoId) ? 'Collapse notes' : 'Expand notes'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {/* Collapsible content */}
              {isExpanded(group.videoId) && (
                <>
                  {/* View Toggle */}
                  {canOrganize && (
                    <div className={styles.cardViewToggle}>
                      <button
                        className={`${styles.cardToggleBtn} ${viewState.mode === 'raw' ? styles.cardToggleActive : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleGroupToggle(group.videoId, 'raw', group.notes); }}
                      >
                        Raw
                      </button>
                      <button
                        className={`${styles.cardToggleBtn} ${viewState.mode === 'organized' ? styles.cardToggleActive : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleGroupToggle(group.videoId, 'organized', group.notes); }}
                        disabled={viewState.isOrganizing}
                      >
                        {viewState.isOrganizing ? '...' : 'Organized'}
                      </button>
                    </div>
                  )}

              {/* Organized View */}
              {viewState.mode === 'organized' && viewState.organizedSections && (
                <div className={styles.organizedView}>
                  <div className={styles.organizedBadge}>✨ AI-organized</div>
                  {viewState.organizedSections.filter(s => s.items.length > 0).map(section => (
                    <div key={section.type} className={styles.organizedSection}>
                      <div className={styles.organizedSectionTitle}>{section.label}</div>
                      {section.items.map((item, idx) => (
                        <div 
                          key={`${item.noteId}-${idx}`} 
                          className={styles.organizedItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/deepfocus/${group.videoId}?t=${Math.floor(item.timestamp)}`);
                          }}
                        >
                          <span className={styles.cardNoteTimestamp}>{formatTimestamp(item.timestamp)}</span>
                          <span className={styles.organizedItemText}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Organized Error */}
              {viewState.mode === 'organized' && viewState.error && (
                <div className={styles.organizedError}>
                  {viewState.error}
                </div>
              )}

                  {/* Raw Notes List */}
                  {viewState.mode === 'raw' && (
                    <div className={styles.cardNoteList}>
                      {group.notes.map(note => (
                        <div 
                          key={note.id}
                          className={styles.cardNoteItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/deepfocus/${group.videoId}?t=${Math.floor(note.startTimeSeconds)}`);
                          }}
                        >
                          <div className={styles.cardNoteHeader}>
                            <span className={styles.cardNoteTimestamp}>
                              {formatTimestamp(note.startTimeSeconds)}
                            </span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className={styles.cardNoteDate}>
                                {new Date(note.updatedAt).toLocaleDateString()}
                              </span>
                              <button 
                                className={styles.deleteBtn}
                                onClick={(e) => handleDelete(note.id, e)}
                                title="Delete note"
                                style={{ padding: 2, opacity: 0.6 }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div className={styles.cardNoteBody}>
                            {note.body || 'Empty note'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className={styles.cardFooter}>
                <div className={styles.cardDate}>
                  Last updated {group.lastUpdated.toLocaleDateString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

