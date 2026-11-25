import { GraduationCap, Minus, Plus } from "lucide-react";
import {
  archiveSubject,
  changeAbsence,
  createStudyPlan,
  deleteClassSlot,
  deleteGrade,
  linkEventSubject,
  saveAgendaItem,
  saveClassSlot,
  saveGrade,
  saveSubject,
  saveTerm,
  updateGrade,
  updateSubject,
} from "@/app/app/actions";
import { EmptyState } from "@/components/empty-state";
import { Field, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { DeleteButton } from "@/components/undo";
import { TermEnded } from "@/components/term-ended";
import { addDays, formatShort, fromISODate, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { fmtGrade, gradeStatus } from "@/lib/grades-math";
import { getAgenda, getEventTypes } from "@/lib/routine";
import { getStudies } from "@/lib/studies";
import { absenceStatus, classOccurrences, WEEKDAYS } from "@/lib/studies-math";

export const metadata = { title: "Estudos" };
export const dynamic = "force-dynamic";

const show = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const REMIND = [
  { value: "0", label: "Só no dia e na véspera" },
  { value: "2", label: "2 dias antes" },
  { value: "3", label: "3 dias antes" },
  { value: "7", label: "1 semana antes" },
  { value: "14", label: "2 semanas antes" },
];

const WD_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const BTN_SECONDARY =
  "flex h-11 items-center justify-center rounded-2xl border border-white/[0.14] px-4 text-sm font-bold text-ink hover:bg-white/[0.05]";
const BTN_SMALL =
  "flex h-11 items-center justify-center rounded-xl border border-white/[0.14] px-3.5 text-[13px] font-bold text-ink hover:bg-white/[0.05] lg:h-9";

function weekdayOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const s = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace("-feira", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SubjectFields({
  name,
  pass,
  max,
  maxAbsences,
}: {
  name?: string;
  pass?: number;
  max?: number;
  maxAbsences?: number | null;
}) {
  return (
    <>
      <Field label="Matéria">
        <TextInput name="name" required maxLength={60} defaultValue={name} placeholder="Ex.: Estatística" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Média para passar">
          <TextInput name="pass_grade" inputMode="decimal" defaultValue={pass ? show(pass) : "6"} required />
        </Field>
        <Field label="Nota máxima">
          <TextInput name="max_grade" inputMode="decimal" defaultValue={max ? show(max) : "10"} required />
        </Field>
      </div>
      <Field label="Máximo de faltas (opcional)" hint="O Dimeta conta e avisa quando estiver perto do limite.">
        <TextInput
          name="max_absences"
          inputMode="numeric"
          defaultValue={maxAbsences === null || maxAbsences === undefined ? "" : String(maxAbsences)}
          placeholder="Ex.: 15"
        />
      </Field>
    </>
  );
}

export default async function StudiesPage() {
  const today = todayInSaoPaulo();
  const [{ subjects, grades, slots, term, linked }, types, agenda] = await Promise.all([
    getStudies(),
    getEventTypes(),
    getAgenda(),
  ]);
  const activeTypes = types.filter((t) => !t.archived);
  const todayISO = toISODate(today);
  const examType = activeTypes.find((t) => t.baseKind === "exam") ?? activeTypes[0];
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));
  const subjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name ?? null;

  // Próxima prova (ligada ou não a uma matéria) e o plano de estudo dela.
  const exams = agenda.upcoming.filter((e) => e.kind === "exam");
  const nextExam = exams[0] ?? null;
  const planSessions = nextExam
    ? agenda.upcoming.filter(
        (e) =>
          e.kind === "study" &&
          e.date <= nextExam.date &&
          ((nextExam.seriesId && e.seriesId === nextExam.seriesId) ||
            (nextExam.subjectId && e.subjectId === nextExam.subjectId)),
      )
    : [];
  // A próxima prova sem matéria já tem o "Ligar" no destaque: não repete na lista.
  const unlinked = agenda.upcoming.filter(
    (e) => (e.kind === "exam" || e.kind === "deadline") && !e.subjectId && e.id !== nextExam?.id,
  );

  // Esta semana: provas, trabalhos, estudo e aulas dos próximos 7 dias, por dia.
  const weekEnd = toISODate(addDays(today, 6));
  type WeekRow = { key: string; date: string; time: string | null; title: string; tag: string; exam: boolean };
  const weekRows: WeekRow[] = [
    ...agenda.upcoming
      .filter((e) => (e.kind === "exam" || e.kind === "deadline" || e.kind === "study") && e.date <= weekEnd)
      .map((e) => ({
        key: e.id,
        date: e.date,
        time: e.time,
        title: e.title,
        tag: e.kind === "exam" ? "Prova" : e.kind === "study" ? "Estudo" : e.typeName,
        exam: e.kind === "exam",
      })),
    ...classOccurrences(slots, term, today, addDays(today, 6)).map((o) => ({
      key: `a-${o.slot.id}-${o.date}`,
      date: o.date,
      time: o.slot.startsAt,
      title: `Aula: ${o.slot.subjectName}`,
      tag: `Aula · ${o.slot.startsAt}`,
      exam: false,
    })),
  ].sort((a, b) => (a.date === b.date ? (a.time ?? "99").localeCompare(b.time ?? "99") : a.date.localeCompare(b.date)));

  const gridDays = [1, 2, 3, 4, 5, ...(slots.some((s) => s.weekday === 6) ? [6] : []), ...(slots.some((s) => s.weekday === 0) ? [0] : [])];

  const termSheet = (
    <FormSheet
      title="Datas do semestre"
      trigger={term ? "Mudar semestre" : "Definir semestre"}
      submitLabel="Salvar semestre"
      action={saveTerm}
      triggerClassName={BTN_SECONDARY}
    >
      <p className="text-sm text-ink-soft">As aulas do horário aparecem na Agenda só entre essas datas.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Começa em">
          <TextInput name="starts_on" type="date" required defaultValue={term?.startsOn} />
        </Field>
        <Field label="Termina em">
          <TextInput name="ends_on" type="date" required defaultValue={term?.endsOn} />
        </Field>
      </div>
    </FormSheet>
  );

  return (
    <div className="pt-5 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:pt-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl leading-tight lg:text-[28px]">Estudos</h1>
          <p className="mt-0.5 text-[13px] font-semibold text-ink-soft lg:text-sm">
            {term
              ? `Semestre de ${formatShort(fromISODate(term.startsOn))} a ${formatShort(fromISODate(term.endsOn))}`
              : "Semestre sem datas definidas"}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {termSheet}
          <FormSheet
            title="Nova matéria"
            trigger="Nova matéria"
            submitLabel="Criar matéria"
            action={saveSubject}
            triggerClassName="grad-primary flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-bold text-white"
          >
            <SubjectFields />
          </FormSheet>
        </div>
      </header>
      {term && slots.length && term.endsOn < todayISO ? (
        <div className="mt-4">
          <TermEnded link={false} />
        </div>
      ) : null}

      {!subjects.length && !nextExam ? (
        <div className="mt-5">
          <EmptyState
            icon={GraduationCap}
            title="Nenhuma matéria ainda"
            description="Crie uma matéria e cadastre provas, trabalhos, faltas e o horário das aulas. O Dimeta mostra sua média e quanto precisa tirar para passar."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-flow-col lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-5">
          {/* Coluna da esquerda: próxima prova e esta semana */}
          <div className="space-y-4 lg:contents">
            <section className="hero-card flex flex-col justify-center gap-3.5 rounded-3xl p-[22px] lg:min-h-0 lg:overflow-y-auto lg:p-7">
              <p className="text-[13px] font-bold text-[#b9c2f5] lg:text-sm">Próxima prova</p>
              {nextExam ? (
                <>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[22px] font-extrabold lg:text-[26px]">
                        {subjectName(nextExam.subjectId) ?? nextExam.title}
                      </p>
                      <p className="mt-0.5 text-[13px] font-semibold text-[#c7cff7] lg:text-[15px]">
                        {longDate(nextExam.date)}
                        {nextExam.time ? `, ${nextExam.time}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-[40px] leading-none font-extrabold tracking-[-0.03em] lg:text-[56px]">
                      {nextExam.daysLeft === 0 ? "Hoje" : nextExam.daysLeft === 1 ? "Amanhã" : `${nextExam.daysLeft} dias`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <FormSheet
                      title={`Plano de estudo: ${nextExam.title}`}
                      trigger="Abrir plano de estudo"
                      submitLabel={planSessions.length ? "Marcar mais sessões" : "Marcar sessões"}
                      action={createStudyPlan}
                      hidden={{ id: nextExam.id }}
                      triggerClassName="flex h-12 w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-extrabold text-[#1a2670] hover:bg-white/90 lg:h-11 lg:w-auto"
                    >
                      {planSessions.length ? (
                        <ul className="space-y-1.5">
                          {planSessions.map((p) => (
                            <li key={p.id} className="flex items-center justify-between rounded-xl bg-white/[0.05] px-3 py-2.5 text-[15px]">
                              <span className="font-semibold">{longDate(p.date)}</span>
                              <span className="text-[13px] text-ink-soft">
                                {p.daysLeft === 0 ? "hoje" : p.daysLeft === 1 ? "amanhã" : `em ${p.daysLeft} dias`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-ink-soft">
                          Ainda não há sessões de estudo para esta prova. O Dimeta espalha as sessões até a véspera, nos dias
                          mais livres da Agenda.
                        </p>
                      )}
                      <Field label="Quantas sessões">
                        <Select
                          name="sessions"
                          defaultValue="3"
                          options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
                            value: String(n),
                            label: n === 1 ? "1 sessão" : `${n} sessões`,
                          }))}
                        />
                      </Field>
                    </FormSheet>
                    {!nextExam.subjectId && subjects.length ? (
                      <FormSheet
                        title="Ligar prova a uma matéria"
                        trigger="Ligar a uma matéria"
                        submitLabel="Ligar"
                        action={linkEventSubject}
                        hidden={{ id: nextExam.id }}
                        triggerClassName="flex h-11 items-center px-1 text-sm font-bold text-[#d9ccff] hover:text-white"
                      >
                        <p className="text-sm text-ink-soft">“{nextExam.title}” ainda não está ligada a nenhuma matéria.</p>
                        <Field label="Matéria">
                          <Select name="subject_id" options={subjectOptions} />
                        </Field>
                      </FormSheet>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-[15px] text-[#c7cff7]">
                  Nenhuma prova marcada. Escreva na barra, como “prova de Estatística sexta 19h”, ou use “Prova ou
                  trabalho” na matéria.
                </p>
              )}
            </section>

            <section className="glass rounded-3xl px-[18px] pt-[18px] pb-2 lg:min-h-0 lg:overflow-y-auto lg:px-6 lg:pt-[22px]">
              <h2 className="text-base lg:text-[17px]">Esta semana</h2>
              {weekRows.length ? (
                <ul className="mt-2">
                  {weekRows.map((r) => (
                    <li key={r.key} className="flex items-center gap-3 border-t border-white/[0.07] py-3 lg:gap-4">
                      <span
                        className={`w-[54px] shrink-0 text-xs font-bold lg:w-16 lg:text-[13px] ${
                          r.exam ? "text-[#d9ccff]" : "text-ink-soft"
                        }`}
                      >
                        {r.date === todayISO ? "Hoje" : `${WD_SHORT[weekdayOf(r.date)]} ${fromISODate(r.date).day}`}
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-[15px] ${r.exam ? "font-extrabold" : "font-bold"}`}>
                        {r.title}
                      </span>
                      {r.exam ? (
                        <span className="shrink-0 rounded-full bg-[#2a2158] px-3 py-1 text-[13px] font-bold text-[#d9ccff]">
                          Prova
                        </span>
                      ) : (
                        <span className="shrink-0 text-[13px] text-ink-soft">{r.tag}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t border-white/[0.07] py-3 text-[15px] text-ink-soft">
                  Nada de estudo marcado para os próximos 7 dias.
                </p>
              )}
            </section>
          </div>

          {/* Coluna da direita: matérias e horário */}
          <div className="space-y-4 lg:contents">
            <section className="glass rounded-3xl p-[18px] lg:min-h-0 lg:overflow-y-auto lg:px-6 lg:py-[22px]">
              <h2 className="text-base lg:text-[17px]">Matérias</h2>

              {unlinked.length && subjects.length ? (
                <div className="mt-3 rounded-2xl border border-[#a78bfa]/35 bg-[#a78bfa]/[0.07] p-3">
                  <p className="text-[13px] font-bold">Na Agenda, sem matéria</p>
                  <ul className="mt-1">
                    {unlinked.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 py-1.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{e.title}</span>
                          <span className="block text-[12px] text-ink-soft">{longDate(e.date)}</span>
                        </span>
                        <FormSheet
                          title="Ligar a uma matéria"
                          trigger="Ligar"
                          submitLabel="Ligar"
                          action={linkEventSubject}
                          hidden={{ id: e.id }}
                          triggerClassName={BTN_SMALL}
                        >
                          <p className="text-sm text-ink-soft">“{e.title}” vai aparecer dentro da matéria escolhida.</p>
                          <Field label="Matéria">
                            <Select name="subject_id" options={subjectOptions} />
                          </Field>
                        </FormSheet>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {subjects.length ? (
                <ul className="mt-3 space-y-3">
                  {subjects.map((sub) => {
                    const list = grades.filter((g) => g.subjectId === sub.id);
                    const st = gradeStatus(
                      list.map((g) => ({ weight: g.weight, value: g.value })),
                      sub.pass,
                      sub.max,
                    );
                    const ab = absenceStatus(sub.absences, sub.maxAbsences);
                    const mine = linked.filter((e) => e.subjectId === sub.id && e.kind !== "study");
                    const nextOfSub = mine.find((e) => e.kind === "exam" && e.daysLeft >= 0) ?? null;
                    const average = st.kind === "empty" ? null : st.average;
                    const partial = st.kind === "pending" || Boolean(nextOfSub);
                    const pct = average === null ? 0 : Math.min(100, (average / sub.max) * 100);
                    const note =
                      st.kind === "empty"
                        ? "Cadastre as avaliações (com ou sem nota) para ver a média."
                        : nextOfSub
                          ? `A média fica parcial até a prova de ${formatShort(fromISODate(nextOfSub.date))}.`
                          : st.kind === "final"
                            ? st.passed
                              ? "Média final: aprovado."
                              : "Média final abaixo da nota de corte."
                            : st.alreadyPassed
                              ? "Você já garantiu a média. Mesmo tirando 0, passa."
                              : !st.possible
                                ? `Precisaria de ${fmtGrade(st.needed)}, acima da nota máxima. Veja se tem recuperação.`
                                : `Precisa tirar ${fmtGrade(st.needed)}${
                                    st.pendingCount > 1 ? ` em cada uma das ${st.pendingCount} que faltam` : " na que falta"
                                  }.`;
                    const absenceNote =
                      ab.kind === "no-limit"
                        ? "Edite a matéria para dizer o máximo de faltas."
                        : ab.kind === "over"
                          ? "Passou do limite de faltas."
                          : ab.kind === "at-limit"
                            ? "No limite: não pode faltar mais."
                            : ab.kind === "near"
                              ? `Perto do limite: ${ab.left === 1 ? "só pode faltar mais 1" : `pode faltar mais ${ab.left}`}.`
                              : `Pode faltar mais ${ab.left}.`;
                    const absenceBad = ab.kind === "over" || ab.kind === "at-limit";
                    return (
                      <li key={sub.id} className="flex flex-col gap-3 rounded-2xl bg-[#151d45] p-4 lg:gap-3.5 lg:px-5 lg:py-[18px]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[17px] font-extrabold lg:text-lg">{sub.name}</p>
                          <div className="flex shrink-0 items-center">
                            <FormSheet
                              title="Editar matéria"
                              trigger={`Editar ${sub.name}`}
                              submitLabel="Salvar alterações"
                              action={updateSubject}
                              hidden={{ id: sub.id }}
                              variant="edit"
                            >
                              <SubjectFields name={sub.name} pass={sub.pass} max={sub.max} maxAbsences={sub.maxAbsences} />
                            </FormSheet>
                            <DeleteButton action={archiveSubject} fields={{ id: sub.id }} label={`Arquivar ${sub.name}`} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 lg:gap-3">
                          <div>
                            <p className="text-[11px] font-semibold text-ink-soft lg:text-xs">
                              {average === null ? "Média" : partial ? "Média parcial" : "Média final"}
                            </p>
                            <p
                              className={`text-[22px] font-extrabold lg:text-2xl ${
                                average !== null && !partial && average + 1e-9 < sub.pass ? "text-loss" : ""
                              }`}
                            >
                              {average === null ? "—" : fmtGrade(average)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-ink-soft lg:text-xs">Passa com</p>
                            <p className="text-[22px] font-extrabold lg:text-2xl">{fmtGrade(sub.pass)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-ink-soft lg:text-xs">Faltas</p>
                            <p className={`text-[22px] font-extrabold lg:text-2xl ${absenceBad ? "text-loss" : ""}`}>
                              {ab.absences}
                              {ab.kind !== "no-limit" ? (
                                <span className="text-sm font-bold text-ink-soft"> de {ab.max}</span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/10" aria-hidden>
                          <div className="h-2 rounded-full bg-[#a78bfa]" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[13px] font-semibold text-[#c7cff7]">{note}</p>

                        <div className="flex items-center gap-2">
                          <p className={`min-w-0 flex-1 text-[13px] ${absenceBad ? "text-loss" : "text-ink-soft"}`}>
                            {absenceNote}
                          </p>
                          <form action={changeAbsence}>
                            <input type="hidden" name="id" value={sub.id} />
                            <input type="hidden" name="delta" value="-1" />
                            <button
                              type="submit"
                              disabled={sub.absences === 0}
                              aria-label={`Tirar uma falta de ${sub.name}`}
                              className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.07] text-ink-soft hover:text-ink disabled:opacity-30 lg:h-9 lg:w-9"
                            >
                              <Minus size={16} aria-hidden />
                            </button>
                          </form>
                          <form action={changeAbsence}>
                            <input type="hidden" name="id" value={sub.id} />
                            <input type="hidden" name="delta" value="1" />
                            <button
                              type="submit"
                              aria-label={`Somar uma falta em ${sub.name}`}
                              className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.12] text-ink hover:bg-white/[0.16] lg:h-9 lg:w-9"
                            >
                              <Plus size={16} aria-hidden />
                            </button>
                          </form>
                        </div>

                        {list.length || mine.length ? (
                          <ul className="border-t border-white/[0.07]">
                            {mine.map((e) => (
                              <li key={e.id} className="flex items-center gap-2 py-2">
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-semibold">{e.title}</span>
                                  <span className={`block text-[12px] ${e.daysLeft < 0 ? "text-loss" : "text-ink-soft"}`}>
                                    {e.typeName}, {formatShort(fromISODate(e.date))}
                                    {e.time ? ` às ${e.time}` : ""}
                                  </span>
                                </span>
                                <span className="rounded-full bg-[#2a2158] px-2.5 py-0.5 text-[12px] font-bold text-[#d9ccff]">
                                  {e.daysLeft === 0 ? "hoje" : e.daysLeft === 1 ? "amanhã" : `em ${e.daysLeft} dias`}
                                </span>
                              </li>
                            ))}
                            {list.map((g) => (
                              <li key={g.id} className="flex items-center gap-2 py-1.5">
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-semibold">{g.label}</span>
                                  <span className="block text-[12px] text-ink-soft">Peso {show(g.weight)}</span>
                                </span>
                                <span
                                  className={`shrink-0 text-[15px] font-extrabold ${
                                    g.value === null ? "text-ink-soft" : g.value >= sub.pass ? "" : "text-loss"
                                  }`}
                                >
                                  {g.value === null ? "sem nota" : show(g.value)}
                                </span>
                                <FormSheet
                                  title={g.value === null ? "Lançar nota" : "Editar avaliação"}
                                  trigger={`Editar ${g.label}`}
                                  submitLabel="Salvar"
                                  action={updateGrade}
                                  hidden={{ id: g.id }}
                                  variant="edit"
                                >
                                  <Field label="Avaliação">
                                    <TextInput name="label" required maxLength={60} defaultValue={g.label} />
                                  </Field>
                                  <div className="grid grid-cols-2 gap-3">
                                    <Field label="Peso">
                                      <TextInput name="weight" inputMode="decimal" defaultValue={show(g.weight)} required />
                                    </Field>
                                    <Field label="Nota" hint="Vazio = ainda não saiu">
                                      <TextInput
                                        name="value"
                                        inputMode="decimal"
                                        defaultValue={g.value === null ? "" : show(g.value)}
                                      />
                                    </Field>
                                  </div>
                                </FormSheet>
                                <DeleteButton action={deleteGrade} fields={{ id: g.id }} label={`Apagar ${g.label}`} />
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <FormSheet
                            title={`Avaliação de ${sub.name}`}
                            trigger="Avaliação"
                            submitLabel="Adicionar"
                            action={saveGrade}
                            hidden={{ subject_id: sub.id }}
                            triggerClassName={BTN_SMALL}
                          >
                            <Field label="Avaliação">
                              <TextInput name="label" required maxLength={60} placeholder="Ex.: Prova 1, Trabalho, MAPA" />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                              <Field label="Peso" hint="Se todas valem igual, deixe 1.">
                                <TextInput name="weight" inputMode="decimal" defaultValue="1" required />
                              </Field>
                              <Field label="Nota (opcional)" hint="Deixe vazio se não saiu.">
                                <TextInput name="value" inputMode="decimal" placeholder="Ex.: 7,5" />
                              </Field>
                            </div>
                          </FormSheet>
                          <FormSheet
                            title={`Prova ou trabalho de ${sub.name}`}
                            trigger="Prova ou trabalho"
                            submitLabel="Salvar na agenda"
                            action={saveAgendaItem}
                            hidden={{ subject_id: sub.id }}
                            triggerClassName={BTN_SMALL}
                          >
                            <Field label="O que é">
                              <TextInput name="title" required maxLength={80} defaultValue={`Prova de ${sub.name}`.slice(0, 80)} />
                            </Field>
                            <Field label="Tipo">
                              <Select
                                name="type_id"
                                defaultValue={examType?.id}
                                options={activeTypes.map((t) => ({ value: t.id, label: t.name }))}
                              />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                              <Field label="Data">
                                <TextInput name="date" type="date" required />
                              </Field>
                              <Field label="Hora (opcional)">
                                <TextInput name="time" type="time" />
                              </Field>
                            </div>
                            <Field label="Me avisar">
                              <Select name="remind_days" defaultValue="3" options={REMIND} />
                            </Field>
                          </FormSheet>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-[15px] text-ink-soft">Crie a primeira matéria em “Nova matéria”.</p>
              )}
            </section>

            <section className="glass rounded-3xl p-[18px] lg:min-h-0 lg:overflow-y-auto lg:px-6 lg:py-[22px]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base lg:text-[17px]">Horário de aulas</h2>
                {subjects.length ? (
                  <FormSheet
                    title="Aula no horário"
                    trigger="Adicionar aula"
                    submitLabel="Salvar aula"
                    action={saveClassSlot}
                    triggerClassName={BTN_SMALL}
                  >
                    <Field label="Matéria">
                      <Select name="subject_id" options={subjectOptions} />
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Dia">
                        <Select
                          name="weekday"
                          defaultValue="1"
                          options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAYS[d] }))}
                        />
                      </Field>
                      <Field label="Começa">
                        <TextInput name="starts_at" type="time" required />
                      </Field>
                      <Field label="Termina">
                        <TextInput name="ends_at" type="time" />
                      </Field>
                    </div>
                    <Field label="Sala ou link (opcional)">
                      <TextInput name="room" maxLength={60} placeholder="Ex.: sala 12, bloco B" />
                    </Field>
                  </FormSheet>
                ) : null}
              </div>
              <div
                className="mt-3 grid gap-1.5 lg:gap-2"
                style={{ gridTemplateColumns: `repeat(${gridDays.length}, minmax(0, 1fr))` }}
              >
                {gridDays.map((d) => {
                  const list = slots.filter((s) => s.weekday === d);
                  return (
                    <div key={d} className="min-h-16 min-w-0 rounded-[10px] bg-[#151d45] p-2 lg:min-h-24 lg:rounded-xl lg:p-2.5">
                      <p className="text-[11px] font-bold text-ink-soft lg:text-xs">{WD_SHORT[d]}</p>
                      <ul className="mt-1 space-y-1">
                        {list.map((s) => (
                          <li key={s.id} className="rounded-lg bg-[#4361f5]/25 px-1.5 py-1">
                            <p className="truncate text-[11px] leading-tight font-bold lg:text-[12px]">{s.subjectName}</p>
                            <p className="text-[10px] text-[#c7cff7] lg:text-[11px]">{s.startsAt}</p>
                            <DeleteButton
                              action={deleteClassSlot}
                              fields={{ id: s.id }}
                              label={`Tirar aula de ${s.subjectName} de ${WEEKDAYS[d]}`}
                              variant="text"
                              text="Tirar"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              {!slots.length ? (
                <p className="mt-2.5 text-[13px] font-semibold text-ink-soft">
                  Sem aulas cadastradas. Quando você adicionar, elas aparecem na grade e na Agenda.
                </p>
              ) : null}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
