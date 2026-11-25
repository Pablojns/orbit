// Dados públicos do site. Aparecem na Política de Privacidade, nos Termos de Uso, no rodapé e nos e-mails.
// MARCADORES: troque pelos valores reais antes de divulgar (ver docs/PENDENCIAS-DO-PABLO.md).
// O endereço vem de NEXT_PUBLIC_SITE_URL (na Vercel). Sem ela, usa o endereço atual.
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dimeta.vercel.app"
).replace(/\/$/, "");

export const SITE = {
  name: "Dimeta",
  url: siteUrl, // depois do domínio: https://dimeta.com.br
  host: new URL(siteUrl).host,
  legalName: "[RAZÃO SOCIAL] — CNPJ [00.000.000/0000-00]", // MARCADOR: nome e CNPJ reais
  contactEmail: "[contato@dimeta.com.br]", // MARCADOR: e-mail que você lê de verdade
  updatedAt: "25 de novembro de 2026",
};

// Os marcadores ainda não foram trocados?
export const SITE_HAS_PLACEHOLDERS =
  SITE.legalName.includes("[") || SITE.contactEmail.includes("[");
