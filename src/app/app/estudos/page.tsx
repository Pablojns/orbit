import { BookOpen, GraduationCap, Minus, Plus } from "lucide-react";
import {
  archiveSubject,
  changeAbsence,
  deleteClassSlot,
  deleteGrade,
  saveAgendaItem,
  saveClassSlot,
  saveGrade,
  saveSubject,
  saveTerm,
  updateGrade,
  updateSubject,
} from "@/app/app/actions";
import { EmptyState } from "@/components/empty-state";
import { countdown } from "@/components/event-row";
import { Field, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/undo";
import { formatShort, fromISODate } from "@/lib/dates";
import { fmtGrade, gradeStatus } from "@/lib/grades-math";
import { getEventTypes } from "@/lib/routine";
import { getStudies } from "@/lib/studies";
import { TermEnded } from "@/components/term-ended";
import { todayInSaoPaulo, toISODate } from "@/lib/dates";
import { absenceStatus, WEEKDAYS } from "@/lib/studies-math";

export const metadata = { title: "Estudos" };
export const dynamic = "force-dynamic";

const show = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const n = (v: number) => v;

const REMIND = [
  { value: "0", label: "Só no dia e na véspera" },
  { value: "2", label: "2 dias antes" },
  { value: "3", label: "3 dias antes" },
  { value: "7", label: "1 semana antes" },
  { value: "14", label: "2 semanas antes" },
];

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
  const [{ subjects, grades, slots, term, linked }, types] = await Promise.all([getStudies(), getEventTypes()]);
  const activeTypes = types.filter((t) => !t.archived);
  const todayISO = toISODate(todayInSaoPaulo());
  const examType = activeTypes.find((t) => t.baseKind === "exam") ?? activeTypes[0];
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => d !== 0 || slots.some((s) => s.weekday === 0));

  return (
    <>
      <PageHeader title="Estudos" subtitle="Faculdade, escola ou cursinho: matérias, notas, faltas, provas e aulas." />
      {term && slots.length && term.endsOn < todayISO ? <TermEnded link={false} /> : null}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FormSheet title="Nova matéria" trigger="Nova matéria" submitLabel="Criar matéria" action={saveSubject}>
          <SubjectFields />
        </FormSheet>
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm">
          <span className="text-ink-soft">Semestre:</span>
          <span className="font-semibold">
            {term
              ? `${formatShort(fromISODate(term.startsOn))} a ${formatShort(fromISODate(term.endsOn))}`
              : "sem datas"}
          </span>
          <FormSheet
            title="Datas do semestre"
            trigger={term ? "Mudar" : "Definir"}
            submitLabel="Salvar semestre"
            action={saveTerm}
            variant="link"
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
        </div>
      </div>

      {!subjects.length ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhuma matéria ainda"
          description="Crie uma matéria e cadastre provas, trabalhos, faltas e o horário das aulas. O Dimeta mostra sua média e quanto precisa tirar para passar."
        />
      ) : (
        <>
          <section className="glass mb-5 rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Horário de aulas</h2>
                <p className="text-sm text-ink-soft">As aulas também aparecem na Agenda e no calendário.</p>
              </div>
              <FormSheet title="Aula no horário" trigger="Aula" submitLabel="Salvar aula" action={saveClassSlot} variant="glass">
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
            </div>
            {slots.length ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3 2xl:grid-cols-6">
                {days.map((d) => {
                  const list = slots.filter((s) => s.weekday === d);
                  return (
                    <div key={d} className="rounded-2xl bg-white/[0.03] p-2.5">
                      <p className="text-xs font-semibold text-ink-soft">{WEEKDAYS[d]}</p>
                      {list.length ? (
                        <ul className="mt-1.5 space-y-1.5">
                          {list.map((s) => (
                            <li key={s.id} className="flex items-start gap-1 rounded-xl bg-white/[0.05] px-2 py-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] leading-snug font-medium break-words">{s.subjectName}</p>
                                <p className="text-[11px] text-ink-soft">
                                  {s.startsAt}
                                  {s.endsAt ? `–${s.endsAt}` : ""}
                                  {s.room ? ` · ${s.room}` : ""}
                                </p>
                              </div>
                              <DeleteButton
                                action={deleteClassSlot}
                                fields={{ id: s.id }}
                                label={`Tirar aula de ${s.subjectName} de ${WEEKDAYS[d]}`}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-[12px] text-white/25">Sem aula</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-[15px] text-ink-soft">Cadastre as aulas da semana em “Aula”.</p>
            )}
          </section>

          <ul className="grid gap-4 lg:grid-cols-2">
            {subjects.map((sub) => {
              const list = grades.filter((g) => g.subjectId === sub.id);
              const pass = sub.pass;
              const max = sub.max;
              const st = gradeStatus(
                list.map((g) => ({ weight: g.weight, value: g.value })),
                pass,
                max,
              );
              const ab = absenceStatus(sub.absences, sub.maxAbsences);
              const mine = linked.filter((e) => e.subjectId === sub.id);
              // Sessões "Estudar:" ficam numa linha própria, separadas das provas e trabalhos.
              const exams = mine.filter((e) => e.kind !== "study");
              const studies = mine.filter((e) => e.kind === "study");
              const examAhead = exams.some((e) => e.kind === "exam" && e.daysLeft >= 0);
              return (
                <li key={sub.id} className="glass rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">{sub.name}</h2>
                      <p className="text-[13px] text-ink-soft">
                        Passa com {show(pass)} de {show(max)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <FormSheet
                        title="Editar matéria"
                        trigger={`Editar ${sub.name}`}
                        submitLabel="Salvar alterações"
                        action={updateSubject}
                        hidden={{ id: sub.id }}
                        variant="edit"
                      >
                        <SubjectFields name={sub.name} pass={pass} max={max} maxAbsences={sub.maxAbsences} />
                      </FormSheet>
                      <DeleteButton action={archiveSubject} fields={{ id: sub.id }} label={`Arquivar ${sub.name}`} />
                    </div>
                  </div>

                  {/* Faltas */}
                  <div
                    className={`mt-3 flex items-center gap-3 rounded-2xl p-3 text-[14px] ${
                      ab.kind === "over" || ab.kind === "at-limit"
                        ? "bg-loss/10"
                        : ab.kind === "near"
                          ? "bg-sun/10"
                          : "bg-white/[0.04]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p>
                        Faltas:{" "}
                        <strong className="font-display text-lg">
                          {ab.absences}
                          {ab.kind !== "no-limit" ? ` de ${ab.max}` : ""}
                        </strong>
                      </p>
                      <p
                        className={`text-[13px] ${
                          ab.kind === "over" || ab.kind === "at-limit"
                            ? "text-loss"
                            : ab.kind === "near"
                              ? "text-sun"
                              : "text-ink-soft"
                        }`}
                      >
                        {ab.kind === "no-limit"
                          ? "Edite a matéria para dizer o máximo de faltas."
                          : ab.kind === "over"
                            ? "Passou do limite de faltas."
                            : ab.kind === "at-limit"
                              ? "No limite: não pode faltar mais."
                              : ab.kind === "near"
                                ? `Perto do limite: ${ab.left === 1 ? "só pode faltar mais 1" : `pode faltar mais ${ab.left}`}.`
                                : `Pode faltar mais ${ab.left}.`}
                      </p>
                    </div>
                    <form action={changeAbsence}>
                      <input type="hidden" name="id" value={sub.id} />
                      <input type="hidden" name="delta" value="-1" />
                      <button
                        type="submit"
                        disabled={sub.absences === 0}
                        aria-label={`Tirar uma falta de ${sub.name}`}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-ink-soft hover:text-ink disabled:opacity-30"
                      >
                        <Minus size={15} aria-hidden />
                      </button>
                    </form>
                    <form action={changeAbsence}>
                      <input type="hidden" name="id" value={sub.id} />
                      <input type="hidden" name="delta" value="1" />
                      <button
                        type="submit"
                        aria-label={`Somar uma falta em ${sub.name}`}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.1] text-ink hover:bg-white/[0.14]"
                      >
                        <Plus size={15} aria-hidden />
                      </button>
                    </form>
                  </div>

                  {/* Provas e trabalhos ligados à Agenda */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-soft">Provas e trabalhos</p>
                      <FormSheet
                        title={`Prova ou trabalho de ${sub.name}`}
                        trigger="Prova ou trabalho"
                        submitLabel="Salvar na agenda"
                        action={saveAgendaItem}
                        hidden={{ subject_id: sub.id }}
                        variant="link"
                      >
                        <Field label="O que é">
                          <TextInput
                            name="title"
                            required
                            maxLength={80}
                            defaultValue={`Prova de ${sub.name}`.slice(0, 80)}
                          />
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
                    {exams.length ? (
                      <ul className="mt-1 divide-y divide-white/[0.06]">
                        {exams.map((e) => (
                          <li key={e.id} className="flex items-center gap-2.5 py-2">
                            <span
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                              style={{ backgroundColor: `${e.color}26`, color: e.color }}
                            >
                              <BookOpen size={15} aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-medium">{e.title}</p>
                              <p className={`text-[12px] ${e.daysLeft < 0 ? "text-loss" : "text-ink-soft"}`}>
                                {countdown(e.daysLeft)}, {e.typeName.toLowerCase()}, {formatShort(fromISODate(e.date))}
                                {e.time ? ` às ${e.time}` : ""}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[13px] text-ink-soft">Nada marcado. Fica na Agenda com os mesmos avisos.</p>
                    )}
                    {studies.length ? (
                      <p className="mt-2 text-[13px] text-ink-soft">
                        <span className="font-semibold text-ink">
                          {studies.length} {studies.length === 1 ? "sessão" : "sessões"} de estudo
                        </span>{" "}
                        marcadas: {studies.map((e) => formatShort(fromISODate(e.date))).join(", ")}.
                      </p>
                    ) : null}
                  </div>

                <div className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-[14px]">
                  {st.kind === "empty" ? (
                    <p className="text-ink-soft">Cadastre as avaliações (com ou sem nota) para ver a conta.</p>
                  ) : st.kind === "final" && examAhead ? (
                    <p>
                      Média parcial <strong className="font-display text-lg">{fmtGrade(st.average)}</strong>{" "}
                      <span className="text-ink-soft">· ainda tem prova marcada</span>
                    </p>
                  ) : st.kind === "final" ? (
                    <p>
                      Média final <strong className="font-display text-lg">{fmtGrade(st.average)}</strong>{" "}
                      <span className={st.passed ? "text-gain" : "text-loss"}>
                        {st.passed ? "· aprovado" : "· abaixo da média"}
                      </span>
                    </p>
                  ) : (
                    <>
                      <p className="text-ink-soft">
                        Média até agora:{" "}
                        <strong className="text-ink">{st.average === null ? "sem notas" : fmtGrade(st.average)}</strong>
                      </p>
                      <p className="mt-1">
                        {st.alreadyPassed ? (
                          <span className="text-gain">Você já garantiu a média. Mesmo tirando 0, passa.</span>
                        ) : !st.possible ? (
                          <span className="text-loss">
                            Precisaria de {fmtGrade(st.needed)}, acima da nota máxima. Veja se tem recuperação.
                          </span>
                        ) : (
                          <>
                            Precisa tirar{" "}
                            <strong className="font-display text-lg text-sun">{fmtGrade(st.needed)}</strong>
                            {st.pendingCount > 1 ? ` em cada uma das ${st.pendingCount} que faltam` : " na que falta"}.
                          </>
                        )}
                      </p>
                    </>
                  )}
                </div>

                {list.length ? (
                  <ul className="mt-2 divide-y divide-white/[0.06]">
                    {list.map((g) => (
                      <li key={g.id} className="flex items-center gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px]">{g.label}</p>
                          <p className="text-[12px] text-ink-soft">Peso {show(n(g.weight))}</p>
                        </div>
                        <span
                          className={`font-display shrink-0 text-[15px] font-semibold ${
                            g.value === null ? "text-ink-soft" : n(g.value) >= pass ? "text-gain" : "text-loss"
                          }`}
                        >
                          {g.value === null ? "sem nota" : show(n(g.value))}
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
                              <TextInput name="weight" inputMode="decimal" defaultValue={show(n(g.weight))} required />
                            </Field>
                            <Field label="Nota" hint="Vazio = ainda não saiu">
                              <TextInput
                                name="value"
                                inputMode="decimal"
                                defaultValue={g.value === null ? "" : show(n(g.value))}
                              />
                            </Field>
                          </div>
                        </FormSheet>
                        <DeleteButton action={deleteGrade} fields={{ id: g.id }} label={`Apagar ${g.label}`} />
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-3">
                  <FormSheet
                    title={`Avaliação de ${sub.name}`}
                    trigger="Avaliação"
                    submitLabel="Adicionar"
                    action={saveGrade}
                    hidden={{ subject_id: sub.id }}
                    variant="glass"
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
                </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
