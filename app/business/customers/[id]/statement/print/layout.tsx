export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        aside { display: none !important; }
        .min-h-screen { background: white !important; }
        .max-w-7xl { max-width: 100% !important; padding: 0 !important; }
        .flex.gap-6 { gap: 0 !important; }

        @media print {
          .no-print { display: none !important; }

          @page {
            margin: 0.8cm;
            size: A4;
          }

          .print-root {
            padding: 16px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          .print-root table th,
          .print-root table td {
            padding: 5px 8px !important;
            font-size: 11px !important;
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
