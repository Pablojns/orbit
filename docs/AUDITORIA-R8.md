# Auditoria de completude (Rodada 8)

Comparação com apps de finanças pessoais (Mobills, Organizze, Minhas Economias), pelo que costumam oferecer.

| Item | Situação |
|---|---|
| Lançar gasto e entrada, escrevendo ou falando | já existia |
| Cartões com fatura, parcelas e limite | já existia |
| Contas fixas e entradas fixas (recorrentes) | já existia |
| Parcelados editáveis (refaz as parcelas ao editar) | já existia |
| Metas com guardar e retirar | já existia |
| Empréstimos (quem me deve, a quem devo) | já existia |
| Editar e apagar com Desfazer | já existia (lançamentos, contas, cartões, metas, agenda, hábitos, matérias) |
| Categorias gerenciáveis | já existia (Perfil) |
| Exportar CSV | feito na R6 |
| Busca e filtros no Extrato | **feito na R8** |
| Orçamento por categoria com avisos em 75%, 90% e 100% | **feito na R8** |
| Resumo semanal (7 dias contra os 7 anteriores) | **feito na R8** |
| Estados vazios com orientação | revisado: Início, Dinheiro, Estudos, Hábitos, Agenda e Cartões orientam o primeiro passo |
| Várias contas (carteira, bancos) e transferência entre elas | **grande: registrado** |
| Gráficos do mês e comparação com o mês anterior | **médio-grande: registrado** |
| Importar extrato do banco (OFX/CSV) | **grande: registrado** |

## Registrado para depois
1. **Várias contas e transferências.** Precisa de uma tabela de contas, do campo de conta em cada lançamento, de saldo por conta e de transferência que não conte como gasto. Mexe no cálculo do Saldo, que hoje está certo e testado. Fazer com calma, depois do lançamento.
2. **Gráficos.** Gasto por dia no ciclo e comparação com o ciclo anterior. Precisa de uma leitura extra do ciclo anterior, que deixa o Dinheiro mais lento. Fazer junto com a otimização de consultas.
3. **Importar extrato do banco.** O formato muda de banco para banco. Fica para depois do lançamento.
