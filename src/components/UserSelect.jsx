import React from 'react'

export default function UserSelect({ onSelect }) {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div className="text-center">
        <h2 className="mb-5 fw-bold">Who's training today?</h2>
        <div className="d-flex gap-4 justify-content-center flex-wrap">
          <button
            className="btn btn-primary btn-lg px-5 py-4"
            style={{ fontSize: '1.4rem', minWidth: '150px', borderRadius: '16px' }}
            onClick={() => onSelect('tata')}
          >
            💪 Pro
          </button>
          <button
            className="btn btn-success btn-lg px-5 py-4"
            style={{ fontSize: '1.4rem', minWidth: '150px', borderRadius: '16px' }}
            onClick={() => onSelect('tomek')}
          >
            🏋️ Lite
          </button>
          <button
            className="btn btn-warning btn-lg px-5 py-4"
            style={{ fontSize: '1.4rem', minWidth: '150px', borderRadius: '16px' }}
            onClick={() => onSelect('sciatica')}
          >
            🧘 Sciatica
          </button>
        </div>
      </div>
    </div>
  )
}
