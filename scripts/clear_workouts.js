import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function clearWorkouts() {
  try {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .neq('id', 0) // Delete all rows

    if (error) {
      console.error('Error clearing workouts:', error)
    } else {
      console.log('✅ All workout records cleared successfully!')
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

clearWorkouts()
