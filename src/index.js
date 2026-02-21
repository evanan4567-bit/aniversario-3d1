import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 👇 agrega esta línea
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 👇 y agrega esta línea
serviceWorkerRegistration.register();