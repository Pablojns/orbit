// Chaves de configuração (Rodada 9). Desligadas por padrão: com as duas desligadas,
// o app funciona como hoje (modo teste, um dono só).
export const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";
export const BILLING_ENABLED = process.env.BILLING_ENABLED === "true";
