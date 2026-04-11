export default function StatementPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        nav, aside, [class*="sidebar"], [class*="Sidebar"] {
          display: none !important;
          width: 0 !important;
          min-width: 0 !important;
        }
        body > div, main, [role="main"] {
          margin-left: 0 !important;
          padding-left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
         @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      {children}
    </>
  )
}
