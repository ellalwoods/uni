# DuoDisco: instructions for Claude

DuoDisco (Latin *disco*, “I learn”) is a study app for one person's university courses. The repository is `uni`; internal names such as `UNI`, `uni.progress` and the backup's `app: 'uni'` stay as they are so saved progress and backups keep working. Each course has weeks (13 by default). The user uploads a week's notes and asks Claude to add that week. The app then shows that week's notes topic by topic, flashcards, a quiz, and course-wide lists of cases, legislation and problem-question methods.

The notes are long and dense (a law week is typically 2,000 to 8,000 words, with dozens of cases, statutory sections, definitions, tables and a problem-question method). The app is built to hold all of it. **Don't condense the notes into a short summary.** Carry them across faithfully.

## The one rule

**Write every week's content only from that week's notes.** Don't add facts, cases, citations, dates, examples or explanations that aren't in the notes, even if they're true and helpful. You may fix obvious typos and reflow text for a phone screen, but keep the notes' wording, terms and emphasis. If something in the notes is unclear or looks wrong, ask the user rather than filling the gap. Don't guess page numbers: use the page or page range the notes give (for example from their contents page).

## Adding a week

1. Read the notes from wherever the user uploaded them. Don't commit the notes files themselves. If the user uploads a whole-course document, take only the requested week (notes often mark weeks with a "Week N" line).
2. Read the whole week before writing anything. Convert `.docx` with `pandoc file.docx -t markdown`.
3. Add one `UNI.addWeek(...)` call to `content/<course-id>.js`, in week order, using the shape below.
4. Bump `CACHE` in `sw.js` (for example `uni-v2` → `uni-v3`) so phones pick up the change.
5. Serve the folder (`python3 -m http.server`) and check on a phone-sized screen: the week opens, every topic reads cleanly, case names link to the case page, the method works, flashcard filters and the quiz work, and nothing runs off the side.
6. Commit with a message like `Add Evidence week 6: Hearsay`, and push. Don't open a pull request: pushing to a `claude/` branch (or `main`) publishes automatically (see Publishing).

A complete worked example (Evidence week 6, Hearsay) was removed from the app at the user's request but is in git history: `git show 2ff6b55:content/example.js`. Match its depth and style.

## The shape of a week

```js
UNI.addWeek('evidence', 6, {
  title: 'An Introduction to Exclusionary Rules and Hearsay',   // the week's heading in the notes
  source: { file: 'Evidence Notes.docx', pages: 'pp.48–53' },

  // One topic per top-level heading in the notes, in order. Leave the problem-question
  // section out of topics: it goes in `method`.
  topics: [
    { title: 'The Rule Against Hearsay', ref: 'p.48', blocks: [ /* blocks, see below */ ] },
  ],

  // The notes' "Approach to … in a problem question" section, if there is one.
  method: { title: 'Approaching hearsay in a problem question', ref: 'p.53', steps: [
    { t: 'Is it an out-of-court statement?', sub: ['Is it oral, written, or conduct designed to convey information?'] },
  ] },

  // topic = index into topics; type = 'case' | 'law' | 'term' | 'idea'
  cards: [
    { topic: 1, type: 'case', q: 'Ratten v The Queen: why was the call admissible?', a: '…', ref: 'p.49' },
  ],
  quiz: [
    { topic: 1, q: '…', options: ['A', 'B', 'C', 'D'], answer: 2, why: '…', ref: 'p.50' },
  ],
});
```

### Blocks (the notes, faithfully)

