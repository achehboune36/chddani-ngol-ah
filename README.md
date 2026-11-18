# Chddani Ngol Ah 🏃🎬

*"Why did I say yes?"* The crew's hub: runs and races, plus hangouts (cinema, food, trips…) with a
find-a-time poll. Live at https://achdani.web.app (Firebase project `achdani`).

Stack: Vite + React + TypeScript + Tailwind, Firebase Auth (Google) + Firestore + Hosting.
It uses the same setup as `learn-hub`.

## What's in it

| Section | What it does |
|---|---|
| **Home** (`/`) | Things waiting on you, one "coming up" timeline (locked hangouts + your races), this week's km, latest runs |
| **Hangouts** (`/hangouts`) | Anyone creates one. **📌 We know when**: everyone answers Going/Maybe/Can't. **🗳️ Find a time**: the organiser picks up to 14 days, an hour range and how long it lasts. Everyone paints when they're free (drag = rectangle, tap a day = whole day). The app ranks the best windows (most people free for the whole duration), and the organiser taps **Lock it**, which turns it into a Going/Maybe/Can't event (it can be reopened) |
| **Runs** (`/runs`) | Tabs: Overview (countdown to your next race, your week), Plan (opt-in), Races (add, interested/paid, "make it my race"), Leaderboard + feed |
| **+ button** | Log a run, or start a hangout |
| **Me / Admin** | Your stats and runs; the admin page (shield, admin only) for approving people and the Open/Bouncer switch |

If you haven't picked a race to train for, the app picks for you: the next race you've marked
Interested or Paid, otherwise the next race on the calendar.

The Marrakech half (31 Jan 2027) is the first race. It's defined in `src/lib/race.ts` and created in
Firestore automatically the first time anyone opens the app with an empty races list. Plan templates
live in `src/lib/plan.ts`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5180
```

`npm run dev` uses the real Firebase project (from `.env.local`). Use `npm run dev:demo` for **demo mode**:
a fake crew stored in your browser's localStorage, safe to click around in.

## Deploy to Firebase (first time)

1. **Create the project.** In the [Firebase console](https://console.firebase.google.com), add a project
   (e.g. `chddani-ngol-ah`). Google Analytics isn't needed.
2. **Turn on Google sign-in.** Go to Build → Authentication → Get started → Sign-in method → Google → Enable.
3. **Create Firestore.** Go to Build → Firestore Database → Create database → production mode. For the
   region, `eur3` or `europe-west1` is closest to Morocco.
4. **Register a web app.** Go to Project settings → Your apps → `</>`. Copy the config values into a new
   `.env.local` (template in `.env.example`).
5. **Point the CLI at the project.** Put the project ID in `.firebaserc` (replace `REPLACE-WITH-YOUR-PROJECT-ID`).
6. **Admin.** The admin's Google email is hard-coded in `admin()` in `firestore.rules`. It never ships to the browser.
7. **Deploy:**
   ```bash
   npm i -g firebase-tools   # once
   firebase login
   npm run deploy            # builds, then deploys hosting + firestore rules
   ```
8. Send the friends the `https://<project-id>.web.app` link. On a phone, "Add to Home Screen" installs it
   like an app.

### Letting people in
Anyone can sign in with Google. What happens next depends on the **front door** switch on the admin page
(shield icon, visible to the admin only):
- **Open**: new accounts are approved instantly.
- **Bouncer mode**: new accounts wait "at the door" until the admin taps **Let in**. Use this if the link leaks.

In either mode, the admin can approve, deny ("Nope"), or kick anyone from the admin page.

## Security model
- Every member doc has a `status`: approved, pending or denied. Only approved members (and the admin) can read
  or write runs, races and other members' profiles. Pending and denied people can see only their own doc.
- Sign-up can set `approved` only while `config/settings.mode` is `open`; otherwise it must be `pending`.
- Only the admin can change anyone's `status` or the mode. Nobody can change their own status.
- Emails live in `accounts/{uid}`, readable by their owner and the admin only.
- You can only create, edit or delete your own runs and your own profile.
- On other people's runs, you can only set or clear your own emoji reaction.
- Any crew member can add a race. Only whoever added it can edit or delete it. Everyone else can only set
  or clear their own Interested/Paid status on it.
- Run fields are validated server-side (distance 0–100 km, effort 1–10, etc.).

## Free-tier note
With a handful of people logging around 4 runs a week, this stays far inside Firestore's free quota.
Reads are also cached in IndexedDB on each device.
