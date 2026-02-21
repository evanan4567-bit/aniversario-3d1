// src/App.js
import React, { useMemo, useRef, useState, useEffect } from "react"
import { Canvas } from "@react-three/fiber"

import Intro from "./scenes/Intro"
import UnschScene3D from "./scenes/UnschScene3D"
import FinalHeartScene3D from "./scenes/FinalHeartScene3D"

const MUSIC_URL = "/audio/music_theme.mp3"

function FadeOverlay({ show, duration = 1.8 }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "black",
        pointerEvents: "none",
        opacity: show ? 1 : 0,
        transition: `opacity ${duration}s ease`,
        zIndex: 50,
      }}
    />
  )
}

function TitleCard({ show, text }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: show ? 1 : 0,
        transition: "opacity 1.2s ease",
        zIndex: 40,
        background: show ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
        backdropFilter: show ? "blur(6px)" : "blur(0px)",
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: "clamp(22px, 3vw, 44px)",
          fontWeight: 900,
          letterSpacing: 0.6,
          textAlign: "center",
          maxWidth: 760,
          padding: 18,
          lineHeight: 1.2,
          textShadow: "0 10px 26px rgba(0,0,0,0.75)",
        }}
      >
        {text}
      </div>
    </div>
  )
}

/**
 * Música romántica (autoplay unlock + fadeOut para cierre)
 */
function useRomanticMusicOnly() {
  const musicRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const m = new Audio(MUSIC_URL)
    m.loop = true
    m.volume = 0.55
    m.preload = "auto"
    musicRef.current = m

    m.play()
      .then(() => setReady(true))
      .catch(() => setReady(false))

    return () => {
      try {
        m.pause()
        m.currentTime = 0
      } catch {}
    }
  }, [])

  const unlock = async () => {
    const m = musicRef.current
    if (!m) return
    try {
      await m.play()
      setReady(true)
    } catch {
      setReady(false)
    }
  }

  const fadeOut = (duration = 3.2) => {
    const m = musicRef.current
    if (!m) return
    const startVol = m.volume
    const t0 = performance.now()

    const tick = () => {
      const t = (performance.now() - t0) / (duration * 1000)
      const k = Math.min(1, Math.max(0, t))
      m.volume = startVol * (1 - k)

      if (k < 1) requestAnimationFrame(tick)
      else {
        try {
          m.pause()
          m.currentTime = 0
        } catch {}
        // restaura por si reinicias escena luego
        m.volume = startVol
      }
    }

    requestAnimationFrame(tick)
  }

  return { unlock, ready, fadeOut }
}

export default function App() {
  // ✅ ahora sí: arrancas en INTRO
  const [scene, setScene] = useState("intro")

  // UI state de UNSCH (solo para overlays)
  const [showTitleCard, setShowTitleCard] = useState(false)
  const [fadeIn, setFadeIn] = useState(true)
  const [hud, setHud] = useState({ who: "Narrador", text: "Cargando…" })

  const { unlock, ready, fadeOut } = useRomanticMusicOnly()

  // Fade in inicial al cambiar de escena (solo si no es intro)
  useEffect(() => {
    if (scene === "intro") return
    setFadeIn(true)
    const t = setTimeout(() => setFadeIn(false), 120)
    return () => clearTimeout(t)
  }, [scene])

  // Reset overlays al cambiar escena
  useEffect(() => {
    setShowTitleCard(false)
  }, [scene])

  const overlayStyles = useMemo(
    () => ({
      wrap: {
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#050712",
      },
      topBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        zIndex: 60,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(6px)",
      },
      title: { color: "white", fontWeight: 900, letterSpacing: 0.4 },
      btn: { padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer" },
      hud: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        color: "white",
        padding: 16,
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.38)",
        backdropFilter: "blur(7px)",
      },
      who: { fontWeight: 900, marginBottom: 6 },
      text: { fontSize: "1.1rem", lineHeight: 1.5 },
      tip: { marginTop: 10, opacity: 0.8, fontSize: 12 },
    }),
    []
  )

  return (
    <div style={overlayStyles.wrap} onPointerDown={unlock}>
      {/* ✅ INTRO HTML (encima de todo) */}
      {scene === "intro" && (
        <Intro
          onStart={() => {
            unlock()
            setHud({ who: "Narrador", text: "Sales de la UNSCH… Ella está sentada mirándote, al frente." })
            setScene("unsch")
          }}
        />
      )}

      {/* ✅ Solo renderiza Canvas cuando ya saliste del Intro */}
      {scene !== "intro" && (
        <Canvas
          camera={{ position: [0, 2.2, 7], fov: 50 }}
          gl={{ antialias: true }}
          shadows
          dpr={[1, 2]}
        >
          {scene === "unsch" && (
            <UnschScene3D
              setHud={setHud}
              setShowTitleCard={setShowTitleCard}
              onNext={() => setScene("finalHeart")}
            />
          )}

          {scene === "finalHeart" && (
            <FinalHeartScene3D
              setHud={setHud}
              onEndMusic={() => fadeOut(3.6)}
              onNext={() => console.log("FIN")}
            />
          )}
        </Canvas>
      )}

      {/* Overlays HTML afuera del Canvas */}
      {scene !== "intro" && <FadeOverlay show={fadeIn} duration={1.8} />}
      {scene !== "intro" && <TitleCard show={showTitleCard} text="Ahí comenzó todo." />}

      {/* TopBar */}
      {scene !== "intro" && (
        <div style={overlayStyles.topBar}>
          <div style={overlayStyles.title}>
            {scene === "unsch" ? "UNSCH — Noche (Corto Cinemático)" : "FINAL — Corazón de Recuerdos"}
          </div>

          {!ready && (
            <button style={{ ...overlayStyles.btn, marginLeft: "auto" }} onClick={unlock}>
              🔊 Activar música
            </button>
          )}
        </div>
      )}

      {/* HUD */}
      {scene !== "intro" && (
        <div style={overlayStyles.hud}>
          <div style={overlayStyles.who}>{hud.who}</div>
          <div style={overlayStyles.text}>{hud.text}</div>
          <div style={overlayStyles.tip}>(Toca/clic para activar la música si el navegador la bloquea.)</div>
        </div>
      )}
    </div>
  )
}