import { useRef, useState } from 'react'

import { getPluginCtx } from './shared'

const STORAGE_KEY = 'collapsed-roster-sections-v1'

function readCollapsedSections(): Set<string> {
  const value: unknown = getPluginCtx()?.storage?.get?.(STORAGE_KEY, [])

  return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && Boolean(id)) : [])
}

export function useRosterSectionCollapse() {
  // These are the renderer's existing disclosure keys, including the connection
  // prefix on nested user sections. An offline/filtered roster is not proof an
  // identity was deleted, so do not prune against the currently visible rows.
  const [collapsedRosterSections, setCollapsedRosterSections] = useState<Set<string>>(() => {
    try {
      return readCollapsedSections()
    } catch {
      return new Set()
    }
  })

  const current = useRef(collapsedRosterSections)

  const toggleRosterSection = (id: string): void => {
    const next = new Set(current.current)

    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }

    current.current = next
    setCollapsedRosterSections(next)

    try {
      // A second window may have changed another heading since this pane
      // mounted. Merge only this click into the latest synchronous snapshot.
      const stored = readCollapsedSections()

      if (next.has(id)) {
        stored.add(id)
      } else {
        stored.delete(id)
      }

      getPluginCtx()?.storage?.set?.(STORAGE_KEY, [...stored])
    } catch {
      // Presentation remains usable when persistence is unavailable.
    }
  }

  return { collapsedRosterSections, toggleRosterSection }
}
