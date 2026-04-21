"use client"
import { useState } from "react"
import { updateProgress } from "@/app/actions"
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
    setResult(correct ? "correct" : "wrong")
    const status: ProgressStatus = correct ? "learned" : "review"
    setSaving(true)
    await updateProgress(card.id, status)
    setSaving(false)
  }

  function handleNext() {
    if (isLast) {
      setIndex(cards.length)
    } else {
      setIndex((i) => i + 1)
      resetCard()
    }
  }

  // Completion screen
  if (index >= cards.length) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <p className="text-4xl">✓</p>
        <div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Session complete</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            You went through all {cards.length} cards.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setIndex(0); resetCard() }}>
            Restart
          </Button>
          <Link href="/dashboard">
            <Button>Back to dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <Link href="/topics" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
          ← {topic}
        </Link>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {index + 1} / {cards.length}
        </span>
      </div>
      <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-900 dark:bg-zinc-50 rounded-full transition-all duration-300"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Mode chip */}
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {mode === "learn" ? "Learn" : "Test"}
      </span>

      {/* FLIP card */}
      {card.cardType === "flip" && (
        <>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="w-full min-h-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            aria-label={flipped ? "Tap to show question" : "Tap to reveal answer"}
          >
            {card.questionImage && !flipped && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.questionImage} alt="" className="max-h-32 object-contain" />
            )}
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-50 leading-relaxed">
              {flipped ? card.answer : card.question}
            </p>
            {card.answerImage && flipped && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.answerImage} alt="" className="max-h-32 object-contain" />
            )}
            {!flipped && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Tap to reveal answer</p>
            )}
          </button>

          {flipped && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={saving}
                onClick={() => handleProgress("review")}
              >
                Review later
              </Button>
              <Button
                className="flex-1"
                disabled={saving}
                onClick={() => handleProgress("learned")}
              >
                Got it ✓
              </Button>
            </div>
          )}
        </>
      )}

      {/* MULTIPLE CHOICE card */}
      {card.cardType === "multiple-choice" && (
        <>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
            {card.questionImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.questionImage} alt="" className="max-h-32 object-contain mx-auto mb-4" />
            )}
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-50 leading-relaxed">
              {card.question}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {(card.options ?? []).map((opt, i) => {
              const letter = ["A", "B", "C", "D"][i]
              const isSelected = selectedOption === opt
              const isCorrect = result !== null && opt === card.answer
              const isWrong = result !== null && isSelected && opt !== card.answer

              return (
                <button
                  key={opt}
                  disabled={result !== null}
                  onClick={() => setSelectedOption(opt)}
                  className={[
                    "flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left text-sm transition-colors",
                    isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                      : isWrong
                      ? "border-red-400 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                      : isSelected
                      ? "border-zinc-900 dark:border-zinc-50 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600",
                  ].join(" ")}
                >
                  <span className={[
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    isSelected && result === null
                      ? "bg-white/20 text-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
                  ].join(" ")}>
                    {letter}
                  </span>
                  {opt}
                </button>
              )
            })}
          </div>

          {result === null ? (
            <Button
              disabled={!selectedOption || saving}
              onClick={() => handleCheckAnswer(selectedOption === card.answer)}
            >
              Check answer
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className={`text-sm font-semibold text-center ${result === "correct" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                {result === "correct" ? "✓ Correct!" : "✗ Wrong — the correct answer is shown above."}
              </p>
              <Button onClick={handleNext} disabled={saving}>
                {isLast ? "Finish" : "Next →"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* FILL-IN card */}
      {card.cardType === "fill-in" && (
        <>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
            {card.questionImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.questionImage} alt="" className="max-h-32 object-contain mx-auto mb-4" />
            )}
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-50 leading-relaxed">
              {card.question.replace("___", "___________")}
            </p>
          </div>

          <Input
            value={fillInput}
            onChange={(e) => setFillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && result === null && fillInput.trim()) {
                handleCheckAnswer(isCorrectAnswer(fillInput, card.answer))
              } else if (e.key === "Enter" && result !== null) {
                handleNext()
              }
            }}
            placeholder="Your answer…"
            disabled={result !== null}
            className={
              result === "correct"
                ? "border-green-500 bg-green-50 dark:bg-green-950"
                : result === "wrong"
                ? "border-red-400 bg-red-50 dark:bg-red-950"
                : ""
            }
          />

          {result === null ? (
            <Button
              disabled={!fillInput.trim() || saving}
              onClick={() => handleCheckAnswer(isCorrectAnswer(fillInput, card.answer))}
            >
              Submit
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className={`text-sm font-semibold text-center ${result === "correct" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                {result === "correct"
                  ? "✓ Correct!"
                  : `✗ Wrong — correct answer: "${card.answer}"`}
              </p>
              <Button onClick={handleNext} disabled={saving}>
                {isLast ? "Finish" : "Next →"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
