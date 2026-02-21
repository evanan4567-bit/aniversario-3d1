import React, { useEffect, useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Stars, Sparkles, useTexture } from "@react-three/drei"
import * as THREE from "three"
import { MEMORY_ASSETS } from "../data/memoriesManifest"

/* =========================================================
   CONFIG
========================================================= */

const FALLBACK_IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5nW3cAAAAASUVORK5CYII="

const CFG = {
  buildStart: 1.2,
  perMemory: 1.0, // ~1 recuerdo por segundo
  approach: 0.22,
  hold: 0.55,
  place: 0.20,
  gap: 0.03,

  // finales
  afterBuildPause: 0.7,
  teAmoDuration: 2.2,
  anniversaryDuration: 12.0,
  fadeOutDuration: 3.2,

  // performance
  maxDpr: 2.0,
  minDpr: 1.0,

  // look
  heartScale: 2.65,
}

/* =========================================================
   UTILS
========================================================= */

function clamp01(x) {
  return Math.min(1, Math.max(0, x))
}
function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
function easeOutCubic(t) {
  t = clamp01(t)
  return 1 - Math.pow(1 - t, 3)
}
function easeInOutCubic(t) {
  t = clamp01(t)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function lerp(a, b, t) {
  return a + (b - a) * t
}
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function setTextureColorSpaceOrEncoding(tex) {
  if (!tex) return
  if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace
  else if ("encoding" in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding
  tex.anisotropy = 4
  tex.needsUpdate = true
}

function fileBase(url) {
  try {
    const f = (url || "").split("/").pop() || ""
    return f.replace(/\.(jpg|jpeg|png|webp|mp4|mov|m4v)$/i, "")
  } catch {
    return ""
  }
}
function prettyCaptionFromUrl(url) {
  const b = fileBase(url)
  const nice = b.replace(/[_-]+/g, " ").trim()
  if (!nice) return "este recuerdo"
  return nice.charAt(0).toUpperCase() + nice.slice(1)
}
function narrationForAsset(asset) {
  const base = fileBase(asset?.url || "").toLowerCase()
  const pick = (a, b) => ({ a, b })

  if (base.includes("anillos")) return pick("Esa promesa…", "me hizo creer en el para siempre.")
  if (base.includes("abrazo")) return pick("En tu abrazo…", "hasta lo simple se siente como hogar.")
  if (base.includes("ano_nuevo") || base.includes("año")) return pick("En ese inicio…", "yo también empecé a amarte más.")
  if (base.includes("catedral")) return pick("Entre luces y caminos…", "mi destino siempre fue encontrarte.")
  if (base.includes("dibujo")) return pick("Te dibujé en el alma…", "porque tú ya vivías en mí.")
  if (base.includes("manos")) return pick("Tus manos…", "son mi lugar seguro.")
  if (base.includes("navidad")) return pick("En esa noche…", "mi deseo fue simple: tú.")
  if (base.includes("ojos")) return pick("En tu mirada…", "yo me quedé para siempre.")
  if (base.includes("nosotros")) return pick("Nosotros…", "una historia que se sigue escribiendo.")
  if (base.includes("comienzo")) return pick("Ahí empezó…", "lo más bonito que me ha pasado.")
  if (base.includes("curame")) return pick("Tú me curas…", "sin decir nada… solo estando.")
  if (base.includes("enfocandote")) return pick("Y si te enfoco…", "es porque eres mi lugar favorito.")
  if (base.includes("imprevisto")) return pick("Hasta lo inesperado…", "contigo se vuelve bonito.")
  if (base.includes("pintar")) return pick("Contigo…", "la vida se pinta mejor.")
  if (base.includes("pista")) return pick("En ese instante…", "mi corazón aprendió a bailar contigo.")

  const cap = asset?.caption || prettyCaptionFromUrl(asset?.url)
  return pick(`Mira… ${cap}.`, "Y aun así… te elijo hoy, mañana y siempre.")
}

/* =========================================================
   HEART SLOTS
========================================================= */

function heartOutlinePoints(count = 240, scale = 2.6) {
  const pts = []
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      1 * Math.cos(4 * t)
    pts.push(new THREE.Vector3((x / 18) * scale, (y / 18) * scale, 0))
  }
  return pts
}

function makeSlotsForCount(n, { scale = 2.65, seed = 2026 } = {}) {
  const rng = mulberry32(seed)
  const outline = heartOutlinePoints(Math.max(240, n * 10), scale)

  const border = []
  for (let i = 0; i < outline.length; i += 2) {
    const p = outline[i].clone()
    p.z = i % 4 === 0 ? 0.16 : -0.14
    border.push(p)
  }

  const fill = []
  const fillCount = Math.max(220, n * 14)
  for (let i = 0; i < fillCount; i++) {
    const idx = Math.floor(rng() * outline.length)
    const edge = outline[idx].clone()
    const k = lerp(0.18, 0.95, rng())
    edge.multiplyScalar(k)
    edge.z = lerp(-0.22, 0.22, rng())
    fill.push(edge)
  }

  // shuffle fill
  for (let i = fill.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[fill[i], fill[j]] = [fill[j], fill[i]]
  }

  const borderTake = Math.min(border.length, Math.max(8, Math.round(n * 0.45)))
  const fillTake = Math.max(0, n - borderTake)

  const pickedBorder = []
  const step = Math.max(1, Math.floor(border.length / borderTake))
  for (let i = 0; i < borderTake; i++) pickedBorder.push(border[(i * step) % border.length])

  const slots = [...pickedBorder, ...fill.slice(0, fillTake)]
  slots.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))
  return slots
}

