"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Bell, Check } from "lucide-react";
import {
  type FormState,
  finishTutorial,
  saveCard,
  saveHabit,
  setNavPrefs,
  tutorialBills,
  savePushSubscription,
  tutorialSalary,
} from "@/app/app/actions";
import { DaySelect, Field, MoneyInput, TextInput } from "./fields";

// Tutorial de primeiro uso (Rodada 3): 5 perguntas, uma por tela, todas com "Pular",
// e no fim o passo de ligar os lembretes. Aparece uma vez por conta (profiles.tutorial_done_at).
const WELCOME_SEEN_KEY = "dimeta.boas-vindas.v1";

const BILLS = [
  { name: "Aluguel", sub: false },
  { name: "Luz", sub: false },
  { name: "Água", sub: false },
  { name: "Internet", sub: false },
  { name: "Faculdade", sub: false },
  { name: "Assinaturas", sub: true },
];

type PushStatus = "unsupported" | "denied" | "off" | "on" | "working";

function toUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const TOTAL = 6;

export function Tutorial({
  vapidPublicKey,
  payday,
}: {
  vapidPublicKey: string;
  payday: number;
}) {
  const [step, setStep] = useState(1);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [yesNo, setYesNo] = useState<Record<number, boolean | null>>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [push, setPush] = useState<PushStatus>("off");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !vapidPublicKey
      )
        setPush("unsupported");
      else if (Notification.permission === "denied") setPush("denied");
      else if (Notification.permission === "granted") setPush("on");
    });
    return () => cancelAnimationFrame(id);
  }, [vapidPublicKey]);

  function next() {
    setError("");
    setStep((s) => Math.min(TOTAL, s + 1));
  }

  function finish() {
    try {
      window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      /* sem armazenamento */
    }
    setOpen(false);
    start(() => finishTutorial());
  }

  // Envia o formulário da tela atual e avança quando salvar.
  function submit(run: (fd: FormData) => Promise<FormState | void>) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      setError("");
      start(async () => {
        const r = await run(fd);
        if (r && r.status === "error")
          setError(r.message ?? "Não foi possível salvar.");
        else next();
      });
    };
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
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8(vapidPublicKey),
        }));
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setPush(res.ok ? "on" : "off");
    } catch {
      setPush("off");
    }
  }

  if (!open) return null;

  const choice = (n: number, labels: [string, string] = ["Sim", "Não"]) => (
    <div className="mt-4 grid grid-cols-2 gap-2.5">
      {[true, false].map((v, i) => (
        <button
          key={labels[i]}
          type="button"
          aria-pressed={yesNo[n] === v}
          onClick={() => setYesNo((s) => ({ ...s, [n]: v }))}
          className={`h-12 rounded-2xl border text-[15px] font-bold ${
            yesNo[n] === v
              ? "border-[#4361f5] bg-[#1b2a8a] text-white"
              : "border-white/[0.12] bg-[#151d45]"
          }`}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );

  const footer = (primary: React.ReactNode) => (
    <div className="mt-6 flex items-center gap-2.5">
      <button
        type="button"
        onClick={step === TOTAL ? finish : next}
        disabled={pending}
        className="h-12 flex-1 rounded-2xl bg-white/[0.06] text-[15px] font-bold disabled:opacity-60"
      >
        Pular
      </button>
      {primary}
    </div>
  );
  const primaryBtn = (label: string, disabled = false) => (
    <button
      type="submit"
      disabled={pending || disabled}
      className="grad-primary h-12 flex-[2] rounded-2xl text-[15px] font-bold text-white disabled:opacity-50"
    >
      {pending ? "Salvando…" : label}
    </button>
  );

  let body: React.ReactNode = null;
  if (step === 1) {
    const fell = yesNo[1];
    body = (
      <form onSubmit={submit((fd) => tutorialSalary({ status: "idle" }, fd))}>
        <h2 className="text-xl">Seu salário</h2>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          Com isso o Dimeta calcula quanto você pode gastar por dia.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Dia em que cai">
            <DaySelect name="day" defaultValue={payday} />
          </Field>
          <Field label="Quanto">
            <MoneyInput name="amount" required />
          </Field>
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          O salário deste mês já caiu?
        </p>
        {choice(1)}
        <input type="hidden" name="fell" value={fell ? "yes" : "no"} />
        {footer(primaryBtn("Continuar", fell === undefined || fell === null))}
      </form>
    );
  } else if (step === 2) {
    const uses = yesNo[2];
    body = (
      <form
        onSubmit={submit(async (fd) =>
          uses ? saveCard({ status: "idle" }, fd) : undefined,
        )}
      >
        <h2 className="text-xl">Usa cartão de crédito?</h2>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          O Dimeta monta a fatura e avisa antes do vencimento.
        </p>
        {choice(2)}
        {uses ? (
          <div className="mt-4 space-y-3">
            <Field label="Nome do cartão">
              <TextInput
                name="name"
                required
                maxLength={40}
                placeholder="Ex.: Nubank"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha dia">
                <DaySelect name="closing_day" defaultValue={3} />
              </Field>
              <Field label="Vence dia">
                <DaySelect name="due_day" defaultValue={10} />
              </Field>
            </div>
            <Field label="Limite (opcional)">
              <MoneyInput name="limit" />
            </Field>
          </div>
        ) : null}
        {footer(primaryBtn("Continuar", uses === undefined || uses === null))}
      </form>
    );
  } else if (step === 3) {
    const list = BILLS.filter((b) => picked[b.name]);
    body = (
      <form onSubmit={submit((fd) => tutorialBills({ status: "idle" }, fd))}>
        <h2 className="text-xl">Contas fixas</h2>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          Marque as que você paga todo mês.
        </p>
        <ul className="mt-4 space-y-2">
          {BILLS.map((b) => {
            const on = Boolean(picked[b.name]);
            const i = list.findIndex((x) => x.name === b.name);
            return (
              <li
                key={b.name}
                className={`rounded-2xl border p-3 ${on ? "border-[#4361f5]/60 bg-[#151d45]" : "border-white/[0.1]"}`}
              >
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((s) => ({ ...s, [b.name]: !on }))}
                  className="flex min-h-8 w-full items-center gap-3 text-left text-[15px] font-bold"
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-lg border ${
                      on ? "border-[#4361f5] bg-[#4361f5]" : "border-white/30"
                    }`}
                  >
                    {on ? (
                      <Check size={14} strokeWidth={3} aria-hidden />
                    ) : null}
                  </span>
                  {b.name}
                </button>
                {on ? (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <input type="hidden" name="bill" value={b.name} />
                    {b.sub ? (
                      <input type="hidden" name={`sub_${i}`} value="on" />
                    ) : null}
                    <Field label="Valor">
                      <MoneyInput name={`amount_${i}`} required />
                    </Field>
                    <Field label="Vence dia">
                      <DaySelect name={`due_${i}`} defaultValue={10} />
                    </Field>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {footer(primaryBtn(list.length ? "Salvar e continuar" : "Continuar"))}
      </form>
    );
  } else if (step === 4 || step === 5) {
    const studies = step === 4;
    const ans = yesNo[step];
    body = (
      <form
        onSubmit={submit(async (form) => {
          const fd = new FormData();
          fd.set(
            studies ? "hide_studies" : "hide_habits",
            ans ? "false" : "true",
          );
          await setNavPrefs(fd);
          if (!studies && ans && String(form.get("name") ?? "").trim()) {
            const h = new FormData();
            h.set("name", String(form.get("name")));
            h.set("target_per_week", "7");
            return saveHabit({ status: "idle" }, h);
          }
        })}
      >
        <h2 className="text-xl">
          {studies ? "Você estuda?" : "Quer acompanhar hábitos?"}
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          {studies
            ? "Faculdade, escola ou cursinho: notas, faltas, provas e aulas. Se não estuda, a aba Estudos sai do menu."
            : "Marque no dia o que você quer fazer com frequência. Se não quiser, a aba Hábitos sai do menu."}
        </p>
        {choice(step)}
        {!studies && ans ? (
          <div className="mt-4">
            <Field label="Primeiro hábito (opcional)">
              <TextInput
                name="name"
                maxLength={60}
                placeholder="Ex.: Estudar 30 minutos"
              />
            </Field>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-ink-soft">
          Dá para mudar depois em Perfil.
        </p>
        {footer(primaryBtn("Continuar", ans === undefined || ans === null))}
      </form>
    );
  } else {
    body = (
      <div>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#4361f5]/20 text-[#b9c6ff]">
          <Bell size={22} aria-hidden />
        </span>
        <h2 className="mt-4 text-xl">Ligue os lembretes</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
          Todo dia às 8h o Dimeta avisa o que vence ou acontece hoje e amanhã, e
          3 horas antes do que tem hora marcada.
        </p>
        {push === "unsupported" ? (
          <p className="mt-3 text-sm text-[#c4b5fd]">
            Este navegador não recebe notificações. No celular, instale o Dimeta
            na tela inicial e ligue em Perfil.
          </p>
        ) : push === "denied" ? (
          <p className="mt-3 text-sm text-[#c4b5fd]">
            As notificações estão bloqueadas. Libere nas configurações do site
            no navegador.
          </p>
        ) : push === "on" ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-[#b9c6ff]">
            <Check size={16} aria-hidden /> Lembretes ligados neste aparelho.
          </p>
        ) : null}
        <div className="mt-6 flex items-center gap-2.5">
          {push === "on" || push === "unsupported" || push === "denied" ? (
            <button
              type="button"
              onClick={finish}
              className="grad-primary h-12 flex-1 rounded-2xl text-[15px] font-bold text-white"
            >
              Concluir
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={finish}
                className="h-12 flex-1 rounded-2xl bg-white/[0.06] text-[15px] font-bold"
              >
                Pular
              </button>
              <button
                type="button"
                onClick={enablePush}
                disabled={push === "working"}
                className="grad-primary h-12 flex-[2] rounded-2xl text-[15px] font-bold text-white disabled:opacity-60"
              >
                {push === "working" ? "Um momento…" : "Ligar lembretes"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return createPortal(
    <div className="app-vars fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Primeiros passos no Dimeta"
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/[0.07] bg-[#0f1634] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        style={{ animation: "sheet-up 220ms cubic-bezier(.2,.8,.2,1)" }}
      >
        <div
          className="mb-4 flex items-center gap-1.5"
          aria-label={`Passo ${step} de ${TOTAL}`}
        >
          {Array.from({ length: TOTAL }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-[#a78bfa]" : "bg-white/10"}`}
            />
          ))}
        </div>
        <p className="text-xs font-bold text-ink-soft">
          {step < TOTAL ? `Pergunta ${step} de 5` : "Último passo"}
        </p>
        <div className="mt-1">{body}</div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-loss">
            {error}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
