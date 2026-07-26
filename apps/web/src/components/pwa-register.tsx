"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("✅ Service worker registered:", reg.scope))
        .catch((err) => console.error("❌ Service worker registration failed:", err));
    }
  }, []);

  return null;
}
