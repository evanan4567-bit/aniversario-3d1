import React, { useMemo, useRef, useState, useEffect } from "react"
import * as THREE from "three"
import { useFrame, useThree } from "@react-three/fiber"
import { Stars, Sparkles } from "@react-three/drei"

/* =========================================================
   CÁMARA CINEMÁTICA WOW + micro handheld
========================================================= */
function CinematicCamera({ phase, youRef, girlRef, busRef }) {
  const { camera } = useThree()

  const targetPos = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())
  const smoothLook = useRef(new THREE.Vector3(0, 0.6, 0))

  const shake = useRef({ t: 0, amp: 0.018 })

  useFrame((_, delta) => {
    shake.current.t += delta

    const you = youRef?.current
    const girl = girlRef?.current
    const bus = busRef?.current

    const POI_BENCH = new THREE.Vector3(0.15, 0.62, 0.25)
    const POI_YOU = you ? you.position.clone().add(new THREE.Vector3(0, 0.72, 0)) : POI_BENCH
    const POI_GIRL = girl ? girl.position.clone().add(new THREE.Vector3(0, 0.72, 0)) : POI_BENCH
    const POI_BUS = bus ? bus.position.clone().add(new THREE.Vector3(0, 0.75, 0)) : new THREE.Vector3(3.8, 0.7, 2.2)

    const isIntimate = phase >= 1 && phase <= 8
    const amp = isIntimate ? shake.current.amp : 0.01
    const sx = Math.sin(shake.current.t * 1.25) * amp
    const sy = Math.sin(shake.current.t * 1.6 + 1.7) * amp * 0.7
    const sz = Math.sin(shake.current.t * 1.1 + 0.9) * amp

    const shotGeneral = {
      pos: [-2.7, 2.75, 8.9],
      look: new THREE.Vector3(0, 0.95, -4.9),
      fov: 48,
      posDamp: 0.045,
      lookDamp: 0.07,
    }

    const followZ = you ? you.position.z : -3.0
    const shotLateral = {
      pos: [5.55, 2.25, THREE.MathUtils.clamp(followZ + 4.7, -3.4, 4.7)],
      look: new THREE.Vector3(0.15, 0.92, THREE.MathUtils.clamp(followZ + 1.0, -2.5, 1.4)),
      fov: 42,
      posDamp: 0.06,
      lookDamp: 0.095,
    }

    const shotSitClose = {
      pos: [1.55, 1.62, 2.48],
      look: POI_BENCH,
      fov: 35,
      posDamp: 0.07,
      lookDamp: 0.11,
    }

    const shotDialogue = {
      pos: [1.20, 1.58, 2.22],
      look: POI_GIRL.clone().lerp(POI_YOU, 0.35),
      fov: 34,
      posDamp: 0.06,
      lookDamp: 0.12,
    }

    const shotBusArrive = {
      pos: [3.95, 2.12, 6.25],
      look: POI_BUS.clone().lerp(POI_BENCH, 0.25),
      fov: 40,
      posDamp: 0.055,
      lookDamp: 0.1,
    }

    const shotFollowGirl = {
      pos: [2.95, 2.02, 4.45],
      look: POI_GIRL,
      fov: 38,
      posDamp: 0.06,
      lookDamp: 0.11,
    }

    const shotDecision = {
      pos: [1.05, 1.62, 2.08],
      look: POI_YOU.clone().lerp(POI_BUS, 0.35),
      fov: 33,
      posDamp: 0.06,
      lookDamp: 0.12,
    }

    const shotFollowYou = {
      pos: [3.05, 2.02, 4.65],
      look: POI_YOU,
      fov: 38,
      posDamp: 0.06,
      lookDamp: 0.11,
    }

    const shotBusLeave = {
      pos: [5.05, 2.3, 7.95],
      look: POI_BUS,
      fov: 44,
      posDamp: 0.05,
      lookDamp: 0.09,
    }

    let s = shotGeneral
    if (phase === 0) s = shotLateral
    if (phase === 1) s = shotSitClose
    if (phase === 2) s = shotDialogue
    if (phase === 3) s = shotBusArrive
    if (phase === 4) s = shotFollowGirl
    if (phase === 5) s = shotBusArrive
    if (phase === 6) s = shotDecision
    if (phase === 7) s = shotFollowYou
    if (phase === 8) s = shotBusArrive
    if (phase === 9) s = shotBusLeave
    if (phase >= 10) s = shotGeneral

    targetPos.current.set(...s.pos)
    targetLook.current.copy(s.look)

    camera.position.lerp(
      new THREE.Vector3(targetPos.current.x + sx, targetPos.current.y + sy, targetPos.current.z + sz),
      s.posDamp
    )
    smoothLook.current.lerp(targetLook.current, s.lookDamp)
    camera.lookAt(smoothLook.current)

    camera.fov = THREE.MathUtils.lerp(camera.fov, s.fov, 0.06)
    camera.updateProjectionMatrix()
  })

  return null
}

