import { useEffect, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getHotspotsForConcept } from '@/data/concepts'
import { HotspotPill } from '@/components/stage3d/HotspotPill'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

interface TokenLimitsSceneProps {
  htmlPortalRef: RefObject<HTMLElement>
}

const RUNWAY_TOKENS = 28

export function TokenLimitsScene({ htmlPortalRef }: TokenLimitsSceneProps) {
  const theme = usePlaygroundStore((state) => state.theme)
  const maxCompletionTokens = usePlaygroundStore((state) => state.maxCompletionTokens)
  const stopSequences = usePlaygroundStore((state) => state.stopSequences)
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
  const hotspots = getHotspotsForConcept('tokens-limits')
  const hasStopSequence = stopSequences.length > 0

  const maxWallRef = useRef<THREE.Group>(null)
  const maxWallMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const stopGateRef = useRef<THREE.Group>(null)
  const stopGateMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const instancedCubesRef = useRef<THREE.InstancedMesh>(null)

  const scratchRef = useRef({
    dummy: new THREE.Object3D(),
    wallFlash: 0,
    gateFlash: 0,
    prevStatus: 'idle' as string,
  })

  // Map 16..4096 smoothly onto runway x = -1.0 .. +3.0
  const maxWallTargetX = -1.0 + ((maxCompletionTokens - 16) / (4096 - 16)) * 4.0
  const stopGateX = Math.min(maxWallTargetX - 0.55, 0.85)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const motionScale = prefersReducedMotion ? 0.15 : 1
    const scratch = scratchRef.current

    const live = usePlaygroundStore.getState()
    const finishReason = live.telemetry.finishReason
    if (scratch.prevStatus !== 'completed' && live.executionStatus === 'completed') {
      if (finishReason === 'length') scratch.wallFlash = 1.0
      if (finishReason === 'stop_sequence') scratch.gateFlash = 1.0
    }
    scratch.prevStatus = live.executionStatus
    scratch.wallFlash = Math.max(0, scratch.wallFlash - dt * 0.65)
    scratch.gateFlash = Math.max(0, scratch.gateFlash - dt * 0.65)

    if (maxWallRef.current) {
      maxWallRef.current.position.x = THREE.MathUtils.lerp(
        maxWallRef.current.position.x,
        maxWallTargetX,
        1 - Math.exp(-8 * dt)
      )
    }
    if (maxWallMatRef.current) {
      maxWallMatRef.current.emissive.set(scratch.wallFlash > 0.05 ? '#F59E0B' : '#0EA5E9')
      maxWallMatRef.current.emissiveIntensity =
        (isDark ? 0.45 : 0.25) + scratch.wallFlash * 1.15
    }

    if (stopGateRef.current) {
      stopGateRef.current.position.x = THREE.MathUtils.lerp(
        stopGateRef.current.position.x,
        stopGateX,
        1 - Math.exp(-8 * dt)
      )
      stopGateRef.current.rotation.z += dt * 0.85 * motionScale
    }
    if (stopGateMatRef.current) {
      stopGateMatRef.current.emissiveIntensity =
        (hasStopSequence ? (isDark ? 1.1 : 0.6) : 0.1) + scratch.gateFlash * 1.2
    }

    const mesh = instancedCubesRef.current
    if (mesh) {
      const activeBoundary = hasStopSequence ? stopGateX - 0.15 : maxWallTargetX - 0.15
      const startX = -3.4
      const span = Math.max(0.6, activeBoundary - startX)
      const speed = (live.executionStatus === 'streaming' ? 0.68 : 0.35) * (prefersReducedMotion ? 0.2 : 1)

      for (let i = 0; i < RUNWAY_TOKENS; i++) {
        const p = (t * speed + i / RUNWAY_TOKENS) % 1
        const x = startX + p * span
        const y = Math.sin(p * Math.PI * 2 + i) * 0.09
        const z = ((i % 3) - 1) * 0.22
        scratch.dummy.position.set(x, y, z)
        scratch.dummy.rotation.set(t * 0.9 + i, t * 0.7, 0)
        const edgeFade = Math.min(1, p * 5) * Math.min(1, (1 - p) * 6)
        scratch.dummy.scale.setScalar(0.65 + edgeFade * 0.45)
        scratch.dummy.updateMatrix()
        mesh.setMatrixAt(i, scratch.dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group position={[0, 0.15, 0]}>
      {/* Runway Track Base */}
      <mesh position={[0, -0.52, 0]}>
        <boxGeometry args={[7.2, 0.06, 1.35]} />
        <meshStandardMaterial
          color={isDark ? '#1E293B' : '#CBD5E1'}
          metalness={0.5}
          roughness={0.35}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Instanced Token Cubes */}
      <instancedMesh ref={instancedCubesRef} args={[undefined, undefined, RUNWAY_TOKENS]}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshStandardMaterial
          color={isDark ? '#22D3EE' : '#0EA5E9'}
          emissive={isDark ? '#22D3EE' : '#0284C7'}
          emissiveIntensity={isDark ? 1.15 : 0.55}
          roughness={0.2}
        />
      </instancedMesh>

      {/* Stop Sequence Laser Gate */}
      <group
        ref={stopGateRef}
        position={[0.85, 0.15, 0]}
        visible={hasStopSequence}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'limits-stop-gate' ? null : 'limits-stop-gate')
        }}
      >
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.85, 0.038, 16, 64]} />
          <meshStandardMaterial
            ref={stopGateMatRef}
            color={isDark ? '#FB7185' : '#E11D48'}
            emissive={isDark ? '#F43F5E' : '#E11D48'}
            emissiveIntensity={1.0}
          />
        </mesh>
        {hasStopSequence && (
          <Html portal={htmlPortalRef} position={[0, 1.05, 0]} center zIndexRange={[12, 0]}>
            <div className="pointer-events-none spatial-pill select-none rounded-full px-2.5 py-0.5 font-mono-metric text-[10px] font-semibold text-[var(--accent-amber)] whitespace-nowrap">
              Stop: &quot;{stopSequences[0].replace(/\n/g, '↵')}&quot;
            </div>
          </Html>
        )}
      </group>

      {/* Max Completion Tokens Glass Wall */}
      <group
        ref={maxWallRef}
        position={[maxWallTargetX, 0.35, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'limits-max-wall' ? null : 'limits-max-wall')
        }}
      >
        <mesh>
          <boxGeometry args={[0.08, 2.05, 1.55]} />
          <meshPhysicalMaterial
            ref={maxWallMatRef}
            color={isDark ? '#10B981' : '#059669'}
            emissive="#0EA5E9"
            emissiveIntensity={0.45}
            roughness={0.12}
            clearcoat={1}
            transparent
            opacity={0.45}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.1, 2.08, 1.58]} />
          <meshBasicMaterial color={isDark ? '#34D399' : '#059669'} wireframe transparent opacity={0.5} />
        </mesh>
        <Html portal={htmlPortalRef} position={[0, 1.25, 0]} center zIndexRange={[12, 0]}>
          <div className="pointer-events-none spatial-pill select-none rounded-full px-2.5 py-0.5 font-mono-metric text-[10px] font-semibold text-[var(--accent-emerald)] whitespace-nowrap">
            Max: {maxCompletionTokens}
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
