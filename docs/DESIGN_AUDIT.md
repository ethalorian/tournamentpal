# TournamentPal — Design Coverage Audit

_What's built vs. the provided design mockups (`Follower Views.dc.html`)._
Legend: ✅ built · 🟡 partial · ⬜ missing

Roughly **43 of ~55** designed screens are built. All three persona loops are
complete, plus bracket auto-advance, weather holds, concessions, discovery,
staff & roles, sponsors (with logo upload), CSV import, notification-preference
hub, **real SMS + Web Push**, the **PWA** (icons, install prompt, offline),
**Places autocomplete/geocoding** for locations, and **fully manual texting**
(nothing sends automatically).

**The only feature area entirely unbuilt is payments/plans (2b/2d/2e).** The
team directory (16a/b) and self-serve registration link (3c) are now done.
Everything else remaining is partial/polish (personalized follower home, manual
field-assign UI, quiet hours, iOS splash).

---

## Design language (1a–1c)
| Screen | Status | Notes |
|---|---|---|
| 1c Bold Bulletin | ✅ | The chosen, implemented design language. |
| 1a Scoreboard / 1b Field Guide | ⬜ | Alternative styles — intentionally not built. |

## Onboarding & accounts (2a–2h)
| Screen | Status | Notes |
|---|---|---|
| 2c Director sign up | ✅ | Email signup, role baked in. |
| 2a Welcome (three doors) | 🟡 | Landing hero exists; not the explicit get-started/paste-link/explore split. |
| 2g Follower invite link | 🟡 | Tapping a link opens `/t/[id]`; no dedicated "one tap to follow" invite screen. |
| 2h Follower follow & alerts | ✅ | Follow + phone + push; real Twilio SMS & Web Push; per-category prefs at `/alerts`. |
| 2b Choose role (director pays / follower free) | ⬜ | No role-selection screen. |
| 2d Director plan (per-event / season pass) | ⬜ | **No plans.** |
| 2e Director payment (Apple Pay / card) | ⬜ | **No payment.** Stubbed entirely. |
| 2f Follower discovery (search / filter / browse nearby) | ✅ | `/discover` — search by name/city, filter by sport. |

## Director — create a tournament (3a–3f)
| Screen | Status | Notes |
|---|---|---|
| 3a Dashboard | ✅ | Active + past events. |
| 3b Details (sport, dates, divisions) | ✅ | |
| 3d Pick a format / 3e Customize (live summary) | ✅ | Presets + live game-count recompute. |
| 3f Review & publish (seeded bracket) | ✅ | Publish makes it public; texting is a separate manual action. |
| 3c Add teams | ✅ | Manual typing, CSV paste, **reuse from past events**, and a **self-serve registration link**. |

## Director — fields & scoring & rules (4–7)
| Screen | Status | Notes |
|---|---|---|
| 4a Fields & locations / 4b Add a field | ✅ | Wizard step + **Places autocomplete/geocoding** (address → coordinates). No embedded map view. |
| 5a Post queue / 5b Enter score / 5c Posted | ✅ | 5c "nudge to next game" is light. |
| 6a Rules & tiebreakers | ✅ | Reorder via up/down (not drag); run rule + time limit. |
| 7a Field age restrictions | ✅ | Fence + allowed divisions per field. |
| 7b Assign field — enforced lock w/ reason | 🟡 | Engine enforces it during auto-schedule; **no manual assign UI showing the lock reason.** |

## Director — concessions, messaging (8–9)
| Screen | Status | Notes |
|---|---|---|
| 9a Inbox / 9b 1:1 thread / 9c Broadcast | ✅ | Director↔manager messaging, unread flags, broadcast. |
| 8a Concessions manage / 8b push / 8c follower view | ✅ | Menu + sold-out toggle + push (stub) + public menu. |

## PWA install (10–11)
| Screen | Status | Notes |
|---|---|---|
| 10a/10b iOS · 11a/11b Android install + installed | ✅ | Manifest, real icons, service worker, Web Push, **install prompt** (Android beforeinstallprompt + iOS Add-to-Home-Screen), offline fallback. |

