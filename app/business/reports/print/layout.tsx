export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Hide the business sidebar on print preview */
        nav, aside { display: none !important; }
        main, [class*="main"], [class*="content"] {
          margin-left: 0 !important;
          padding-left: 0 !important;
          width: 100% !important;
        }
      `}</style>
      {children}
    </>
  )
}
