import { interpretWithAI, AI_MODEL } from "@/lib/ai-intent";
import { todayInSaoPaulo } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Bateria de frases para conferir a IA. Não grava nada. Protegida por segredo.
const FRASES = [
  "ifood 15", "prova quarta 15 hrs", "prova 15", "mercado 45 pix", "uber 18,50 nubank", "dentista 150 sexta",
  "paguei a luz 120", "salário 3200", "recebi 200 do freela", "prova facul sexta algoritmo e lógica",
  "entrega do trabalho dia 28 23h", "dentista amanhã 14h30", "reunião 02/12 às 9", "quanto posso gastar hoje?",
  "o que tenho amanhã", "tênis 600 nubank 3x", "gasolina 100", "pizza 60 ontem", "prova de cálculo segunda 19h",
  "aniversário da mãe dia 3", "uber 22 amanhã", "netflix 55", "academia 99 débito", "consulta médica terça 10h",
  "comprei um lanche de 12 reais", "gastei 30 no ifood", "vendi meu fone por 150", "farmácia 37,90",
  "mapa de poo até domingo 23h59", "pagar internet dia 10", "15", "amanhã", "almoço com a galera 40",
  "entrevista de emprego quinta 15h", "atividade de extensão sexta", "luz 180 dividida com a namorada",
  "quanto gastei com lanche esse mês", "minha próxima prova é quando", "cinema 32 sábado", "prova sábado 8h",
  "aula de inglês terça 19h", "boleto da faculdade 450", "seminário em grupo dia 05/12 14h",
  "café 8", "recebi o vale 600", "tcc entrega 15/12", "corte de cabelo 40", "corte de cabelo sábado 10h",
  "estudar para a prova amanhã", "transferi 100 pra minha mãe",
];

export async function GET(request: Request) {
  const secret = process.env.REMINDER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const lote = Math.max(1, Number(new URL(request.url).searchParams.get("lote")) || 1);
  const frases = FRASES.slice((lote - 1) * 17, lote * 17);
  const cats = ["Mercado", "Alimentação", "Transporte", "Moradia", "Contas", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Salário", "Extra"];
  const out: unknown[] = [];
  for (const f of frases) {
    const r = await interpretWithAI(f, todayInSaoPaulo(), cats, ["Nubank"]);
    out.push({ f, r });
    await new Promise((ok) => setTimeout(ok, 2100));
  }
  return Response.json({ model: AI_MODEL, hasKey: Boolean(process.env.GROQ_API_KEY), lote, out });
}
