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
}: {
  m: Movement;
  today: CalendarDate;
  deletable?: boolean;
  edit?: React.ReactNode;
}) {
  const income = m.type === "income";
  const title = m.description || m.category?.name || (income ? "Entrada" : "Gasto");
  const payment =
    m.source === "card_purchase"
      ? `${m.cardName}${m.installments && m.installments > 1 ? ` em ${m.installments}x` : ""}`
      : m.paymentMethod
        ? METHOD_LABEL[m.paymentMethod]
        : null;
  const meta = [m.description ? m.category?.name : null, payment, formatDayLabel(m.occurredOn, today)]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          income ? "bg-gain/15 text-gain" : "bg-white/[0.06] text-ink"
        }`}
      >
        <CategoryIcon name={m.category?.icon} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <p className="truncate text-[13px] text-ink-soft">{meta}</p>
      </div>
      <p className={`shrink-0 text-[15px] font-semibold ${income ? "text-gain" : "text-ink"}`}>
        {income ? "+" : "−"} {formatCents(m.amountCents)}
      </p>
      {edit}
      {deletable ? (
        <DeleteButton action={deleteMovement} fields={{ id: m.id, source: m.source }} label={`Excluir ${title}`} />
      ) : null}
    </li>
  );
}
