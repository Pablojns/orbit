// Service worker do Orbit (Fase 1).
// Guarda os arquivos estáticos para o app abrir rápido e mostra uma tela
// simples quando não há internet. Dados financeiros NUNCA ficam em cache.
const CACHE = "orbit-v1";
const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orbit sem conexão</title>
<body style="font-family:system-ui;background:#eef0fa;color:#1b1f3b;padding:48px 24px">
<h1 style="font-size:28px;margin:0 0 8px">Você está sem internet</h1>
<p style="color:#5d6386;font-size:16px;line-height:1.5">Assim que a conexão voltar, o Orbit carrega de novo.</p>
<button onclick="location.reload()" style="margin-top:16px;padding:12px 20px;border:0;border-radius:16px;background:#3a4be0;color:#fff;font-size:16px">Tentar de novo</button>
</body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Arquivos estáticos com hash no nome: cache primeiro.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Páginas: sempre da rede; sem rede, tela offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
      ),
    );
  }
});
