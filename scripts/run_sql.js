const { readFileSync } = require('fs')
const { Client } = require('pg')

async function main() {
  const client = new Client({
    host: process.env.PGHOST,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'postgres',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()

  const sqlCreate = `create table if not exists workouts (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  date date not null,
  exercise_name text not null,
  sets integer,
  reps integer,
  weight integer,
  created_at timestamptz default now()
);`

  const sqlRls = `alter table workouts enable row level security;

create policy \"Users can CRUD their workouts\"
  on workouts
  for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );`

  try {
    console.log('Running CREATE TABLE...')
    await client.query(sqlCreate)
    console.log('CREATE TABLE done')

    console.log('Enabling RLS and creating policy...')
    await client.query(sqlRls)
    console.log('RLS and policy applied')
  } catch (err) {
    console.error('Error running SQL:', err.message)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
