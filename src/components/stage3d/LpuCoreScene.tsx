import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getConceptById, LPU_HOTSPOTS } from '@/data/concepts'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { HotspotId } from '@/types/playground'

interface LpuCoreSceneProps {
  htmlPortalRef: RefObject<HTMLElement>
}

const TOKEN_PARTICLE_COUNT = 36
const PRISM_OFFSETS = [-0.42, -0.21, 0, 0.21, 0.42]
const ENCODER_TICKS = Array.from({ length: 12 }, (_, idx) => (idx / 12) * Math.PI * 2)

export function LpuCoreScene({ htmlPortalRef }: LpuCoreSceneProps) {
  const theme = usePlaygroundStore((state) => state.theme)
  const activeConcept = usePlaygroundStore((state) => state.activeConcept)
  const selectedHotspot = usePlaygroundStore((state) => state.selectedHotspot)
  const temperature = usePlaygroundStore((state) => state.temperature)
  const topP = usePlaygroundStore((state) => state.topP)
  const maxCompletionTokens = usePlaygroundStore((state) => state.maxCompletionTokens)
  const streaming = usePlaygroundStore((state) => state.streaming)
  const setSelectedHotspot = usePlaygroundStore((state) => state.setSelectedHotspot)

  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotId | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.body.style.cursor = hoveredHotspot ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hoveredHotspot])

  const isDark = theme === 'dark'
  const isLpuConcept = activeConcept === 'lpu-pipeline'
  const conceptMeta = getConceptById(activeConcept)

  // Node refs for 60fps imperative updates (no React setState in useFrame)
  const inputGroupRef = useRef<THREE.Group>(null)
  const inputCrystalRef = useRef<THREE.Mesh>(null)
  const inputCrystalMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const inputShellRef = useRef<THREE.Mesh>(null)

  const lpuGroupRef = useRef<THREE.Group>(null)
  const outerRingRef = useRef<THREE.Group>(null)
  const midRingRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)
  const coreCrystalRef = useRef<THREE.Mesh>(null)
  const coreLatticeRef = useRef<THREE.Mesh>(null)
  const topPHaloRef = useRef<THREE.Mesh>(null)
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const innerRingMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const midRingMatRef = useRef<THREE.MeshStandardMaterial>(null)

  const outputGroupRef = useRef<THREE.Group>(null)
  const prismRefs = useRef<(THREE.Mesh | null)[]>([])
  const outputGateRingRef = useRef<THREE.Mesh>(null)
  const outputGateMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const instancedTokensRef = useRef<THREE.InstancedMesh>(null)
  const tokenMaterialRef = useRef<THREE.MeshStandardMaterial>(null)

  // Precomputed curves & immutable geometry/seeds
  const {
    inflowCurve,
    outflowCurve,
    inflowTubeGeo,
    outflowTubeGeo,
    particleSeeds,
  } = useMemo(() => {
    const inCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.5, 0, 0),
      new THREE.Vector3(-1.75, 0.22, 0.18),
      new THREE.Vector3(-1.0, -0.08, -0.1),
      new THREE.Vector3(-0.35, 0, 0),
    ])

    const outCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.35, 0, 0),
      new THREE.Vector3(1.05, 0.14, -0.14),
      new THREE.Vector3(1.8, -0.14, 0.16),
      new THREE.Vector3(2.5, 0, 0),
    ])

    const inTube = new THREE.TubeGeometry(inCurve, 48, 0.014, 8, false)
    const outTube = new THREE.TubeGeometry(outCurve, 48, 0.014, 8, false)

    const seeds = Array.from({ length: TOKEN_PARTICLE_COUNT }, (_, i) => ({
      offset: i / TOKEN_PARTICLE_COUNT,
      radialPhase: i * 1.6180339 * Math.PI * 2,
      laneBias: (i % 3) - 1,
    }))

    return {
      inflowCurve: inCurve,
      outflowCurve: outCurve,
      inflowTubeGeo: inTube,
      outflowTubeGeo: outTube,
      particleSeeds: seeds,
    }
  }, [])

  // Mutable Three.js scratch objects kept in ref for React Compiler purity
  const scratchRef = useRef({
    tokenDummy: new THREE.Object3D(),
    tokenVec: new THREE.Vector3(),
    cyanColor: new THREE.Color('#22D3EE'),
    amberColor: new THREE.Color('#F59E0B'),
    skyColor: new THREE.Color('#38BDF8'),
    conceptColor: new THREE.Color('#22D3EE'),
    blendedCoreColor: new THREE.Color('#22D3EE'),
    blendedParticleColor: new THREE.Color('#22D3EE'),
    lastPulseCount: 0,
    streamPulseIntensity: 0,
    gateFlashIntensity: 0,
    prevExecutionStatus: 'idle' as string,
  })

  useEffect(() => {
    return () => {
      inflowTubeGeo.dispose()
      outflowTubeGeo.dispose()
    }
  }, [inflowTubeGeo, outflowTubeGeo])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const motionScale = prefersReducedMotion ? 0.15 : 1
    const scratch = scratchRef.current
    const {
      tokenDummy,
      tokenVec,
      cyanColor,
      amberColor,
      skyColor,
      conceptColor,
      blendedCoreColor,
      blendedParticleColor,
    } = scratch

    // Read live Phase 2 execution telemetry imperatively for 60fps zero-re-render sync
    const liveState = usePlaygroundStore.getState()
    const execStatus = liveState.executionStatus
    const liveTps = liveState.telemetry.tokensPerSecond
    const liveFinishReason = liveState.telemetry.finishReason

    if (liveState.tokenPulseCount !== scratch.lastPulseCount) {
      scratch.lastPulseCount = liveState.tokenPulseCount
      scratch.streamPulseIntensity = 1.0
    } else {
      scratch.streamPulseIntensity = Math.max(0, scratch.streamPulseIntensity - dt * 4.2)
    }

    if (
      scratch.prevExecutionStatus !== 'completed' &&
      execStatus === 'completed' &&
      (liveFinishReason === 'length' || liveFinishReason === 'stop_sequence')
    ) {
      scratch.gateFlashIntensity = 1.0
    } else {
      scratch.gateFlashIntensity = Math.max(0, scratch.gateFlashIntensity - dt * 0.72)
    }
    scratch.prevExecutionStatus = execStatus

    const isConnecting = execStatus === 'connecting'
    const isLiveStreaming = execStatus === 'streaming'
    const liveTpsBoost = isLiveStreaming
      ? 1 + Math.min(2.4, (liveTps ?? 500) / 360)
      : isConnecting
        ? 1.35
        : 1

    const tempRatio = Math.min(1, Math.max(0, temperature / 2))
    const topPRatio = Math.min(1, Math.max(0.05, topP))
    const maxTokenScale = 0.45 + (Math.min(4096, Math.max(16, maxCompletionTokens)) / 4096) * 0.75

    // Target color shifts smoothly from cool cyan -> warm amber as temperature rises,
    // or tints subtly toward active concept color on secondary tabs.
    cyanColor.set(isDark ? '#22D3EE' : '#0EA5E9')
    amberColor.set(isDark ? '#F59E0B' : '#EA580C')
    skyColor.set(isDark ? '#38BDF8' : '#0284C7')
    conceptColor.set(conceptMeta.accentHex)

    blendedCoreColor.copy(cyanColor).lerp(amberColor, tempRatio * 0.92)
    if (!isLpuConcept) {
      blendedCoreColor.lerp(conceptColor, 0.55)
    }

    blendedParticleColor.copy(skyColor).lerp(amberColor, tempRatio * 0.72)
    if (isConnecting) {
      blendedParticleColor.lerp(amberColor, 0.65)
    } else if (!isLpuConcept) {
      blendedParticleColor.lerp(conceptColor, 0.45)
    }

    // 1. Input Emitter levitation, spin & connecting charge glow
    if (inputGroupRef.current) {
      inputGroupRef.current.position.y = Math.sin(t * 1.1) * 0.08 * motionScale
    }
    if (inputCrystalRef.current) {
      inputCrystalRef.current.rotation.y += dt * (isConnecting ? 2.2 : 0.65) * motionScale
      inputCrystalRef.current.rotation.x = Math.sin(t * 0.7) * 0.16 * motionScale
      const chargeScale = isConnecting ? 1 + Math.sin(t * 12) * 0.08 * motionScale : 1
      inputCrystalRef.current.scale.setScalar(chargeScale)
    }
    if (inputCrystalMatRef.current) {
      inputCrystalMatRef.current.emissive.set(
        isConnecting ? '#F59E0B' : isDark ? '#0EA5E9' : '#0284C7'
      )
      inputCrystalMatRef.current.emissiveIntensity = isConnecting
        ? 1.35 + Math.sin(t * 12) * 0.35
        : isDark
          ? 0.22
          : 0.12
    }
    if (inputShellRef.current) {
      inputShellRef.current.rotation.y -= dt * 0.35 * motionScale
      inputShellRef.current.rotation.z += dt * 0.2 * motionScale
    }

    // 2. Groq LPU Core kinetic behavior coupled to Temperature, Top-P, Active Concept & Live TPS
    const speedMultiplier = (0.55 + tempRatio * 1.9) * liveTpsBoost * motionScale
    const turbulence = tempRatio * 0.28 * motionScale

    if (lpuGroupRef.current) {
      lpuGroupRef.current.position.y = Math.sin(t * 0.9 + 0.8) * 0.05 * motionScale
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += dt * 0.22 * speedMultiplier
      const targetTiltX =
        activeConcept === 'structured-json'
          ? 0
          : activeConcept === 'built-in-tools'
            ? 0.55
            : 0.28 + Math.sin(t * 0.7) * turbulence * 0.5
      outerRingRef.current.rotation.x = THREE.MathUtils.lerp(
        outerRingRef.current.rotation.x,
        targetTiltX,
        1 - Math.exp(-5 * dt)
      )
    }

    if (midRingRef.current) {
      midRingRef.current.rotation.y += dt * 0.52 * speedMultiplier
      const targetTiltZ =
        activeConcept === 'structured-json'
          ? Math.PI / 2
          : -0.45 + Math.cos(t * 1.3) * turbulence * 0.8
      midRingRef.current.rotation.z = THREE.MathUtils.lerp(
        midRingRef.current.rotation.z,
        targetTiltZ,
        1 - Math.exp(-5 * dt)
      )
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.x -= dt * 0.85 * speedMultiplier
      innerRingRef.current.rotation.y += dt * 0.6 * speedMultiplier
    }

    if (coreCrystalRef.current) {
      coreCrystalRef.current.rotation.y += dt * (0.75 + tempRatio * 1.4) * motionScale
      coreCrystalRef.current.rotation.x += dt * (0.3 + tempRatio * 0.9) * motionScale
      const burstCharge = !streaming ? Math.pow(Math.max(0, Math.sin(t * 1.7)), 3) * 0.14 : 0
      const pulse = 1 + Math.sin(t * (2.2 + tempRatio * 3.5)) * 0.035 * motionScale + burstCharge
      coreCrystalRef.current.scale.setScalar(pulse)
    }

    if (coreLatticeRef.current) {
      coreLatticeRef.current.rotation.y -= dt * 0.42 * speedMultiplier
      coreLatticeRef.current.rotation.z += dt * 0.25 * speedMultiplier
    }

    if (topPHaloRef.current) {
      const targetRadiusScale = 0.65 + topPRatio * 0.48
      topPHaloRef.current.scale.x = THREE.MathUtils.lerp(
        topPHaloRef.current.scale.x,
        targetRadiusScale,
        1 - Math.exp(-6 * dt)
      )
      topPHaloRef.current.scale.y = THREE.MathUtils.lerp(
        topPHaloRef.current.scale.y,
        targetRadiusScale,
        1 - Math.exp(-6 * dt)
      )
    }

    // Update material tints reactively without React re-renders
    if (coreMatRef.current) {
      coreMatRef.current.color.copy(blendedCoreColor)
      coreMatRef.current.emissive.copy(blendedCoreColor)
      const pulseBoost = scratch.streamPulseIntensity * 0.45 + (isConnecting ? 0.35 : 0)
      coreMatRef.current.emissiveIntensity =
        (isDark ? 0.9 + tempRatio * 0.75 : 0.42 + tempRatio * 0.38) + pulseBoost
    }
    if (innerRingMatRef.current) {
      innerRingMatRef.current.color.copy(blendedCoreColor)
      innerRingMatRef.current.emissive.copy(blendedCoreColor)
    }
    if (midRingMatRef.current) {
      midRingMatRef.current.color.lerpColors(skyColor, blendedCoreColor, 0.5)
      midRingMatRef.current.emissive.copy(midRingMatRef.current.color)
    }
    if (tokenMaterialRef.current) {
      tokenMaterialRef.current.color.copy(blendedParticleColor)
      tokenMaterialRef.current.emissive.copy(blendedParticleColor)
      tokenMaterialRef.current.emissiveIntensity =
        (isDark ? 1.55 : 0.75) + scratch.streamPulseIntensity * 0.85
    }

    // 3. Output Prism Array wave, max-token height & amber limit/stop gate flash
    if (outputGroupRef.current) {
      outputGroupRef.current.position.y = Math.sin(t * 1.1 + 1.8) * 0.07 * motionScale
    }
    prismRefs.current.forEach((prism, idx) => {
      if (!prism) return
      const waveFreq = isLiveStreaming ? 7.2 : streaming ? 3.8 : 1.7
      const wave =
        1 +
        Math.sin(t * waveFreq - idx * 0.55) *
          (0.14 + scratch.streamPulseIntensity * 0.12) *
          motionScale
      const targetHeight = maxTokenScale * wave
      prism.scale.y = THREE.MathUtils.lerp(prism.scale.y, targetHeight, 1 - Math.exp(-7 * dt))
    })

    if (outputGateRingRef.current && outputGateMatRef.current) {
      const flash = scratch.gateFlashIntensity
      outputGateRingRef.current.visible = flash > 0.02
      const gateScale = 1 + (1 - flash) * 0.45
      outputGateRingRef.current.scale.setScalar(gateScale)
      outputGateMatRef.current.opacity = flash * 0.9
    }

    // 4. Token Packet Flow (InstancedMesh): Continuous Streaming vs Batched Burst
    const mesh = instancedTokensRef.current
    if (mesh) {
      const halfCount = TOKEN_PARTICLE_COUNT / 2
      const scatterScale = (0.04 + tempRatio * 0.22) * topPRatio

      for (let i = 0; i < TOKEN_PARTICLE_COUNT; i++) {
        const seed = particleSeeds[i]
        const isInflow = i < halfCount
        const localIdx = isInflow ? i : i - halfCount
        const curve = isInflow ? inflowCurve : outflowCurve

        let progress: number
        let scale: number

        if (streaming) {
          // Smooth, continuous high-speed photon river (accelerates during live streaming)
          const baseSpeed = isLiveStreaming ? 1.28 : isConnecting ? 0.95 : 0.62
          const speed = prefersReducedMotion ? 0.14 : baseSpeed
          const phaseOffset = localIdx / halfCount
          progress = (t * speed + phaseOffset) % 1
          scale =
            (0.72 + Math.sin(progress * Math.PI) * 0.45) *
            (1 + scratch.streamPulseIntensity * 0.28)
        } else {
          // Batched burst mode: tokens wait in queue and shoot in synchronized bursts
          const cycleSpeed = prefersReducedMotion ? 0.12 : 0.44
          const cycle = (t * cycleSpeed) % 1

          if (isInflow) {
            if (cycle < 0.52) {
              // Gather near emitter / queue line
              progress = 0.08 + (localIdx / halfCount) * 0.22
              scale = 0.65 + Math.sin(t * 5 + localIdx) * 0.15
            } else {
              // Surge into the LPU core together
              const surge = Math.min(1, (cycle - 0.52) / 0.24)
              progress = 0.15 + surge * 0.85
              scale = surge < 0.96 ? 1.05 : 0.1
            }
          } else {
            if (cycle < 0.62) {
              // Held inside LPU batch buffer waiting for completion
              progress = 0.02
              scale = 0.001
            } else {
              // Fire outward in one tight packet burst
              const burst = Math.min(1, (cycle - 0.62) / 0.34)
              const stagger = (localIdx / halfCount) * 0.18
              progress = Math.min(1, Math.max(0, burst * 1.18 - stagger))
              scale = progress > 0.02 && progress < 0.98 ? 1.15 : 0.001
            }
          }
        }

        curve.getPointAt(progress, tokenVec)

        // Add subtle temperature + top-P envelope jitter along the path
        if (!isInflow) {
          const arcEnvelope = Math.sin(progress * Math.PI)
          tokenVec.y += Math.sin(t * 4 + seed.radialPhase) * scatterScale * arcEnvelope
          tokenVec.z += Math.cos(t * 3.5 + seed.radialPhase) * scatterScale * arcEnvelope
        } else {
          tokenVec.z += seed.laneBias * 0.08 * Math.sin(progress * Math.PI)
        }

        tokenDummy.position.copy(tokenVec)
        tokenDummy.rotation.set(t * 1.4 + seed.radialPhase, t * 1.1, 0)
        tokenDummy.scale.setScalar(scale)
        tokenDummy.updateMatrix()
        mesh.setMatrixAt(i, tokenDummy.matrix)
      }

      mesh.instanceMatrix.needsUpdate = true
    }
  })

  const handleHotspotClick = (id: HotspotId) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    setSelectedHotspot(selectedHotspot === id ? null : id)
  }

  const gridLineColor = isDark ? '#1E293B' : '#CBD5E1'
  const gridRingColor = isDark ? '#0EA5E9' : '#0284C7'
  const glassNodeColor = isDark ? '#BAE6FD' : '#0284C7'
  const railColor = isDark ? '#38BDF8' : '#0284C7'

  return (
    <group position={[0, 0.1, 0]}>
      {/* Studio Depth Stage & Concentric Reference Rings */}
      <group position={[0, -1.78, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.48, 72]} />
          <meshBasicMaterial
            color={gridRingColor}
            transparent
            opacity={isDark ? 0.28 : 0.22}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.1, 3.13, 96]} />
          <meshBasicMaterial
            color={gridLineColor}
            transparent
            opacity={isDark ? 0.35 : 0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[4.75, 4.78, 96]} />
          <meshBasicMaterial
            color={gridLineColor}
            transparent
            opacity={isDark ? 0.22 : 0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        <gridHelper
          args={[14, 24, isDark ? '#162238' : '#CBD5E1', isDark ? '#0D1526' : '#E2E8F0']}
          position={[0, -0.02, 0]}
        />
      </group>

      {/* Holographic Fiber-Optic Conduit Rails */}
      <mesh geometry={inflowTubeGeo}>
        <meshBasicMaterial
          color={railColor}
          transparent
          opacity={isDark ? 0.34 : 0.38}
        />
      </mesh>
      <mesh geometry={outflowTubeGeo}>
        <meshBasicMaterial
          color={railColor}
          transparent
          opacity={isDark ? 0.34 : 0.38}
        />
      </mesh>

      {/* 1. INPUT PROMPT EMITTER (Left Node) */}
      <group
        ref={inputGroupRef}
        position={[-3.05, 0, 0]}
        onClick={handleHotspotClick('input-emitter')}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHoveredHotspot('input-emitter')
        }}
        onPointerOut={() => setHoveredHotspot(null)}
      >
        {/* Translucent outer crystal */}
        <mesh ref={inputCrystalRef}>
          <octahedronGeometry args={[0.72, 0]} />
          <meshPhysicalMaterial
            ref={inputCrystalMatRef}
            color={glassNodeColor}
            emissive={isDark ? '#0EA5E9' : '#0284C7'}
            emissiveIntensity={isDark ? 0.22 : 0.12}
            roughness={0.14}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            transparent
            opacity={isDark ? 0.58 : 0.72}
          />
        </mesh>

        {/* Precision geodesic shell */}
        <mesh ref={inputShellRef}>
          <icosahedronGeometry args={[0.92, 0]} />
          <meshBasicMaterial
            color={isDark ? '#38BDF8' : '#0284C7'}
            wireframe
            transparent
            opacity={selectedHotspot === 'input-emitter' ? 0.65 : 0.28}
          />
        </mesh>

        {/* Emitter Halo Ring */}
        <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
          <torusGeometry args={[1.08, 0.02, 12, 64]} />
          <meshStandardMaterial
            color={isDark ? '#38BDF8' : '#0284C7'}
            emissive={isDark ? '#0EA5E9' : '#0284C7'}
            emissiveIntensity={isDark ? 0.8 : 0.3}
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* 2. GROQ LPU DETERMINISTIC CORE (Center Processor) */}
      <group
        ref={lpuGroupRef}
        position={[0, 0, 0]}
        onClick={handleHotspotClick('lpu-core')}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHoveredHotspot('lpu-core')
        }}
        onPointerOut={() => setHoveredHotspot(null)}
      >
        {/* Outer Precision Gimbal + Machined Encoder Ticks */}
        <group ref={outerRingRef}>
          <mesh>
            <torusGeometry args={[1.5, 0.036, 18, 96]} />
            <meshStandardMaterial
              color={isDark ? '#CBD5E1' : '#94A3B8'}
              emissive={isDark ? '#1E293B' : '#475569'}
              emissiveIntensity={isDark ? 0.18 : 0.14}
              metalness={0.62}
              roughness={0.24}
            />
          </mesh>
          {ENCODER_TICKS.map((angle, idx) => (
            <mesh
              key={idx}
              position={[Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 0]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[0.1, 0.03, 0.06]} />
              <meshStandardMaterial
                color={isDark ? '#22D3EE' : '#0EA5E9'}
                emissive={isDark ? '#22D3EE' : '#0284C7'}
                emissiveIntensity={isDark ? 0.85 : 0.45}
              />
            </mesh>
          ))}
        </group>

        {/* Middle Execution Ring */}
        <mesh ref={midRingRef}>
          <torusGeometry args={[1.16, 0.03, 16, 84]} />
          <meshStandardMaterial
            ref={midRingMatRef}
            color="#38BDF8"
            emissive="#38BDF8"
            emissiveIntensity={isDark ? 0.68 : 0.38}
            metalness={0.55}
            roughness={0.24}
          />
        </mesh>

        {/* Inner SRAM Adaptive Ring */}
        <mesh ref={innerRingRef}>
          <torusGeometry args={[0.84, 0.028, 16, 72]} />
          <meshStandardMaterial
            ref={innerRingMatRef}
            color="#22D3EE"
            emissive="#22D3EE"
            emissiveIntensity={isDark ? 0.95 : 0.5}
            metalness={0.48}
            roughness={0.2}
          />
        </mesh>

        {/* Top-P Nucleus Envelope Halo */}
        <mesh ref={topPHaloRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.28, 0.012, 12, 72]} />
          <meshBasicMaterial
            color={isDark ? '#22D3EE' : '#0891B2'}
            transparent
            opacity={isDark ? 0.25 : 0.28}
          />
        </mesh>

        {/* Geodesic SRAM Lattice Shell */}
        <mesh ref={coreLatticeRef}>
          <icosahedronGeometry args={[0.66, 1]} />
          <meshBasicMaterial
            color={isDark ? '#94A3B8' : '#475569'}
            wireframe
            transparent
            opacity={isDark ? 0.26 : 0.3}
          />
        </mesh>

        {/* Central Glowing LPU Core */}
        <mesh ref={coreCrystalRef}>
          <octahedronGeometry args={[0.46, 0]} />
          <meshStandardMaterial
            ref={coreMatRef}
            color="#22D3EE"
            emissive="#22D3EE"
            emissiveIntensity={isDark ? 1.1 : 0.45}
            metalness={0.35}
            roughness={0.15}
          />
        </mesh>
      </group>

      {/* 3. OUTPUT TOKEN STREAM (Right Prism Array) */}
      <group
        ref={outputGroupRef}
        position={[3.05, 0, 0]}
        onClick={handleHotspotClick('output-stream')}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHoveredHotspot('output-stream')
        }}
        onPointerOut={() => setHoveredHotspot(null)}
      >
        {PRISM_OFFSETS.map((offset, idx) => {
          const zArc = Math.abs(offset) * 0.45
          return (
            <mesh
              key={idx}
              ref={(el) => {
                prismRefs.current[idx] = el
              }}
              position={[offset, 0, zArc]}
            >
              <cylinderGeometry args={[0.09, 0.09, 1.15, 6]} />
              <meshPhysicalMaterial
                color={isDark ? '#67E8F9' : '#38BDF8'}
                emissive={isDark ? '#0E7490' : '#0284C7'}
                emissiveIntensity={isDark ? 0.55 : 0.32}
                roughness={0.14}
                metalness={0.1}
                clearcoat={1}
                transparent
                opacity={isDark ? 0.86 : 0.88}
              />
            </mesh>
          )
        })}

        {/* Output Array Base Ring */}
        <mesh position={[0, -0.78, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.68, 0.018, 12, 48]} />
          <meshStandardMaterial
            color={isDark ? '#22D3EE' : '#0891B2'}
            emissive={isDark ? '#22D3EE' : '#0891B2'}
            emissiveIntensity={isDark ? 0.7 : 0.25}
          />
        </mesh>

        {/* Amber Limit / Stop-Sequence Gate Flash Ring */}
        <mesh ref={outputGateRingRef} visible={false} position={[0, 0, 0.1]}>
          <torusGeometry args={[0.92, 0.04, 16, 64]} />
          <meshBasicMaterial
            ref={outputGateMatRef}
            color="#F59E0B"
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      {/* INSTANCED TOKEN PACKET STREAM */}
      <instancedMesh
        ref={instancedTokensRef}
        args={[undefined, undefined, TOKEN_PARTICLE_COUNT]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[0.075, 0]} />
        <meshStandardMaterial
          ref={tokenMaterialRef}
          color="#38BDF8"
          emissive="#38BDF8"
          emissiveIntensity={isDark ? 1.55 : 0.75}
          roughness={0.2}
          metalness={0.1}
        />
      </instancedMesh>

      {/* CLICKABLE 3D HOLOGRAPHIC HOTSPOT PILLS (LPU Pipeline Lens) */}
      {isLpuConcept &&
        LPU_HOTSPOTS.map((hotspot) => {
          const isSelected = selectedHotspot === hotspot.id
          const dotColor =
            hotspot.accent === 'amber'
              ? 'var(--accent-amber)'
              : hotspot.accent === 'sky'
                ? 'var(--accent-sky)'
                : 'var(--accent-cyan)'

          return (
            <Html
              key={hotspot.id}
              portal={htmlPortalRef}
              position={hotspot.anchorPosition}
              center
              zIndexRange={[15, 0]}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedHotspot(isSelected ? null : hotspot.id)
                }}
                data-testid={`hotspot-pill-${hotspot.id}`}
                aria-pressed={isSelected}
                className={[
                  'pointer-events-auto spatial-pill select-none flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-all duration-150',
                  'hover:scale-105 active:scale-95',
                  isSelected
                    ? 'border-[var(--accent-cyan)] ring-2 ring-[var(--accent-cyan)]/35 text-[var(--text-primary)]'
                    : 'text-[var(--text-primary)] hover:border-[var(--glass-border-strong)]',
                ].join(' ')}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: dotColor,
                    boxShadow: `0 0 8px ${dotColor}`,
                  }}
                  aria-hidden="true"
                />
                <span className="font-mono-metric text-[10px] text-[var(--text-muted)]">
                  0{hotspot.stepNumber}
                </span>
                <span>{hotspot.shortLabel}</span>
              </button>
            </Html>
          )
        })}
    </group>
  )
}
