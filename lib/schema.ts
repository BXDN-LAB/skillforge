import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  name: text("name"),
  password: text("password").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => Date.now()),
})

export const flashcards = sqliteTable("flashcards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  topic: text("topic").notNull(),
  cardType: text("cardType", { enum: ["flip", "multiple-choice", "fill-in"] }).notNull(),
  question: text("question").notNull(),
  questionImage: text("questionImage"),
  answer: text("answer").notNull(),
  answerImage: text("answerImage"),
  options: text("options"),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => Date.now()),
})

export const userProgress = sqliteTable("user_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  flashcardId: text("flashcardId").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["unseen", "learned", "review"] }).notNull().default("unseen"),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => Date.now()),
}, (t) => [unique().on(t.userId, t.flashcardId)])
