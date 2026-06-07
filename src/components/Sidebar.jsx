import React, { useState, useEffect } from 'react'
import trainingsData from '../../data/trainings.json'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoDate(date) {
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

function allDaysForMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  const days = []
  const date = new Date(y, m - 1, 1)
  while (date.getMonth() === m - 1) {
    const iso = isoDate(new Date(date))
    const isoWeekday = date.getDay() === 0 ? 7 : date.getDay()
    days.push({ iso, weekday: isoWeekday })
    date.setDate(date.getDate() + 1)
  }
  return days
}

export default function Sidebar({ onSelectDate, selectedDate, profile, selectedTraining }) {
  const now = new Date()
  const defaultMonth = now.toISOString().slice(0, 7)
  const todayIso = isoDate(now)
  const [month, setMonth] = useState(defaultMonth)
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setIsOpen(false)
    }
    window.addEventListener('resize', handleResize)
    const toggleHandler = () => setIsOpen((v) => !v)
    window.addEventListener('toggleSidebar', toggleHandler)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('toggleSidebar', toggleHandler)
    }
  }, [])

  const [y, m] = month.split('-').map(Number)
  const isTomek = profile === 'tomek'
  const isSciatica = profile === 'sciatica'

  const days = (isTomek || isSciatica) ? allDaysForMonth(month) : daysForMonth(month)
  const trainingInfo = getTrainingForMonth(m - 1)
  const currentTraining = trainingInfo?.trainingName || 'Training 1'
  const trainingData = trainingInfo?.training

  const handleSelectDate = (date, training = null) => {
    onSelectDate(date, training)
    if (isMobile) setIsOpen(false)
  }

  const toggleButton = (
    <button
      className="btn btn-outline-primary btn-sm position-fixed d-flex align-items-center justify-content-center"
      style={{ top: '8px', left: '10px', zIndex: 1100, fontSize: '18px', padding: '8px 12px', lineHeight: '1' }}
      onClick={() => setIsOpen(!isOpen)}
      aria-label="Toggle sidebar"
    >
      ☰
    </button>
  )

  const overlay = isOpen ? (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1090 }}
      onClick={() => setIsOpen(false)}
    />
  ) : null

  const contentProps = {
    month, setMonth, days, currentTraining, trainingData,
    onSelectDate: handleSelectDate, todayIso, selectedDate,
    profile, selectedTraining, isTomek, isSciatica
  }

  if (!isMobile) {
    return (
      <aside className="bg-light border-end" style={{ width: '280px', minHeight: '100vh', padding: '20px' }}>
        <SidebarContent {...contentProps} onSelectDate={onSelectDate} />
      </aside>
    )
  }

  return (
    <>
      {toggleButton}
      {overlay}
      <aside
        className="bg-light border-end position-fixed h-100 overflow-y-auto"
        style={{
          width: '280px', padding: '20px', zIndex: 1100,
          left: isOpen ? 0 : '-280px', transition: 'left 0.25s ease', top: 0
        }}
      >
        <button className="btn-close mb-3" onClick={() => setIsOpen(false)} aria-label="Close" />
        <SidebarContent {...contentProps} />
      </aside>
    </>
  )
}

function SidebarContent({ month, setMonth, days, currentTraining, trainingData, onSelectDate, todayIso, selectedDate, profile, selectedTraining, isTomek, isSciatica }) {
  const tomekTrainings = trainingsData.tomekTrainings

  return (
    <>
      <h4 className="mb-4">
        <i className="bi bi-list"></i> Plan
      </h4>

      <div className="mb-4">
        <label className="form-label fw-bold">Month</label>
        <input type="month" className="form-control form-control-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {isSciatica ? (
        <SciaticaSidebarContent
          days={days}
          onSelectDate={onSelectDate}
          todayIso={todayIso}
          selectedDate={selectedDate}
        />
      ) : isTomek ? (
        <TomekSidebarContent
          days={days}
          tomekTrainings={tomekTrainings}
          onSelectDate={onSelectDate}
          todayIso={todayIso}
          selectedDate={selectedDate}
          selectedTraining={selectedTraining}
        />
      ) : (
        <TataSidebarContent
          days={days}
          currentTraining={currentTraining}
          trainingData={trainingData}
          onSelectDate={onSelectDate}
          todayIso={todayIso}
          selectedDate={selectedDate}
        />
      )}
    </>
  )
}

