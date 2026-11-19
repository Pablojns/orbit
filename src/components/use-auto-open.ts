"use client";

import { useEffect } from "react";

// Abre um formulário sozinho quando o app é aberto por um atalho do ícone (?abrir=<chave>).
export function useAutoOpen(key: string | undefined, open: () => void) {
  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("abrir") !== key) return;
      url.searchParams.delete("abrir");
      window.history.replaceState(null, "", url.pathname + url.search);
      open();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
