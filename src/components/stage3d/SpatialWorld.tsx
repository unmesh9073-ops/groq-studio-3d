import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

interface SpatialWorldProps {
  isDark: boolean
}

function AmbientDepthDust({ isDark }: { isDark: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const count = 90
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random spread around the spatial room
      const angle = i * 2.39996
      const radius = 2.8 + (i % 9) * 0.85
      arr[i * 3] = Math.cos(angle) * radius
      arr[i * 3 + 1] = -1.2 + ((i * 7) % 13) * 0.38
      arr[i * 3 + 2] = Math.sin(angle) * radius - 1.5
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y += delta * 0.018
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isDark ? 0.038 : 0.032}
        color={isDark ? '#67E8F9' : '#0284C7'}
        transparent
        opacity={isDark ? 0.42 : 0.25}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

const BURST_COUNT = 54
const BURST_DURATION = 1.4

function CelebrationBurst() {
  const pointsRef = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)
  const lastTickRef = useRef(usePlaygroundStore.getState().challengeCelebrationTick)
  const elapsedRef = useRef(-1)

  const { positions, directions, colors } = useMemo(() => {
    const pos = new Float32Array(BURST_COUNT * 3)
    const dir = new Float32Array(BURST_COUNT * 3)
    const col = new Float32Array(BURST_COUNT * 3)
    const palette = [
      new THREE.Color('#22D3EE'), // cyan
      new THREE.Color('#10B981'), // emerald
      new THREE.Color('#F59E0B'), // amber
    ]

    for (let i = 0; i < BURST_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / BURST_COUNT)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const speed = 2.2 + (i % 5) * 0.45

      dir[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      dir[i * 3 + 1] = Math.cos(phi) * speed * 0.85 + 0.4
      dir[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed

      const c = palette[i % palette.length]
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return { positions: pos, directions: dir, colors: col }
  }, [])

  useFrame((_, delta) => {
    const currentTick = usePlaygroundStore.getState().challengeCelebrationTick
    if (currentTick !== lastTickRef.current) {
      lastTickRef.current = currentTick
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        elapsedRef.current = 0
      }
    }

    if (elapsedRef.current < 0 || !pointsRef.current || !matRef.current) return

    elapsedRef.current += Math.min(delta, 0.05)
    const t = elapsedRef.current

    if (t >= BURST_DURATION) {
      elapsedRef.current = -1
      matRef.current.opacity = 0
      return
    }

    const progress = t / BURST_DURATION
    const easeOut = 1 - Math.pow(1 - progress, 3)
    const attr = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute
    const arr = attr.array as Float32Array

    for (let i = 0; i < BURST_COUNT; i++) {
      arr[i * 3] = directions[i * 3] * easeOut
      arr[i * 3 + 1] = directions[i * 3 + 1] * easeOut - 0.35 * progress * progress
      arr[i * 3 + 2] = directions[i * 3 + 2] * easeOut
    }
    attr.needsUpdate = true
    matRef.current.opacity = (1 - progress) * 0.9
  })

  return (
    <points ref={pointsRef} position={[0, 0.2, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.095}
        vertexColors
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export function SpatialWorld({ isDark }: SpatialWorldProps) {
  const bgColor = isDark ? '#04060C' : '#F4F6FB'
  const floorColor = isDark ? '#070B14' : '#EBF0F7'

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 14, 28]} />

      {/* Subtle reflective spatial floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.72, 0]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={isDark ? 0.35 : 0.55}
          metalness={isDark ? 0.35 : 0.08}
          transparent
          opacity={isDark ? 0.65 : 0.55}
        />
      </mesh>

      {/* Soft volumetric rim lights */}
      <pointLight
        position={[-5.5, 3.2, -4.5]}
        intensity={isDark ? 1.4 : 0.7}
        color="#22D3EE"
        distance={18}
      />
      <pointLight
        position={[5.5, 2.4, -4.0]}
        intensity={isDark ? 1.1 : 0.55}
        color="#F59E0B"
        distance={16}
      />

      <AmbientDepthDust isDark={isDark} />
      <CelebrationBurst />
    </>
  )
}
