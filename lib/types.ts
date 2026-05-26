export type Difficulty = "intern" | "analyst" | "associate" | "vp" | "md";

export type QuestionType =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "fractions"
  | "percentage"
  | "squares"
  | "roots"
  | "decimals";

export type SandboxGameMode = "time_trial" | "speed_training" | "penalized";
export type NumberRange = "easy" | "medium" | "hard";

export interface SandboxConfig {
  questionTypes: QuestionType[];
  gameMode: SandboxGameMode;
  questionCount: number;     // time_trial + penalized
  timeBank: number;          // speed_training (seconds)
  timePerQuestion: number;   // penalized
  numberRange: NumberRange;
}

export interface Problem {
  question: string;
  answer: number;
  tolerance: number;
  type: "arithmetic" | "percentage" | "estimation" | "fraction";
}

export interface RoundResult {
  correct: boolean;
  timeTaken: number;
  problem: Problem;
  userAnswer: number;
}

export interface GameState {
  phase: "idle" | "playing" | "results";
  difficulty: Difficulty;
  score: number;
  streak: number;
  maxStreak: number;
  questionIndex: number;
  results: RoundResult[];
  totalQuestions: number;
}

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; timePerQuestion: number; totalQuestions: number; multiplier: number }
> = {
  intern:    { label: "INTERN",    timePerQuestion: 10, totalQuestions: 10, multiplier: 1 },
  analyst:   { label: "ANALYST",   timePerQuestion: 8,  totalQuestions: 10, multiplier: 2 },
  associate: { label: "ASSOCIATE", timePerQuestion: 6,  totalQuestions: 12, multiplier: 3 },
  vp:        { label: "VP",        timePerQuestion: 5,  totalQuestions: 12, multiplier: 5 },
  md:        { label: "MD",        timePerQuestion: 4,  totalQuestions: 15, multiplier: 8 },
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  addition:       "ADDITION",
  subtraction:    "SUBTRACTION",
  multiplication: "MULTIPLICATION",
  division:       "DIVISION",
  fractions:      "FRACTIONS",
  percentage:     "PERCENTAGE",
  squares:        "SQUARES",
  roots:          "ROOTS",
  decimals:       "DECIMALS",
};

export const BASE_REWARD = 1000;
export const WRONG_PENALTY = 500;
export const STREAK_BONUS = 250;
