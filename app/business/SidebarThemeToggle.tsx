'use client'
import ThemeToggle from '@/app/components/ThemeToggle'

export default function SidebarThemeToggle() {
  return (
    <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2 flex items-center justify-between px-3 py-1">
      <span className="text-xs text-gray-500">Theme</span>
      <ThemeToggle />
    </div>
  )
}
