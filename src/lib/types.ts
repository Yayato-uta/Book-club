export type Genre = 'fiction' | 'nonfiction';

export type BookStatus = 'queued' | 'reading' | 'finished';

/** A single question put to the reader at the end of a chapter. */
export interface Question {
  id: string;
  category: QuestionCategory;
  text: string;
}

export type QuestionCategory =
  | 'recall'
  | 'analysis'
  | 'critique'
  | 'connection'
  | 'reflection';

/** One completed chapter session: the chapter, when it was read, what was written. */
export interface ChapterEntry {
  chapter: number;
  /** ISO date-time of when the session was logged. */
  loggedAt: string;
  /** Answers keyed by question id. Blank answers are not stored. */
  answers: Record<string, string>;
  /**
   * The question text as it was actually put, keyed by the same ids. Snapshotted
   * so that editing the question bank later never orphans what you wrote.
   */
  prompts: Record<string, string>;
}

export interface Goal {
  /** How many chapters the reader intends to finish each week. */
  chaptersPerWeek: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: Genre;
  /** Total chapters; used for progress and for end-of-book questions. */
  totalChapters: number;
  status: BookStatus;
  addedAt: string;
  goal: Goal;
  /** Name the reader gives this book's companion. */
  companionName: string;
  entries: ChapterEntry[];
}

export interface AppState {
  version: number;
  books: Book[];
}
