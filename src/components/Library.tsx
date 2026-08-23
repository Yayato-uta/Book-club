import { useState } from 'react';
import type { Book, Genre } from '../lib/types';
import { newId } from '../lib/storage';
import { companionStats, MOOD_COPY } from '../lib/companion';
import Companion from './Companion';

interface Props {
  books: Book[];
  onAdd: (book: Book) => void;
  onSelect: (id: string) => void;
}

export default function Library({ books, onAdd, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const reading = books.filter((b) => b.status === 'reading');
  const queued = books.filter((b) => b.status === 'queued');
  const finished = books.filter((b) => b.status === 'finished');

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Your shelf</h1>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-ink text-paper px-4 py-2 text-sm hover:opacity-85 transition"
        >
          {open ? 'Cancel' : 'Add a book'}
        </button>
      </div>

      {open && (
        <AddBookForm
          onAdd={(book) => {
            onAdd(book);
            setOpen(false);
          }}
        />
      )}

      {books.length === 0 && !open && (
        <div className="rounded-xl border border-dashed border-rule p-10 text-center">
          <p className="font-serif text-xl mb-2">Nothing on the shelf yet.</p>
          <p className="text-muted text-sm max-w-md mx-auto">
            Add a book you own but have not finished. Set a pace you can actually keep — you can
            always raise it later. Each book hatches a companion that lives or wilts by that pace.
          </p>
        </div>
      )}

      <Section title="Reading" books={reading} onSelect={onSelect} />
      <Section title="Up next" books={queued} onSelect={onSelect} />
      <Section title="Finished" books={finished} onSelect={onSelect} />
    </div>
  );
}

function Section({ title, books, onSelect }: { title: string; books: Book[]; onSelect: (id: string) => void }) {
  if (books.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-widest text-muted">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {books.map((book) => (
          <li key={book.id}>
            <BookCard book={book} onSelect={() => onSelect(book.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BookCard({ book, onSelect }: { book: Book; onSelect: () => void }) {
  const stats = companionStats(book);
  const pct = book.totalChapters > 0 ? Math.round((stats.chaptersRead / book.totalChapters) * 100) : 0;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl bg-card border border-rule shadow-card p-4 flex gap-4 hover:border-accent/40 transition"
    >
      <Companion
        seed={book.id}
        stage={stats.stage.id}
        mood={stats.mood}
        health={stats.health}
        accessories={stats.unlocked.map((a) => a.id)}
        size={72}
      />
      <div className="min-w-0 flex-1">
        <p className="font-serif text-lg leading-tight truncate">{book.title}</p>
        <p className="text-muted text-sm truncate">{book.author}</p>
        <p className="text-sm mt-2">
          <span className="font-medium">{book.companionName}</span>{' '}
          <span className="text-muted">{MOOD_COPY[stats.mood]}</span>
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-rule overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted mt-1">
          {stats.chaptersRead}
          {book.totalChapters > 0 ? ` of ${book.totalChapters}` : ''} chapters · {stats.stage.label}
        </p>
      </div>
    </button>
  );
}

function AddBookForm({ onAdd }: { onAdd: (book: Book) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState<Genre>('fiction');
  const [totalChapters, setTotalChapters] = useState('');
  const [chaptersPerWeek, setChaptersPerWeek] = useState('3');
  const [companionName, setCompanionName] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: newId(),
      title: title.trim(),
      author: author.trim() || 'Unknown',
      genre,
      totalChapters: Math.max(0, parseInt(totalChapters, 10) || 0),
      status: 'queued',
      addedAt: new Date().toISOString(),
      goal: { chaptersPerWeek: Math.max(1, parseInt(chaptersPerWeek, 10) || 3) },
      companionName: companionName.trim() || 'Pip',
      entries: [],
    });
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-card border border-rule shadow-card p-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" autoFocus />
        </Field>
        <Field label="Author">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full" />
        </Field>
        <Field label="Kind">
          <select value={genre} onChange={(e) => setGenre(e.target.value as Genre)} className="w-full">
            <option value="fiction">Fiction</option>
            <option value="nonfiction">Non-fiction</option>
          </select>
        </Field>
        <Field label="Chapters" hint="0 if you don't know yet">
          <input
            type="number"
            min="0"
            value={totalChapters}
            onChange={(e) => setTotalChapters(e.target.value)}
            className="w-full"
          />
        </Field>
        <Field label="Chapters per week" hint="your pace — the companion lives by it">
          <input
            type="number"
            min="1"
            value={chaptersPerWeek}
            onChange={(e) => setChaptersPerWeek(e.target.value)}
            className="w-full"
          />
        </Field>
        <Field label="Companion name">
          <input
            value={companionName}
            onChange={(e) => setCompanionName(e.target.value)}
            placeholder="Pip"
            className="w-full"
          />
        </Field>
      </div>
      <button type="submit" className="rounded-lg bg-accent text-white px-4 py-2 text-sm hover:opacity-90 transition">
        Add to shelf
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}