/* =========================================================
   ESCENA PRINCIPAL (SOLO 3D)
========================================================= */
export default function UnschScene3D({ onNext, setHud, setShowTitleCard }) {
  const [phase, setPhase] = useState(0)
  const [step, setStep] = useState(0)

  const youRef = useRef()
  const girlRef = useRef()
  const busRef = useRef()

  const dialogue = useMemo(
    () => [
      { who: "Ella", text: "Disculpa… ¿sabes hasta qué hora pasa la ruta 9 o 10?" },
      { who: "Tú", text: "Hasta las 9 creo…" },
      { who: "Ella", text: "Ya… gracias, joven." },
      { who: "Narrador", text: "Y ahí… sin saberlo, todo empezó." },
    ],
    []
  )
  const current = dialogue[Math.min(step, dialogue.length - 1)]

  useEffect(() => {
    if (!setHud) return

    if (phase < 2) {
      setHud({
        who: "Narrador",
        text:
          phase === 0
            ? "Sales de la UNSCH… Ella está sentada mirándote, al frente."
            : "Te sientas a su lado… sosteniendo tu cel.",
      })
      return
    }

    if (phase === 2) {
      setHud({ who: current.who, text: current.text })
      return
    }

    const map = {
      3: { who: "Narrador", text: "La ruta llega… y la noche se ilumina un poco." },
      4: { who: "Ella", text: "“Ya llegó…”" },
      5: { who: "Narrador", text: "Ella sube… y el mundo se queda en pausa un instante." },
      6: { who: "Narrador", text: "Tú te quedas un segundo… el corazón te empuja." },
      7: { who: "Narrador", text: "Te levantas y caminas hacia la ruta." },
      8: { who: "Narrador", text: "Subes…" },
      9: { who: "Narrador", text: "La ruta se va… y algo nace sin que lo notes." },
      10: { who: "Narrador", text: "Ahí comenzó todo." },
    }

    setHud(map[phase] || { who: "Narrador", text: "" })
  }, [phase, current.who, current.text, setHud])

  useEffect(() => {
    if (phase !== 2) return
    const timing = [3200, 2400, 2200, 2600]
    const wait = timing[Math.min(step, timing.length - 1)]
    const t = setTimeout(() => setStep((s) => Math.min(dialogue.length - 1, s + 1)), wait)
    return () => clearTimeout(t)
  }, [phase, step, dialogue.length])

  useEffect(() => {
    if (phase !== 2) return
    if (step < dialogue.length - 1) return
    const t = setTimeout(() => setPhase(3), 1700)
    return () => clearTimeout(t)
  }, [phase, step, dialogue.length])

  useEffect(() => {
    setShowTitleCard?.(phase >= 10)
  }, [phase, setShowTitleCard])

  useEffect(() => {
    if (phase < 10) return
    const t = setTimeout(() => onNext?.(), 2200)
    return () => clearTimeout(t)
  }, [phase, onNext])

  return (
    <>
      <CinematicCamera phase={phase} youRef={youRef} girlRef={girlRef} busRef={busRef} />
      <World phase={phase} onPhaseChange={setPhase} youRef={youRef} girlRef={girlRef} busRef={busRef} />
    </>
  )
}

