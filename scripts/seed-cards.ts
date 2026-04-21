import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "../lib/schema"
import { readFileSync } from "fs"
import { join } from "path"

const sqlite = new Database("skillforge.db")
const db = drizzle(sqlite, { schema })

interface SeedCard {
  topic: string
  cardType: "flip" | "multiple-choice" | "fill-in"
  question: string
  questionImage: string | null
  answer: string
  answerImage: string | null
  options: string[] | null
  sortOrder: number
}

async function main() {
  const raw = readFileSync(join(process.cwd(), "data/flashcards.json"), "utf-8")
  const cards: SeedCard[] = JSON.parse(raw)

  await db.delete(schema.flashcards)
  console.log("Cleared existing flashcards.")

  for (const card of cards) {
    await db.insert(schema.flashcards).values({
      topic: card.topic,
      cardType: card.cardType,
      question: card.question,
      questionImage: card.questionImage,
      answer: card.answer,
      answerImage: card.answerImage,
      options: card.options ? JSON.stringify(card.options) : null,
      sortOrder: card.sortOrder,
    })
  }

  console.log(`Seeded ${cards.length} flashcards.`)
}

main().catch(console.error)
