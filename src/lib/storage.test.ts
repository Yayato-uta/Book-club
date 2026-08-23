import { describe, it, expect } from 'vitest';
import { importState, nextChapter } from './storage';
import type { Book } from './types';

function book(entries: Book['entries']): Book {
  return {
    id: 'b', title: 'T', author: 'A', genre: 'fiction', totalChapters: 5,
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
