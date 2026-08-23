import { describe, it, expect } from 'vitest';
import type { Book } from './types';
import { selectQuestions } from './questions';

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: 'seed-1',
    title: 'Test',
    author: 'A',
    genre: 'fiction',
    totalChapters: 12,
    status: 'reading',
    addedAt: new Date().toISOString(),
    goal: { chaptersPerWeek: 3 },
    companionName: 'Pip',
    entries: [],
    ...overrides,
  };
}

describe('selectQuestions', () => {
  it('returns three questions', () => {
    expect(selectQuestions(book(), 4)).toHaveLength(3);
  });

  it('is stable for the same book and chapter', () => {
    const a = selectQuestions(book(), 4);
    const b = selectQuestions(book(), 4);
    expect(a).toEqual(b);
  });

  it('differs across chapters', () => {
    const seen = new Set<string>();
    for (let c = 1; c <= 12; c++) {
      seen.add(selectQuestions(book(), c).map((q) => q.id).join('|'));
    }
    // Not all twelve chapters should draw the identical trio.
    expect(seen.size).toBeGreaterThan(1);
  });

  it('differs across books', () => {
    const a = selectQuestions(book({ id: 'one' }), 5).map((q) => q.id).join('|');
    const b = selectQuestions(book({ id: 'two' }), 5).map((q) => q.id).join('|');
    expect(a).not.toEqual(b);
  });

  it('always opens with a recall question', () => {
    for (let c = 1; c <= 12; c++) {
      expect(selectQuestions(book(), c)[0].category).toBe('recall');
    }
  });

  it('asks a why-did-you-start question on chapter one', () => {
    const ids = selectQuestions(book(), 1).map((q) => q.id);
    expect(ids.some((id) => id.startsWith('first'))).toBe(true);
  });

  it('asks a closing question on the final chapter', () => {
    const ids = selectQuestions(book({ totalChapters: 12 }), 12).map((q) => q.id);
    expect(ids.some((id) => id.startsWith('last'))).toBe(true);
  });

  it('does not ask a closing question when the length is unknown', () => {
    const ids = selectQuestions(book({ totalChapters: 0 }), 12).map((q) => q.id);
    expect(ids.some((id) => id.startsWith('last'))).toBe(false);
  });

  it('draws on genre-specific prompts', () => {
    // Across many chapters a non-fiction book should surface at least one
    // prompt from the non-fiction pool.
    const nf = book({ genre: 'nonfiction', id: 'nf' });
    const ids = new Set<string>();
    for (let c = 1; c <= 40; c++) selectQuestions(nf, c).forEach((q) => ids.add(q.id));
    expect([...ids].some((id) => /^(rn|an|cn|nn)/.test(id))).toBe(true);
  });

  it('never gives the same question twice in one chapter', () => {
    for (let c = 1; c <= 20; c++) {
      const ids = selectQuestions(book(), c).map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