/* =========================================================
   CANVAS TEXTURES (SIGN + LETTER)
========================================================= */

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ")
  let line = ""
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " "
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y)
      line = words[n] + " "
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y)
  return y + lineHeight
}

function makeSignTexture({ title, subtitle, w = 1600, h = 700 }) {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")

  // bg
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, "#2a1024")
  g.addColorStop(1, "#0b0612")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // border
  ctx.strokeStyle = "rgba(255,210,235,0.40)"
  ctx.lineWidth = 18
  ctx.strokeRect(22, 22, w - 44, h - 44)

  // glow dots
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const a = 0.06 + Math.random() * 0.18
    ctx.fillStyle = `rgba(255,230,244,${a})`
    ctx.fillRect(x, y, 2, 2)
  }

  // text
  ctx.textAlign = "center"
  ctx.fillStyle = "#ffe6f4"
  ctx.shadowColor = "rgba(0,0,0,0.45)"
  ctx.shadowBlur = 18

  ctx.font = "900 112px serif"
  ctx.fillText(title, w / 2, 300)

  if (subtitle) {
    ctx.shadowBlur = 10
    ctx.fillStyle = "rgba(255,255,255,0.88)"
    ctx.font = "700 54px serif"
    ctx.fillText(subtitle, w / 2, 420)
  }

  const tex = new THREE.CanvasTexture(c)
  setTextureColorSpaceOrEncoding(tex)
  return tex
}

function makeLetterTexture(lines) {
  const c = document.createElement("canvas")
  c.width = 1600
  c.height = 1000
  const ctx = c.getContext("2d")

  // paper base
  ctx.fillStyle = "#f4ead8"
  ctx.fillRect(0, 0, c.width, c.height)

  // soft vignette
  const vg = ctx.createRadialGradient(800, 520, 200, 800, 520, 920)
  vg.addColorStop(0, "rgba(255,255,255,0.00)")
  vg.addColorStop(1, "rgba(0,0,0,0.14)")
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, c.width, c.height)

  // border
  ctx.strokeStyle = "rgba(0,0,0,0.15)"
  ctx.lineWidth = 16
  ctx.strokeRect(30, 30, c.width - 60, c.height - 60)

  // grain
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * c.width
    const y = Math.random() * c.height
    const a = 0.015 + Math.random() * 0.03
    ctx.fillStyle = `rgba(0,0,0,${a})`
    ctx.fillRect(x, y, 2, 2)
  }

  // text
  ctx.shadowColor = "rgba(0,0,0,0.08)"
  ctx.shadowBlur = 6
  ctx.fillStyle = "#2a2a2a"
  ctx.textAlign = "left"

  ctx.font = "700 72px serif"
  ctx.fillText("Mi amor,", 120, 170)

  ctx.font = "56px serif"
  let y = 280
  const marginX = 120
  const maxW = c.width - marginX * 2
  const lh = 76

  for (const line of lines) {
    y = wrapText(ctx, line, marginX, y, maxW, lh) + 18
  }

  ctx.font = "700 58px serif"
  ctx.fillStyle = "rgba(42,42,42,0.95)"
  ctx.fillText("— Con amor, siempre.", marginX, c.height - 110)

  const tex = new THREE.CanvasTexture(c)
  setTextureColorSpaceOrEncoding(tex)
  return tex
}

/* =========================================================
   BACKGROUND TEXTURES
========================================================= */

function makeRomanticDomeTexture() {
  const c = document.createElement("canvas")
  c.width = 1024
  c.height = 1024
  const ctx = c.getContext("2d")

  const g = ctx.createLinearGradient(0, 0, 0, c.height)
  g.addColorStop(0, "#070317")
  g.addColorStop(0.55, "#07051a")
  g.addColorStop(1, "#02010a")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)

  // nebula
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * c.width
    const y = Math.random() * c.height
    const r = 160 + Math.random() * 360
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r)
    gg.addColorStop(0, "rgba(255,110,185,0.10)")
    gg.addColorStop(0.55, "rgba(130,170,255,0.06)")
    gg.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // stars
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * c.width
    const y = Math.random() * c.height
    const a = Math.random() * 0.75
    const s = Math.random() < 0.96 ? 1 : 2
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.fillRect(x, y, s, s)
  }

  const tex = new THREE.CanvasTexture(c)
  setTextureColorSpaceOrEncoding(tex)
  return tex
}

