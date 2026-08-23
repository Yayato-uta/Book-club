import { describe, it, expect } from 'vitest';
import type { Book, ChapterEntry } from './types';
import {
  companionStats,
  currentStreak,
  expectedGapDays,
  healthFor,
  longestStreak,
  moodFor,
  stageFor,
  totalXp,
} from './companion';

const DAY = 86_400_000;
const NOW = new Date('2026-03-01T12:00:00Z');

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * DAY).toISOString();
}

function entry(chapter: number, days: number, answers: string[] = []): ChapterEntry {
  return {
    chapter,
    loggedAt: daysAgo(days),
    answers: Object.fromEntries(answers.map((a, i) => [`q${i}`, a])),
    prompts: Object.fromEntries(answers.map((_, i) => [`q${i}`, `Question ${i}`])),
  };
}

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1',
    title: 'Test',
    author: 'A',
    genre: 'fiction',
    totalChapters: 10,
    status: 'reading',
    addedAt: daysAgo(30),
    goal: { chaptersPerWeek: 7 }, // one chapter a day
    companionName: 'Pip',
    entries: [],
    ...overrides,
  };
}

const LONG = 'a substantive answer that is well over the threshold';

describe('expectedGapDays', () => {
  it('converts a weekly goal into days between chapters', () => {
    expect(expectedGapDays(7)).toBe(1);
    expect(expectedGapDays(1)).toBe(7);
    expect(expectedGapDays(2)).toBe(3.5);
  });

  it('treats a zero or negative goal as one chapter a week', () => {
    expect(expectedGapDays(0)).toBe(7);
    expect(expectedGapDays(-3)).toBe(7);
  });
});

describe('healthFor', () => {
  it('is full right after a chapter', () => {
    expect(healthFor(book({ entries: [entry(1, 0)] }), NOW)).toBe(100);
  });

  it('stays full inside the grace period', () => {
    // goal of 7/week means a 1 day gap, plus 1 day slack = 2 days of grace
    expect(healthFor(book({ entries: [entry(1, 2)] }), NOW)).toBe(100);
  });

  it('drops 15 points per day past the grace period', () => {
    expect(healthFor(book({ entries: [entry(1, 3)] }), NOW)).toBe(85);
    expect(healthFor(book({ entries: [entry(1, 5)] }), NOW)).toBe(55);
  });

  it('bottoms out at zero rather than going negative', () => {
    expect(healthFor(book({ entries: [entry(1, 60)] }), NOW)).toBe(0);
  });

  it('decays from the date added when nothing has been read', () => {
    expect(healthFor(book({ addedAt: daysAgo(10), entries: [] }), NOW)).toBe(0);
    expect(healthFor(book({ addedAt: daysAgo(1), entries: [] }), NOW)).toBe(100);
  });

  it('gives a gentler goal more slack', () => {
    const relaxed = book({ goal: { chaptersPerWeek: 1 }, entries: [entry(1, 7)] });
    expect(healthFor(relaxed, NOW)).toBe(100);
  });
});

describe('streaks', () => {
  it('counts a first session as on time', () => {
    expect(currentStreak(book({ entries: [entry(1, 0)] }))).toBe(1);
  });

  it('builds while chapters land inside the allowed gap', () => {
    const b = book({ entries: [entry(1, 4), entry(2, 3), entry(3, 2)] });
    expect(currentStreak(b)).toBe(3);
  });

  it('resets when a gap is missed', () => {
    // 20 days, then 2, then 1 — the second session breaks the run
    const b = book({ entries: [entry(1, 20), entry(2, 2), entry(3, 1)] });
    expect(currentStreak(b)).toBe(2);
    expect(longestStreak(b)).toBe(2);
  });

  it('remembers the best run even after it breaks', () => {
    const b = book({
      entries: [entry(1, 30), entry(2, 29), entry(3, 28), entry(4, 5), entry(5, 4)],
    });
    expect(longestStreak(b)).toBe(3);
    expect(currentStreak(b)).toBe(2);
  });
});

