# MakeItHappen

A personal command center — project management, GTD-style tasks, a lightweight CRM, habit tracking, and an AI assistant, split across **Work** and **Personal** workspaces. Built from the high-fidelity design handoff in `design_handoff_collapsible_milestones/`.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL. **No configuration is required** — the app boots in local demo mode with seeded data (Jordan Reeves's workspace from the design handoff). All edits persist to localStorage. Reset to seed data anytime from the Tweaks panel (gear icon, bottom of sidebar).

## Modules

- **Today** — date header, Next Action spotlight, today's tasks, habit check-in strip, project pulse, contact follow-up nudges.
- **Projects** — card grid → detail view with the two-column layout: collapsible **Milestones** (chevron, status dot, done/total count when collapsed, due chip, status chip, "Toggle all") and **Status Updates** with per-update AI **Draft email**.
- **Tasks** — quick capture (press `T`), Today / Upcoming / Someday groups, context tags, Next-action flag, delegated/waiting markers, Google Calendar reminder links, filters.
- **Contacts** — card grid, relationship types, "Remember this" notes, last interaction, follow-up flag that surfaces on Today.
- **Habits** — completion rings with bloom animation, streaks, 52-week contribution grid, cadence picker.
- **AI Assistant** — chat over a serialized snapshot of your current workspace data.

The **workspace toggle** (● Work / ● Personal) in the top bar recolors the whole app (blue ↔ amber) and filters every module. The **Tweaks panel** controls milestone collapsing: Collapsible on/off, default state (all / active / none), and count-when-collapsed.

## Optional integrations

Copy `.env.example` to `.env.local`:

| Variable | Enables |
| --- | --- |
| `VITE_ANTHROPIC_API_KEY` | Real Claude responses in the AI Assistant and email drafting (model `claude-sonnet-4-20250514`). Without it both features run on built-in local logic. |
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | Google sign-in via Supabase Auth and cloud sync of milestone preferences. |

### Supabase setup

1. Create a project at supabase.com, enable the **Google** auth provider.
2. Run `supabase/schema.sql` in the SQL editor — it creates all tables with row-level security (`auth.uid() = user_id`) and a trigger that seeds Work/Personal workspaces + default preferences on first login.
3. Add the URL and anon key to `.env.local`.

### Gmail / Google Calendar

- **Send via Gmail** in the email draft panel opens a Gmail compose window pre-filled with subject and body (no OAuth needed).
- The reminder bell on a task opens a pre-filled Google Calendar event template.

## Stack

React 18 + TypeScript + Vite · React Router v6 · Lucide icons · plain CSS design tokens (Geist font) · Supabase (optional) · Claude API (optional).

## Project layout

```
src/
  components/   Shell (sidebar/topbar/bottom-nav), TweaksPanel, ui primitives
  pages/        Today, Projects, Tasks, Contacts, Habits, Assistant, Login
  store/        React-context store with localStorage persistence
  lib/          types, supabase client, claude client (with offline fallbacks)
  data/         seed data from the design handoff
supabase/       schema.sql (tables + RLS + first-login trigger)
```
