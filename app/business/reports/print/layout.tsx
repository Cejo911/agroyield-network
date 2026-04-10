export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Collapse the sidebar completely */
        nav, aside,
        [class*="sidebar"], [class*="Sidebar"],
        [class*="side-bar"], [class*="SideBar"] {
          display: none !important;
          width: 0 !important;
          min-width: 0 !important;
          max-width: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: hidden !important;
          flex: none !important;
        }

        /* Reset every wrapper so content fills the viewport */
        html, body {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }

        body > div,
        body > div > div {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
        }

        /* If the layout uses flex, make the child fill remaining space */
        main, [role="main"],
        body > div > div > main,
        body > div > div > div:last-child {
          flex: 1 1 auto !important;
          width: 100% !important;
          max-width: 100% !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
      `}</style>
      {children}
    </>
  )
}
