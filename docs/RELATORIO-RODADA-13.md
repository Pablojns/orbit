# Relatório — Rodada 13 "Simplificar" (24/11)

## O que mudou
1. **Página `/`**: só logo, "Entrar" e "Começar 7 dias grátis". Texto antigo salvo em `docs/PAGINA-VENDAS-ANTIGA.md`.
2. **Voz**: a barra de texto saiu. Agora há um microfone discreto (canto superior direito no PC; botão pequeno no celular). O microfone ou Alt+V abrem uma conversa: texto ao vivo, registra direto, confirma falando, pergunta o que falta (valor, pagamento, categoria, dia) um item por vez, fecha após ~8 s de silêncio e tem um campo para digitar. Palavra "Dimeta" (dimeta / di meta / dimetá) no PC e no celular; palmas só no PC. Correção do bug: a escuta libera o microfone antes de abrir a conversa e só volta quando a conversa fecha.
3. **Início**: "A pagar" (nome, data, valor; some quando paga), "Gastos por categoria" em colunas de 4, Agenda maior.
4. **Dinheiro**: seletor de período (Este ciclo, Este mês, Mês passado, Este ano, Personalizado); 3 blocos no topo (Saídas, Entradas, Resumo); botões Gasto/Entrada menores e iguais; "Limites por categoria" foi para Metas; contas parceladas ("crediário 150 em 10x todo dia 5" → "Parcela 1 de 10", some depois da última).
5. **Agenda**: calendário grande com os itens dentro de cada dia (cor por tipo); lista menor ao lado; itens compactos (bolinha de cor, ícones pequenos).
6. **Nomes**: lista completa em `docs/NOMES-ANTES-DEPOIS.md`.

## O que saiu
- Aba **Empréstimos** (tela, código, frases "emprestei/devo", tabela `debts` e os dados dela).
- "Resumo da semana", setas de ciclo, card do ciclo no fim do Extrato.
- Barra de texto com microfone grande; opção "Responder falando".
- Seção "Como a sequência conta" (Hábitos).
- Código sem uso: class-mini, cycle-ring, first-salary, habit-card, money-strip, orbit-ring, página antiga /agenda/notas, phone-preview.
- Subtítulos explicativos de Dinheiro, Perfil, Agenda, Hábitos, Metas, Limites, Cartões.
- Dados: os 9 itens de teste da Rodada 12 e a conta "TESTE crediário" usada no teste desta rodada.

## Mantido de propósito
- "Menu" no Perfil (esconder Estudos/Hábitos): o tutorial usa essa escolha; tirar quebraria o primeiro uso.
- Exportar CSV (direito do usuário aos dados), Assinatura, Excluir conta.

## Testado
- tsc, lint e todos os testes (inclui parcelas e período).
- Telas em 1280px e 500px: Início, Extrato (troca de período), Contas fixas, Agenda.
- Conta parcelada pelo campo de texto da conversa: salvou com fim em 05/09/2027 (10 parcelas).

## Precisa de microfone real (Pablo)
Ver `docs/VOZ-TESTES.md`. Resumo: falar uma frase completa; uma frase sem categoria/pagamento (deve perguntar por voz e reabrir o microfone); ficar 8 s calado (fecha sem registrar); "Dimeta" com a tela ligada no PC e no celular (responde "Oi, Pablo"); palmas no PC.
