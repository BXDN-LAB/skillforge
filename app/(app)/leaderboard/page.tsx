import { auth } from "@/lib/auth"
import { getLeaderboardStats } from "@/app/actions"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Leaderboard | Skillforge",
  description: "See who scored the highest on tests",
}

export default async function LeaderboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const stats = await getLeaderboardStats(100)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>

      {stats.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No test attempts yet. Be the first to take a test!
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => (
                <tr
                  key={stat.userId}
                  className={`border-b border-gray-200 dark:border-zinc-700 ${
                    session.user.email === stat.userId
                      ? "bg-blue-50 dark:bg-blue-950"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4 text-sm font-medium">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && `#${index + 1}`}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {stat.name || "Anonymous"}
                    {session.user.email === stat.userId && " (You)"}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">
                    {stat.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
        Scores based on correct test answers
      </p>
    </div>
  )
}