/* =========================================================
   WORLD + ESTÉTICA WOW
========================================================= */

function makeNightDomeTexture() {
  const c = document.createElement("canvas")
  c.width = 1024
  c.height = 1024
  const ctx = c.getContext("2d")

  // gradient noche
  const g = ctx.createLinearGradient(0, 0, 0, c.height)
  g.addColorStop(0, "#050717")
  g.addColorStop(0.55, "#070a1e")
  g.addColorStop(1, "#02020a")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)

  // nebulosa suave
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * c.width
    const y = Math.random() * c.height
    const r = 160 + Math.random() * 260
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r)
    gg.addColorStop(0, "rgba(255,120,190,0.08)")
    gg.addColorStop(0.6, "rgba(120,160,255,0.05)")
    gg.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // estrellas pequeñas
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * c.width
    const y = Math.random() * c.height
    const a = Math.random() * 0.7
    const s = Math.random() < 0.96 ? 1 : 2
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.fillRect(x, y, s, s)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

function LightCone({ position = [0, 0, 0], height = 2.8, radius = 1.25, opacity = 0.22 }) {
  return (
    <mesh position={position} rotation={[Math.PI, 0, 0]} renderOrder={2}>
      <coneGeometry args={[radius, height, 28, 1, true]} />
      <meshBasicMaterial
        color="#ffd7aa"
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function MistLayer({ y = 0.15, z = 0.0, width = 14, height = 3.5, speed = 0.08, opacity = 0.12 }) {
  const ref = useRef()
  const tex = useMemo(() => {
    const c = document.createElement("canvas")
    c.width = 512
    c.height = 256
    const ctx = c.getContext("2d")
    ctx.clearRect(0, 0, c.width, c.height)

    // fog gradient
    const g = ctx.createLinearGradient(0, 0, c.width, 0)
    g.addColorStop(0, "rgba(255,255,255,0)")
    g.addColorStop(0.35, "rgba(255,255,255,0.6)")
    g.addColorStop(0.65, "rgba(255,255,255,0.6)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, c.width, c.height)

    // noise
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * c.width
      const y = Math.random() * c.height
      const a = Math.random() * 0.12
      ctx.fillStyle = `rgba(0,0,0,${a})`
      ctx.fillRect(x, y, 1, 1)
    }

    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(2.2, 1)
    t.needsUpdate = true
    return t
  }, [])

  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.material.map.offset.x += dt * speed
  })

  return (
    <mesh ref={ref} position={[0, y, z]} rotation={[-0.05, 0, 0]} renderOrder={1}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#b7ccff"
      />
    </mesh>
  )
}

