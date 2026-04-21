export function isCorrectAnswer(userInput: string, correctAnswer: string): boolean {
  return userInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
}
