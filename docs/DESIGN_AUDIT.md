# TournamentPal — Design Coverage Audit

_What's built vs. the provided design mockups (`Follower Views.dc.html`)._
Legend: ✅ built · 🟡 partial · ⬜ missing

Roughly **40 of ~55** designed screens are built. The three core persona loops
are complete, plus bracket auto-advance, weather holds (12d/13c), concessions
(8a–c), discovery (2f), staff & roles + scorekeeper scoring (17b), sponsors
(17a), CSV import (3c), **real SMS + Web Push notifications**, and the **PWA
(icons, install prompt, offline)**. What's still missing: **payments/plans
(2b/2d/2e), notification-category prefs (13b), the cross-event team directory
(16a/b), and a self-serve registration link (3c).**

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
| 2h Follower follow & alerts | ✅ | Follow + phone capture; **real Twilio SMS** on score/weather/concessions when creds set. Per-category prefs (13b) still pending. |
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
| 3f Review & publish (seeded bracket) | ✅ | Publish flips public + (stub) notify. |
| 3c Add teams | 🟡 | Manual typing + **CSV paste** now supported. Still no self-serve registration link. |

## Director — fields & scoring & rules (4–7)
| Screen | Status | Notes |
|---|---|---|
| 4a Fields & locations / 4b Add a field | ✅ | Now a wizard step. **No map pin / visual map.** |
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
| 13b Notifications hub (per category, quiet hours) | ⬜ | **Missing.** |
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
| 16a Find a team / 16b Confirm record | ⬜ | **No cross-event team directory** (reuse stored teams + managers on file). |

## Business & polish (17a–17e)
| Screen | Status | Notes |
|---|---|---|
| 17a Sponsors (revenue placements) | ✅ | Director manages; shown on the public follower home. |
| 17b Staff & roles (co-directors, scorekeepers, marshals, scoped perms) | ✅ | Invite by email; scorekeepers post scores from `/score` (least-privilege verified). |
| 17d App icon set | ✅ | Diamond mark @ 192/512/180 + favicon. |
| 17e Offline | ✅ | SW serves an offline fallback page when the network drops. |
| 17c Splash | 🟡 | Android auto-generates one from the manifest; no custom iOS startup images. |

## Marketing (18a)
| Screen | Status | Notes |
|---|---|---|
| 18a Hero + promo code | ✅ | Desktop landing. (Promo code is cosmetic — no real code redemption.) |

---

## Beyond the mockups — functional gaps worth knowing
These aren't separate screens but matter for a real event:

- ~~Bracket progression isn't automated.~~ **Done** — winners now auto-advance
  into later rounds when a bracket game goes final (unit-tested).
- ~~Notifications are stubbed.~~ **SMS (Twilio) and browser Web Push are both
  real** — score/weather/concessions/broadcast alerts fan out to followers'
  phones and subscribed devices when the `TWILIO_*` / `VAPID_*` env vars are set
  (falls back to a stub log otherwise).
- **No real payments.** Tied to 2d/2e above.
- **Single-director events.** No way to delegate score-posting to a scorekeeper.

## Suggested priority (highest leverage first)
1. **Make notifications real** — it's the headline value prop and everything
   downstream (alerts, weather, broadcasts) depends on it.
2. **Staff & roles (17b)** — lets a director hand score-posting to volunteers;
   essential for running an actual multi-field event.
3. **Weather holds (12d/13c)** — the most-used day-of-event control after scoring.
4. **Payments/plans (2b/2d/2e)** — turns it into a business.
5. **Follower discovery (2f)** — growth: lets families find events without a link.
6. **Polish:** CSV/registration import (3c), team directory (16a/b), notification
   prefs (13b), bracket auto-advance, PWA install + icons, concessions, sponsors.
