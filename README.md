# GymApp — React + Supabase

Minimal starter app to track gym workouts using React (Vite) and Supabase.

Quick start

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Install deps:

```bash
npm install
```

3. Run dev server:

```bash
npm run dev
```

Database

Run the SQL in `sql/001_create_workouts.sql` in your Supabase SQL editor to create the `workouts` table.

Notes

- The app supports email/password sign up and sign in.
- Select a month, then pick one of the training days (Tuesday, Thursday, Saturday) listed for that month.
- Add workouts (exercise, sets, reps, weight) for the selected date.
