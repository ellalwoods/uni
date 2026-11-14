# DuoDisco

A study app for my university courses. The name follows Duolingo, Duovino and Duologo: *disco* is Latin for “I learn”. Each course has 13 weeks. When I add a week's notes, Claude turns them into the app's format using only what's in the notes: the notes themselves, topic by topic, plus flashcards and a quiz. I review whenever I want: there are no streaks, goals or schedules.

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

## Managing courses

- **Add a course** with the **+** button on the Courses screen (or in the sidebar on a computer): give it a name, an optional short name, a colour and the number of weeks.
- **Edit or remove a course** from **Edit** on the course, or **Settings → Courses**. Removing a course hides it but keeps its weeks and progress; bring it back from Settings.
- These changes are saved on the device you make them on (and in backups). When I ask Claude to add notes to a new course, Claude adds the course to the app for every device.

## Adding a week's notes

1. Upload the notes to Claude in chat.
2. Ask Claude to add that week, for example "Add week 3 of Corporate Law from these notes".
3. Claude follows `CLAUDE.md`: it carries the week's notes across faithfully, writes the flashcards and quiz only from them, then commits it.

## Run it

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```


## Publishing (automatic)

There's nothing to merge. Whenever Claude pushes an update to a `claude/` branch, the **Publish** workflow (`.github/workflows/publish.yml`) merges it into `main` and deploys `main` to GitHub Pages. The app is at `https://ellalwoods.github.io/uni/`.

One-time setup in the repository settings:

1. **Settings → General → Default branch:** switch it to `main`.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.

Then, on iPhone, open the link in **Safari → Share → Add to Home Screen**. It opens full-screen and works offline. On a laptop, just bookmark it.

## Sync between devices

DuoDisco syncs your courses, course changes and progress through Supabase, in the same project as Good Word Charlie (its own `duodisco_` table, separate from Good Word Charlie's).

- **One-time setup:** in Supabase, open **SQL Editor**, paste `supabase/duodisco.sql` and run it.
- **On each device:** the first time DuoDisco opens, it says **Hello**: type your name and light up three tiles on the dance floor, in order. Use the same name and tiles on every device. The first device starts your DuoDisco; others join it and merge in what they already had. (You can also choose **Use without syncing**, and sign in later from Settings.)
- Your name and tiles are never stored on the server or sent: only a SHA-256 hash of them is. Settings shows your tiles as a reminder. Signing out keeps the data on that device.
- Offline changes are kept on the device and sync when it's back online.

## Your progress

Progress is stored in the browser on each device, and synced if sync is on. You can also use **Settings → Back up your progress** now and then, and **Restore a backup** on a new phone.
