import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dimeta",
    short_name: "Dimeta",
    description: "Seu dinheiro, seus prazos e seus hábitos no mesmo lugar.",
    lang: "pt-BR",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070a1a",
    theme_color: "#070a1a",
    shortcuts: [
      {
        name: "Lançar gasto",
        short_name: "Gasto",
        url: "/app?abrir=gasto",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Lançar escrevendo",
        short_name: "Escrever",
        url: "/app/dinheiro?abrir=frase",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Novo na agenda",
        short_name: "Agenda",
        url: "/app/agenda?abrir=novo",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
