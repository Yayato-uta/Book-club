import { describe, it, expect } from 'vitest';
import { exportFilename, exportState, importState, mergeState, nextChapter } from './storage';
import type { Book } from './types';

function book(entries: Book['entries'], id = 'b'): Book {
  return {
    id, title: 'T', author: 'A', genre: 'fiction', totalChapters: 5,
    status: 'reading', addedAt: new Date().toISOString(),
    goal: { chaptersPerWeek: 3 }, companionName: 'Pip', entries,
  };
}

describe('nextChapter', () => {
  it('starts at one', () => {
    expect(nextChapter(book([]))).toBe(1);
  });

  it('follows on from what is logged', () => {
    const e = (c: number) => ({ chapter: c, loggedAt: '', answers: {}, prompts: {} });
    expect(nextChapter(book([e(1), e(2)]))).toBe(3);
  });

  it('fills a gap rather than skipping it', () => {
    const e = (c: number) => ({ chapter: c, loggedAt: '', answers: {}, prompts: {} });
    expect(nextChapter(book([e(1), e(3)]))).toBe(2);
  });
});

describe('importState', () => {
  it('rejects anything that is not an export', () => {
    expect(() => importState('{"nope":1}')).toThrow();
  });

  it('backfills prompts on entries written before they were stored', () => {
    const json = JSON.stringify({
      version: 1,
      books: [{ ...book([{ chapter: 1, loggedAt: 'x', answers: { a: 'hi' } } as never]) }],
    });
    const state = importState(json);
    expect(state.books[0].entries[0].prompts).toEqual({});
  });

  it('repairs a missing goal', () => {
    const json = JSON.stringify({ version: 1, books: [{ ...book([]), goal: undefined }] });
    expect(importState(json).books[0].goal.chaptersPerWeek).toBe(3);
  });
});

describe('mergeState', () => {
  const state = (books: Book[]) => ({ version: 1, books });

  it('adds books the shelf has never seen', () => {
    const result = mergeState(state([book([], 'a')]), state([book([], 'b')]));
    expect(result.added).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.state.books.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('replaces a book the shelf already has, keeping the imported entries', () => {
    const e = (c: number) => ({ chapter: c, loggedAt: '', answers: {}, prompts: {} });
    const result = mergeState(state([book([e(1)], 'a')]), state([book([e(1), e(2)], 'a')]));
    expect(result.added).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.state.books).toHaveLength(1);
    expect(result.state.books[0].entries).toHaveLength(2);
  });

  it('never drops a book that is only on the shelf', () => {
    const result = mergeState(state([book([], 'a')]), state([]));
    expect(result.state.books.map((b) => b.id)).toEqual(['a']);
  });

  it('restores a whole shelf onto an empty device', () => {
    const result = mergeState(state([]), state([book([], 'a'), book([], 'b')]));
    expect(result.added).toBe(2);
    expect(result.state.books).toHaveLength(2);
  });
});

describe('export and import round-trip', () => {
  it('comes back with what went in', () => {
    const e = (c: number) => ({ chapter: c, loggedAt: 'x', answers: { q: 'a' }, prompts: { q: 'Q?' } });
    const original = { version: 1, books: [book([e(1), e(2)], 'a')] };
    expect(importState(exportState(original))).toEqual(original);
  });
});

describe('exportFilename', () => {
  it('is dated so successive backups do not collide', () => {
    expect(exportFilename(new Date('2026-09-09T12:00:00Z'))).toBe('book-club-2026-09-09.json');
  });
});
