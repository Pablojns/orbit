# Voz: o que não deu para testar com microfone real (Rodada 13)

O navegador de testes que uso não tem microfone nem alto-falante. Por isso, testei a voz só por partes.

## O que foi testado
- **Textos de exemplo, com teste automático** (`scripts/test-voice.ts`):
  - a palavra "Dimeta" e as variações "di meta" e "dimetá", inclusive com o comando na mesma fala;
  - a resposta curta falada ("Registrei 45 reais em mercado");
  - a resposta "gasto / entrada / compromisso" a uma dúvida;
  - o texto parcial enquanto se fala.
- **No navegador de testes:**
  - o pop-up abre pelo ícone e por Alt+V;
  - o campo de texto do pop-up registra;
  - quando falta um dado, o pop-up pergunta;
  - o pop-up fecha sozinho.

## O que precisa de você (cerca de 10 minutos)
1. **Frase completa:** toque no microfone e diga "45 no mercado no pix". O texto aparece enquanto você fala, o lançamento é feito e o Dimeta fala "Registrei 45 reais em mercado".
2. **Dado faltando:** diga "gastei 30 no almoço". Ele pergunta falando "Pagou como?", abre o microfone sozinho, e você responde "pix".
3. **Silêncio:** abra o microfone e não fale nada. Em uns 8 segundos ele fecha sem registrar.
4. **"Dimeta" no computador:**
   - em Perfil > Voz, ligue "Chamar dizendo Dimeta" e aceite o aviso;
   - diga "Dimeta". Ele responde "Oi, Pablo" e já ouve o comando;
   - diga "mercado 20 no débito".
5. **Palmas no computador:** bata duas palmas. A conversa abre, e o que você falar em seguida precisa ser registrado (esse era o defeito).
6. **"Dimeta" no Poco X5:** com o app aberto e a tela ligada, faça o mesmo teste. No Android, o Chrome pode tocar um bip a cada vez que reinicia a escuta. Se incomodar, me avise.

## Limitações conhecidas
- **No celular, só ouve com o app aberto e a tela ligada:** é limite do navegador. Ouvir em segundo plano fica para o app de loja (APK).
- **Fala do Dimeta:** usa a voz do sistema. Em alguns Android, a voz em português precisa estar instalada (Configurações > Idioma > Saída de texto para voz).
- **Palmas:** podem disparar com barulho alto. Por isso ficam só no computador e são experimentais.
