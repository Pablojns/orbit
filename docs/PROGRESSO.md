# Progresso das rodadas (R3 a R12)

Leia docs/PLANO-RODADAS.md primeiro. Este arquivo diz onde a sessão parou. Ele é atualizado a cada commit.

## Estado atual
- Rodada atual: **todas feitas (R3 a R12)**
- Último item concluído: R12, teste final e correções (bfa2080, d9ff5b5)
- Pendente: apagar 9 itens de teste da R12 (lista em RELATORIO-RODADA-12.md), assim que o Pablo confirmar no banco. Depois disso, só as pendências do Pablo.

## Rodadas
| Rodada | Situação |
|---|---|
| R3 visual, Início, Estudos, Hábitos, tutorial, voz | feita |
| R4 sem rolagem e pop-ups | feita |
| R5 Dinheiro, Agenda e Perfil no visual | feita |
| R6 Hábitos e Perfil completos | feita |
| R7 voz completa | feita |
| R8 completude | feita |
| R9 contas, teste grátis, cobrança (desligados) | feita |
| R10 qualidade, segurança, desempenho | feita (nota de desempenho medida pelo Pablo) |
| R11 pronto para lançar | feita |
| R12 caça-bugs final | feita (falta apagar os dados de teste) |

## Como testar e publicar
- Checagem local: `npx tsc --noEmit && npx eslint src --quiet`, depois cada `scripts/test-*.ts` com `npx tsx`
- Publicação: `git push origin main` (a Vercel publica em cerca de 2 minutos em https://dimeta.vercel.app)
- Banco: Supabase, projeto `pbdgaiwoflrgdqbtpnif`. Migrações em `supabase/migrations`.
- Dados do Pablo que nunca se apagam: iFood R$ 30; a "prova" de 27/11; a matéria Estatística com a nota do Mapa; o hábito "estudar"; o cartão Inter; as categorias; o perfil; os itens arquivados "salario" e "aluguel".

## Registro por commit
- R3: 05bc17a visual · 48536e1 Início · 9d97565 Estudos · a86a5db Hábitos · bbc9bda tutorial · 136e35e Dinheiro · f3d7c38 voz · (fechamento) conta nova a partir de hoje + docs
- R4: janela única (Modal: Esc, voltar, foco preso)
- R4: 1543330 janela única · a67c914 pop-ups e sem rolagem · fechamento
- R5: cabeçalho, abas, Saldo em destaque no Dinheiro, fatura em pop-up, Agenda leva aos itens do dia
- R6: 0014 aplicada (preferências de aviso); resumo do dia na hora escolhida; exportar CSV; Conta atrás de AUTH_ENABLED
- R10: de65e91 · ab74aa1 · fechamento (desempenho vira teste do Pablo; ver relatório)
- R11: 366c58f página de vendas · 35aa77a e-mails · 411139b domínio e site.ts · adde9da avisos multiusuário · docs
- R12: bfa2080 abas e quebra de linha · d9ff5b5 repetições · relatório final


## Rodada 13 — Simplificar (24/11)
Feita. Ver `docs/RELATORIO-RODADA-13.md` e `docs/NOMES-ANTES-DEPOIS.md`. Falta: testes de voz com microfone real (`docs/VOZ-TESTES.md`).
