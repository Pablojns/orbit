import { VoiceBench } from "./bench";

export const metadata = { title: "Teste de voz" };
export const dynamic = "force-dynamic";

// Página escondida (sem link no menu) para medir os tempos da voz. Rodada 14.
export default function VoiceBenchPage() {
  return <VoiceBench />;
}
