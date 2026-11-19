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

## The Ballroom

22 milestones across the semester, each earned by real work: adding a week's notes to every course (week 1, 4, 7, 10 and the full semester), assessment items marked done (1, 3, 5, 10, and every item in a course or across all courses), perfect quizzes, practising problem methods from memory, whole-course revision, and the final bow. Each one unlocks a new disco ball, with a little celebration that never interrupts a flashcard round or quiz. Choose which ball to wear in **the Ballroom** (tap the logo, or Settings): it shows in the header, the sidebar and the Hello screen. Rewards sync with your progress. Resetting progress resets them too.

## Essays (arts courses)

Arts courses, like Gender & Political Leadership, don't have cases, legislation or methods. Each week is an exam essay to memorise:

1. **Thesis:** type it from memory.
2. **Plan:** type the point of each paragraph, in order.
3. **Paragraphs:** the introduction, each paragraph and the conclusion, one sentence at a time.

Answers are marked on key words (names, years and terms count most, and small typos are fine): 60% is substantially right, and **I had it** marks an answer right yourself. **Hint** shows the first few words, and **Show me** reveals the sentence. You can practise the whole essay, one stage, or one paragraph, and the course page has **All theses** and **All plans** across every essay. **Read the essay** shows it in full with its source tags.

**Rapid recall** is the quick version: go through the essay sentence by sentence and type just one or two key words for each. A word counts if it's distinctive to that sentence (a name, a year, or a word used in no more than two sentences of the essay), so a general word like "representation" won't pass. Enter checks your answer and Enter again moves on. Each paragraph on the essay page also has its own **Rapid** button, so you can do one paragraph at a time.

## The calendar

The calendar (the calendar icon at the top of the courses screen) shows the semester week by week. Tap a day, or the **+** at the top right, to add a date. Tap a coloured date to change it, or to delete it. Each date has a **Type**, an optional **Subject** (one of your courses), and any number of **Tags**. You can make a tag in the form, and give it a colour. A date takes the colour of its first tag, or else its subject's colour.

Assessments are dates with a subject and the type Assessment, so they appear in both places: on the calendar, and on the course (in its week, and in the Assessments box on the course's Edit screen). Your dates sync with your courses.

Assessments are calendar dates with a subject, so they appear in both places: on the calendar, and on the course (in its week, and in the Assessments box on the course's Edit screen). Your dates sync with your courses.

## Managing courses

- **Add a course** with the **+** button on the Courses screen (or in the sidebar on a computer): give it a name, an optional short name, a colour and the number of weeks.
- **Mark assessments** in **Edit** on a course, in the Assessments box, for example `7 Essay, 13 Exam`. Each one shows as a disco ball above that week on the courses screen, and as a badge on the course page and under the week's title. A week can be marked before its notes are added.
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
