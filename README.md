# Skillforge

A **local-first IHK IT exam prep flashcard app** built with Next.js, TypeScript, and SQLite. Multiple users share a single deployed instance with manually-issued credentials. No cloud services, no external databases — everything runs on-device.

---

## Features

- 📚 **Multiple card types:** Flip cards (learn mode), multiple-choice (test mode), fill-in-the-blank
- 👥 **Multi-user support:** Credentials issued manually, no self-registration
- 📊 **Progress tracking:** Per-topic learning and test progress with visual indicators
- 🌙 **Dark mode:** Toggle via `next-themes`
- ⚡ **Server-driven:** Minimal client-side JavaScript (flip animation only)
- 🗄️ **Local database:** SQLite + Drizzle ORM, no external services

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js 16 App Router, TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui |
| **Font** | Inter |
| **Database** | SQLite via Drizzle ORM + `better-sqlite3` |
| **Auth** | Auth.js v5 (credentials provider, Drizzle adapter) |
| **Dark mode** | `next-themes` |

---

## Architecture

**Pattern:** Server Components + Server Actions. The card flip is the only client-side interactivity.

- All data reads happen in React Server Components
- All mutations (progress updates) go through Next.js Server Actions
- Auth.js v5 session is read server-side on every protected route
- `"use client"` is scoped to the `<FlashCard>` component only

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/BXDN-LAB/skillforge.git
cd skillforge
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Database Setup

The SQLite database (`skillforge.db`) is created automatically on first run. To seed flashcards:

```bash
npm run seed
```

This reads `flashcards.json` and populates the database.

### Create Users

Users are created via manual DB insert or admin script (no self-registration). Example:

```bash
# Via script (if available)
npm run create-user username password

# Or manually in sqlite3
sqlite3 skillforge.db
INSERT INTO users (username, password, name) VALUES ('student1', '$2b$10$...bcrypt_hash...', 'Student One');
```

---

## File Structure

```
app/
├── (auth)/
│   └── login/page.tsx              # Username + password form
├── (app)/
│   ├── layout.tsx                  # Auth guard → /login if no session
│   ├── dashboard/page.tsx          # Per-topic progress overview
│   ├── topics/page.tsx             # Topic picker grid
│   └── study/[topic]/page.tsx      # Card study session (?mode=learn|test)
├── api/auth/[...nextauth]/route.ts # Auth.js v5 handler
│
lib/
├── auth.ts                         # Auth.js config + Drizzle adapter
├── db.ts                           # Drizzle client (better-sqlite3)
└── schema.ts                       # Drizzle table definitions

components/
└── flashcard.tsx                   # "use client" — flip animation + actions

scripts/
└── seed.ts                         # Reads flashcards.json → SQLite
```

---

## Data Model

### Card Types

| cardType | Study Mode | Interaction | Scoring |
|---|---|---|---|
| `flip` | Learn | Tap card to reveal | Self-judged: Got it / Review later |
| `multiple-choice` | Test | Tap 1 of 4 options | Auto: correct = `learned`, wrong = `review` |
| `fill-in` | Test | Type answer | Auto: trimmed, case-insensitive match = `learned` |

### Database Schema

All data stored in `skillforge.db` (SQLite):

**Auth tables (Auth.js required):**
- `users` → id, username (unique), password (bcrypt), name, createdAt
- `sessions` → sessionToken, userId FK, expires
- `accounts`, `verification_tokens` → OAuth fields (not used)

**App tables:**
- `flashcards` → id, topic, cardType, question, answer, options (JSON), images, sortOrder
- `user_progress` → userId FK, flashcardId FK, status (unseen|learned|review), updatedAt

### Seed Format (`flashcards.json`)

```json
[
  {
    "topic": "Netzwerke",
    "cardType": "flip",
    "question": "Was ist der Unterschied zwischen TCP und UDP?",
    "answer": "TCP ist verbindungsorientiert und zuverlässig...",
    "options": null,
    "sortOrder": 1
  },
  {
    "topic": "Netzwerke",
    "cardType": "multiple-choice",
    "question": "Welches Protokoll arbeitet auf Schicht 4?",
    "answer": "TCP",
    "options": ["IP", "TCP", "HTTP", "Ethernet"],
    "sortOrder": 2
  }
]
```

---

## Pages & User Flow

| Page | Purpose |
|---|---|
| `/login` | Username + password authentication |
| `/dashboard` | Per-topic progress bars (learn/test) and quick-start buttons |
| `/topics` | Topic picker grid with Learn/Test buttons |
| `/study/[topic]?mode=learn\|test` | Interactive card study session |

---

## UI Design

- **Base colors:** `bg-zinc-50` (light) / `bg-zinc-950` (dark)
- **Cards:** `bg-white` (light) / `bg-zinc-900` (dark)
- **Buttons:** High contrast, min 44px tap targets
- **Mobile-first:** Responsive, no sidebars or modals
- **Dark mode:** Toggle in top navigation bar

---

## Out of Scope

- Spaced repetition algorithm
- User self-registration
- Image upload UI (images placed manually in `public/images/cards/`)
- Admin panel
- Export/import of progress

---

## License

MIT
