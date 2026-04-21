# Leaderboard & Card Reporting Feature Design

**Date:** 2026-04-21  
**Status:** Approved  
**Features:** Leaderboard page, card reporting system with admin review workflow

---

## Overview

Add two interconnected features to Skillforge:

1. **Leaderboard Page** (`/leaderboard`) — Public-facing rankings based on test mode performance
2. **Card Reporting System** — Users can flag cards as incorrect; reported cards are hidden from study sessions

---

## Feature 1: Leaderboard Page

### Purpose
- Gamify learning by showing who has the highest test scores
- Motivate users through visible progress ranking
- All logged-in users can see rankings

### Design

**Route:** `/app/leaderboard/page.tsx` (protected, requires auth)

**Data Source:**
- New table: `test_attempts` (see Data Model below)
- Query: `SELECT users.name, COUNT(test_attempts.id) as score FROM test_attempts WHERE isCorrect=true GROUP BY userId ORDER BY score DESC`

**UI Layout:**
```
Header: "Leaderboard"

Table:
  Rank | Name | Score | Progress
  1    | Dino | 15    | [████████░░]
  2    | Max  | 12    | [██████░░░░]
  3    | Admin| 8     | [████░░░░░░]
  ...

Footer: "Scores based on correct test answers"
```

**Styling:**
- Server Component (read-only)
- Table with 4 columns, responsive (vertical stack on mobile)
- Current user's row highlighted with bg-blue-50 (light) / bg-blue-900 (dark)
- Top 3 users get badges: 🥇 🥈 🥉

**No real-time updates** — page refreshes every visit, no polling or WebSocket

---

## Feature 2: Card Reporting System

### Purpose
- Let users report cards with incorrect/wrong answers
- Prevent other users from studying incorrect cards
- Enable admins to review and fix cards

### User Flow

**In Study Session (Learn or Test Mode):**
1. User sees card
2. Clicks "Report" button (new button in card footer)
3. Modal appears with two options:
   - **"Flag" button** (quick, no reason needed)
   - **Text area** for typing detailed reason (e.g., "Answer is outdated" / "Question is unclear")
4. After submit: "Thanks! Admin will review this card" confirmation
5. Card is immediately hidden from this user's session
6. Page reloads card deck (skip reported card)

**Data Flow:**
- `reportCard(cardId, userId, reason?)` action records report
- `is_reported` flag set on flashcard (after first report)
- Study page query filters: `WHERE is_reported = false`

### Database Schema

**New Tables:**

```typescript
// test_attempts: Track each test mode answer
export const testAttempts = sqliteTable("test_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  flashcardId: text("flashcardId").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  isCorrect: integer("isCorrect", { mode: "boolean" }).notNull(), // 1 or 0
  answeredAt: integer("answeredAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
})

// card_reports: Track user reports of problematic cards
export const cardReports = sqliteTable("card_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flashcardId: text("flashcardId").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"), // optional detailed reason
  reportedAt: integer("reportedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
  isResolved: integer("isResolved", { mode: "boolean" }).notNull().default(false),
}, (t) => [unique().on(t.flashcardId, t.userId)]) // one report per user per card
```

**Existing Table Update:**

```typescript
// flashcards table: Add flag
export const flashcards = sqliteTable("flashcards", {
  // ... existing columns ...
  isReported: integer("isReported", { mode: "boolean" }).notNull().default(false), // NEW
})
```

---

## Server Actions

### 1. `recordTestAttempt(cardId: string, isCorrect: boolean)`
- Called after user answers a test card (multiple-choice or fill-in)
- Inserts row into `test_attempts` table
- Gets current user from session
- Used by: `FlashCardDeck` component

### 2. `reportCard(cardId: string, reason?: string)`
- Called when user clicks "Report" button
- Inserts row into `card_reports` table
- Sets `is_reported = true` on flashcard (if first report)
- Returns success message
- Used by: Report modal in `FlashCardDeck`

### 3. `getLeaderboardStats(limit: number = 50)`
- Query: `SELECT users.name, COUNT(test_attempts.id) as score FROM test_attempts WHERE isCorrect=true GROUP BY test_attempts.userId ORDER BY score DESC LIMIT ?`
- Also returns current user's rank
- Used by: `/leaderboard` page

---

## Component Changes

### `FlashCardDeck` Component (`components/flashcard-deck.tsx`)
- **New button:** "Report Card" in footer (next to other controls)
- **New state:** `showReportModal: boolean`
- **New modal:** Report card with two options:
  - Quick "Flag" (sends empty reason)
  - "Add reason" textarea + submit
- **After test answer:** Call `recordTestAttempt()` before updating progress
- **After report submit:** Hide card from current session (update local state to skip this card)

### New Page: Leaderboard (`app/(app)/leaderboard/page.tsx`)
- Server Component
- Query leaderboard stats
- Render table with current user highlighted
- Add nav link to `/leaderboard` in app layout header

### Study Page (`app/(app)/study/[topic]/page.tsx`)
- **Update query:** Filter `WHERE is_reported = false` when fetching cards
- Ensures reported cards don't appear

---

## Testing

**Test cases:**
1. ✅ User reports a card with quick flag → card is_reported set to true
2. ✅ User reports a card with reason → reason is stored in DB
3. ✅ After report, card is hidden from user's current session
4. ✅ Reported card doesn't appear in other users' study sessions
5. ✅ Test answer recorded → leaderboard updates
6. ✅ Multiple correct answers → score accumulates
7. ✅ Leaderboard shows users in descending score order
8. ✅ Current user is highlighted on leaderboard

---

## Out of Scope (For Now)

- Admin dashboard to view reported cards and comments
- Ability to resolve/unresolve reports
- Edit cards after report
- Notifications to users when report is resolved
- Batch reports (same report by many users)

---

## Future Extensions

1. **Admin Panel** — View all reports, resolve/dismiss, edit card
2. **Report Analytics** — Most-reported cards, common issues
3. **Notifications** — Email admin when card is reported
4. **Dispute Resolution** — Allow card author to respond to report

---

## Implementation Order

1. Update `lib/schema.ts` — Add tables and flag
2. Update `app/actions.ts` — Add three server actions
3. Update `FlashCardDeck` — Add report button and modal, call recordTestAttempt
4. Update `/study/[topic]/page.tsx` — Filter reported cards
5. Create `/leaderboard/page.tsx` — New leaderboard page
6. Update app layout nav — Add leaderboard link
7. Test all flows
8. Commit and push
