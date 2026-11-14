# Uni

A study app for my university courses. Each course has 13 weeks. When I add a week's notes, Claude turns them into the app's format using only what's in the notes: the notes themselves, topic by topic, plus flashcards and a quiz. I review whenever I want: there are no streaks, goals or schedules.

## How it works

- **Courses:** each course has its own colour and a row of 13 segments showing its weeks.
- **A course** has four tabs:
  - **Weeks:** numbered 01 to 13.
    - **Solid:** I've studied that week.
    - **Outlined, marked New:** its notes have been added but I haven't opened it yet.
    - **Pale:** its notes haven't been added yet.
  - **Cases:** every case box from the notes, A to Z (ignoring "R v"), with the weeks it appears in.
  - **Legislation:** every statutory provision, grouped by Act.
  - **Methods:** the step-by-step approach to each kind of problem question.

  A search button finds cases, sections, definitions and notes across the whole course.
- **A week** has:
  - **Notes:** the week's notes, one topic at a time, with definitions, case boxes, statute tables, quotes and tables. Long topics have a jump list. Case names link to the case, and "Week 8" links to that week.
  - **Flashcards:** before starting, choose all cards, one topic, cases, legislation, definitions, concepts or the ones I missed last time, and how many (10, 20 or all).
  - **Quiz:** multiple choice, each answer explained with a page reference.
  - **Problem method:** read it, or practise it from memory one step at a time.
- **Reviewing a whole course:** the Flashcards and Quiz buttons on a course mix every week together.

## Adding a week's notes

1. Upload the notes to Claude (or put them in `notes/<course>/week-NN.pdf`).
2. Ask Claude to add that week, for example "Add week 3 of Corporate Law from these notes".
3. Claude follows `CLAUDE.md`: it carries the week's notes across faithfully, writes the flashcards and quiz only from them, then commits it.

## Run it

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

To try it before adding any notes, turn on **Settings → Example content**. It adds an Evidence course with week 6 (Hearsay), built from my Evidence notes.

## Put it on your phone (GitHub Pages)

1. Merge the pull request into `main`.
2. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. After a minute or two the app is live at `https://ellalwoods.github.io/uni/`.
4. On iPhone, open it in **Safari → Share → Add to Home Screen**. It then opens full-screen and works offline.

## Your progress

Progress is stored only in the browser on that device. Use **Settings → Back up your progress** now and then, and **Restore a backup** on a new phone.
