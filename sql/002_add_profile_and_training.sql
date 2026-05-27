-- Add profile column to separate Tata and Tomek data
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS profile text NOT NULL DEFAULT 'tata';

-- Add training_name column for Tomek's free-choice trainings
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS training_name text;

-- Backfill existing rows as Tata's
UPDATE workouts SET profile = 'tata' WHERE profile IS NULL OR profile = '';
