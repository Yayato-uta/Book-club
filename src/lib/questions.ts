import type { Book, Question, QuestionCategory } from './types';

/**
 * Questions are drawn from a curated bank rather than generated, so the app
 * works offline and with no API key. Selection is seeded by book + chapter, so
 * the same chapter always shows the same questions — you can close the tab
 * mid-answer and come back to the same three prompts.
 *
 * `selectQuestions` is the only entry point the UI uses. To swap in
 * model-generated questions later, keep this signature and change the body.
 */

interface Prompt {
  id: string;
  text: string;
}

type Bank = Record<QuestionCategory, { shared: Prompt[]; fiction: Prompt[]; nonfiction: Prompt[] }>;

const p = (id: string, text: string): Prompt => ({ id, text });

const BANK: Bank = {
  recall: {
    shared: [
      p('r1', 'Without looking back at the page: what actually happened in this chapter? Three sentences, no more.'),
      p('r2', 'What is the one thing from this chapter you would want to remember a year from now?'),
      p('r3', 'Summarise this chapter as a newspaper headline and a one-line subheading.'),
      p('r4', 'Which sentence or passage did you slow down for? Copy it out and say why it caught you.'),
      p('r5', 'If you had to cut this chapter to a single paragraph, what survives the cut?'),
    ],
    fiction: [
      p('rf1', 'Where are the characters at the end of this chapter that they were not at the start — physically, or otherwise?'),
      p('rf2', 'Who wanted something in this chapter, and did they get it?'),
      p('rf3', 'What did you learn about a character here that you did not know before?'),
    ],
    nonfiction: [
      p('rn1', "State the author's central claim in this chapter in your own words — not theirs."),
      p('rn2', 'What evidence did the author put forward here, and what kind was it: data, anecdote, authority, or argument?'),
      p('rn3', 'What question was this chapter trying to answer?'),
    ],
  },
  analysis: {
    shared: [
      p('a1', 'What did the author choose *not* to tell you in this chapter? Why might they have held it back?'),
      p('a2', 'How does this chapter change the meaning of something that came earlier?'),
      p('a3', 'What is this chapter doing structurally — setting up, escalating, digressing, resolving? How can you tell?'),
      p('a4', 'Pick one word the author repeats. What work is it doing?'),
    ],
    fiction: [
      p('af1', 'Whose point of view are you locked into here, and what does that vantage point conceal?'),
      p('af2', 'What is a character saying that they do not appear to believe?'),
      p('af3', 'What tension was introduced or tightened here, and what would have to happen to release it?'),
      p('af4', 'If this chapter has a mood, what is it built out of — setting, pacing, dialogue, or something else?'),
    ],
    nonfiction: [
      p('an1', 'What has to be true for this argument to hold? List the assumptions the author leaves unstated.'),
      p('an2', 'Is the evidence here doing the work the author thinks it is doing? Where is the gap between claim and proof?'),
      p('an3', 'Who benefits if you believe this chapter? Who loses?'),
      p('an4', 'How would you go about testing the claim in this chapter?'),
    ],
  },
  critique: {
    shared: [
      p('c1', 'What in this chapter did you find unconvincing, and what would it take to convince you?'),
      p('c2', 'Argue the opposite of the chapter for one paragraph. How strong is the case?'),
      p('c3', 'Where was the author being lazy — with a phrase, a leap, or an easy answer?'),
      p('c4', 'What would a reader who disagrees with this chapter say first?'),
    ],
    fiction: [
      p('cf1', 'Did anyone behave in a way the book has not earned? Say who and where.'),
      p('cf2', 'Was anything here too convenient for the plot? What would the harder version have looked like?'),
    ],
    nonfiction: [
      p('cn1', 'Which counter-argument did the author avoid, and is the avoidance honest or evasive?'),
      p('cn2', 'Is the example chosen here representative, or is it the one case that works?'),
    ],
  },
  connection: {
    shared: [
      p('n1', 'What does this chapter remind you of — from another book, or from your own life?'),
      p('n2', 'Where have you seen this idea before under a different name?'),
      p('n3', 'Who do you know who should read this chapter, and what would they say about it?'),
      p('n4', 'If you could put the author in a room with one other writer you have read, what would they argue about?'),
    ],
    fiction: [
      p('nf1', 'Have you ever been in the position one of these characters is in? What did you do?'),
    ],
    nonfiction: [
      p('nn1', 'What in your own life would you have to change if you took this chapter seriously?'),
      p('nn2', 'Does this square with your own experience, or contradict it?'),
    ],
  },
  reflection: {
    shared: [
      p('f1', 'What are you now curious about that you were not curious about an hour ago?'),
      p('f2', 'Did this chapter change your mind about anything, even slightly? Be specific.'),
      p('f3', 'What did you resist while reading this, and why do you think you resisted it?'),
      p('f4', 'What do you expect to happen next, and how confident are you?'),
      p('f5', 'Rate this chapter out of ten and defend the number.'),
    ],
    fiction: [],
    nonfiction: [],
  },
};

