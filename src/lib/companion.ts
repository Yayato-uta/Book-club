import type { Book, ChapterEntry } from './types';

/**
 * Every book has a companion. It is fed by reading a chapter and answering the
 * questions that follow, and it declines when you fall behind the pace you set
 * for that book. Nothing here mutates state — the companion is derived from
 * the chapter log every time it is rendered.
 */

export type Mood = 'thriving' | 'content' | 'restless' | 'unwell' | 'fading' | 'fulfilled';

export type StageId = 'egg' | 'hatchling' | 'fledgling' | 'companion' | 'sage';

export interface Stage {
  id: StageId;
  label: string;
  /** XP needed to reach this stage. */
  at: number;
}

export const STAGES: Stage[] = [
  { id: 'egg', label: 'Egg', at: 0 },
  { id: 'hatchling', label: 'Hatchling', at: 45 },
  { id: 'fledgling', label: 'Fledgling', at: 130 },
  { id: 'companion', label: 'Companion', at: 280 },
  { id: 'sage', label: 'Sage', at: 500 },
];

const SESSION_XP = 10;
const ANSWER_XP = 5;
const ONTIME_XP = 5;
/** An answer shorter than this is logged but does not feed the companion. */
export const SUBSTANTIVE_ANSWER_CHARS = 15;

const DAY_MS = 86_400_000;

export function daysBetween(from: string | Date, to: string | Date): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return (b - a) / DAY_MS;
}

export function substantiveAnswers(entry: ChapterEntry): number {
  return Object.values(entry.answers).filter(
    (a) => a.trim().length >= SUBSTANTIVE_ANSWER_CHARS,
  ).length;
}

/** Days you may go between chapters before the companion starts to decline. */
export function expectedGapDays(chaptersPerWeek: number): number {
  const perWeek = Math.max(1, chaptersPerWeek);
  return 7 / perWeek;
}

/** Chronologically sorted copy of the log. */
function sortedEntries(book: Book): ChapterEntry[] {
  return [...book.entries].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
  );
}

/**
 * A session is "on time" if it landed within the book's expected gap (plus a
 * day of slack) of the session before it. The first session is always on time.
 */
export function onTimeFlags(book: Book): boolean[] {
  const entries = sortedEntries(book);
  const allowed = expectedGapDays(book.goal.chaptersPerWeek) + 1;
  return entries.map((entry, i) => {
    if (i === 0) return true;
    return daysBetween(entries[i - 1].loggedAt, entry.loggedAt) <= allowed;
  });
}

/**
 * How many sessions run back unbroken from the most recent one. A late session
 * breaks the chain but starts a new one of its own — you still read a chapter,
 * so the streak resets to one rather than to zero.
 */
export function currentStreak(book: Book): number {
  const flags = onTimeFlags(book);
  if (flags.length === 0) return 0;
  let streak = 1;
  for (let i = flags.length - 1; i >= 1; i--) {
    if (!flags[i]) break;
    streak++;
  }
  return streak;
}

export function longestStreak(book: Book): number {
  let best = 0;
  let run = 0;
  onTimeFlags(book).forEach((continued, i) => {
    run = i > 0 && continued ? run + 1 : 1;
    if (run > best) best = run;
  });
  return best;
}

export function totalXp(book: Book): number {
  const entries = sortedEntries(book);
  const flags = onTimeFlags(book);
  return entries.reduce((sum, entry, i) => {
    const answers = substantiveAnswers(entry);
    return sum + SESSION_XP + answers * ANSWER_XP + (flags[i] ? ONTIME_XP : 0);
  }, 0);
}

export function stageFor(xp: number): { stage: Stage; next: Stage | null; progress: number } {
  let index = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (xp >= STAGES[i].at) index = i;
  }
  const stage = STAGES[index];
  const next = STAGES[index + 1] ?? null;
  const progress = next ? (xp - stage.at) / (next.at - stage.at) : 1;
  return { stage, next, progress: Math.min(1, Math.max(0, progress)) };
}

/** The moment the companion was last fed — or the day the book was added. */
export function lastFedAt(book: Book): string {
  const entries = sortedEntries(book);
  return entries.length > 0 ? entries[entries.length - 1].loggedAt : book.addedAt;
}

/**
 * Health falls once you are past the expected gap plus a day of slack, at 15
 * points per further day. Reading a chapter restores it in full.
 */
