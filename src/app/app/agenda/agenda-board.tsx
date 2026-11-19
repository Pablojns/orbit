"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveAgendaItem } from "@/app/app/actions";
import { Field, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";

export type Cell = {
  iso: string;
  day: number;
  items: { key: string; title: string; dot: string; done: boolean }[];
} | null;

const NEW_KINDS = [
  { value: "exam", label: "Prova" },
  { value: "appointment", label: "Compromisso" },
  { value: "deadline", label: "Entrega / prazo" },
  { value: "task", label: "Tarefa (pode ficar sem data)" },
  { value: "bill", label: "Conta / boleto avulso" },
  { value: "other", label: "Outro" },
];

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEK_FULL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function weekdayLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const s = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Trocar de dia é instantâneo: tudo do mês já veio do servidor, aqui só muda o que aparece.
export function AgendaBoard({
  monthKey,
  monthTitle,
  prevHref,
  nextHref,
  isCurrent,
  todayISO,
  initialSelected,
  cells,
  listPanel,
  dayPanels,
  legend,
}: {
  monthKey: string;
  monthTitle: string;
  prevHref: string;
  nextHref: string;
  isCurrent: boolean;
  todayISO: string;
  initialSelected: string | null;
  cells: Cell[];
  listPanel: React.ReactNode;
  dayPanels: Record<string, React.ReactNode>;
  legend: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(initialSelected);

  function pick(iso: string | null) {
    setSelected(iso);
    const url = iso ? `/app/agenda?mes=${monthKey}&dia=${iso}` : `/app/agenda?mes=${monthKey}`;
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <section className="glass flex min-w-0 flex-col rounded-[1.75rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{selected ? weekdayLong(selected) : "O que vem por aí"}</h2>
            {selected ? (
              <button type="button" onClick={() => pick(null)} className="text-sm text-cobalt">
                Voltar para a lista
              </button>
            ) : (
              <p className="text-sm text-ink-soft">Próximos 14 dias e o que ficou para trás.</p>
            )}
          </div>
          <FormSheet
            key={selected ?? "none"}
            title="Novo na agenda"
            trigger="Novo"
            submitLabel="Salvar"
            action={saveAgendaItem}
          >
            <Field label="O que é">
              <TextInput name="title" required maxLength={120} placeholder="Ex.: Prova de Estatística, Dentista" />
            </Field>
            <Field label="Tipo">
              <Select name="kind" defaultValue="exam" options={NEW_KINDS} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data" hint="Só a tarefa pode ficar sem.">
                <TextInput name="date" type="date" defaultValue={selected ?? undefined} />
              </Field>
              <Field label="Hora (opcional)">
                <TextInput name="time" type="time" />
              </Field>
            </div>
            <Field label="Anotação (opcional)">
              <TextInput name="notes" maxLength={500} placeholder="Ex.: levar documento, sala 12" />
            </Field>
          </FormSheet>
        </div>
        <div className="-mx-1 flex-1 overflow-y-auto px-1 lg:max-h-[34rem]">
          {selected
            ? (dayPanels[selected] ?? (
                <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                  Nada neste dia. Toque em “Novo” para colocar algo aqui.
                </p>
              ))
            : listPanel}
        </div>
      </section>

      <section className="glass rounded-[1.75rem] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={prevHref}
            aria-label="Mês anterior"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/[0.06]"
          >
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <div className="text-center">
            <p className="font-display text-xl font-semibold">{monthTitle}</p>
            {!isCurrent ? (
              <Link href="/app/agenda" className="text-xs text-cobalt">
                Voltar para hoje
              </Link>
            ) : null}
          </div>
          <Link
            href={nextHref}
            aria-label="Próximo mês"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/[0.06]"
          >
            <ChevronRight size={18} aria-hidden />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-ink-soft">
          {WEEK_FULL.map((w, i) => (
            <span key={i} className="py-1">
              <span className="sm:hidden">{WEEK[i]}</span>
              <span className="hidden sm:inline">{w}</span>
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            if (!c) return <span key={i} className="min-h-14 sm:min-h-20" />;
            const isToday = c.iso === todayISO;
            const isSel = c.iso === selected;
            const past = c.iso < todayISO;
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(isSel ? null : c.iso)}
                aria-pressed={isSel}
                aria-label={`${weekdayLong(c.iso)}${c.items.length ? `, ${c.items.length} item(s)` : ""}`}
                className={`flex min-h-14 min-w-0 flex-col gap-1 rounded-xl p-1.5 text-left transition-colors duration-100 sm:min-h-20 sm:p-2 ${
                  isSel
                    ? "bg-cobalt/20 ring-1 ring-cobalt"
                    : isToday
                      ? "bg-white/[0.07] ring-1 ring-cobalt/50"
                      : "bg-white/[0.025] hover:bg-white/[0.06]"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-sm ${
                    isToday ? "grad-primary font-semibold text-white" : past ? "text-ink-soft" : ""
                  }`}
                >
                  {c.day}
                </span>
                <span className="flex flex-wrap gap-0.5 md:hidden">
                  {c.items.slice(0, 4).map((it) => (
                    <span key={it.key} className={`h-1.5 w-1.5 rounded-full ${it.done ? "bg-gain" : it.dot}`} />
                  ))}
                </span>
                <span className="hidden w-full min-w-0 flex-col gap-0.5 md:flex">
                  {c.items.slice(0, 2).map((it) => (
                    <span
                      key={it.key}
                      className={`flex min-w-0 items-center gap-1 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[11px] ${
                        it.done ? "text-ink-soft line-through" : ""
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${it.done ? "bg-gain" : it.dot}`} />
                      <span className="truncate">{it.title}</span>
                    </span>
                  ))}
                  {c.items.length > 2 ? (
                    <span className="px-1 text-[11px] text-ink-soft">+{c.items.length - 2}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        {legend}
      </section>
    </div>
  );
}
