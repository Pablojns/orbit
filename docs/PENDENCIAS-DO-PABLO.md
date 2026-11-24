# Pendências do Pablo

Passos que dependem de você (conta, chave ou dinheiro). Cada um traz o passo a passo e o NOME das variáveis de ambiente, nunca o valor.

## Testes rápidos que só você consegue fazer
1. **Voz com texto ao vivo** (Rodada 3). Teste no Chrome do Poco X5 e no Chrome do computador: toque no microfone e fale "mercado 45 pix". O texto deve aparecer enquanto você fala e ser enviado quando você parar. Tempo: 2 minutos.

2. **Voz completa** (Rodada 7), no computador com Chrome:
   - Alt+V abre o microfone.
   - Em Perfil > Voz, ligue "Responder falando" e diga "quanto posso gastar hoje": a resposta deve ser falada.
   - Ligue "Chamar dizendo Dimeta" (experimental), aceite o aviso, diga "Dimeta" ou bata duas palmas: o microfone da barra deve abrir.
   Tempo: 5 minutos.

## Ligar login e cobrança (Rodada 9), nesta ordem

### A. Conta no Asaas, o meio de pagamento (cerca de 30 minutos, mais a aprovação do Asaas)
1. Crie a conta em asaas.com com o CNPJ (ou CPF, no começo) e conclua a verificação.
2. Antes, confira as taxas atuais de Pix, cartão e boleto no site deles.
3. Crie uma conta de testes em sandbox.asaas.com e gere a chave de API em Integrações.
4. Na Vercel (Settings > Environment Variables), crie:
   - `ASAAS_API_KEY`: a chave do sandbox, para testar;
   - `ASAAS_ENV`: `sandbox`;
   - `ASAAS_WEBHOOK_TOKEN`: uma senha longa que você inventar.
5. No Asaas, em Integrações > Webhooks, cadastre a URL `https://SEU-DOMINIO/api/asaas/webhook`, o mesmo token do passo anterior e os eventos de Cobrança e de Assinatura.
6. Na hora de cobrar de verdade, troque para a chave de produção e `ASAAS_ENV=production`.

### B. Chave de serviço do Supabase (5 minutos)
1. No Supabase, abra Project Settings > API Keys e copie a chave de serviço (service_role ou secret).
2. Na Vercel, crie `SUPABASE_SERVICE_ROLE_KEY` com esse valor. O webhook de cobrança e a exclusão de conta usam essa chave.

### C. Ligar o login (cerca de 20 minutos)
1. No Supabase, em Authentication > Providers, deixe "Email" ligado. Em Authentication > URL Configuration, coloque o domínio do app.
2. Na Vercel, crie `AUTH_ENABLED=true` e publique de novo.
3. Abra /login > "Criar conta" com o seu e-mail e confirme pelo link.
4. No SQL Editor do Supabase:
   - rode `supabase/pendentes/0101_migrar_dados_do_dono.sql`, trocando o e-mail na linha marcada. Isso leva todos os seus dados para a sua conta;
   - depois rode `supabase/pendentes/0100_ligar_login.sql`, que tira o acesso anônimo do modo teste. A última consulta precisa voltar vazia.
5. Entre no app e confira se os seus dados estão lá.

### D. Ligar a cobrança (5 minutos)
1. Na Vercel, crie `BILLING_ENABLED=true` e publique de novo.
2. Contas novas ganham 7 dias grátis. A sua conta também entra no teste. Se quiser ficar isento, me peça e eu marco a sua assinatura como ativa.

### E. Lembretes com várias pessoas (fazer junto com o login)
Os avisos automáticos (resumo do dia e aviso de 3 horas) hoje só atendem o dono do modo teste. Com o login ligado, precisam percorrer todos os usuários com a chave de serviço. O código está preparado (lib/user, admin.ts), mas esse ajuste não foi feito. Peça "lembretes multiusuário" que eu faço.

## Próximas rodadas
Os itens abaixo vão sendo acrescentados ao longo das rodadas 10 a 12.
