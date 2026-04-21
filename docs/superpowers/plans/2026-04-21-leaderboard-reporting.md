# Leaderboard & Card Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add leaderboard rankings and card reporting system so users can see test scores and flag incorrect cards.

**Architecture:** 
- Two new database tables: `test_attempts` (tracks test answers) and `card_reports` (tracks user reports)
- Three new server actions for recording attempts, reporting cards, and fetching leaderboard stats
- Updated `FlashCardDeck` component with report modal
- New `/leaderboard` page showing rankings
- Filtered study queries to hide reported cards

**Tech Stack:** Drizzle ORM, SQLite, Next.js Server Actions, React (modal), TypeScript

---

## File Structure

**New Files:**
- `app/(app)/leaderboard/page.tsx` — Leaderboard page (Server Component)

**Modified Files:**
- `lib/schema.ts` — Add `testAttempts`, `cardReports` tables; add `isReported` to `flashcards`
- `app/actions.ts` — Add 3 server actions (recordTestAttempt, reportCard, getLeaderboardStats)
- `components/flashcard-deck.tsx` — Add report button, modal, call recordTestAttempt
- `app/(app)/study/[topic]/page.tsx` — Filter WHERE isReported = false
- `app/(app)/layout.tsx` — Add leaderboard nav link

---

## Task 1: Update Schema (Add Tables & Flag)

**Files:**
- Modify: `lib/schema.ts`

- [ ] **Step 1: Add testAttempts table definition**

Open `lib/schema.ts` and add before the closing export:

```typescript
export const testAttempts = sqliteTable("test_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  flashcardId: text("flashcardId").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  isCorrect: integer("isCorrect", { mode: "boolean" }).notNull(),
  answeredAt: integer("answeredAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
})
```

- [ ] **Step 2: Add cardReports table definition**

Add after testAttempts:

```typescript
export const cardReports = sqliteTable("card_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flashcardId: text("flashcardId").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"),
  reportedAt: integer("reportedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
  isResolved: integer("isResolved", { mode: "boolean" }).notNull().default(false),
}, (t) => [unique().on(t.flashcardId, t.userId)])
```

- [ ] **Step 3: Add isReported flag to flashcards table**

Find the flashcards table definition and add this line before the closing brace:

```typescript
  isReported: integer("isReported", { mode: "boolean" }).notNull().default(false),
```

The flashcards table should now end with:
```typescript
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
  isReported: integer("isReported", { mode: "boolean" }).notNull().default(false),
})
```

- [ ] **Step 4: Push schema to database**

```bash
cd /home/dino/Documents/Code/skillforge
npx drizzle-kit push
```

Expected output:
```
Reading config file '/home/dino/Documents/Code/skillforge/drizzle.config.ts'
[✓] Pulling schema from database...
[✓] Changes applied
```

- [ ] **Step 5: Commit schema changes**

```bash
git add lib/schema.ts
git commit -m "feat: add test_attempts, card_reports tables and isReported flag

- Add testAttempts table to track test answers
- Add cardReports table to track user reports with optional reason
- Add isReported flag to flashcards for filtering
- Push schema to SQLite

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Add Server Actions

**Files:**
- Modify: `app/actions.ts`

- [ ] **Step 1: Add recordTestAttempt action**

At the end of `app/actions.ts` (before any closing exports), add:

```typescript
export async function recordTestAttempt(
  flashcardId: string,
  isCorrect: boolean
) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, session.user.email))
    .get()

  if (!user) {
    throw new Error("User not found")
  }

  await db.insert(schema.testAttempts).values({
    userId: user.id,
    flashcardId,
    isCorrect,
  })

  revalidatePath("/leaderboard")
  revalidatePath("/dashboard")
}
```

- [ ] **Step 2: Add reportCard action**

Add after recordTestAttempt:

```typescript
export async function reportCard(
  flashcardId: string,
  reason?: string
) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }

  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, session.user.email))
    .get()

  if (!user) {
    throw new Error("User not found")
  }

  // Insert report
  await db.insert(schema.cardReports).values({
    flashcardId,
    userId: user.id,
    reason: reason || null,
  })

  // Mark card as reported
  await db
    .update(schema.flashcards)
    .set({ isReported: true })
    .where(eq(schema.flashcards.id, flashcardId))

  revalidatePath("/study")
}
```

- [ ] **Step 3: Add getLeaderboardStats action**

Add after reportCard:

```typescript
export async function getLeaderboardStats(limit: number = 50) {
  const stats = await db
    .select({
      userId: schema.testAttempts.userId,
      name: schema.users.name,
      score: sql<number>`COUNT(CASE WHEN ${schema.testAttempts.isCorrect} = 1 THEN 1 END)`,
    })
    .from(schema.testAttempts)
    .leftJoin(schema.users, eq(schema.testAttempts.userId, schema.users.id))
    .groupBy(schema.testAttempts.userId)
    .orderBy(desc(sql`COUNT(CASE WHEN ${schema.testAttempts.isCorrect} = 1 THEN 1 END)`))
    .limit(limit)
    .all()

  return stats as Array<{ userId: string; name: string | null; score: number }>
}
```

- [ ] **Step 4: Add required imports at top of app/actions.ts**

Check that the following imports exist at the top of `app/actions.ts`:

```typescript
import { desc, eq, sql } from "drizzle-orm"
```

If `desc` and `sql` are not already imported, add them to the existing drizzle-orm import.

- [ ] **Step 5: Commit action changes**

```bash
git add app/actions.ts
git commit -m "feat: add server actions for leaderboard and card reporting

