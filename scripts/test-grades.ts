import { gradeStatus } from "../src/lib/grades-math";
let f = 0;
const eq = (a: unknown, b: unknown, m: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { f++; console.log("FALHOU", m, a, b); } };
// P1 peso 1 = 5, P2 peso 1 pendente, média 6 -> precisa 7
let r = gradeStatus([{ weight: 1, value: 5 }, { weight: 1, value: null }], 6, 10);
eq(r.kind === "pending" && r.needed, 7, "precisa 7");
// pesos: P1 (peso 2) = 8, P2 (peso 3) pendente, média 7 -> (35-16)/3 = 6.333
r = gradeStatus([{ weight: 2, value: 8 }, { weight: 3, value: null }], 7, 10);
eq(r.kind === "pending" && Math.round(r.needed * 1000), 6333, "pesos");
// impossível
r = gradeStatus([{ weight: 1, value: 0 }, { weight: 1, value: null }], 6, 10);
eq(r.kind === "pending" && r.possible, false, "impossivel");
// já passou
r = gradeStatus([{ weight: 3, value: 10 }, { weight: 1, value: null }], 6, 10);
eq(r.kind === "pending" && r.alreadyPassed, true, "ja passou");
// final
r = gradeStatus([{ weight: 1, value: 6 }, { weight: 1, value: 7 }], 6, 10);
eq(r.kind === "final" && r.passed, true, "final aprovado");
console.log(f ? `${f} falhas` : "todas as contas de nota passaram");
process.exit(f ? 1 : 0);
