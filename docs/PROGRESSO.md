# Progresso das rodadas (R3 a R12)

Leia docs/PLANO-RODADAS.md primeiro. Este arquivo diz onde a sessão parou. Ele é atualizado a cada commit.

## Estado atual
- Rodada atual: **4**
- Último item concluído: R3 fechada (relatório em docs/RELATORIO-RODADA-3.md)
- Próximo passo: R4 item 1, a regra "sem rolagem no computador" em Início, Estudos e Hábitos

## Rodadas
| Rodada | Situação |
|---|---|
| R3 visual, Início, Estudos, Hábitos, tutorial, voz | feita |
| R4 sem rolagem e pop-ups | em andamento |
| R5 Dinheiro, Agenda e Perfil no visual | a fazer |
| R6 Hábitos e Perfil completos | a fazer |
| R7 voz completa | a fazer |
| R8 completude | a fazer |
| R9 contas, teste grátis, cobrança (desligados) | a fazer |
| R10 qualidade, segurança, desempenho | a fazer |
| R11 pronto para lançar | a fazer |
| R12 caça-bugs final | a fazer |

## Como testar e publicar
- Checagem local: `npx tsc --noEmit && npx eslint src --quiet`, depois cada `scripts/test-*.ts` com `npx tsx`
- Publicação: `git push origin main` (a Vercel publica em cerca de 2 minutos em https://dimeta.vercel.app)
- Banco: Supabase, projeto `pbdgaiwoflrgdqbtpnif`. Migrações em `supabase/migrations`.
- Dados do Pablo que nunca se apagam: iFood R$ 30; a "prova" de 27/11; a matéria Estatística com a nota do Mapa; o hábito "estudar"; o cartão Inter; as categorias; o perfil; os itens arquivados "salario" e "aluguel".

## Registro por commit
- R3: 05bc17a visual · 48536e1 Início · 9d97565 Estudos · a86a5db Hábitos · bbc9bda tutorial · 136e35e Dinheiro · f3d7c38 voz · (fechamento) conta nova a partir de hoje + docs
