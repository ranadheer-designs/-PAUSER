🔒 Pauser — Locked Design Language Prompt (For Antigravity)

Use this prompt verbatim at the top of any Antigravity task that touches UI, UX, frontend code, or visuals.

SYSTEM / DESIGN CONTRACT

You are designing for Pauser, a premium learning platform that transforms long-form video content into deep, focused, psychology-backed learning sessions (checkpoints, quizzes, flashcards, code challenges, spaced repetition, and DeepFocus mode).

This design language is LOCKED.
Do not deviate unless explicitly instructed.

All UI, components, layouts, and interactions must strictly follow the design system below.

1. Core Design Philosophy

Pauser is a thinking tool, not a content feed.

The UI must feel calm, focused, authoritative, and premium.

Every screen should reduce cognitive load and support sustained attention.

Progress should feel earned and meaningful, not gamified or playful.

The product should feel like a serious study companion users return to daily.

2. Visual Identity (Non-Negotiable)
Color System (Use Exactly)

Background (global): #0B0D0F

Primary Surface / Panels: #0F1316

Secondary Surface: #111418

Primary Brand / Focus Color: #3B4BD8 (deep indigo)

Accent / Success / Active: #22C3A6 (muted teal)

Highlight / Interactive: #6E5AF2

Primary Text: #E6EEF8

Secondary Text: #98A0B2

Muted UI Text: #6F7A96

Error: #F06A6A

❌ Do not introduce additional colors
❌ Do not use bright gradients or saturated primaries

3. Typography (Strict)

Primary UI font: Inter (variable)

Weights: 400 / 500 / 600 / 700

Headings: Inter SemiBold (600)

Code & technical content: JetBrains Mono

Generous line-height for reading-heavy content

Type Scale (Desktop Baseline)

H1: 28px / 40px

H2: 20px / 32px

H3: 16px / 24px

Body: 16px / 24px

Small: 13px / 20px

4. Layout & Spacing

12-column grid, max width: 1400px

Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96

Border radius:

Cards: 8px

Modals / overlays: 14px

Depth is subtle and restrained

Panels: soft shadows only

No heavy borders, no neon glows

5. Core UI Components (Required)

Antigravity must always design and compose from these primitives:

Dashboard KPI cards (flat, restrained)

Priority Queue / Session card

DeepFocus video player (distraction-free)

Knowledge Checkpoint modal (centered, calm, authoritative)

Code Challenge IDE layout (left task → center editor → right tests)

Review Queue / Flashcards (keyboard-friendly)

Session timeline (locked / unlocked states)

Buttons: Primary, Secondary, Ghost

Inputs: clean, low-contrast, focus-ring only on interaction

Toasts/snackbars: subtle, non-intrusive

6. DeepFocus Mode (Critical)

DeepFocus is Pauser’s signature experience.

Rules:

No visual clutter.

No forward-seeking indicators when locked.

Locked states feel supportive, not punitive.

Checkpoints appear as calm overlays, not interruptions.

Progress indicators are minimal and linear.

DeepFocus should feel like entering a protected cognitive space.

7. Motion & Interaction

Motion is functional, never decorative.

Timing:

Micro feedback: 120–180ms

Panels/modals: 240–360ms

Button press: scale 0.98

Card hover: subtle lift + shadow

Correct answer: soft pulse or glow (no confetti)

Incorrect answer: gentle 70ms shake

8. Accessibility & Usability

Minimum contrast: WCAG AA (4.5:1 for text)

Keyboard-first interactions required

Clear focus states (outline or glow using brand color)

No reliance on color alone to indicate state

9. Explicit Anti-Patterns (Never Do This)

❌ Social-feed layouts
❌ Badge walls or gamified visuals
❌ Bright gradients or neon accents
❌ YouTube-like UI patterns
❌ Cluttered card stacks
❌ Dense dashboards without breathing room

If a design feels “fun” before it feels “focused,” it is wrong.

10. Output Expectations from Antigravity

When generating UI or frontend code, always:

Use the Pauser color tokens and typography exactly

Export or define CSS variables / theme tokens

Keep components composable and scalable

Favor clarity over visual novelty

Comment code where design intent matters

If unsure, default to simpler, calmer, more restrained.

11. Naming & Tone

Platform name: Pauser

Voice: calm, intelligent, concise

Microcopy is supportive, not hype-driven

Avoid emojis, slang, or exclamation-heavy copy

12. Acceptance Check (Self-Validate)

Before finalizing any output, confirm:

Does this reduce cognitive load?

Does this feel premium and timeless?

Would a serious learner trust this?

Is DeepFocus respected?

Does it visually match the locked Pauser aesthetic?

If any answer is “no,” revise.
