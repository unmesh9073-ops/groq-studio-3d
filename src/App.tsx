import { lazy, Suspense } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { JarvisDrawerShell } from '@/components/jarvis/JarvisDrawerShell'
import { SettingsModal } from '@/components/layout/SettingsModal'
import { CodeExportModal } from '@/components/playground/CodeExportModal'
import { JsonSchemaModal } from '@/components/playground/JsonSchemaModal'
import { SpatialDock } from '@/components/spatial/SpatialDock'
import { SpatialHeader } from '@/components/spatial/SpatialHeader'
import { GuidedTourOverlay } from '@/components/tour/GuidedTourOverlay'
import { BuilderWorkspace } from '@/components/workspaces/BuilderWorkspace'
import { LabWorkspace } from '@/components/workspaces/LabWorkspace'
import { PlaygroundWorkspace } from '@/components/workspaces/PlaygroundWorkspace'
import { StudioHub } from '@/components/workspaces/StudioHub'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

const SpatialStage = lazy(() => import('@/components/stage3d/SpatialStage'))

function StageLoadingBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'var(--studio-bg)',
        backgroundImage: 'var(--studio-backdrop)',
      }}
    >
      <div className="spatial-pill flex items-center gap-2.5 rounded-full px-4 py-2 text-[12px] text-[var(--text-secondary)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-cyan)]" />
        <span>Initializing Spatial LPU Stage…</span>
      </div>
    </div>
  )
}

export function App() {
  const activeWorkspace = usePlaygroundStore((s) => s.activeWorkspace)

  return (
    <MotionConfig reducedMotion="user">
      <div className="studio-viewport">
        <Suspense fallback={<StageLoadingBackdrop />}>
          <SpatialStage />
        </Suspense>

        <SpatialHeader />

        <AnimatePresence mode="wait">
          {activeWorkspace === 'studio' && (
            <motion.div
              key="workspace-studio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0"
            >
              <StudioHub />
            </motion.div>
          )}

          {activeWorkspace === 'lab' && (
            <motion.div
              key="workspace-lab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0"
            >
              <LabWorkspace />
            </motion.div>
          )}

          {activeWorkspace === 'playground' && (
            <motion.div
              key="workspace-playground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0"
            >
              <PlaygroundWorkspace />
            </motion.div>
          )}

          {activeWorkspace === 'builder' && (
            <motion.div
              key="workspace-builder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-0"
            >
              <BuilderWorkspace />
            </motion.div>
          )}
        </AnimatePresence>

        <SpatialDock />
        <GuidedTourOverlay />
        <JarvisDrawerShell />
        <SettingsModal />
        <JsonSchemaModal />
        <CodeExportModal />
      </div>
    </MotionConfig>
  )
}

export default App
