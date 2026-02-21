import React from "react";

export default function UnschScene({ onBack }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>UNSCH — Noche</h2>

        <p style={styles.line}>
          <b>Ella:</b> “Disculpa amigo, ¿sabes hasta qué hora pasa la ruta 9 o 10?”
        </p>
        <p style={styles.line}>
          <b>Tú:</b> “Hasta las 9 creo…”
        </p>

        <button style={styles.button} onClick={onBack}>
          Volver
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    background: "#070a12",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    maxWidth: 800,
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 24,
  },
  line: { fontSize: "1.1rem", lineHeight: 1.6 },
  button: {
    marginTop: 16,
    padding: "10px 16px",
    fontSize: "1rem",
    cursor: "pointer",
    borderRadius: 10,
    border: "none",
  },
};