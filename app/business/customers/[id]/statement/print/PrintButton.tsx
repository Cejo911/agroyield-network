'use client'
export default function PrintButton() {
  return (
    <div className="no-print">
      <button
        onClick={() => setTimeout(() => window.print(), 300)}
        style={{ background: '#111827', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
      >
        🖨️ Print / Save as PDF
      </button>
    </div>
  )
}
