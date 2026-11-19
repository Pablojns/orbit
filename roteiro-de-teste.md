# Roteiro de teste do Orbit

App: https://orbit-orcin-beta.vercel.app/app
Dica: coloque "TESTE" no nome do que criar. No fim, apague tudo. O "Desfazer" garante que nada some sem querer.

---

## 1. Lançar escrevendo uma frase
1. No **Início**, ache a caixa com o ícone de brilho ("Ex.: mercado 45 pix…").
2. Escreva `TESTE mercado 45 pix` e toque em **Lançar**.
   - Esperado: aparece "Gasto salvo. (Mercado, Pix)" e o "Livre" cai R$ 45.
3. Teste também:
   - `TESTE uber 18,50 débito`: deve cair em Transporte, no débito.
   - `TESTE freela 300 entrada`: deve virar uma **entrada**, em Extra.
   - `TESTE ifood 40 ontem`: deve ficar com a data de ontem.
   - Se você tiver cartão cadastrado, `TESTE tênis 300 nubank 3x` (troque "nubank" pelo nome do seu cartão): deve virar compra no cartão em 3 parcelas.
   - `mercado pix`, sem valor: deve dar erro pedindo o valor.

## 2. Desfazer
1. Em **Dinheiro > Movimentações**, apague um dos testes pela lixeira.
2. Embaixo aparece "Lançamento apagado. **Desfazer**". Toque em Desfazer.
   - Esperado: o lançamento volta.
3. Apague de novo e espere 6 segundos. O aviso some e o item fica apagado.
4. O Desfazer também aparece ao remover conta fixa, entrada fixa, cartão, meta, hábito, categoria, matéria, nota, prova e tarefa.

## 3. Início como resumo do dia
1. Abra o **Início**. No topo fica o bloco **Seu dia**, com:
   - quantas coisas tem para hoje;
   - provas nos próximos 7 dias;
   - quanto pode gastar hoje;
   - hábitos feitos hoje.
2. Embaixo dele vem a lista do que vence ou acontece hoje e do que ficou atrasado: provas, tarefas, contas e faturas.
3. Na direita, "Próximos 7 dias" mostra o que vem na semana.

## 4. Agenda com repetição
1. **Agenda > Novo**. Tipo: Compromisso. Nome: `TESTE academia`. Data: a próxima segunda.
2. Em **Repete?**, escolha "Toda semana". Em **Até quando**, coloque daqui a 1 mês. Salve.
   - Esperado: "5 datas salvas" (ou o número de segundas no período), e o calendário mostra uma bolinha em toda segunda.
3. Toque no lápis de uma delas. Aparece "Este item se repete". Toque em **Apagar todas as datas**: todas somem de uma vez, com Desfazer.

## 5. Aviso antes (lembrete antecipado)
1. **Novo**. Tipo: Prova. Nome: `TESTE prova`. Data: daqui a 3 dias. Em **Me avisar**, escolha "3 dias antes".
   - Esperado: o card mostra um sininho com "3d".
2. Pelo celular, o aviso só chega com os lembretes ligados (passo 14).

## 6. Plano de estudo automático
1. **Novo**. Tipo: Prova. Nome: `TESTE Cálculo`. Data: daqui a ~10 dias.
2. Em **Sessões de estudo antes da prova**, escolha "3 sessões". Salve.
   - Esperado: "Prova salva com 3 sessões de estudo". Aparecem 3 "Estudar: TESTE Cálculo" espalhados até a véspera, pulando dias que já têm algo.
3. Para limpar: lápis da prova > **Apagar todas as datas**. Apaga a prova e as sessões juntas.

## 7. Passos dentro de prova ou tarefa
1. Numa prova ou tarefa, toque em **Adicionar passos**.
2. Escreva `capítulo 1` e toque no +. Depois adicione `capítulo 2`.
   - Esperado: o botão vira "0/2 passos".
3. Marque um passo: vira "1/2 passos".
4. O X ao lado tira o passo.

## 8. Tarefa sem data
1. **Novo**. Tipo: "Tarefa (pode ficar sem data)". Escreva o nome e deixe a data vazia. Salve.
   - Esperado: aparece em "Tarefas sem data", na lista da esquerda.

