PLANO DE RODADAS DO DIMETA (R3 a R12), MODO AUTÔNOMO. Leia tudo agora.

OBJETIVO: deixar o app ESTRUTURADO e pré-pronto. Eu sou o dono, trabalho o dia todo e quero entrar o mínimo possível. O que depende de dados e contas minhas (domínio, CNPJ, conta de pagamento, ligar o login) eu faço depois, ligando o que você deixar pronto. Meta: 95% feito sem precisar de mim. Se algo ficar ruim, eu corrijo depois.

MODO DE TRABALHO
1. Não pare entre rodadas. Ao fim de cada uma, grave docs/RELATORIO-RODADA-N.md e siga para a próxima. Mantenha docs/PROGRESSO.md atualizado a cada commit (o que está feito, o que falta, onde parou). Se a sessão cair, quem retomar lê este plano e o PROGRESSO.md e continua do ponto exato. Salve este plano em docs/PLANO-RODADAS.md.
2. Cada item: um commit, testes antes do commit, deploy em produção. Fim de cada rodada: teste como usuário no celular (390px) e no computador (1280px), passando por todas as telas, e corrija o que encontrar.
3. Decisão de produto que faltar: escolha a opção mais simples e segura e registre em "Decisões que tomei". Não pergunte.
4. Só pare e espere por mim em: (a) cobrar ou gastar dinheiro de verdade, ou criar serviço pago; (b) apagar dados reais meus; (c) algo que exija senha, chave ou conta que só eu posso criar. Nos casos (a) e (c), NÃO pare: deixe tudo pronto com valores de teste ou marcadores e registre o passo em docs/PENDENCIAS-DO-PABLO.md, com o passo a passo exato e o NOME das variáveis de ambiente (nunca o valor). Siga para o próximo item.
5. Dados de teste com prefixo "TESTE"; apague no fim de cada rodada e diga quantos itens saíram por tabela. Nunca apague os meus dados: iFood R$ 30, a "prova" de 27/11, a matéria Estatística com a nota do Mapa, o hábito "estudar", o cartão Inter, as categorias e o perfil.
6. Regras fixas: o guia (seções 1 a 13) vale; cada informação aparece uma vez só na tela; dinheiro em centavos; sem verde nem dourado no app; sem marcas ou personagens de terceiros; nunca imprimir senhas ou chaves.
7. Relatório de cada rodada (curto): o que ficou pronto; o que não ficou e por quê; decisões que tomei; o que achou ruim no teste final e já corrigiu.

RODADA 3 (já em andamento): a mensagem "Rodada 3" que já te passei: visual novo, navegação, Início, Estudos, Hábitos, tutorial de 5 perguntas, voz com texto ao vivo, fim das repetições em Dinheiro. Desenho: https://claude.ai/artifact/TYgYrFQ4BLsTVHbuJj55B3
Pronto quando: cada número do Início aparece uma vez; o tutorial leva uma conta nova ao Saldo certo em menos de 2 minutos; dá para marcar dias passados nos Hábitos; o texto da voz aparece enquanto se fala.

RODADA 4: sem rolagem e pop-ups
- No computador (1280px ou mais), Início, Estudos e Hábitos não rolam a página. Blocos em grade (Estudos: 2×2 com Próxima prova, Esta semana, Matérias e Horário). Bloco com muitos itens rola por dentro, com 4 ou 5 visíveis e "Ver todas".
- Pop-ups: um nível só; "voltar" do celular e Esc fecham; folha deslizante no celular, janela centralizada no computador; ao salvar, a tela de trás atualiza sozinha; foco preso e devolvido.
- Lista: extrato rápido (toque no Saldo, com "Ver extrato completo"); conta explicada ("Pode gastar por dia"); detalhe de item da Agenda; confirmar pagamento; lançamentos por categoria; pergunta da IA; Novo lançamento; fatura do cartão; guardar ou retirar da meta; matéria; plano de estudo, adicionar aula e definir semestre; novo hábito; itens do dia na Agenda.
- Continuam páginas: extrato completo com filtros, agenda em calendário, relatórios, Perfil.
Pronto quando: ver extrato, pagar conta e lançar gasto sem trocar de aba; zero rolagem de página no Estudos no computador.

RODADA 5: Dinheiro, Agenda e Perfil no mesmo visual
Sem esperar desenho. Use o sistema visual da Rodada 3 (cores, Manrope, cartões, brilho leve só nos cartões grandes, navegação) e as regras da Rodada 4. Dinheiro: Extrato, Cartões, Contas fixas, Metas, Empréstimos. Agenda e Perfil também.
Pronto quando: as 6 áreas têm a mesma cara e as mesmas regras.

