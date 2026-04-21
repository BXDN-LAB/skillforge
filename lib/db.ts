import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "@/lib/schema"

const sqlite = new Database("skillforge.db")
export const db = drizzle(sqlite, { schema })
