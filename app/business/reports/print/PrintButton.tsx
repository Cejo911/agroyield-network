'use client'

export default function PrintButton() {
  const handlePrint = () => {
    setTimeout(() => window.print(), 300)
  }

  return (
    <>
      <style>{`
        @media print {
          nav, aside, header, .no-print, [class*="sidebar"], [class*="nav"] {
            display: none !important;
          }
        }
      `}</style>
      <button
        onClick={handlePrint}
        style={{
          background: '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        🖨️ Print / Save as PDF
      </button>
    </>
  )
}
