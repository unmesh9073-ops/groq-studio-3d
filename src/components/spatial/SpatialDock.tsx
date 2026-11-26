import { Compass, Cpu, Play, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { playGlassTap } from '@/services/soundEngine'
import type { WorkspaceId } from '@/types/playground'

interface DockItem {
  id: WorkspaceId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const DOCK_ITEMS: DockItem[] = [
  { id: 'studio', label: 'Studio', icon: Compass },
  { id: 'lab', label: '3D Lab', icon: Cpu },
  { id: 'playground', label: 'Playground', icon: Play },
  { id: 'builder', label: 'Builder', icon: Wrench },
]

export function SpatialDock() {
  const activeWorkspace = usePlaygroundStore((s) => s.activeWorkspace)
  const setActiveWorkspace = usePlaygroundStore((s) => s.setActiveWorkspace)

  return (
    <nav
      aria-label="Spatial Workspaces"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4"
    >
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] p-1.5 shadow-[0_18px_42px_-10px_rgba(0,0,0,0.45)]"
        style={{
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        }}
      >
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeWorkspace === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (activeWorkspace !== item.id) {
                  playGlassTap()
                  setActiveWorkspace(item.id)
                }
              }}
              className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="spatial-dock-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full border border-white/20 bg-white/15 shadow-[0_0_20px_rgba(34,211,238,0.22)] dark:bg-white/12"
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
