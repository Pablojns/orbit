import { redirect } from "next/navigation";

// As notas saíram da Agenda e foram para Estudos (21/11).
export default function OldGradesPage() {
  redirect("/app/estudos");
}
