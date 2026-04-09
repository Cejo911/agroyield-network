// app/invoice-print/[id]/PrintButton.tsx
'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: '#16a34a',
        color: '#fff',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      🖨 Print / Save as PDF
    </button>
  )
}
