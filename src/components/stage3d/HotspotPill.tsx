import type { RefObject } from 'react'
import { Html } from '@react-three/drei'
import type { HotspotMetadata } from '@/types/playground'

interface HotspotPillProps {
  hotspot: HotspotMetadata
  htmlPortalRef: RefObject<HTMLElement>
  isSelected: boolean
  onSelect: (id: string) => void
}

export function HotspotPill({
  hotspot,
  htmlPortalRef,
  isSelected,
  onSelect,
}: HotspotPillProps) {
  const dotColor =
    hotspot.accent === 'amber'
      ? 'var(--accent-amber)'
      : hotspot.accent === 'sky'
        ? 'var(--accent-sky)'
        : 'var(--accent-cyan)'

  return (
    <Html
      portal={htmlPortalRef}
      position={hotspot.anchorPosition}
      center
      zIndexRange={[15, 0]}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelect(hotspot.id)
        }}
        data-testid={`hotspot-pill-${hotspot.id}`}
        aria-pressed={isSelected}
        className={[
          'pointer-events-auto spatial-pill select-none flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-[transform,border-color,box-shadow,color] duration-150',
          'hover:scale-105 active:scale-95',
          isSelected
            ? 'border-[var(--accent-cyan)] ring-2 ring-[var(--accent-cyan)]/35 text-[var(--text-primary)]'
            : 'text-[var(--text-primary)] hover:border-[var(--glass-border-strong)]',
        ].join(' ')}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
          }}
          aria-hidden="true"
        />
        <span className="font-mono-metric text-[10px] text-[var(--text-muted)]">
          0{hotspot.stepNumber}
        </span>
        <span>{hotspot.shortLabel}</span>
      </button>
    </Html>
  )
}