function makeGlowTexture({ size = 512, inner = "rgba(255,120,190,0.65)", mid = "rgba(255,120,190,0.16)" } = {}) {
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const ctx = c.getContext("2d")
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.35, mid)
  g.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  setTextureColorSpaceOrEncoding(t)
  return t
}

/* =========================================================
   FADE PLANE
========================================================= */

function FadePlane({ opacityRef }) {
  const ref = useRef()
  const matRef = useRef()
  const { camera } = useThree()

  useFrame(() => {
    if (!ref.current || !matRef.current) return
    ref.current.position.copy(camera.position)
    ref.current.quaternion.copy(camera.quaternion)
    ref.current.translateZ(-0.62)
    matRef.current.opacity = opacityRef.current
  })

  return (
    <mesh ref={ref} renderOrder={9999}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial ref={matRef} color="black" transparent opacity={1} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

/* =========================================================
   VIDEO TEXTURE (solo cuando está focused)
========================================================= */

function useVideoTexture(url, enabled) {
  const [tex, setTex] = useState(null)

  useEffect(() => {
    if (!enabled || !url) {
      setTex(null)
      return
    }

    const video = document.createElement("video")
    video.src = url
    video.crossOrigin = "anonymous"
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.preload = "auto"

    const texture = new THREE.VideoTexture(video)
    setTextureColorSpaceOrEncoding(texture)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false

    const tryPlay = async () => {
      try {
        await video.play()
      } catch {
        // ok
      }
    }
    tryPlay()

    setTex(texture)

    return () => {
      try {
        video.pause()
      } catch {}
      try {
        video.removeAttribute("src")
        video.load()
      } catch {}
      texture.dispose()
    }
  }, [url, enabled])

  return tex
}

/* =========================================================
   MEMORY CARD (sale al frente -> se integra al corazón)
========================================================= */

function MemoryCard({ asset, thumbUrl, slotPos, startPos, schedule, timeRef, focused }) {
  const groupRef = useRef()
  const frameMatRef = useRef()
  const imgMatRef = useRef()

  const thumbTex = useTexture(thumbUrl || FALLBACK_IMG)
  useEffect(() => {
    if (!thumbTex) return
    setTextureColorSpaceOrEncoding(thumbTex)
    thumbTex.minFilter = THREE.LinearMipMapLinearFilter
    thumbTex.magFilter = THREE.LinearFilter
  }, [thumbTex])

  const videoTex = useVideoTexture(asset?.type === "video" ? asset.url : null, focused)
  const mapTex = asset?.type === "video" ? (videoTex || thumbTex) : thumbTex

  const rnd = useMemo(() => {
    const rng = mulberry32(7000 + schedule.seed * 97)
    return {
      tiltX: (rng() - 0.5) * 0.16,
      tiltY: (rng() - 0.5) * 0.28,
      tiltZ: (rng() - 0.5) * 0.12,
      floatAmp: 0.025 + rng() * 0.045,
      floatSpd: 1.0 + rng() * 1.2,
    }
  }, [schedule.seed])

  const tmp = useMemo(() => ({ p: new THREE.Vector3(), p2: new THREE.Vector3() }), [])

  useFrame((state, dt) => {
    const g = groupRef.current
    const fm = frameMatRef.current
    const im = imgMatRef.current
    if (!g || !fm || !im) return

    const t = timeRef.current
    const { t0, t1, t2, t3, approach, hold, place } = schedule

    if (t < t0) {
      g.visible = false
      return
    }
    g.visible = true

    const hero = tmp.p.set(0, 1.62, 2.25)

    if (t < t1) {
      const u = easeInOutCubic((t - t0) / approach)
      tmp.p2.lerpVectors(startPos, hero, u)
      g.position.copy(tmp.p2)

      const s = lerp(0.0, 1.55, easeOutCubic(u))
      g.scale.setScalar(s)

      im.opacity = lerp(im.opacity, u, 1 - Math.pow(0.001, dt))
      fm.opacity = lerp(fm.opacity, u, 1 - Math.pow(0.001, dt))
      g.rotation.set(0, 0, 0)
    } else if (t < t2) {
      const u = clamp01((t - t1) / hold)
      const tt = state.clock.elapsedTime

      const sway = 0.14 * Math.sin(tt * 0.70 + schedule.seed)
      g.position.set(
        hero.x + sway,
        hero.y + Math.sin(tt * rnd.floatSpd + schedule.seed) * rnd.floatAmp,
        hero.z + Math.cos(tt * 0.55 + schedule.seed) * 0.05
      )

      const heroS = lerp(1.55, 1.64, smoothstep(0.0, 0.6, u))
      g.scale.setScalar(heroS)

      g.rotation.y = Math.sin(tt * 0.55) * 0.20
      g.rotation.x = Math.sin(tt * 0.45 + schedule.seed) * 0.06
      g.rotation.z = Math.sin(tt * 0.65 + schedule.seed) * 0.04

      im.opacity = lerp(im.opacity, 1.0, 1 - Math.pow(0.001, dt))
      fm.opacity = lerp(fm.opacity, 1.0, 1 - Math.pow(0.001, dt))
    } else if (t < t3) {
      const u = easeInOutCubic((t - t2) / place)
      tmp.p2.lerpVectors(hero, slotPos, u)
      g.position.copy(tmp.p2)

      const s = lerp(1.62, 1.05, u)
      g.scale.setScalar(s)

      g.rotation.x = lerp(g.rotation.x, rnd.tiltX, 1 - Math.pow(0.001, dt))
      g.rotation.y = lerp(g.rotation.y, rnd.tiltY, 1 - Math.pow(0.001, dt))
      g.rotation.z = lerp(g.rotation.z, rnd.tiltZ, 1 - Math.pow(0.001, dt))
    } else {
      const tt = state.clock.elapsedTime
      const beat = 0.5 + 0.5 * Math.sin(tt * 2.2)
      g.position.copy(slotPos)
      g.scale.setScalar(1.05 * (1 + beat * 0.010))
      g.rotation.x = lerp(g.rotation.x, rnd.tiltX, 0.06)
      g.rotation.y = lerp(g.rotation.y, rnd.tiltY, 0.06)
      g.rotation.z = lerp(g.rotation.z, rnd.tiltZ, 0.06)
    }

    fm.emissiveIntensity = lerp(fm.emissiveIntensity, focused ? 0.85 : 0.22, 1 - Math.pow(0.001, dt))
    im.emissiveIntensity = lerp(im.emissiveIntensity, focused ? 0.34 : 0.12, 1 - Math.pow(0.001, dt))
    im.roughness = lerp(im.roughness, focused ? 0.62 : 0.78, 1 - Math.pow(0.001, dt))
    im.metalness = lerp(im.metalness, focused ? 0.10 : 0.06, 1 - Math.pow(0.001, dt))
  })

  return (
    <group ref={groupRef} visible={false}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.74, 0.56]} />
        <meshStandardMaterial
          ref={frameMatRef}
          color="#120818"
          roughness={0.92}
          metalness={0.06}
          emissive="#ff6fb3"
          emissiveIntensity={0.22}
          transparent
          opacity={0}
        />
      </mesh>

      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[0.64, 0.46]} />
        <meshStandardMaterial
          ref={imgMatRef}
          map={mapTex}
          color={"white"}
          roughness={0.78}
          metalness={0.06}
          transparent
          opacity={0}
          emissive={"#ffffff"}
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  )
}

