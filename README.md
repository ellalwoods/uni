# Uni

A study app for my university courses. Each course has 13 weeks. When I add a week's notes, Claude turns them into flashcards, a quiz and a summary, using only what's in the notes. I review whenever I want: there are no streaks, goals or schedules.

## How it works

- **Courses:** each course has its own colour and a row of 13 segments showing its weeks.
- **Weeks:** inside a course, the weeks are numbered 01 to 13.
  - **Solid:** I've studied that week.
  - **Outlined, marked New:** its notes have been added but I haven't opened it yet.
  - **Pale:** its notes haven't been added yet.
- **A week:** each one has flashcards, a quiz and a summary, plus the list of topics. Everything says which page of the notes it came from.
- **Reviewing a whole course:** "Flashcards from all weeks" and "Quiz from all weeks" mix every week of a course together.

## Adding a week's notes

1. Upload the notes to Claude (or put them in `notes/<course>/week-NN.pdf`).
2. Ask Claude to add that week, for example "Add week 3 of Corporate Law from these notes".
3. Claude follows `CLAUDE.md`: it writes the week only from the notes, then commits it.

## Run it

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

To try it before adding any notes, open **Settings → Example content**.

## Put it on your phone (GitHub Pages)

1. Merge the pull request into `main`.
2. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. After a minute or two the app is live at `https://ellalwoods.github.io/uni/`.
4. On iPhone, open it in **Safari → Share → Add to Home Screen**. It then opens full-screen and works offline.

## Your progress

Progress is stored only in the browser on that device. Use **Settings → Back up your progress** now and then, and **Restore a backup** on a new phone.