function World({ phase, onPhaseChange, youRef, girlRef, busRef }) {
  const START = { x: -0.8, y: -0.25, z: -5.2 }
  const WALK_TO = { x: -0.75, y: -0.25, z: 0.15 }
  const SIT_AT = { x: -0.75, y: -0.45, z: 0.25 }

  const GIRL_SIT = { x: 0.15, y: -0.45, z: 0.25 }
  const GIRL_FACE_Y = Math.PI

  const BUS_START = { x: 7.5, y: -0.55, z: 3.8 }
  const BUS_STOP = { x: 3.8, y: -0.55, z: 2.2 }
  const BUS_LEAVE = { x: 10.5, y: -0.55, z: 3.0 }

  const GIRL_STAND = { x: 0.15, y: -0.25, z: 0.35 }
  const GIRL_WALK_TO_BUS = { x: 3.15, y: -0.25, z: 1.95 }
  const YOU_WALK_TO_BUS = { x: 2.75, y: -0.25, z: 2.05 }

  const anim = useRef({
    posYou: { ...START },
    sitLerp: 0,
    youStandLerp: 0,
    youWalkLerp: 0,
    youBoardLerp: 0,

    girlStandLerp: 0,
    girlWalkLerp: 0,
    girlBoardLerp: 0,

    busT: 0,
    busPos: { ...BUS_START },

    lock: false,
  })

  const domeTex = useMemo(() => makeNightDomeTexture(), [])

  const warmKeyRef = useRef()
  const coolFillRef = useRef()
  const busHeadRef1 = useRef()
  const busHeadRef2 = useRef()
  const lampRef = useRef()

  useEffect(() => {
    if (youRef.current) {
      youRef.current.position.set(START.x, START.y, START.z)
      youRef.current.rotation.set(0, 0, 0)
      youRef.current.visible = true
    }
    if (girlRef.current) {
      girlRef.current.position.set(GIRL_SIT.x, GIRL_SIT.y, GIRL_SIT.z)
      girlRef.current.rotation.set(0, GIRL_FACE_Y, 0)
      girlRef.current.visible = true
    }
    if (busRef.current) {
      busRef.current.position.set(BUS_START.x, BUS_START.y, BUS_START.z)
      busRef.current.visible = false
    }
  }, []) // eslint-disable-line

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.033)
    const tt = state.clock.elapsedTime

    // --- luces con dramatismo según fase ---
    const intimate = phase >= 1 && phase <= 2
    const busMoment = phase >= 3 && phase <= 9

    if (lampRef.current) {
      lampRef.current.intensity = lerp(lampRef.current.intensity, intimate ? 1.65 : 1.25, 0.06)
      lampRef.current.distance = lerp(lampRef.current.distance, 10.5, 0.05)
    }
    if (warmKeyRef.current) {
      const target = intimate ? 0.85 : 0.55
      warmKeyRef.current.intensity = lerp(warmKeyRef.current.intensity, target + Math.sin(tt * 0.6) * 0.03, 0.06)
    }
    if (coolFillRef.current) {
      coolFillRef.current.intensity = lerp(coolFillRef.current.intensity, busMoment ? 0.55 : 0.38, 0.05)
    }

    const headTarget = busMoment ? 2.2 : 0.0
    if (busHeadRef1.current) busHeadRef1.current.intensity = lerp(busHeadRef1.current.intensity, headTarget, 0.08)
    if (busHeadRef2.current) busHeadRef2.current.intensity = lerp(busHeadRef2.current.intensity, headTarget, 0.08)

    // --- animaciones de tu guion (igual que antes) ---
    if (phase === 0) {
      const speed = 1.15
      const dz = WALK_TO.z - anim.current.posYou.z
      const stepZ = Math.sign(dz) * speed * dt
      if (Math.abs(dz) > 0.02) anim.current.posYou.z += stepZ
      else anim.current.posYou.z = WALK_TO.z

      const dx = WALK_TO.x - anim.current.posYou.x
      anim.current.posYou.x += dx * 0.06

      if (youRef.current) {
        youRef.current.position.set(anim.current.posYou.x, anim.current.posYou.y, anim.current.posYou.z)
        youRef.current.rotation.y = lerp(youRef.current.rotation.y, 0.0, 0.08)
      }

      if (girlRef.current) girlRef.current.rotation.y = lerp(girlRef.current.rotation.y, GIRL_FACE_Y, 0.06)

      if (Math.abs(anim.current.posYou.z - WALK_TO.z) < 0.03 && !anim.current.lock) {
        anim.current.lock = true
        onPhaseChange(1)
      }
    }

    if (phase === 1) {
      anim.current.lock = false
      anim.current.sitLerp = clamp01(anim.current.sitLerp + dt * 0.85)

      const x = lerp(WALK_TO.x, SIT_AT.x, anim.current.sitLerp)
      const y = lerp(WALK_TO.y, SIT_AT.y, anim.current.sitLerp)
      const z = lerp(WALK_TO.z, SIT_AT.z, anim.current.sitLerp)

      if (youRef.current) {
        youRef.current.position.set(x, y, z)
        youRef.current.rotation.x = lerp(youRef.current.rotation.x, 0.12, 0.06)
        youRef.current.rotation.y = lerp(youRef.current.rotation.y, 0.22, 0.06)
      }

      if (anim.current.sitLerp >= 1 && !anim.current.lock) {
        anim.current.lock = true
        onPhaseChange(2)
      }
    }

    if (phase === 3) {
      anim.current.busT = clamp01(anim.current.busT + dt * 0.28)
      anim.current.busPos.x = lerp(BUS_START.x, BUS_STOP.x, anim.current.busT)
      anim.current.busPos.z = lerp(BUS_START.z, BUS_STOP.z, anim.current.busT)

      if (busRef.current) {
        busRef.current.visible = true
        busRef.current.position.set(anim.current.busPos.x, BUS_STOP.y, anim.current.busPos.z)
        busRef.current.rotation.y = lerp(busRef.current.rotation.y, -0.4, 0.05)
      }

      if (anim.current.busT >= 1) onPhaseChange(4)
    }

    if (phase === 4) {
      anim.current.girlStandLerp = clamp01(anim.current.girlStandLerp + dt * 0.9)

      const gx = lerp(GIRL_SIT.x, GIRL_STAND.x, anim.current.girlStandLerp)
      const gy = lerp(GIRL_SIT.y, GIRL_STAND.y, anim.current.girlStandLerp)
      const gz = lerp(GIRL_SIT.z, GIRL_STAND.z, anim.current.girlStandLerp)

      if (anim.current.girlStandLerp > 0.92) anim.current.girlWalkLerp = clamp01(anim.current.girlWalkLerp + dt * 0.35)

      const wx = lerp(gx, GIRL_WALK_TO_BUS.x, anim.current.girlWalkLerp)
      const wy = lerp(gy, GIRL_WALK_TO_BUS.y, anim.current.girlWalkLerp)
      const wz = lerp(gz, GIRL_WALK_TO_BUS.z, anim.current.girlWalkLerp)

      if (girlRef.current) {
        girlRef.current.position.set(wx, wy, wz)
        girlRef.current.rotation.y = lerp(girlRef.current.rotation.y, -0.45, 0.06)
        const bob = Math.sin(tt * 4.2) * 0.03 * anim.current.girlWalkLerp
        girlRef.current.position.y = wy + bob
      }

      if (anim.current.girlWalkLerp >= 1) onPhaseChange(5)
    }

    if (phase === 5) {
      anim.current.girlBoardLerp = clamp01(anim.current.girlBoardLerp + dt * 0.6)

      if (girlRef.current && busRef.current) {
        const towardBus = busRef.current.position
        girlRef.current.position.lerp(towardBus, anim.current.girlBoardLerp * 0.35)
        girlRef.current.position.y = lerp(girlRef.current.position.y, girlRef.current.position.y + 0.6, anim.current.girlBoardLerp)
      }

      if (anim.current.girlBoardLerp >= 1) {
        if (girlRef.current) girlRef.current.visible = false
        setTimeout(() => onPhaseChange(6), 900)
      }
    }

    if (phase === 6) {
      anim.current.youStandLerp = clamp01(anim.current.youStandLerp + dt * 0.9)
      const standY = lerp(SIT_AT.y, -0.25, anim.current.youStandLerp)

      if (youRef.current) {
        youRef.current.position.y = standY
        youRef.current.rotation.x = lerp(youRef.current.rotation.x, 0, 0.08)
        youRef.current.rotation.y = lerp(youRef.current.rotation.y, -0.45, 0.06)
      }

      if (anim.current.youStandLerp >= 1) onPhaseChange(7)
    }

    if (phase === 7) {
      anim.current.youWalkLerp = clamp01(anim.current.youWalkLerp + dt * 0.42)

      const tx = lerp(SIT_AT.x, YOU_WALK_TO_BUS.x, anim.current.youWalkLerp)
      const tz = lerp(SIT_AT.z, YOU_WALK_TO_BUS.z, anim.current.youWalkLerp)

      if (youRef.current) {
        youRef.current.position.x = tx
        youRef.current.position.z = tz
        const bob = Math.sin(tt * 4.2) * 0.03
        youRef.current.position.y = -0.25 + bob
        youRef.current.rotation.y = lerp(youRef.current.rotation.y, -0.45, 0.08)
      }

      if (anim.current.youWalkLerp >= 1) onPhaseChange(8)
    }

    if (phase === 8) {
      anim.current.youBoardLerp = clamp01(anim.current.youBoardLerp + dt * 0.72)

      if (youRef.current && busRef.current) {
        const towardBus = busRef.current.position
        youRef.current.position.lerp(towardBus, anim.current.youBoardLerp * 0.42)
        youRef.current.position.y = lerp(youRef.current.position.y, youRef.current.position.y + 0.7, anim.current.youBoardLerp)
      }

      if (anim.current.youBoardLerp >= 1) {
        if (youRef.current) youRef.current.visible = false
        setTimeout(() => onPhaseChange(9), 800)
      }
    }

    if (phase === 9) {
      anim.current.busPos.x = lerp(anim.current.busPos.x, BUS_LEAVE.x, dt * 0.5)
      anim.current.busPos.z = lerp(anim.current.busPos.z, BUS_LEAVE.z, dt * 0.35)
      if (busRef.current) busRef.current.position.set(anim.current.busPos.x, BUS_STOP.y, anim.current.busPos.z)
      if (anim.current.busPos.x > 9.5) onPhaseChange(10)
    }
  })

  return (
    <>
      {/* Noche romántica */}
      <color attach="background" args={["#050712"]} />
      <fog attach="fog" args={["#050712", 7, 22]} />

      {/* Dome pintado (nebula) */}
      <mesh scale={120}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial map={domeTex} side={THREE.BackSide} />
      </mesh>

      {/* Estrellas extra */}
      <Stars radius={120} depth={60} count={2400} factor={4} saturation={0} fade speed={0.22} />

      {/* Luces cine */}
      <ambientLight intensity={0.12} />
      <directionalLight
        castShadow
        position={[6, 10, 6]}
        intensity={0.45}
        color="#8fb6ff"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight ref={warmKeyRef} position={[0, 2.4, 1.2]} intensity={0.65} distance={10} decay={2} color="#ffcf8a" />
      <pointLight ref={coolFillRef} position={[0, 1.2, -4.8]} intensity={0.38} distance={12} decay={2} color="#a6c7ff" />

      {/* Suelo */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#07102a" roughness={0.96} metalness={0.04} />
      </mesh>

      {/* Vía */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.79, 2.2]}>
        <planeGeometry args={[70, 10]} />
        <meshStandardMaterial color="#05081a" roughness={0.98} metalness={0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.785, 2.2]}>
        <planeGeometry args={[45, 0.12]} />
        <meshStandardMaterial color="#c4c4c4" roughness={0.72} metalness={0.06} />
      </mesh>

      {/* Edificio */}
      <mesh castShadow receiveShadow position={[0, 0.0, -6]}>
        <boxGeometry args={[8.5, 3.2, 1.2]} />
        <meshStandardMaterial color="#101a33" roughness={0.86} metalness={0.05} />
      </mesh>

      {/* Ventanas glow */}
      <mesh position={[0, 0.35, -5.35]}>
        <planeGeometry args={[6.8, 1.8]} />
        <meshStandardMaterial color="#ffd39a" emissive="#ffb657" emissiveIntensity={1.55} />
      </mesh>

      {/* Farola + cone + sparkles */}
      <group position={[0, -0.8, 1.2]}>
        <mesh castShadow position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 2.7, 18]} />
          <meshStandardMaterial color="#131a31" roughness={0.6} metalness={0.25} />
        </mesh>

        <mesh position={[0, 2.6, 0]}>
          <sphereGeometry args={[0.13, 18, 18]} />
          <meshStandardMaterial color="#ffcf8a" emissive="#ffcf8a" emissiveIntensity={1.8} />
        </mesh>

        <pointLight ref={lampRef} position={[0, 2.6, 0]} intensity={1.35} distance={11} decay={2} color="#ffcf8a" />

        <LightCone position={[0, 2.55, 0]} height={3.2} radius={1.45} opacity={0.18} />

        <Sparkles count={26} speed={0.25} size={2.2} scale={[2.8, 1.2, 2.8]} position={[0, 1.8, 0]} opacity={0.55} />
      </group>

      {/* Niebla sutil (capas) */}
      <MistLayer y={0.15} z={-0.2} width={16} height={3.2} speed={0.05} opacity={0.10} />
      <MistLayer y={0.35} z={1.2} width={18} height={3.6} speed={0.08} opacity={0.09} />
      <MistLayer y={0.55} z={2.2} width={22} height={4.2} speed={0.10} opacity={0.07} />

      {/* Bancas */}
      <Bench position={[-2.2, -0.4, 0.2]} />
      <Bench position={[2.2, -0.4, 0.2]} />

      {/* Personajes */}
      <Character refObj={girlRef} position={[0.15, -0.45, 0.25]} sitting color="#ff8bd4" />
      <Character refObj={youRef} sitting={phase >= 1} color="#7bb6ff" phone />

      {/* Bus + headlights */}
      <Bus refObj={busRef} />
      <pointLight ref={busHeadRef1} position={[3.6, 0.0, 2.55]} intensity={0} distance={9} decay={2} color="#ffd6b6" />
      <pointLight ref={busHeadRef2} position={[3.6, 0.0, 1.85]} intensity={0} distance={9} decay={2} color="#ffd6b6" />

      {/* Glow de faros (fake) */}
      <mesh position={[3.65, -0.25, 2.55]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.35, 22]} />
        <meshBasicMaterial color="#ffd6b6" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[3.65, -0.25, 1.85]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.35, 22]} />
        <meshBasicMaterial color="#ffd6b6" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  )
}

