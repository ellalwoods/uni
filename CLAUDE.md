# Uni: instructions for Claude

A study app for one person's university courses. Each course has weeks (13 by default). The user uploads a week's notes and asks Claude to add that week. The app then shows flashcards, a quiz and a summary for it.

## The one rule

**Write every week's content only from that week's notes.** Don't add facts, cases, dates, examples or explanations that aren't in the notes, even if they're true and helpful. Reword for clarity, but keep the notes' meaning and terms. If something in the notes is unclear or looks wrong, ask the user rather than filling the gap. Every card, quiz question and summary section names the page it came from (`ref`).

## Adding a week

1. The notes go in `notes/<course-id>/week-NN.<ext>` (for example `notes/ica/week-02.pdf`). Commit them if the user uploaded them in chat.
2. Read the whole of the notes before writing anything.
3. Add one `UNI.addWeek(...)` call to `content/<course-id>.js`, in week order, using the shape below.
4. Bump `CACHE` in `sw.js` (for example `uni-v1` → `uni-v2`) so phones pick up the change.
5. Open the app with a local server (`python3 -m http.server`) and check the week opens, the flashcards and quiz work, and nothing overflows on a phone-sized screen.
6. Commit with a message like `Add ICA week 2: The arbitration agreement`.

```js
UNI.addWeek('ica', 2, {
  title: 'The arbitration agreement',            // the week's topic, as the notes name it
  source: { file: 'ICA Week 2 notes.pdf', pages: 11 },
  topics: ['Separability', 'Kompetenz-Kompetenz'], // the main headings, in the notes' order
  cards: [                                        // flashcards: one idea each
    { q: 'What is separability?', a: 'The arbitration clause is treated as…', ref: 'p.3' },
  ],
  quiz: [                                         // multiple choice: answer is the index of the right option
    { q: 'Separability means that…', options: ['A', 'B', 'C', 'D'], answer: 1, why: 'One sentence on why, from the notes.', ref: 'p.3' },
  ],
  summary: [                                      // the week in short sections, following the notes' structure
    { heading: 'Separability', points: ['Point one.', 'Point two.'], ref: 'p.3' },
  ],
});
```

### Writing good content

- **Flashcards:** aim for roughly one card per key idea, case or definition, usually 10–25 a week. Questions should be specific enough to have one clear answer. Answers are one to three sentences.
- **Quiz:** around 8–12 questions a week, four options each. Wrong options should be plausible and drawn from the same notes, never jokes. Vary which position holds the right answer.
- **Summary:** follow the notes' own headings. Short, plain points.
- **Language:** plain, clear, academic English. Use the notes' terminology. No themed or playful wording anywhere: just courses, weeks, flashcards, quiz and summary.

## Adding a course

Add a line to `content/courses.js`, create `content/<id>.js`, add a `<script>` tag for it in `index.html` (before `content/example.js`), and add it to `ASSETS` in `sw.js`. Course ids are lowercase letters and digits only. Colours are the riso inks: pink `#ff48b0`, blue `#0078bf`, green `#00a95c`, orange `#ff6c2f`, violet `#765ba7`. Use `weeks:` for a course that doesn't run for 13 weeks (the intensive course may differ: ask the user how it's taught).

## Files

| File | What it is |
|---|---|
| `index.html` | Shell and script order |
| `styles.css` | All styling |
| `uni.js` | Content registry (`UNI.addCourse`, `UNI.addWeek`) |
| `content/courses.js` | The list of courses |
| `content/<id>.js` | One course's weeks |
| `content/example.js` | Made-up content, only shown when Settings → Example content is on |
| `app.js` | Screens, flashcards, quiz, progress, backup |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support and home-screen install |
| `notes/` | The user's original notes |
| `design/` | Earlier design mockups, not part of the app |