- recordTestAttempt: track test answers for scoring
- reportCard: flag card as incorrect, set isReported flag
- getLeaderboardStats: fetch top scorers with counts

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Update Study Page Query (Filter Reported Cards)

**Files:**
- Modify: `app/(app)/study/[topic]/page.tsx`

- [ ] **Step 1: Add isReported filter to card query**

Find the line where cards are fetched (should contain `where(` clause). Update it to exclude reported cards.

Current code around line 22-35 should look like:
```typescript
const cardTypeFilter: ("flip" | "multiple-choice" | "fill-in")[] = mode === "learn" ? ["flip"] : ["multiple-choice", "fill-in"]

const flashcards = await db
  .select()
  .from(schema.flashcards)
  .where(
    and(
      eq(schema.flashcards.topic, topic as string),
      inArray(schema.flashcards.cardType, cardTypeFilter)
    )
  )
  .all()
```

Change it to:
```typescript
const cardTypeFilter: ("flip" | "multiple-choice" | "fill-in")[] = mode === "learn" ? ["flip"] : ["multiple-choice", "fill-in"]

const flashcards = await db
  .select()
  .from(schema.flashcards)
  .where(
    and(
      eq(schema.flashcards.topic, topic as string),
      inArray(schema.flashcards.cardType, cardTypeFilter),
      eq(schema.flashcards.isReported, false)
    )
  )
  .all()
```

- [ ] **Step 2: Verify import of and() function**

Check top of file has:
```typescript
import { and, eq, inArray } from "drizzle-orm"
```

If only `eq` and `inArray` are imported, update to include `and`.

- [ ] **Step 3: Test the change locally (manual)**

```bash
npm run dev
```

Visit `http://localhost:3001/login`, log in, navigate to study. Verify cards still load and no errors appear in browser console.

- [ ] **Step 4: Commit study page changes**

```bash
git add "app/(app)/study/[topic]/page.tsx"
git commit -m "feat: filter out reported cards from study sessions

- Add WHERE isReported = false to card query
- Ensures users don't study flagged cards

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Update FlashCardDeck Component (Add Report Button & Modal)

**Files:**
- Modify: `components/flashcard-deck.tsx`
- Test: None (UI component, tested via manual interaction)

- [ ] **Step 1: Add report modal state**

Add this import at the top of `components/flashcard-deck.tsx` if not already present:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
```

Find the `useState` hook section (around line 20-30) and add a new state:

```typescript
const [showReportModal, setShowReportModal] = useState(false)
const [reportReason, setReportReason] = useState("")
const [isReporting, setIsReporting] = useState(false)
```

- [ ] **Step 2: Add recordTestAttempt call in test mode**

Find the `handleAnswer` function (around line 150-180). At the start of the function, before any other logic, add:

```typescript
// Record test attempt for scoring
if (mode === "test") {
  await recordTestAttempt(currentCard.id, isCorrect)
}
```

Make sure `recordTestAttempt` is imported from `"@/app/actions"` at the top:

```typescript
import { recordTestAttempt, reportCard } from "@/app/actions"
```

- [ ] **Step 3: Add handleReportCard function**

Add this new function before the return statement (around line 280):

