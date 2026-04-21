import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  name: text("name"),
  password: text("password").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
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
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
  isReported: integer("isReported", { mode: "boolean" }).notNull().default(false),
})

export const userProgress = sqliteTable("user_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  flashcardId: text("flashcardId").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["unseen", "learned", "review"] }).notNull().default("unseen"),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
}, (t) => [unique().on(t.userId, t.flashcardId)])

export const testAttempts = sqliteTable("test_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  flashcardId: text("flashcardId").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  isCorrect: integer("isCorrect", { mode: "boolean" }).notNull(),
  answeredAt: integer("answeredAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
})

export const cardReports = sqliteTable("card_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  flashcardId: text("flashcardId").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"),
  reportedAt: integer("reportedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date(Date.now())),
  isResolved: integer("isResolved", { mode: "boolean" }).notNull().default(false),
}, (t) => [unique().on(t.flashcardId, t.userId)])
