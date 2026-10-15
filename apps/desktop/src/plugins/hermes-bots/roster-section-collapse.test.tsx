import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useRosterSectionCollapse } from './roster-section-collapse'
import { RosterSectionHeader } from './roster-sections'
import type * as Shared from './shared'

const { storage, values } = vi.hoisted(() => {
  const values = new Map<string, unknown>()

  return {
    storage: {
      get: vi.fn((key: string, fallback: unknown) => values.get(key) ?? fallback),
      set: vi.fn((key: string, value: unknown) => values.set(key, value))
    },
    values
  }
})

vi.mock('./shared', async importOriginal => ({
  ...(await importOriginal<typeof Shared>()),
  getPluginCtx: () => ({ storage })
}))

beforeEach(() => {
  values.clear()
  vi.clearAllMocks()
})

afterEach(cleanup)

describe('roster section disclosure', () => {
  it('restores the native heading disclosure and visible rows after remount', () => {
    function Section() {
      const { collapsedRosterSections, toggleRosterSection } = useRosterSectionCollapse()
      const collapsed = collapsedRosterSections.has('gateway:alpha')

      return (
        <>
          <RosterSectionHeader
            collapsed={collapsed}
            count={1}
            icon="organization"
            label="Alpha"
            onToggle={() => toggleRosterSection('gateway:alpha')}
          />
          {collapsed ? null : <div>Alpha bot</div>}
        </>
      )
    }

    const pane = render(<Section />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    expect(screen.queryByText('Alpha bot')).toBeNull()
    pane.unmount()
    render(<Section />)
    expect(screen.getByRole('button', { name: /Alpha/ }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Alpha bot')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    expect(screen.getByText('Alpha bot')).toBeTruthy()
  })

  it('restores collapsed gateways, groups and user sections after the pane remounts', () => {
    const pane = renderHook(useRosterSectionCollapse)
    const ids = ['gateway:alpha', 'group-chats', 'alpha:user-section:sec-clients']

    act(() => ids.forEach(id => pane.result.current.toggleRosterSection(id)))
    expect([...pane.result.current.collapsedRosterSections]).toEqual(ids)
    pane.unmount()

    const restored = renderHook(useRosterSectionCollapse)
    expect([...restored.result.current.collapsedRosterSections]).toEqual(ids)

    act(() => restored.result.current.toggleRosterSection('gateway:alpha'))
    restored.unmount()
    expect(renderHook(useRosterSectionCollapse).result.current.collapsedRosterSections.has('gateway:alpha')).toBe(false)
  })

  it('keeps identical user-section names independent across connections and replacement identities', () => {
    const pane = renderHook(useRosterSectionCollapse)

    act(() => pane.result.current.toggleRosterSection('alpha:user-section:sec-clients'))
    pane.unmount()
    const restored = renderHook(useRosterSectionCollapse)

    expect(restored.result.current.collapsedRosterSections.has('alpha:user-section:sec-clients')).toBe(true)
    expect(restored.result.current.collapsedRosterSections.has('beta:user-section:sec-clients')).toBe(false)
    expect(restored.result.current.collapsedRosterSections.has('alpha:user-section:sec-replacement')).toBe(false)
  })

  it('normalizes persisted disclosure without rewriting it on mount', () => {
    values.set('collapsed-roster-sections-v1', ['gateway:alpha', null, 3, '', 'gateway:alpha', 'group-chats'])

    const pane = renderHook(useRosterSectionCollapse)
    expect([...pane.result.current.collapsedRosterSections]).toEqual(['gateway:alpha', 'group-chats'])
    expect(storage.set).not.toHaveBeenCalled()
  })

  it('preserves unrelated disclosure changes made by another mounted pane', () => {
    const first = renderHook(useRosterSectionCollapse)
    const second = renderHook(useRosterSectionCollapse)

    act(() => first.result.current.toggleRosterSection('gateway:alpha'))
    act(() => second.result.current.toggleRosterSection('gateway:beta'))
    first.unmount()
    second.unmount()

    const restored = renderHook(useRosterSectionCollapse)
    expect([...restored.result.current.collapsedRosterSections]).toEqual(['gateway:alpha', 'gateway:beta'])
  })

  it('ignores a malformed snapshot while leaving toggles usable', () => {
    values.set('collapsed-roster-sections-v1', { 'gateway:alpha': true })

    const pane = renderHook(useRosterSectionCollapse)
    expect(pane.result.current.collapsedRosterSections.size).toBe(0)
    act(() => pane.result.current.toggleRosterSection('group-chats'))
    expect(pane.result.current.collapsedRosterSections.has('group-chats')).toBe(true)
  })

  it('keeps the pane usable when storage reads and writes fail', () => {
    storage.get.mockImplementationOnce(() => { throw new Error('unavailable') })
    storage.set.mockImplementationOnce(() => { throw new Error('quota exceeded') })

    const pane = renderHook(useRosterSectionCollapse)
    expect(pane.result.current.collapsedRosterSections.size).toBe(0)
    act(() => pane.result.current.toggleRosterSection('gateway:alpha'))
    expect(pane.result.current.collapsedRosterSections.has('gateway:alpha')).toBe(true)
  })
})
