import React, { useState } from 'react'
import trainings from '../../data/trainings.json'

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function daysForMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const days = []
  const date = new Date(y, m - 1, 1)
  while (date.getMonth() === m - 1) {
    const iso = isoDate(new Date(date))
    const isoWeekday = date.getDay() === 0 ? 7 : date.getDay()
    // Tue(2), Thu(4), Sat(6)
    if ([2, 4, 6].includes(isoWeekday)) days.push({ iso, weekday: isoWeekday })
    date.setDate(date.getDate() + 1)
  }
  return days
}

export default function Sidebar({ onSelectDate }) {
  const now = new Date()
  const defaultMonth = now.toISOString().slice(0, 7)
  const [month, setMonth] = useState(defaultMonth)

  const days = daysForMonth(month)

  return (
    <aside style={{ width: 280, borderRight: '1px solid #ddd', paddingRight: 12 }}>
      <h3>Plan</h3>
      <label>
        Month
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </label>

      <div style={{ marginTop: 12 }}>
        <strong>Training Days</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {days.map((d) => (
            <button key={d.iso} onClick={() => onSelectDate(d.iso)}>
              {d.iso} — {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d.weekday - 1]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Templates (Month 1)</strong>
        <div style={{ marginTop: 8 }}>
          <div><em>Tuesday</em></div>
          <ul>
            {trainings.Tuesday.map((t, i) => (
              <li key={i}>{t.name} — {t.sets}x{t.reps} @ {t.weight}kg</li>
            ))}
          </ul>
          <div><em>Thursday</em></div>
          <ul>
            {trainings.Thursday.map((t, i) => (
              <li key={i}>{t.name} — {t.sets}x{t.reps} @ {t.weight}kg</li>
            ))}
          </ul>
          <div><em>Saturday</em></div>
          <ul>
            {trainings.Saturday.map((t, i) => (
              <li key={i}>{t.name} — {t.sets}x{t.reps} @ {t.weight}kg</li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
