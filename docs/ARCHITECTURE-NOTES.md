# Timestamped Video Notes - Architecture

## Overview

The Timestamped Video Notes feature enables learners to capture precise, timestamp-linked annotations while watching educational videos in DeepFocus mode. This document explains the design decisions, architecture, and learning benefits of this feature.

## Why Timestamped Notes Improve Learning

### Cognitive Benefits

1. **Active Engagement**: Taking notes forces learners to process information actively rather than passively consuming content.

2. **Contextual Memory**: Linking notes to specific video moments creates stronger memory associations through spatial and temporal context.

3. **Retrieval Practice**: Clicking notes to jump back to specific moments enables spaced repetition and retrieval practice—proven learning techniques.

4. **Reduced Cognitive Load**: Pausing the video while writing prevents split attention between watching and note-taking.

5. **Personalized Learning**: Notes capture individual insights and questions, creating a personalized knowledge base.

### How Pauser Enhances Note-Taking

- **Instant Pause**: Video pauses immediately when "Take Note" is clicked, eliminating context loss
- **Precise Timestamps**: Sub-second accuracy ensures notes link to exact moments
- **Quick Navigation**: Click any note to jump back to that moment instantly
- **Offline Reliability**: Notes are never lost due to network issues
- **Focused UI**: Calm, distraction-free interface supports deep thinking

## Architecture

### Offline-First Design

**Decision**: Use IndexedDB for local storage with background sync to Supabase.

**Rationale**:
- **Reliability**: Notes are saved instantly to local storage, never lost due to network issues
- **Performance**: Zero-latency writes while typing (no network round-trip)
- **User Trust**: Users can see their notes immediately, building confidence in the system
- **Resilience**: Works seamlessly offline, syncs automatically when online

**Trade-offs**:
- Adds complexity with sync conflict resolution
- Requires careful state management across local and remote stores
- Alternative (direct Supabase writes) would be simpler but less reliable

### Data Flow

```
User Action (Take Note)
    ↓
Pause Video + Capture Timestamp
    ↓
Create Note Object
    ↓
Save to IndexedDB (instant)
    ↓
Update UI Optimistically
    ↓
Background Sync to Supabase
    ↓
Mark as Synced
```

### Sync Strategy

**Conflict Resolution**: Last-write-wins based on `updated_at` timestamp.

**Why Last-Write-Wins**:
- Notes are personal (single user, no collaboration)
- Conflicts are rare (same note edited on different devices)
- Simplicity > complexity for MVP
- Easy to reason about and debug

**Retry Logic**:
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 retries per note
- Automatic retry on network reconnection
- Manual sync trigger available

### Component Architecture

```
DeepFocus Page
├── VideoPlayer (with PlayerController interface)
├── NotesPanel
│   ├── "Take Note" Button
│   ├── NotesList
│   └── NoteEditor (active note)
└── CheckpointOverlay (existing)
```

**PlayerController Interface**: Abstract interface for video player control, enabling:
- Consistent API across different video sources
- Programmatic control (pause, play, seek)
- Timestamp capture with high accuracy
- Future extensibility (Vimeo, custom players, etc.)

### State Management

**useNotes Hook**: Centralized notes state management with:
- Local-first CRUD operations
- Optimistic UI updates
- Background sync coordination
- Error handling and retry logic

**Benefits**:
- Single source of truth for notes state
- Reusable across components
- Testable in isolation
- Clear separation of concerns

## Database Schema

### Notes Table

```sql
create table public.notes (
  id uuid primary key,
  user_id uuid references profiles(id),
  content_id uuid references contents(id),
  
  -- Timestamp data (sub-second precision)
  start_time_seconds real not null,
  end_time_seconds real,
  
  -- Note content
  title text,
  body text not null,
  
  -- State
  is_draft boolean default true,
  
  -- Sync metadata
  local_id text,
  synced_at timestamp with time zone,
  
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

**Design Decisions**:

1. **`real` for timestamps**: Sub-second precision for accurate seeking
2. **`local_id`**: Client-generated ID for offline sync tracking
3. **`synced_at`**: Tracks last successful sync for conflict resolution
4. **`is_draft`**: Allows saving incomplete notes without publishing
5. **`end_time_seconds`**: Optional, for future range-based notes

### Indexes

```sql
create index idx_notes_user_content on notes(user_id, content_id);
create index idx_notes_timestamp on notes(content_id, start_time_seconds);
create index idx_notes_local_id on notes(local_id) where local_id is not null;
```

**Purpose**:
- Fast queries for user's notes on a specific video
- Efficient ordering by timestamp
- Quick lookup for sync operations

## Security

### XSS Prevention

**Sanitization**: All note content is sanitized before save:
```typescript
function sanitizeNoteContent(content: string): string {
  // Strip HTML tags
  // Encode special characters
  // Limit size to 10KB
}
```

**Why**:
- Prevents malicious script injection
- Protects against stored XSS attacks
- Ensures data integrity

### Row Level Security (RLS)

```sql
create policy "Users manage own notes" on notes
  for all using (auth.uid() = user_id);
