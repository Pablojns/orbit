# Relatório da Rodada 4

## Pronto
- Janela única para pop-ups (src/components/modal.tsx): um nível só; Esc e o "voltar" do celular fecham; folha que sobe no celular e janela no centro no computador; foco preso dentro e devolvido a quem abriu. FormSheet, Novo lançamento e Tipos da agenda passaram a usar essa janela.
- Novos pop-ups no Início:
  - toque no Saldo abre o extrato rápido, com "Ver extrato completo";
  - toque em "Pode gastar" mostra a conta explicada;
  - "Pagar" pede confirmação;
  - toque numa categoria mostra os lançamentos dela;
  - toque num item da Agenda abre o detalhe.
- Já eram pop-ups: novo lançamento, guardar ou retirar da meta, matéria, plano de estudo, adicionar aula, definir semestre, novo hábito.
- Sem rolagem no computador: no Início, Estudos (2×2) e Hábitos, os blocos longos rolam por dentro. No computador, a área principal passou a ser a região que rola.

## Não ficou e por quê
- Fatura do cartão e itens do dia na Agenda como pop-up: ficam para a Rodada 5, junto com o redesenho de Dinheiro e Agenda.
- Pergunta da IA: continua como botões dentro da barra, porque é rápida e não tira a pessoa da tela.

## Decisões que tomei
- Ao tocar num link dentro de uma janela, a janela fecha e a pessoa vai para a outra tela.

## O que achei ruim no teste e já corrigi
- O total "N marcações" quebrava em duas linhas no computador: diminuí a fonte.
