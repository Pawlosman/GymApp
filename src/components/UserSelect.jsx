import React from 'react'

export default function UserSelect({ onSelect }) {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div className="text-center">
        <h2 className="mb-5 fw-bold">Who's training today?</h2>
        <div className="d-flex gap-4 justify-content-center">
          <button
            className="btn btn-primary btn-lg px-5 py-4"
            style={{ fontSize: '1.5rem', minWidth: '160px', borderRadius: '16px' }}
            onClick={() => onSelect('tata')}
          >
            💪 Tata
          </button>
          <button
            className="btn btn-success btn-lg px-5 py-4"
            style={{ fontSize: '1.5rem', minWidth: '160px', borderRadius: '16px' }}
            onClick={() => onSelect('tomek')}
          >
            🏋️ Tomek
          </button>
        </div>
      </div>
    </div>
  )
}
