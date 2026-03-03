import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Environment,
  ContactShadows,
  Float,
  PerspectiveCamera,
  OrbitControls,
  RoundedBox,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { Phone, PhoneOff, MicOff } from 'lucide-react';
import { useGeminiLive, type TranscriptEntry } from '../hooks/useGeminiLive';

// Create textures programmatically
function createOrbTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, 1024, 2048);
  const cx = 512; const cy = 1024; const r = 350;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
  glow.addColorStop(0, 'rgba(40, 100, 255, 0.4)');
  glow.addColorStop(1, 'rgba(40, 100, 255, 0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1024, 2048);
  return canvas;
}

function createRadialBrushedMetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, 512, 512);
  ctx.translate(256, 256);
  for (let i = 0; i < 2000; i++) {
    ctx.rotate((Math.random() * Math.PI * 2));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(400, 0);
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = Math.random() * 2; ctx.stroke();
  }
  return canvas;
}

function createNoiseTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#444444'; ctx.fillRect(0, 0, 256, 256);
  const imgData = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    const val = Math.max(0, Math.min(255, 128 + noise));
    imgData.data[i] = val;
    imgData.data[i+1] = val;
    imgData.data[i+2] = val;
    imgData.data[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function AnimatedOrb({ isCalling, activeSpeaker }: { isCalling?: boolean, activeSpeaker?: 'human' | 'ai' | null }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const particlesCount = 800;

  const { positions, originalPositions, randoms } = useMemo(() => {
    const pos = new Float32Array(particlesCount * 3);
    const origPos = new Float32Array(particlesCount * 3);
    const rands = new Float32Array(particlesCount);
    for(let i = 0; i < particlesCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 0.5;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
      origPos[i*3] = x; origPos[i*3+1] = y; origPos[i*3+2] = z;
      rands[i] = Math.random();
    }
    return { positions: pos, originalPositions: origPos, randoms: rands };
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const speed = isCalling ? 2.0 : 0.5;
      pointsRef.current.rotation.y += speed * delta;
      pointsRef.current.rotation.x += (speed * 0.6) * delta;
      const pulseSpeed = isCalling ? 8 : 3;
      const pulseAmount = isCalling ? 0.15 : 0.05;
      const scale = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * pulseAmount;
      pointsRef.current.scale.set(scale, scale, scale);
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particlesCount; i++) {
        const r = randoms[i];
        const detachFactor = activeSpeaker ? (Math.sin(state.clock.elapsedTime * 10 + r * 20) * 0.5 + 0.5) : 0;
        const ox = originalPositions[i*3]; const oy = originalPositions[i*3+1]; const oz = originalPositions[i*3+2];
        const push = detachFactor * 0.4 * r;
        const tx = ox * (1 + push); const ty = oy * (1 + push); const tz = oz * (1 + push);
        posArray[i*3] += (tx - posArray[i*3]) * 0.1;
        posArray[i*3+1] += (ty - posArray[i*3+1]) * 0.1;
        posArray[i*3+2] += (tz - posArray[i*3+2]) * 0.1;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    if (materialRef.current) {
      const isFront = state.camera.position.z > 0;
      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, isFront ? 0.8 : 0, 0.15);
      let targetColorHex = "#4fa8ff";
      if (activeSpeaker === 'human') targetColorHex = "#10b981";
      else if (activeSpeaker === 'ai') targetColorHex = "#a855f7";
      else if (isCalling) targetColorHex = "#3b82f6";
      materialRef.current.color.lerp(new THREE.Color(targetColorHex), 0.05);
    }
  });

  return (
    <points ref={pointsRef} position={[0, 0.5, 0.11]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particlesCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial ref={materialRef} size={0.02} color="#4fa8ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function PhoneUI({ isCalling, setIsCalling, transcript, activeSpeaker }: { isCalling?: boolean, setIsCalling?: (v: boolean) => void, transcript?: TranscriptEntry[], activeSpeaker?: 'human' | 'ai' | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  useFrame((state) => {
    if (containerRef.current) {
      const isFront = state.camera.position.z > 0;
      containerRef.current.style.opacity = isFront ? '1' : '0';
      containerRef.current.style.pointerEvents = isFront ? 'auto' : 'none';
    }
  });
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  return (
    <Html transform position={[0, 0, 0.11]} distanceFactor={2.2} zIndexRange={[100, 0]} center>
      <style>{`
        .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .transcript-scroll::-webkit-scrollbar { width: 4px; }
        .transcript-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
      `}</style>
      <div ref={containerRef} className="flex flex-col items-center justify-end w-[400px] h-[800px] select-none transition-opacity duration-300 pb-0 translate-y-24">
        {!isCalling ? (
          <div className="flex flex-col items-center justify-end h-full w-full">
            <h1 className="text-white text-5xl font-bold mb-4 whitespace-nowrap">Start Demo</h1>
            <p className="text-[#4fa8ff] text-base tracking-[0.2em] mb-12 uppercase font-semibold">Tap to connect</p>
            <div className="flex items-center gap-8">
              <button className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#333] text-gray-400 cursor-pointer"><PhoneOff size={32} /></button>
              <button onClick={(e) => { e.stopPropagation(); setIsCalling?.(true); }} className="w-28 h-28 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] cursor-pointer"><Phone size={48} /></button>
              <button className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#333] text-gray-400 cursor-pointer"><MicOff size={32} /></button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full h-full">
            <div ref={transcriptRef} className="w-full max-h-[1300px] mt-auto overflow-y-auto transcript-scroll flex flex-col gap-4 px-6 pt-12 pb-4" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 5%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 5%, black 90%, transparent)' }}>
              {transcript?.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.speaker === 'human' ? 'items-end' : 'items-start'} fade-in-up`}>
                  <span className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${msg.speaker === 'human' ? 'text-emerald-400' : 'text-purple-400'}`}>{msg.speaker === 'human' ? 'You' : 'Reyna'}</span>
                  <div className={`px-4 py-3 max-w-[85%] text-sm leading-relaxed backdrop-blur-md ${msg.speaker === 'human' ? 'bg-emerald-500/20 text-emerald-50 border border-emerald-500/30 rounded-2xl rounded-tr-sm' : 'bg-purple-500/20 text-purple-50 border border-purple-500/30 rounded-2xl rounded-tl-sm'}`}>{msg.text}</div>
                </div>
              ))}
              {activeSpeaker && (
                 <div className={`flex items-center gap-1.5 mt-2 fade-in-up ${activeSpeaker === 'human' ? 'self-end' : 'self-start'}`}>
                   {[0, 0.2, 0.4].map((delay, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full animate-bounce ${activeSpeaker === 'human' ? 'bg-emerald-400' : 'bg-purple-400'}`} style={{ animationDelay: `${delay}s` }} />)}
                 </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-8 mt-4 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); setIsCalling?.(false); }} className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] cursor-pointer"><PhoneOff size={32} /></button>
            </div>
          </div>
        )}
      </div>
    </Html>
  );
}

function FloatingCard({ side, delay, isCalling, children, offsetMultiplier = 1, verticalOffset = 0, portalRef }: any) {
  const divRef = useRef<HTMLDivElement>(null);
  const callingPushRef = useRef(0);
  useFrame((state) => {
    if (divRef.current) {
      const baseY = (side === 'left' ? -50 : 50) + verticalOffset;
      const floatY = baseY + Math.sin(state.clock.elapsedTime * 1.5 + delay) * 10;
      const angle = Math.abs(Math.atan2(state.camera.position.x, state.camera.position.z));
      const pushFactor = Math.min(angle / 0.3, 1);
      const targetCallingPush = isCalling ? 1 : 0;
      callingPushRef.current = THREE.MathUtils.lerp(callingPushRef.current, targetCallingPush, 0.05);
      const baseOffset = (side === 'left' ? -180 : 180) * offsetMultiplier;
      const pushOutOffset = (side === 'left' ? -220 : 220) * offsetMultiplier;
      const callingPushOutOffset = (side === 'left' ? -180 : 180) * offsetMultiplier;
      const currentX = baseOffset + (pushFactor * pushOutOffset) + (callingPushRef.current * callingPushOutOffset);
      divRef.current.style.transform = `translate(${currentX}px, ${floatY}px)`;
    }
  });
  return (
    <Html center position={[0, 0, 0]} zIndexRange={[100, 0]} portal={portalRef}>
      <div ref={divRef} className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-4 flex items-center gap-4 w-64 pointer-events-none select-none">
        {children}
      </div>
    </Html>
  );
}

function Ripple({ x, y, onComplete }: { x: number, y: number, onComplete: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const circleMatRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    if (groupRef.current && ringMatRef.current && circleMatRef.current) {
      groupRef.current.scale.x += delta * 6; groupRef.current.scale.y += delta * 6;
      ringMatRef.current.opacity -= delta * 1.5; circleMatRef.current.opacity -= delta * 2.5;
      if (ringMatRef.current.opacity <= 0) onComplete();
    }
  });
  return (
    <group ref={groupRef} position={[x, y, 0.001]}>
      <mesh><ringGeometry args={[0.08, 0.1, 32]} /><meshBasicMaterial ref={ringMatRef} color="#ffffff" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      <mesh><circleGeometry args={[0.08, 32]} /><meshBasicMaterial ref={circleMatRef} color="#ffffff" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </group>
  );
}

function PhoneModel({ isHovered, setIsHovered, isCalling, setIsCalling, transcript, activeSpeaker }: {
  isHovered: boolean;
  setIsHovered: (v: boolean) => void;
  isCalling: boolean;
  setIsCalling: (v: boolean) => void;
  transcript: TranscriptEntry[];
  activeSpeaker: 'ai' | 'human' | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (groupRef.current) {
      const localPoint = groupRef.current.worldToLocal(e.point.clone());
      setRipples(prev => [...prev.slice(-4), { id: Date.now() + Math.random(), x: localPoint.x, y: localPoint.y }]);
    }
  };

  const orbTexture = useMemo(() => new THREE.CanvasTexture(createOrbTexture()), []);
  const brushedTexture = useMemo(() => new THREE.CanvasTexture(createRadialBrushedMetalTexture()), []);
  const noiseTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(createNoiseTexture());
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 8); return tex;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
      groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.15) * 0.1;
    }
  });

  return (
    <group ref={groupRef} onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }} onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}>
      <RoundedBox args={[2.9, 5.8, 0.2]} radius={0.1} smoothness={4}><meshPhysicalMaterial color="#1a1a1a" roughness={0.15} metalness={0.8} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={2.0} /></RoundedBox>
      <RoundedBox args={[2.86, 5.76, 0.04]} radius={0.02} smoothness={4} position={[0, 0, -0.09]}><meshPhysicalMaterial color="#0a0a0a" roughness={0.85} metalness={0.3} clearcoat={0.2} clearcoatRoughness={0.7} envMapIntensity={1.0} bumpMap={noiseTexture} bumpScale={0.002} /></RoundedBox>
      <RoundedBox args={[2.86, 5.76, 0.02]} radius={0.01} smoothness={4} position={[0, 0, 0.09]}><meshStandardMaterial color="#000000" roughness={0.5} metalness={0.1} /></RoundedBox>
      <mesh position={[0, 0, 0.101]}><planeGeometry args={[2.7, 5.5]} /><meshStandardMaterial map={orbTexture} emissive="#ffffff" emissiveMap={orbTexture} emissiveIntensity={1.2} toneMapped={false} />{ripples.map(r => (<Ripple key={r.id} x={r.x} y={r.y} onComplete={() => setRipples(prev => prev.filter(ripple => ripple.id !== r.id))} />))}</mesh>
      <AnimatedOrb isCalling={isCalling} activeSpeaker={activeSpeaker} />
      <PhoneUI isCalling={isCalling} setIsCalling={setIsCalling} transcript={transcript} activeSpeaker={activeSpeaker} />
      <RoundedBox args={[1.2, 0.25, 0.02]} radius={0.01} smoothness={4} position={[0, 2.7, 0.102]}><meshStandardMaterial color="#000000" roughness={0.5} metalness={0.1} /></RoundedBox>
      <RoundedBox args={[2.86, 5.76, 0.02]} radius={0.01} smoothness={4} position={[0, 0, 0.105]} onPointerDown={handlePointerDown}><meshPhysicalMaterial color="#ffffff" transmission={1} opacity={1} roughness={0.02} metalness={0} thickness={0.05} ior={1.3} clearcoat={0.3} clearcoatRoughness={0.1} /></RoundedBox>
      <group position={[0.8, 2.0, -0.14]}>
        <RoundedBox args={[0.6, 1.4, 0.06]} radius={0.03} smoothness={4} position={[0, 0, -0.03]}><meshStandardMaterial color="#050505" roughness={0.1} metalness={0.9} /></RoundedBox>
        <group position={[0, 0.4, -0.06]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.04, 32]} /><meshStandardMaterial color="#111111" roughness={0.2} metalness={0.8} /></mesh>
          <mesh position={[0, 0, -0.02]}><torusGeometry args={[0.21, 0.015, 32, 64]} /><meshStandardMaterial color="#1e90ff" metalness={0.9} roughness={0.5} roughnessMap={brushedTexture} /></mesh>
        </group>
        <group position={[0, -0.4, -0.06]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.04, 32]} /><meshStandardMaterial color="#111111" roughness={0.2} metalness={0.8} /></mesh>
          <mesh position={[0, 0, -0.02]}><torusGeometry args={[0.21, 0.015, 32, 64]} /><meshStandardMaterial color="#1e90ff" metalness={0.9} roughness={0.5} roughnessMap={brushedTexture} /></mesh>
        </group>
      </group>
      <group position={[0, 1.2, -0.11]}><mesh rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.25, 0.25, 0.01, 32]} /><meshStandardMaterial color="#111" roughness={0.5} metalness={0.2} /></mesh></group>
      <mesh position={[1.45, 0.8, 0]}><boxGeometry args={[0.05, 0.6, 0.05]} /><meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.3} /></mesh>
      <mesh position={[1.45, 0.1, 0]}><boxGeometry args={[0.05, 0.6, 0.05]} /><meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.3} /></mesh>
      <mesh position={[-1.45, 0.5, 0]}><boxGeometry args={[0.05, 0.8, 0.05]} /><meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.3} /></mesh>
    </group>
  );
}

function CameraController() {
  const controlsRef = useRef<any>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const targetCameraPos = useMemo(() => new THREE.Vector3(0, 0, 8), []);
  const targetControlsPos = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  useFrame((state, delta) => {
    if (isSnapping && controlsRef.current) {
      state.camera.position.lerp(targetCameraPos, delta * 3);
      controlsRef.current.target.lerp(targetControlsPos, delta * 3);
      controlsRef.current.update();
      if (state.camera.position.distanceTo(targetCameraPos) < 0.05) setIsSnapping(false);
    }
  });
  return <OrbitControls ref={controlsRef} enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} onStart={() => setIsSnapping(false)} onEnd={() => setTimeout(() => setIsSnapping(true), 2000)} />;
}

// ─── Bridge component: lives inside Canvas, receives hook data via props ───
function ThreePhoneScene({ isCalling, setIsCalling, transcript, activeSpeaker, t, portalRef }: {
  isCalling: boolean;
  setIsCalling: (v: boolean) => void;
  transcript: TranscriptEntry[];
  activeSpeaker: 'ai' | 'human' | null;
  t: any;
  portalRef?: React.RefObject<HTMLDivElement>;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 7]} fov={50} /><CameraController /><ambientLight intensity={0.5} /><directionalLight position={[5, 5, 5]} intensity={1.5} castShadow /><directionalLight position={[-5, 2, -5]} intensity={0.5} color="#4444ff" /><Environment preset="city" background={false} />
      <FloatingCard side="left" delay={0} isCalling={isCalling} verticalOffset={20} portalRef={portalRef}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div><p className="text-[10px] font-medium text-gray-300 leading-tight">{t.hero.widget.booked}</p><p className="text-sm font-bold text-white leading-tight mt-0.5">{t.hero.widget.time}</p></div>
      </FloatingCard>
      <FloatingCard side="right" delay={Math.PI / 2} isCalling={isCalling} offsetMultiplier={1.1} verticalOffset={-70} portalRef={portalRef}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-base" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>{t.currency}</div>
        <div><p className="text-[10px] font-medium text-gray-300 leading-tight">{t.hero.widget.saved}</p><p className="text-base font-bold text-white leading-tight mt-0.5">{t.currency}12,450</p></div>
      </FloatingCard>
      <FloatingCard side="right" delay={Math.PI} isCalling={isCalling} offsetMultiplier={1.0} verticalOffset={110} portalRef={portalRef}>
        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse mr-2" /><p className="text-xs font-semibold text-white whitespace-nowrap">100% Answer Rate</p>
      </FloatingCard>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.1}>
        <PhoneModel isHovered={isHovered} setIsHovered={setIsHovered} isCalling={isCalling} setIsCalling={setIsCalling} transcript={transcript} activeSpeaker={activeSpeaker} />
      </Float>
      <ContactShadows position={[0, 0, -1.5]} rotation={[-Math.PI / 2, 0, 0]} opacity={0.8} scale={12} blur={4} far={3} color="#000000" /><ContactShadows position={[0, -3.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} color="#000000" />
    </>
  );
}

// ─── Main Export: Hook lives HERE (outside Canvas) ──────────────────
export const ThreePhone = ({ isCalling, setIsCalling, t }: { isCalling: boolean, setIsCalling: (v: boolean) => void, t: any }) => {
  const portalRef = useRef<HTMLDivElement>(null);
  const { connected, isAgentSpeaking, isUserSpeaking, error, transcript, connectToGemini, disconnect } = useGeminiLive();

  // Connect/disconnect based on isCalling state
  useEffect(() => {
    if (isCalling) {
      connectToGemini();
    } else {
      disconnect();
    }
  }, [isCalling]);

  // If connection fails, stop calling state
  useEffect(() => {
    if (error) {
      console.error("Gemini error:", error);
    }
  }, [error]);

  // Derive activeSpeaker from hook states
  const activeSpeaker: 'ai' | 'human' | null = isAgentSpeaking ? 'ai' : isUserSpeaking ? 'human' : null;

  // Admin silence toggle (Ctrl+Shift+R)
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('reyna-admin') === 'true');
  const [silenceMode, setSilenceMode] = useState<'wait' | 'checkin'>(() =>
    (localStorage.getItem('reyna-silence-mode') as 'wait' | 'checkin') || 'checkin'
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        const newAdmin = !isAdmin;
        setIsAdmin(newAdmin);
        localStorage.setItem('reyna-admin', String(newAdmin));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAdmin]);

  const toggleSilenceMode = () => {
    const newMode = silenceMode === 'wait' ? 'checkin' : 'wait';
    setSilenceMode(newMode);
    localStorage.setItem('reyna-silence-mode', newMode);
  };

  return (
    <div className="w-full h-[640px] relative overflow-visible">
      <div ref={portalRef} className="absolute inset-0 overflow-visible pointer-events-none" style={{ zIndex: 1 }} />
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2, alpha: true }} style={{ background: 'transparent' }}>
        <ThreePhoneScene isCalling={isCalling} setIsCalling={setIsCalling} transcript={transcript} activeSpeaker={activeSpeaker} t={t} portalRef={portalRef} />
      </Canvas>

      {/* Admin-only silence mode toggle */}
      {isAdmin && (
        <button
          onClick={toggleSilenceMode}
          className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md border transition-all z-50"
          style={{
            background: silenceMode === 'wait' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            borderColor: silenceMode === 'wait' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
            color: silenceMode === 'wait' ? '#fca5a5' : '#6ee7b7',
          }}
          title="Admin: Toggle silence mode (Ctrl+Shift+R to show/hide)"
        >
          {silenceMode === 'wait' ? 'WAIT' : 'CHECK-IN'}
        </button>
      )}
    </div>
  );
};
