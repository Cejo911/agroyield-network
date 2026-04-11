export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @media print {
            .no-print {
              display: none !important;
            }
            @page {
              margin: 1cm;
              size: A4;
            }
            body {
              zoom: 98%;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
