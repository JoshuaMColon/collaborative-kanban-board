# Collaborative Board

Collaborative Board is a real-time collaborative Kanban workspace for teams that need a shared view of work in progress. It combines a focused, operations-style interface with Supabase authentication, database persistence, and live collaboration signals.

This project demonstrates how I approach a product feature from both sides of the interface: designing a clear workflow for repeated use and building the state, data, and interaction model needed to make that workflow reliable.

## Why I Built It

Many Kanban demos stop at local drag-and-drop state. This project explores the harder product questions behind a shared board:

- How should a board feel when multiple people are active at once?
- How can drag-and-drop remain responsive while the database update is still in flight?
- How should client state recover when a write is rejected or fails?
- Which interactions deserve keyboard-friendly, inline controls instead of extra navigation?

## Highlights

- Email/password sign-up and sign-in through Supabase Auth
- Realtime synchronization for card and list changes across connected clients
- Supabase Presence indicators showing who is currently online
- Drag-and-drop card movement within and between lists with fractional ordering
- Create, edit, and delete cards, including descriptions and priority levels
- Create and delete lists, with confirmation before destructive actions
- Inline board title editing with persistence
- Optimistic UI updates with refetch recovery when a database write fails
- Responsive horizontal board layout for desktop and smaller screens
- Persisted light and dark themes with system-preference detection
- TypeScript domain models that keep UI data separate from Supabase's snake_case rows

## Technical Approach

| Area        | Implementation                                             |
| ----------- | ---------------------------------------------------------- |
| UI          | React 19, TypeScript, Tailwind CSS                         |
| Tooling     | Vite, Oxlint, PostCSS                                      |
| Interaction | `@dnd-kit/core` and `@dnd-kit/sortable`                    |
| Backend     | Supabase Auth, Postgres, Realtime, and Presence            |
| State model | Focused hooks for authentication, board data, and presence |

The board uses a stable collision-detection strategy so a dragged card does not flicker between drop targets while crossing gaps. Card ordering uses numeric gaps and midpoint values, which lets the client insert cards without immediately renumbering an entire list. Database rows are mapped into frontend models through a dedicated mapper layer, keeping persistence details out of components.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- A Supabase project with Auth enabled
- A board and its `boards`, `lists`, and `cards` tables configured in Supabase
- Realtime enabled for the `cards` and `lists` tables

### Installation

```bash
npm install
```

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TEST_BOARD_ID=your-board-uuid
```

### Live Demo

[Collaborative Board](https://collaborative-kanban-board-gold.vercel.app/)

Other useful commands:

```bash
npm run build    # Type-check and create a production build
npm run lint     # Run Oxlint
npm run preview  # Preview the production build locally
```

The app intentionally fails with a visible setup message when the Supabase variables or board ID are missing. This makes configuration problems easy to diagnose during local development.

## Project Structure

```text
src/
  components/  Board, cards, lists, auth, and presence UI
  hooks/       Auth, board data, and realtime presence behavior
  lib/         Supabase client, identity helpers, and row mappers
  data/        Sample domain data used during early UI development
  types.ts     Shared board, card, list, and presence models
```

## Current Scope

The core board workflow is implemented and connected to Supabase. Comments and profile records are represented in the TypeScript model but are not persisted in the current database schema. Assignee identity is currently derived deterministically from a user's ID until a profiles table is added.

Potential next iterations include persisted comments, profile management, board membership and invitation flows, richer card-level presence, automated tests for ordering and realtime reconciliation, and CI checks for type safety and linting.

## What This Project Shows

This is a portfolio project focused on practical frontend engineering: translating a collaborative workflow into a usable interface, managing asynchronous and realtime state, handling optimistic updates and failures, and keeping the codebase small enough to reason about as the product grows.
