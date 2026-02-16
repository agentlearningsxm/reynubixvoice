"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../contexts/ThemeContext';

// Theme-based palettes
const getThemePalette = (accent: string) => {
  switch (accent) {
    case 'green':
      return {
        name: "Theme",
        pointLightColor: new THREE.Color(0x10B981),
        pointLightIntensity: 2.2,
        ambientLightColor: new THREE.Color(0x052010),
        sphereColor1: new THREE.Color(0.0, 0.5, 0.2),
        sphereColor2: new THREE.Color(0.1, 0.9, 0.5),
        sphereRimColor: new THREE.Color(0.5, 1.0, 0.7),
        ringColor1: new THREE.Color(0.0, 0.6, 0.3),
        ringColor2: new THREE.Color(0.2, 1.0, 0.6),
        sphereParticleColor1: new THREE.Color(0.1, 1.0, 0.4),
        sphereParticleColor2: new THREE.Color(0.4, 1.0, 0.7),
        sphereParticleEndColor: new THREE.Color(0.0, 0.4, 0.2),
        ringParticleColor1: new THREE.Color(0.1, 0.9, 0.4),
        ringParticleColor2: new THREE.Color(0.5, 1.0, 0.8),
        ringParticleEndColor: new THREE.Color(0.0, 0.3, 0.2),
        rainParticleColor1: new THREE.Color(0.9, 0.9, 0.9),
        rainParticleColor2: new THREE.Color(0.9, 0.9, 0.75),
        rainParticleEndColor: new THREE.Color(0.3, 0.5, 0.3),
        fogColor: 0x020805,
      };
    case 'orange':
      return {
        name: "Theme",
        pointLightColor: new THREE.Color(0xF97316),
        pointLightIntensity: 2.2,
        ambientLightColor: new THREE.Color(0x301005),
        sphereColor1: new THREE.Color(0.6, 0.2, 0.0),
        sphereColor2: new THREE.Color(1.0, 0.6, 0.1),
        sphereRimColor: new THREE.Color(1.0, 0.9, 0.5),
        ringColor1: new THREE.Color(0.7, 0.3, 0.0),
        ringColor2: new THREE.Color(1.0, 0.6, 0.2),
        sphereParticleColor1: new THREE.Color(1.0, 0.5, 0.1),
        sphereParticleColor2: new THREE.Color(1.0, 0.8, 0.3),
        sphereParticleEndColor: new THREE.Color(0.6, 0.2, 0.0),
        ringParticleColor1: new THREE.Color(1.0, 0.4, 0.0),
        ringParticleColor2: new THREE.Color(1.0, 0.8, 0.2),
        ringParticleEndColor: new THREE.Color(0.5, 0.15, 0.0),
        rainParticleColor1: new THREE.Color(0.9, 0.9, 0.9),
        rainParticleColor2: new THREE.Color(0.9, 0.9, 0.75),
        rainParticleEndColor: new THREE.Color(0.5, 0.4, 0.2),
        fogColor: 0x150800,
      };
    case 'blue':
    default:
      return {
        name: "Theme",
        pointLightColor: new THREE.Color(0x0EA5E9),
        pointLightIntensity: 2.3,
        ambientLightColor: new THREE.Color(0x051525),
        sphereColor1: new THREE.Color(0.0, 0.3, 0.5),
        sphereColor2: new THREE.Color(0.2, 0.7, 1.0),
        sphereRimColor: new THREE.Color(0.5, 0.9, 1.0),
        ringColor1: new THREE.Color(0.0, 0.4, 0.6),
        ringColor2: new THREE.Color(0.2, 0.7, 1.0),
        sphereParticleColor1: new THREE.Color(0.1, 0.6, 1.0),
        sphereParticleColor2: new THREE.Color(0.4, 0.9, 1.0),
        sphereParticleEndColor: new THREE.Color(0.0, 0.3, 0.5),
        ringParticleColor1: new THREE.Color(0.1, 0.5, 0.9),
        ringParticleColor2: new THREE.Color(0.5, 0.9, 1.0),
        ringParticleEndColor: new THREE.Color(0.0, 0.2, 0.4),
        rainParticleColor1: new THREE.Color(0.9, 0.9, 0.9),
        rainParticleColor2: new THREE.Color(0.9, 0.9, 0.75),
        rainParticleEndColor: new THREE.Color(0.3, 0.4, 0.5),
        fogColor: 0x030810,
      };
  }
};

