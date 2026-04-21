import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginForm } from "./form"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Skillforge
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter your credentials to continue
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
