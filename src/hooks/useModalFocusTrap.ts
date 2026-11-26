import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function isTextInputFocused(): boolean {
  if (typeof document === 'undefined') return false
  const active = document.activeElement
  if (!active) return false
  const tag = active.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return (active as HTMLElement).isContentEditable === true
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  )
}

/**
 * Traps keyboard Tab/Shift+Tab focus inside an open modal dialog,
 * restores focus to the trigger element on close, and handles top-most Escape.
 */
export function useModalFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  active = true
): void {
  useEffect(() => {
    if (!active) return

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const rafId = window.requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container) return
      if (!container.contains(document.activeElement)) {
        const focusables = getFocusableElements(container)
        if (focusables.length > 0) {
          focusables[0].focus()
        } else {
          container.focus()
        }
      }
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current
      if (!container) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusables = getFocusableElements(container)
      if (focusables.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (!current || !container.contains(current) || current === first) {
          event.preventDefault()
          last.focus()
        }
      } else {
        if (!current || !container.contains(current) || current === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('keydown', handleKeyDown, true)
      if (previousFocus && previousFocus.isConnected) {
        previousFocus.focus()
      }
    }
  }, [active, containerRef, onClose])
}
