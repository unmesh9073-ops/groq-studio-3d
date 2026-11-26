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

  const activeConcept = usePlaygroundStore((state) => state.activeConcept)
  const selectedHotspot = usePlaygroundStore((state) => state.selectedHotspot)
  const cameraResetTick = usePlaygroundStore((state) => state.cameraResetTick)
  const isControlDockCollapsed = usePlaygroundStore((state) => state.isControlDockCollapsed)
  const isJarvisOpen = usePlaygroundStore((state) => state.isJarvisOpen)
  const isConsoleExpanded = usePlaygroundStore((state) => state.isConsoleExpanded)

  const desiredPosition = useRef(new THREE.Vector3(-1.35, 2.35, 10.2))
  const desiredTarget = useRef(new THREE.Vector3(-1.35, -0.2, 0))
  const isTransitioning = useRef(false)

  useEffect(() => {
    const isDesktop = size.width >= 1024
    const hotspots = getHotspotsForConcept(activeConcept)
    const hotspotMeta = selectedHotspot
      ? hotspots.find((h) => h.id === selectedHotspot)
      : undefined

    // Gently shift target downward when PromptConsole is expanded so 3D scenes float above it
    const consoleLift = isConsoleExpanded ? -0.42 : 0

    if (hotspotMeta) {
      const dockShift = isDesktop && !isControlDockCollapsed ? -0.45 : 0
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
        if (!isControlDockCollapsed && !isJarvisOpen) {
          xOffset = -1.35
          zBoost = 0.55
        } else if (isControlDockCollapsed && isJarvisOpen) {
          xOffset = 1.45
          zBoost = 0.6
        } else if (!isControlDockCollapsed && isJarvisOpen) {
          xOffset = 0.25
          zBoost = 1.85
        }
      } else {
        zBoost = 2.6
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
    activeConcept,
    selectedHotspot,
    cameraResetTick,
    isControlDockCollapsed,
    isJarvisOpen,
    isConsoleExpanded,
    size.width,
  ])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || !isTransitioning.current) return

    const dt = Math.min(delta, 0.05)
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
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      enablePan={false}
      minDistance={5.0}
      maxDistance={15.0}
      minPolarAngle={0.38}
      maxPolarAngle={Math.PI * 0.485}
      rotateSpeed={0.75}
      zoomSpeed={0.8}
      onStart={() => {
        isTransitioning.current = false
      }}
    />
  )
}
