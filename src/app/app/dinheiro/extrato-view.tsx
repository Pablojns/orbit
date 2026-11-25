"use client";

import { useMemo, useState, useTransition } from "react";
import { loadExtrato } from "@/app/app/actions";
import { EditMovement } from "@/components/edit-forms";
import { MovementRow } from "@/components/movement-list";
import type { CalendarDate } from "@/lib/dates";
import type { Card, Category, Movement } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { PERIODS, type PeriodKind } from "@/lib/period";
import { matchesSearch } from "@/lib/search-synonyms";
import { Search } from "lucide-react";

export type ExtratoData = Awaited<ReturnType<typeof loadExtrato>>;

const field =
  "h-11 min-w-0 rounded-xl border border-white/[0.1] bg-[#0f1634] px-3 text-sm font-semibold focus:border-[#a78bfa] focus:outline-none";

// Extrato: período, busca e categoria aplicam na hora, sem recarregar a página.
export function ExtratoView({
  initial,
  today,
  categories,
  cards,
}: {
  initial: ExtratoData;
  today: CalendarDate;
  categories: Category[];
  cards: Card[];
}) {
  const [data, setData] = useState(initial);
  // Depois de editar/apagar, o servidor manda dados novos: usa eles.
  const [prev, setPrev] = useState(initial);
  if (initial !== prev) {
    setPrev(initial);
    setData(initial);
  }
  const [kind, setKind] = useState<PeriodKind>(initial.kind);
  const [de, setDe] = useState(initial.de);
  const [ate, setAte] = useState(initial.ate);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [tab, setTab] = useState<"saidas" | "entradas">("saidas");
  const [pending, start] = useTransition();

  function load(k: PeriodKind, d = de, a = ate) {
    start(async () => {
      const r = await loadExtrato(k, d, a);
      setData(r);
      setDe(r.de);
      setAte(r.ate);
      const p = new URLSearchParams();
      if (r.kind !== "mes") p.set("periodo", r.kind);
      if (r.kind === "personalizado") {
        p.set("de", r.de);
        p.set("ate", r.ate);
      }
      const qs = p.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `/app/dinheiro?${qs}` : "/app/dinheiro",
      );
    });
  }

  const catNames = useMemo(
    () =>
      [
        ...new Set(
          data.movements.map((m) => m.category?.name ?? "Sem categoria"),
        ),
      ].sort(),
    [data.movements],
  );
  const query = q.trim();
  const filtered = data.movements.filter(
    (m) =>
      (!query ||
        matchesSearch(
          `${m.description ?? ""} ${m.category?.name ?? ""} ${m.cardName ?? ""}`,
          query,
        )) &&
      (!cat || (m.category?.name ?? "Sem categoria") === cat),
  );
  const out = filtered.filter((m) => m.type === "expense");
  const inc = filtered.filter((m) => m.type === "income");
  const outTotal = out.reduce((a, m) => a + m.amountCents, 0);
  const inTotal = inc.reduce((a, m) => a + m.amountCents, 0);
  const saved = query || cat ? 0 : data.savedCents;
  const left = inTotal - outTotal - saved;

  const list = (items: Movement[], empty: string) =>
    items.length ? (
      <ul className="divide-y divide-white/[0.06]">
        {items.map((m) => (
          <MovementRow
            key={`${m.source}-${m.id}`}
            m={m}
            today={today}
            deletable
            compact
            edit={
              m.source === "bill_payment" ? null : (
                <EditMovement m={m} categories={categories} cards={cards} />
              )
            }
          />
        ))}
      </ul>
    ) : (
      <p className="py-4 text-sm text-ink-soft">{empty}</p>
    );

  const column = (
    title: string,
    total: number,
    items: Movement[],
    tone: string,
    empty: string,
    id: string,
  ) => (
    <div id={id} className="flex min-h-0 min-w-0 flex-col">
      <div className="hidden items-baseline justify-between gap-2 border-b border-white/[0.08] pb-2.5 lg:flex">
        <h2 className="text-base font-bold">{title}</h2>
        <p className={`text-lg font-extrabold ${tone}`}>{formatCents(total)}</p>
      </div>
      <div className="max-h-[62vh] min-h-0 overflow-y-auto pr-1">
        {list(items, empty)}
      </div>
    </div>
  );

  const nothing =
    query || cat ? "Nada com esse filtro." : "Nada neste período.";

  return (
    <div
      className={
        pending ? "opacity-60 transition-opacity" : "transition-opacity"
      }
    >
      <div className="mt-4 flex flex-wrap gap-2 lg:flex-nowrap">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-0">
          <Search
            size={17}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar (ex.: comida, uber)"
            aria-label="Buscar no extrato"
            className={`${field} w-full pl-9 font-normal`}
          />
        </div>
        <select
          value={kind}
          aria-label="Período"
          onChange={(e) => {
            const k = e.target.value as PeriodKind;
            setKind(k);
            if (k !== "personalizado") load(k);
          }}
          className={`${field} flex-1 sm:flex-none`}
        >
          {PERIODS.map((p) => (
            <option key={p.kind} value={p.kind} className="bg-[#0d1126]">
              {p.label}
            </option>
          ))}
        </select>
        {kind === "personalizado" ? (
          <>
            <input
              type="date"
              aria-label="De"
              value={de}
              onChange={(e) => {
                setDe(e.target.value);
                if (e.target.value) load("personalizado", e.target.value, ate);
              }}
              className={`${field} flex-1 sm:flex-none`}
            />
            <input
              type="date"
              aria-label="Até"
              value={ate}
              onChange={(e) => {
                setAte(e.target.value);
                if (e.target.value) load("personalizado", de, e.target.value);
              }}
              className={`${field} flex-1 sm:flex-none`}
            />
          </>
        ) : null}
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Categoria"
          className={`${field} flex-1 sm:max-w-[14rem]`}
        >
          <option value="" className="bg-[#0d1126]">
            Todas as categorias
          </option>
          {catNames.map((c) => (
            <option key={c} value={c} className="bg-[#0d1126]">
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_15.5rem]">
        {/* Resumo: no celular vem primeiro; no computador fica à direita. */}
        <section className="hero-card self-start rounded-3xl p-5 lg:order-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">Resumo</h2>
            <span className="text-xs font-semibold text-[#c7cff7]">
              {data.label}
            </span>
          </div>
          <dl className="mt-3 grid gap-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[#c7cff7]">Entrou</dt>
              <dd className="font-extrabold text-[#6ee7b7]">
                {formatCents(inTotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#c7cff7]">Saiu</dt>
              <dd className="font-extrabold text-[#ff9db0]">
                {formatCents(outTotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#c7cff7]">Guardado em metas</dt>
              <dd className="font-extrabold">{formatCents(saved)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-white/[0.12] pt-2.5">
              <dt className="font-bold">Sobrou</dt>
              <dd
                className={`text-lg leading-tight font-extrabold ${left < 0 ? "text-[#ff9db0]" : ""}`}
              >
                {formatCents(left)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="glass min-w-0 rounded-3xl p-4 lg:order-1 lg:p-5">
          <div
            className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1 lg:hidden"
            role="tablist"
          >
            {(
              [
                ["saidas", `Saídas · ${formatCents(outTotal)}`],
                ["entradas", `Entradas · ${formatCents(inTotal)}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`rounded-xl px-2 py-2.5 text-sm font-bold ${
                  tab === k
                    ? k === "saidas"
                      ? "bg-loss/90 text-[#2a0710]"
                      : "bg-[#34d399] text-[#062b1d]"
                    : "text-ink-soft"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={tab === "saidas" ? "" : "hidden lg:block"}>
              {column(
                "Saídas",
                outTotal,
                out,
                "text-[#ff9db0]",
                nothing,
                "saidas",
              )}
            </div>
            <div className={tab === "entradas" ? "" : "hidden lg:block"}>
              {column(
                "Entradas",
                inTotal,
                inc,
                "text-[#6ee7b7]",
                nothing,
                "entradas",
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
