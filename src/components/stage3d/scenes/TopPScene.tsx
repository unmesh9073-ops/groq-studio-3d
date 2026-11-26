import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getHotspotsForConcept } from '@/data/concepts'
import { HotspotPill } from '@/components/stage3d/HotspotPill'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

interface TopPSceneProps {
  htmlPortalRef: RefObject<HTMLElement>
}

const TOPP_TOKENS = [
  { word: 'fast', prob: 0.42 },
  { word: 'instant', prob: 0.23 },
  { word: 'rapid', prob: 0.14 },
  { word: 'swift', prob: 0.08 },
  { word: 'quick', prob: 0.06 },
  { word: 'electric', prob: 0.04 },
  { word: 'cosmic', prob: 0.02 },
  { word: 'banana', prob: 0.01 },
]

export function getIncludedTokenCount(topP: number): number {
  let cumulative = 0
  let count = 0
  for (const item of TOPP_TOKENS) {
    count += 1
    cumulative += item.prob
    if (cumulative >= topP - 0.0001) {
      break
    }
  }
  return Math.max(1, count)
}

export function TopPScene({ htmlPortalRef }: TopPSceneProps) {
  const theme = usePlaygroundStore((state) => state.theme)
  const topP = usePlaygroundStore((state) => state.topP)
  const selectedHotspot = usePlaygroundStore((state) => state.selectedHotspot)
  const setSelectedHotspot = usePlaygroundStore((state) => state.setSelectedHotspot)

  const isDark = theme === 'dark'
  const hotspots = getHotspotsForConcept('top-p')
  const includedCount = useMemo(() => getIncludedTokenCount(topP), [topP])
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

  const curtainRef = useRef<THREE.Group>(null)
  const pillarRefs = useRef<(THREE.Mesh | null)[]>([])
  const pillarMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  const scratchRef = useRef({
    includedColor: new THREE.Color('#10B981'),
    prunedColor: new THREE.Color('#475569'),
  })

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const lerpAlpha = prefersReducedMotion ? 1 : 1 - Math.exp(-8 * dt)
    const { includedColor, prunedColor } = scratchRef.current

    includedColor.set(isDark ? '#22D3EE' : '#0891B2')
    prunedColor.set(isDark ? '#334155' : '#CBD5E1')

    // Slide Nucleus Cutoff Glass Curtain cleanly across the 8 pillars
    const spacing = 0.72
    const startX = -((TOPP_TOKENS.length - 1) * spacing) / 2
    const curtainTargetX = startX + (includedCount - 0.5) * spacing

    if (curtainRef.current) {
      curtainRef.current.position.x = THREE.MathUtils.lerp(
        curtainRef.current.position.x,
        curtainTargetX,
        lerpAlpha
      )
    }

    for (let i = 0; i < TOPP_TOKENS.length; i++) {
      const isIncluded = i < includedCount
      const baseHeight = 0.35 + TOPP_TOKENS[i].prob * 5.2
      const targetHeight = isIncluded ? baseHeight : baseHeight * 0.42
      const mesh = pillarRefs.current[i]
      const mat = pillarMatRefs.current[i]

      if (mesh) {
        mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, targetHeight, lerpAlpha)
        mesh.position.y = -0.85 + mesh.scale.y * 0.5
      }

      if (mat) {
        mat.color.lerp(isIncluded ? includedColor : prunedColor, lerpAlpha)
        mat.emissive.copy(mat.color)
        mat.emissiveIntensity = isIncluded ? (isDark ? 0.9 : 0.42) : 0.04
        mat.opacity = isIncluded ? 0.92 : 0.42
      }
    }
  })

  const spacing = 0.72
  const startX = -((TOPP_TOKENS.length - 1) * spacing) / 2

  return (
    <group position={[0, 0.15, 0]}>
      {TOPP_TOKENS.map((item, idx) => {
        const x = startX + idx * spacing
        const isIncluded = idx < includedCount
        return (
          <group key={item.word} position={[x, 0, 0]}>
            <mesh
              ref={(el) => {
                pillarRefs.current[idx] = el
              }}
              position={[0, -0.2, 0]}
            >
              <boxGeometry args={[0.38, 1, 0.38]} />
              <meshStandardMaterial
                ref={(el) => {
                  pillarMatRefs.current[idx] = el
                }}
                color={isDark ? '#22D3EE' : '#0891B2'}
                emissive={isDark ? '#22D3EE' : '#0891B2'}
                emissiveIntensity={0.8}
                transparent
                opacity={0.9}
                roughness={0.22}
                metalness={0.2}
              />
            </mesh>

            <Html
              portal={htmlPortalRef}
              position={[0, -1.2, 0]}
              center
              zIndexRange={[10, 0]}
            >
              <div
                className={[
                  'pointer-events-none select-none flex flex-col items-center transition-opacity duration-200',
                  isIncluded ? 'opacity-100' : 'opacity-45',
                ].join(' ')}
              >
                <span className="font-mono-metric text-[10.5px] font-semibold text-[var(--text-primary)]">
                  {item.word}
                </span>
                <span className="font-mono-metric text-[9.5px] text-[var(--text-muted)]">
                  {Math.round(item.prob * 100)}%
                </span>
              </div>
            </Html>
          </group>
        )
      })}

      {/* Nucleus Cutoff Glass Curtain */}
      <group ref={curtainRef} position={[0, 0.35, 0]}>
        <mesh>
          <boxGeometry args={[0.04, 2.75, 1.3]} />
          <meshPhysicalMaterial
            color={isDark ? '#38BDF8' : '#0284C7'}
            emissive={isDark ? '#22D3EE' : '#0EA5E9'}
            emissiveIntensity={isDark ? 0.55 : 0.28}
            roughness={0.1}
            clearcoat={1}
            transparent
            opacity={0.38}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.055, 2.78, 1.32]} />
          <meshBasicMaterial color={isDark ? '#22D3EE' : '#0284C7'} wireframe transparent opacity={0.45} />
        </mesh>

        <Html portal={htmlPortalRef} position={[0, 1.62, 0]} center zIndexRange={[12, 0]}>
          <div className="pointer-events-none spatial-pill select-none rounded-full px-2.5 py-0.5 font-mono-metric text-[10.5px] font-semibold text-[var(--accent-cyan)] whitespace-nowrap">
            Top-P: {Math.round(topP * 100)}%
          </div>
        </Html>
      </group>

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