```

**Guarantees**:
- Users can only read/write their own notes
- Enforced at database level (not just application)
- Protection against API bypass attacks

### Rate Limiting

**Autosave Debounce**: 500ms delay prevents excessive writes.

**Benefits**:
- Reduces database load
- Prevents abuse
- Improves performance

## Performance Optimizations

1. **Debounced Autosave**: 500ms delay reduces write frequency
2. **Optimistic UI**: Instant feedback without waiting for network
3. **Indexed Queries**: Fast note retrieval via database indexes
4. **Lazy Loading**: Notes loaded only for current video
5. **Background Sync**: Non-blocking sync doesn't interrupt user

## Deep Linking

**URL Format**: `/deepfocus/[videoId]?t=123&noteId=xyz`

**Parameters**:
- `t`: Timestamp in seconds (seeks to this time on load)
- `noteId`: Opens specific note in editor

**Use Cases**:
- Share specific moments with others
- Bookmark important sections
- Resume from exact point later
- Navigate from dashboard notes

## Extension Integration

**YouTube "Take Note" Button**: Injected as overlay on YouTube player.

**TOS Compliance**:
- Uses official YouTube IFrame API
- Does NOT modify YouTube's native UI
- Does NOT block or remove ads
- Does NOT access raw video streams
- Button is separate overlay, not integrated into player controls

**Safety Considerations**:
- Conservative implementation to avoid policy violations
- Documented compliance rationale
- Easy to disable if needed

## Testing Strategy

### Unit Tests

- Timestamp capture accuracy
- Autosave debounce logic
- Seek-on-click behavior
- Sync retry with exponential backoff
- Conflict resolution (last-write-wins)

### Integration Tests

- Dashboard → DeepFocus → Seek flow
- Offline note creation → Online sync
- Deep link navigation with timestamp
- Note editor autosave → Supabase sync

### Manual Testing

- Real video playback with notes
- Offline functionality (network disabled)
- Refresh and tab close scenarios
- Cross-device sync

## Future Enhancements

### Planned

1. **Rich Text Notes**: Markdown support with safe rendering
2. **Note Sharing**: Share notes with other learners
3. **Note Export**: Export notes as PDF or Markdown
4. **Video Annotations**: Highlight specific regions in video
5. **AI Summaries**: Auto-generate note summaries

### Considered but Deferred

1. **Real-time Collaboration**: Complexity outweighs benefit for MVP
2. **Voice Notes**: Requires audio storage and transcription
3. **Drawing Annotations**: Complex UI, unclear learning benefit
4. **Note Templates**: Premature optimization, wait for user feedback

## Lessons Learned

### What Worked Well

1. **Offline-First**: Users love instant saves and offline reliability
2. **PlayerController Abstraction**: Clean separation, easy to test
3. **Optimistic UI**: Feels fast and responsive
4. **Calm Design**: Minimal UI reduces cognitive load

### What Could Be Improved

1. **Sync Conflicts**: Last-write-wins is simple but can lose data
2. **IndexedDB Complexity**: Adds debugging overhead
3. **Type Safety**: More strict types would catch bugs earlier
4. **Error Handling**: Could be more user-friendly

## Conclusion

The Timestamped Video Notes feature transforms passive video watching into active learning. By combining precise timestamp capture, offline-first architecture, and calm UX design, Pauser enables learners to build a personalized knowledge base tied directly to video content.

The architecture prioritizes reliability, performance, and user trust—essential for a learning tool users depend on daily. Future enhancements will build on this foundation to create an even more powerful learning experience.
