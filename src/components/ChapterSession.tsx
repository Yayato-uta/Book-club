import { useMemo, useState } from 'react';
import type { Book, ChapterEntry } from '../lib/types';
import { selectQuestions, CATEGORY_LABEL } from '../lib/questions';
import {
  previewSessionXp,
  SUBSTANTIVE_ANSWER_CHARS,
  expectedGapDays,
  daysBetween,
  lastFedAt,
} from '../lib/companion';

interface Props {
  book: Book;
  chapter: number;
  onCancel: () => void;
  onSave: (entry: ChapterEntry) => void;
}

export default function ChapterSession({ book, chapter, onCancel, onSave }: Props) {
  const questions = useMemo(() => selectQuestions(book, chapter), [book, chapter]);
  const existing = book.entries.find((e) => e.chapter === chapter);
  const [answers, setAnswers] = useState<Record<string, string>>(existing?.answers ?? {});

  // Whether saving now would still count as keeping pace.
  const onTime =
    book.entries.length === 0 ||
    daysBetween(lastFedAt(book), new Date()) <= expectedGapDays(book.goal.chaptersPerWeek) + 1;

  const xp = previewSessionXp(Object.values(answers), onTime);

  const save = () => {
    const cleaned: Record<string, string> = {};
    const prompts: Record<string, string> = {};
    for (const [id, text] of Object.entries(answers)) {
      if (!text.trim()) continue;
      cleaned[id] = text.trim();
      const asked = questions.find((q) => q.id === id);
      if (asked) prompts[id] = asked.text;
    }
    onSave({ chapter, loggedAt: new Date().toISOString(), answers: cleaned, prompts });
  };

  return (
    <div className="rounded-xl bg-card border border-rule shadow-card p-5 space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-2xl">Chapter {chapter}</h3>
        <span className="text-sm text-muted">
          {onTime ? 'On pace' : 'Behind pace'} · +{xp} XP
        </span>
      </div>

      <p className="text-sm text-muted">
        Answer what you can. Anything under {SUBSTANTIVE_ANSWER_CHARS} characters is kept but does
        not feed {book.companionName} — the point is to think, not to tick a box.
      </p>

      <ol className="space-y-5">
        {questions.map((q) => {
          const value = answers[q.id] ?? '';
          const counts = value.trim().length >= SUBSTANTIVE_ANSWER_CHARS;
          return (
            <li key={q.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-accent border border-accent/30 rounded px-1.5 py-0.5">
                  {CATEGORY_LABEL[q.category]}
                </span>
                {counts && <span className="text-[10px] text-thriving">counts</span>}
              </div>
              <p className="font-serif text-lg leading-snug">{q.text}</p>
              <textarea
                value={value}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                rows={4}
                className="w-full resize-y"
                placeholder="Write freely — nobody else reads this."
              />
            </li>
          );
        })}
      </ol>

      <div className="flex gap-3">
        <button
          onClick={save}
          className="rounded-lg bg-accent text-white px-4 py-2 text-sm hover:opacity-90 transition"
        >
          {existing ? 'Update chapter' : `Feed ${book.companionName}`}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-rule px-4 py-2 text-sm hover:bg-paper transition">
          Not now
        </button>
      </div>
    </div>
  );
}
