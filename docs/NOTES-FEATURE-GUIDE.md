# Timestamped Video Notes - Feature Guide

## Overview

Timestamped Video Notes allow you to capture precise, timestamp-linked annotations while watching educational videos in DeepFocus mode. Your notes are saved instantly, work offline, and let you jump back to exact moments with a single click.

## Features

### ✨ Core Capabilities

- **Instant Pause & Capture**: Video pauses immediately when you click "Take Note"
- **Sub-Second Accuracy**: Timestamps capture exact moments with high precision
- **Offline-First**: Notes save locally first, sync to cloud automatically
- **Quick Navigation**: Click any note to jump back to that exact moment
- **Autosave**: Notes save automatically as you type (500ms debounce)
- **Deep Links**: Share specific moments via URL with timestamp

### 🎯 Learning Benefits

- **Active Engagement**: Forces you to process information actively
- **Contextual Memory**: Links notes to specific video moments for stronger recall
- **Retrieval Practice**: Enables spaced repetition by revisiting key moments
- **Reduced Cognitive Load**: Pause video while writing to prevent split attention
- **Personalized Knowledge Base**: Build your own learning resource

## How to Use

### Taking Notes in DeepFocus

1. **Navigate to DeepFocus**: Open any video in DeepFocus mode
2. **Click "Take Note"**: Video pauses, editor opens with current timestamp
3. **Write Your Note**: Type your thoughts, insights, or questions
4. **Auto-Save**: Note saves automatically (you'll see "Saved" indicator)
5. **Continue Watching**: Close editor or keep it open while watching

### Navigating with Notes

1. **View Notes Panel**: Right sidebar shows all notes for current video
2. **Click Any Note**: Video seeks to that timestamp, editor opens
3. **Edit Existing Notes**: Click to open, edit, auto-saves changes
4. **See Sync Status**: "Synced" / "Syncing" / "Offline" indicator in panel

### Dashboard Access

1. **Open Dashboard**: Navigate to `/dashboard`
2. **View Notes Section**: See all your notes grouped by video
3. **Click Note**: Opens DeepFocus at that timestamp
4. **Quick Review**: Scan notes without watching full video

### Deep Linking

Share or bookmark specific moments:

```
https://pauser.app/deepfocus/[videoId]?t=123
```

- `t=123`: Seeks to 123 seconds on page load
- `noteId=xyz`: Opens specific note in editor (coming soon)

## Offline Mode

### How It Works

1. **Local Storage**: Notes save to IndexedDB (browser storage) first
2. **Instant Feedback**: See "Saved" immediately, no network delay
3. **Background Sync**: Syncs to Supabase when online
4. **Automatic Retry**: Failed syncs retry with exponential backoff

### Offline Indicators

- **"Synced"**: Note successfully saved to cloud
- **"Syncing..."**: Upload in progress
- **"Offline"**: No network connection, saved locally only

### What Happens Offline

- ✅ Create new notes
- ✅ Edit existing notes
- ✅ Delete notes
- ✅ View all notes
- ❌ Sync to other devices (waits for online)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Take note (coming soon) |
| `Esc` | Close note editor |
| `Ctrl/Cmd + S` | Manual save (auto-saves anyway) |

## Tips & Best Practices

### Effective Note-Taking

1. **Be Concise**: Short, focused notes are easier to review later
2. **Use Timestamps**: Let timestamps handle "when", focus on "what" and "why"
3. **Ask Questions**: Note things you don't understand for later review
4. **Capture Insights**: Write down connections to other concepts
5. **Review Regularly**: Click notes to revisit key moments

### Organization

1. **Use Titles**: Add descriptive titles for quick scanning
2. **Draft Mode**: Mark incomplete notes as drafts
3. **Time Ranges**: Use end timestamp for multi-minute segments (coming soon)
4. **Tags**: Categorize notes with tags (coming soon)

### Performance

1. **Limit Note Size**: Keep notes under 10KB (about 5000 words)
2. **Batch Edits**: Autosave debounces, so edit freely
3. **Sync Regularly**: Connect to internet periodically to sync

## Troubleshooting

### Notes Not Saving

**Symptoms**: "Saving..." never changes to "Saved"

**Solutions**:
1. Check network connection (look for "Offline" indicator)
2. Check browser console for errors
3. Verify IndexedDB is enabled in browser settings
4. Try refreshing the page

### Notes Not Syncing

**Symptoms**: "Offline" indicator persists when online

**Solutions**:
1. Check network connection
2. Verify Supabase credentials in `.env.local`
3. Check browser console for 401/403 errors
4. Try manual sync (refresh page)

### Timestamp Inaccurate

**Symptoms**: Clicking note seeks to wrong time

**Solutions**:
1. Ensure video is fully loaded before taking note
2. Check if video has ads (timestamps may shift)
3. Report issue with video ID and expected vs actual timestamp

### Notes Disappeared

**Symptoms**: Notes missing after refresh

**Solutions**:
1. Check if logged in as same user
2. Check if viewing same video
3. Check browser IndexedDB (DevTools → Application → IndexedDB)
4. Check Supabase dashboard for notes table data

## Technical Details

### Data Storage

- **Local**: IndexedDB (`pauser-notes` database)
- **Cloud**: Supabase (`notes` table)
- **Sync**: Automatic background sync every 30 seconds

### Security

- **XSS Protection**: All content sanitized before save
- **RLS Policies**: Users can only access their own notes
- **Rate Limiting**: Autosave debounced to 500ms

### Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ IE 11 (not supported)

### Performance

- **Write Latency**: <10ms (local save)
- **Sync Latency**: ~200ms (network dependent)
- **Max Note Size**: 10KB (enforced)
- **Max Notes per Video**: Unlimited (performance degrades >1000)

## API Reference

### useNotes Hook

```typescript
const {
  notes,           // Note[] - All notes for current video
  loading,         // boolean - Initial load state
  error,           // string | null - Error message
  createNote,      // (data) => Promise<Note>
  updateNote,      // (id, data) => Promise<void>
  deleteNote,      // (id) => Promise<void>
  refresh,         // () => Promise<void>
} = useNotes({
  contentId: 'video-id',
  userId: 'user-id',
  autoSync: true,
});
```

### PlayerController Interface

```typescript
interface PlayerController {
  getCurrentTime(): number;
  seekTo(seconds: number): Promise<void>;
  pause(): Promise<void>;
  play(): Promise<void>;
  isReady(): boolean;
  getDuration(): number;
  onTimeUpdate(callback: (time: number) => void): () => void;
  onStateChange(callback: (state: PlayerState) => void): () => void;
}
```

## Roadmap

### v1.1 (Next Release)

- [ ] Rich text notes (Markdown support)
- [ ] Note search and filtering
- [ ] Keyboard shortcuts
- [ ] Note export (PDF, Markdown)

### v1.2 (Future)

- [ ] Note sharing with other users
- [ ] AI-generated note summaries
- [ ] Video annotations (highlight regions)
- [ ] Note templates

### v2.0 (Long-term)

- [ ] Real-time collaboration
- [ ] Voice notes with transcription
- [ ] Drawing annotations
- [ ] Mobile app support

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## License

Part of the Pauser platform. See main LICENSE file for details.