## 9. Notas da faculdade
1. **Agenda > Notas da faculdade > Nova matéria**: `TESTE Estatística`, média 6, máxima 10.
2. **Avaliação**: `Prova 1`, peso 1, nota 5.
3. **Avaliação**: `Prova 2`, peso 1, nota vazia.
   - Esperado: "Precisa tirar **7,0** na que falta".
4. Edite a Prova 2 e coloque nota 8.
   - Esperado: "Média final 6,5 · aprovado".
5. Teste pesos: Prova 1 peso 2, nota 8; Prova 2 peso 3, sem nota; média 7.
   - Esperado: precisa de 6,4.
6. Para limpar: **Arquivar** a matéria.

## 10. Conta dividida
1. **Dinheiro > Fixos > Contas fixas > Nova**: `TESTE Luz`, R$ 200, vence dia 25.
2. Em **Divide com alguém?**, escolha "Sim, meio a meio". Salve.
   - Esperado: o card mostra R$ 100,00, "sua parte de R$ 200,00" e a etiqueta "dividida". O total do ciclo sobe só R$ 100.
3. Edite e troque para "Sim, eu pago um valor", com R$ 80.
   - Esperado: o card mostra R$ 80,00.
4. No **Início**, o "Livre" considera só a sua parte.

## 11. Assinaturas
1. **Contas fixas > Nova**: `TESTE Netflix`, R$ 39,90. Marque **É assinatura**.
   - Esperado: aparece separado, embaixo de "Assinaturas · R$ 39,90 por mês", com a etiqueta "assinatura".
2. Com os lembretes ligados, o celular avisa 2 dias antes de cobrar.

## 12. Código do boleto ou Pix
1. Edite uma conta e cole qualquer texto em **Código para pagar**. Salve.
2. No card, aparece o botão **Copiar código**. Toque nele e cole no WhatsApp ou num bloco de notas para conferir.
   - Esperado: o botão mostra "Copiado".

## 13. Meta que diz quanto guardar
1. **Dinheiro > Metas > Nova meta**: `TESTE Viagem`, R$ 2.000, até daqui a 4 meses.
   - Esperado: "Guarde R$ 500 por mês ou R$ ~118 por semana".
2. Toque em **Guardar** e coloque R$ 400.
   - Esperado: o valor por mês cai, recalculado.
3. Se pedir mais do que você tem livre no ciclo, aparece em vermelho a sugestão de esticar o prazo.
4. Meta sem data: aparece um aviso pedindo uma data para calcular.

## 14. Quem me deve / quem eu devo
1. **Dinheiro > Pessoas > Anotar quem deve**: `TESTE João`, "Me deve", R$ 50, "pizza".
2. Anote também: `TESTE João`, "Eu devo", R$ 20.
   - Esperado: "Te devem R$ 50", "Você deve R$ 20". Com 2 ou mais pessoas, aparece o "Saldo por pessoa".
3. Toque no círculo (✓) do de R$ 50: ele vai para "Já acertados".

## 15. Lembretes no celular
1. No **Poco X5**, abra o Orbit **pelo ícone da tela inicial** (instale pelo Chrome: menu > "Adicionar à tela inicial").
2. **Perfil > Ativar lembretes** e aceite a notificação.
   - Esperado: o botão vira "Desativar lembretes neste aparelho".
3. O resumo chega todo dia às 8h (horário de Brasília), mas só se tiver algo hoje ou amanhã, um aviso antecipado ou uma assinatura para cobrar.

## 16. Atalhos no ícone
1. Na tela inicial do celular, **segure o ícone do Orbit**.
2. Aparecem 3 atalhos:
   - **Gasto**: abre direto o formulário de gasto.
   - **Escrever**: abre o Dinheiro com a caixa de frase já focada.
   - **Agenda**: abre direto o "Novo na agenda".
3. Se não aparecer, desinstale e instale o app de novo na tela inicial. O Android só lê os atalhos na instalação.

---

## O que anotar enquanto testa
- O que você esperava que acontecesse e não aconteceu.
- O que ficou confuso de entender sem eu explicar.
- O que você usaria todo dia e o que nunca usaria.
