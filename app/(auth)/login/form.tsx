"use client"
import { useActionState } from "react"
import { login } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null)

  return (
    <form action={action} className="flex flex-col gap-4">
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          placeholder="Enter your username"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
        />
      </div>
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
