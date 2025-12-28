-- SQL migration to create workouts table
create table if not exists workouts (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  date date not null,
  exercise_name text not null,
  sets integer,
  reps integer,
  weight integer,
  created_at timestamptz default now()
);
