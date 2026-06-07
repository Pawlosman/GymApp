import React from 'react'

export default function UserSelect({ onSelect }) {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <div className="text-center">
        <h2 className="mb-5 fw-bold">Who's training today?</h2>
        <div className="d-flex gap-4 justify-content-center flex-wrap">
          <ProfileCard
            photo="/exercises/PRO.jpeg"
            label="PRO Training"
            color="#0d6efd"
            onClick={() => onSelect('tata')}
          />
          <ProfileCard
            photo="/exercises/LITE.jpg"
            label="LITE Training"
            color="#198754"
            onClick={() => onSelect('tomek')}
          />
          <ProfileCard
            photo="/exercises/SCIATICA.jpg"
            label="Sciatica"
            color="#ffc107"
            onClick={() => onSelect('sciatica')}
          />
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ photo, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `3px solid ${color}`,
        borderRadius: '16px',
        background: 'white',
        cursor: 'pointer',
        width: '160px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
    >
      <img
        src={photo}
        alt={label}
        style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px' }}
        onError={e => { e.target.style.display = 'none' }}
      />
      <span style={{ fontWeight: '700', fontSize: '1rem', color }}>{label}</span>
    </button>
  )
}
