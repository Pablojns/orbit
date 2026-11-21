// Entende frases curtas como "mercado 45 pix", "uber 18,50 nubank", "salário 3200 entrada",
// "tênis 600 nubank 3x" ou "ifood 42 ontem".

type Cat = { id: string; name: string; kind: string };
type CardRef = { id: string; name: string };

export type Parsed =
  | {
      type: "expense" | "income";
      amountCents: number;
      method: string;
      cardId: string | null;
      installments: number;
      categoryId: string | null;
      description: string;
      date: string | null;
      summary: string;
    }
  | { error: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Palavra -> nome da categoria padrão do Dimeta.
const KEYWORDS: Record<string, string[]> = {
  Mercado: ["mercado", "supermercado", "feira", "atacadao", "assai", "carrefour", "hortifruti", "acougue", "padaria"],
  Alimentação: [
    "ifood",
    "lanche",
    "almoco",
    "jantar",
    "restaurante",
    "pizza",
    "hamburguer",
    "cafe",
    "sorvete",
    "comida",
    "rappi",
    "marmita",
    "acai",
  ],
  Transporte: [
    "uber",
    "99",
    "onibus",
    "metro",
    "gasolina",
    "combustivel",
    "estacionamento",
    "pedagio",
    "passagem",
    "taxi",
    "posto",
  ],
  Moradia: ["aluguel", "condominio", "iptu", "reforma", "moveis"],
  Contas: ["luz", "agua", "internet", "celular", "telefone", "gas", "energia", "boleto"],
  Saúde: ["farmacia", "remedio", "medico", "consulta", "exame", "dentista", "academia", "plano"],
  Educação: ["faculdade", "curso", "livro", "mensalidade", "apostila", "material"],
  Lazer: ["cinema", "show", "bar", "cerveja", "jogo", "steam", "viagem", "passeio", "balada", "ingresso"],
  Assinaturas: ["netflix", "spotify", "prime", "disney", "youtube", "icloud", "gamepass", "hbo", "max", "assinatura"],
  Compras: ["roupa", "tenis", "shopee", "shein", "amazon", "mercadolivre", "presente", "loja"],
  Salário: ["salario", "pagamento", "holerite"],
  Extra: ["freela", "freelance", "bico", "venda", "pix recebido"],
};

const INCOME_WORDS = ["entrada", "recebi", "salario", "freela", "freelance", "renda", "ganhei"];

export function parseQuickText(text: string, cats: Cat[], cards: CardRef[]): Parsed {
  const original = text.trim();
  const tokens = norm(original).split(/\s+/).filter(Boolean);

  // Valor: primeiro número (aceita 45, 45,90, 1.200,50, R$45).
  let amountCents = 0;
  let amountIdx = -1;
  tokens.forEach((t, i) => {
    if (amountIdx >= 0) return;
    const m = /^r?\$?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(t) ?? /^r?\$?(\d+)\.(\d{1,2})$/.exec(t);
    if (m && !/^\d+x$/.test(t)) {
      const whole = Number(m[1].replace(/\./g, ""));
      const cents = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
      amountCents = whole * 100 + cents;
      amountIdx = i;
    }
  });
  if (!amountCents) return { error: "Não achei o valor. Escreva algo como: mercado 45 pix" };

  const used = new Set([amountIdx]);
  const type: "expense" | "income" = tokens.some((t) => INCOME_WORDS.includes(t)) ? "income" : "expense";
  tokens.forEach((t, i) => {
    if (t === "entrada" || t === "recebi" || t === "ganhei") used.add(i);
  });

  // Parcelas: "3x"
  let installments = 1;
  tokens.forEach((t, i) => {
    const m = /^(\d{1,2})x$/.exec(t);
    if (m) {
      installments = Math.min(48, Math.max(1, Number(m[1])));
      used.add(i);
    }
  });

  // Data: hoje / ontem / anteontem
  let date: string | null = null;
  const offset = (days: number) => {
    const now = new Date(
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()) + "T12:00:00Z",
    );
    now.setUTCDate(now.getUTCDate() - days);
    return now.toISOString().slice(0, 10);
  };
  tokens.forEach((t, i) => {
    if (t === "ontem" || t === "anteontem") {
      date = offset(t === "ontem" ? 1 : 2);
      used.add(i);
    }
    if (t === "hoje") used.add(i);
  });

  // Cartão: nome do cartão aparece na frase (ou "credito"/"cartao" com um cartão só).
  let cardId: string | null = null;
  let cardName = "";
  for (const c of cards) {
    const n = norm(c.name).split(/\s+/)[0];
    const idx = tokens.findIndex((t) => t === n || norm(c.name) === t);
    if (n && idx >= 0) {
      cardId = c.id;
      cardName = c.name;
      used.add(idx);
      break;
    }
  }
  let method = "pix";
  const methodWords: Record<string, string> = {
    pix: "pix",
    debito: "debit",
    dinheiro: "cash",
    especie: "cash",
    transferencia: "transfer",
    ted: "transfer",
    credito: "credit",
    cartao: "credit",
  };
  tokens.forEach((t, i) => {
    if (methodWords[t]) {
      method = methodWords[t];
      used.add(i);
    }
  });
  if (cardId) method = "credit";
  if (method === "credit" && !cardId) {
    if (cards.length === 1) {
      cardId = cards[0].id;
      cardName = cards[0].name;
    } else if (!cards.length) {
      return { error: "Você ainda não tem cartão cadastrado. Cadastre em Dinheiro › Cartões." };
    } else {
      return { error: `Qual cartão? Escreva o nome dele na frase, como: ${norm(cards[0].name)}` };
    }
  }
  if (installments > 1 && method !== "credit") {
    if (cards.length === 1) {
      method = "credit";
      cardId = cards[0].id;
      cardName = cards[0].name;
    } else return { error: "Parcelado só no cartão. Escreva o nome do cartão na frase." };
  }
  if (type === "income") {
    method = "pix";
    cardId = null;
    installments = 1;
  }

  // Descrição: o que sobrou da frase original.
  const origTokens = original.split(/\s+/).filter(Boolean);
  const description = origTokens
    .filter((_, i) => !used.has(i))
    .join(" ")
    .slice(0, 120);
  const descNorm = norm(description);

  // Categoria: nome da categoria na frase, ou palavra-chave.
  const kindCats = cats.filter((c) => c.kind === type);
  let category = kindCats.find((c) => descNorm.split(/\s+/).includes(norm(c.name)));
  if (!category) {
    for (const [catName, words] of Object.entries(KEYWORDS)) {
      if (words.some((w) => descNorm.split(/\s+/).includes(w) || (w.includes(" ") && descNorm.includes(w)))) {
        category = kindCats.find((c) => norm(c.name) === norm(catName));
        if (category) break;
      }
    }
  }

  const methodLabel: Record<string, string> = {
    pix: "Pix",
    debit: "débito",
    cash: "dinheiro",
    transfer: "transferência",
    credit: cardName ? `cartão ${cardName}` : "cartão",
  };
  const parts = [
    category ? category.name : "sem categoria",
    type === "expense" ? methodLabel[method] : null,
    installments > 1 ? `${installments}x` : null,
    date ? "ontem ou antes" : null,
  ].filter(Boolean);

  return {
    type,
    amountCents,
    method,
    cardId,
    installments,
    categoryId: category?.id ?? null,
    description: description || (category?.name ?? ""),
    date,
    summary: `(${parts.join(", ")})`,
  };
}
