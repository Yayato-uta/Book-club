import type { AppState, Book } from './types';

const KEY = 'book-club/state';
const VERSION = 1;

export const emptyState: AppState = { version: VERSION, books: [] };

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.books)) return emptyState;
    return { version: VERSION, books: parsed.books.map(normaliseBook) };
  } catch {
    return emptyState;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private window). The session stays usable in
    // memory; nothing we can do here but keep going.
  }
}

/** Fill in anything a hand-edited or older export might be missing. */
function normaliseBook(book: Book): Book {
  return {
    ...book,
    genre: book.genre === 'nonfiction' ? 'nonfiction' : 'fiction',
    totalChapters: Number.isFinite(book.totalChapters) ? book.totalChapters : 0,
    goal: { chaptersPerWeek: Math.max(1, book.goal?.chaptersPerWeek ?? 3) },
    entries: Array.isArray(book.entries)
      ? book.entries.map((e) => ({ ...e, answers: e.answers ?? {}, prompts: e.prompts ?? {} }))
      : [],
    companionName: book.companionName || 'Companion',
  };
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  const parsed = JSON.parse(json) as AppState;
  if (!parsed || !Array.isArray(parsed.books)) throw new Error('Not a Book Club export');
  return { version: VERSION, books: parsed.books.map(normaliseBook) };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** The lowest chapter number not yet logged. */
export function nextChapter(book: Book): number {
  const done = new Set(book.entries.map((e) => e.chapter));
  let n = 1;
  while (done.has(n)) n++;
  return n;
}
