"use server"
import { signIn, signOut, auth } from "@/lib/auth"
import { AuthError } from "next-auth"
import { db } from "@/lib/db"
import * as schema from "@/lib/schema"
import { userProgress } from "@/lib/schema"
import { and, eq, desc, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { ProgressStatus } from "@/lib/types"

export async function login(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    })
    return null
  } catch (error) {
    if (error instanceof AuthError) return "Invalid username or password."
    throw error // re-throw NEXT_REDIRECT
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" })
}

export async function updateProgress(
  flashcardId: string,
  status: ProgressStatus
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = session.user.id

  const existing = await db
    .select({ id: userProgress.id })
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.flashcardId, flashcardId)
      )
    )
    .get()

  if (existing) {
    await db
      .update(userProgress)
      .set({ status, updatedAt: new Date(Date.now()) })
      .where(eq(userProgress.id, existing.id))
  } else {
    await db.insert(userProgress).values({
      userId,
      flashcardId,
      status,
      updatedAt: new Date(Date.now()),
    })
  }

  revalidatePath("/dashboard")
}

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
