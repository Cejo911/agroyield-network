'use client'

export default function PrintButton() {
  const handlePrint = () => {
    // Small delay ensures page is fully rendered before print dialog opens
    setTimeout(() => window.print(), 300)
  }

  return (
    <button
      onClick={handlePrint}
      className="no-print"
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
  )
}
