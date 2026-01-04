import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Statistics({ user }) {
  const [workouts, setWorkouts] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedMonth, selectedYear])

  async function fetchWorkouts() {
    if (!user) return
    setLoading(true)

    try {
      let query = supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      // Filter by year and month if selected
      if (selectedMonth !== 'all') {
        const monthNum = String(parseInt(selectedMonth) + 1).padStart(2, '0')
        const yearMonth = `${selectedYear}-${monthNum}`

        // Calculate the last day of the month
        const nextMonth = parseInt(selectedMonth) + 2 // Next month (1-indexed)
        const nextYear = nextMonth > 12 ? selectedYear + 1 : selectedYear
        const nextMonthNum = nextMonth > 12 ? '01' : String(nextMonth).padStart(2, '0')

        query = query.gte('date', `${yearMonth}-01`)
        query = query.lt('date', `${nextYear}-${nextMonthNum}-01`)
      } else {
        // Just filter by year
        query = query.gte('date', `${selectedYear}-01-01`)
        query = query.lt('date', `${selectedYear + 1}-01-01`)
      }

      const { data, error } = await query

      if (error) {
        console.error(error)
      } else {
        setWorkouts(data || [])
      }
    } catch (e) {
      console.error('Failed to fetch workouts:', e)
    }
    setLoading(false)
  }

  // Calculate statistics
  function calculateStats() {
    const exerciseStats = {}
    let totalWeight = 0

    workouts.forEach(workout => {
      const exerciseName = workout.exercise_name
      const setRecords = workout.set_records || {}

      if (!exerciseStats[exerciseName]) {
        exerciseStats[exerciseName] = {
          totalWeight: 0,
          totalReps: 0,
          totalSets: 0
        }
      }

      // Calculate for each set: reps × weight, then sum all sets
      Object.values(setRecords).forEach(set => {
        const reps = parseInt(set.reps) || 0
        const weight = parseFloat(set.weight) || 0
        const setWeight = reps * weight  // This calculates weight for ONE set

        exerciseStats[exerciseName].totalWeight += setWeight  // Sum across all sets
        exerciseStats[exerciseName].totalReps += reps
        exerciseStats[exerciseName].totalSets += 1
        totalWeight += setWeight
      })
    })

    return { exerciseStats, totalWeight }
  }

  const { exerciseStats, totalWeight } = calculateStats()

  // Sort exercises by total weight lifted (descending)
  const sortedExercises = Object.entries(exerciseStats).sort(
    ([, a], [, b]) => b.totalWeight - a.totalWeight
  )

  // Get available years from workouts
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Statistics</h2>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Month</label>
              <select
                className="form-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">All Months</option>
                {MONTH_NAMES.map((month, idx) => (
                  <option key={idx} value={idx}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Total Weight Card */}
          <div className="card mb-4 bg-primary text-white">
            <div className="card-body text-center">
              <h3 className="mb-0">Total Weight Lifted</h3>
              <h1 className="display-3 mb-0">{totalWeight.toLocaleString()} kg</h1>
              <p className="mb-0">
                {selectedMonth === 'all'
                  ? `In ${selectedYear}`
                  : `In ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
              </p>
            </div>
          </div>

          {/* Exercise Breakdown Table */}
          <div className="card">
            <div className="card-header bg-secondary text-white">
              <h5 className="mb-0">Exercise Breakdown</h5>
            </div>
            <div className="card-body p-0">
              {sortedExercises.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  No workout data available for this period
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Exercise</th>
                        <th className="text-end">Total Sets</th>
                        <th className="text-end">Total Reps</th>
                        <th className="text-end">Total Weight (kg)</th>
                        <th className="text-end">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedExercises.map(([name, stats]) => (
                        <tr key={name}>
                          <td><strong>{name}</strong></td>
                          <td className="text-end">{stats.totalSets}</td>
                          <td className="text-end">{stats.totalReps}</td>
                          <td className="text-end"><strong>{stats.totalWeight.toLocaleString()}</strong></td>
                          <td className="text-end">
                            {totalWeight > 0
                              ? ((stats.totalWeight / totalWeight) * 100).toFixed(1)
                              : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-secondary">
                      <tr>
                        <td><strong>TOTAL</strong></td>
                        <td className="text-end">
                          <strong>
                            {Object.values(exerciseStats).reduce((sum, s) => sum + s.totalSets, 0)}
                          </strong>
                        </td>
                        <td className="text-end">
                          <strong>
                            {Object.values(exerciseStats).reduce((sum, s) => sum + s.totalReps, 0)}
                          </strong>
                        </td>
                        <td className="text-end">
                          <strong>{totalWeight.toLocaleString()}</strong>
                        </td>
                        <td className="text-end"><strong>100%</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
