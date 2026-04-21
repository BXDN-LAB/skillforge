# Skillforge — Design Spec
**Date:** 2026-04-21  
**Status:** Approved

---

## Overview

Skillforge is a local-first IHK IT exam prep flashcard app. Multiple users share a single deployed instance; credentials are issued manually (no self-registration). The app runs entirely on-device — no external database, no cloud services.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Font | Inter |
| Database | SQLite via Drizzle ORM + `better-sqlite3` |
| Auth | Auth.js v5, credentials provider, Drizzle adapter |
| ORM | Drizzle (no Prisma) |
| Dark mode | `next-themes` |

---

## Architecture

**Pattern:** Server Components + Server Actions. The card flip is the only client-side interactivity.

- All data reads happen in React Server Components.
- All mutations (progress updates) go through Next.js Server Actions.
- Auth.js v5 session is read server-side on every protected route.
- `"use client"` is scoped to the `<FlashCard>` component only.

---

## File Structure

```
app/
├── (auth)/
│   └── login/page.tsx              # Username + password form, no registration
├── (app)/
│   ├── layout.tsx                  # Auth guard — redirects to /login if no session
│   ├── dashboard/page.tsx          # Per-topic progress overview
│   ├── topics/page.tsx             # Topic picker grid
│   └── study/[topic]/page.tsx      # Card study session (?mode=learn|test)
├── api/auth/[...nextauth]/route.ts # Auth.js v5 handler
lib/
├── auth.ts                         # Auth.js config (credentials + Drizzle adapter)
├── db.ts                           # Drizzle client (single better-sqlite3 connection)
└── schema.ts                       # Drizzle table definitions
components/
└── flashcard.tsx                   # "use client" — flip animation + action buttons
scripts/
└── seed.ts                         # Reads flashcards.json → inserts into SQLite
```

---

## Data Model

All tables live in a single `skillforge.db` SQLite file.

### Auth.js required tables
```
users               id, name, username (unique), password (bcrypt), createdAt
accounts            id, userId FK, provider, providerAccountId, …OAuth fields
sessions            id, sessionToken (unique), userId FK, expires
verification_tokens identifier, token (unique), expires
```

> `email` is replaced by `username` since credentials are issued, not self-registered. Auth.js adapter is configured to use `username` as the unique identifier.

### App tables

```
flashcards
  id            text PK (cuid)
  topic         text NOT NULL          — plain string, e.g. "Netzwerke"
  cardType      text NOT NULL          — "flip" | "multiple-choice" | "fill-in"
  question      text NOT NULL
  questionImage text NULL              — local path, e.g. /images/cards/q-001.png
  answer        text NOT NULL          — always the correct answer string
  answerImage   text NULL
  options       text NULL              — JSON array, only for "multiple-choice"
  sortOrder     integer DEFAULT 0
  createdAt     integer

user_progress
  id            text PK (cuid)
  userId        text FK → users
  flashcardId   text FK → flashcards
  status        text DEFAULT "unseen"  — "unseen" | "learned" | "review"
  updatedAt     integer
  UNIQUE(userId, flashcardId)
```

### Card type rules

`cardType` determines both the mode and the interaction. There is no separate `mode` field.

| cardType | Study mode | Interaction | Scoring |
|---|---|---|---|
| `flip` | Learn | Tap card to reveal answer | Self-judged: Got it / Review later |
| `multiple-choice` | Test | Tap one of 4 options | Auto: correct option = `learned`, wrong = `review` |
| `fill-in` | Test | Type answer into input | Auto: trimmed case-insensitive match = `learned`, else `review` |

### Seed format (`flashcards.json`)

```json
[
  {
    "topic": "Netzwerke",
    "cardType": "flip",
    "question": "Was ist der Unterschied zwischen TCP und UDP?",
    "questionImage": null,
    "answer": "TCP ist verbindungsorientiert und zuverlässig. UDP ist verbindungslos und schneller, aber ohne Zustellgarantie.",
    "answerImage": null,
    "options": null,
    "sortOrder": 1
  },
  {
    "topic": "Netzwerke",
    "cardType": "multiple-choice",
    "question": "Welches Protokoll arbeitet auf Schicht 4 des OSI-Modells?",
    "questionImage": null,
    "answer": "TCP",
    "answerImage": null,
    "options": ["IP", "TCP", "HTTP", "Ethernet"],
    "sortOrder": 1
  },
  {
    "topic": "Netzwerke",
    "cardType": "fill-in",
    "question": "Das OSI-Modell besteht aus ___ Schichten.",
    "questionImage": null,
    "answer": "7",
    "answerImage": null,
    "options": null,
    "sortOrder": 2
  }
]
```

---

## Pages & Data Flow

### `/login`
- Username + password fields only.
- No registration link.
- On submit → Auth.js credentials provider → bcrypt compare → session cookie.

### `/dashboard`
- Server Component reads session, fetches all topics + user's `user_progress` counts via Drizzle.
- Shows per-topic rows: topic name, learn progress bar (`learned / total learn cards`), test progress bar (`learned / total test cards`), Learn + Test buttons.

### `/topics`
- Server Component lists distinct topics from `flashcards` table.
- Grid of topic cards, each with **Learn** and **Test** buttons linking to `/study/[topic]?mode=learn` or `?mode=test`.

### `/study/[topic]?mode=learn|test`
- Server Component reads session + loads cards for topic + mode, plus current user's progress.
- Passes card data as props to `<FlashCard>` client component.
- Shows progress counter top-right (e.g. `3 / 24`).

**Learn mode flow:**
1. Card shows question (front).
2. User taps → CSS 3D flip reveals answer (back).
3. "Got it" or "Review later" buttons call Server Action → upserts `user_progress` → revalidates page.

**Test mode flow (multiple-choice):**
1. Question + 4 options displayed.
2. User taps an option → highlighted.
3. "Check answer" → Server Action evaluates, returns correct/wrong inline feedback.
4. "Next →" advances to next card.

**Test mode flow (fill-in):**
1. Question with `___` placeholder displayed.
2. User types into input + submits.
3. Server Action compares trimmed, case-insensitive → inline correct/wrong feedback.
4. "Next →" advances.

---

## UI Design

- **Font:** Inter (next/font/google)
- **Base background:** `bg-zinc-50` (light) / `bg-zinc-950` (dark)
- **Card surface:** `bg-white` (light) / `bg-zinc-900` (dark)
- **Primary button:** `bg-zinc-900 text-white` (light) / `bg-zinc-50 text-zinc-900` (dark)
- **Secondary button:** outlined, `border-zinc-200` (light) / `border-zinc-800` (dark)
- **Dark mode:** `next-themes`, toggled via a subtle icon button in the top bar
- **Mobile-first:** max-width container, generous vertical padding, large tap targets (min 44px)
- **No sidebars, no modals, no cluttered UI**

---

## Auth Configuration

- Auth.js v5 credentials provider with Drizzle adapter.
- `username` field replaces `email` as the unique user identifier.
- Sessions stored in SQLite `sessions` table.
- No OAuth providers.
- No self-registration — users are created via a one-time admin seed script or manual DB insert.

---

## Out of Scope

- Spaced repetition algorithm
- User self-registration
- Image upload UI (images are placed manually into `public/images/cards/`)
- Admin panel
- Export / import of progress
