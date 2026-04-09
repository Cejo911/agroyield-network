'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
    >
      🖨 Print / Save as PDF
    </button>
  )
}
