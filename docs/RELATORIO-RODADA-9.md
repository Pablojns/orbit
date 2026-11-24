# Relatório da Rodada 9

## Pronto (tudo desligado por padrão)
- **Duas chaves de configuração**, AUTH_ENABLED e BILLING_ENABLED (src/lib/flags.ts). Com as duas desligadas, nada muda: confirmei que o app em produção continua igual.
- **Usuário da requisição:** `uid()` em src/lib/user.ts substituiu o dono fixo em todas as consultas. Com o login ligado, cada pessoa vê só o que é seu. Sem sessão, vai para /login.
- **Login por e-mail e senha:** entrar, criar conta (senha de pelo menos 8 caracteres) e sair (/auth/sair). O proxy só exige login com AUTH_ENABLED.
- **Proteção por usuário:** as regras "dono" já existiam em todas as tabelas. Testei com dois usuários dentro de uma transação desfeita no fim, sem mexer nos dados:
  - o dono vê os próprios dados (1 lançamento, 1 matéria, 1 hábito, 1 cartão, 1 perfil);
  - outro usuário vê zero;
  - outro usuário tenta alterar todos os lançamentos e altera zero.
- **SQL para ligar o login e migrar os seus dados**, em supabase/pendentes:
  - 0100 tira o modo teste;
  - 0101 leva os seus dados para a sua conta.
  - O 0101 foi testado em cópia (tabelas temporárias): todas as linhas mudaram de dono.
  - Nenhum dos dois foi aplicado na produção.
- **Assinatura**, regra em src/lib/billing.ts com testes:
  - 7 dias grátis, depois R$ 29,90 por mês, sem plano grátis;
  - tela /app/assinatura com assinar, cancelar e recibos;
  - bloqueio com tolerância de 3 dias, que volta ao pagar;
  - ao cancelar, o acesso vale até o fim do mês pago e os dados ficam guardados.
- **Meio de pagamento: Asaas** (src/lib/asaas.ts), com webhook /api/asaas/webhook protegido por token.
- **Excluir conta e dados**, com confirmação "EXCLUIR". Só existe com login ligado.
- **Termos e Privacidade** atualizados: preço, teste grátis, cancelamento, Asaas, voz e direitos da LGPD.
- **Migração 0016** (tabela de assinaturas, vazia) aplicada.

## Não ficou e por quê
- **Teste de ponta a ponta do pagamento:** precisa da conta de testes do Asaas, que só você pode criar. A regra de acesso e a leitura dos eventos têm teste automático.
- **Teste do login completo num banco separado:** um segundo projeto no Supabase seria um serviço novo, e preferi não criar. A proteção por usuário foi testada no banco atual, sem alterar dados.
- **Lembretes com várias pessoas:** fica como pendência (item E em PENDENCIAS-DO-PABLO.md).

## Decisões que tomei
- **Asaas como meio de pagamento**, porque é brasileiro e reúne num só lugar:
  - assinatura recorrente nativa;
  - Pix, cartão e boleto na mesma fatura (a pessoa escolhe);
  - sandbox gratuito;
  - não exige site com checkout próprio.
  - Confira as taxas atuais no site antes de criar a conta.
- **CPF vai só para o Asaas**, nunca para o nosso banco.
- **Tolerância de 3 dias** para pagamento atrasado antes de bloquear.
- **Com acesso bloqueado**, Perfil (para exportar) e Assinatura (para pagar) continuam abertos.
