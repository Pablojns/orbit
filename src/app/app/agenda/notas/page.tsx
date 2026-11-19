import { GraduationCap } from "lucide-react";
import { archiveSubject, deleteGrade, saveGrade, saveSubject, updateGrade, updateSubject } from "@/app/app/actions";
import { AgendaTabs } from "@/components/agenda-tabs";
import { EmptyState } from "@/components/empty-state";
import { Field, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/undo";
import { fmtGrade, gradeStatus } from "@/lib/grades-math";
import { OWNER_ID } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notas" };
export const dynamic = "force-dynamic";

const n = (v: unknown) => Number(v);
const show = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export default async function GradesPage() {
  const supabase = await createClient();
  const [{ data: subjects }, { data: grades }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, pass_grade, max_grade")
      .eq("user_id", OWNER_ID)
      .eq("is_archived", false)
      .order("created_at"),
    supabase.from("grades").select("id, subject_id, label, weight, value").eq("user_id", OWNER_ID).order("created_at"),
  ]);

  return (
    <>
      <PageHeader title="Agenda" subtitle="Notas e médias de cada matéria." />
      <AgendaTabs />

      <div className="mb-5">
        <FormSheet title="Nova matéria" trigger="Nova matéria" submitLabel="Criar matéria" action={saveSubject}>
          <Field label="Matéria">
            <TextInput name="name" required maxLength={60} placeholder="Ex.: Estatística" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Média para passar">
              <TextInput name="pass_grade" inputMode="decimal" defaultValue="6" required />
            </Field>
            <Field label="Nota máxima">
              <TextInput name="max_grade" inputMode="decimal" defaultValue="10" required />
            </Field>
          </div>
        </FormSheet>
      </div>

      {!subjects?.length ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhuma matéria ainda"
          description="Crie uma matéria, cadastre as provas e trabalhos com o peso de cada um. O Orbit mostra sua média e quanto precisa tirar para passar."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {subjects.map((sub) => {
            const list = (grades ?? []).filter((g) => g.subject_id === sub.id);
            const pass = n(sub.pass_grade);
            const max = n(sub.max_grade);
            const st = gradeStatus(
              list.map((g) => ({ weight: n(g.weight), value: g.value === null ? null : n(g.value) })),
              pass,
              max,
            );
            return (
              <li key={sub.id} className="glass rounded-[1.75rem] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{sub.name}</h2>
                    <p className="text-[13px] text-ink-soft">
                      Passa com {show(pass)} de {show(max)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <FormSheet
                      title="Editar matéria"
                      trigger={`Editar ${sub.name}`}
                      submitLabel="Salvar alterações"
                      action={updateSubject}
                      hidden={{ id: sub.id }}
                      variant="edit"
                    >
                      <Field label="Matéria">
                        <TextInput name="name" required maxLength={60} defaultValue={sub.name} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Média para passar">
                          <TextInput name="pass_grade" inputMode="decimal" defaultValue={show(pass)} required />
                        </Field>
                        <Field label="Nota máxima">
                          <TextInput name="max_grade" inputMode="decimal" defaultValue={show(max)} required />
                        </Field>
                      </div>
                    </FormSheet>
                    <DeleteButton
                      action={archiveSubject}
                      fields={{ id: sub.id }}
                      label={`Arquivar ${sub.name}`}
                      variant="text"
                      text="Arquivar"
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-[14px]">
                  {st.kind === "empty" ? (
                    <p className="text-ink-soft">Cadastre as avaliações (com ou sem nota) para ver a conta.</p>
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
      )}
    </>
  );
}