RODADA 6: Hábitos e Perfil completos (decisões já tomadas)
- Hábito diário: sequência em dias seguidos. Hábito com meta semanal: sequência em semanas seguidas em que a meta foi batida.
- Marcar e desmarcar qualquer dia passado. Histórico mensal em grade de dias.
- Perfil: nome, dia do salário, lembretes (horários e liga/desliga), religar abas escondidas, exportar meus dados em CSV, sair, excluir conta e dados (com confirmação).

RODADA 7: voz completa
Botão e atalho de teclado para falar; respostas faladas (liga/desliga no Perfil); comandos ("quanto posso gastar hoje", "guardei 20 na meta"); palavra "Dimeta" e palmas no computador, só com a aba aberta, com tela de consentimento, desligável e marcada como experimental. Teste por voz quando possível; se não der, teste com transcrições de exemplo (números e nomes) e registre a limitação. Fora: segundo plano (fica para o APK).

RODADA 8: completude
Faça uma auditoria do que falta para o app parecer completo, comparando com apps de finanças pessoais. Implemente o que for pequeno ou médio; registre o que for grande. Candidatos: várias contas (carteira, bancos) e transferência entre elas; orçamento por categoria com alertas em 75%, 90% e 100%; busca e filtros no Extrato; lançamentos recorrentes e parcelados editáveis; gráficos do mês e comparação com o mês anterior; exportar CSV; editar e apagar em tudo com Desfazer; categorias gerenciáveis; resumo semanal; estados vazios com orientação em todas as telas.

RODADA 9: contas de usuário, teste grátis e cobrança, PRÉ-PRONTAS E DESLIGADAS
Deixe tudo construído e testado, mas desligado, para eu só ligar depois. O app continua como hoje (modo teste, dono único) até eu ligar.
- Duas chaves de configuração, desligadas por padrão: AUTH_ENABLED e BILLING_ENABLED. Com as duas desligadas, nada muda para mim.
- Login por e-mail e senha (Supabase Auth): entrar, criar conta, sair; proteção de linhas por usuário em todas as tabelas, com migrações escritas e testadas com dois usuários (um não vê nada do outro). Teste em ambiente separado e sem custo (schema temporário ou Supabase local). NÃO aplique no banco de produção.
- Script de migração dos meus dados para a minha conta, testado em cópia. A execução real fica em PENDENCIAS-DO-PABLO.md.
- 7 dias grátis; depois R$ 29,90 por mês; sem plano grátis. Lógica, tela de assinatura, bloqueio e volta ao pagar, cancelar, recibo, o que acontece com os dados ao cancelar. Tudo em modo de teste.
- Meio de pagamento: escolha o brasileiro com Pix e cartão, assinatura recorrente, menor taxa e modo de teste gratuito. Registre a escolha e o motivo, e deixe a integração pronta atrás de BILLING_ENABLED. Criar a conta e ativar em produção é pendência minha.
- Termos de uso e política de privacidade (LGPD), curtos e claros.

RODADA 10: qualidade, segurança e desempenho
Testes automáticos (conta de dinheiro, ciclo, parcelas, leitura de frases); alertas do Supabase zerados; limite de uso na IA (plano grátis do Groq) com mensagem clara; erros e telas vazias com orientação; acessibilidade básica; desempenho (nota 90 ou mais no Início, no celular); backup; registros de erro. Mover o banco para São Paulo: NÃO faça; deixe o passo a passo em PENDENCIAS-DO-PABLO.md.

RODADA 11: pronto para lançar
Trocar a página pública (/) pela versão final de vendas, com os planos corretos (hoje mostra Gratuito e R$ 19,90, que está errado); e-mails de sistema (boas-vindas, cobrança, lembrete); domínio dimeta.com.br preparado na Vercel; e-mail e CNPJ em src/lib/site.ts com marcadores até eu dar os valores; lista de verificação de deploy; docs/PENDENCIAS-DO-PABLO.md completo e em ordem: domínio, CNPJ, conta de pagamento, chaves, ligar AUTH_ENABLED e BILLING_ENABLED, migrar meus dados, mover o banco para São Paulo, com tempo estimado de cada passo.
Fora: APK e Play Store; divulgação (só quando eu disser "tá pronto, agora vamos divulgar").

RODADA 12: caça-bugs final
Teste de 30 dias como usuário, no celular e no computador, em duas versões: com as chaves desligadas (produção) e ligadas em ambiente de teste. Corrija tudo o que encontrar. Relatório final: o que está pronto; o que não ficou e por quê; decisões que tomou; PENDENCIAS-DO-PABLO.md; e 10 passos para eu testar o app em 15 minutos.

Agora: termine a Rodada 3 e siga direto pelas rodadas, sem esperar por mim.