import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { flashcards, userProgress } from "@/lib/schema"
import { and, eq, inArray } from "drizzle-orm"
import type { TopicProgress } from "@/lib/types"
import Link from "next/link"

async function getTopicProgress(userId: string): Promise<TopicProgress[]> {
  const allCards = await db
    .select({ id: flashcards.id, topic: flashcards.topic, cardType: flashcards.cardType })
    .from(flashcards)

  const cardIds = allCards.map((c) => c.id)

  const progress =
    cardIds.length > 0
      ? await db
          .select({ flashcardId: userProgress.flashcardId, status: userProgress.status })
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              inArray(userProgress.flashcardId, cardIds)
            )
          )
      : []

  const progressMap = new Map(progress.map((p) => [p.flashcardId, p.status]))

  const topicMap = new Map<string, TopicProgress>()

  for (const card of allCards) {
    if (!topicMap.has(card.topic)) {
      topicMap.set(card.topic, {
        topic: card.topic,
        learnTotal: 0,
        learnLearned: 0,
        testTotal: 0,
        testLearned: 0,
      })
    }
    const t = topicMap.get(card.topic)!
    const status = progressMap.get(card.id) ?? "unseen"
    if (card.cardType === "flip") {
      t.learnTotal++
      if (status === "learned") t.learnLearned++
    } else {
      t.testTotal++
      if (status === "learned") t.testLearned++
    }
  }

  return Array.from(topicMap.values()).sort((a, b) => a.topic.localeCompare(b.topic))
}

export default async function DashboardPage() {
  const session = await auth()
  const topics = await getTopicProgress(session!.user.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {session?.user?.name ? `Good to see you, ${session.user.name.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your progress across all topics</p>
      </div>

      {topics.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No flashcards yet. Run the seed script to add cards.</p>
      )}

      <div className="flex flex-col gap-3">
        {topics.map((t) => {
          const learnPct = t.learnTotal > 0 ? Math.round((t.learnLearned / t.learnTotal) * 100) : 0
          const testPct = t.testTotal > 0 ? Math.round((t.testLearned / t.testTotal) * 100) : 0
          const topicSlug = encodeURIComponent(t.topic)
          return (
            <div
              key={t.topic}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3"
            >
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t.topic}</span>

              {t.learnTotal > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Learn</span>
                    <span>{t.learnLearned} / {t.learnTotal}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-50 rounded-full transition-all"
                      style={{ width: `${learnPct}%` }}
                    />
                  </div>
                </div>
              )}

              {t.testTotal > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Test</span>
                    <span>{t.testLearned} / {t.testTotal}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-500 dark:bg-zinc-400 rounded-full transition-all"
                      style={{ width: `${testPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-1">
                {t.learnTotal > 0 && (
                  <Link
                    href={`/study/${topicSlug}?mode=learn`}
                    className="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Learn
                  </Link>
                )}
                {t.testTotal > 0 && (
                  <Link
                    href={`/study/${topicSlug}?mode=test`}
                    className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Test
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
