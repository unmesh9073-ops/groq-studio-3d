import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getHotspotsForConcept } from '@/data/concepts'
import { HotspotPill } from '@/components/stage3d/HotspotPill'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

interface BuiltInToolsSceneProps {
  htmlPortalRef: RefObject<HTMLElement>
}

const PULSE_COUNT = 16

export function BuiltInToolsScene({ htmlPortalRef }: BuiltInToolsSceneProps) {
  const theme = usePlaygroundStore((state) => state.theme)
  const builtInTools = usePlaygroundStore((state) => state.builtInTools)
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
  const hotspots = getHotspotsForConcept('built-in-tools')

  const coreGroupRef = useRef<THREE.Group>(null)
  const searchGroupRef = useRef<THREE.Group>(null)
  const searchMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const codeGroupRef = useRef<THREE.Group>(null)
  const codeMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const searchPulsesRef = useRef<THREE.InstancedMesh>(null)
  const codePulsesRef = useRef<THREE.InstancedMesh>(null)

  const { searchCurve, codeCurve, searchTubeGeo, codeTubeGeo } = useMemo(() => {
    const sCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.15, 0.1, 0),
      new THREE.Vector3(0.45, 0.95, 0.35),
      new THREE.Vector3(2.15, 1.05, 0),
    ])
    const cCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.15, 0.1, 0),
      new THREE.Vector3(0.45, -0.65, -0.35),
      new THREE.Vector3(2.15, -0.85, 0),
    ])
    return {
      searchCurve: sCurve,
      codeCurve: cCurve,
      searchTubeGeo: new THREE.TubeGeometry(sCurve, 44, 0.015, 8, false),
      codeTubeGeo: new THREE.TubeGeometry(cCurve, 44, 0.015, 8, false),
    }
  }, [])

  useEffect(() => {
    return () => {
      searchTubeGeo.dispose()
      codeTubeGeo.dispose()
    }
  }, [searchTubeGeo, codeTubeGeo])

  const scratchRef = useRef({
    dummy: new THREE.Object3D(),
    vec: new THREE.Vector3(),
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const motionScale = prefersReducedMotion ? 0.15 : 1
    const { dummy, vec } = scratchRef.current

    const liveState = usePlaygroundStore.getState()
    const isRunning =
      liveState.executionStatus === 'connecting' || liveState.executionStatus === 'streaming'
    const hasSearchTrace = liveState.executedTools.some((item) => item.type === 'browser_search')
    const hasCodeTrace = liveState.executedTools.some((item) => item.type === 'code_interpreter')
    const searchActive = builtInTools.browserSearch || hasSearchTrace
    const codeActive = builtInTools.codeInterpreter || hasCodeTrace

    if (coreGroupRef.current) {
      coreGroupRef.current.rotation.y += dt * (isRunning ? 1.15 : 0.45) * motionScale
    }

    if (searchGroupRef.current) {
      searchGroupRef.current.rotation.y +=
        dt * (searchActive ? (isRunning ? 1.6 : 0.9) : 0.2) * motionScale
      searchGroupRef.current.position.y = 1.05 + Math.sin(t * 1.4) * 0.06 * motionScale
    }
    if (searchMatRef.current) {
      searchMatRef.current.emissiveIntensity = searchActive
        ? isDark
          ? isRunning || hasSearchTrace
            ? 1.55
            : 1.15
          : 0.6
        : 0.12
      searchMatRef.current.opacity = searchActive ? 0.92 : 0.42
    }

    if (codeGroupRef.current) {
      codeGroupRef.current.rotation.x +=
        dt * (codeActive ? (isRunning ? 1.25 : 0.7) : 0.15) * motionScale
      codeGroupRef.current.rotation.y +=
        dt * (codeActive ? (isRunning ? 1.45 : 0.85) : 0.2) * motionScale
      codeGroupRef.current.position.y = -0.85 + Math.cos(t * 1.3) * 0.06 * motionScale
    }
    if (codeMatRef.current) {
      codeMatRef.current.emissiveIntensity = codeActive
        ? isDark
          ? isRunning || hasCodeTrace
            ? 1.55
            : 1.15
          : 0.6
        : 0.12
      codeMatRef.current.opacity = codeActive ? 0.92 : 0.42
    }

    // Bidirectional pulses along Search Conduit
    const sMesh = searchPulsesRef.current
    if (sMesh) {
      sMesh.visible = searchActive
      if (searchActive) {
        const speed = prefersReducedMotion ? 0.15 : isRunning ? 1.25 : 0.72
        for (let i = 0; i < PULSE_COUNT; i++) {
          const forward = i % 2 === 0
          const rawP = (t * speed + i / PULSE_COUNT) % 1
          const p = forward ? rawP : 1 - rawP
          searchCurve.getPointAt(p, vec)
          dummy.position.copy(vec)
          dummy.scale.setScalar((0.75 + Math.sin(p * Math.PI) * 0.4) * (isRunning ? 1.2 : 1))
          dummy.updateMatrix()
          sMesh.setMatrixAt(i, dummy.matrix)
        }
        sMesh.instanceMatrix.needsUpdate = true
      }
    }

    // Bidirectional pulses along Code Sandbox Conduit
    const cMesh = codePulsesRef.current
    if (cMesh) {
      cMesh.visible = codeActive
      if (codeActive) {
        const speed = prefersReducedMotion ? 0.15 : isRunning ? 1.2 : 0.68
        for (let i = 0; i < PULSE_COUNT; i++) {
          const forward = i % 2 === 0
          const rawP = (t * speed + i / PULSE_COUNT) % 1
          const p = forward ? rawP : 1 - rawP
          codeCurve.getPointAt(p, vec)
          dummy.position.copy(vec)
          dummy.scale.setScalar((0.75 + Math.sin(p * Math.PI) * 0.4) * (isRunning ? 1.2 : 1))
          dummy.updateMatrix()
          cMesh.setMatrixAt(i, dummy.matrix)
        }
        cMesh.instanceMatrix.needsUpdate = true
      }
    }
  })

  return (
    <group position={[0, 0.1, 0]}>
      {/* Conduits */}
      <mesh geometry={searchTubeGeo}>
        <meshBasicMaterial
          color={isDark ? '#38BDF8' : '#0284C7'}
          transparent
          opacity={builtInTools.browserSearch ? 0.55 : 0.18}
        />
      </mesh>
      <mesh geometry={codeTubeGeo}>
        <meshBasicMaterial
          color={isDark ? '#F59E0B' : '#EA580C'}
          transparent
          opacity={builtInTools.codeInterpreter ? 0.55 : 0.18}
        />
      </mesh>

      {/* Center Groq LPU Orchestrator Hub */}
      <group
        ref={coreGroupRef}
        position={[-1.15, 0.1, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'tools-loop' ? null : 'tools-loop')
        }}
      >
        <mesh>
          <octahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial
            color={isDark ? '#22D3EE' : '#0EA5E9'}
            emissive={isDark ? '#22D3EE' : '#0284C7'}
            emissiveIntensity={isDark ? 0.9 : 0.4}
            metalness={0.35}
            roughness={0.2}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0.2, 0]}>
          <torusGeometry args={[1.05, 0.03, 16, 64]} />
          <meshStandardMaterial
            color={isDark ? '#CBD5E1' : '#64748B'}
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 4, 0.4, 0]}>
          <torusGeometry args={[1.32, 0.025, 16, 72]} />
          <meshStandardMaterial
            color={isDark ? '#38BDF8' : '#0284C7'}
            emissive={isDark ? '#38BDF8' : '#0284C7'}
            emissiveIntensity={isDark ? 0.65 : 0.3}
          />
        </mesh>
      </group>

      {/* Satellite 1: Browser Search Node (Top-Right) */}
      <group
        ref={searchGroupRef}
        position={[2.15, 1.05, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'tools-search' ? null : 'tools-search')
        }}
      >
        <mesh>
          <icosahedronGeometry args={[0.52, 1]} />
          <meshStandardMaterial
            ref={searchMatRef}
            color={isDark ? '#38BDF8' : '#0284C7'}
            emissive={isDark ? '#38BDF8' : '#0284C7'}
            emissiveIntensity={0.8}
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.74, 0.022, 12, 48]} />
          <meshStandardMaterial
            color={isDark ? '#38BDF8' : '#0284C7'}
            emissive={isDark ? '#38BDF8' : '#0284C7'}
            emissiveIntensity={builtInTools.browserSearch ? 0.85 : 0.1}
          />
        </mesh>
      </group>

      {/* Satellite 2: Code Execution Sandbox (Bottom-Right) */}
      <group
        ref={codeGroupRef}
        position={[2.15, -0.85, 0]}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedHotspot(selectedHotspot === 'tools-code' ? null : 'tools-code')
        }}
      >
        <mesh>
          <boxGeometry args={[0.74, 0.74, 0.74]} />
          <meshStandardMaterial
            ref={codeMatRef}
            color={isDark ? '#F59E0B' : '#EA580C'}
            emissive={isDark ? '#F59E0B' : '#EA580C'}
            emissiveIntensity={0.8}
            transparent
            opacity={0.85}
            roughness={0.2}
            metalness={0.25}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.96, 0.96, 0.96]} />
          <meshBasicMaterial
            color={isDark ? '#FBBF24' : '#D97706'}
            wireframe
            transparent
            opacity={builtInTools.codeInterpreter ? 0.65 : 0.2}
          />
        </mesh>
      </group>

      {/* Bidirectional Light Pulses */}
      <instancedMesh ref={searchPulsesRef} args={[undefined, undefined, PULSE_COUNT]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshStandardMaterial
          color={isDark ? '#38BDF8' : '#0284C7'}
          emissive={isDark ? '#38BDF8' : '#0284C7'}
          emissiveIntensity={1.4}
        />
      </instancedMesh>
      <instancedMesh ref={codePulsesRef} args={[undefined, undefined, PULSE_COUNT]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial
          color={isDark ? '#F59E0B' : '#EA580C'}
          emissive={isDark ? '#F59E0B' : '#EA580C'}
          emissiveIntensity={1.4}
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
