"use server"
import { signIn, signOut, auth } from "@/lib/auth"
import { AuthError } from "next-auth"
import { db } from "@/lib/db"
import { userProgress } from "@/lib/schema"
import { and, eq } from "drizzle-orm"
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
      .set({ status, updatedAt: Date.now() })
      .where(eq(userProgress.id, existing.id))
  } else {
    await db.insert(userProgress).values({
      userId,
      flashcardId,
      status,
      updatedAt: Date.now(),
    })
  }

  revalidatePath("/dashboard")
}
