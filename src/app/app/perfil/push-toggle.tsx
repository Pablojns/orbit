"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "@/app/app/actions";

type Status = "loading" | "unsupported" | "denied" | "off" | "on" | "working";

function toUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      let next: Status;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        try {
          const reg = await navigator.serviceWorker.ready;
          next = (await reg.pushManager.getSubscription()) ? "on" : "off";
        } catch {
          next = "off";
        }
      }
      if (alive) setStatus(next);
    })();
    return () => {
      alive = false;
    };
  }, [vapidPublicKey]);

  async function enable() {
    setError("");
    setStatus("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
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
      if (!res.ok) throw new Error();
      setStatus("on");
    } catch {
      setError("Não deu para ativar neste aparelho. Tente de novo.");
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("working");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await deletePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("off");
  }

  const on = status === "on";
  return (
    <section className="glass mt-5 rounded-[1.75rem] p-5">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${on ? "bg-gain/15 text-gain" : "bg-white/[0.06]"}`}
        >
          {on ? <Bell size={19} aria-hidden /> : <BellOff size={19} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Lembretes no celular</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Todo dia às 8h o Orbit avisa o que vence ou acontece hoje e amanhã: provas, compromissos, contas e faturas.
          </p>
          {status === "unsupported" ? (
            <p className="mt-2 text-sm text-sun">
              Este navegador não recebe notificações. No celular, instale o Orbit na tela inicial e abra por lá.
            </p>
          ) : status === "denied" ? (
            <p className="mt-2 text-sm text-sun">
              As notificações estão bloqueadas. Libere nas configurações do site no navegador e volte aqui.
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-loss">{error}</p> : null}
        </div>
      </div>
      {status === "off" || status === "on" || status === "working" ? (
        <button
          type="button"
          onClick={on ? disable : enable}
          disabled={status === "working"}
          className={`mt-4 w-full rounded-2xl px-4 py-3 text-[15px] font-semibold disabled:opacity-60 ${
            on ? "bg-white/[0.06] text-ink" : "grad-primary text-white"
          }`}
        >
          {status === "working" ? "Um momento…" : on ? "Desativar lembretes neste aparelho" : "Ativar lembretes"}
        </button>
      ) : null}
    </section>
  );
}
