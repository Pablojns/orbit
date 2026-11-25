# Ideias futuras (não fazer agora)

## Lançar por áudio no WhatsApp (anotado na Rodada 14)
- A pessoa manda um áudio para o número do Dimeta ("mercado 45 no pix") e recebe a confirmação em texto.
- Caminho: WhatsApp Business Platform (API oficial da Meta) → webhook no app → Whisper (já usamos) → mesmo leitor de frases → resposta.
- Custo: a API cobra por conversa e precisa de um número verificado. **Nada foi contratado.** Só vale testar depois que a voz no app estiver aprovada.
- Cuidados: ligar o número do WhatsApp à conta certa (código de verificação) e deixar claro na Privacidade que o áudio passa pela Meta e pela Groq.