```typescript
const handleReportCard = async () => {
  if (!currentCard) return

  setIsReporting(true)
  try {
    await reportCard(currentCard.id, reportReason || undefined)
    setShowReportModal(false)
    setReportReason("")

    // Show confirmation and skip to next card
    toast({
      title: "Card Reported",
      description: "Thanks! Admin will review this card.",
    })

    // Move to next card
    const nextIndex = cardIndex + 1
    if (nextIndex < cards.length) {
      setCardIndex(nextIndex)
      setFlipped(false)
    } else {
      setShowCompletion(true)
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to report card. Please try again.",
      variant: "destructive",
    })
  } finally {
    setIsReporting(false)
  }
}
```

If `toast` is not available, add this import:

```typescript
import { useToast } from "@/hooks/use-toast"
```

And call this at the start of the component:

```typescript
const { toast } = useToast()
```

- [ ] **Step 4: Add Report button to card footer**

Find the card footer section (around line 300-350, look for buttons like "Got it" / "Review later" or answer submission). Add this Report button right before the closing `</div>` of the footer:

```typescript
<button
  onClick={() => setShowReportModal(true)}
  className="mt-4 px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-950 transition"
>
  🚩 Report Card
</button>
```

- [ ] **Step 5: Add report modal markup**

Add this modal before the return statement (after the JSX, before the closing function brace):

```typescript
{showReportModal && (
  <AlertDialog open={showReportModal} onOpenChange={setShowReportModal}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Report Card</AlertDialogTitle>
        <AlertDialogDescription>
          Is this card incorrect or misleading? Let us know what's wrong.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <textarea
        value={reportReason}
        onChange={(e) => setReportReason(e.target.value)}
        placeholder="Optional: Explain what's wrong (e.g., answer is outdated, question is unclear)"
        className="w-full p-3 border rounded bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={4}
      />

      <AlertDialogCancel onClick={() => {
        setShowReportModal(false)
        setReportReason("")
      }}>
        Cancel
      </AlertDialogCancel>

      <AlertDialogAction
        onClick={handleReportCard}
        disabled={isReporting}
        className="bg-red-600 hover:bg-red-700"
      >
        {isReporting ? "Reporting..." : "Report Card"}
      </AlertDialogAction>
    </AlertDialogContent>
  </AlertDialog>
)}
```

- [ ] **Step 6: Verify AlertDialog component exists**

Check if `components/ui/alert-dialog.tsx` exists:

```bash
ls components/ui/alert-dialog.tsx
```

If not found, initialize it with shadcn/ui:

```bash
cd /home/dino/Documents/Code/skillforge
npx shadcn-ui@latest add alert-dialog
```

- [ ] **Step 7: Manual test**

```bash
npm run dev
```

1. Log in as dino/dino123
2. Go to any study session
3. Look for "🚩 Report Card" button
4. Click it → modal appears
5. Type a reason (or leave blank)
6. Click "Report Card"
7. Verify: confirmation message, card is skipped, next card loads

- [ ] **Step 8: Commit component changes**

```bash
git add components/flashcard-deck.tsx
git commit -m "feat: add report card button and modal to FlashCardDeck

- Add report modal with optional reason textarea
- Add recordTestAttempt call in test mode for scoring
- Handle card skip after report
- Show toast confirmation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Create Leaderboard Page

**Files:**
- Create: `app/(app)/leaderboard/page.tsx`

- [ ] **Step 1: Create leaderboard directory**

```bash
mkdir -p /home/dino/Documents/Code/skillforge/app/\(app\)/leaderboard
```

- [ ] **Step 2: Create leaderboard page component**

Create `app/(app)/leaderboard/page.tsx`:

```typescript
import { auth } from "@/lib/auth"
import { getLeaderboardStats } from "@/app/actions"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Leaderboard | Skillforge",
  description: "See who scored the highest on tests",
}

