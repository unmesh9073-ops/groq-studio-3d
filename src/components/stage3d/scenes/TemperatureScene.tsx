import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getHotspotsForConcept } from '@/data/concepts'
import { HotspotPill } from '@/components/stage3d/HotspotPill'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

interface TemperatureSceneProps {
  htmlPortalRef: RefObject<HTMLElement>
}

interface TokenCandidate {
  word: string
  logit: number
}

const CANDIDATES: TokenCandidate[] = [
  { word: 'fast', logit: 4.2 },
  { word: 'instant', logit: 3.4 },
  { word: 'rapid', logit: 2.8 },
  { word: 'swift', logit: 2.2 },
  { word: 'quick', logit: 1.6 },
  { word: 'electric', logit: 0.9 },
  { word: 'cosmic', logit: 0.2 },
  { word: 'banana', logit: -0.6 },
]

export function computeSoftmaxProbabilities(temperature: number): number[] {
  const tau = Math.max(0.05, temperature)
  const maxLogit = CANDIDATES[0].logit
  const exps = CANDIDATES.map((c) => Math.exp((c.logit - maxLogit) / tau))
  const sum = exps.reduce((acc, v) => acc + v, 0)
  return exps.map((v) => v / sum)
}

export function TemperatureScene({ htmlPortalRef }: TemperatureSceneProps) {
  const theme = usePlaygroundStore((state) => state.theme)
  const temperature = usePlaygroundStore((state) => state.temperature)
  const selectedHotspot = usePlaygroundStore((state) => state.selectedHotspot)
  const setSelectedHotspot = usePlaygroundStore((state) => state.setSelectedHotspot)

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isDark = theme === 'dark'
  const hotspots = getHotspotsForConcept('temperature')
  const probabilities = useMemo(() => computeSoftmaxProbabilities(temperature), [temperature])

  const pillarRefs = useRef<(THREE.Mesh | null)[]>([])
  const pillarMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  const scratchRef = useRef({
    cyan: new THREE.Color('#22D3EE'),
    amber: new THREE.Color('#F59E0B'),
    coral: new THREE.Color('#F97316'),
    muted: new THREE.Color('#475569'),
    working: new THREE.Color('#22D3EE'),
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const motionScale = prefersReducedMotion ? 0.15 : 1
    const tempRatio = Math.min(1, Math.max(0, temperature / 2))
    const { cyan, amber, coral, muted, working } = scratchRef.current

    cyan.set(isDark ? '#22D3EE' : '#0EA5E9')
    amber.set(isDark ? '#F59E0B' : '#EA580C')
    coral.set(isDark ? '#FB7185' : '#E11D48')
    muted.set(isDark ? '#334155' : '#94A3B8')

    for (let i = 0; i < CANDIDATES.length; i++) {
      const prob = probabilities[i]
      const mesh = pillarRefs.current[i]
      const mat = pillarMatRefs.current[i]

      const shimmer =
        tempRatio > 0.55
          ? Math.sin(t * (3.5 + tempRatio * 3.5) + i * 1.1) * 0.06 * tempRatio * motionScale
          : 0
      const targetHeight = Math.max(0.12, prob * 2.85 + shimmer)

      if (mesh) {
        mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, targetHeight, 1 - Math.exp(-9 * dt))
        mesh.position.y = -0.85 + mesh.scale.y * 0.5
      }

      if (mat) {
        working.copy(cyan).lerp(amber, tempRatio * 0.85)
        if (i >= 5 && tempRatio > 0.65) {
          working.lerp(coral, (tempRatio - 0.65) * 1.4)
        }
        working.lerp(muted, Math.max(0, 0.45 - prob * 2.5))
        mat.color.copy(working)
        mat.emissive.copy(working)
        mat.emissiveIntensity = (isDark ? 0.65 : 0.35) + prob * (isDark ? 0.95 : 0.45)
      }
    }
  })

  return (
    <group position={[0, 0.15, 0]}>
      {CANDIDATES.map((candidate, idx) => {
        const norm = idx / (CANDIDATES.length - 1) - 0.5
        const x = norm * 5.2
        const z = Math.abs(norm) * 0.75
        const prob = probabilities[idx]
        const pct = Math.round(prob * 100)
        const showLabel = idx < 4 || prob >= 0.05 || idx === CANDIDATES.length - 1

        return (
          <group key={candidate.word} position={[x, 0, z]}>
            <mesh
              ref={(el) => {
                pillarRefs.current[idx] = el
              }}
              position={[0, -0.35, 0]}
            >
              <cylinderGeometry args={[0.21, 0.24, 1, 8]} />
              <meshStandardMaterial
                ref={(el) => {
                  pillarMatRefs.current[idx] = el
                }}
                color={isDark ? '#22D3EE' : '#0EA5E9'}
                emissive={isDark ? '#22D3EE' : '#0EA5E9'}
                emissiveIntensity={0.6}
                roughness={0.2}
                metalness={0.25}
              />
            </mesh>

            {/* Subtle Base Pedestal Ring */}
            <mesh position={[0, -0.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.25, 0.31, 24]} />
              <meshBasicMaterial
                color={isDark ? '#38BDF8' : '#0284C7'}
                transparent
                opacity={0.35}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Minimal Token + % Label */}
            {showLabel && (
              <Html
                portal={htmlPortalRef}
                position={[0, -1.25, 0]}
                center
                zIndexRange={[10, 0]}
              >
                <div className="pointer-events-none select-none flex flex-col items-center">
                  <span className="font-mono-metric text-[10.5px] font-semibold text-[var(--text-primary)]">
                    {candidate.word}
                  </span>
                  <span className="font-mono-metric text-[9.5px] text-[var(--text-muted)]">
                    {pct}%
                  </span>
                </div>
              </Html>
            )}
          </group>
        )
      })}

      {/* 3 Clickable Hotspots */}
      {hotspots.map((hotspot) => (
        <HotspotPill
          key={hotspot.id}
          hotspot={hotspot}
          htmlPortalRef={htmlPortalRef}
          isSelected={selectedHotspot === hotspot.id}
          onSelect={(id) => setSelectedHotspot(selectedHotspot === id ? null : id)}
        />
      ))}
    </group>
  )
}
