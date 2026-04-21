import { db } from "@/lib/db"
import { flashcards } from "@/lib/schema"
import { sql } from "drizzle-orm"
import Link from "next/link"

async function getTopics() {
  const rows = await db
    .select({
      topic: flashcards.topic,
      total: sql<number>`count(*)`,
      learnCount: sql<number>`sum(case when ${flashcards.cardType} = 'flip' then 1 else 0 end)`,
      testCount: sql<number>`sum(case when ${flashcards.cardType} != 'flip' then 1 else 0 end)`,
    })
    .from(flashcards)
    .groupBy(flashcards.topic)
    .orderBy(flashcards.topic)

  return rows
}

export default async function TopicsPage() {
  const topics = await getTopics()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Topics</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Choose a topic to study</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {topics.map((t) => {
          const slug = encodeURIComponent(t.topic)
          return (
            <div
              key={t.topic}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t.topic}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t.total} cards</p>
              </div>
              <div className="flex flex-col gap-2">
                {(t.learnCount ?? 0) > 0 && (
                  <Link
                    href={`/study/${slug}?mode=learn`}
                    className="text-center text-xs font-semibold py-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                  >
                    Learn
                  </Link>
                )}
                {(t.testCount ?? 0) > 0 && (
                  <Link
                    href={`/study/${slug}?mode=test`}
                    className="text-center text-xs font-semibold py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
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