describe('totalXp', () => {
  it('gives a base plus an on-time bonus for a bare session', () => {
    expect(totalXp(book({ entries: [entry(1, 0)] }))).toBe(15);
  });

  it('pays per substantive answer', () => {
    expect(totalXp(book({ entries: [entry(1, 0, [LONG, LONG])] }))).toBe(25);
  });

  it('ignores answers under the threshold', () => {
    expect(totalXp(book({ entries: [entry(1, 0, ['no', 'yes'])] }))).toBe(15);
  });

  it('withholds the bonus for a late session', () => {
    const b = book({ entries: [entry(1, 30), entry(2, 0)] });
    // first: 10 + 5 on time, second: 10 with no bonus
    expect(totalXp(b)).toBe(25);
  });
});

describe('stageFor', () => {
  it('starts as an egg', () => {
    expect(stageFor(0).stage.id).toBe('egg');
  });

  it('advances at each threshold', () => {
    expect(stageFor(45).stage.id).toBe('hatchling');
    expect(stageFor(130).stage.id).toBe('fledgling');
    expect(stageFor(280).stage.id).toBe('companion');
    expect(stageFor(500).stage.id).toBe('sage');
  });

  it('reports progress toward the next stage', () => {
    const { progress, next } = stageFor(87); // midway between 45 and 130
    expect(next?.id).toBe('fledgling');
    expect(progress).toBeCloseTo((87 - 45) / (130 - 45), 5);
  });

  it('caps at the final stage', () => {
    const { stage, next, progress } = stageFor(9999);
    expect(stage.id).toBe('sage');
    expect(next).toBeNull();
    expect(progress).toBe(1);
  });
});

describe('moodFor', () => {
  it('maps health onto a mood', () => {
    const b = book();
    expect(moodFor(b, 90)).toBe('thriving');
    expect(moodFor(b, 65)).toBe('content');
    expect(moodFor(b, 45)).toBe('restless');
    expect(moodFor(b, 25)).toBe('unwell');
    expect(moodFor(b, 5)).toBe('fading');
  });

  it('is fulfilled once the book is finished, whatever the health', () => {
    expect(moodFor(book({ status: 'finished' }), 0)).toBe('fulfilled');
  });
});

describe('companionStats', () => {
  it('unlocks the bookmark on the first chapter', () => {
    const stats = companionStats(book({ entries: [entry(1, 0)] }), NOW);
    expect(stats.unlocked.map((a) => a.id)).toContain('bookmark');
  });

  it('unlocks the scarf after three on-pace chapters', () => {
    const b = book({ entries: [entry(1, 3), entry(2, 2), entry(3, 1)] });
    expect(companionStats(b, NOW).unlocked.map((a) => a.id)).toContain('scarf');
  });

  it('unlocks the quill for a long answer', () => {
    const b = book({ entries: [entry(1, 0, ['x'.repeat(250)])] });
    expect(companionStats(b, NOW).unlocked.map((a) => a.id)).toContain('quill');
  });

  it('unlocks the laurel only when finished', () => {
    const reading = companionStats(book({ entries: [entry(1, 0)] }), NOW);
    expect(reading.unlocked.map((a) => a.id)).not.toContain('laurel');
    const done = companionStats(book({ status: 'finished', entries: [entry(1, 0)] }), NOW);
    expect(done.unlocked.map((a) => a.id)).toContain('laurel');
  });

  it('counts only the trailing week toward pace', () => {
    const b = book({ entries: [entry(1, 20), entry(2, 3), entry(3, 1)] });
    expect(companionStats(b, NOW).weeklyPace.done).toBe(2);
  });

  it('puts every accessory in exactly one of unlocked or locked', () => {
    const stats = companionStats(book({ entries: [entry(1, 0)] }), NOW);
    const ids = [...stats.unlocked, ...stats.locked].map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });
});
