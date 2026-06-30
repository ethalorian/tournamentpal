# TournamentPal

Run the tournament, not the chaos. A mobile-first PWA for baseball & softball
tournament directors — built with Next.js 16 (App Router), Supabase (Postgres +
Auth), and Tailwind v4 in the "Bold Bulletin" design language from the source mockups.

This build is the **director vertical slice**: the engine that produces all the
data the follower and team-manager views will later consume.

## What works end-to-end

- **Auth** — director sign up / sign in (Supabase email), session handling via
  `proxy.ts` (Next 16's renamed middleware), protected `/director` area.
- **Create a tournament** — 4-step wizard: details → teams → format (live,
  auto-fitting presets) → review & publish.
- **Tournament engine** (`lib/engine`, fully unit-tested) — snake-seeded pools,
  round-robin pool play, single-elimination bracket seeding, field + time
  assignment that avoids team double-booking and enforces field age/size
  restrictions, and standings with a director-ordered tiebreaker chain.
- **Run the event** — post scores with big tap steppers, correct posted scores,
  live pool standings, seed the bracket from standings, manage fields & sites,
  edit rules/tiebreakers.

## Public follower view (`/t/[id]`)

Anonymous, no account needed to browse. Built on the same data the director
engine produces:

- **Live home** — next games, latest results, division chips, and a follow list.
- **Schedule** — full slate grouped by day, with field and final scores.
- **Standings** — live pool tables (same engine + tiebreakers as the director).
- **Team page** — a team's games (W/L), pool position, and a Follow button.
- **Directions** — venues, parking, and one-tap "Open in Maps".
- **Follow a team** — anonymous visitors are sent to a free, lightweight
  follower sign-up that returns them to the team; following records the
  subscription that the (stubbed) score texts will use.

RLS keeps drafts private and exposes only published/live/completed events to
anonymous readers — verified end-to-end against the live database.

## Stubbed (by design — no paid accounts needed yet)

SMS texts, push notifications, and payments. The notification dispatcher
(`lib/notify.ts`) logs what *would* be sent and records it in `notifications_log`,
so the full product flow works. Add provider keys to `.env.local` to switch the
stub for real Twilio / Stripe later.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine unit tests (13)
npx tsx lib/engine/smoke.ts   # end-to-end pipeline demo
```

`.env.local` is already wired to the connected Supabase project. See
`.env.example` for the full list of variables.

## Project structure

```
app/
  page.tsx                  Marketing hero (public)
  login/ signup/            Auth screens
  auth/                     Server actions + email-confirm route handler
  director/                 Signed-in area
    page.tsx                Dashboard
    new/ [id]/teams|format|review   Create-tournament wizard
    [id]/                   Overview, scores, standings, fields, rules
    actions.ts              All server actions (mutations)
components/                 Bold Bulletin UI primitives + screens
lib/
  engine/                   Pure, framework-free tournament logic (+ tests)
  supabase/                 Browser + server clients
  schedule-builder.ts       DB-aware schedule generation
  notify.ts                 Notification stub
proxy.ts                    Auth session refresh + route gating
```

## Database

Postgres schema (tournaments, divisions, teams, sites, fields, pools,
pool_teams, games, follows, notifications_log, profiles) with Row Level
Security: directors get full access to their own events; published events are
publicly readable (the foundation for the follower view). A trigger
auto-creates a profile on signup.

## Next up (not in this slice)

Team-manager claim/dashboard, director messaging, concessions, weather holds, a
full notification-preferences hub, and wiring the real SMS/push/payment providers.
