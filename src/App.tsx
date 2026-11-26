import { lazy, Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { JarvisDrawerShell } from '@/components/jarvis/JarvisDrawerShell'
import { ControlDock } from '@/components/layout/ControlDock'
import { SettingsModal } from '@/components/layout/SettingsModal'
import { TopNav } from '@/components/layout/TopNav'
import { CodeExportModal } from '@/components/playground/CodeExportModal'
import { JsonSchemaModal } from '@/components/playground/JsonSchemaModal'
import { PromptConsole } from '@/components/playground/PromptConsole'
import { GuidedTourOverlay } from '@/components/tour/GuidedTourOverlay'

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
  return (
    <MotionConfig reducedMotion="user">
      <div className="studio-viewport">
        <Suspense fallback={<StageLoadingBackdrop />}>
          <SpatialStage />
        </Suspense>
        <TopNav />
        <ControlDock />
        <PromptConsole />
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
