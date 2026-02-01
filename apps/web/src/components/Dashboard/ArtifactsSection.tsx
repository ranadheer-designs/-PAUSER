'use client';

/**
 * ArtifactsSection Component (Snapshot-First Redesign)
 * 
 * Displays learning artifacts as a unified timeline of reflections (Snapshots).
 * Legacy artifacts (predictions, rules) are also displayed in this format.
 * Complex filtering is removed to focus on a clean, chronological journey.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllUserArtifacts, convertArtifactToFlashcard, deleteArtifact, deleteArtifactsByContentId, type ArtifactWithVideoInfo } from '@/actions/artifactActions';
import { AddVideoModal } from './AddVideoModal';
import styles from './ArtifactsSection.module.css';

interface VideoGroup {
  videoExternalId: string;
  realContentId: string;
  videoTitle: string;
  videoThumbnailUrl: string | null;
  items: ArtifactWithVideoInfo[];
}

export function ArtifactsSection() {
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<ArtifactWithVideoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());
  
  // Expanded state (Set of videoExternalIds)
  // Default expanded: none (cleaner look initially)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);

  useEffect(() => {
    async function loadArtifacts() {
      try {
        setLoading(true);
        const data = await getAllUserArtifacts();
        // Sort artifacts globally by date descending (newest first)
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setArtifacts(data);
        
        // Auto-expand the most recent video group if there are artifacts
        if (data.length > 0) {
           setExpandedGroups(new Set([data[0].videoExternalId]));
        }
      } catch (err) {
        console.error('[ArtifactsSection] Failed to load:', err);
        setError(err instanceof Error ? err.message : 'Failed to load artifacts');
      } finally {
        setLoading(false);
      }
    }
    loadArtifacts();
  }, []);

  const handleConvert = async (artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (convertingIds.has(artifactId)) return;
    
    setConvertingIds(prev => new Set(prev).add(artifactId));
    try {
      await convertArtifactToFlashcard(artifactId);
      setArtifacts(prev => prev.map(a => 
        a.id === artifactId ? { ...a, convertedToFlashcardId: 'temp-id' } : a
      ));
    } finally {
      setConvertingIds(prev => {
        const next = new Set(prev);
        next.delete(artifactId);
        return next;
      });
    }
  };

  const handleJumpToVideo = (externalId: string, timestamp: number, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/deepfocus/${externalId}?t=${timestamp}`);
  };

  const toggleGroup = (videoId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const handleDelete = async (artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this reflection?')) return;
    
    try {
      await deleteArtifact(artifactId);
      setArtifacts(prev => prev.filter(a => a.id !== artifactId));
    } catch (err) {
      console.error('[ArtifactsSection] Failed to delete:', err);
    }
  };

  const handleDeleteGroup = async (realContentId: string, videoExternalId: string, videoTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete all reflections for "${videoTitle}"? This cannot be undone.`)) return;
    
    try {
      await deleteArtifactsByContentId(realContentId);
      setArtifacts(prev => prev.filter(a => a.videoExternalId !== videoExternalId));
    } catch (err) {
      console.error('[ArtifactsSection] Failed to delete group:', err);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ userText: string; followUpText?: string }>({ userText: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const startEditing = (artifact: ArtifactWithVideoInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(artifact.id);
    setEditFields({
      userText: artifact.userText,
      followUpText: artifact.followUpText || undefined
    });
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleUpdate = async (artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsUpdating(true);
      const { updateArtifact } = await import('@/actions/artifactActions');
      const updated = await updateArtifact(artifactId, editFields);
      setArtifacts(prev => prev.map(a => a.id === artifactId ? { ...a, ...updated } : a));
      setEditingId(null);
    } catch (err) {
      console.error('[ArtifactsSection] Failed to update:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getArtifactTypeLabel = (type: string) => {
    switch (type) {
      case 'prediction': return 'Prediction';
      case 'explanation': return 'Explanation';
      case 'one_sentence_rule': return 'Rule';
      case 'snapshot': return 'Snapshot';
      default: return 'Note';
    }
  };

  // Group by video
  const groups: VideoGroup[] = Object.values(
    artifacts.reduce((acc, curr) => {
      if (!acc[curr.videoExternalId]) {
        acc[curr.videoExternalId] = {
          videoExternalId: curr.videoExternalId,
          realContentId: curr.contentId,
          videoTitle: curr.videoTitle,
          videoThumbnailUrl: curr.videoThumbnailUrl,
          items: []
        };
      }
      acc[curr.videoExternalId].items.push(curr);
      return acc;
    }, {} as Record<string, VideoGroup>)
  );

  // Sort groups by latest artifact date
  groups.sort((a, b) => {
      const dateA = new Date(a.items[0]?.createdAt || 0).getTime();
      const dateB = new Date(b.items[0]?.createdAt || 0).getTime();
      return dateB - dateA;
  });

  if (loading) return <div className={styles.loading}>Loading artifacts...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  if (artifacts.length === 0) {
    return (
      <>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💭</div>
          <p className={styles.emptyTitle}>No reflections yet</p>
          <p className={styles.emptyDesc}>
            Watch a video in DeepFocus and use Checkpoints to pause and reflect on what you're learning.
          </p>
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
    <div className={styles.container}>
      {groups.map(group => {
        const isExpanded = expandedGroups.has(group.videoExternalId);
        
        return (
          <div key={group.videoExternalId}>
            {/* Group Header */}
            <div 
              className={`${styles.group} ${isExpanded ? styles.expanded : ''}`}
            >
                <div 
                  className={styles.groupHeader}
                  onClick={() => toggleGroup(group.videoExternalId)}
                >
                  <img 
                    src={group.videoThumbnailUrl || `https://img.youtube.com/vi/${group.videoExternalId}/mqdefault.jpg`}
                    alt=""
                    className={styles.thumbnail}
                  />
                  
                  <div className={styles.groupInfo}>
                    <span className={styles.groupTitle}>{group.videoTitle}</span>
                    <span className={styles.groupMeta}>{group.items.length} reflections</span>
                  </div>

                  <div className={styles.headerActions}>
                    <button 
                      className={styles.groupDeleteButton}
                      onClick={(e) => handleDeleteGroup(group.realContentId, group.videoExternalId, group.videoTitle, e)}
                      title="Delete all reflections for this video"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                    <div className={styles.chevron}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Group Body (Timeline) */}
                <div className={styles.groupBody}>
                   {/* Sort items by timestamp for timeline view */}
                   {[...group.items]
                     .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
                     .map((artifact) => (
                      <div 
                        key={artifact.id} 
                        className={styles.artifactRow}
                        onClick={(e) => handleJumpToVideo(group.videoExternalId, artifact.timestampSeconds, e)}
                      >
                        <div className={styles.timeColumn}>
                          <span className={styles.timestamp}>
                            {formatTimestamp(artifact.timestampSeconds)}
                          </span>
                          <div className={styles.connector} />
                        </div>

                        <div className={styles.contentColumn}>
                          <div className={styles.card}>
                             <div className={styles.cardHeader}>
                               <span className={styles.typeBadge}>
                                 {getArtifactTypeLabel(artifact.type)}
                               </span>
                               {artifact.conceptName && (
                                 <span className={styles.conceptName}>{artifact.conceptName}</span>
                               )}
                             </div>
                             
                            <div className={styles.cardBody}>
                              {editingId === artifact.id ? (
                                <div className={styles.editForm} onClick={(e) => e.stopPropagation()}>
                                  <div className={styles.editGroup}>
                                    <label className={styles.editLabel}>
                                      {artifact.type === 'prediction' ? 'Your Prediction' : 'Reflection'}
                                    </label>
                                    <textarea 
                                      className={styles.editTextarea}
                                      value={editFields.userText}
                                      onChange={(e) => setEditFields({ ...editFields, userText: e.target.value })}
                                      autoFocus
                                    />
                                  </div>
                                  
                                  {artifact.type === 'prediction' && (
                                    <div className={styles.editGroup}>
                                      <label className={styles.editLabel}>Actual Outcome</label>
                                      <textarea 
                                        className={styles.editTextarea}
                                        value={editFields.followUpText || ''}
                                        onChange={(e) => setEditFields({ ...editFields, followUpText: e.target.value })}
                                        placeholder="What actually happened in the video?"
                                      />
                                    </div>
                                  )}

                                  <div className={styles.editActions}>
                                    <button 
                                      className={styles.cancelButton} 
                                      onClick={cancelEditing}
                                      disabled={isUpdating}
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      className={styles.saveButton} 
                                      onClick={(e) => handleUpdate(artifact.id, e)}
                                      disabled={isUpdating}
                                    >
                                      {isUpdating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {artifact.type === 'prediction' && (
                                    <div className={styles.artifactDetails}>
                                      <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>The Challenge</span>
                                        <p className={styles.detailText}>{artifact.promptUsed}</p>
                                      </div>
                                      <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>My Prediction</span>
                                        <p className={styles.userText}>{artifact.userText}</p>
                                      </div>
                                      {artifact.followUpText ? (
                                        <div className={styles.detailItem}>
                                          <span className={styles.detailLabel}>Actual Outcome</span>
                                          <p className={styles.followUpText}>{artifact.followUpText}</p>
                                        </div>
                                      ) : (
                                        <button 
                                          className={styles.addReflectionButton}
                                          onClick={(e) => startEditing(artifact, e)}
                                        >
                                          + Complete Reflection
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {artifact.type === 'explanation' && (
                                    <div className={styles.artifactDetails}>
                                      <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Target Audience</span>
                                        <p className={styles.detailText}>
                                          {artifact.targetAudience === 'junior' ? 'Junior Developer' : 
                                           artifact.targetAudience === 'past_self' ? 'Past Self' : 'Friend'}
                                        </p>
                                      </div>
                                      <p className={styles.userText}>{artifact.userText}</p>
                                    </div>
                                  )}

                                  {artifact.type === 'one_sentence_rule' && (
                                    <div className={styles.artifactDetails}>
                                      {artifact.requiredKeyword && (
                                        <div className={styles.detailItem}>
                                          <span className={styles.detailLabel}>Required Keyword</span>
                                          <p className={styles.keywordText}>{artifact.requiredKeyword}</p>
                                        </div>
                                      )}
                                      <p className={styles.userText}>{artifact.userText}</p>
                                    </div>
                                  )}

                                  {artifact.type === 'snapshot' && (
                                    <p className={styles.userText}>{artifact.userText}</p>
                                  )}
                                </>
                              )}
                            </div>
                            
                            <div className={styles.cardActions}>
                              <button 
                                className={`${styles.actionButton} ${artifact.convertedToFlashcardId ? styles.converted : ''}`}
                                onClick={(e) => handleConvert(artifact.id, e)}
                                disabled={!!artifact.convertedToFlashcardId || convertingIds.has(artifact.id)}
                                title="Convert this reflection to a flashcard"
                              >
                                {convertingIds.has(artifact.id) ? 'Saving...' : 
                                 artifact.convertedToFlashcardId ? '✓ Flashcard Created' : '+ Create Flashcard'}
                              </button>
                              
                              <button 
                                className={`${styles.actionButton} ${styles.editButton}`}
                                onClick={(e) => startEditing(artifact, e)}
                                title="Edit reflection"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>

                              <button 
                                className={styles.deleteButton}
                                onClick={(e) => handleDelete(artifact.id, e)}
                                title="Delete reflection"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                   ))}
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
