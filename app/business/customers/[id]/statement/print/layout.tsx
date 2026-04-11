export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Hide sidebar and strip container padding for print page */
        aside {
          display: none !important;
        }
        .min-h-screen {
          background: white !important;
        }
        .max-w-7xl {
          max-width: 100% !important;
          padding: 0 !important;
        }
        .flex.gap-6 {
          gap: 0 !important;
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
            zoom: 98%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      {children}
    </>
  )
}
