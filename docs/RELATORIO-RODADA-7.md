# Relatório da Rodada 7

## Pronto
- Botão de falar em todas as telas e atalho Alt+V no computador.
- Respostas faladas: Perfil > Voz > "Responder falando". A resposta é lida em voz alta só depois de um comando de voz.
- Comandos que já funcionavam pela barra continuam valendo por voz: "quanto posso gastar hoje", "qual meu saldo", "guardei 20 na meta X", lançamentos e agenda.
- Chamada por "Dimeta" ou duas palmas (experimental): só no computador, só com a aba aberta, depois de uma tela de consentimento, e dá para desligar no Perfil.
- Testes automáticos (scripts/test-voice.ts):
  - junção do texto parcial;
  - palavra de chamada, incluindo as variações "di meta" e "de meta";
  - duas palmas (intervalo de 120 a 700 ms);
  - transcrições de exemplo com números e nomes.

## Não ficou e por quê
- Não testei com fala real: o navegador de teste não tem microfone. O passo a passo para o Pablo está em PENDENCIAS-DO-PABLO.md.
- Segundo plano (ouvir com a aba fechada) ficou de fora, como o plano pede. Fica para o APK.

## Decisões que tomei
- "Responder falando" e a escuta ficam guardados neste aparelho, não na conta. Voz depende do aparelho e do microfone.
- Atalho Alt+V: não conflita com os atalhos comuns do Chrome no Windows.
- A escuta para enquanto a barra ouve um comando e volta 0,6 s depois. Assim não abrem dois reconhecimentos ao mesmo tempo.