## Standings, corrections, auto-schedule, weather (12a–12d)
| Screen | Status | Notes |
|---|---|---|
| 12a Standings | ✅ | Director + follower, ordered tiebreakers. |
| 12b Correct a posted score | ✅ | Re-notifies + recomputes. |
| 12c Auto-schedule (places games, flags conflicts) | ✅ | Pure-engine, unit-tested. |
| 12d Weather hold (pause/delay/postpone/cancel + push) | ✅ | Director control at `/director/[id]/hold` + push (stub). |

## Follower — directions, notifications, weather (13a–13c)
| Screen | Status | Notes |
|---|---|---|
| 13a Directions & parking | ✅ | Venues, parking, open in Maps. |
| 13b Notifications hub (per category, quiet hours) | 🟡 | `/alerts` hub: channels (SMS/push) + categories, enforced in the send layer. **Quiet hours deferred** (needs per-user timezone). |
| 13c Weather hold (follower view) | ✅ | Live banner across all follower views. |

## Team manager (14a–14c)
| Screen | Status | Notes |
|---|---|---|
| 14a Invite / 14b Claim & alerts / 14c Manager home | ✅ | Link-based claim, phone capture, dashboard, message director. |

## Follower home & team page (15a–15b)
| Screen | Status | Notes |
|---|---|---|
| 15b Team page | ✅ | Schedule + pool standings + follow. |
| 15a Personalized home (switch followed teams) | 🟡 | Public home exists; **no "scope to my followed team" switcher.** |

## Add existing teams from records (16a–16b)
| Screen | Status | Notes |
|---|---|---|
| 16a Find a team / 16b Confirm record | ✅ | `/director/[id]/directory` — search your past events' teams and add the stored record (coach carried over). |

## Business & polish (17a–17e)
| Screen | Status | Notes |
|---|---|---|
| 17a Sponsors (revenue placements) | ✅ | Director manages + **logo image upload** (Supabase Storage); logos render on the follower home. |
| 17b Staff & roles (co-directors, scorekeepers, marshals, scoped perms) | ✅ | Invite by email; scorekeepers post scores from `/score` (least-privilege verified). |
| 17d App icon set | ✅ | Diamond mark @ 192/512/180 + favicon. |
| 17e Offline | ✅ | SW serves an offline fallback page when the network drops. |
| 17c Splash | 🟡 | Android auto-generates one from the manifest; no custom iOS startup images. |

## Marketing (18a)
| Screen | Status | Notes |
|---|---|---|
| 18a Hero + promo code | ✅ | Desktop landing. (Promo code is cosmetic — no real code redemption.) |

---

## What's LEFT to create

### Fully unbuilt (the only one)
1. **Payments / monetization — 2b, 2d, 2e.** No role-choice screen, no plan
   selection (per-event / season pass), no checkout. The "directors pay to run"
   model doesn't exist yet. Requires a payment provider (Stripe) + plan gating.

### Partial — worth finishing
2. **Personalized follower home (15a).** A team switcher that scopes the home to
   your followed team's pool + schedule. Today the home is tournament-wide.
5. **Manual field-assign UI (7b).** The engine already enforces field age/size
   limits during auto-schedule; missing is a hand-assign screen that visibly
   locks ineligible fields with the reason.
6. **Welcome / choose-role split (2a/2b).** An explicit three-door welcome and a
   pay-vs-free role picker (partly moot until payments exist).

### Polish / minor
7. **Quiet hours** for notifications (needs per-user timezone).
8. **iOS custom splash images (17c)**; an embedded map view on fields/directions.
9. **Dedicated follower "invite link" screen (2g)** — works today via `/t/[id]`.

### Intentionally skipped
- **1a Scoreboard / 1b Field Guide** — alternate design languages; Bold Bulletin
  (1c) was the chosen direction.

## Recommended order
The remaining substantive build is **payments (2b/2d/2e)** — it turns the app
into a business but is gated on a Stripe account + a pricing decision. After
that it's polish: **personalized follower home (15a)**, **manual field-assign
UI (7b)**, quiet hours, and iOS splash images.
