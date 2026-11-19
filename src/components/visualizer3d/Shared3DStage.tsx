'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Visualizer3DScene, GroqParameters } from '@/types/groq';
import { sound } from '@/lib/audio';

interface Shared3DStageProps {
  sceneType: Visualizer3DScene;
  parameters: GroqParameters;
  onSelectScene?: (scene: Visualizer3DScene) => void;
  isStreamingActive?: boolean;
  incomingTokenPulse?: number; // increments when a new token arrives
  lastTokenText?: string;
  className?: string;
}

export function Shared3DStage({
  sceneType,
  parameters,
  onSelectScene,
  isStreamingActive = false,
  incomingTokenPulse = 0,
  lastTokenText = 'token',
  className = '',
}: Shared3DStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const [is3DActive, setIs3DActive] = useState<boolean>(true);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // References for Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const dynamicObjectsRef = useRef<THREE.Object3D[]>([]);

  // Temperature towers reference
  const tempTowersRef = useRef<THREE.Mesh[]>([]);
  const selectionOrbRef = useRef<THREE.Mesh | null>(null);

  // Top-P dome reference
  const topPDomeRef = useRef<THREE.Mesh | null>(null);
  const topPGroupRef = useRef<THREE.Group | null>(null);

  // Accelerator tunnel particles
  const tunnelParticlesRef = useRef<THREE.Points | null>(null);

  // Laser gate reference
  const laserGateRef = useRef<THREE.Group | null>(null);

  // Clean disposal helper
  const disposeObject = (obj: THREE.Object3D) => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else if (mat) {
          mat.dispose();
        }
      }
    });
  };

  const clearDynamicScene = useCallback(() => {
    if (!sceneRef.current) return;
    dynamicObjectsRef.current.forEach((obj) => {
      sceneRef.current?.remove(obj);
      disposeObject(obj);
    });
    dynamicObjectsRef.current = [];
    tempTowersRef.current = [];
    selectionOrbRef.current = null;
    topPDomeRef.current = null;
    topPGroupRef.current = null;
    tunnelParticlesRef.current = null;
    laserGateRef.current = null;
  }, []);

  // 1. Scene: Pipeline Overview
  const buildPipelineScene = useCallback((scene: THREE.Scene) => {
    const group = new THREE.Group();

    const stages = [
      { name: 'System Prompt\n(Steering Lens)', color: 0xf43f5e, scene: 'systemprompt' as const, x: -8 },
      { name: 'Input Tokens\n(Subword Prism)', color: 0x10b981, scene: 'tokenization' as const, x: -4 },
      { name: 'Groq LPU Core\n(Tensor Streaming)', color: 0xf97316, scene: 'streaming' as const, x: 0 },
      { name: 'Sampling\n(Temp & Top-P)', color: 0x06b6d4, scene: 'temperature' as const, x: 4 },
      { name: 'Laser Output\n(Gate & Stop)', color: 0xa855f7, scene: 'maxtokens' as const, x: 8 },
    ];

    stages.forEach((st) => {
      // Pedestal node
      const geom = new THREE.CylinderGeometry(1.2, 1.4, 0.6, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.2,
      });
      const node = new THREE.Mesh(geom, mat);
      node.position.set(st.x, 0, 0);
      node.userData = { name: st.name, targetScene: st.scene, isClickable: true };

      // Glowing floating core
      const coreGeom = new THREE.IcosahedronGeometry(0.7, 2);
      const coreMat = new THREE.MeshStandardMaterial({
        color: st.color,
        emissive: st.color,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.position.set(st.x, 1.2, 0);
      core.userData = { name: st.name, targetScene: st.scene, isClickable: true };

      // Glow ring
      const ringGeom = new THREE.RingGeometry(0.9, 1.1, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: st.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(st.x, 0.35, 0);

      group.add(node);
      group.add(core);
      group.add(ring);
    });

    // Connecting laser line between stages
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.8 });
    const points = [
      new THREE.Vector3(-8, 1.2, 0),
      new THREE.Vector3(-4, 1.2, 0),
      new THREE.Vector3(0, 1.2, 0),
      new THREE.Vector3(4, 1.2, 0),
      new THREE.Vector3(8, 1.2, 0),
    ];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const laserLine = new THREE.Line(lineGeom, lineMat);
    group.add(laserLine);

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 2. Scene: Temperature Skyline
  const buildTemperatureScene = useCallback((scene: THREE.Scene, temp: number) => {
    const group = new THREE.Group();
    tempTowersRef.current = [];

    const numTowers = 7;
    const baseLogits = [5.0, 3.8, 2.6, 1.8, 1.1, 0.5, 0.1];
    const safeTemp = Math.max(0.05, temp);

    // Softmax probabilities
    const scaled = baseLogits.map((l) => Math.exp(l / safeTemp));
    const sum = scaled.reduce((a, b) => a + b, 0);
    const probs = scaled.map((s) => s / sum);

    const candidateTokens = ['the', 'quick', 'space', 'detective', 'golden', 'quantum', 'mystery'];

    for (let i = 0; i < numTowers; i++) {
      const height = Math.max(0.3, probs[i] * 9);
      const geom = new THREE.BoxGeometry(1.2, height, 1.2);
      const isTop = i === 0;

      const mat = new THREE.MeshStandardMaterial({
        color: isTop ? 0xf97316 : 0x06b6d4,
        emissive: isTop ? 0xf97316 : 0x06b6d4,
        emissiveIntensity: isTop ? 0.6 : 0.2,
        roughness: 0.2,
        metalness: 0.5,
      });

      const mesh = new THREE.Mesh(geom, mat);
      const xPos = (i - 3) * 2.0;
      mesh.position.set(xPos, height / 2, 0);
      mesh.userData = {
        name: `Token "${candidateTokens[i]}": ${(probs[i] * 100).toFixed(1)}% prob`,
      };

      group.add(mesh);
      tempTowersRef.current.push(mesh);
    }

    // Glowing selection orb hovering above
    const orbGeom = new THREE.SphereGeometry(0.35, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.0,
    });
    const orb = new THREE.Mesh(orbGeom, orbMat);
    orb.position.set(-6, Math.max(1, probs[0] * 9) + 0.8, 0);
    group.add(orb);
    selectionOrbRef.current = orb;

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 3. Scene: Top-P Nucleus Sampling Force-Field
  const buildTopPScene = useCallback((scene: THREE.Scene, topP: number) => {
    const group = new THREE.Group();
    topPGroupRef.current = group;

    const tokens = ['apple', 'orange', 'banana', 'grape', 'kiwi', 'mango', 'peach', 'plum'];
    const cumulativeProb = [0.35, 0.55, 0.70, 0.82, 0.90, 0.95, 0.98, 1.0];

    tokens.forEach((tok, idx) => {
      const angle = (idx / tokens.length) * Math.PI * 2;
      const radius = 1.0 + idx * 0.7; // Ranked outward
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const inNucleus = cumulativeProb[idx] <= topP;

      const geom = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: inNucleus ? 0x10b981 : 0x475569,
        emissive: inNucleus ? 0x10b981 : 0x000000,
        emissiveIntensity: inNucleus ? 0.7 : 0.0,
        transparent: !inNucleus,
        opacity: inNucleus ? 1.0 : 0.25,
        wireframe: !inNucleus,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, 0.75, z);
      mesh.userData = {
        name: `"${tok}" (Cumul: ${(cumulativeProb[idx] * 100).toFixed(0)}%) - ${
          inNucleus ? 'IN NUCLEUS ✅' : 'CUT OFF ❌'
        }`,
      };
      group.add(mesh);
    });

    // Glowing Circular Force-Field Dome
    const domeRadius = Math.max(1.5, topP * 6.0);
    const domeGeom = new THREE.SphereGeometry(domeRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.set(0, 0, 0);
    group.add(dome);
    topPDomeRef.current = dome;

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 4. Scene: Subword Prism & Block Stream
  const buildTokenizationScene = useCallback((scene: THREE.Scene) => {
    const group = new THREE.Group();

    // Triangular glass optical prism
    const prismGeom = new THREE.CylinderGeometry(1.5, 1.5, 3.5, 3);
    const prismMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
    });
    const prism = new THREE.Mesh(prismGeom, prismMat);
    prism.position.set(0, 1.75, 0);
    group.add(prism);

    // Incoming raw word light beam
    const beamGeom = new THREE.CylinderGeometry(0.15, 0.15, 6, 16);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(-4, 1.75, 0);
    group.add(beam);

    // Sliced subword 3D crystal blocks refracting outward
    const subwords = [
      { text: 'straw', id: 3241, color: 0xf43f5e, yOffset: 1.0 },
      { text: 'berry', id: 9812, color: 0xf59e0b, yOffset: -1.0 },
    ];

    subwords.forEach((sw, idx) => {
      const blockGeom = new THREE.BoxGeometry(2.0, 1.0, 1.0);
      const blockMat = new THREE.MeshStandardMaterial({
        color: sw.color,
        emissive: sw.color,
        emissiveIntensity: 0.5,
        roughness: 0.1,
      });
      const block = new THREE.Mesh(blockGeom, blockMat);
      block.position.set(3.5, 1.75 + sw.yOffset, (idx - 0.5) * 2);
      block.userData = { name: `Subword Token: "${sw.text}" (ID: #${sw.id})` };
      group.add(block);
    });

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 5. Scene: Token Accelerator Tunnel (Streaming vs Non-Streaming)
  const buildStreamingScene = useCallback((scene: THREE.Scene, streamEnabled: boolean) => {
    const group = new THREE.Group();

    // Concentric tunnel accelerator rings
    for (let i = 0; i < 12; i++) {
      const ringGeom = new THREE.TorusGeometry(2.5, 0.08, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: streamEnabled ? 0xf97316 : 0x475569,
        emissive: streamEnabled ? 0xf97316 : 0x000000,
        emissiveIntensity: streamEnabled ? 0.6 : 0,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.z = (i - 6) * 1.5;
      group.add(ring);
    }

    // Streaming accelerator tunnel particles
    const particleCount = 200;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 3;
      posArray[i + 1] = (Math.random() - 0.5) * 3;
      posArray[i + 2] = (Math.random() - 0.5) * 18;
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.15,
      color: streamEnabled ? 0xfbbf24 : 0x64748b,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    group.add(particles);
    tunnelParticlesRef.current = particles;

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 6. Scene: Max Tokens Laser Gate
  const buildMaxTokensScene = useCallback((scene: THREE.Scene, maxTokens: number) => {
    const group = new THREE.Group();

    // Conveyor track
    const trackGeom = new THREE.BoxGeometry(16, 0.2, 3);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const track = new THREE.Mesh(trackGeom, trackMat);
    track.position.set(0, 0, 0);
    group.add(track);

    // Laser Boundary Gate positioned along the track
    const gatePos = Math.min(6.5, Math.max(-6.5, ((maxTokens - 2048) / 2048) * 6.0));
    const gateGroup = new THREE.Group();
    gateGroup.position.set(gatePos, 0, 0);

    const postGeom = new THREE.CylinderGeometry(0.15, 0.15, 4, 16);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const post1 = new THREE.Mesh(postGeom, postMat);
    post1.position.set(0, 2, 1.5);
    const post2 = new THREE.Mesh(postGeom, postMat);
    post2.position.set(0, 2, -1.5);

    // Glowing red laser barrier plane
    const laserGeom = new THREE.PlaneGeometry(0.1, 3.8);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const laser = new THREE.Mesh(laserGeom, laserMat);
    laser.rotation.y = Math.PI / 2;
    laser.position.set(0, 2, 0);

    gateGroup.add(post1);
    gateGroup.add(post2);
    gateGroup.add(laser);
    gateGroup.userData = { name: `Max Token Laser Gate: ${maxTokens} tokens cap` };

    group.add(gateGroup);
    laserGateRef.current = gateGroup;

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 7. Scene: Stop Sequences Laser Tripwires
  const buildStopSequencesScene = useCallback((scene: THREE.Scene, stops: string[]) => {
    const group = new THREE.Group();

    stops.forEach((st, idx) => {
      const zPos = (idx - (stops.length - 1) / 2) * 2.5;

      // Tripwire emitter posts
      const postGeom = new THREE.CylinderGeometry(0.1, 0.1, 3, 16);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const p1 = new THREE.Mesh(postGeom, postMat);
      p1.position.set(-3, 1.5, zPos);
      const p2 = new THREE.Mesh(postGeom, postMat);
      p2.position.set(3, 1.5, zPos);

      // Glowing sensor laser line
      const wireGeom = new THREE.CylinderGeometry(0.04, 0.04, 6, 16);
      const wireMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const wire = new THREE.Mesh(wireGeom, wireMat);
      wire.rotation.z = Math.PI / 2;
      wire.position.set(0, 1.5, zPos);
      wire.userData = { name: `Laser Tripwire: Stop Sequence "${st}"` };

      group.add(p1);
      group.add(p2);
      group.add(wire);
    });

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 8. Scene: System Prompt Persona Lens
  const buildSystemPromptScene = useCallback((scene: THREE.Scene) => {
    const group = new THREE.Group();

    // Convex optical bending lens
    const lensGeom = new THREE.SphereGeometry(2.5, 32, 16);
    lensGeom.scale(1, 1, 0.3);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      transmission: 0.8,
    });
    const lens = new THREE.Mesh(lensGeom, lensMat);
    lens.position.set(0, 1.5, 0);
    lens.userData = { name: 'Persona Gravity Lens (Shapes incoming token trajectories)' };
    group.add(lens);

    // Trajectory curved curves
    for (let i = -3; i <= 3; i++) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-6, 1.5 + i * 0.4, -2),
        new THREE.Vector3(0, 1.5 + i * 0.1, 0),
        new THREE.Vector3(6, 1.5 + i * 0.8, 2)
      );
      const points = curve.getPoints(30);
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 });
      const line = new THREE.Line(lineGeom, lineMat);
      group.add(line);
    }

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 9. Scene: JSON Mode Structural Blueprint Grid
  const buildJsonModeScene = useCallback((scene: THREE.Scene, jsonActive: boolean) => {
    const group = new THREE.Group();

    if (jsonActive) {
      // Locked geometric crystalline cube grid
      const boxCount = 6;
      for (let i = 0; i < boxCount; i++) {
        const x = ((i % 3) - 1) * 2.2;
        const y = Math.floor(i / 3) * 2.0 + 1.0;

        const geom = new THREE.BoxGeometry(1.6, 1.4, 1.4);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.4,
          metalness: 0.8,
          roughness: 0.2,
          wireframe: false,
        });
        const box = new THREE.Mesh(geom, mat);
        box.position.set(x, y, 0);
        box.userData = { name: `Locked JSON Key/Value Slot #${i + 1}` };
        group.add(box);

        // Edges wireframe
        const wireGeom = new THREE.EdgesGeometry(geom);
        const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff });
        const wire = new THREE.LineSegments(wireGeom, wireMat);
        box.add(wire);
      }
    } else {
      // Freeform organic floating token spheres
      for (let i = 0; i < 15; i++) {
        const geom = new THREE.SphereGeometry(0.4, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.3,
        });
        const sphere = new THREE.Mesh(geom, mat);
        sphere.position.set(
          (Math.random() - 0.5) * 6,
          Math.random() * 3 + 0.5,
          (Math.random() - 0.5) * 4
        );
        sphere.userData = { name: 'Unstructured Free-Flow Token' };
        group.add(sphere);
      }
    }

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 10. Scene: Seed Reproducibility Lattice
  const buildSeedScene = useCallback((scene: THREE.Scene, seedVal: number | null) => {
    const group = new THREE.Group();

    const isDeterministic = typeof seedVal === 'number';

    if (isDeterministic) {
      // Single locked golden laser track
      const geom = new THREE.CylinderGeometry(0.2, 0.2, 10, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.8,
      });
      const rail = new THREE.Mesh(geom, mat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 1.5, 0);
      rail.userData = { name: `Deterministic Locked Path (Seed: ${seedVal})` };
      group.add(rail);
    } else {
      // Quantum-like diverging probabilistic branching tree
      const start = new THREE.Vector3(-5, 1.5, 0);
      for (let b = 0; b < 6; b++) {
        const target = new THREE.Vector3(5, 0.5 + b * 0.7, (b - 2.5) * 1.5);
        const curve = new THREE.QuadraticBezierCurve3(
          start,
          new THREE.Vector3(0, 1.5 + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2),
          target
        );
        const pts = curve.getPoints(20);
        const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x06b6d4,
          transparent: true,
          opacity: 0.6,
        });
        const line = new THREE.Line(lineGeom, lineMat);
        group.add(line);
      }
    }

    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // 11. Scene: Compare Mode 3D (Two probability skylines side-by-side)
  const buildCompareScene = useCallback((scene: THREE.Scene, temp: number) => {
    const group = new THREE.Group();

    // Chamber A: Cold Robot (left)
    const groupA = new THREE.Group();
    groupA.position.set(-5, 0, 0);
    const geomA = new THREE.BoxGeometry(1.2, 8, 1.2);
    const matA = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.7,
    });
    const peakA = new THREE.Mesh(geomA, matA);
    peakA.position.set(0, 4, 0);
    peakA.userData = { name: 'Chamber A (Temp 0.0): Deterministic Peak 99%' };
    groupA.add(peakA);

    // Chamber B: Current Temp (right)
    const groupB = new THREE.Group();
    groupB.position.set(5, 0, 0);
    for (let i = 0; i < 5; i++) {
      const height = Math.max(0.4, (1.0 / (temp + 0.1)) * (5 - i));
      const geomB = new THREE.BoxGeometry(0.8, height, 0.8);
      const matB = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xf97316,
        emissiveIntensity: 0.5,
      });
      const barB = new THREE.Mesh(geomB, matB);
      barB.position.set((i - 2) * 1.0, height / 2, 0);
      barB.userData = { name: `Chamber B (Temp ${temp.toFixed(1)}): Candidate #${i + 1}` };
      groupB.add(barB);
    }

    group.add(groupA);
    group.add(groupB);
    scene.add(group);
    dynamicObjectsRef.current.push(group);
  }, []);

  // Rebuild active scene whenever sceneType or parameters change
  const buildCurrentScene = useCallback(() => {
    if (!sceneRef.current) return;
    clearDynamicScene();

    const sc = sceneRef.current;
    switch (sceneType) {
      case 'pipeline':
        buildPipelineScene(sc);
        break;
      case 'temperature':
        buildTemperatureScene(sc, parameters.temperature);
        break;
      case 'topp':
        buildTopPScene(sc, parameters.topP);
        break;
      case 'tokenization':
        buildTokenizationScene(sc);
        break;
      case 'streaming':
        buildStreamingScene(sc, parameters.stream);
        break;
      case 'maxtokens':
        buildMaxTokensScene(sc, parameters.maxTokens);
        break;
      case 'stopsequences':
        buildStopSequencesScene(sc, parameters.stopSequences);
        break;
      case 'systemprompt':
        buildSystemPromptScene(sc);
        break;
      case 'jsonmode':
        buildJsonModeScene(sc, parameters.jsonMode);
        break;
      case 'seed':
        buildSeedScene(sc, parameters.seed);
        break;
      case 'compare':
        buildCompareScene(sc, parameters.temperature);
        break;
      default:
        buildPipelineScene(sc);
        break;
    }
  }, [
    sceneType,
    parameters,
    clearDynamicScene,
    buildPipelineScene,
    buildTemperatureScene,
    buildTopPScene,
    buildTokenizationScene,
    buildStreamingScene,
    buildMaxTokensScene,
    buildStopSequencesScene,
    buildSystemPromptScene,
    buildJsonModeScene,
    buildSeedScene,
    buildCompareScene,
  ]);

  // Main Three.js initialization effect
  useEffect(() => {
    if (!mountRef.current || !is3DActive) return;

    try {
      // Create Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x070b14);
      sceneRef.current = scene;

      // Camera
      const width = mountRef.current.clientWidth || 600;
      const height = mountRef.current.clientHeight || 400;
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 6, 16);
      cameraRef.current = camera;

      // WebGL Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = false; // keep fast
      rendererRef.current = renderer;

      mountRef.current.replaceChildren(renderer.domElement);

      // OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 + 0.1;
      controls.minDistance = 4;
      controls.maxDistance = 40;
      controlsRef.current = controls;

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(10, 20, 15);
      scene.add(dirLight);

      const orangeLight = new THREE.PointLight(0xf97316, 2.0, 30);
      orangeLight.position.set(-8, 6, 8);
      scene.add(orangeLight);

      const cyanLight = new THREE.PointLight(0x06b6d4, 2.0, 30);
      cyanLight.position.set(8, 6, -8);
      scene.add(cyanLight);

      // Grid Floor
      const gridHelper = new THREE.GridHelper(40, 40, 0x1e293b, 0x0f172a);
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);

      // Build active scene
      buildCurrentScene();

      // Raycaster for mouse hover & click
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handlePointerMove = (event: MouseEvent) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          if (hit.userData?.name) {
            setHoveredInfo(hit.userData.name);
          } else {
            setHoveredInfo(null);
          }
        } else {
          setHoveredInfo(null);
        }
      };

      const handleClick = (event: MouseEvent) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          if (hit.userData?.targetScene && onSelectScene) {
            sound.click();
            onSelectScene(hit.userData.targetScene);
          }
        }
      };

      const domElem = renderer.domElement;
      domElem.addEventListener('mousemove', handlePointerMove);
      domElem.addEventListener('click', handleClick);

      // Animation Loop
      let clock = 0;
      const animate = () => {
        animFrameRef.current = requestAnimationFrame(animate);
        clock += 0.02;

        controls.update();

        // Idle animation for specific scene objects
        if (tunnelParticlesRef.current) {
          tunnelParticlesRef.current.rotation.z += 0.01;
          const pos = tunnelParticlesRef.current.geometry.attributes.position;
          for (let i = 2; i < pos.count * 3; i += 3) {
            pos.array[i] += 0.15;
            if (pos.array[i] > 9) pos.array[i] = -9;
          }
          pos.needsUpdate = true;
        }

        if (selectionOrbRef.current) {
          selectionOrbRef.current.position.y += Math.sin(clock * 3) * 0.005;
        }

        if (topPDomeRef.current) {
          topPDomeRef.current.rotation.y = clock * 0.1;
        }

        renderer.render(scene, camera);
      };

      animate();

      // Resize observer
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          if (newWidth > 0 && newHeight > 0 && cameraRef.current && rendererRef.current) {
            cameraRef.current.aspect = newWidth / newHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(newWidth, newHeight);
          }
        }
      });
      resizeObserver.observe(mountRef.current);

      // Cleanup on unmount
      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
        domElem.removeEventListener('mousemove', handlePointerMove);
        domElem.removeEventListener('click', handleClick);
        resizeObserver.disconnect();
        clearDynamicScene();
        renderer.dispose();
      };
    } catch {
      setWebglSupported(false);
    }
  }, [is3DActive, buildCurrentScene, clearDynamicScene, onSelectScene]);

  // Handle incoming token pulse animation
  useEffect(() => {
    if (!selectionOrbRef.current || incomingTokenPulse === 0) return;
    sound.tokenPop(700);
    // Flash scale orb
    selectionOrbRef.current.scale.set(1.4, 1.4, 1.4);
    setTimeout(() => {
      selectionOrbRef.current?.scale.set(1.0, 1.0, 1.0);
    }, 120);
  }, [incomingTokenPulse]);

  return (
    <div className={`relative w-full h-full min-h-[360px] rounded-2xl overflow-hidden bg-[#070b14] border border-slate-800 ${className}`}>
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full min-h-[360px]" />

      {/* Floating Hover Card */}
      {hoveredInfo && (
        <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-300 pointer-events-none backdrop-blur-md shadow-xl">
          {hoveredInfo}
        </div>
      )}

      {/* 3D Controls Overlay Bar */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400">
        <span>Orbit: Left Click • Pan: Right Click • Zoom: Scroll</span>
        <button
          onClick={() => {
            sound.click();
            setIs3DActive(!is3DActive);
          }}
          className="ml-2 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          {is3DActive ? 'Pause 3D' : 'Resume 3D'}
        </button>
      </div>

      {!webglSupported && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/90 text-center">
          <p className="text-xs text-slate-400 font-mono">
            WebGL is not enabled in your browser. Interactive 2D fallback mode is active.
          </p>
        </div>
      )}
    </div>
  );
}
