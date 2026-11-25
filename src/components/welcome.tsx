"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, Download, Smartphone, X } from "lucide-react";
import { savePushSubscription } from "@/app/app/actions";

// Primeiro acesso neste aparelho (decisões 2 e 3, 21/11):
// 1) pede para ligar as notificações; 2) dá a dica dos atalhos do ícone e de instalar o app.
// Notificação é por aparelho, então "já viu" fica guardado no próprio aparelho.
const SEEN_KEY = "dimeta.boas-vindas.v1";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type PushStatus = "unsupported" | "denied" | "off" | "on" | "working";

function toUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function seen() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // sem acesso ao armazenamento: não insiste
  }
}
function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* sem armazenamento: só fecha */
  }
}

export function Welcome({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [push, setPush] = useState<PushStatus>("off");
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const id = requestAnimationFrame(() => {
      if (seen()) return;
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      setInstalled(standalone);
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) setPush("unsupported");
      else if (Notification.permission === "denied") setPush("denied");
      else if (Notification.permission === "granted") setPush("on");
      setOpen(true);
    });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, [vapidPublicKey]);

  function close() {
    markSeen();
    setOpen(false);
  }

  async function enablePush() {
    setPush("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(vapidPublicKey) }));
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setPush(res.ok ? "on" : "off");
      if (res.ok) setStep(2);
    } catch {
      setPush("off");
    }
  }

  async function doInstall() {
    if (!install) return;
    await install.prompt();
    const { outcome } = await install.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstall(null);
  }

  if (!open) return null;
  return createPortal(
    <div className="app-vars fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Boas-vindas ao Dimeta"
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-line bg-[#0d1126] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        style={{ animation: "sheet-up 220ms cubic-bezier(.2,.8,.2,1)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-ink-soft">Passo {step} de 2</p>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-ink-soft"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        {step === 1 ? (
          <>
            <span className="mt-2 grid h-12 w-12 place-items-center rounded-2xl bg-cobalt/15 text-cobalt">
              <Bell size={22} aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-bold">Ligue os lembretes</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              Todo dia às 8h o Dimeta avisa o que vence ou acontece hoje e amanhã, e 3 horas antes do que tem hora
              marcada.
            </p>
            {push === "unsupported" ? (
              <p className="mt-3 text-sm text-sun">
                Este navegador não recebe notificações. No celular, instale o Dimeta na tela inicial e ligue por lá.
              </p>
            ) : push === "denied" ? (
              <p className="mt-3 text-sm text-sun">
                As notificações estão bloqueadas. Libere nas configurações do site no navegador.
              </p>
            ) : null}
            {push === "on" ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-gain">
                <Check size={16} aria-hidden /> Lembretes ligados neste aparelho.
              </p>
            ) : null}
            <div className="mt-6 space-y-2">
              {push === "off" || push === "working" ? (
                <button
                  type="button"
                  onClick={enablePush}
                  disabled={push === "working"}
                  className="grad-primary w-full rounded-2xl px-5 py-4 text-base font-semibold text-white disabled:opacity-60"
                >
                  {push === "working" ? "Um momento…" : "Ligar lembretes"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full rounded-2xl bg-white/[0.06] px-5 py-3.5 text-[15px] font-semibold"
              >
                {push === "off" ? "Agora não" : "Continuar"}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="mt-2 grid h-12 w-12 place-items-center rounded-2xl bg-sun/15 text-sun">
              <Smartphone size={22} aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-bold">Dicas rápidas</h2>
            <ul className="mt-3 space-y-3 text-[15px] leading-relaxed">
              <li>
                <strong>Instale o app:</strong>{" "}
                <span className="text-ink-soft">
                  {installed
                    ? "o Dimeta já está instalado neste aparelho."
                    : install
                      ? "use o botão abaixo para ter o Dimeta como app."
                      : "no menu do navegador, toque em “Instalar app” ou “Adicionar à tela inicial”."}
                </span>
              </li>
              <li>
                <strong>Atalhos no ícone:</strong>{" "}
                <span className="text-ink-soft">
                  com o app instalado, segure o ícone do Dimeta para abrir Gasto, Falar ou Agenda.
                </span>
              </li>
            </ul>
            <div className="mt-6 space-y-2">
              {install && !installed ? (
                <button
                  type="button"
                  onClick={doInstall}
                  className="grad-primary flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-semibold text-white"
                >
                  <Download size={18} aria-hidden /> Instalar o Dimeta
                </button>
              ) : null}
              <button
                type="button"
                onClick={close}
                className="w-full rounded-2xl bg-white/[0.06] px-5 py-3.5 text-[15px] font-semibold"
              >
                Entendi
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
