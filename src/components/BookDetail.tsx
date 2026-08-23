import { useState } from 'react';
import type { Book, ChapterEntry } from '../lib/types';
import { companionStats, MOOD_COPY } from '../lib/companion';
import { nextChapter } from '../lib/storage';
import { selectQuestions } from '../lib/questions';
import Companion from './Companion';
import ChapterSession from './ChapterSession';

interface Props {
  book: Book;
  onBack: () => void;
  onUpdate: (patch: Partial<Book>) => void;
  onDelete: () => void;
  onLog: (entry: ChapterEntry) => void;
}

export default function BookDetail({ book, onBack, onUpdate, onDelete, onLog }: Props) {
  const stats = companionStats(book);
  const [sessionChapter, setSessionChapter] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const suggested = nextChapter(book);

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="text-sm text-muted hover:text-ink transition">
        ← Back to shelf
      </button>

      <header className="space-y-1">
        <h1 className="font-serif text-3xl leading-tight">{book.title}</h1>
        <p className="text-muted">
          {book.author} · {book.genre === 'fiction' ? 'Fiction' : 'Non-fiction'}
        </p>
      </header>

      {/* Companion panel */}
      <section className="rounded-xl bg-card border border-rule shadow-card p-5">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <Companion
            seed={book.id}
            stage={stats.stage.id}
            mood={stats.mood}
            health={stats.health}
            accessories={stats.unlocked.map((a) => a.id)}
            size={168}
          />
          <div className="flex-1 w-full space-y-4">
            <div>
              <p className="font-serif text-2xl">{book.companionName}</p>
              <p className="text-muted">
                {MOOD_COPY[stats.mood]} · {stats.stage.label}
              </p>
            </div>

            <Meter label="Health" value={stats.health} max={100} tone="health" />
            {stats.nextStage ? (
              <Meter
                label={`To ${stats.nextStage.label}`}
                value={Math.round(stats.stageProgress * 100)}
                max={100}
                tone="xp"
                caption={`${stats.xp} / ${stats.nextStage.at} XP`}
              />
            ) : (
              <p className="text-sm text-muted">{stats.xp} XP · fully grown</p>
            )}

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Chapters" value={book.totalChapters > 0 ? `${stats.chaptersRead}/${book.totalChapters}` : `${stats.chaptersRead}`} />
              <Stat label="Streak" value={`${stats.streak}`} />
              <Stat label="This week" value={`${stats.weeklyPace.done}/${stats.weeklyPace.goal}`} />
              <Stat label="Answers" value={`${stats.answersWritten}`} />
            </dl>

            {stats.daysIdle > 1 && book.status !== 'finished' && (
              <p className="text-sm text-unwell">
                Last fed {Math.floor(stats.daysIdle)} day{Math.floor(stats.daysIdle) === 1 ? '' : 's'} ago.
              </p>
            )}
          </div>
        </div>

        {/* Accessories */}
        <div className="mt-6 pt-5 border-t border-rule">
          <h3 className="text-xs uppercase tracking-widest text-muted mb-3">Accessories</h3>
          <ul className="flex flex-wrap gap-2">
            {stats.unlocked.map((a) => (
              <li key={a.id} className="rounded-full bg-accent/10 text-accent border border-accent/30 px-3 py-1 text-sm">
                {a.label}
              </li>
            ))}
            {stats.locked.map((a) => (
              <li
                key={a.id}
                title={a.hint}
                className="rounded-full bg-paper text-muted border border-rule px-3 py-1 text-sm"
              >
                🔒 {a.hint}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Session */}
      {sessionChapter !== null ? (
        <ChapterSession
          book={book}
          chapter={sessionChapter}
          onCancel={() => setSessionChapter(null)}
          onSave={(entry) => {
            onLog(entry);
            setSessionChapter(null);
          }}
        />
      ) : (
        <section className="rounded-xl border border-dashed border-rule p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-serif text-lg">Finished a chapter?</p>
            <p className="text-muted text-sm">
              Three questions, then {book.companionName} eats.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Chapter</label>
            <input
              type="number"
              min="1"
              defaultValue={suggested}
              id="chapter-input"
              className="w-20"
            />
            <button
              onClick={() => {
                const el = document.getElementById('chapter-input') as HTMLInputElement | null;
                const n = Math.max(1, parseInt(el?.value ?? '', 10) || suggested);
                setSessionChapter(n);
              }}
              className="rounded-lg bg-accent text-white px-4 py-2 text-sm hover:opacity-90 transition"
            >
              Start
            </button>
          </div>
        </section>
      )}

      {/* Goal + status */}
      <section className="rounded-xl bg-card border border-rule shadow-card p-5 space-y-4">
        <h3 className="text-xs uppercase tracking-widest text-muted">Your goal for this book</h3>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="number"
              min="1"
              value={book.goal.chaptersPerWeek}
              onChange={(e) =>
                onUpdate({ goal: { chaptersPerWeek: Math.max(1, parseInt(e.target.value, 10) || 1) } })
              }
              className="w-20"
            />
            chapters per week
          </label>
          <label className="flex items-center gap-2 text-sm">
            Status
            <select
              value={book.status}
              onChange={(e) => onUpdate({ status: e.target.value as Book['status'] })}
            >
              <option value="queued">Up next</option>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            Chapters
            <input
              type="number"
              min="0"
              value={book.totalChapters}
              onChange={(e) => onUpdate({ totalChapters: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className="w-20"
            />
          </label>
        </div>
        <p className="text-xs text-muted">
          A gentler pace means {book.companionName} can go longer between meals without getting
          sick. Set it to something you will actually hit.
        </p>
      </section>

      {/* Log */}
      <ChapterLog book={book} onReopen={setSessionChapter} />

      <div className="pt-4">
        {confirmDelete ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">Delete this book and everything you wrote about it?</span>
            <button onClick={onDelete} className="rounded-lg bg-fading text-white px-3 py-1.5 hover:opacity-90 transition">
              Delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-rule px-3 py-1.5">
              Keep
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-sm text-muted hover:text-fading transition">
            Remove from shelf
          </button>
        )}
      </div>
    </div>
  );
}

function ChapterLog({ book, onReopen }: { book: Book; onReopen: (chapter: number) => void }) {
  const entries = [...book.entries].sort((a, b) => b.chapter - a.chapter);
  if (entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-xs uppercase tracking-widest text-muted">What you wrote</h3>
      <ul className="space-y-3">
        {entries.map((entry) => {
          const questions = selectQuestions(book, entry.chapter);
          return (
            <li key={entry.chapter} className="rounded-xl bg-card border border-rule shadow-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-lg">Chapter {entry.chapter}</p>
                <button onClick={() => onReopen(entry.chapter)} className="text-xs text-muted hover:text-accent transition">
                  Edit
                </button>
              </div>
              <p className="text-xs text-muted mb-3">
                {new Date(entry.loggedAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <dl className="space-y-3">
                {Object.entries(entry.answers).map(([id, answer]) => {
                  // Prefer the question as it was actually asked; fall back to
                  // the current bank for entries written before prompts were
                  // snapshotted, so nothing you wrote is ever hidden.
                  const text = entry.prompts?.[id] ?? questions.find((q) => q.id === id)?.text;
                  return (
                    <div key={id}>
                      {text ? (
                        <dt className="text-sm text-muted">{text}</dt>
                      ) : (
                        <dt className="text-sm text-muted italic">An earlier question</dt>
                      )}
                      <dd className="whitespace-pre-wrap">{answer}</dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Meter({
  label,
  value,
  max,
  tone,
  caption,
}: {
  label: string;
  value: number;
  max: number;
  tone: 'health' | 'xp';
  caption?: string;
}) {
  const pct = Math.round((value / max) * 100);
  const color =
    tone === 'xp'
      ? 'bg-accent'
      : pct >= 80
        ? 'bg-thriving'
        : pct >= 60
          ? 'bg-content'
          : pct >= 40
            ? 'bg-restless'
            : pct >= 20
              ? 'bg-unwell'
              : 'bg-fading';
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>{label}</span>
        <span>{caption ?? `${pct}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-rule overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted">{label}</dt>
      <dd className="font-serif text-xl">{value}</dd>
    </div>
  );
}
