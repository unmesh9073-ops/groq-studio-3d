import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getHotspotsForConcept } from '@/data/concepts'
import { HotspotPill } from '@/components/stage3d/HotspotPill'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

interface PromptRolesSceneProps {
  htmlPortalRef: RefObject<HTMLElement>
}

const ROLE_PARTICLES = 24

export function PromptRolesScene({ htmlPortalRef }: PromptRolesSceneProps) {
  const theme = usePlaygroundStore((state) => state.theme)
  const systemPrompt = usePlaygroundStore((state) => state.systemPrompt)
  const assistantPrefill = usePlaygroundStore((state) => state.assistantPrefill)
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
  const hasSystem = systemPrompt.trim().length > 0
  const hasPrefill = assistantPrefill.trim().length > 0
  const hotspots = getHotspotsForConcept('prompt-roles')

  const systemLensRef = useRef<THREE.Group>(null)
  const systemMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const systemRingMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const userPrismRef = useRef<THREE.Mesh>(null)
  const prefillGroupRef = useRef<THREE.Group>(null)
  const prefillMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const instancedRef = useRef<THREE.InstancedMesh>(null)

  const { beamCurve, beamTubeGeo } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.65, 0.2, 0),
      new THREE.Vector3(-0.9, 0.72, 0.12),
      new THREE.Vector3(0, 1.15, 0),
      new THREE.Vector3(1.15, 0.55, -0.1),
      new THREE.Vector3(2.5, 0.2, 0),
    ])
    const tubeGeo = new THREE.TubeGeometry(curve, 56, 0.015, 8, false)
    return { beamCurve: curve, beamTubeGeo: tubeGeo }
  }, [])

  useEffect(() => {
    return () => beamTubeGeo.dispose()
  }, [beamTubeGeo])

  const scratchRef = useRef({
    dummy: new THREE.Object3D(),
    vec: new THREE.Vector3(),
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const motionScale = prefersReducedMotion ? 0.15 : 1
    const { dummy, vec } = scratchRef.current

    if (systemLensRef.current) {
      systemLensRef.current.rotation.y += dt * 0.3 * motionScale
      systemLensRef.current.position.y = 1.35 + Math.sin(t * 1.1) * 0.04 * motionScale
    }
    if (systemMatRef.current) {
      systemMatRef.current.emissiveIntensity = hasSystem
        ? isDark
          ? 0.65
          : 0.35
        : 0.08
      systemMatRef.current.opacity = hasSystem ? (isDark ? 0.65 : 0.78) : 0.3
    }
    if (systemRingMatRef.current) {
      systemRingMatRef.current.emissiveIntensity = hasSystem ? (isDark ? 0.95 : 0.45) : 0.12
    }

    if (userPrismRef.current) {
      userPrismRef.current.rotation.y += dt * 0.65 * motionScale
      userPrismRef.current.rotation.x = Math.sin(t * 0.8) * 0.14 * motionScale
    }

    if (prefillGroupRef.current) {
      const targetScale = hasPrefill ? 1 : 0.78
      const targetX = hasPrefill ? 2.55 : 2.95
      prefillGroupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(prefillGroupRef.current.scale.x, targetScale, 1 - Math.exp(-6 * dt))
      )
      prefillGroupRef.current.position.x = THREE.MathUtils.lerp(
        prefillGroupRef.current.position.x,
        targetX,
        1 - Math.exp(-6 * dt)
      )
    }
    if (prefillMatRef.current) {
      prefillMatRef.current.emissiveIntensity = hasPrefill ? (isDark ? 1.0 : 0.5) : 0.1
      prefillMatRef.current.opacity = hasPrefill ? 0.92 : 0.4
    }

    const mesh = instancedRef.current
    if (mesh) {
      const speed = prefersReducedMotion ? 0.14 : 0.46
      for (let i = 0; i < ROLE_PARTICLES; i++) {
        const p = (t * speed + i / ROLE_PARTICLES) % 1
        beamCurve.getPointAt(p, vec)
        dummy.position.copy(vec)
        dummy.rotation.set(t * 1.4 + i, t * 0.9, 0)
        dummy.scale.setScalar(0.65 + Math.sin(p * Math.PI) * 0.4)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group position={[0, 0.05, 0]}>
      {/* Trajectory Conduit */}
      <mesh geometry={beamTubeGeo}>
        <meshBasicMaterial
          color={isDark ? '#38BDF8' : '#0284C7'}
          transparent
          opacity={isDark ? 0.3 : 0.36}
        />
      </mesh>

      {/* 1. System Prompt Sapphire Lens (Top) */}
      <group
        ref={systemLensRef}
        position={[0, 1.35, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'roles-system' ? null : 'roles-system')
        }}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.38, 1.38, 0.1, 48]} />
          <meshPhysicalMaterial
            ref={systemMatRef}
            color={isDark ? '#38BDF8' : '#0EA5E9'}
            emissive={isDark ? '#0284C7' : '#0284C7'}
            emissiveIntensity={0.5}
            roughness={0.12}
            metalness={0.15}
            clearcoat={1}
            transparent
            opacity={0.65}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.032, 16, 72]} />
          <meshStandardMaterial
            ref={systemRingMatRef}
            color={isDark ? '#7DD3FC' : '#0284C7'}
            emissive={isDark ? '#38BDF8' : '#0284C7'}
            emissiveIntensity={0.8}
            metalness={0.6}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 2. User Prompt Prism (Left) */}
      <group
        position={[-2.65, 0.2, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'roles-user' ? null : 'roles-user')
        }}
      >
        <mesh ref={userPrismRef}>
          <octahedronGeometry args={[0.68, 0]} />
          <meshPhysicalMaterial
            color={isDark ? '#67E8F9' : '#0284C7'}
            emissive={isDark ? '#0EA5E9' : '#0284C7'}
            emissiveIntensity={isDark ? 0.35 : 0.2}
            roughness={0.15}
            clearcoat={1}
            transparent
            opacity={0.78}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.2, 0.2, 0]}>
          <torusGeometry args={[0.98, 0.02, 12, 56]} />
          <meshStandardMaterial
            color={isDark ? '#22D3EE' : '#0891B2'}
            emissive={isDark ? '#22D3EE' : '#0891B2'}
            emissiveIntensity={isDark ? 0.65 : 0.3}
          />
        </mesh>
      </group>

      {/* 3. Assistant Prefill Launch Rail (Right) */}
      <group
        ref={prefillGroupRef}
        position={[2.55, 0.2, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'roles-prefill' ? null : 'roles-prefill')
        }}
      >
        {/* Twin Launch Rails */}
        <mesh position={[0, -0.22, -0.28]}>
          <boxGeometry args={[1.65, 0.06, 0.08]} />
          <meshStandardMaterial
            color={isDark ? '#94A3B8' : '#64748B'}
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, -0.22, 0.28]}>
          <boxGeometry args={[1.65, 0.06, 0.08]} />
          <meshStandardMaterial
            color={isDark ? '#94A3B8' : '#64748B'}
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>

        {/* Locked Starter Token Blocks */}
        {[-0.45, 0, 0.45].map((offset, idx) => (
          <mesh key={idx} position={[offset, 0.05, 0]}>
            <boxGeometry args={[0.32, 0.36, 0.36]} />
            <meshStandardMaterial
              ref={idx === 1 ? prefillMatRef : undefined}
              color={hasPrefill ? (isDark ? '#F59E0B' : '#EA580C') : isDark ? '#334155' : '#CBD5E1'}
              emissive={hasPrefill ? (isDark ? '#F59E0B' : '#EA580C') : '#000000'}
              emissiveIntensity={hasPrefill ? (isDark ? 0.85 : 0.45) : 0}
              transparent
              opacity={hasPrefill ? 0.92 : 0.55}
              roughness={0.2}
              metalness={0.25}
            />
          </mesh>
        ))}
      </group>

      {/* Token Flow Particles */}
      <instancedMesh ref={instancedRef} args={[undefined, undefined, ROLE_PARTICLES]}>
        <octahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial
          color={isDark ? '#38BDF8' : '#0284C7'}
          emissive={isDark ? '#38BDF8' : '#0284C7'}
          emissiveIntensity={isDark ? 1.4 : 0.7}
        />
      </instancedMesh>

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
