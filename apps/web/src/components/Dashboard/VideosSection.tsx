'use client';

/**
 * VideosSection Component
 * Supports Grid and List views.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getVideosWithCheckpoints, type VideoWithCheckpoints } from '@/actions/getVideosWithCheckpoints';
import { deleteVideoContent } from '@/actions/deleteVideoContent';
import { AddVideoModal } from './AddVideoModal';
import styles from './VideosSection.module.css';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'older', label: 'Older' }
];

export function VideosSection() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoWithCheckpoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'today' | 'week' | 'month' | 'older'>('all');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Helper function to categorize videos by date
  const getDateCategory = (dateString: string): 'today' | 'week' | 'month' | 'older' => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (date >= today) return 'today';
    if (date >= weekAgo) return 'week';
    if (date >= monthAgo) return 'month';
    return 'older';
  };

  // Filter videos based on search and category
  const filteredVideos = videos.filter(video => {
    const matchesSearch = searchQuery === '' || 
      video.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      getDateCategory(video.createdAt) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        const data = await getVideosWithCheckpoints();
        setVideos(data);
      } catch (err) {
        console.error('Failed to load videos', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, video: VideoWithCheckpoints) => {
    e.stopPropagation(); // Prevent navigation
    setConfirmDelete({ id: video.id, title: video.title || 'Untitled Video' });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    
    setDeletingVideoId(confirmDelete.id);
    try {
      const result = await deleteVideoContent(confirmDelete.id);
      if (result.success) {
        // Remove from local state immediately
        setVideos(prev => prev.filter(v => v.id !== confirmDelete.id));
      } else {
        console.error('Failed to delete video:', result.error);
        alert(result.error || 'Failed to delete video');
      }
    } catch (err) {
      console.error('Error deleting video:', err);
      alert('An error occurred while deleting the video');
    } finally {
      setDeletingVideoId(null);
      setConfirmDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  if (loading) return <div className={styles.loading}>Loading history...</div>;

  if (videos.length === 0) {
    return (
      <>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No videos started yet</p>
          <p className={styles.emptyDesc}>Paste a YouTube link to start learning with focused checkpoints.</p>
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
    <>

      <div style={{ position: 'relative', minHeight: '80vh' }}>
        {/* Mobile Controls */}
        <div className={styles.mobileControls}>
           {!isMobileSearchOpen ? (
             <div className={styles.mobileActionsRow}>
                {/* Search Trigger (Top Right) */}
                <button 
                  className={styles.mobileSearchTrigger} 
                  onClick={() => setIsMobileSearchOpen(true)}
                  aria-label="Search"
                >
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                   </svg>
                </button>
             </div>
           ) : (
             <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className={styles.mobileSearchContainer}
             >
                <div className={styles.mobileSearchInputWrapper}>
                  {/* ... standard search input ... */}
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button className={styles.mobileCloseSearch} onClick={() => setIsMobileSearchOpen(false)}>×</button>
                </div>
                
                <div className={styles.mobileFiltersRow}>
                   {/* Horizontal Pills */}
                   <div className={styles.categoryPills}>
                     {CATEGORIES.map(cat => (
                       <button
                         key={cat.id}
                         className={`${styles.pill} ${selectedCategory === cat.id ? styles.active : ''}`}
                         onClick={() => setSelectedCategory(cat.id as any)}
                       >
                         {cat.label}
                       </button>
                     ))}
                   </div>
                   
                   {/* Toggle Group */}
                   <div className={styles.toggleGroup}>
                     <button className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.active : ''}`} onClick={() => setViewMode('grid')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                     </button>
                     <button className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`} onClick={() => setViewMode('list')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>
                     </button>
                   </div>
                </div>
             </motion.div>
           )}
        </div>

        {/* Floating Action Button (Mobile Only) */}
        {!isMobileSearchOpen && (
          <motion.button
            className={styles.fabBtn}
            onClick={() => setShowAddVideoModal(true)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.9 }}
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <line x1="12" y1="5" x2="12" y2="19" />
               <line x1="5" y1="12" x2="19" y2="12" />
             </svg>
          </motion.button>
        )}

        {/* Desktop Controls (Keep strict hidden on mobile via CSS) */}
        <div className={styles.headerControls}>
          <button 
            className={styles.addVideoBtnSmall}
            onClick={() => setShowAddVideoModal(true)}
            title="Add Video"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Video
          </button>
          
          {/* Search Input */}
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className={styles.clearSearch}
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            className={styles.categorySelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as 'all' | 'today' | 'week' | 'month' | 'older')}
          >
            <option value="all">All Videos</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="older">Older</option>
          </select>

          <div className={styles.toggleGroup}>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results summary */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div className={styles.resultsInfo}>
            Showing {filteredVideos.length} of {videos.length} videos
            {searchQuery && <span> matching "{searchQuery}"</span>}
            {selectedCategory !== 'all' && <span> in {selectedCategory === 'today' ? 'Today' : selectedCategory === 'week' ? 'This Week' : selectedCategory === 'month' ? 'This Month' : 'Older'}</span>}
          </div>
        )}

        <motion.div 
          className={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}
          layout
        >
          <AnimatePresence mode='popLayout'>
          {filteredVideos.length === 0 ? (
            // ... (keep no results logic same, just wrapped)
            <motion.div 
              className={styles.noResults}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>No videos found{searchQuery ? ` matching "${searchQuery}"` : ''}</p>
              <button className={styles.clearFiltersBtn} onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                Clear filters
              </button>
            </motion.div>
          ) : filteredVideos.map(video => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              key={video.id} 
              className={viewMode === 'grid' ? styles.card : styles.row}
              onClick={() => router.push(`/deepfocus/${video.externalId}`)}
            >
              {viewMode === 'grid' ? (
                // Grid View
                <>
                  <div className={styles.thumbnailWrapper}>
                    <img 
                       src={video.thumbnailUrl || `https://img.youtube.com/vi/${video.externalId}/mqdefault.jpg`} 
                       alt={video.title}
                       className={styles.thumbnail}
                    />
                    <div className={styles.playOverlay}>
                      <div className={styles.playBtn}>▶</div>
                    </div>
                  </div>
                  {/* Delete button for grid view */}
                  <button 
                    className={styles.deleteBtn}
                    onClick={(e) => handleDeleteClick(e, video)}
                    title="Remove video"
                    disabled={deletingVideoId === video.id}
                  >
                    {deletingVideoId === video.id ? (
                      <span className={styles.spinner}></span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    )}
                  </button>
                  <div className={styles.textColumn}>
                    <div className={styles.title}>{video.title || 'Untitled Video'}</div>
                    <div className={styles.metaInfo}>
                      <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      {video.checkpointCount > 0 && (
                        <span className={styles.badge}>{video.checkpointCount} CP</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                // List View
                <>
                  <img 
                     src={video.thumbnailUrl || `https://img.youtube.com/vi/${video.externalId}/mqdefault.jpg`} 
                     alt={video.title}
                     className={styles.thumbnail}
                  />
                  
                  <div className={styles.textColumn}>
                    <span className={styles.title}>{video.title || 'Untitled Video'}</span>
                    <div className={styles.metaInfo}>
                      {video.checkpointCount > 0 && (
                        <span className={styles.badge}>{video.checkpointCount} checkpoints</span>
                      )}
                      <span>Last active {new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div></div>

                  {/* Actions */}
                  <div className={styles.actions}>
                     <button 
                       className={styles.deleteBtnList}
                       onClick={(e) => handleDeleteClick(e, video)}
                       title="Remove video"
                       disabled={deletingVideoId === video.id}
                     >
                       {deletingVideoId === video.id ? (
                         <span className={styles.spinner}></span>
                       ) : (
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <polyline points="3 6 5 6 21 6" />
                           <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                           <line x1="10" y1="11" x2="10" y2="17" />
                           <line x1="14" y1="11" x2="14" y2="17" />
                         </svg>
                       )}
                     </button>
                     <button className={styles.playBtn} title="Continue watching">▶</button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>
      </div>
      <AddVideoModal isOpen={showAddVideoModal} onClose={() => setShowAddVideoModal(false)} />
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className={styles.modalOverlay} onClick={handleCancelDelete}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className={styles.confirmTitle}>Remove Video?</h3>
            <p className={styles.confirmDesc}>
              Are you sure you want to remove <strong>"{confirmDelete.title}"</strong>? 
              This will also delete all associated checkpoints and notes.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} onClick={handleConfirmDelete}>
                Remove Video
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
