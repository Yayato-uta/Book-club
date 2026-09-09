import { useRef, useState } from 'react';
import type { AppState } from '../lib/types';
import { exportFilename, exportState, importState, mergeState } from '../lib/storage';
import type { MergeResult } from '../lib/storage';

interface Props {
  state: AppState;
  onReplace: (state: AppState) => void;
}

export default function DataControls({ state, onReplace }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<MergeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const download = () => {
    setError(null);
    setPending(null);
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick; Safari cancels the download if the URL dies first.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNote(`Saved ${state.books.length} ${state.books.length === 1 ? 'book' : 'books'}.`);
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Let the same file be chosen twice in a row.
    e.target.value = '';
    if (!file) return;

    setError(null);
    setNote(null);
    setPending(null);
    try {
      const merged = mergeState(state, importState(await file.text()));
      if (merged.added === 0 && merged.updated === 0) {
        setError('That export has no books in it.');
        return;
      }
      setPending(merged);
    } catch {
      setError('That file is not a Book Club export.');
    }
  };

  const apply = () => {
    if (!pending) return;
    onReplace(pending.state);
    setNote(summary(pending, true));
    setPending(null);
  };

  return (
    <section className="mt-16 border-t border-rule pt-8 space-y-4">
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted">Your data</h2>
        <p className="text-sm text-muted mt-2 max-w-xl">
          Everything you write lives in this browser alone — not on a server, and not in any
          account. Clearing site data erases it. Export a copy to keep a backup or to carry your
          shelf to another device.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={download}
          disabled={state.books.length === 0}
          className="rounded-lg border border-rule bg-card px-4 py-2 text-sm hover:border-accent/40 transition disabled:opacity-40 disabled:hover:border-rule"
        >
          Export a copy
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-rule bg-card px-4 py-2 text-sm hover:border-accent/40 transition"
        >
          Import a copy
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={pick}
          className="hidden"
        />
      </div>

      {pending && (
        <div className="rounded-xl border border-accent/40 bg-card shadow-card p-4 space-y-3">
          <p className="text-sm">{summary(pending, false)}</p>
          <p className="text-xs text-muted">
            Nothing already on your shelf is removed. Books the import shares with your shelf are
            replaced by the imported version.
          </p>
          <div className="flex gap-3">
            <button
              onClick={apply}
              className="rounded-lg bg-accent text-white px-4 py-2 text-sm hover:opacity-90 transition"
            >
              Import
            </button>
            <button
              onClick={() => setPending(null)}
              className="rounded-lg border border-rule px-4 py-2 text-sm hover:border-accent/40 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-fading">{error}</p>}
      {note && !pending && <p className="text-sm text-thriving">{note}</p>}
    </section>
  );
}

function summary({ added, updated }: MergeResult, done: boolean): string {
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} new ${added === 1 ? 'book' : 'books'}`);
  if (updated > 0) parts.push(`${updated} already on your shelf`);
  const list = parts.join(', ');
  return done
    ? `Imported ${list}.`
    : `This export has ${list}. Import it?`;
}