const FIRST_CHAPTER: Prompt[] = [
  p('first1', 'Before you go further: why did you buy this book? What did you want from it?'),
  p('first2', 'What promise does this opening make to you as a reader?'),
  p('first3', 'What do you already believe about this subject, before the author gets to work on you?'),
];

const FINAL_CHAPTER: Prompt[] = [
  p('last1', 'The book is finished. Did it keep the promise it made in its opening?'),
  p('last2', 'What will you still be carrying from this book in five years?'),
  p('last3', 'Who is this book actually for, and were you that person?'),
  p('last4', 'What would you cut, if you were the editor?'),
];

/** Deterministic string hash — same book and chapter always yield the same picks. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(pool: Prompt[], seed: string, category: QuestionCategory): Question | null {
  if (pool.length === 0) return null;
  const chosen = pool[hash(seed) % pool.length];
  return { id: chosen.id, category, text: chosen.text };
}

function poolFor(book: Book, category: QuestionCategory): Prompt[] {
  const group = BANK[category];
  return [...group.shared, ...group[book.genre]];
}

/**
 * Three questions per chapter: one to consolidate what was read, one to work
 * on how the text is built or where it fails, and one to tie it back to the
 * reader. First and last chapters get a book-level question in place of the
 * third.
 */
export function selectQuestions(book: Book, chapter: number): Question[] {
  const seed = `${book.id}:${chapter}`;
  const questions: Question[] = [];

  const recall = pick(poolFor(book, 'recall'), `${seed}:recall`, 'recall');
  if (recall) questions.push(recall);

  const secondCategory: QuestionCategory = hash(`${seed}:pick2`) % 3 === 0 ? 'critique' : 'analysis';
  const second = pick(poolFor(book, secondCategory), `${seed}:${secondCategory}`, secondCategory);
  if (second) questions.push(second);

  const isFirst = chapter === 1;
  const isLast = book.totalChapters > 0 && chapter === book.totalChapters;

  if (isLast) {
    const chosen = FINAL_CHAPTER[hash(`${seed}:last`) % FINAL_CHAPTER.length];
    questions.push({ id: chosen.id, category: 'reflection', text: chosen.text });
  } else if (isFirst) {
    const chosen = FIRST_CHAPTER[hash(`${seed}:first`) % FIRST_CHAPTER.length];
    questions.push({ id: chosen.id, category: 'reflection', text: chosen.text });
  } else {
    const thirdCategory: QuestionCategory = hash(`${seed}:pick3`) % 2 === 0 ? 'connection' : 'reflection';
    const third = pick(poolFor(book, thirdCategory), `${seed}:${thirdCategory}`, thirdCategory);
    if (third) questions.push(third);
  }

  return questions;
}

export const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  recall: 'Recall',
  analysis: 'Analysis',
  critique: 'Critique',
  connection: 'Connection',
  reflection: 'Reflection',
};