export function healthFor(book: Book, now: Date = new Date()): number {
  const idle = daysBetween(lastFedAt(book), now);
  const grace = expectedGapDays(book.goal.chaptersPerWeek) + 1;
  const overdue = Math.max(0, idle - grace);
  return Math.min(100, Math.max(0, Math.round(100 - overdue * 15)));
}

export function moodFor(book: Book, health: number): Mood {
  if (book.status === 'finished') return 'fulfilled';
  if (health >= 80) return 'thriving';
  if (health >= 60) return 'content';
  if (health >= 40) return 'restless';
  if (health >= 20) return 'unwell';
  return 'fading';
}

export const MOOD_COPY: Record<Mood, string> = {
  thriving: 'is thriving',
  content: 'is doing well',
  restless: 'is getting restless',
  unwell: 'is unwell',
  fading: 'is fading',
  fulfilled: 'is fulfilled',
};

export interface Accessory {
  id: string;
  label: string;
  hint: string;
}

const ACCESSORIES: (Accessory & { earned: (book: Book, stats: CompanionStats) => boolean })[] = [
  {
    id: 'bookmark',
    label: 'Bookmark',
    hint: 'Log your first chapter',
    earned: (book) => book.entries.length >= 1,
  },
  {
    id: 'glasses',
    label: 'Reading Glasses',
    hint: 'Answer 10 questions properly',
    earned: (book) => book.entries.reduce((n, e) => n + substantiveAnswers(e), 0) >= 10,
  },
  {
    id: 'scarf',
    label: 'Knitted Scarf',
    hint: 'Three chapters in a row, on pace',
    earned: (_book, stats) => stats.longestStreak >= 3,
  },
  {
    id: 'quill',
    label: 'Quill',
    hint: 'Write a single answer over 200 characters',
    earned: (book) =>
      book.entries.some((e) => Object.values(e.answers).some((a) => a.trim().length > 200)),
  },
  {
    id: 'lantern',
    label: 'Reading Lantern',
    hint: 'Reach 150 XP with this book',
    earned: (_book, stats) => stats.xp >= 150,
  },
  {
    id: 'star',
    label: 'Night Star',
    hint: 'Seven chapters in a row, on pace',
    earned: (_book, stats) => stats.longestStreak >= 7,
  },
  {
    id: 'laurel',
    label: 'Laurel Crown',
    hint: 'Finish the book',
    earned: (book) => book.status === 'finished',
  },
];

export interface CompanionStats {
  xp: number;
  stage: Stage;
  nextStage: Stage | null;
  stageProgress: number;
  health: number;
  mood: Mood;
  streak: number;
  longestStreak: number;
  chaptersRead: number;
  answersWritten: number;
  daysIdle: number;
  /** Chapters logged in the trailing seven days, against the weekly goal. */
  weeklyPace: { done: number; goal: number };
  unlocked: Accessory[];
  locked: Accessory[];
}

export function companionStats(book: Book, now: Date = new Date()): CompanionStats {
  const xp = totalXp(book);
  const { stage, next, progress } = stageFor(xp);
  const health = healthFor(book, now);
  const longest = longestStreak(book);
  const answersWritten = book.entries.reduce((n, e) => n + substantiveAnswers(e), 0);
  const recent = book.entries.filter((e) => daysBetween(e.loggedAt, now) <= 7).length;

  const base: CompanionStats = {
    xp,
    stage,
    nextStage: next,
    stageProgress: progress,
    health,
    mood: moodFor(book, health),
    streak: currentStreak(book),
    longestStreak: longest,
    chaptersRead: book.entries.length,
    answersWritten,
    daysIdle: Math.max(0, daysBetween(lastFedAt(book), now)),
    weeklyPace: { done: recent, goal: book.goal.chaptersPerWeek },
    unlocked: [],
    locked: [],
  };

  for (const a of ACCESSORIES) {
    const entry: Accessory = { id: a.id, label: a.label, hint: a.hint };
    if (a.earned(book, base)) base.unlocked.push(entry);
    else base.locked.push(entry);
  }

  return base;
}

/** XP a session would be worth — shown to the reader before they save. */
export function previewSessionXp(answers: string[], onTime: boolean): number {
  const good = answers.filter((a) => a.trim().length >= SUBSTANTIVE_ANSWER_CHARS).length;
  return SESSION_XP + good * ANSWER_XP + (onTime ? ONTIME_XP : 0);
}
