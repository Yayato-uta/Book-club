# Book Club

A book club with one member.

You buy books and don't finish them. This is built for that specific problem: it
holds a reading list you type in yourself, asks you three real questions at the
end of every chapter, and gives each book a companion that grows when you keep
your pace and gets sick when you don't.

Everything is stored in your browser. No account, no server, no network calls.
You can export it to a file and import it back on another device.

## The idea

Three things, each doing one job:

**A shelf you fill by hand.** Title, author, fiction or non-fiction, how many
chapters, and — the important one — how many chapters a week you intend to read.
That last number is the contract the rest of the app holds you to.

**Questions after each chapter.** Not a comprehension quiz. Three prompts drawn
from a curated bank: one to consolidate what you just read, one to work on how
the text is built or where it fails, and one to tie it back to you. Chapter one
asks why you bought the book. The final chapter asks whether it kept its
promise. Non-fiction gets questions about evidence and unstated assumptions;
fiction gets questions about point of view and what a character isn't saying.

The same chapter always draws the same three questions, so you can close the tab
mid-thought and come back to it.

**A companion per book.** It starts as an egg and grows through Hatchling,
Fledgling, Companion and Sage as you feed it. Feeding means reading a chapter
and writing something real about it. Fall behind the pace you set and its health
drains, its colour washes out, and it starts to slump. Each book's companion
takes its colour from the book itself, so they're all different.

## How the mechanics work

**XP** — 10 for logging a chapter, 5 for each answer over 15 characters, 5 more
if you're still on pace. Growth stages sit at 0 / 45 / 130 / 280 / 500 XP.

**Health** — you get your expected gap between chapters, plus a day of slack.
Past that, health falls 15 points a day until you read again, which restores it
in full. A goal of two chapters a week means a 3.5-day gap, so you have 4.5 days
before anything starts to go wrong. Setting a gentler goal is not cheating —
it's the difference between a companion that lives and one that doesn't.

**Streaks** — a chapter read within the allowed gap of the last one continues
the streak. Reading late breaks the chain but starts a new one at 1, because you
did still read.

**Accessories** — seven, unlocked by different kinds of effort: the first
chapter, ten proper answers, a three-chapter run, a single answer over 200
characters, 150 XP, a seven-chapter run, and finishing the book.

**Your shelf, as a file.** There is no account and nothing syncs, so the shelf
lives in one browser's `localStorage` and nowhere else — clearing site data
erases it. *Export a copy* on the shelf screen writes the whole state to a dated
JSON file; *Import a copy* reads one back. Import folds into what is already
there, matching on book id: a book the shelf has never seen is added, one it
already has is replaced by the imported copy, and nothing is ever dropped. So
restoring a backup over a newer shelf can't cost you a book, and importing the
same file twice doesn't duplicate anything.

Book ids are generated per device, so the same title typed by hand on two
devices merges as two books. Export and import to keep one shelf across
devices; retyping starts a second one.

## Running it

```
npm install
npm run dev
```

Then `npm run build` for a production bundle and `npm test` for the suite.

## Where things live

```
src/lib/types.ts       the shape of a book, a chapter entry, a goal
src/lib/questions.ts   the question bank and how three get chosen
src/lib/companion.ts   XP, health, streaks, stages, accessories — all pure
src/lib/storage.ts     localStorage, plus import/export/merge and repair on load
src/components/        Library, BookDetail, ChapterSession, Companion, DataControls
```

`companion.ts` holds no state. Everything about a companion is derived from the
chapter log each time it renders, so there is nothing to get out of sync and
nothing to migrate when the rules change.

## Notes

Answers are stored with the text of the question you were actually asked, not
just its id. Editing the question bank later will never orphan something you
wrote.

Questions come from a curated bank rather than a model, so the app works offline
with no API key. `selectQuestions(book, chapter)` in `src/lib/questions.ts` is
the only entry point the UI uses — swapping in generated questions later means
changing that one function and nothing else.
