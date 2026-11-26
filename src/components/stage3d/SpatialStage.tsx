import { Component, Suspense, useMemo, useRef, type ErrorInfo, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Globe, RotateCcw, Terminal, X } from 'lucide-react'
import * as THREE from 'three'
import { getHotspotsForConcept } from '@/data/concepts'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { CameraRig } from '@/components/stage3d/CameraRig'
import { SpatialWorld } from '@/components/stage3d/SpatialWorld'
import { LpuCoreScene } from '@/components/stage3d/LpuCoreScene'
import { PromptRolesScene } from '@/components/stage3d/scenes/PromptRolesScene'
import { TemperatureScene } from '@/components/stage3d/scenes/TemperatureScene'
import { getIncludedTokenCount, TopPScene } from '@/components/stage3d/scenes/TopPScene'
import { TokenLimitsScene } from '@/components/stage3d/scenes/TokenLimitsScene'
import { StructuredJsonScene } from '@/components/stage3d/scenes/StructuredJsonScene'
import { BuiltInToolsScene } from '@/components/stage3d/scenes/BuiltInToolsScene'
import type { JsonMode } from '@/types/playground'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  errorMessage: string
}

class StageErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SpatialStage 3D Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-6">
          <div className="spatial-glass max-w-md rounded-3xl p-6 text-center">
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
              3D Spatial Stage Unavailable
            </h2>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
              WebGL could not initialize on this device. All Playground controls remain active.
            </p>
            {this.state.errorMessage && (
              <p className="font-mono-metric mt-3 text-[11px] text-[var(--text-muted)]">
                {this.state.errorMessage}
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function WebGLUnavailableNotice() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="spatial-glass max-w-md rounded-3xl p-6 text-center">
        <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
          WebGL Fallback View
        </h2>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
          Your browser could not initialize a 3D WebGL context. You can still explore all
          Playground settings and concept lenses.
        </p>
      </div>
    </div>
  )
}

function StageLoadingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="spatial-pill flex items-center gap-2.5 rounded-full px-4 py-2 text-[12px] text-[var(--text-secondary)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-cyan)]" />
        <span>Initializing Spatial LPU Stage…</span>
      </div>
    </div>
  )
}

function StudioFloorRings({ isDark }: { isDark: boolean }) {
  const ringColor = isDark ? '#1E293B' : '#CBD5E1'
  const accentRing = isDark ? '#0EA5E9' : '#0284C7'
  return (
    <group position={[0, -1.68, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.45, 1.48, 72]} />
        <meshBasicMaterial
          color={accentRing}
          transparent
          opacity={isDark ? 0.28 : 0.22}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.1, 3.13, 96]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={isDark ? 0.35 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      <gridHelper
        args={[14, 24, isDark ? '#162238' : '#CBD5E1', isDark ? '#0D1526' : '#E2E8F0']}
        position={[0, -0.02, 0]}
      />
    </group>
  )
}

function checkWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    return false
  }
}

