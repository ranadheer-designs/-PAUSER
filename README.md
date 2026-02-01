# Pauser Monorepo

Transform long-form video content into active, psychology-backed learning.

## Architecture

```
pauser/
├── apps/
│   ├── web/              # Next.js 14 web app (DeepFocus)
│   └── extension/        # Chrome Extension (Manifest V3 + React)
├── packages/
│   ├── common/           # Shared types, FSRS algorithm, challenge engine
│   └── ui/               # Design system components
└── supabase/             # Database schema and migrations
```

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (`npm install -g pnpm`)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development (all apps)
pnpm dev

# Or start individual apps
pnpm --filter @pauser/web dev
pnpm --filter @pauser/extension dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm lint:fix` | Fix lint issues |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm test` | Run tests in all workspaces |
| `pnpm clean` | Remove build artifacts |
| `pnpm format` | Format code with Prettier |

## Package Overview

### @pauser/common

Pure TypeScript business logic and types. **No UI dependencies.**

```typescript
import { 
  // Types
  type Video, type Checkpoint, type FSRSCard,
  
  // FSRS Algorithm
  scheduleCard, reviewCard, ReviewRating,
  
  // Challenge Engine
  runChallenge, compareOutputs
} from '@pauser/common';
```

### @pauser/ui

React components following the locked Pauser design language.

```typescript
import { Button, Card, Modal } from '@pauser/ui';
import '@pauser/ui/styles/globals.css';
```

### @pauser/web

Next.js 14 application with App Router. The DeepFocus experience.

### @pauser/extension

Chrome Extension for YouTube integration. Inject checkpoints directly into video playback.

## Development Workflow

### 1. Making Changes to Shared Packages

When modifying `@pauser/common` or `@pauser/ui`:

```bash
# Watch mode for automatic rebuilds
pnpm --filter @pauser/common dev
pnpm --filter @pauser/ui dev
```

Changes will automatically be picked up by the apps.

### 2. Running the Web App

```bash
pnpm --filter @pauser/web dev
# Open http://localhost:3000
```

### 3. Building the Extension

```bash
pnpm --filter @pauser/extension build
# Load dist/ folder in chrome://extensions
```

### 4. Adding Dependencies

```bash
# Add to a specific package
pnpm --filter @pauser/web add <package>

# Add to root (dev dependency)
pnpm add -D <package> -w
```

## Design Principles

1. **Deterministic Correctness** - No AI in grading. All evaluations use stored answer keys.
2. **AI is Optional** - AI can assist, but never blocks core functionality.
3. **Low-RAM Friendly** - Lazy-load assets, minimize bundle size.
4. **Learner-First UX** - Calm, focused, no gamification.
5. **Clean API Boundaries** - Apps and packages communicate via well-defined interfaces.

## Code Style

- **TypeScript**: Strict mode everywhere
- **ESLint**: Enforced rules for consistency
- **Prettier**: Automatic formatting
- **Import Order**: Enforced via ESLint

## License

MIT
