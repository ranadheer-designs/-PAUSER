/**
 * DeepFocus Components
 * 
 * Core components for the DeepFocus learning experience.
 * 
 * Cognitive Checkpoint Components:
 * - PredictionCheckpoint: Prediction Before Reveal
 * - ExplainItBackCheckpoint: Teaching concepts back
 * - OneSentenceRuleCheckpoint: Compression exercises
 * - SnapshotCheckpoint: Understanding Snapshot
 * - PracticeCheckpoint: LeetCode/HackerRank problem suggestions
 */

// Core player
export { VideoPlayer } from './VideoPlayer';
export type { VideoPlayerHandle } from './VideoPlayer';

// Checkpoint overlay
export { CheckpointOverlay } from './CheckpointOverlay';

// Cognitive checkpoint components
export { PredictionCheckpoint } from './PredictionCheckpoint';
export { ExplainItBackCheckpoint } from './ExplainItBackCheckpoint';
export { OneSentenceRuleCheckpoint } from './OneSentenceRuleCheckpoint';
export { SnapshotCheckpoint } from './SnapshotCheckpoint';
export { PracticeCheckpoint } from './PracticeCheckpoint';

// Practice sidebar
export { PracticeSidebar } from './PracticeSidebar';

// Smart Sidebar (replaces overlay-based checkpoints)
export { SmartSidebar } from './SmartSidebar';
export type { SmartSidebarProps } from './SmartSidebar';

// Notes
export { NotesPanel } from './NotesPanel';
export { NoteEditor } from './NoteEditor';

// Modals
export { AuthPromptModal } from './AuthPromptModal';
export { PaywallModal } from './PaywallModal';

// Adaptive Checkpoint Components (Phase 2)
export { CodePracticeCheckpoint } from './CodePracticeCheckpoint';
export { ConceptQuizCheckpoint } from './ConceptQuizCheckpoint';
export { ReflectionCheckpoint } from './ReflectionCheckpoint';

// Embedded Experiences (Phase 3)
export { EmbeddedCodeEditor } from './EmbeddedCodeEditor';
export { ColorPaletteStudio } from './ColorPaletteStudio';
export { EmbeddedResearchPanel } from './EmbeddedResearchPanel';

// Smart Video Player (Phase 4)
export { SmartVideoPlayer } from './SmartVideoPlayer';
export { CheckpointTimeline } from './CheckpointTimeline';
