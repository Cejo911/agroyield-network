'use client'
import { useState } from 'react'

export default function InvoiceShareActions({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) {
  const [generating, setGenerating] = useState(false)

  const generatePDF = async () => {
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const element = document.querySelector('.invoice-root') as HTMLElement
      if (!element) { setGenerating(false); return }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      return pdf
    } catch (err) {
      console.error('PDF generation failed:', err)
      return null
    }
  }

  const handleDownload = async () => {
    const pdf = await generatePDF()
    if (pdf) {
      pdf.save(`${invoiceNumber}.pdf`)
    }
    setGenerating(false)
  }

  const handleWhatsApp = async () => {
    // Can't directly share a file via WhatsApp web link,
    // so download the PDF first and share the invoice URL
    const invoiceUrl = `${window.location.origin}/invoice-print/${invoiceId}`
    const message = encodeURIComponent(
      `Here is your invoice ${invoiceNumber} from AgroYield.\nView it here: ${invoiceUrl}`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
    setGenerating(false)
  }

  const handleEmail = () => {
    const invoiceUrl = `${window.location.origin}/invoice-print/${invoiceId}`
    const subject = encodeURIComponent(`Invoice ${invoiceNumber}`)
    const body = encodeURIComponent(
      `Please find your invoice ${invoiceNumber} attached.\n\nView online: ${invoiceUrl}`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        onClick={handleDownload}
        disabled={generating}
        style={{
          padding: '7px 14px', fontSize: '12px', fontWeight: 600,
          background: '#16a34a', color: '#fff', border: 'none',
          borderRadius: '6px', cursor: generating ? 'not-allowed' : 'pointer',
          opacity: generating ? 0.6 : 1,
        }}
      >
        {generating ? 'Generating...' : 'Download PDF'}
      </button>
      <button
        onClick={handleWhatsApp}
        style={{
          padding: '7px 14px', fontSize: '12px', fontWeight: 600,
          background: '#25D366', color: '#fff', border: 'none',
          borderRadius: '6px', cursor: 'pointer',
        }}
      >
        WhatsApp
      </button>
      <button
        onClick={handleEmail}
        style={{
          padding: '7px 14px', fontSize: '12px', fontWeight: 600,
          background: '#374151', color: '#fff', border: 'none',
          borderRadius: '6px', cursor: 'pointer',
        }}
      >
        Email
      </button>
    </div>
  )
}