'use client'
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{ background: '#15803d', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
    >
      🖨 Print / Save as PDF
    </button>
  )
}