/* =========================================================
   OBJETOS
========================================================= */
function Bench({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[2.6, 0.2, 0.7]} />
        <meshStandardMaterial color="#2a3a66" roughness={0.72} metalness={0.06} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.45, -0.28]}>
        <boxGeometry args={[2.6, 0.8, 0.15]} />
        <meshStandardMaterial color="#22345f" roughness={0.78} metalness={0.05} />
      </mesh>

      <mesh castShadow receiveShadow position={[-1.1, -0.35, 0]}>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color="#141c33" roughness={0.62} metalness={0.18} />
      </mesh>
      <mesh castShadow receiveShadow position={[1.1, -0.35, 0]}>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshStandardMaterial color="#141c33" roughness={0.62} metalness={0.18} />
      </mesh>
    </group>
  )
}

function Bus({ refObj }) {
  return (
    <group ref={refObj} visible={false}>
      <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[2.45, 1.05, 1.05]} />
        <meshStandardMaterial color="#1b2a4a" roughness={0.62} metalness={0.16} />
      </mesh>

      <mesh position={[0, 0.35, 0.53]}>
        <planeGeometry args={[2.15, 0.58]} />
        <meshStandardMaterial color="#8fb6ff" emissive="#8fb6ff" emissiveIntensity={0.65} />
      </mesh>

      <mesh position={[1.23, 0.25, 0.25]}>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshStandardMaterial color="#ffd9a8" emissive="#ffd9a8" emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[1.23, 0.25, -0.25]}>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshStandardMaterial color="#ffd9a8" emissive="#ffd9a8" emissiveIntensity={2.4} />
      </mesh>
    </group>
  )
}

function Character({ refObj, position = [0, 0, 0], sitting = false, color = "#fff", phone = false }) {
  return (
    <group ref={refObj} position={position} rotation={[0, sitting ? 0.25 : 0, 0]}>
      <mesh castShadow position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[0.35, 0.55, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0.23, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.35, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[-0.23, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.35, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>

      {phone && (
        <mesh castShadow position={[0.3, 0.4, 0.08]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.08, 0.14, 0.02]} />
          <meshStandardMaterial color="#0d0f18" roughness={0.35} metalness={0.25} />
        </mesh>
      )}

      <mesh castShadow position={[0.11, sitting ? 0.15 : 0.08, sitting ? 0.18 : 0]}>
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshStandardMaterial color="#0f1528" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[-0.11, sitting ? 0.15 : 0.08, sitting ? 0.18 : 0]}>
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshStandardMaterial color="#0f1528" roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  )
}

/* =========================================================
   HELPERS
========================================================= */
function lerp(a, b, t) {
  return a + (b - a) * t
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x))
}