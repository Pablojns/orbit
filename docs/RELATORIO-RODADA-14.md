# Relatório — Rodada 14 (25/11)

## O que mudou
1. **Extrato – filtros:** ordem busca (com lupa) → período → categorias. "Este ciclo" saiu; o padrão é "Este mês". Busca inteligente com sinônimos (`src/lib/search-synonyms.ts`): "comida" acha iFood, mercado, restaurante; "transporte" acha uber, 99, gasolina. Tudo ao vivo, sem recarregar.
2. **Voz – motor novo:** o reconhecimento do navegador saiu. Agora: detector de voz no aparelho (VAD Silero) + Whisper `whisper-large-v3-turbo` na Groq (`/api/voz`, chave só no servidor, idioma pt, prompt com Dimeta, pix, débito, crédito, iFood, Uber, Inter, Estatística e as categorias, cartões e matérias da pessoa).
   - Sobre o MediaRecorder: não foi usado. O próprio detector já entrega o áudio da fala, cortado no começo e no fim, e evita abrir o microfone duas vezes.
3. **"Dimeta" e palmas:** "Dimeta" só abre se o detector ouvir FALA e o Whisper escrever "dimeta" ("de meta" deixou de valer, porque aparece em frases comuns). Palmas: duas batidas secas, 150–600 ms entre elas, silêncio antes, entre e depois. A escuta solta o microfone antes de abrir a conversa e só volta depois.
4. **Velocidade:** tempos medidos em `docs/VOZ-TEMPOS.md`. Frase simples ≈ 1,8 s; com IA ≈ 2,7 s. Mantive o gpt-oss-120b (o 20b errou mais). Criei o caminho rápido por regras para frases simples e completas (economiza ~0,8 s).
5. **Limpeza:** "A lutar" (R$ 45) apagado. Os lançamentos de teste da medição também foram apagados.
6. **Modo conversa:** depois de responder, ouve mais ~5 s e fecha no silêncio. Respostas faladas com no máximo 1 frase. Ideia do WhatsApp anotada em `docs/IDEIAS-FUTURAS.md`.

## Outros ajustes
- Textos de privacidade (página Privacidade e aviso da escuta no Perfil) atualizados: o áudio vai à Groq para virar texto; o Dimeta não guarda áudio.
- Página escondida `/app/voz-teste` para medir tempos.
- Testes novos: busca, caminho rápido, palmas, limpeza do texto do Whisper.

## Pendente com o Pablo
- Testes com microfone: `docs/VOZ-TESTES.md`.
