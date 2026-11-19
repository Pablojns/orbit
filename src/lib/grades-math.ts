// Contas das notas: média ponderada e quanto falta tirar nas avaliações que ainda não saíram.
export type GradeInput = { weight: number; value: number | null };

export type GradeStatus =
  | { kind: "empty" }
  | { kind: "final"; average: number; passed: boolean }
  | {
      kind: "pending";
      average: number | null;
      needed: number;
      pendingCount: number;
      possible: boolean;
      alreadyPassed: boolean;
    };

export function gradeStatus(grades: GradeInput[], pass: number, max: number): GradeStatus {
  if (!grades.length) return { kind: "empty" };
  const graded = grades.filter((g) => g.value !== null);
  const pending = grades.filter((g) => g.value === null);
  const totalWeight = grades.reduce((a, g) => a + g.weight, 0);
  const points = graded.reduce((a, g) => a + (g.value as number) * g.weight, 0);
  const gradedWeight = graded.reduce((a, g) => a + g.weight, 0);
  const average = gradedWeight ? points / gradedWeight : null;
  if (!pending.length) {
    const avg = points / totalWeight;
    return { kind: "final", average: avg, passed: avg + 1e-9 >= pass };
  }
  const pendingWeight = pending.reduce((a, g) => a + g.weight, 0);
  const needed = (pass * totalWeight - points) / pendingWeight;
  return {
    kind: "pending",
    average,
    needed: Math.max(0, needed),
    pendingCount: pending.length,
    possible: needed <= max + 1e-9,
    alreadyPassed: needed <= 0,
  };
}

export const fmtGrade = (n: number) =>
  (Math.ceil(n * 10 - 1e-9) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
