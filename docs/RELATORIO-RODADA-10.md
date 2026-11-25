# Relatório da Rodada 10

## Pronto
- **Testes automáticos** (scripts/test-*.ts): conta de dinheiro, ciclo, parcelas, leitura de frases, voz, hábitos (dias e semanas), orçamento, CSV e assinatura. Rodam antes de cada commit.
- **Alertas do Supabase**:
  - função interna fechada para a API;
  - 11 regras de acesso otimizadas;
  - 21 índices de chave estrangeira criados (migração 0017).
  - Ficaram 2 alertas que dependem do painel: "pg_net no schema public" e "proteção contra senha vazada". O passo a passo está em PENDENCIAS-DO-PABLO.md.
  - Os alertas de "índice não usado" são normais com poucos dados.
- **Limite da IA:** 150 leituras por pessoa por dia (migração 0018). Se o Groq estiver ocupado, o app segue pelas regras fixas e, se não entender, avisa com clareza.
- **Erros:** tela de erro com "Tentar de novo" e código do erro, registrado nos Runtime Logs da Vercel. Também há página 404.
- **Acessibilidade:** link "Pular para o conteúdo", alvos de 44px, rótulos nos botões de ícone, foco preso nas janelas.
- **Backup:** fluxo semanal no GitHub (.github/workflows/backup.yml), parado até existir o segredo SUPABASE_DB_URL.

## Não ficou e por quê
- **Nota de desempenho:** não consegui medir. O ambiente de trabalho não acessa o site pela linha de comando, e o pedido ao PageSpeed precisava de uma aprovação que não veio. Ficou como teste rápido seu (item 0.3 das pendências, 2 minutos).
  - O que conferi no código:
    - só 6 bibliotecas no app, nenhuma pesada (sem gráficos ou animação prontos);
    - fontes carregam só o alfabeto latino;
    - o servidor do app (Oregon) fica na mesma região do banco.
  - O maior ganho virá de mover os dois para São Paulo (pendência 3).
- **Mover o banco para São Paulo:** não foi feito, como o plano pede. Passo a passo em PENDENCIAS.

## Decisões que tomei
- O limite de 150 leituras por dia cabe com folga no plano grátis do Groq e evita que uma pessoa sozinha esgote a cota de todos.
