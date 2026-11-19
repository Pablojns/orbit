"use client";

import { useEffect } from "react";

// Registra o service worker, que é o que permite instalar o Orbit no celular.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sem service worker o app continua funcionando, só não fica instalável.
    });
  }, []);
  return null;
}
