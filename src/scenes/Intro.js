import React from "react";

export default function Intro({ onStart }) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Todo comenzó cuando…</h1>
      <button style={styles.button} onClick={onStart}>
        Click
      </button>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    background: "black",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  title: { fontSize: "3rem", margin: 0 },
  button: {
    padding: "12px 24px",
    fontSize: "1.2rem",
    cursor: "pointer",
    borderRadius: 10,
    border: "none",
  },
};