export default async function LeaderboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const stats = await getLeaderboardStats(100)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>

      {stats.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No test attempts yet. Be the first to take a test!
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => (
                <tr
                  key={stat.userId}
                  className={`border-b border-gray-200 dark:border-zinc-700 ${
                    session.user.email === stat.userId
                      ? "bg-blue-50 dark:bg-blue-950"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4 text-sm font-medium">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && `#${index + 1}`}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {stat.name || "Anonymous"}
                    {session.user.email === stat.userId && " (You)"}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">
                    {stat.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
        Scores based on correct test answers
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit leaderboard page**

```bash
git add "app/(app)/leaderboard/page.tsx"
git commit -m "feat: add leaderboard page showing test scores

- Display ranked list of users by test score
- Highlight current user
- Show medal badges for top 3
- Protected route (requires auth)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Add Leaderboard Link to Navigation

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Add leaderboard nav link**

Find the navigation links section (usually in a `<nav>` or header). Look for links like `href="/dashboard"` or `href="/topics"`.

Add this link after the existing nav items (before any closing nav/header tags):

```typescript
<Link
  href="/leaderboard"
  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
>
  Leaderboard
</Link>
```

If using a different nav structure, ensure the link goes to `/leaderboard` and matches the styling of other nav items.

- [ ] **Step 2: Verify Link import**

Check that `Link` is imported from `"next/link"` at the top:

```typescript
import Link from "next/link"
```

- [ ] **Step 3: Manual test**

```bash
npm run dev
```

1. Log in
2. Look for "Leaderboard" link in top navigation
3. Click it → should navigate to `/leaderboard`
4. Should show leaderboard table

- [ ] **Step 4: Commit nav changes**

```bash
git add "app/(app)/layout.tsx"
git commit -m "feat: add leaderboard link to navigation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Full Integration Test

**Files:**
- None (manual testing)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test user flow**

1. Log in as `dino` / `dino123`
2. Navigate to `/dashboard` → verify page loads
3. Click on "Study" for any topic in Test mode
4. Answer a test question (multiple choice or fill-in)
5. Verify answer is recorded
6. Click "🚩 Report Card" button
7. Type a reason (or leave blank) and click "Report Card"
8. Verify: confirmation toast, card skipped
9. Navigate to `/leaderboard`
10. Verify: leaderboard shows with your score (should be 1 if first answer was correct)
11. Verify current user row is highlighted

- [ ] **Step 3: Test filtering**

1. Go back to study, take another topic
2. Verify the same card you reported is NOT in the list
3. Other cards from same topic should still appear

- [ ] **Step 4: Verify database state**

Open SQLite and check:

```bash
sqlite3 skillforge.db
SELECT * FROM card_reports LIMIT 5;
SELECT * FROM test_attempts LIMIT 5;
SELECT COUNT(*) as reported_count FROM flashcards WHERE isReported = 1;
.exit
```

Verify:
- Reports appear in `card_reports`
- Attempts appear in `test_attempts`
- Reported card has `isReported = 1`

- [ ] **Step 5: Commit final state**

```bash
git log --oneline -7
```

All should be committed. If anything is uncommitted:

```bash
git status
```

---

## Task 8: Push to Origin

**Files:**
- None

- [ ] **Step 1: Push all commits**

```bash
cd /home/dino/Documents/Code/skillforge
git push origin main
```

Expected output:
```
Enumerating objects: ...
Total X (delta Y)...
To https://github.com/BXDN-LAB/skillforge.git
   <old-sha>..<new-sha>  main -> main
```

- [ ] **Step 2: Verify commits on GitHub**

Visit: https://github.com/BXDN-LAB/skillforge/commits/main

Verify recent commits appear:
- "feat: add leaderboard link to navigation"
- "feat: add leaderboard page showing test scores"
- "feat: add report card button and modal to FlashCardDeck"
- "feat: add server actions for leaderboard and card reporting"
- "feat: filter out reported cards from study sessions"
- "feat: add test_attempts, card_reports tables and isReported flag"

---

## Spec Coverage Check

✅ **Leaderboard Page** — Task 5 implements `/leaderboard` route with ranking table
✅ **Test Attempt Tracking** — Task 2 recordTestAttempt action, Task 4 integration in FlashCardDeck
✅ **Card Reporting (Quick Flag)** — Task 4 modal with optional reason
✅ **Card Reporting (Detailed)** — Task 4 textarea for reason input
✅ **Filter Reported Cards** — Task 3 adds WHERE isReported = false to study query
✅ **Mark Card as Reported** — Task 2 reportCard action sets isReported = true
✅ **Database Schema** — Task 1 creates testAttempts, cardReports tables, adds isReported flag
✅ **Server Actions** — Task 2 implements all 3 actions
✅ **UI Integration** — Task 4 adds report button and modal
✅ **Navigation** — Task 6 adds leaderboard link

**No gaps identified.** All spec requirements are implemented.

---

## Notes for Executor

- All database tables are created in Task 1 with `drizzle-kit push`
- Tests are manually verified via dev server (UI components hard to unit test without complex mocking)
- All timestamps use `new Date(Date.now())` for consistency with existing schema
- Reporting creates unique constraint on (cardId, userId) — users can only report once per card
- LeaderboardStats query counts only records where isCorrect = true for scoring
- Cards are immediately filtered after report (study page query excludes isReported = true)
