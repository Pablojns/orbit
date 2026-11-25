import "server-only";
import { AUTH_ENABLED } from "./flags";
import { buildEmail, type EmailKind } from "./email-templates";

// Envio pelos e-mails de sistema via Resend (API HTTP, sem biblioteca extra).
// Só envia com AUTH_ENABLED ligado e com as variáveis RESEND_API_KEY e EMAIL_FROM na Vercel.
// Sem elas, não envia e não quebra nada: só registra no log.
export async function sendSystemEmail(
  to: string,
  kind: EmailKind,
  data: { name?: string | null; date?: string } = {},
): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!AUTH_ENABLED) return { sent: false, reason: "login desligado" };
  if (!key || !from) {
    console.info(
      `[email] ${kind} para ${to.replace(/(.).+@/, "$1***@")} não enviado: falta RESEND_API_KEY ou EMAIL_FROM`,
    );
    return { sent: false, reason: "sem chave" };
  }
  const mail = buildEmail(kind, data);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    if (!res.ok) {
      console.error(`[email] ${kind} falhou: ${res.status}`);
      return { sent: false, reason: `erro ${res.status}` };
    }
    return { sent: true };
  } catch {
    console.error(`[email] ${kind} falhou: rede`);
    return { sent: false, reason: "rede" };
  }
}
