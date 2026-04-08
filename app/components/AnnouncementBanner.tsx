import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COLOR_CLASSES: Record<string, string> = {
  green:  'bg-green-600 text-white',
  yellow: 'bg-yellow-400 text-yellow-900',
  red:    'bg-red-600 text-white',
  blue:   'bg-blue-600 text-white',
}

export default async function AnnouncementBanner() {
  noStore()
  try {
    const adminAny = adminClient as any
    const { data } = await adminAny
      .from('settings')
      .select('key, value')
      .in('key', ['announcement_enabled', 'announcement_text', 'announcement_color'])

    const map: Record<string, string> = {}
    for (const row of (data ?? [])) {
      map[row.key] = row.value
    }

    if (map['announcement_enabled'] !== 'true' || !map['announcement_text']?.trim()) {
      return null
    }

    const colorClass = COLOR_CLASSES[map['announcement_color'] ?? 'green'] ?? COLOR_CLASSES.green

    return (
      <div className={`${colorClass} text-sm py-2.5 px-4 text-center font-medium`}>
        {map['announcement_text']}
      </div>
    )
  } catch {
    return null
  }
}
