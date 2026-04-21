import { describe, it, expect } from "vitest"
import { isCorrectAnswer } from "./answer"

describe("isCorrectAnswer", () => {
  it("matches exact string", () => {
    expect(isCorrectAnswer("7", "7")).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(isCorrectAnswer("TCP", "tcp")).toBe(true)
    expect(isCorrectAnswer("transfer", "Transfer")).toBe(true)
  })

  it("trims whitespace", () => {
    expect(isCorrectAnswer("  7  ", "7")).toBe(true)
    expect(isCorrectAnswer("7", "  7  ")).toBe(true)
  })

  it("returns false for wrong answer", () => {
    expect(isCorrectAnswer("UDP", "TCP")).toBe(false)
  })

  it("returns false for empty input", () => {
    expect(isCorrectAnswer("", "7")).toBe(false)
  })
})