/* =========================================================
   FACING PLANE (textos con CanvasTexture, sin troika)
========================================================= */

function FacingPlane({
  texture,
  timeRef,
  appearAt = 0,
  disappearAt = 99999,
  position = [0, 1.5, 1.9],
  size = [2.6, 1.1],
  emissive = "#ff6fb3",
  intensity = 0.8,
  opacityMax = 1.0,
}) {
  const ref = useRef()
  const matRef = useRef()
  const { camera } = useThree()

  useFrame((_, dt) => {
    if (!ref.current || !matRef.current) return
    const t = timeRef.current

    const a = smoothstep(appearAt, appearAt + 0.6, t)
    const b = 1 - smoothstep(disappearAt - 0.6, disappearAt, t)
    const op = clamp01(a * b) * opacityMax

    ref.current.visible = op > 0.001
    if (!ref.current.visible) return

    ref.current.position.set(position[0], position[1], position[2])
    ref.current.quaternion.copy(camera.quaternion)

    matRef.current.opacity = lerp(matRef.current.opacity, op, 1 - Math.pow(0.001, dt))
  })

  return (
    <group ref={ref} visible={false}>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial
          ref={matRef}
          map={texture}
          transparent
          opacity={0}
          roughness={0.65}
          metalness={0.08}
          emissive={emissive}
          emissiveIntensity={intensity}
        />
      </mesh>
    </group>
  )
}

/* =========================================================
   COUPLE FINALE (anillos + cartel)
========================================================= */

function MiniCharacter({ color = "#7bb6ff" }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.20, 22, 22]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.30, 0]}>
        <boxGeometry args={[0.34, 0.50, 0.24]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>

      <mesh position={[0.22, 0.34, 0]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[0.10, 0.34, 0.10]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[-0.22, 0.34, 0]} rotation={[0, 0, 0.55]}>
        <boxGeometry args={[0.10, 0.34, 0.10]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
    </group>
  )
}

