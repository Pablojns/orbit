# Relatório da Rodada 3

## Pronto
- Visual novo no app inteiro: fundo #070B1F, cartões #0F1634, azul #4361F5, violeta #A78BFA, Manrope, sem verde e sem dourado.
- Navegação: no celular, barra de baixo com 5 itens e Perfil no ícone do topo; no computador, menu lateral com Perfil no rodapé.
- Início: Saldo em destaque, barra de IA logo abaixo, Agenda com borda violeta e próxima prova, Contas (A pagar e Vai entrar), Hábitos de hoje e Para onde foi. Cada número aparece uma vez.
- Estudos: próxima prova com contagem e plano de estudo, "Esta semana", matérias com média parcial, grade de aulas.
- Ligação entre prova e matéria corrigida: a prova se liga pela matéria citada no título; as sessões de estudo herdam a matéria; há o botão "Ligar" para provas sem matéria.
- Hábitos: 14 dias no computador e 7 no celular, marcando dias passados; sequência a partir de ontem se hoje não foi marcado; total de 7 dias.
- Tutorial de primeiro uso: 5 perguntas com "Pular" e o passo dos lembretes; aparece uma vez por conta; o Perfil mostra de novo as abas escondidas.
- Dinheiro: a faixa do topo ficou só com Saldo e Fatura aberta.
- Voz: o texto aparece no campo enquanto a pessoa fala (interimResults), e o envio continua automático.

## Não ficou e por quê
- Não testei a voz com fala real: o navegador de teste não tem microfone. A junção dos trechos parciais tem teste automático (scripts/test-voice.ts).

## Decisões que tomei
- Conta fixa nova começa a contar a partir do dia em que foi cadastrada. Se o vencimento deste ciclo já passou, ele não aparece como vencido nem sai do Saldo.
- A barra de IA continua no topo das outras telas. No Início, ela fica logo abaixo do Saldo.
- Mantive o botão "Novo lançamento" no menu lateral e o "+" flutuante no celular.
- Zerei tutorial_done_at depois do teste, para o Pablo ver o tutorial uma vez.

## Problemas do teste final, já corrigidos
- Uma conta cadastrada no tutorial com vencimento já passado aparecia como "venceu" e saía do Saldo. Corrigido com a decisão acima.

## Dados de teste apagados
- events: 3
- recurring_incomes: 1
- credit_cards: 1
- bills: 2
- profiles: só voltei a preferência do tutorial e das abas; nenhum dado foi apagado.
