import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "../lib/schema"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"

const sqlite = new Database("skillforge.db")
const db = drizzle(sqlite, { schema })

const USERS = [
  { username: "admin", name: "Admin", password: "admin123" },
  { username: "max", name: "Max Mustermann", password: "test123" },
]

async function main() {
  for (const u of USERS) {
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, u.username))
      .get()

    if (existing) {
      console.log(`User "${u.username}" already exists, skipping.`)
      continue
    }

    const hash = await bcrypt.hash(u.password, 10)
    await db.insert(schema.users).values({
      username: u.username,
      name: u.name,
      password: hash,
    })
    console.log(`Created user: ${u.username}`)
  }
  console.log("Done.")
}

main().catch(console.error)