function CoupleFinale({ startAt, timeRef, signTex }) {
  const groupRef = useRef()
  const leftRef = useRef()
  const rightRef = useRef()
  const ringLRef = useRef()
  const ringRRef = useRef()
  const signMatRef = useRef()

  useFrame((state, dt) => {
    const g = groupRef.current
    const L = leftRef.current
    const R = rightRef.current
    const ringL = ringLRef.current
    const ringR = ringRRef.current
    const signMat = signMatRef.current
    if (!g || !L || !R || !ringL || !ringR || !signMat) return

    const t = timeRef.current
    const u = clamp01((t - startAt) / 6.5)

    g.visible = u > 0.001
    if (!g.visible) return

    const tt = state.clock.elapsedTime
    const beat = 0.5 + 0.5 * Math.sin(tt * 2.2)

    const lx = lerp(-1.55, -0.35, easeInOutCubic(u))
    const rx = lerp(1.55, 0.35, easeInOutCubic(u))
    const y = -0.18
    const z = 1.55

    L.position.set(lx, y, z)
    R.position.set(rx, y, z)

    const kissP = smoothstep(0.55, 1.0, u)
    L.rotation.y = lerp(0.35, 0.14, kissP)
    R.rotation.y = lerp(-0.35, -0.14, kissP)

    const raise = smoothstep(0.55, 1.0, u)
    ringL.position.set(-0.18, 0.52 + raise * 0.14, 1.55)
    ringR.position.set(0.18, 0.52 + raise * 0.14, 1.55)
    ringL.rotation.set(Math.PI / 2, 0, tt * 0.6)
    ringR.rotation.set(Math.PI / 2, 0, -tt * 0.6)

    const signP = smoothstep(0.35, 1.0, u)
    g.children[2].position.y = lerp(0.25, 0.62, signP)
    signMat.opacity = lerp(signMat.opacity, 1.0, 1 - Math.pow(0.001, dt))
    signMat.emissiveIntensity = 0.55 * (0.75 + beat * 0.35)

    g.scale.setScalar(1 + beat * 0.012)
  })

  return (
    <group ref={groupRef} visible={false}>
      <group ref={leftRef}>
        <MiniCharacter color="#7bb6ff" />
      </group>
      <group ref={rightRef}>
        <MiniCharacter color="#ff8bd4" />
      </group>

      <group position={[0, 0.25, 1.45]}>
        <mesh>
          <planeGeometry args={[2.25, 0.85]} />
          <meshStandardMaterial
            ref={signMatRef}
            map={signTex}
            transparent
            opacity={0}
            roughness={0.65}
            metalness={0.08}
            emissive="#ff6fb3"
            emissiveIntensity={0.55}
          />
        </mesh>
      </group>

      <mesh ref={ringLRef} position={[-0.18, 0.52, 1.55]}>
        <torusGeometry args={[0.06, 0.018, 14, 28]} />
        <meshStandardMaterial
          color="#ffd9a8"
          emissive="#ffd9a8"
          emissiveIntensity={1.4}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>
      <mesh ref={ringRRef} position={[0.18, 0.52, 1.55]}>
        <torusGeometry args={[0.06, 0.018, 14, 28]} />
        <meshStandardMaterial
          color="#ffd9a8"
          emissive="#ffd9a8"
          emissiveIntensity={1.4}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>

      <Sparkles count={26} size={3.0} speed={0.22} scale={[2.2, 1.2, 2.2]} position={[0, 0.85, 1.55]} opacity={0.7} />
    </group>
  )
}

/* =========================================================
   MAIN
========================================================= */

