// Textos dos e-mails de sistema (Rodada 11). Puros, sem envio, para poderem ser testados.
import { PRICE_LABEL, TRIAL_DAYS } from "./billing";

export type EmailKind =
  "welcome" | "trial_ending" | "payment_ok" | "payment_late" | "canceled";
export type Email = { subject: string; text: string; html: string };

const APP_URL = "https://dimeta.vercel.app/app";

function wrap(
  title: string,
  paragraphs: string[],
  cta?: { label: string; url: string },
): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p}</p>`)
    .join("");
  const button = cta
    ? `<p style="margin:22px 0 0"><a href="${cta.url}" style="background:#4361F5;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;display:inline-block">${cta.label}</a></p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#070B1F;padding:28px 14px;font-family:Arial,Helvetica,sans-serif;color:#EEF1FF"><div style="max-width:520px;margin:0 auto;background:#0F1634;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:28px"><p style="margin:0 0 18px;font-weight:800;font-size:18px">Dimeta</p><h1 style="margin:0 0 16px;font-size:22px">${title}</h1>${body}${button}<p style="margin:26px 0 0;font-size:12px;color:#98A2CC">Você recebeu este e-mail porque tem conta no Dimeta.</p></div></body></html>`;
}

const strip = (s: string) => s.replace(/<[^>]+>/g, "");

export function buildEmail(
  kind: EmailKind,
  data: { name?: string | null; date?: string } = {},
): Email {
  const hi = data.name ? `Oi, ${data.name}!` : "Oi!";
  let subject: string;
  let title: string;
  let lines: string[];
  let cta: { label: string; url: string } | undefined = {
    label: "Abrir o Dimeta",
    url: APP_URL,
  };
  switch (kind) {
    case "welcome":
      subject = "Bem-vindo ao Dimeta";
      title = "Sua conta está pronta";
      lines = [
        hi,
        `Você tem ${TRIAL_DAYS} dias grátis para usar tudo. Responda as 5 perguntas do começo e o Dimeta já mostra quanto você pode gastar por dia até o próximo salário.`,
        "Dica: aperte o microfone e fale, como “mercado 45 no pix”.",
      ];
      break;
    case "trial_ending":
      subject = "Seu teste grátis termina em breve";
      title = "Faltam 2 dias do teste grátis";
      lines = [
        hi,
        `Seu teste grátis vai até ${data.date ?? "daqui a 2 dias"}. Para continuar, assine por ${PRICE_LABEL} por mês, no Pix, cartão ou boleto.`,
        "Se não assinar, seus dados ficam guardados e você pode voltar quando quiser.",
      ];
      cta = { label: "Assinar", url: `${APP_URL}/assinatura` };
      break;
    case "payment_ok":
      subject = "Pagamento confirmado";
      title = "Recebemos seu pagamento";
      lines = [
        hi,
        `Sua assinatura do Dimeta (${PRICE_LABEL} por mês) está em dia. O recibo fica em Assinatura, no app.`,
      ];
      cta = { label: "Ver recibos", url: `${APP_URL}/assinatura` };
      break;
    case "payment_late":
      subject = "Pagamento pendente";
      title = "Não identificamos seu pagamento";
      lines = [
        hi,
        "A mensalidade do Dimeta está em aberto. Você tem 3 dias de tolerância; depois disso o acesso fica pausado até o pagamento, sem perder nada.",
      ];
      cta = { label: "Pagar agora", url: `${APP_URL}/assinatura` };
      break;
    case "canceled":
      subject = "Assinatura cancelada";
      title = "Sua assinatura foi cancelada";
      lines = [
        hi,
        "Você continua com acesso até o fim do mês já pago. Seus dados ficam guardados: é só assinar de novo para voltar de onde parou.",
      ];
      break;
  }
  const html = wrap(title, lines, cta);
  const text = [
    title,
    "",
    ...lines.map(strip),
    "",
    cta ? `${cta.label}: ${cta.url}` : "",
  ]
    .join("\n")
    .trim();
  return { subject, text, html };
}
