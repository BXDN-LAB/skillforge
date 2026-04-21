import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { flashcards, userProgress } from "@/lib/schema"
import { and, eq, inArray } from "drizzle-orm"
import { notFound } from "next/navigation"
import { FlashCardDeck } from "@/components/flashcard-deck"
import type { CardWithProgress, ProgressStatus } from "@/lib/types"

interface Props {
  params: Promise<{ topic: string }>
  searchParams: Promise<{ mode?: string }>
}

export default async function StudyPage({ params, searchParams }: Props) {
  const { topic: topicSlug } = await params
  const { mode: modeParam } = await searchParams

  const topic = decodeURIComponent(topicSlug)
  const mode = modeParam === "test" ? "test" : "learn"

  const session = await auth()
  const userId = session!.user.id

  const cardTypeFilter = mode === "learn" ? ["flip"] : ["multiple-choice", "fill-in"]

  const cards = await db
    .select()
    .from(flashcards)
    .where(
      and(
        eq(flashcards.topic, topic),
        inArray(flashcards.cardType, cardTypeFilter)
      )
    )
    .orderBy(flashcards.sortOrder)

  if (cards.length === 0) notFound()

  const cardIds = cards.map((c) => c.id)

  const progress = await db
    .select({ flashcardId: userProgress.flashcardId, status: userProgress.status })
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        inArray(userProgress.flashcardId, cardIds)
      )
    )

  const progressMap = new Map(progress.map((p) => [p.flashcardId, p.status as ProgressStatus]))

  const cardsWithProgress: CardWithProgress[] = cards.map((c) => ({
    id: c.id,
    topic: c.topic,
    cardType: c.cardType as CardWithProgress["cardType"],
    question: c.question,
    questionImage: c.questionImage ?? null,
    answer: c.answer,
    answerImage: c.answerImage ?? null,
    options: c.options ? (JSON.parse(c.options) as string[]) : null,
    sortOrder: c.sortOrder,
    status: progressMap.get(c.id) ?? "unseen",
  }))

  return (
    <FlashCardDeck
      cards={cardsWithProgress}
      topic={topic}
      mode={mode}
    />
  )
}
