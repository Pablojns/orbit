"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveAgendaItem } from "@/app/app/actions";
import { Field, inputClass, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import type { EventType } from "@/lib/routine";

export type Cell = {
  iso: string;
  day: number;
  items: { key: string; title: string; color: string; done: boolean }[];
} | null;

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
  types,
  subjects,
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
  types: EventType[];
  subjects: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<string | null>(initialSelected);

  const listRef = useRef<HTMLElement>(null);
  function pick(iso: string | null) {
    setSelected(iso);
    const url = iso
      ? `/app/agenda?mes=${monthKey}&dia=${iso}`
      : `/app/agenda?mes=${monthKey}`;
    window.history.replaceState(null, "", url);
    // No celular a lista fica abaixo do calendário: leva a pessoa até os itens do dia.
    if (iso && window.innerWidth < 1280)
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const calendar = (
    <section className="glass min-w-0 rounded-3xl p-3 sm:p-5">
      <div className="flex items-center gap-2">
        <Link
          href={prevHref}
          aria-label="Mês anterior"
          className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/[0.06]"
        >
          <ChevronLeft size={18} aria-hidden />
        </Link>
        <p className="font-display text-xl font-semibold lg:text-2xl">
          {monthTitle}
        </p>
        <Link
          href={nextHref}
          aria-label="Próximo mês"
          className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/[0.06]"
        >
          <ChevronRight size={18} aria-hidden />
        </Link>
        {!isCurrent ? (
          <Link href="/app/agenda" className="text-sm font-bold text-cobalt">
            Hoje
          </Link>
        ) : null}
        <div className="ml-auto">
          <FormSheet
            key={selected ?? "none"}
            title="Novo na agenda"
            trigger="Novo"
            submitLabel="Salvar"
            action={saveAgendaItem}
            autoOpen="novo"
          >
            <NewItemFields date={selected} types={types} subjects={subjects} />
          </FormSheet>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-soft sm:gap-1.5">
        {WEEK_FULL.map((w, i) => (
          <span key={i} className="py-1">
            <span className="sm:hidden">{WEEK[i]}</span>
            <span className="hidden sm:inline">{w}</span>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((c, i) => {
          if (!c) return <span key={i} className="min-h-20 lg:min-h-28" />;
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
              className={`flex min-h-20 min-w-0 flex-col gap-0.5 rounded-lg p-1 text-left transition-colors duration-100 sm:rounded-xl sm:p-1.5 lg:min-h-28 ${
                isSel
                  ? "bg-cobalt/20 ring-1 ring-cobalt"
                  : isToday
                    ? "bg-white/[0.07] ring-1 ring-cobalt/50"
                    : "bg-white/[0.025] hover:bg-white/[0.06]"
              }`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[13px] ${
                  isToday
                    ? "grad-primary font-semibold text-white"
                    : past
                      ? "text-ink-soft"
                      : ""
                }`}
              >
                {c.day}
              </span>
              {c.items.slice(0, 3).map((it, j) => (
                <span
                  key={it.key}
                  className={`block min-w-0 truncate rounded px-1 py-px text-[9px] leading-tight font-semibold sm:text-[11px] ${
                    j === 2 ? "hidden lg:block" : ""
                  } ${it.done ? "line-through opacity-40" : ""}`}
                  style={{ backgroundColor: `${it.color}2e`, color: it.color }}
                >
                  {it.title}
                </span>
              ))}
              {c.items.length > 2 ? (
                <span
                  className={`px-1 text-[9px] text-ink-soft sm:text-[11px] ${c.items.length > 3 ? "" : "lg:hidden"}`}
                >
                  +{c.items.length - (c.items.length > 3 ? 3 : 2)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {legend}
    </section>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem] 2xl:grid-cols-[minmax(0,1fr)_19rem]">
      {calendar}
      <section
        ref={listRef}
        className="glass min-w-0 scroll-mt-24 self-start rounded-3xl p-4"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">
            {selected ? weekdayLong(selected) : "Esta semana"}
          </h2>
          {selected ? (
            <button
              type="button"
              onClick={() => pick(null)}
              className="shrink-0 text-xs font-bold text-cobalt"
            >
              Ver semana
            </button>
          ) : null}
        </div>
        {selected ? (
          <div key={selected} className="day-in">
            {dayPanels[selected] ?? (
              <p className="mt-3 text-sm text-ink-soft">Nada neste dia.</p>
            )}
          </div>
        ) : (
          listPanel
        )}
      </section>
    </div>
  );
}

const REMIND = [
  { value: "0", label: "Só no dia e na véspera" },
  { value: "2", label: "2 dias antes" },
  { value: "3", label: "3 dias antes" },
  { value: "7", label: "1 semana antes" },
  { value: "14", label: "2 semanas antes" },
];

// Formulário único do "Novo": só o tipo muda. Prova ganha o plano de estudo.
function NewItemFields({
  date,
  types,
  subjects,
}: {
  date: string | null;
  types: EventType[];
  subjects: { id: string; name: string }[];
}) {
  const active = types.filter((t) => !t.archived);
  const [typeId, setTypeId] = useState(active[0]?.id ?? "");
  const [repeat, setRepeat] = useState("none");
  const kind = active.find((t) => t.id === typeId)?.baseKind ?? "other";
  return (
    <>
      <Field label="O que é">
        <TextInput
          name="title"
          required
          maxLength={80}
          placeholder="Ex.: Prova de Estatística, Dentista"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select
            name="type_id"
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className={inputClass}
          >
            {active.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#0d1126]">
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prioridade (opcional)">
          <Select
            name="priority"
            defaultValue=""
            options={[
              { value: "", label: "Sem prioridade" },
              { value: "1", label: "Alta" },
              { value: "2", label: "Média" },
              { value: "3", label: "Baixa" },
            ]}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <TextInput
            name="date"
            type="date"
            required
            defaultValue={date ?? undefined}
          />
        </Field>
        <Field label="Hora (opcional)">
          <TextInput name="time" type="time" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Repete?">
          <select
            name="repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={inputClass}
          >
            <option value="none" className="bg-[#0d1126]">
              Não
            </option>
            <option value="weekly" className="bg-[#0d1126]">
              Toda semana
            </option>
            <option value="biweekly" className="bg-[#0d1126]">
              A cada 2 semanas
            </option>
            <option value="monthly" className="bg-[#0d1126]">
              Todo mês
            </option>
          </select>
        </Field>
        {repeat !== "none" ? (
          <Field label="Até quando">
            <TextInput name="repeat_until" type="date" required />
          </Field>
        ) : (
          <Field label="Me avisar">
            <Select
              key={kind}
              name="remind_days"
              defaultValue={kind === "exam" ? "3" : "0"}
              options={REMIND}
            />
          </Field>
        )}
      </div>
      {repeat !== "none" ? (
        <Field label="Me avisar">
          <Select name="remind_days" defaultValue="0" options={REMIND} />
        </Field>
      ) : null}
      {kind === "exam" && repeat === "none" ? (
        <Field
          label="Plano de estudo antes da prova"
          hint="O Dimeta espalha as sessões nos dias livres até a véspera."
        >
          <Select
            name="study_sessions"
            defaultValue="0"
            options={[0, 1, 2, 3, 4, 5, 6, 8].map((n) => ({
              value: String(n),
              label:
                n === 0
                  ? "Nenhuma sessão"
                  : `${n} ${n === 1 ? "sessão" : "sessões"}`,
            }))}
          />
        </Field>
      ) : null}
      {subjects.length ? (
        <Field
          label="Matéria (opcional)"
          hint="Liga a prova ou o trabalho à matéria em Estudos."
        >
          <Select
            name="subject_id"
            defaultValue=""
            options={[
              { value: "", label: "Nenhuma" },
              ...subjects.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </Field>
      ) : null}
      <Field label="Anotação (opcional)">
        <TextInput
          name="notes"
          maxLength={500}
          placeholder="Ex.: levar documento, sala 12"
        />
      </Field>
    </>
  );
}
