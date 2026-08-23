import { useEffect, useMemo, useState } from 'react';
import type { AppState, Book, ChapterEntry } from './lib/types';
import { loadState, saveState } from './lib/storage';
import Library from './components/Library';
import BookDetail from './components/BookDetail';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const selected = useMemo(
    () => state.books.find((b) => b.id === selectedId) ?? null,
    [state.books, selectedId],
  );

  const addBook = (book: Book) => setState((s) => ({ ...s, books: [...s.books, book] }));

  const updateBook = (id: string, patch: Partial<Book>) =>
    setState((s) => ({
      ...s,
      books: s.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));

  const deleteBook = (id: string) => {
    setState((s) => ({ ...s, books: s.books.filter((b) => b.id !== id) }));
    setSelectedId(null);
  };

  const logSession = (id: string, entry: ChapterEntry) =>
    setState((s) => ({
      ...s,
      books: s.books.map((b) => {
        if (b.id !== id) return b;
        // Re-logging a chapter replaces the earlier entry rather than duplicating it.
        const entries = [...b.entries.filter((e) => e.chapter !== entry.chapter), entry];
        const status: Book['status'] =
          b.totalChapters > 0 && entries.length >= b.totalChapters ? 'finished' : 'reading';
        return { ...b, entries, status };
      }),
    }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-paper/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-baseline gap-3">
          <button
            onClick={() => setSelectedId(null)}
            className="font-serif text-2xl tracking-tight hover:opacity-70 transition"
          >
            Book Club
          </button>
          <span className="text-muted text-sm">a club of one</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        {selected ? (
          <BookDetail
            book={selected}
            onBack={() => setSelectedId(null)}
            onUpdate={(patch) => updateBook(selected.id, patch)}
            onDelete={() => deleteBook(selected.id)}
            onLog={(entry) => logSession(selected.id, entry)}
          />
        ) : (
          <Library books={state.books} onAdd={addBook} onSelect={setSelectedId} />
        )}
      </main>
    </div>
  );
}