export function SpatialStage() {
  const theme = usePlaygroundStore((state) => state.theme)
  const activeWorkspace = usePlaygroundStore((state) => state.activeWorkspace)
  const activeConcept = usePlaygroundStore((state) => state.activeConcept)
  const selectedHotspot = usePlaygroundStore((state) => state.selectedHotspot)
  const topP = usePlaygroundStore((state) => state.topP)
  const jsonMode = usePlaygroundStore((state) => state.jsonMode)
  const builtInTools = usePlaygroundStore((state) => state.builtInTools)
  const isControlDockCollapsed = usePlaygroundStore((state) => state.isControlDockCollapsed)
  const isJarvisOpen = usePlaygroundStore((state) => state.isJarvisOpen)
  const isConsoleExpanded = usePlaygroundStore((state) => state.isConsoleExpanded)
  const isTourActive = usePlaygroundStore((state) => state.isTourActive)

  const setSelectedHotspot = usePlaygroundStore((state) => state.setSelectedHotspot)
  const setJsonMode = usePlaygroundStore((state) => state.setJsonMode)
  const setBuiltInTools = usePlaygroundStore((state) => state.setBuiltInTools)
  const triggerCameraReset = usePlaygroundStore((state) => state.triggerCameraReset)

  const htmlPortalRef = useRef<HTMLDivElement>(null!)
  const isDark = theme === 'dark'
  const hasWebGL = useMemo(() => checkWebGLAvailable(), [])

  const conceptHotspots = getHotspotsForConcept(activeConcept)
  const activeHotspotIndex = selectedHotspot
    ? conceptHotspots.findIndex((h) => h.id === selectedHotspot)
    : -1
  const activeHotspot =
    activeHotspotIndex >= 0 ? conceptHotspots[activeHotspotIndex] : null

  const stepHotspot = (dir: -1 | 1) => {
    const nextIdx =
      (activeHotspotIndex + dir + conceptHotspots.length) % conceptHotspots.length
    setSelectedHotspot(conceptHotspots[nextIdx].id)
  }

  const includedTopPCount = getIncludedTokenCount(topP)

  const renderActiveScene = () => {
    switch (activeConcept) {
      case 'lpu-pipeline':
        return <LpuCoreScene htmlPortalRef={htmlPortalRef} />
      case 'prompt-roles':
        return (
          <>
            <StudioFloorRings isDark={isDark} />
            <PromptRolesScene htmlPortalRef={htmlPortalRef} />
          </>
        )
      case 'temperature':
        return (
          <>
            <StudioFloorRings isDark={isDark} />
            <TemperatureScene htmlPortalRef={htmlPortalRef} />
          </>
        )
      case 'top-p':
        return (
          <>
            <StudioFloorRings isDark={isDark} />
            <TopPScene htmlPortalRef={htmlPortalRef} />
          </>
        )
      case 'tokens-limits':
        return (
          <>
            <StudioFloorRings isDark={isDark} />
            <TokenLimitsScene htmlPortalRef={htmlPortalRef} />
          </>
        )
      case 'structured-json':
        return (
          <>
            <StudioFloorRings isDark={isDark} />
            <StructuredJsonScene htmlPortalRef={htmlPortalRef} />
          </>
        )
      case 'built-in-tools':
        return (
          <>
            <StudioFloorRings isDark={isDark} />
            <BuiltInToolsScene htmlPortalRef={htmlPortalRef} />
          </>
        )
    }
  }

  return (
    <main className="relative h-full w-full select-none">
      <StageErrorBoundary>
        {hasWebGL ? (
          <Suspense fallback={<StageLoadingOverlay />}>
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [-1.35, 2.3, 10.15], fov: 42, near: 0.1, far: 100 }}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
              onPointerMissed={() => {
                if (selectedHotspot) setSelectedHotspot(null)
              }}
            >
              <SpatialWorld isDark={isDark} />

              {/* Soft Studio Reflection Environment for Metallic & Glass Surfaces */}
              <Environment resolution={64}>
                <Lightformer
                  form="rect"
                  intensity={isDark ? 1.8 : 2.6}
                  color="#FFFFFF"
                  position={[0, 6, 3]}
                  rotation={[Math.PI / 2, 0, 0]}
                  scale={[12, 4, 1]}
                />
                <Lightformer
                  form="rect"
                  intensity={isDark ? 1.4 : 1.8}
                  color="#7DD3FC"
                  position={[-6, 2, 2]}
                  rotation={[0, Math.PI / 2, 0]}
                  scale={[6, 4, 1]}
                />
                <Lightformer
                  form="rect"
                  intensity={isDark ? 1.1 : 1.4}
                  color="#FDE68A"
                  position={[6, 1, -2]}
                  rotation={[0, -Math.PI / 2, 0]}
                  scale={[6, 4, 1]}
                />
              </Environment>

              {/* Calibrated Studio Lighting (Dark Obsidian vs Bright Apple Studio) */}
              <ambientLight intensity={isDark ? 0.5 : 1.05} />
              <directionalLight
                position={[4, 7, 5]}
                intensity={isDark ? 1.45 : 1.85}
                color={isDark ? '#F8FAFC' : '#FFFFFF'}
              />
              <directionalLight
                position={[-5, 3, -4]}
                intensity={isDark ? 0.65 : 0.75}
                color={isDark ? '#38BDF8' : '#BAE6FD'}
              />
              <pointLight
                position={[0, 1.2, 3.2]}
                intensity={isDark ? 2.4 : 1.3}
                distance={12}
                color={isDark ? '#22D3EE' : '#38BDF8'}
              />
              <pointLight
                position={[2.5, -0.5, -2.5]}
                intensity={isDark ? 1.2 : 0.75}
                distance={10}
                color="#F59E0B"
              />

              {renderActiveScene()}
              <CameraRig />
            </Canvas>
          </Suspense>
        ) : (
          <WebGLUnavailableNotice />
        )}
      </StageErrorBoundary>

      {/* Fixed Portal Container for R3F Drei <Html> Hotspot Pills */}
      <div
        ref={htmlPortalRef}
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      />

      {/* Top-Center Stage Controls: Hotspot Explanation Card OR Concept Interactive Pill */}
      <div
        className={[
          'pointer-events-none fixed inset-x-0 z-20 flex flex-col items-center gap-2 px-4 transition-all duration-300',
          isConsoleExpanded ? 'top-[116px] lg:top-[76px]' : 'bottom-[68px]',
          isConsoleExpanded && !isJarvisOpen ? 'pr-[136px] lg:pr-4' : '',
          !isControlDockCollapsed && !isJarvisOpen ? 'lg:pl-[340px]' : '',
          isControlDockCollapsed && isJarvisOpen ? 'lg:pr-[400px]' : '',
          !isControlDockCollapsed && isJarvisOpen ? 'lg:pl-[340px] lg:pr-[400px]' : '',
        ].join(' ')}
      >
        {/* Concept-Specific Inline Interactive Toggles / Legends */}
        {activeWorkspace === 'studio' && !activeHotspot && activeConcept === 'top-p' && (
          <div
            data-testid="topp-pool-legend"
            className="pointer-events-auto spatial-pill flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--text-primary)]"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--accent-cyan)]" aria-hidden="true" />
            <span>
              Included Pool:{' '}
              <strong className="font-mono-metric text-[var(--accent-cyan)]">
                {includedTopPCount} / 8 tokens
              </strong>
            </span>
          </div>
        )}

        {activeWorkspace === 'studio' && !activeHotspot && activeConcept === 'structured-json' && (
          <div
            data-testid="json-mode-stage-toggle"
            className="pointer-events-auto spatial-pill flex items-center gap-1 rounded-full p-1"
            role="group"
            aria-label="JSON Output Mode"
          >
            {(
              [
                { id: 'off', label: 'Off' },
                { id: 'json_object', label: 'JSON Object' },
                { id: 'json_schema', label: 'JSON Schema' },
              ] as Array<{ id: JsonMode; label: string }>
            ).map((opt) => {
              const active = jsonMode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setJsonMode(opt.id)}
                  data-testid={`stage-json-mode-${opt.id}`}
                  aria-pressed={active}
                  className={[
                    'rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors',
                    active
                      ? 'bg-[var(--accent-cyan)] text-slate-950'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}

        {activeWorkspace === 'studio' && !activeHotspot && activeConcept === 'built-in-tools' && (
          <div
            data-testid="tools-stage-toggles"
            className="pointer-events-auto spatial-pill flex items-center gap-1.5 rounded-full p-1"
            role="group"
            aria-label="Built-In Tools"
          >
            <button
              type="button"
              onClick={() => setBuiltInTools({ browserSearch: !builtInTools.browserSearch })}
              data-testid="stage-toggle-browser-search"
              aria-pressed={builtInTools.browserSearch}
              className={[
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors',
                builtInTools.browserSearch
                  ? 'bg-[var(--accent-sky)] text-slate-950'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Browser Search</span>
            </button>
            <button
              type="button"
              onClick={() => setBuiltInTools({ codeInterpreter: !builtInTools.codeInterpreter })}
              data-testid="stage-toggle-code-interpreter"
              aria-pressed={builtInTools.codeInterpreter}
              className={[
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors',
                builtInTools.codeInterpreter
                  ? 'bg-[var(--accent-amber)] text-slate-950'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Code Sandbox</span>
            </button>
          </div>
        )}

      {activeWorkspace === 'lab' && (
        <AnimatePresence mode="wait">
          {activeHotspot ? (
            <motion.div
              key={`hotspot-${activeHotspot.id}`}
              data-testid="hotspot-explanation-card"
              initial={{ opacity: 0, y: isConsoleExpanded ? -10 : 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isConsoleExpanded ? -8 : 10, scale: 0.97 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
              className="pointer-events-auto spatial-glass-elevated w-full max-w-[540px] rounded-[24px] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono-metric rounded-full border border-[var(--glass-border-strong)] bg-[var(--glass-bg-pill)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-cyan)]">
                    0{activeHotspot.stepNumber} / 03
                  </span>
                  <h3 className="text-[14.5px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                    {activeHotspot.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepHotspot(-1)}
                    aria-label="Previous pipeline stage"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepHotspot(1)}
                    aria-label="Next pipeline stage"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
                  >
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHotspot(null)}
                    aria-label="Close stage explanation"
                    data-testid="hotspot-card-close"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {activeHotspot.explanation}
              </p>
            </motion.div>
          ) : !isConsoleExpanded && !isTourActive ? (
            <motion.div
              key="orbit-hint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22 }}
              className="spatial-pill rounded-full px-4 py-1.5 text-[11.5px] text-[var(--text-secondary)]"
            >
              Drag to orbit · Scroll to zoom · Click any 3D hotspot pill to inspect
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
      </div>

      {/* Floating Glass Reset View Button */}
      <motion.button
        type="button"
        onClick={triggerCameraReset}
        whileTap={{ scale: 0.95 }}
        animate={{
          x: isJarvisOpen ? -396 : 0,
        }}
        transition={{ type: 'spring', bounce: 0, duration: 0.34 }}
        aria-label="Reset 3D camera view"
        data-testid="reset-view-button"
        className={[
          'spatial-pill fixed right-4 z-20 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--glass-border-strong)]',
          isConsoleExpanded ? 'top-[116px] lg:top-[78px]' : 'bottom-5',
        ].join(' ')}
      >
        <RotateCcw className="h-3.5 w-3.5 text-[var(--accent-cyan)]" aria-hidden="true" />
        <span>Reset View</span>
      </motion.button>
    </main>
  )
}

export default SpatialStage
