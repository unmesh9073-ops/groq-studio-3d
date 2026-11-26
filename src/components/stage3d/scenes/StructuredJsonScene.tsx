import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getHotspotsForConcept } from '@/data/concepts'
import { HotspotPill } from '@/components/stage3d/HotspotPill'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { validateJsonSchema } from '@/utils/jsonSchema'

interface StructuredJsonSceneProps {
  htmlPortalRef: RefObject<HTMLElement>
}

const RAW_COUNT = 18
const SLOT_LAYOUT = [
  { y: 0.65, color: '#22D3EE' },
  { y: 0.0, color: '#10B981' },
  { y: -0.65, color: '#F59E0B' },
]

export function StructuredJsonScene({ htmlPortalRef }: StructuredJsonSceneProps) {
  const theme = usePlaygroundStore((state) => state.theme)
  const jsonMode = usePlaygroundStore((state) => state.jsonMode)
  const jsonSchemaText = usePlaygroundStore((state) => state.jsonSchemaText)
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
  const hotspots = getHotspotsForConcept('structured-json')
  const schemaSlots = useMemo(() => {
    const { slots } = validateJsonSchema(jsonSchemaText, false)
    return slots.map((slot, idx) => ({
      label: `"${slot.key}": ${slot.type}`,
      y: SLOT_LAYOUT[idx]?.y ?? 0,
      color: SLOT_LAYOUT[idx]?.color ?? '#22D3EE',
    }))
  }, [jsonSchemaText])

  const cageGroupRef = useRef<THREE.Group>(null)
  const cageMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const rawInstancedRef = useRef<THREE.InstancedMesh>(null)
  const outBlockRefs = useRef<(THREE.Mesh | null)[]>([])

  const scratchRef = useRef({
    dummy: new THREE.Object3D(),
    beamFlash: 0,
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const motionScale = prefersReducedMotion ? 0.15 : 1
    const scratch = scratchRef.current
    const { dummy } = scratch

    const execStatus = usePlaygroundStore.getState().executionStatus
    if (execStatus === 'streaming') {
      scratch.beamFlash = Math.min(1, scratch.beamFlash + dt * 3.5)
    } else {
      scratch.beamFlash = Math.max(0, scratch.beamFlash - dt * 1.6)
    }

    if (cageGroupRef.current) {
      const targetRotY = jsonMode === 'json_schema' ? 0 : Math.sin(t * 0.5) * 0.16 * motionScale
      cageGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        cageGroupRef.current.rotation.y,
        targetRotY,
        1 - Math.exp(-5 * dt)
      )
    }

    if (cageMatRef.current) {
      const color =
        jsonMode === 'json_schema'
          ? isDark
            ? '#10B981'
            : '#059669'
          : jsonMode === 'json_object'
            ? isDark
              ? '#22D3EE'
              : '#0284C7'
            : isDark
              ? '#64748B'
              : '#94A3B8'
      cageMatRef.current.color.set(color)
      const baseOpacity =
        jsonMode === 'json_schema' ? 0.78 : jsonMode === 'json_object' ? 0.52 : 0.25
      cageMatRef.current.opacity = Math.min(1, baseOpacity + scratch.beamFlash * 0.22)
    }

    const rawMesh = rawInstancedRef.current
    if (rawMesh) {
      const baseSpeed = execStatus === 'streaming' ? 0.72 : 0.42
      const speed = prefersReducedMotion ? 0.12 : baseSpeed
      for (let i = 0; i < RAW_COUNT; i++) {
        const p = (t * speed + i / RAW_COUNT) % 1
        const x = -3.2 + p * 2.55
        const scatter = jsonMode === 'off' ? 0.55 : jsonMode === 'json_object' ? 0.34 : 0.18
        const y = Math.sin(t * 2 + i * 1.3) * scatter * (1 - p * 0.55)
        const z = Math.cos(t * 1.8 + i * 0.9) * scatter * (1 - p * 0.55)
        dummy.position.set(x, y, z)
        dummy.rotation.set(t + i, t * 0.8, 0)
        dummy.scale.setScalar(0.75 + (1 - p) * 0.35 + scratch.beamFlash * 0.2)
        dummy.updateMatrix()
        rawMesh.setMatrixAt(i, dummy.matrix)
      }
      rawMesh.instanceMatrix.needsUpdate = true
    }

    outBlockRefs.current.forEach((mesh, idx) => {
      if (!mesh) return
      const slotY = schemaSlots[idx]?.y ?? 0
      const targetY =
        jsonMode === 'json_schema'
          ? slotY
          : jsonMode === 'json_object'
            ? slotY * 0.85 + Math.sin(t * 1.8 + idx) * 0.12 * motionScale
            : slotY * 0.7 + Math.sin(t * 2.4 + idx * 1.7) * 0.32 * motionScale
      const targetRotZ =
        jsonMode === 'json_schema' ? 0 : Math.sin(t * 1.5 + idx) * 0.22 * motionScale
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 1 - Math.exp(-7 * dt))
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, targetRotZ, 1 - Math.exp(-7 * dt))
    })
  })

  return (
    <group position={[0, 0.15, 0]}>
      <instancedMesh ref={rawInstancedRef} args={[undefined, undefined, RAW_COUNT]}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial
          color={isDark ? '#38BDF8' : '#0284C7'}
          emissive={isDark ? '#38BDF8' : '#0284C7'}
          emissiveIntensity={isDark ? 1.15 : 0.55}
        />
      </instancedMesh>

      <group
        ref={cageGroupRef}
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'json-lattice' ? null : 'json-lattice')
        }}
      >
        <mesh>
          <boxGeometry args={[1.9, 2.05, 1.35]} />
          <meshBasicMaterial
            ref={cageMatRef}
            color="#10B981"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>

        {schemaSlots.map((slot, idx) => (
          <group key={`${slot.label}-${idx}`} position={[0, slot.y, 0]}>
            <mesh>
              <boxGeometry args={[1.65, 0.42, 1.05]} />
              <meshPhysicalMaterial
                color={slot.color}
                emissive={slot.color}
                emissiveIntensity={
                  jsonMode === 'json_schema'
                    ? isDark
                      ? 0.55
                      : 0.28
                    : jsonMode === 'json_object'
                      ? 0.2
                      : 0.06
                }
                roughness={0.15}
                transparent
                opacity={jsonMode === 'json_schema' ? 0.38 : 0.16}
              />
            </mesh>
            <Html portal={htmlPortalRef} position={[0, 0, 0.6]} center zIndexRange={[10, 0]}>
              <span
                data-testid={`json-slot-label-${idx}`}
                className="pointer-events-none select-none font-mono-metric rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-1.5 py-0.5 text-[9.5px] font-medium text-[var(--text-primary)] whitespace-nowrap"
              >
                {slot.label}
              </span>
            </Html>
          </group>
        ))}
      </group>

      <group
        position={[2.75, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'json-output' ? null : 'json-output')
        }}
      >
        {schemaSlots.map((slot, idx) => (
          <mesh
            key={`${slot.label}-out-${idx}`}
            ref={(el) => {
              outBlockRefs.current[idx] = el
            }}
            position={[0, slot.y, 0]}
          >
            <boxGeometry args={[1.15, 0.36, 0.48]} />
            <meshPhysicalMaterial
              color={slot.color}
              emissive={slot.color}
              emissiveIntensity={jsonMode === 'off' ? 0.12 : isDark ? 0.5 : 0.24}
              roughness={0.14}
              clearcoat={1}
              transparent
              opacity={jsonMode === 'off' ? 0.55 : 0.9}
            />
          </mesh>
        ))}
      </group>

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
