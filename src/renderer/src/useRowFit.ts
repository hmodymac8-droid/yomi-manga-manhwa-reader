import { useEffect, useRef, useState } from 'react'

/**
 * How many cards fit side by side in a .fitrow / .fitgrid row, kept up to date as the window changes size. Used to
 * show "Show all" only when some cards are hidden.
 */
export function useRowFit(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(Infinity)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = (): void =>
      setCols(
        getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length || Infinity
      )
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })
  return [ref, cols]
}