// Initialize Three.js scene
const initThreeScene = async (container: HTMLElement, accent: string, isFullscreen: boolean) => {
  const THREE = await import('three');
  const OrbitControls = (await import('three/examples/jsm/controls/OrbitControls.js')).OrbitControls;
  const EffectComposer = (await import('three/examples/jsm/postprocessing/EffectComposer.js')).EffectComposer;
  const RenderPass = (await import('three/examples/jsm/postprocessing/RenderPass.js')).RenderPass;
  const ShaderPass = (await import('three/examples/jsm/postprocessing/ShaderPass.js')).ShaderPass;
  const UnrealBloomPass = (await import('three/examples/jsm/postprocessing/UnrealBloomPass.js')).UnrealBloomPass;
  const OutputPass = (await import('three/examples/jsm/postprocessing/OutputPass.js')).OutputPass;

  const themePalette = getThemePalette(accent);

  // All palettes - first 4 from user's code + theme
  const palettes = [
    { name: "Fiery", pointLightColor: new THREE.Color(0xff8000), pointLightIntensity: 2.2, ambientLightColor: new THREE.Color(0x301000), sphereColor1: new THREE.Color(1.0, 0.2, 0.0), sphereColor2: new THREE.Color(1.0, 0.7, 0.1), sphereRimColor: new THREE.Color(1.0, 0.9, 0.5), ringColor1: new THREE.Color(1.0, 0.15, 0.0), ringColor2: new THREE.Color(1.0, 0.6, 0.0), sphereParticleColor1: new THREE.Color(1.0, 0.4, 0.1), sphereParticleColor2: new THREE.Color(1.0, 1.0, 0.5), sphereParticleEndColor: new THREE.Color(0.6, 0.05, 0.1), ringParticleColor1: new THREE.Color(1.0, 0.3, 0.0), ringParticleColor2: new THREE.Color(1.0, 0.9, 0.2), ringParticleEndColor: new THREE.Color(0.5, 0.1, 0.05), rainParticleColor1: new THREE.Color(0.9, 0.9, 0.9), rainParticleColor2: new THREE.Color(0.9, 0.9, 0.75), rainParticleEndColor: new THREE.Color(0.4, 0.4, 0.15), fogColor: 0x100500 },
    { name: "Cosmic", pointLightColor: new THREE.Color(0xff60ff), pointLightIntensity: 2.5, ambientLightColor: new THREE.Color(0x150020), sphereColor1: new THREE.Color(0.4, 0.0, 0.6), sphereColor2: new THREE.Color(1.0, 0.2, 0.8), sphereRimColor: new THREE.Color(1.0, 0.7, 1.0), ringColor1: new THREE.Color(0.3, 0.0, 0.5), ringColor2: new THREE.Color(0.8, 0.1, 0.9), sphereParticleColor1: new THREE.Color(1.0, 0.1, 0.8), sphereParticleColor2: new THREE.Color(1.0, 0.6, 1.0), sphereParticleEndColor: new THREE.Color(0.3, 0.0, 0.5), ringParticleColor1: new THREE.Color(0.8, 0.0, 1.0), ringParticleColor2: new THREE.Color(1.0, 0.4, 0.8), ringParticleEndColor: new THREE.Color(0.2, 0.0, 0.4), rainParticleColor1: new THREE.Color(0.9, 0.9, 0.9), rainParticleColor2: new THREE.Color(0.9, 0.9, 0.75), rainParticleEndColor: new THREE.Color(0.4, 0.4, 0.15), fogColor: 0x050010 },
    { name: "Electric", pointLightColor: new THREE.Color(0x00ffff), pointLightIntensity: 2.3, ambientLightColor: new THREE.Color(0x001515), sphereColor1: new THREE.Color(0.0, 0.4, 0.2), sphereColor2: new THREE.Color(0.1, 0.9, 0.8), sphereRimColor: new THREE.Color(0.8, 1.0, 1.0), ringColor1: new THREE.Color(0.0, 0.6, 0.3), ringColor2: new THREE.Color(0.2, 1.0, 0.9), sphereParticleColor1: new THREE.Color(0.2, 1.0, 0.2), sphereParticleColor2: new THREE.Color(0.5, 1.0, 0.8), sphereParticleEndColor: new THREE.Color(0.0, 0.4, 0.2), ringParticleColor1: new THREE.Color(0.1, 1.0, 0.5), ringParticleColor2: new THREE.Color(0.6, 1.0, 1.0), ringParticleEndColor: new THREE.Color(0.0, 0.3, 0.3), rainParticleColor1: new THREE.Color(0.9, 0.9, 0.9), rainParticleColor2: new THREE.Color(0.9, 0.9, 0.75), rainParticleEndColor: new THREE.Color(0.4, 0.4, 0.15), fogColor: 0x000808 },
    { name: "Crystal", pointLightColor: new THREE.Color(0xccddee), pointLightIntensity: 2.0, ambientLightColor: new THREE.Color(0x08081f), sphereColor1: new THREE.Color(0.1, 0.2, 0.5), sphereColor2: new THREE.Color(0.6, 0.8, 1.0), sphereRimColor: new THREE.Color(1.0, 1.0, 1.0), ringColor1: new THREE.Color(0.3, 0.4, 0.8), ringColor2: new THREE.Color(0.8, 0.9, 1.0), sphereParticleColor1: new THREE.Color(0.9, 0.95, 1.0), sphereParticleColor2: new THREE.Color(0.7, 0.9, 1.0), sphereParticleEndColor: new THREE.Color(0.2, 0.3, 0.7), ringParticleColor1: new THREE.Color(1.0, 1.0, 1.0), ringParticleColor2: new THREE.Color(0.8, 0.95, 1.0), ringParticleEndColor: new THREE.Color(0.3, 0.4, 0.8), rainParticleColor1: new THREE.Color(0.9, 0.9, 0.9), rainParticleColor2: new THREE.Color(0.9, 0.9, 0.75), rainParticleEndColor: new THREE.Color(0.4, 0.4, 0.15), fogColor: 0x03030a },
    themePalette,
  ];

  let currentPaletteIndex = 4; // Start with theme
  const sphereParticleCount = 1800;
  const ringParticleCount = 800;
  const rainParticleCount = 4000;
  const starCount = 8000;

  // Scene
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(3.5, 2.5, 7.0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.04;
  controls.minDistance = 2.0;
  controls.maxDistance = 30;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.1;

  const clock = new THREE.Clock();
  scene.fog = new THREE.FogExp2(palettes[0].fogColor, 0.035);

  const ambientLight = new THREE.AmbientLight(0x000000, 0.5);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0xffffff, 2, 15);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  // Central glowing sphere
  const sphereGeometry = new THREE.SphereGeometry(1, 48, 48);
  const sphereMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform float time;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;
        float pulse = sin(time * 1.8 + position.y * 6.0 + position.x * 3.0) * 0.04;
        pos += normal * pulse;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform float time;
      uniform vec3 sphereColor1;
      uniform vec3 sphereColor2;
      uniform vec3 sphereRimColor;
      void main() {
        float glow1 = sin(time * 1.2 + vUv.y * 4.0 + vUv.x * 2.0) * 0.5 + 0.5;
        float glow2 = cos(time * 0.8 - vUv.y * 6.0) * 0.5 + 0.5;
        float glowCombined = mix(glow1, glow2, 0.6);
        vec3 baseColor = mix(sphereColor1, sphereColor2, vUv.y + glowCombined * 0.4);
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        float fresnelTerm = dot(normal, viewDirection);
        fresnelTerm = pow(1.0 - fresnelTerm, 4.0);
        fresnelTerm = clamp(fresnelTerm * 1.5, 0.0, 1.0);
        vec3 rimColor = sphereRimColor * fresnelTerm * 0.8;
        float noise = fract(sin(dot(vUv.xy * vec2(12.9898, 78.233), vec2(12.9898,78.233))) * 43758.5453);
        noise = smoothstep(0.4, 0.6, noise) * 0.1;
        vec3 finalColor = baseColor + rimColor + noise;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    uniforms: {
      time: { value: 0 },
      sphereColor1: { value: new THREE.Color(palettes[currentPaletteIndex].sphereColor1) },
      sphereColor2: { value: new THREE.Color(palettes[currentPaletteIndex].sphereColor2) },
      sphereRimColor: { value: new THREE.Color(palettes[currentPaletteIndex].sphereRimColor) }
    }
  });
  const fierySphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  coreGroup.add(fierySphere);

  // Create particle layer function (exactly like user's code)
  const createParticleLayer = (count: number, options: any) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const initialVelocities = new Float32Array(count * 3);
    const creationTimes = new Float32Array(count);

    const baseColor1 = options.color1 || new THREE.Color(1.0, 0.2, 0.0);
    const baseColor2 = options.color2 || new THREE.Color(1.0, 1.0, 0.2);
    const lifetime = options.lifetime || 3.0;
    const velocityScale = options.velocityScale || 1.0;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let originPos = new THREE.Vector3();
      let velocity = new THREE.Vector3();

      if (options.shape === 'sphere') {
        // Particles exploding outward from sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2.0 * Math.random() - 1.0);
        const r = options.radius + (Math.random() - 0.5) * 0.1;
        originPos.set(Math.sin(phi) * Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r, Math.cos(phi) * r);
        velocity.copy(originPos).normalize().multiplyScalar((0.9 + Math.random() * 0.8) * velocityScale);
      } else if (options.shape === 'ring') {
        // Ring particles - orbit around the sphere
        const angle = Math.random() * Math.PI * 2;
        const r = options.innerRadius + Math.random() * (options.outerRadius - options.innerRadius);
        originPos.set(Math.cos(angle) * r, Math.sin(angle) * r, (Math.random() - 0.5) * 0.08);
        const tangent = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0).multiplyScalar(0.6);
        const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(0.3 + Math.random() * 0.3);
        const randomZ = (Math.random() - 0.5) * 0.6;
        velocity.add(tangent).add(radial).add(new THREE.Vector3(0, 0, randomZ)).normalize().multiplyScalar((0.6 + Math.random() * 0.6) * velocityScale);
      } else if (options.shape === 'rain') {
        // Rain particles - falling from above
        const spawnWidth = options.spawnWidth || 20;
        const spawnDepth = options.spawnDepth || 15;
        originPos.set((Math.random() - 0.5) * spawnWidth, 0, (Math.random() - 0.5) * spawnDepth);
        velocity.copy(options.baseVelocity || new THREE.Vector3(0, 0, 0)).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.7
        )).multiplyScalar((0.9 + Math.random() * 0.3) * velocityScale);
      }

      positions[i3] = originPos.x;
      positions[i3 + 1] = originPos.y;
      positions[i3 + 2] = originPos.z;
      initialVelocities[i3] = velocity.x;
      initialVelocities[i3 + 1] = velocity.y;
      initialVelocities[i3 + 2] = velocity.z;

      const t = Math.random();
      const color = new THREE.Color().lerpColors(baseColor1, baseColor2, t * t);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = (options.baseSize || 0.05) + Math.random() * (options.sizeVariation || 0.07);
      creationTimes[i] = -Math.random() * lifetime * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('initialVelocity', new THREE.BufferAttribute(initialVelocities, 3));
    geometry.setAttribute('creationTime', new THREE.BufferAttribute(creationTimes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute vec3 initialVelocity;
        attribute float creationTime;
        varying vec3 vColor;
        varying float vLifeProgress;
        uniform float time;
        uniform float lifetime;
        void main() {
          vColor = color;
          float timeElapsed = time - creationTime;
          vLifeProgress = clamp(timeElapsed / lifetime, 0.0, 1.0);
          if (vLifeProgress >= 1.0) { gl_PointSize = 0.0; return; }
          vec3 gravity = vec3(0.0, -0.06, 0.0);
          vec3 currentPos = position + initialVelocity * timeElapsed + 0.5 * gravity * timeElapsed * timeElapsed;
          float swayFactor = sin(time * 0.8 + position.x * 0.5) * 0.08 * vLifeProgress;
          float swayFactor2 = cos(time * 0.6 + position.z * 0.7) * 0.06 * vLifeProgress;
          currentPos.x += swayFactor;
          currentPos.z += swayFactor2;
          vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
          float sizeMultiplier = (1.0 - vLifeProgress * 0.5) * (1.0 + sin(time * 3.0 + position.y * 10.0) * 0.1);
          float pointSize = size * (400.0 / max(1.0, -mvPosition.z)) * sizeMultiplier;
          gl_PointSize = max(0.0, pointSize);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLifeProgress;
        uniform vec3 endColor;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float distSqr = dot(coord, coord);
          if (distSqr > 0.25) discard;
          vec3 currentColor = mix(vColor, endColor, vLifeProgress * vLifeProgress);
          float edgeAlpha = 1.0 - smoothstep(0.15, 0.25, distSqr);
          float lifeAlpha = smoothstep(1.0, 0.4, vLifeProgress);
          float finalAlpha = edgeAlpha * lifeAlpha;
          float coreBrightness = smoothstep(0.05, 0.0, distSqr) * 0.5;
          gl_FragColor = vec4(currentColor + coreBrightness, finalAlpha);
        }
      `,
      uniforms: {
        time: { value: 0 },
        lifetime: { value: lifetime },
        endColor: { value: new THREE.Color(options.endColor || 0x000000) }
      },
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.userData.creationOptions = options;
    return points;
  };

  // SPHERE PARTICLES - exploding outward from orb
  const sphereOptions = {
    shape: 'sphere',
    radius: 1.1,
    lifetime: 2.8,
    velocityScale: 2.0,
    baseSize: 0.03,
    sizeVariation: 0.05,
    color1: palettes[currentPaletteIndex].sphereParticleColor1,
    color2: palettes[currentPaletteIndex].sphereParticleColor2,
    endColor: palettes[currentPaletteIndex].sphereParticleEndColor
  };
  const sphereParticles = createParticleLayer(sphereParticleCount, sphereOptions);
  coreGroup.add(sphereParticles);

  // LIGHT RINGS with particles - hovering/orbiting around the orb
  const lightRings = new THREE.Group();
  const ringParticleSystems: any[] = [];

  for (let i = 0; i < 4; i++) {
    const innerRadius = 1.8 + i * 0.6;
    const outerRadius = 2.0 + i * 0.6;
    
    // Ring mesh
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 80);
    const ringMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying float vDistortion;
        uniform float time;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave1 = sin(time * 1.8 + position.x * 2.5) * 0.06;
          float wave2 = cos(time * 1.2 + position.y * 3.0) * 0.04;
          pos.z += wave1 + wave2;
          vDistortion = abs(wave1 + wave2) / 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vDistortion;
        uniform float time;
        uniform vec3 ringColor1;
        uniform vec3 ringColor2;
        void main() {
          float pulse = pow(sin(time * 2.5 + vUv.x * 6.0) * 0.5 + 0.5, 2.0);
          vec3 color = mix(ringColor1, ringColor2, clamp(vUv.y + pulse * 0.6, 0.0, 1.0));
          float edgeFade = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          float alpha = (0.5 + pulse * 0.5) * edgeFade * (1.0 - vDistortion * 0.5);
          alpha = clamp(alpha, 0.0, 1.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        time: { value: 0 },
        ringColor1: { value: new THREE.Color(palettes[currentPaletteIndex].ringColor1) },
        ringColor2: { value: new THREE.Color(palettes[currentPaletteIndex].ringColor2) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2 + (i * 0.05);
    ring.rotation.y = (Math.random() - 0.5) * 0.1;
    lightRings.add(ring);

    // Ring particles - orbiting in rings
    const ringOptions = {
      shape: 'ring' as const,
      innerRadius,
      outerRadius: outerRadius + 0.1,
      lifetime: 1.4 + i * 0.25,
      velocityScale: 1.2 + i * 0.4,
      baseSize: 0.025,
      sizeVariation: 0.04,
      color1: palettes[currentPaletteIndex].ringParticleColor1,
      color2: palettes[currentPaletteIndex].ringParticleColor2,
      endColor: palettes[currentPaletteIndex].ringParticleEndColor
    };
    
    const ringParticles = createParticleLayer(ringParticleCount, ringOptions);
    ringParticles.rotation.copy(ring.rotation);
    ringParticleSystems.push(ringParticles);
    ring.add(ringParticles);
  }
  coreGroup.add(lightRings);

  // RAIN PARTICLES - raining down around the orb
  const rainOptions = {
    shape: 'rain' as const,
    spawnWidth: 30,
    spawnDepth: 25,
    lifetime: 6.0,
    velocityScale: 2.8,
    baseVelocity: new THREE.Vector3(-1.0, -3.0, -0.5),
    baseSize: 0.02,
    sizeVariation: 0.03,
    color1: palettes[currentPaletteIndex].rainParticleColor1,
    color2: palettes[currentPaletteIndex].rainParticleColor2,
    endColor: palettes[currentPaletteIndex].rainParticleEndColor
  };
  const rainParticles = createParticleLayer(rainParticleCount, rainOptions);
  rainParticles.position.y = 12;
  rainParticles.renderOrder = -1;
  scene.add(rainParticles);

  // Starfield
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starBaseColor = new THREE.Color(0.8, 0.8, 0.9);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    starPositions[i3] = (Math.random() - 0.5) * 150;
    starPositions[i3 + 1] = (Math.random() - 0.5) * 150;
    starPositions[i3 + 2] = (Math.random() - 0.5) * 150;
    const color = starBaseColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);
    starColors[i3] = color.r;
    starColors[i3 + 1] = color.g;
    starColors[i3 + 2] = color.b;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: 0.04,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  });
  const starfield = new THREE.Points(starGeometry, starMaterial);
  scene.add(starfield);

  // Post-processing (bloom + color grading)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.65));

  const colorGradingShader = {
    uniforms: {
      'tDiffuse': { value: null },
      'contrast': { value: 1.15 },
      'brightness': { value: 0.0 },
      'saturation': { value: 1.1 }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float contrast;
      uniform float brightness;
      uniform float saturation;
      varying vec2 vUv;
      vec3 adjustSaturation(vec3 color, float saturation) {
        const vec3 luminanceWeighting = vec3(0.2126, 0.7152, 0.0722);
        vec3 grayscale = vec3(dot(color, luminanceWeighting));
        return mix(grayscale, color, saturation);
      }
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        color.rgb = adjustSaturation(color.rgb, saturation);
        color.rgb = (color.rgb - 0.5) * contrast + 0.5 + brightness;
        gl_FragColor = color;
      }
    `
  };
  composer.addPass(new ShaderPass(colorGradingShader));
  composer.addPass(new OutputPass());

  // Apply palette function
  const applyPalette = (palette: any) => {
    pointLight.color.set(palette.pointLightColor);
    pointLight.intensity = palette.pointLightIntensity;
    ambientLight.color.set(palette.ambientLightColor);
    if (scene.fog) scene.fog.color.setHex(palette.fogColor);

    const sphereMat = fierySphere.material as THREE.ShaderMaterial;
    sphereMat.uniforms.sphereColor1.value.set(palette.sphereColor1);
    sphereMat.uniforms.sphereColor2.value.set(palette.sphereColor2);
    sphereMat.uniforms.sphereRimColor.value.set(palette.sphereRimColor);

    lightRings.children.forEach((ring: any) => {
      if (ring.isMesh && ring.material.uniforms?.ringColor1) {
        ring.material.uniforms.ringColor1.value.set(palette.ringColor1);
        ring.material.uniforms.ringColor2.value.set(palette.ringColor2);
      }
    });

    // Update particle colors
    const updateParticles = (particles: any, c1: any, c2: any, endC: any) => {
      const geo = particles.geometry;
      const cols = geo.attributes.color;
      for (let i = 0; i < cols.count; i++) {
        const t = Math.random();
        const color = new THREE.Color().lerpColors(c1, c2, t * t);
        cols.setXYZ(i, color.r, color.g, color.b);
      }
      cols.needsUpdate = true;
      particles.material.uniforms.endColor.value.set(endC);
    };

    updateParticles(sphereParticles, palette.sphereParticleColor1, palette.sphereParticleColor2, palette.sphereParticleEndColor);
    updateParticles(rainParticles, palette.rainParticleColor1, palette.rainParticleColor2, palette.rainParticleEndColor);
    ringParticleSystems.forEach(sys => updateParticles(sys, palette.ringParticleColor1, palette.ringParticleColor2, palette.ringParticleEndColor));
  };

  // Click to change palette (cycle through first 4)
  renderer.domElement.addEventListener('click', () => {
    currentPaletteIndex = (currentPaletteIndex + 1) % 4;
    applyPalette(palettes[currentPaletteIndex]);
  });

  applyPalette(palettes[currentPaletteIndex]);

  // Respawn particles (exactly like user's code)
  const respawnParticles = (particleSystem: any) => {
    if (!particleSystem?.geometry?.userData?.creationOptions) return;
    const attrs = particleSystem.geometry.attributes;
    const creationTimes = attrs.creationTime;
    const positions = attrs.position;
    const initialVelocities = attrs.initialVelocity;
    if (!creationTimes || !positions || !initialVelocities) return;

    const options = particleSystem.userData.creationOptions;
    const lifetime = particleSystem.material.uniforms.lifetime.value;
    const currentTime = particleSystem.material.uniforms.time.value;
    const baseVelocity = options.baseVelocity || new THREE.Vector3(0, 0, 0);
    const velocityScale = options.velocityScale || 1.0;

    for (let i = 0; i < creationTimes.count; i++) {
      if (currentTime > creationTimes.array[i] + lifetime) {
        creationTimes.array[i] = currentTime + Math.random() * 0.2;
        const i3 = i * 3;

        if (options.shape === 'rain') {
          positions.array[i3] = (Math.random() - 0.5) * (options.spawnWidth || 20);
          positions.array[i3 + 1] = 0;
          positions.array[i3 + 2] = (Math.random() - 0.5) * (options.spawnDepth || 15);
          
          let velocity = new THREE.Vector3().copy(baseVelocity).add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.7
          )).multiplyScalar((0.9 + Math.random() * 0.3) * velocityScale);
          initialVelocities.array[i3] = velocity.x;
          initialVelocities.array[i3 + 1] = velocity.y;
          initialVelocities.array[i3 + 2] = velocity.z;
        } else if (options.shape === 'sphere') {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2.0 * Math.random() - 1.0);
          const r = (options.radius || 1.1) + (Math.random() - 0.5) * 0.1;
          positions.array[i3] = Math.sin(phi) * Math.cos(theta) * r;
          positions.array[i3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
          positions.array[i3 + 2] = Math.cos(phi) * r;
        } else if (options.shape === 'ring') {
          const angle = Math.random() * Math.PI * 2;
          const r = (options.innerRadius || 1.8) + Math.random() * ((options.outerRadius || 2.0) - (options.innerRadius || 1.8));
          positions.array[i3] = Math.cos(angle) * r;
          positions.array[i3 + 1] = Math.sin(angle) * r;
          positions.array[i3 + 2] = (Math.random() - 0.5) * 0.08;
        }
      }
    }
    creationTimes.needsUpdate = true;
    positions.needsUpdate = true;
    if (initialVelocities) initialVelocities.needsUpdate = true;
  };

  // Animation loop
  let animationId: number;
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Update sphere particles (exploding outward)
    sphereParticles.material.uniforms.time.value = time;
    respawnParticles(sphereParticles);

    // Update rain particles (falling down)
    rainParticles.material.uniforms.time.value = time;
    respawnParticles(rainParticles);

    // Update ring particles (orbiting)
    ringParticleSystems.forEach(sys => {
      sys.material.uniforms.time.value = time;
      respawnParticles(sys);
    });

    // Update sphere shader
    if (fierySphere.material.uniforms.time) {
      fierySphere.material.uniforms.time.value = time;
    }

    // Rotate core group
    coreGroup.rotation.y += 0.002;
    coreGroup.rotation.x += 0.001;

    // Update rings
    lightRings.children.forEach((ring: any, i: number) => {
      if (ring.isMesh?.material?.uniforms?.time) {
        ring.material.uniforms.time.value = time;
      }
      if (ring.isMesh) {
        ring.rotation.z += 0.01 * (i + 1) * (i % 2 === 0 ? 1.2 : -0.9);
        ring.rotation.x += Math.sin(time * 0.5 + i) * 0.001;
      }
    });

    controls.update();
    composer.render();
  };

  animate();

  // Handle resize
  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', onResize);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  };
};

