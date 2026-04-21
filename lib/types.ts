export type CardType = "flip" | "multiple-choice" | "fill-in"
export type ProgressStatus = "unseen" | "learned" | "review"

export interface CardWithProgress {
  id: string
  topic: string
  cardType: CardType
  question: string
  questionImage: string | null
  answer: string
  answerImage: string | null
  options: string[] | null
  sortOrder: number
  status: ProgressStatus
}

export interface TopicProgress {
  topic: string
  learnTotal: number
  learnLearned: number
  testTotal: number
  testLearned: number
}
