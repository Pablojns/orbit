# Relatório da Rodada 12 e relatório final

## Teste final (25/11)
Usei o app como usuário em produção (chaves desligadas), no celular (500px, o menor que o navegador de teste permite) e no computador (1280px):
- salário de R$ 3.000;
- mercado R$ 182,50 no débito;
- tênis R$ 600 em 3x no cartão Inter;
- conta fixa de R$ 120 paga pelo Início;
- trabalho de Estatística pela barra.

Depois passei por Início, Dinheiro (todas as abas), Agenda, Estudos, Hábitos e Perfil. As contas bateram:
- Saldo R$ 2.667,50;
- R$ 242,50 por dia em 11 dias;
- parcela de R$ 200 na fatura de dezembro e R$ 400 nas próximas;
- conta paga sem mudar o Saldo, porque já estava descontada.

## Corrigido no teste
- **Abas do Dinheiro sumiam no computador** quando o extrato era longo. A coluna encolhia a faixa de abas até zero.
- **"Pode gastar … por dia" e "faltam N dias"** quebravam em duas linhas no Início.
- **A próxima prova sem matéria aparecia duas vezes em Estudos** (no destaque e na lista "sem matéria").
- **No celular, o total das contas fixas aparecia duas vezes** (no seletor e no cartão).
- **O horário dos lembretes aparecia duas vezes no Perfil.**

## Não ficou e por quê
- **Teste com login e cobrança ligados num ambiente de teste:** exigiria um segundo projeto no Supabase (serviço novo) e as chaves do Asaas e do Resend, que só você cria. Rodaram os testes automáticos da regra de assinatura, dos e-mails e dos avisos por pessoa. A proteção entre usuários foi testada na Rodada 9.
- **Limpeza dos dados de teste desta rodada:** o banco pediu confirmação e ninguém respondeu. Ficaram 9 itens (lista abaixo), à espera do seu "pode apagar".
- **Voz e nota de desempenho:** precisam do seu celular e do seu navegador (pendência 0).

## Dados de teste que ainda vão sair (esperando sua confirmação)
| Tabela | Itens |
|---|---|
| transactions | 2 (Salário TESTE, Mercado) |
| card_purchases | 1 (Tênis) |
| installments | 3 (parcelas do Tênis) |
| bills | 1 (TESTE internet) |
| bill_payments | 1 (pagamento dela) |
| events | 1 (Trabalho de Estatística, 01/12) |

## Decisões que tomei
- **Os dados de teste são identificados pela hora de criação, não só pelo prefixo "TESTE",** porque a IA da barra às vezes tira essa palavra do título.
- **"Para onde foi o dinheiro" conta a compra parcelada pela parcela do ciclo,** e o "Resumo da semana" pelo valor da compra. Deixei como está: são perguntas diferentes. Fica registrado para revisar se confundir.

## 10 passos para testar o app em 15 minutos
1. Abra https://dimeta.vercel.app no celular. Confira o preço (7 dias grátis, depois R$ 29,90) e toque em "Começar 7 dias grátis".
2. No Início, escreva na barra "mercado 45 pix" e veja o Saldo e o "por dia" caírem.
3. Toque no microfone e fale "uber 18 no débito". O texto deve aparecer enquanto você fala.
4. Toque no Saldo: abre o extrato rápido. Toque em "Pode gastar": abre a conta explicada.
5. Escreva "internet 100 todo dia 30". Em Contas, aparece "A pagar" com o botão Pagar. Pague e confira que o Saldo não muda (ele já estava descontado).
6. Escreva "tênis 300 em 3x no cartão Inter". Em Dinheiro > Cartões, veja a parcela na fatura certa.
7. Escreva "prova de Estatística sexta 19h". Em Estudos, ela aparece dentro da matéria, e a média fica "parcial".
8. Em Estudos, toque em "Abrir plano de estudo" e marque 2 sessões. Elas aparecem no Início, na Agenda.
9. Em Hábitos, toque num dia da semana passada para marcar e desmarcar. A sequência muda na hora.
10. Em Perfil, use "Exportar meus dados (CSV)" e abra no Excel ou no Google Planilhas.

Depois do teste, apague o que lançou pelo Extrato ou me peça para limpar.
