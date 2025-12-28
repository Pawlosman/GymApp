import React, { useState, useEffect } from 'react'
import trainingsData from '../../data/trainings.json'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoDate(date) {
  // Use local date, not UTC
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTrainingForMonth(monthIndex) {
  const monthName = MONTH_NAMES[monthIndex]
  for (const [trainingName, training] of Object.entries(trainingsData.trainings)) {
    if (training.months.includes(monthName)) {
      return { trainingName, training }
    }
  }
  return null
}

function daysForMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const days = []
  const date = new Date(y, m - 1, 1)
  while (date.getMonth() === m - 1) {
    const iso = isoDate(new Date(date))
    const isoWeekday = date.getDay() === 0 ? 7 : date.getDay()
    if ([2, 4, 6].includes(isoWeekday)) days.push({ iso, weekday: isoWeekday })
    date.setDate(date.getDate() + 1)
  }
  return days
}

export default function Sidebar({ onSelectDate }) {
  const now = new Date()
  const defaultMonth = now.toISOString().slice(0, 7)
  const [month, setMonth] = useState(defaultMonth)
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const days = daysForMonth(month)
  const [y, m] = month.split('-').map(Number)
  const trainingInfo = getTrainingForMonth(m - 1)
  const currentTraining = trainingInfo?.trainingName || 'Training 1'
  const trainingData = trainingInfo?.training

  const handleSelectDate = (date) => {
    onSelectDate(date)
    if (isMobile) setIsOpen(false)
  }

  if (isMobile) {
    return (
      <>
        <button 
          className="btn btn-outline-primary position-fixed"
          style={{ top: '12px', left: '10px', zIndex: 999 }}
          onClick={() => setIsOpen(!isOpen)}
        >
          ☰ Menu
        </button>
        {isOpen && (
          <div 
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 998 }}
            onClick={() => setIsOpen(false)}
          />
        )}
        <aside 
          className="bg-light border-end position-fixed h-100 overflow-y-auto"
          style={{ 
            width: '280px', 
            padding: '20px',
            zIndex: 1000,
            left: isOpen ? 0 : '-280px',
            transition: 'left 0.3s ease',
            top: 0
          }}
        >
          <button 
            className="btn-close mb-3"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          ></button>
          <SidebarContent 
            month={month}
            setMonth={setMonth}
            days={days}
            currentTraining={currentTraining}
            trainingData={trainingData}
            onSelectDate={handleSelectDate}
          />
        </aside>
      </>
    )
  }

  // Desktop view
  return (
    <aside className="bg-light border-end" style={{ width: '280px', minHeight: '100vh', overflowY: 'auto', padding: '20px' }}>
      <SidebarContent 
        month={month}
        setMonth={setMonth}
        days={days}
        currentTraining={currentTraining}
        trainingData={trainingData}
        onSelectDate={onSelectDate}
      />
    </aside>
  )
}

function SidebarContent({ month, setMonth, days, currentTraining, trainingData, onSelectDate }) {
  return (
    <>
      <h4 className="mb-4">
        <i className="bi bi-list"></i> Plan
      </h4>

      <div className="mb-4">
        <label className="form-label fw-bold">Month</label>
        <input type="month" className="form-control form-control-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="mb-4">
        <label className="form-label fw-bold text-primary">{currentTraining}</label>
        <strong className="d-block mb-2">Training Days</strong>
        <div className="d-flex flex-column gap-2">
          {days.map((d) => (
            <button key={d.iso} className="btn btn-sm btn-outline-primary text-start" onClick={() => onSelectDate(d.iso)}>
              <div className="small">{d.iso}</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{WEEKDAY_NAMES[d.weekday - 1]}</div>
            </button>
          ))}
        </div>
      </div>

      <hr />

      <div>
        <strong className="d-block mb-3">Templates ({currentTraining})</strong>
        {trainingData && ['Tuesday', 'Thursday', 'Saturday'].map((day) => (
          <div key={day} className="mb-3">
            <em className="d-block text-secondary fw-bold">{day}</em>
            <ul className="small ps-3 mb-2">
              {trainingData[day].map((t, i) => (
                <li key={i} className="text-muted">{t.name} — {t.sets}×{t.reps} @ {t.weight}kg</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}
