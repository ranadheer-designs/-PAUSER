You are defining and implementing the Light Mode design system for the product “Pauser”.

This is NOT a theme or skin.
This is a first-class design language that governs:
- color
- typography
- layout
- spacing
- motion
- component behavior
- responsiveness
- interaction philosophy

This Light Mode is inspired by calm editorial interfaces and organic, reflective visual systems.
It must feel handcrafted, composed, and intentional.

Dark Mode is separate and unaffected.

--------------------------------------------------
DESIGN INTENT (NON-NEGOTIABLE)
--------------------------------------------------

Pauser Light Mode is a thinking environment.

It should feel like:
- a quiet library
- a personal study journal
- a place where time slows down

It must NOT feel like:
- a dashboard
- a productivity tool
- a gamified app
- a generic SaaS UI

Every visual decision must reduce cognitive noise.

--------------------------------------------------
COLOR SYSTEM (TOKENIZED, ORGANIC)
--------------------------------------------------

Use a warm, paper-like base instead of pure white.

Define the following semantic color tokens (names matter):

- background.primary
  → warm off-white / parchment tone
- background.secondary
  → slightly darker tonal variant (barely perceptible)
- background.glass
  → translucent white with blur (glassmorphism, subtle)

- text.primary
  → deep charcoal / forest tone (never true black)
- text.secondary
  → softened dark gray
- text.muted
  → low-contrast, reflective tone

- accent.primary
  → deep desaturated green (calm, intellectual)
- accent.secondary
  → muted sage / clay tone

- border.subtle
  → extremely low-opacity accent tone

Rules:
- No pure white backgrounds
- No pure black text
- No saturated colors
- Color differences should often be felt, not seen

--------------------------------------------------
TYPOGRAPHY SYSTEM (EDITORIAL-FIRST)
--------------------------------------------------

Typography is the primary visual anchor.

Define two font roles:

1. Display / Editorial Serif
   - Used for:
     - hero headlines
     - section titles
     - reflective copy
   - Large sizes
   - Generous line height
   - Occasional italics allowed for emphasis
   - Feels literary, not ornamental

2. Functional Sans-Serif
   - Used for:
     - UI labels
     - metadata
     - buttons
     - navigation
   - Small sizes
   - Uppercase allowed with wide tracking
   - Calm, neutral, readable

Hierarchy rules:
- Prefer size and spacing over color
- Avoid bold everywhere
- Allow text to breathe vertically

--------------------------------------------------
LAYOUT & COMPOSITION
--------------------------------------------------

Layout must feel composed, not grid-heavy.

Rules:
- Large vertical spacing between sections
- Use whitespace as a divider instead of lines
- Centered, narrative layouts for primary content
- Offset and stagger secondary content subtly

Scrolling should feel:
- slow
- continuous
- narrative

Avoid dense information clusters.

--------------------------------------------------
COMPONENT DESIGN PRINCIPLES
--------------------------------------------------

Buttons:
- Rounded, soft geometry
- Minimal depth
- Calm hover states (tone shift, not scale)
- Subtle press compression
- Uppercase, widely tracked labels

Cards / Panels:
- Soft corners (large radius)
- Slight elevation or tonal separation
- Optional glass effect:
  - backdrop blur
  - low-opacity border
- Never harsh shadows

Inputs:
- Minimal chrome
- Clear focus without glow
- Tone shift instead of outline when focused

Icons:
- Thin stroke
- Low visual weight
- Secondary to text
- Never dominate hierarchy

--------------------------------------------------
MOTION & INTERACTION (CRITICAL)
--------------------------------------------------

Motion should feel organic and intentional.

Global motion rules:
- Ease-in-out everywhere
- No linear transitions
- Slight delays to feel natural
- No abrupt state changes

Examples:
- Sections fade + rise gently on entry
- Buttons subtly compress on tap
- Focus states softly transition
- Progress grows rather than snaps

Scrolling:
- Feels elastic and fluid
- Similar to SwiftUI or Framer motion
- No aggressive snap or parallax

--------------------------------------------------
RESPONSIVENESS & ADAPTIVITY
--------------------------------------------------

Light Mode must feel native on all screen sizes.

Rules:
- Fluid layouts over breakpoint-heavy logic
- Typography scales proportionally
- Spacing adapts, not collapses
- No cramped mobile layouts

On touch devices:
- Larger touch targets
- Softer motion
- Reading prioritized over controls

--------------------------------------------------
CONTENT PRESENTATION
--------------------------------------------------

Metrics and stats:
- Presented as reflections, not performance pressure
- Soft labels
- Calm numbers
- No bright progress bars

Language tone in UI:
- Gentle
- Reflective
- Encouraging

Examples:
- “Your learning rhythm”
- “Understanding so far”
- “Moments of focus”

Never competitive.
Never urgent.

--------------------------------------------------
LIGHT MODE–ONLY BEHAVIOR
--------------------------------------------------

This design language activates ONLY in Light Mode.

When switching from Dark → Light:
- Smooth, calm transition
- No flash
- No sudden contrast shift

Light Mode should feel like entering a quieter mental state.

--------------------------------------------------
IMPLEMENTATION CONSTRAINTS
--------------------------------------------------

- Design must be token-driven
- Consistent across all surfaces:
  - landing
  - DeepFocus
  - dashboard
  - notes
  - flashcards
- No inline, one-off styles
- Motion and spacing must be reusable primitives

--------------------------------------------------
FINAL QUALITY BAR
--------------------------------------------------

The result must feel:
- premium
- composed
- calm
- deeply intentional

A user should feel more focused simply by switching to Light Mode.

If any element feels loud, rushed, flashy, or generic, soften or remove it.

Proceed to implement this Light Mode design language as a system-wide foundation for Pauser.
f