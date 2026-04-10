export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Hide sidebar and expand content to full width */
        nav, aside, [class*="sidebar"], [class*="Sidebar"] {
          display: none !important;
        }
        body > div, main, [class*="main"], [class*="layout"], [class*="Layout"] {
          margin-left: 0 !important;
          padding-left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }
        /* Flex containers: make content take full width */
        body > div > div, main > div {
          margin-left: 0 !important;
          flex: 1 !important;
          width: 100% !important;
        }
      `}</style>
      {children}
    </>
  )
}
