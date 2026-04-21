"use client"
import { useState } from "react"
import { updateProgress, recordTestAttempt, reportCard } from "@/app/actions"
import { isCorrectAnswer } from "@/lib/answer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CardWithProgress, ProgressStatus } from "@/lib/types"
import Link from "next/link"

interface Props {
  cards: CardWithProgress[]
  topic: string
  mode: "learn" | "test"
}

export function FlashCardDeck({ cards, topic, mode }: Props) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [fillInput, setFillInput] = useState("")
  const [result, setResult] = useState<"correct" | "wrong" | null>(null)
  const [saving, setSaving] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [isReporting, setIsReporting] = useState(false)

  const card = cards[index]
  const isLast = index === cards.length - 1

  function resetCard() {
    setFlipped(false)
    setSelectedOption(null)
    setFillInput("")
    setResult(null)
  }

  async function handleProgress(status: ProgressStatus) {
    setSaving(true)
    await updateProgress(card.id, status)
    setSaving(false)
    if (isLast) {
      setIndex(cards.length) // show completion screen
    } else {
      setIndex((i) => i + 1)
      resetCard()
    }
  }

  async function handleCheckAnswer(correct: boolean) {
    // Record test attempt for scoring
    if (mode === "test") {
      await recordTestAttempt(card.id, correct)
    }

    setResult(correct ? "correct" : "wrong")
    const status: ProgressStatus = correct ? "learned" : "review"
    setSaving(true)
    await updateProgress(card.id, status)
    setSaving(false)
  }

  async function handleAnswer() {
    if (card.cardType === "multiple-choice" && selectedOption !== null) {
      const correct = selectedOption === card.answer
      await handleCheckAnswer(correct)
    } else if (card.cardType === "fill-in") {
      const correct = isCorrectAnswer(fillInput, card.answer)
      await handleCheckAnswer(correct)
    }
  }

  async function handleReportCard() {
    if (!card) return

    setIsReporting(true)
    try {
      await reportCard(card.id, reportReason || undefined)
      setShowReportModal(false)
      setReportReason("")

      // Move to next card
      const nextIndex = index + 1
      if (nextIndex < cards.length) {
        setIndex(nextIndex)
        resetCard()
      } else {
        setIndex(cards.length)
      }
    } catch (error) {
      console.error("Failed to report card:", error)
      alert("Failed to report card. Please try again.")
    } finally {
      setIsReporting(false)
    }
  }

  if (index >= cards.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">🎉 Complete!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You finished all cards in {topic} ({mode} mode).
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/topics">
              <Button>Back to Topics</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isMultipleChoice = card.cardType === "multiple-choice"
  const isFillIn = card.cardType === "fill-in"
  const isFlip = card.cardType === "flip"

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-zinc-950 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Card {index + 1} / {cards.length}
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-8 min-h-96 flex flex-col justify-center items-center mb-6 cursor-pointer shadow-lg">
          {isFlip && (
            <div onClick={() => setFlipped(!flipped)}>
              <div className="text-center">
                {!flipped ? (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Click to reveal
                    </p>
                    <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                      {card.question}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Answer
                    </p>
                    <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                      {card.answer}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {isMultipleChoice && (
            <div className="w-full">
              <p className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 text-center">
                {card.question}
              </p>
              <div className="space-y-3">
                {card.options?.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedOption(option)}
                    disabled={result !== null}
                    className={`w-full p-4 text-left rounded border-2 transition ${
                      selectedOption === option
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
                        : "border-gray-300 dark:border-zinc-600"
                    } ${
                      result !== null && option === card.answer
                        ? "border-green-500 bg-green-50 dark:bg-green-900"
                        : result !== null && selectedOption === option
                          ? "border-red-500 bg-red-50 dark:bg-red-900"
                          : ""
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isFillIn && (
            <div className="w-full">
              <p className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 text-center">
                {card.question}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Answer: {card.answer.replace(/./g, "_")}
              </p>
              <Input
                type="text"
                value={fillInput}
                onChange={(e) => setFillInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={result !== null}
                className="mb-4"
              />
            </div>
          )}
        </div>

        {result !== null && (
          <div
            className={`p-4 rounded-lg mb-6 text-center font-semibold ${
              result === "correct"
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100"
            }`}
          >
            {result === "correct" ? "✓ Correct!" : "✗ Wrong"}
            {result === "wrong" && isFillIn && (
              <p className="text-sm mt-2">Correct answer: {card.answer}</p>
            )}
          </div>
        )}

        <div className="flex gap-4 justify-center mb-6">
          {isFlip && !flipped && (
            <Button onClick={() => setFlipped(true)} variant="outline">
              Reveal
            </Button>
          )}

          {(isFlip || result !== null) && (
            <>
              {isFlip && (
                <>
                  <Button
                    onClick={() => handleProgress("learned")}
                    disabled={saving}
                  >
                    Got it
                  </Button>
                  <Button
                    onClick={() => handleProgress("review")}
                    variant="outline"
                    disabled={saving}
                  >
                    Review later
                  </Button>
                </>
              )}
              {(isMultipleChoice || isFillIn) && (
                <Button
                  onClick={() => {
                    if (isLast) {
                      setIndex(cards.length)
                    } else {
                      setIndex((i) => i + 1)
                      resetCard()
                    }
                  }}
                  disabled={saving}
                >
                  {isLast ? "Finish" : "Next"}
                </Button>
              )}
            </>
          )}

          {!result && (isMultipleChoice || isFillIn) && (
            <Button onClick={handleAnswer} disabled={saving || !selectedOption && isFillIn && !fillInput}>
              Check
            </Button>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => setShowReportModal(true)}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
          >
            🚩 Report Card
          </button>
        </div>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">Report Card</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Is this card incorrect or misleading? Let us know what's wrong.
            </p>

            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Optional: Explain what's wrong (e.g., answer is outdated, question is unclear)"
              className="w-full p-3 border rounded bg-white dark:bg-zinc-800 text-black dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
            />

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportReason("")
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReportCard}
                disabled={isReporting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isReporting ? "Reporting..." : "Report Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
