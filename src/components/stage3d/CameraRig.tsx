import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getConceptById, getHotspotsForConcept } from '@/data/concepts'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

export function CameraRig() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  const activeWorkspace = usePlaygroundStore((s) => s.activeWorkspace)
  const activeConcept = usePlaygroundStore((s) => s.activeConcept)
  const selectedHotspot = usePlaygroundStore((s) => s.selectedHotspot)
  const cameraResetTick = usePlaygroundStore((s) => s.cameraResetTick)
  const isControlDockCollapsed = usePlaygroundStore((s) => s.isControlDockCollapsed)
  const isJarvisOpen = usePlaygroundStore((s) => s.isJarvisOpen)
  const isConsoleExpanded = usePlaygroundStore((s) => s.isConsoleExpanded)

  const desiredPosition = useRef(new THREE.Vector3(0, 1.35, 9.6))
  const desiredTarget = useRef(new THREE.Vector3(0, -0.35, 0))
  const parallaxTarget = useRef(new THREE.Vector3(0, 1.35, 9.6))
  const isTransitioning = useRef(false)
  const isUserInteracting = useRef(false)

  useEffect(() => {
    const isDesktop = size.width >= 1024

    if (activeWorkspace === 'studio') {
      desiredPosition.current.set(0, 1.35, isDesktop ? 9.6 : 11.4)
      desiredTarget.current.set(0, -0.35, 0)
      isTransitioning.current = true
      return
    }

    if (activeWorkspace === 'playground') {
      desiredPosition.current.set(2.8, 2.1, isDesktop ? 11.4 : 12.8)
      desiredTarget.current.set(0.4, -0.2, 0)
      isTransitioning.current = true
      return
    }

    if (activeWorkspace === 'builder') {
      desiredPosition.current.set(-2.6, 2.4, isDesktop ? 10.8 : 12.4)
      desiredTarget.current.set(-0.3, -0.2, 0)
      isTransitioning.current = true
      return
    }

    // 'lab' workspace: centered close-up stage for interactive learning
    const hotspots = getHotspotsForConcept(activeConcept)
    const hotspotMeta = selectedHotspot
      ? hotspots.find((h) => h.id === selectedHotspot)
      : undefined

    const consoleLift = isConsoleExpanded ? -0.32 : 0

    if (hotspotMeta) {
      const dockShift = isDesktop && !isControlDockCollapsed ? -0.35 : 0
      desiredPosition.current.set(
        hotspotMeta.cameraPosition[0] + dockShift,
        hotspotMeta.cameraPosition[1],
        hotspotMeta.cameraPosition[2]
      )
      desiredTarget.current.set(
        hotspotMeta.cameraTarget[0] + dockShift,
        hotspotMeta.cameraTarget[1] + consoleLift * 0.5,
        hotspotMeta.cameraTarget[2]
      )
    } else {
      const conceptMeta = getConceptById(activeConcept)
      let xOffset = 0
      let zBoost = 0

      if (isDesktop) {
        if (isJarvisOpen) {
          xOffset = 1.15
          zBoost = 0.65
        }
      } else {
        zBoost = 2.4
      }

      desiredPosition.current.set(
        conceptMeta.cameraPosition[0] + xOffset,
        conceptMeta.cameraPosition[1],
        conceptMeta.cameraPosition[2] + zBoost
      )
      desiredTarget.current.set(
        conceptMeta.cameraTarget[0] + xOffset,
        conceptMeta.cameraTarget[1] + consoleLift,
        conceptMeta.cameraTarget[2]
      )
    }

    isTransitioning.current = true
  }, [
    activeWorkspace,
    activeConcept,
    selectedHotspot,
    cameraResetTick,
    isControlDockCollapsed,
    isJarvisOpen,
    isConsoleExpanded,
    size.width,
  ])

  useFrame((state, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const dt = Math.min(delta, 0.05)

    if (isTransitioning.current) {
      const alpha = 1 - Math.exp(-5.4 * dt)
      camera.position.lerp(desiredPosition.current, alpha)
      controls.target.lerp(desiredTarget.current, alpha)
      controls.update()

      const posDist = camera.position.distanceTo(desiredPosition.current)
      const targetDist = controls.target.distanceTo(desiredTarget.current)

      if (posDist < 0.02 && targetDist < 0.02) {
        camera.position.copy(desiredPosition.current)
        controls.target.copy(desiredTarget.current)
        controls.update()
        isTransitioning.current = false
      }
      return
    }

    // Subtle cursor-driven 3D parallax when idle
    if (!isUserInteracting.current) {
      const parallaxX = state.pointer.x * 0.28
      const parallaxY = state.pointer.y * 0.16
      const targetPosX = desiredPosition.current.x + parallaxX
      const targetPosY = desiredPosition.current.y + parallaxY
      const pAlpha = 1 - Math.exp(-3.2 * dt)

      parallaxTarget.current.set(targetPosX, targetPosY, desiredPosition.current.z)
      camera.position.lerp(parallaxTarget.current, pAlpha)
      controls.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      enablePan={false}
      minDistance={4.8}
      maxDistance={15.5}
      minPolarAngle={0.38}
      maxPolarAngle={Math.PI * 0.485}
      rotateSpeed={0.75}
      zoomSpeed={0.8}
      onStart={() => {
        isTransitioning.current = false
        isUserInteracting.current = true
      }}
      onEnd={() => {
        isUserInteracting.current = false
      }}
    />
  )
}
