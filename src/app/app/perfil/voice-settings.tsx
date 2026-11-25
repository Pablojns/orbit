"use client";

import { useEffect, useState } from "react";
import { Modal, ModalHeader } from "@/components/modal";
import { WAKE_KEY } from "@/components/voice-listener";

// Voz: resposta falada e chamada por "Dimeta" ou palmas (experimental). Fica neste aparelho.
function read(key: string) {
  try {
    return window.localStorage.getItem(key) === "on";
  } catch {
    return false;
  }
}
function write(key: string, on: boolean) {
  try {
    window.localStorage.setItem(key, on ? "on" : "off");
  } catch {
    /* sem armazenamento */
  }
}

export function VoiceSettings() {
  const [wake, setWake] = useState(false);
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setWake(read(WAKE_KEY));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const row = (label: string, hint: string, on: boolean, toggle: () => void, tag?: string) => (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">
          {label}
          {tag ? (
            <span className="ml-2 rounded-full bg-[#2a2158] px-2 py-0.5 text-[11px] font-bold text-[#d9ccff]">{tag}</span>
          ) : null}
        </span>
        <span className="block text-sm text-ink-soft">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={toggle}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-[#4361f5]" : "bg-white/15"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${on ? "left-7" : "left-1"}`} />
      </button>
    </li>
  );

  return (
    <section className="glass mt-5 rounded-3xl p-5">
      <h2 className="text-lg">Voz</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Toque no microfone ou use Alt+V. Ex.: “mercado 45 pix”, “quanto posso gastar hoje”.
      </p>
      <ul className="mt-2 divide-y divide-white/[0.07]">
        {row(
          "Chamar dizendo “Dimeta”",
          "Com o app aberto e a tela ligada. No computador, duas palmas também chamam.",
          wake,
          () => {
            if (wake) {
              write(WAKE_KEY, false);
              setWake(false);
              window.location.reload();
            } else setConsent(true);
          },
          "experimental",
        )}
      </ul>
      {consent ? (
        <Modal label="Ligar a escuta" onClose={() => setConsent(false)}>
          <ModalHeader title="Ligar a escuta?" onClose={() => setConsent(false)} />
          <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-soft">
            <p>
              Com isto ligado, o navegador usa o microfone enquanto o Dimeta estiver aberto e a tela ligada, para notar a
              palavra “Dimeta” (e, no computador, duas palmas).
            </p>
            <p>
              O reconhecimento de fala é feito pelo próprio navegador (no Chrome, pelo Google). O Dimeta não grava áudio.
              Para parar, desligue aqui ou feche a aba.
            </p>
            <p>É experimental: pode falhar com barulho ou chamar sem querer.</p>
          </div>
          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={() => setConsent(false)}
              className="h-12 flex-1 rounded-2xl bg-white/[0.06] text-[15px] font-bold"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={() => {
                write(WAKE_KEY, true);
                window.location.reload();
              }}
              className="grad-primary h-12 flex-[2] rounded-2xl text-[15px] font-bold text-white"
            >
              Concordo, ligar
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
