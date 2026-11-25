// Busca inteligente do Extrato (Rodada 14): uma palavra acha também os sinônimos do grupo.
// Ex.: "comida" acha iFood, mercado, restaurante; "transporte" acha uber, 99, gasolina.

export const SYNONYMS: Record<string, string[]> = {
  comida: [
    "comida", "alimentacao", "alimento", "ifood", "mercado", "supermercado", "restaurante", "lanche", "lanchonete",
    "almoco", "jantar", "cafe", "padaria", "pizza", "hamburguer", "acougue", "feira", "rappi", "delivery", "marmita",
  ],
  transporte: [
    "transporte", "uber", "99", "taxi", "gasolina", "combustivel", "etanol", "posto", "onibus", "metro", "passagem",
    "estacionamento", "pedagio", "carro", "moto", "oficina", "bilhete",
  ],
  casa: [
    "casa", "moradia", "aluguel", "condominio", "luz", "energia", "agua", "gas", "internet", "wifi", "iptu",
    "limpeza", "manutencao",
  ],
  saude: [
    "saude", "farmacia", "remedio", "medico", "consulta", "dentista", "exame", "hospital", "academia", "plano de saude",
  ],
  lazer: [
    "lazer", "cinema", "show", "bar", "balada", "viagem", "jogo", "games", "streaming", "netflix", "spotify", "passeio",
  ],
  estudos: ["estudos", "educacao", "faculdade", "curso", "livro", "mensalidade", "material", "apostila", "escola"],
  compras: ["compras", "roupa", "tenis", "sapato", "loja", "shopee", "amazon", "mercado livre", "presente", "eletronico"],
  contas: ["contas", "conta", "boleto", "fatura", "assinatura", "celular", "telefone", "plano"],
  salario: ["salario", "pagamento", "holerite", "vale", "adiantamento", "renda", "freela", "extra", "pix recebido"],
};

export const fold = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Termos que valem para a busca: a própria palavra e, se ela estiver em um grupo, o grupo inteiro.
export function expandQuery(query: string): string[] {
  const q = fold(query);
  if (!q) return [];
  const out = new Set<string>([q]);
  for (const words of Object.values(SYNONYMS)) {
    if (words.some((w) => w === q || (q.length >= 4 && w.startsWith(q)))) words.forEach((w) => out.add(w));
  }
  return [...out];
}

// Busca palavra a palavra: "comida pix" = (algo de comida) E (pix).
export function matchesSearch(haystack: string, query: string): boolean {
  const h = ` ${fold(haystack)} `;
  const parts = fold(query).split(" ").filter(Boolean);
  if (!parts.length) return true;
  const whole = expandQuery(query);
  if (whole.length > 1 && whole.some((t) => hit(h, t))) return true;
  return parts.every((p) => expandQuery(p).some((t) => hit(h, t)));
}

function hit(h: string, term: string): boolean {
  // termos curtos ("99", "gas", "bar") precisam ser palavra inteira; os longos podem ser parte.
  if (term.length <= 3) return h.includes(` ${term} `) || new RegExp(`[^a-z0-9]${term}[^a-z0-9]`).test(h);
  return h.includes(term);
}