function TataSidebarContent({ days, currentTraining, trainingData, onSelectDate, todayIso, selectedDate }) {
  return (
    <>
      <div className="mb-4">
        <label className="form-label fw-bold text-primary">{currentTraining}</label>
        <strong className="d-block mb-2">Training Days</strong>
        <div className="d-flex flex-column gap-2">
          {days.map((d) => {
            const isToday = d.iso === todayIso
            const isSelected = selectedDate && d.iso === selectedDate
            let btnClass = 'btn-outline-secondary'
            if (isToday || isSelected) btnClass = 'btn-primary'
            return (
              <button
                key={d.iso}
                className={`btn text-start ${btnClass}`}
                onClick={() => onSelectDate(d.iso)}
                style={{ fontSize: '1rem', padding: '0.5rem 0.75rem' }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{d.iso}</span>
                  <span className={isSelected ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.9rem' }}>{WEEKDAY_NAMES[d.weekday - 1]}</span>
                </div>
              </button>
            )
          })}
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
                <li key={i} className="text-muted">{t.name} — {t.sets}×{t.reps}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}

function TomekSidebarContent({ days, tomekTrainings, onSelectDate, todayIso, selectedDate, selectedTraining }) {
  const [expandedDate, setExpandedDate] = useState(null)

  function toggleDate(iso) {
    setExpandedDate(prev => prev === iso ? null : iso)
  }

  return (
    <>
      <div className="mb-4">
        <label className="form-label fw-bold text-success">Tomek's Training</label>
        <small className="d-block text-muted mb-2">Pick a day, then choose Training A or B</small>
        <div className="d-flex flex-column gap-1">
          {days.map((d) => {
            const isToday = d.iso === todayIso
            const isSelected = selectedDate && d.iso === selectedDate
            const isExpanded = expandedDate === d.iso
            let btnClass = 'btn-outline-secondary'
            if (isToday) btnClass = 'btn-secondary'
            else if (isSelected) btnClass = 'btn-success'

            return (
              <div key={d.iso}>
                <button
                  className={`btn text-start w-100 ${btnClass}`}
                  onClick={() => toggleDate(d.iso)}
                  style={{ fontSize: '0.95rem', padding: '0.4rem 0.75rem' }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontWeight: '500' }}>{d.iso}</span>
                    <span className={isSelected ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.85rem' }}>{WEEKDAY_NAMES[d.weekday - 1]}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="d-flex gap-1 mt-1 mb-1 ps-1">
                    {Object.keys(tomekTrainings).map((tName) => {
                      const label = tName.replace(/^Tomek\s*/i, '')
                      const isThisSelected = isSelected && selectedTraining === tName
                      return (
                        <button
                          key={tName}
                          className={`btn btn-sm flex-fill ${isThisSelected ? 'btn-success' : 'btn-outline-success'}`}
                          onClick={() => { onSelectDate(d.iso, tName); setExpandedDate(null) }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <hr />

      <div>
        <strong className="d-block mb-3">Templates</strong>
        {Object.entries(tomekTrainings).map(([tName, tData]) => (
          <div key={tName} className="mb-3">
            <em className="d-block text-secondary fw-bold">{tName.replace('Tomek ', '')}</em>
            <ul className="small ps-3 mb-2">
              {tData.exercises.map((t, i) => (
                <li key={i} className="text-muted">{t.name} — {t.sets}×{t.reps}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}

function SciaticaSidebarContent({ days, onSelectDate, todayIso, selectedDate }) {
  return (
    <div className="mb-4">
      <label className="form-label fw-bold text-warning">🧘 Sciatica</label>
      <small className="d-block text-muted mb-2">Pick a day to do your session</small>
      <div className="d-flex flex-column gap-1">
        {days.map((d) => {
          const isToday = d.iso === todayIso
          const isSelected = selectedDate && d.iso === selectedDate
          let btnClass = 'btn-outline-secondary'
          if (isSelected) btnClass = 'btn-warning'
          else if (isToday) btnClass = 'btn-outline-warning'
          return (
            <button
              key={d.iso}
              className={`btn text-start w-100 ${btnClass}`}
              onClick={() => onSelectDate(d.iso)}
              style={{ fontSize: '0.95rem', padding: '0.4rem 0.75rem' }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ fontWeight: '500' }}>{d.iso}</span>
                <span className={isSelected ? 'text-dark opacity-75' : 'text-muted'} style={{ fontSize: '0.85rem' }}>{WEEKDAY_NAMES[d.weekday - 1]}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
