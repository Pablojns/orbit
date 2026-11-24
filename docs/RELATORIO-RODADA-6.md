# Relatório da Rodada 6

## Pronto
- **Hábitos.** O hábito diário conta dias seguidos. O hábito com meta semanal conta semanas seguidas em que a meta foi batida. Há teste automático para as duas contas. Dá para marcar e desmarcar qualquer dia passado, e "Ver histórico do mês" abre uma grade de 35 dias que também se toca.
- **Perfil.**
  - Nome e dia do salário (já existiam).
  - Lembretes: resumo do dia liga e desliga, com hora escolhida entre 5h e 22h; aviso de 3 horas liga e desliga.
  - Abas escondidas voltam pelo Perfil.
  - Exportar meus dados em CSV (/api/exportar). Testei o download em produção.
  - A seção Conta mostra "Sair" e "Excluir conta" só com AUTH_ENABLED ligado.
- **Migração 0014 aplicada:** preferências de aviso.

## Não ficou e por quê
- Sair e excluir conta só funcionam com login. As telas entram na Rodada 9 e ficam desligadas até o login ser ligado.

## Decisões que tomei
- O resumo do dia passa também pelo agendamento de 15 minutos que já existe no banco, para poder sair na hora escolhida. O cron da Vercel no plano grátis só roda uma vez por dia. Não precisei criar chave nova.
- Na primeira execução depois desta mudança, o resumo só marca o dia. Assim não repete o resumo que já tinha saído às 8h.
- O CSV usa ponto e vírgula, para abrir direto no Excel em português.