| Block | Use it for |
|---|---|
| `{ p: 'text' }` | A paragraph |
| `{ h: 'Sub-heading' }` | A sub-heading within a topic (long topics get a jump list from these) |
| `{ ul: ['…'] }`, `{ ol: ['…'] }` | Lists |
| `{ term: 'Hearsay', def: '…' }` | A definition (the notes' two-column "TERM — meaning" boxes). Collected into the week's Definitions |
| `{ case: 'Ratten v The Queen', short: 'Ratten', judge: 'Brennan J', body: ['…', { h: 'Outcome' }, '…'] }` | A case box. `short` is how the notes refer to it elsewhere. `body` is a list of strings or blocks. Collected into the course's Cases list |
| `{ law: { act: 'Evidence Act 1995 (Cth)', short: 'EAC', items: [['s 59(1)', '…']] } }` | A table of statutory provisions. Collected into Legislation |
| `{ quote: '…', by: 'Wigmore' }` | A quotation |
| `{ table: { head: ['A', 'B'], rows: [['…', '…']] } }` | Any other table, such as comparisons |

Inside text: `**bold**`, `*italic*`, and `***Case name***` for case names (as the notes do). A case name in `***…***` becomes a link when that case has a case box anywhere in the course. "Week 8" or "Weeks 7 and 8" becomes a link once that week is added.

### Flashcards and quiz

- **Flashcards:** cover every case box, every statutory provision, every definition, and each key point. Typically 25 to 60 a week. Tag each with its `topic` and `type` so the user can filter: Cases, Legislation, Definitions, Concepts. Start case questions with the case name (`'Bull v The Queen: why was…'`). Answers are one to three sentences, in the notes' words.
- **Quiz:** around 8 to 15 questions a week, four options each, spread across the topics. Wrong options should be plausible and drawn from the same notes, never jokes. Vary which position holds the right answer.
- **Language:** plain, clear, academic English. Use the notes' terminology. No themed or playful wording anywhere: just courses, weeks, topics, notes, flashcards, quiz, cases and legislation.

## Publishing

`.github/workflows/publish.yml` merges any push to a `claude/` branch into `main`, then deploys `main` to GitHub Pages (https://ellalwoods.github.io/uni/). The user never merges anything. Check the Publish run succeeded after pushing. If the merge into `main` conflicts, the run fails: rebase the branch onto `origin/main` and push again.

Don't commit the user's original notes files: they asked for them not to be kept. Read them from the upload, convert them, and don't save them in the repo.

## Sync (Supabase)

`cloud-config.js` points at the user's Supabase project (shared with Good Word Charlie, not DuoVino); `supabase/duodisco.sql` creates the `duodisco_sync` table and the `duodisco_load` / `duodisco_save` functions, the only things the public key can use. Each device signs in on the Hello screen with a name and three of nine dance-floor tiles, in order; only a SHA-256 hash of `'duodisco:' + name (lowercased, spaces collapsed) + '|' + tile indexes joined with '-'` is sent. Changing that recipe would sign everyone out, so don't. The synced state is `{ app: 'uni', v: 2, progress, courses }`, where `progress` and `courses` each carry `_at`, the time they last changed; when syncing, the newer copy of each wins, and a device signing in to data that already exists merges both. If you change the shape of the synced state, keep it backwards compatible. If you change the SQL, the user has to re-run it in Supabase → SQL Editor.

## The Ballroom

`MILESTONES` in `app.js` lists 22 milestones, each earned by real study (notes added for every course, cards known, quizzes, methods practised, revision), never by setting things up or daily streaks. Milestone *i* unlocks look *i + 1* in `rewards.js`; keep the two lists the same length and order. Earned milestones are stored in `progress.rewards` and the chosen look in `progress.look`, so they sync. If you add or reorder milestones, don't change existing ids.

## Adding a course

The app starts with no courses: the user adds them in the app. To add one in the code, add a line to `content/courses.js`, create `content/<id>.js`, add a `<script>` tag for it in `index.html` (before `app.js`), and add it to `ASSETS` in `sw.js`. Course ids are lowercase letters and digits only. Colours come from `INKS` in `app.js`: pink `#ff48b0`, rose `#e8608c`, raspberry `#c83f78`, coral `#f2716a`, peach `#e97f5e`, apricot `#e48a3a`, orchid `#b04fb8`, lilac `#8f6fd1`, mauve `#a35d8f`, berry `#9e3a72`, sky `#2f9fd6`, aqua `#159fae`, sage `#5f9474`, red `#f15060`, orange `#ff6c2f`, violet `#765ba7`, blue `#0078bf`, green `#00a95c`, teal `#00838a`, navy `#3255a4`.

### Courses the user manages in the app

The user can add, rename, recolour, change the weeks of, and remove courses in the app (the + button, and Settings → Courses). Those changes are saved on the device (localStorage key `uni.courses`, included in backups) and reach the user's other devices only if sync is on. They never reach the content files by themselves:

- **A course added in the app** gets an id made from its name: lowercase letters and digits only, for example "Constitutional Law" → `constitutionallaw`. When the user asks you to add notes for it, first add that course to `content/courses.js` with **the same id**, name, colour and weeks (ask the user for them if you don't know), so it exists on every device. Then add the week as usual.
- **Renaming, recolouring or removing** a course in the app overrides `content/courses.js` on that device only. If the user wants a change everywhere, make it in `content/courses.js` too.
- Removing a course hides it; its content and progress are kept and it can be brought back from Settings. Use `weeks:` for a course that doesn't run for 13 weeks (the intensive course may differ: ask the user how it's taught).

## Files

| File | What it is |
|---|---|
| `index.html` | Shell and script order |
| `styles.css` | All styling |
| `uni.js` | Content registry (`UNI.addCourse`, `UNI.addWeek`) |
| `content/courses.js` | The list of courses |
| `content/<id>.js` | One course's weeks |
| `app.js` | Screens, notes reader, indexes, search, flashcards, quiz, progress, backup, milestones (`MILESTONES`) |
| `rewards.js` | The Ballroom's disco balls: one look per milestone, in the same order as `MILESTONES` (plus Classic first) |
| `sw.js`, `manifest.webmanifest` | Offline support and home-screen install |
| `icon.svg`, `icon-180/192/512.png` | The pink disco ball logo. The PNGs are rendered from the SVG (iPhones need PNG home-screen icons): re-render them if the SVG changes |
| `.github/workflows/publish.yml` | Automatic publishing to GitHub Pages |
| `cloud-config.js`, `supabase/duodisco.sql` | Sync between devices (Supabase) |
| `design/` | Earlier design mockups, not part of the app |