const CosmicOrb: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const { accent } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Initialize inline scene
  useEffect(() => {
    if (!containerRef.current || isFullscreen) return;

    const init = async () => {
      if (cleanupRef.current) cleanupRef.current();
      try {
        const cleanup = await initThreeScene(containerRef.current!, accent, isFullscreen);
        cleanupRef.current = cleanup;
        setIsLoaded(true);
      } catch (e) {
        console.error('Failed to initialize Three.js:', e);
      }
    };

    init();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [accent, isFullscreen]);

  // Fullscreen scene
  useEffect(() => {
    if (!isFullscreen || !fullscreenRef.current) return;

    const init = async () => {
      if (cleanupRef.current) cleanupRef.current();
      try {
        const cleanup = await initThreeScene(fullscreenRef.current!, accent, isFullscreen);
        cleanupRef.current = cleanup;
      } catch (e) {
        console.error('Failed to initialize Three.js:', e);
      }
    };

    init();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [isFullscreen, accent]);

  const enterMiniWorld = useCallback(() => {
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const exitMiniWorld = useCallback(() => {
    setIsFullscreen(false);
    document.body.style.overflow = '';
  }, []);

  return (
    <>
      {/* Fullscreen Mini World */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <div ref={fullscreenRef} className="w-full h-full" />
          <button
            onClick={exitMiniWorld}
            className="absolute top-6 right-6 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-medium hover:bg-white/20 transition-all"
          >
            Exit Mini World
          </button>
          <div className="absolute bottom-6 left-6 text-white/70 text-sm font-sans pointer-events-none">
            <div>Click to Change Palette</div>
            <div>Drag Mouse to Orbit</div>
          </div>
        </div>
      )}

      {/* Inline Preview */}
      <div className="relative">
        <div 
          ref={containerRef} 
          className="w-full h-[500px] rounded-2xl overflow-hidden" 
          style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }} 
        />
        
        {!isFullscreen && (
          <button
            onClick={enterMiniWorld}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-brand-primary/80 backdrop-blur-md text-white rounded-full font-medium hover:bg-brand-primary transition-all text-sm"
          >
            Enter Mini World
          </button>
        )}
      </div>
    </>
  );
};

export default CosmicOrb;
