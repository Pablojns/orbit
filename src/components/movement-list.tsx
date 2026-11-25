import { DeleteButton } from "@/components/undo";
import { deleteMovement } from "@/app/app/actions";
import { formatDayLabel, type CalendarDate } from "@/lib/dates";
import type { Movement } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { CategoryIcon } from "./category-icon";

const METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  debit: "Débito",
  cash: "Dinheiro",
  transfer: "Transferência",
  other: "Outro",
  credit: "Crédito",
};

export function MovementRow({
  m,
  today,
  deletable,
  edit,
  compact,
}: {
  compact?: boolean;
  m: Movement;
  today: CalendarDate;
  deletable?: boolean;
  edit?: React.ReactNode;
}) {
  const income = m.type === "income";
  const title =
    m.description || m.category?.name || (income ? "Entrada" : "Gasto");
  const payment =
    m.source === "card_purchase"
      ? `${m.cardName}${m.installments && m.installments > 1 ? `, parcela ${m.installmentNumber ?? 1} de ${m.installments}` : ""}`
      : m.source === "bill_payment"
        ? "Conta fixa paga"
        : m.paymentMethod
          ? METHOD_LABEL[m.paymentMethod]
          : null;
  const meta = [
    m.description ? m.category?.name : null,
    payment,
    formatDayLabel(m.occurredOn, today),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li
      className={`flex items-center ${
        compact
          ? "gap-1.5 py-2.5 [&_button]:h-8 [&_button]:w-8 [&_svg]:h-[14px] [&_svg]:w-[14px]"
          : "gap-3 py-3"
      }`}
    >
      {compact ? null : (
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            income
              ? "bg-[#34d399]/15 text-[#6ee7b7]"
              : "bg-white/[0.06] text-ink"
          }`}
        >
          <CategoryIcon name={m.category?.icon} size={19} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-medium ${compact ? "text-sm" : "text-[15px]"}`}
        >
          {title}
        </p>
        <p
          className={`truncate text-ink-soft ${compact ? "text-xs" : "text-[13px]"}`}
        >
          {meta}
        </p>
      </div>
      <p
        className={`shrink-0 ${compact ? "text-sm" : "text-[15px]"} font-semibold ${income ? "text-[#6ee7b7]" : "text-[#ff9db0]"}`}
      >
        {income ? "+" : "−"} {formatCents(m.amountCents)}
      </p>
      {edit}
      {deletable ? (
        <DeleteButton
          action={deleteMovement}
          fields={{ id: m.id, source: m.source }}
          label={
            m.source === "bill_payment"
              ? `Desfazer pagamento de ${title}`
              : `Excluir ${title}`
          }
        />
      ) : null}
    </li>
  );
}
