# Voz: o que precisa de microfone real (atualizado na Rodada 14)

O navegador de testes não tem microfone. Testei por partes: áudios gravados mandados pelo mesmo caminho (`/app/voz-teste`), testes automáticos e o pop-up sem microfone.

## Como funciona agora (Rodada 14)
- O **detector de voz** (Silero, roda no aparelho) percebe quando você começa e para de falar. Barulho e tosse não contam como fala.
- O áudio da fala vai para o **Whisper da Groq** (pelo servidor; a chave não sai de lá) e vira texto.
- O texto passa pelas regras (caminho rápido) ou pela IA, registra e o Dimeta confirma falando **uma frase**.
- **Modo conversa:** depois da resposta, continua ouvindo por ~5 s ("e mais 20 de uber"). Ficou em silêncio, fecha.
- Na primeira vez, o aparelho baixa o detector (~17 MB). Depois fica guardado (30 dias).

## O que já foi testado
- Transcrição: "mercado 45 no pix", "uber 18 no débito" e "Dimeta" foram entendidos. Um ruído curto ("tosse") **não** abriu a conversa.
- O detector carrega os arquivos no navegador (o teste parou só por falta de microfone).
- Palmas: 8 casos simulados no teste automático (duas palmas secas abrem; eco, palmas muito longe, voz, tosse longa, som antes, entre ou depois e uma palma só não abrem).
- Sem microfone, o pop-up avisa "Não consegui abrir o microfone. Escreva abaixo." e o campo de texto funciona.

## O que precisa de você (cerca de 10 minutos)
1. **Frase completa:** toque no microfone e diga "mercado 45 no pix". Deve aparecer "Ouvindo…", depois o texto, e o Dimeta fala "Registrei 45 reais em mercado." Veja embaixo o tempo ("Da sua fala até a resposta: …") e me mande.
2. **Modo conversa:** logo depois, sem tocar em nada, diga "e mais 20 de uber". Deve registrar também. Depois fique calado: em ~5 s fecha.
3. **Dado faltando:** diga "gastei 30". Ele pergunta "Pagou como?" e abre o microfone sozinho. Responda "pix".
4. **Silêncio ao abrir:** abra e não fale. Em ~8 s fecha sem registrar.
5. **"Dimeta" no computador:** Perfil > Voz > ligue "Chamar dizendo Dimeta". Tussa, bata na mesa, converse normal: **não** pode abrir. Diga "Dimeta": responde "Oi, Pablo" e ouve o comando.
6. **Palmas no computador:** duas palmas secas, com uma pausa curta entre elas. Abre. Fale, tussa, ponha música: não pode abrir.
7. **"Dimeta" no Poco X5:** com o app aberto e a tela ligada, mesmo teste do item 5. O Android não deve mais fazer bip (não usamos mais o reconhecimento do Chrome).

## Limitações conhecidas
- **Celular:** só ouve com o app aberto e a tela ligada (limite do navegador).
- **Primeiro uso:** a 1ª abertura do microfone demora mais (download do detector). No 4G, ~17 MB uma vez.
- **Groq grátis:** frases muito seguidas podem receber "ocupado". A escuta do "Dimeta" envia no máximo 90 trechos por hora.
- **Fala do Dimeta:** usa a voz do sistema. Em alguns Android, a voz em português precisa estar instalada.
