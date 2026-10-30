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
- The database schema from `supabase/migrations/` applied (see [Database](#database-supabase)), plus a row in `boards`

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

## Database (Supabase)

The schema lives in [`supabase/migrations/`](supabase/migrations/) and is applied with the Supabase CLI (`supabase db push`).

- **Schema:** `boards` (with an `owner_id`), `board_members` (reserved for future multi-board invites), `lists`, and `cards`. Deleting a board cascades to its lists and cards, and deleting a list cascades to its cards. Indexes cover every foreign key and the `(board_id, "order")` / `(list_id, "order")` lookups the app runs.
- **Row-level security:** RLS is on for every table and only signed-in (`authenticated`) users can read or write; `anon` has no table privileges, and `TRUNCATE` is revoked. All signed-in users share the board model (no membership checks yet), but **deleting a board is owner-only**. Users can only see or remove their own `board_members` rows.
- **Realtime:** `boards`, `lists`, and `cards` are in the `supabase_realtime` publication with `REPLICA IDENTITY FULL`, so update and delete events carry the full old row to every subscriber.
- **Server-side card codes:** a `BEFORE INSERT` trigger assigns the next `MAN-###` code from a sequence whenever `code` is null or blank, and `UNIQUE (board_id, code)` prevents duplicates. The client inserts cards without a code and reads the created row back.
- **Timestamps:** a `BEFORE UPDATE` trigger keeps `cards.updated_at` current.

**Existing project:** `20260710000000_baseline_schema.sql` documents the tables that were originally created in the dashboard. It is idempotent but was never run as a migration, so on the existing hosted project mark it as applied before pushing:

```bash
supabase migration repair --status applied 20260710000000
```

On a fresh project, `supabase db push` applies the baseline and every later migration in order.

## Project Structure

```text
src/
  components/  Board, cards, lists, auth, and presence UI
    reactbits/ Components adapted from React Bits (see Credits)
  hooks/       Auth, board data, and realtime presence behavior
  lib/         Supabase client, identity helpers, and row mappers
  data/        Sample domain data used during early UI development
  types.ts     Shared board, card, list, and presence models
supabase/
  migrations/  Postgres schema, RLS policies, realtime, and triggers
```

## Current Scope

The core board workflow is implemented and connected to Supabase. Comments and profile records are represented in the TypeScript model but are not persisted in the current database schema. Assignee identity is currently derived deterministically from a user's ID until a profiles table is added.

Potential next iterations include persisted comments, profile management, board membership and invitation flows, richer card-level presence, automated tests for ordering and realtime reconciliation, and CI checks for type safety and linting.

## What This Project Shows

This is a portfolio project focused on practical frontend engineering: translating a collaborative workflow into a usable interface, managing asynchronous and realtime state, handling optimistic updates and failures, and keeping the codebase small enough to reason about as the product grows.

## Credits

Some UI motion is built on components from [React Bits](https://reactbits.dev) by David Haz ([github.com/DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)), copied from its TypeScript + Tailwind variants into `src/components/reactbits/`:

- **Aurora**: the soft animated background behind the board and sign-in screen (WebGL2, paused when the tab is hidden, and replaced by the static CSS gradient under `prefers-reduced-motion` or without WebGL).
- **Blur Text**: the one-time board-title reveal and the sign-in heading.
- **Spotlight Card**: adapted into the cursor-following warm glow on cards (`CardSpotlight.tsx` / `useCardSpotlight.ts`).

React Bits is licensed under the **MIT + Commons Clause License Condition v1.0**, Copyright (c) 2026 David Haz. The full license text is in [`src/components/reactbits/LICENSE.md`](src/components/reactbits/LICENSE.md), and every copied file carries the copyright notice. The components are used here as part of this application and are not sold or redistributed on their own.
