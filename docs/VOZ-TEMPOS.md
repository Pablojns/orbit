# Voz: tempo de cada etapa (Rodada 14, 25/11)

Meta: menos de **2,5 s** entre parar de falar e ouvir a confirmação.

## Como medi
- Página escondida **/app/voz-teste** (sem link no menu), no app em produção.
- Áudios de teste gerados por voz sintética (espeak) e enviados pelo mesmo caminho do microfone: navegador → `/api/voz` → Groq Whisper.
- O navegador de teste fica num servidor fora do Brasil e não tem microfone. Por isso, "ida e volta" daqui é um pouco pior do que no seu celular ou PC.
- No uso real, o pop-up mostra embaixo: "Da sua fala até a resposta: X s (transcrever · entender · salvar)". Os últimos 20 tempos ficam guardados no aparelho (`dimeta.voz.tempos`).

## Resultados

| Etapa | Tempo medido | Observação |
|---|---|---|
| Perceber o fim da fala (VAD) | 0,55 s fixo | silêncio que o detector espera; ajustável |
| Transcrever (Whisper na Groq) | 0,20–0,30 s | só a Groq |
| Transcrever, ida e volta | 0,45–1,3 s (meio: ~0,65 s) | inclui envio do áudio e as palavras da pessoa (0,07–0,39 s) |
| Entender + salvar, **caminho rápido** | 0,35–0,47 s ida e volta (servidor 0,15–0,23 s) | "mercado 45 no pix", "uber 18 no débito" |
| Entender + salvar, **com IA** | 1,2–1,7 s ida e volta (IA 0,7–0,8 s; servidor 0,8–0,9 s) | "ifood 32 no pix" (categoria ambígua) |
| Começar a falar a resposta | ~0,1–0,3 s | voz do aparelho; não deu para medir aqui |

**Total estimado:**
- frase simples e completa: 0,55 + 0,65 + 0,4 + 0,2 ≈ **1,8 s** ✅
- frase que precisa da IA: 0,55 + 0,65 + 1,3 + 0,2 ≈ **2,7 s** (um pouco acima da meta)

## IA: comparação de modelos (mesmas frases, sem gravar nada)

| Modelo | Tempo por frase | Acertos |
|---|---|---|
| openai/gpt-oss-120b (atual) | 0,5–1,2 s | acertou todas as que respondeu |
| openai/gpt-oss-20b | 0,4–0,6 s (uma de 1,8 s) | **errou** "uber 18 no débito" (pôs crédito no Inter) e pôs cartão em "ifood no crédito" |
| llama-3.1-8b-instant | 0,07 s | não respondeu nenhuma (erro da Groq com este pedido) |

**Decisão:** manter o gpt-oss-120b, porque o 20b é mais rápido mas erra mais.
Para ganhar tempo sem errar, criei o **caminho rápido**: frases simples e completas (valor, forma de pagamento e uma categoria certa) são lidas na hora pelas regras, sem IA. Isso economiza ~0,8 s nesses casos. Qualquer dúvida (data, parcelas, entrada, categoria ambígua como iFood → Alimentação ou Mercado) continua indo para a IA.

## Atenção: limite do plano grátis da Groq
Com muitas frases em sequência (o teste mandou 10 em poucos segundos), a Groq respondeu "ocupado" em parte delas. No uso normal (uma frase a cada alguns segundos) não deve acontecer. Quando acontece, o app tenta as regras e, se não entender, avisa e pede para escrever.

## Próximos ganhos possíveis (não feitos)
- Diminuir o silêncio do fim da fala de 0,55 s para 0,45 s (pode cortar quem fala pausado).
- Pedir à IA uma resposta menor (menos texto) para cortar ~0,2 s.

## Rodada 15 (25/11, 12h) — mais rápido
Mudanças:
- **Confirma na hora:** frase simples e completa é entendida no próprio aparelho e o Dimeta já fala "Registrei…" enquanto o servidor salva. Se salvar falhar, ele avisa em seguida.
- **Palavras da pessoa vão junto com o áudio** (carregadas uma vez ao abrir o pop-up): o servidor não consulta mais o banco a cada fala.
- **Servidor acordado ao abrir o pop-up**, para a 1ª fala não pagar o "aquecimento".
- **Fim da fala:** 0,55 s → 0,45 s.

Medido de novo (mesmos áudios):

| Etapa | Antes | Agora |
|---|---|---|
| Transcrever, ida e volta | 0,45–1,3 s | **0,44–0,65 s** |
| Consultar palavras no servidor | 0,07–0,39 s | 0 |
| Entender + salvar antes de falar (frase simples) | ~0,4 s | **~0 s** (salva em paralelo) |

**Total estimado:**
- frase simples: 0,45 + 0,6 + 0,2 (começar a falar) ≈ **1,3 s** (antes 1,8 s)
- frase com IA: 0,45 + 0,6 + 1,2 + 0,2 ≈ **2,4 s** (antes 2,7 s)

Bônus: com as palavras da pessoa, "no pix" passou a sair certo (antes saía "Nupix").

Outros modelos de IA (llama-3.3-70b, llama-4-scout, qwen3-32b) não estão liberados nesta conta da Groq; o gpt-oss-20b erra mais. Fica o gpt-oss-120b.
