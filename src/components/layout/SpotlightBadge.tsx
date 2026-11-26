import { Sparkles } from 'lucide-react'

interface SpotlightBadgeProps {
  visible: boolean
  target: string
}

export function SpotlightBadge({ visible, target }: SpotlightBadgeProps) {
  if (!visible) return null

  return (
    <span
      data-testid={`spotlight-badge-${target}`}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-cyan)]/55 bg-[var(--accent-cyan)]/15 px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-[var(--accent-cyan)]"
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
      <span>J.A.R.V.I.S. Focus</span>
    </span>
  )
}
