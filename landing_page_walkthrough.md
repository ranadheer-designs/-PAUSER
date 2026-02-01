# Premium Landing Page Walkthrough

## 1. Overview
A new high-conversion landing page has been implemented at [http://localhost:3000](http://localhost:3000). The page adheres to the "Focused" design language: dark, calm, and premium.

## 2. Key Features
- **Hero Section**: 
  - Abstract timeline background.
  - "Notes that sync with your mind" value prop.
  - Smooth entrance animations.
  - Removed clutter (no scroll indicators).

- **Parallax Feature Showcases**:
  - **Bookmarks**: Explains timestamped noting. Asset: `bookmark-feature.png` (3D isometric).
  - **DeepFocus**: Explains distraction-free mode. Asset: `focus-bg.png` (Abstract glow).
  - **Animation**: Elements fade in and slide as you scroll. Logic uses `framer-motion`'s `useScroll` for a repeatable, premium feel.

- **Integration**:
  - **Auth**: Clicking "Get Started" opens the existing `AuthModal` (Sign In / Sign Up).
  - **Demo**: "Try Demo" deep-links to the sample video.

- **Tech Stack**:
  - `Next.js` App Router
  - `Framer Motion` for interactions
  - `CSS Modules` for scoped, performant styling
  - `Next/Image` for optimized assets

## 3. Design Polish
- **Color Palette**: Strict adherence to `#0B0D0F` (bg) and `#3B4BD8` (accent).
- **Typography**: Inter font with specific weightings.
- **Blending**: Assets use `mix-blend-mode: screen` for seamless integration with the dark mode.

## 4. How to Verify
1. Open [http://localhost:3000](http://localhost:3000).
2. Scroll down slowly to observe the parallax effect on images and text.
3. Scroll back up to see the animation reset and replay (repeatable).
4. Click "Get Started" to verify the Sign In modal appears.