export default function FinalHeartScene3D({ onNext, setHud, onEndMusic }) {
  const { camera, gl, setDpr } = useThree()

  // Assets SIN repetir: 1 asset = 1 tile
  const assets = useMemo(() => {
    const arr = (MEMORY_ASSETS || []).map((a, i) => ({
      id: a.id || `${a.type}-${i}`,
      type: a.type === "video" ? "video" : "image",
      url: a.url,
      caption: a.caption || prettyCaptionFromUrl(a.url),
      thumbUrl: a.thumbUrl || null,
    }))
    // filtro de urls vacías
    return arr.filter((x) => x.url)
  }, [])

  // slots = assets.length (no duplicamos)
  const slots = useMemo(() => {
    const base = makeSlotsForCount(Math.max(assets.length, 1), {
      scale: CFG.heartScale,
      seed: 2026,
    })
    return base.map((p) => new THREE.Vector3(p.x, p.y + 1.15, p.z))
  }, [assets.length])

  // posiciones iniciales orbitando (bonito)
  const startPositions = useMemo(() => {
    const n = Math.max(assets.length, 1)
    return slots.map((_, i) => {
      const ang = (i / n) * Math.PI * 2
      const ring = 6.2 + (i % 4) * 0.18
      const y = 1.25 + Math.sin(ang * 2.0) * 0.9
      return new THREE.Vector3(Math.cos(ang) * ring, y, Math.sin(ang) * ring - 1.6)
    })
  }, [slots, assets.length])

  // thumbnails para videos: intentamos NO repetir usando imágenes del pool
  const thumbMap = useMemo(() => {
    const images = assets.filter((a) => a.type === "image").map((a) => a.url)
    const videos = assets.filter((a) => a.type === "video")

    const rng = mulberry32(9090)
    const pool = [...images]
    // shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }

    const map = new Map()
    let k = 0
    for (const v of videos) {
      if (v.thumbUrl) {
        map.set(v.url, v.thumbUrl)
      } else {
        const pick = pool[k] || images[k % Math.max(1, images.length)] || FALLBACK_IMG
        map.set(v.url, pick)
        k++
      }
    }
    return map
  }, [assets])

  const thumbFor = (asset) => {
    if (asset.type === "image") return asset.url
    return thumbMap.get(asset.url) || FALLBACK_IMG
  }

  // timeline: ~1 por segundo
  const timeline = useMemo(() => {
    const seq = []
    for (let i = 0; i < assets.length; i++) {
      const t0 = CFG.buildStart + i * CFG.perMemory
      const t1 = t0 + CFG.approach
      const t2 = t1 + CFG.hold
      const t3 = t2 + CFG.place
      seq.push({
        t0,
        t1,
        t2,
        t3,
        approach: CFG.approach,
        hold: CFG.hold,
        place: CFG.place,
        seed: i + 1,
      })
    }

    const lastPlaced = seq.length ? seq[seq.length - 1].t3 : CFG.buildStart + 2.0
    const teAmoAt = lastPlaced + CFG.afterBuildPause
    const annivAt = teAmoAt + CFG.teAmoDuration
    const letterAt = annivAt + 1.0
    const coupleAt = annivAt + 1.7
    const fadeOutStart = annivAt + CFG.anniversaryDuration
    const endAt = fadeOutStart + CFG.fadeOutDuration

    return { seq, lastPlaced, teAmoAt, annivAt, letterAt, coupleAt, fadeOutStart, endAt }
  }, [assets.length])

  // textures
  const domeTex = useMemo(() => makeRomanticDomeTexture(), [])
  const glowPink = useMemo(() => makeGlowTexture({}), [])
  const glowWarm = useMemo(() => makeGlowTexture({ inner: "rgba(255,210,170,0.65)", mid: "rgba(255,210,170,0.14)" }), [])

  const texTeAmo = useMemo(
    () =>
      makeSignTexture({
        title: "TE AMO",
        subtitle: "Para siempre.",
        w: 1600,
        h: 700,
      }),
    []
  )

  const texAnniv = useMemo(
    () =>
      makeSignTexture({
        title: "FELIZ ANIVERSARIO",
        subtitle: "MI AMOR",
        w: 1600,
        h: 700,
      }),
    []
  )

  const texCoupleSign = useMemo(
    () =>
      makeSignTexture({
        title: "Por más momentos",
        subtitle: "hermosos a tu lado amor",
        w: 1600,
        h: 700,
      }),
    []
  )

  const texLetter = useMemo(
    () =>
      makeLetterTexture([
        "Gracias por existir en mi vida.",
        "Por cada abrazo, por cada risa,",
        "por cada día en el que elegimos",
        "caminar juntos…",
        "te prometo amor eterno.",
        "Hoy y siempre: tú.",
      ]),
    []
  )

  // heart ribbon
  const outline = useMemo(() => heartOutlinePoints(240, CFG.heartScale), [])
  const outline3d = useMemo(
    () => outline.map((p, i) => new THREE.Vector3(p.x, p.y + 1.15, i % 3 === 0 ? 0.16 : -0.12)),
    [outline]
  )
  const tubeGeom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(outline3d, true, "catmullrom", 0.5)
    return new THREE.TubeGeometry(curve, 420, 0.035, 10, true)
  }, [outline3d])

  // time/fade refs
  const timeRef = useRef(0)
  const fadeRef = useRef(1)

  // focus index
  const focusRef = useRef(-1)
  const [focusIndex, setFocusIndex] = useState(-1)

  // narration events
  const narration = useMemo(() => {
    const ev = []
    const add = (t, who, text) => ev.push({ t, who, text })

    add(0.35, "Narrador", "Aún recuerdo esas veces… como si el mundo respirara contigo.")
    add(1.10, "Narrador", "Uno por uno… vuelven a latir.")

    assets.forEach((a, i) => {
      const sc = timeline.seq[i]
      if (!sc) return
      const p = narrationForAsset(a)
      add(sc.t0 + 0.08, "Narrador", p.a)
      add(sc.t1 + 0.55, "Narrador", p.b)
    })

    add(timeline.lastPlaced + 0.35, "Narrador", "Y así… se forma nuestro corazón.")
    add(timeline.teAmoAt + 0.2, "Narrador", "Te amo.")
    add(timeline.annivAt + 0.25, "Narrador", "Feliz aniversario, mi amor.")
    add(timeline.annivAt + 2.0, "Tú", "Te elijo hoy… y para siempre.")
    add(timeline.annivAt + 3.2, "Ella", "Y yo… me quedo contigo. Siempre.")

    add(timeline.fadeOutStart - 1.0, "Narrador", "Por siempre nosotros.")
    add(timeline.fadeOutStart + 0.3, "Narrador", "— Fin —")

    ev.sort((a, b) => a.t - b.t)
    return ev
  }, [assets, timeline])

  const narrIdxRef = useRef(0)

  // lights refs
  const ambRef = useRef()
  const dirRef = useRef()
  const warmRef = useRef()
  const coolRef = useRef()
  const ropeMatRef = useRef()

  // auto dpr
  const dprRef = useRef(CFG.maxDpr)
  const fpsAcc = useRef({ t: 0, n: 0, sum: 0 })

  const didEndMusicRef = useRef(false)
  const didOnNextRef = useRef(false)

  useEffect(() => {
    setHud?.({ who: "Narrador", text: "Aún recuerdo esas veces…" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state, dt) => {
    timeRef.current = Math.min(timeRef.current + dt, timeline.endAt + 2)
    const t = timeRef.current
    const tt = state.clock.elapsedTime

    // focus
    let fi = -1
    for (let i = 0; i < timeline.seq.length; i++) {
      const sc = timeline.seq[i]
      if (t >= sc.t1 && t < sc.t2) {
        fi = i
        break
      }
    }
    if (fi !== focusRef.current) {
      focusRef.current = fi
      setFocusIndex(fi)
    }

    // placed count
    let placed = 0
    for (let i = 0; i < timeline.seq.length; i++) if (t >= timeline.seq[i].t3) placed++
    const buildP = timeline.seq.length ? placed / timeline.seq.length : 1
    const beauty = smoothstep(0.05, 1.0, buildP)

    // fade
    const fadeIn = 1 - smoothstep(0, 1.2, t)
    const fadeOut = smoothstep(timeline.fadeOutStart, timeline.endAt, t)
    fadeRef.current = clamp01(fadeIn + fadeOut)

    // camera
    const inFinal = t >= timeline.annivAt
    if (!inFinal) {
      const swirl = 1 - smoothstep(0.0, 0.95, buildP)
      const ang = tt * 0.12 * swirl
      const radius = lerp(8.0, 6.2, smoothstep(0.0, 0.95, buildP))
      const camX = Math.sin(ang) * radius * 0.35
      const camZ = Math.cos(ang) * radius
      const camY = lerp(1.75, 2.15, smoothstep(0.15, 1.0, buildP))
      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 1 - Math.pow(0.001, dt))
      camera.lookAt(0, 1.22, 0)
    } else {
      // estable para el final
      const u = smoothstep(timeline.annivAt, timeline.annivAt + 2.0, t)
      const cam = new THREE.Vector3(0.0, lerp(2.05, 1.82, u), lerp(6.0, 5.15, u))
      camera.position.lerp(cam, 1 - Math.pow(0.001, dt))
      camera.lookAt(0, 1.15, 0)
    }

    // lights
    if (ambRef.current) ambRef.current.intensity = lerp(0.16, 0.34, beauty)
    if (dirRef.current) dirRef.current.intensity = lerp(0.22, 0.42, beauty)
    if (warmRef.current) warmRef.current.intensity = lerp(1.15, 3.0, beauty)
    if (coolRef.current) coolRef.current.intensity = lerp(0.7, 2.0, beauty)
    if (ropeMatRef.current) {
      ropeMatRef.current.opacity = lerp(0.12, 0.28, beauty)
      ropeMatRef.current.emissiveIntensity = lerp(0.75, 1.1, beauty)
    }

    // narración HUD
    if (setHud && narration.length) {
      while (narrIdxRef.current < narration.length && t >= narration[narrIdxRef.current].t) {
        const e = narration[narrIdxRef.current]
        setHud({ who: e.who, text: e.text })
        narrIdxRef.current++
      }
    }

    // música fade out
    if (!didEndMusicRef.current && t >= timeline.fadeOutStart) {
      didEndMusicRef.current = true
      onEndMusic?.()
    }

    // onNext
    if (!didOnNextRef.current && t >= timeline.endAt + 0.1) {
      didOnNextRef.current = true
      onNext?.()
    }

    // auto dpr
    fpsAcc.current.t += dt
    fpsAcc.current.n += 1
    fpsAcc.current.sum += 1 / Math.max(0.0001, dt)
    if (fpsAcc.current.t > 0.6) {
      const avg = fpsAcc.current.sum / fpsAcc.current.n
      fpsAcc.current.t = 0
      fpsAcc.current.n = 0
      fpsAcc.current.sum = 0

      let dpr = dprRef.current
      if (avg < 45 && dpr > CFG.minDpr) dpr = Math.max(CFG.minDpr, dpr - 0.1)
      else if (avg > 56 && dpr < CFG.maxDpr) dpr = Math.min(CFG.maxDpr, dpr + 0.05)

      if (Math.abs(dpr - dprRef.current) > 0.001) {
        dprRef.current = dpr
        if (typeof setDpr === "function") setDpr(dpr)
        else gl.setPixelRatio(dpr)
      }
    }
  })

  return (
    <>
      <FadePlane opacityRef={fadeRef} />

      {/* background */}
      <color attach="background" args={["#05040a"]} />
      <fog attach="fog" args={["#05040a", 10, 28]} />

      {/* dome */}
      <mesh scale={130}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial map={domeTex} side={THREE.BackSide} />
      </mesh>

      <Stars radius={100} depth={50} count={1400} factor={2} saturation={0} fade speed={0.22} />

      {/* glows */}
      <mesh position={[0, 1.35, -1.1]} renderOrder={0}>
        <planeGeometry args={[7.2, 5.2]} />
        <meshBasicMaterial map={glowPink} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, 1.55, 2.35]} renderOrder={0}>
        <planeGeometry args={[3.2, 2.1]} />
        <meshBasicMaterial map={glowWarm} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* lights */}
      <ambientLight ref={ambRef} intensity={0.2} />
      <directionalLight ref={dirRef} position={[6, 9, 4]} intensity={0.3} color={"#aab8ff"} />
      <pointLight ref={warmRef} position={[0, 2.8, 3.7]} intensity={2.0} distance={18} color={"#ffd1a8"} />
      <pointLight ref={coolRef} position={[0, 1.2, 9.8]} intensity={1.2} distance={26} color={"#a9c1ff"} />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#04040a" roughness={1} metalness={0} />
      </mesh>

      <Sparkles count={180} speed={0.45} size={2.6} scale={[10, 5.2, 10]} position={[0, 1.4, 0]} opacity={0.6} />

      {/* heart ribbon */}
      <mesh geometry={tubeGeom}>
        <meshStandardMaterial
          ref={ropeMatRef}
          color="#ff8bc1"
          emissive="#ff6fb3"
          emissiveIntensity={0.95}
          transparent
          opacity={0.22}
          roughness={0.35}
          metalness={0.08}
        />
      </mesh>

      {/* heart glow */}
      <mesh position={[0, 1.2, -0.65]}>
        <circleGeometry args={[2.95, 90]} />
        <meshStandardMaterial
          color="#ff86b5"
          emissive="#ff86b5"
          emissiveIntensity={1.35}
          transparent
          opacity={0.16}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* cards */}
      {assets.map((a, i) => {
        const sc = timeline.seq[i]
        if (!sc) return null
        return (
          <MemoryCard
            key={a.id}
            asset={a}
            thumbUrl={thumbFor(a)}
            slotPos={slots[i] || new THREE.Vector3(0, 1.15, 0)}
            startPos={startPositions[i] || new THREE.Vector3(0, 1.3, -2.5)}
            schedule={sc}
            timeRef={timeRef}
            focused={i === focusIndex}
          />
        )
      })}

      {/* TE AMO */}
      <FacingPlane
        texture={texTeAmo}
        timeRef={timeRef}
        appearAt={timeline.teAmoAt}
        disappearAt={timeline.annivAt}
        position={[0, 2.45, 0.75]}
        size={[3.05, 1.34]}
        emissive="#ff6fb3"
        intensity={1.15}
        opacityMax={1.0}
      />

      {/* FELIZ ANIVERSARIO */}
      <FacingPlane
        texture={texAnniv}
        timeRef={timeRef}
        appearAt={timeline.annivAt}
        disappearAt={timeline.fadeOutStart + 0.8}
        position={[0, 2.55, 0.72]}
        size={[3.25, 1.40]}
        emissive="#ff6fb3"
        intensity={1.05}
        opacityMax={1.0}
      />

      {/* CARTA FINAL (legible) */}
      <FacingPlane
        texture={texLetter}
        timeRef={timeRef}
        appearAt={timeline.letterAt}
        disappearAt={timeline.fadeOutStart + 0.4}
        position={[0, 0.95, 1.90]}
        size={[2.55, 1.60]}
        emissive="#ffffff"
        intensity={0.22}
        opacityMax={0.98}
      />

      {/* couple + anillos + cartel */}
      <CoupleFinale startAt={timeline.coupleAt} timeRef={timeRef} signTex={texCoupleSign} />
    </>
  )
}