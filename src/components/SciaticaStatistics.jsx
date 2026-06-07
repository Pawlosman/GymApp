import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function SciaticaStatistics({ user }) {
  const [sessions, setSessions] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedYear])

  async function fetchSessions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sciatica_sessions')
      .select('date, all_done')
      .eq('user_id', user.id)
      .gte('date', `${selectedYear}-01-01`)
      .lt('date', `${selectedYear + 1}-01-01`)
      .order('date', { ascending: true })

    if (!error) setSessions(data || [])
    setLoading(false)
  }

  const byMonth = {}
  sessions.forEach(s => {
    const month = parseInt(s.date.split('-')[1]) - 1
    if (!byMonth[month]) byMonth[month] = { total: 0, full: 0 }
    byMonth[month].total++
    if (s.all_done) byMonth[month].full++
  })

  const totalSessions = sessions.length
  const fullSessions = sessions.filter(s => s.all_done).length
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)

  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">🧘 Sciatica Statistics</h2>

      <div className="card mb-4">
        <div className="card-body">
          <label className="form-label">Year</label>
          <select className="form-select" style={{ maxWidth: 200 }} value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status" />
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card text-center border-warning">
                <div className="card-body">
                  <h1 className="display-4 fw-bold text-warning">{totalSessions}</h1>
                  <p className="mb-0 text-muted">Total sessions</p>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center border-success">
                <div className="card-body">
                  <h1 className="display-4 fw-bold text-success">{fullSessions}</h1>
                  <p className="mb-0 text-muted">Fully completed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-warning text-dark fw-bold">Monthly Breakdown</div>
            <div className="card-body p-0">
              {totalSessions === 0 ? (
                <div className="text-center py-5 text-muted">No sessions recorded in {selectedYear}</div>
              ) : (
                <table className="table table-striped mb-0">
                  <thead className="table-dark">
                    <tr>
                      <th>Month</th>
                      <th className="text-center">Sessions</th>
                      <th className="text-center">Fully done</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTH_NAMES.map((name, idx) => {
                      const m = byMonth[idx]
                      if (!m) return null
                      return (
                        <tr key={idx}>
                          <td><strong>{name}</strong></td>
                          <td className="text-center">{m.total}</td>
                          <td className="text-center">{m.full}</td>
                          <td>
                            <div className="progress" style={{ height: '8px' }}>
                              <div
                                className="progress-bar bg-warning"
                                style={{ width: `${(m.total / 31) * 100}%` }}
                              />
                            </div>
                            <small className="text-muted">{m.total}× this month</small>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
