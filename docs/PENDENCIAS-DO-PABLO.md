# Pendências do Pablo

Só o que depende de você: conta, chave, dinheiro ou dado pessoal. Está em ordem. Cada passo diz o tempo estimado e o NOME das variáveis de ambiente, nunca o valor.

Onde criar variáveis: Vercel > projeto dimeta > Settings > Environment Variables (ambiente Production). Depois de criar ou mudar uma variável, publique de novo (Deployments > ⋯ > Redeploy).

Tempo total estimado: cerca de 4 horas, espalhadas em alguns dias (a aprovação do Asaas e a propagação do domínio levam um tempo que não depende de você).

---

## 0. Testes rápidos que só você consegue fazer (10 minutos)
1. **Voz com texto ao vivo:** no Chrome do Poco X5 e no Chrome do computador, toque no microfone e fale "mercado 45 pix". O texto deve aparecer enquanto você fala e ser enviado quando você parar.
2. **Voz completa (Chrome no computador):**
   - Alt+V abre o microfone.
   - Em Perfil > Voz, ligue "Responder falando" e diga "quanto posso gastar hoje": a resposta deve ser falada.
   - Ligue "Chamar dizendo Dimeta" (experimental), aceite o aviso e diga "Dimeta" ou bata duas palmas: o microfone deve abrir.
3. **Nota de desempenho:**
   - Abra pagespeed.web.dev, cole https://dimeta.vercel.app/app e veja a nota "Celular".
   - A meta é 90 ou mais. Se der menos, me mande o print.
   - Eu não consegui medir daqui: o ambiente de trabalho não acessa o site pela linha de comando.
4. **Apagar os dados de teste da Rodada 12:** responda "pode apagar" na conversa (9 itens, lista em RELATORIO-RODADA-12.md).

## 1. Dados do site: e-mail e CNPJ (10 minutos)
1. Abra `src/lib/site.ts` e troque os dois marcadores entre colchetes:
   - `legalName`: razão social e CNPJ (ou seu nome e CPF, se ainda não tiver CNPJ);
   - `contactEmail`: um e-mail que você lê de verdade.
2. Eles aparecem no rodapé, nos Termos e na Privacidade.
3. Se preferir, me mande os valores que eu troco.

## 2. Domínio dimeta.com.br (20 minutos de trabalho, mais até 24 horas de propagação)
1. Compre o domínio no registro.br (cerca de R$ 40 por ano). Para .com.br é preciso CPF ou CNPJ.
2. Na Vercel, abra Settings > Domains > Add e digite `dimeta.com.br`. Repita para `www.dimeta.com.br`, marcando para redirecionar ao principal.
3. A Vercel mostra os registros DNS. No registro.br, em DNS > Editar zona, crie os registros mostrados (normalmente um A e um CNAME).
4. Quando a Vercel mostrar "Valid Configuration", crie a variável `NEXT_PUBLIC_SITE_URL` = `https://dimeta.com.br` e publique de novo.
   - Com isso, dimeta.vercel.app passa a redirecionar para o domínio novo.
   - E-mails e avisos também passam a usar o domínio novo.
5. No Supabase, em Authentication > URL Configuration, troque o Site URL para o domínio novo.

## 3. Mover o banco para São Paulo (cerca de 1 hora, com o app parado uns minutos)
Faça antes de ligar o login: com poucos dados, é mais rápido. Hoje o banco e o servidor do app estão nos EUA (Oregon), juntos. Os dois precisam mudar ao mesmo tempo.
1. Crie um projeto novo no Supabase na região South America (São Paulo).
2. Rode as migrações de `supabase/migrations` em ordem, no SQL Editor.
3. Copie os dados com pg_dump e pg_restore, usando as URLs de conexão dos dois projetos (Project Settings > Database).
4. Na Vercel, troque `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (e `SUPABASE_SERVICE_ROLE_KEY`, se já existir).
5. No arquivo `vercel.json`, troque `"regions": ["pdx1"]` por `"regions": ["gru1"]`. Ou me peça que eu troco.
6. Recrie o agendamento de avisos (de 15 em 15 minutos) com o SQL de `supabase/migrations/0007_avisos_hora.sql`, colocando o segredo `REMINDER_SECRET` onde o arquivo indica.
7. Abra o app e confira se seus dados estão lá.

## 4. Chave de serviço do Supabase (5 minutos)
1. No Supabase, abra Project Settings > API Keys e copie a chave de serviço (service_role ou secret).
2. Na Vercel, crie `SUPABASE_SERVICE_ROLE_KEY`.
3. Ela é usada por: webhook de cobrança, exclusão de conta, e-mails de cobrança e avisos para várias pessoas.

## 5. E-mails de sistema pelo Resend (20 minutos)
Boas-vindas, fim do teste grátis, pagamento confirmado, pagamento pendente e assinatura cancelada. Já estão prontos e só saem com o login ligado.
1. Crie a conta em resend.com. O plano grátis cobre 3.000 e-mails por mês.
2. Em Domains, adicione `dimeta.com.br` e crie no registro.br os registros DNS que o Resend mostrar.
3. Em API Keys, crie uma chave.
4. Na Vercel, crie:
   - `RESEND_API_KEY`;
   - `EMAIL_FROM` = `Dimeta <ola@dimeta.com.br>`.
5. Opcional: no Supabase, em Authentication > SMTP Settings, use o próprio Resend para os e-mails de confirmação de conta, que saem com a sua marca.

## 6. Ligar o login (cerca de 20 minutos)
1. No Supabase, em Authentication > Providers, deixe "Email" ligado. Em Authentication > URL Configuration, confira o domínio.
2. Ligue a proteção contra senha vazada: Authentication > Policies (ou Password security) > "Leaked password protection". Leva 2 minutos.
3. Na Vercel, crie `AUTH_ENABLED` = `true` e publique de novo.
4. Abra /login > "Criar conta" com o seu e-mail e confirme pelo link.
5. No SQL Editor do Supabase:
   - rode `supabase/pendentes/0101_migrar_dados_do_dono.sql`, trocando o e-mail na linha marcada. Isso leva todos os seus dados para a sua conta;
   - depois rode `supabase/pendentes/0100_ligar_login.sql`, que tira o acesso anônimo do modo teste. A última consulta precisa voltar vazia.
6. Entre no app e confira se seus dados estão lá. Os avisos automáticos passam a atender todas as pessoas sozinhos.

## 7. Conta no Asaas, o meio de pagamento (cerca de 30 minutos, mais a aprovação do Asaas)
1. Antes de criar, confira as taxas atuais de Pix, cartão e boleto no site do Asaas.
2. Crie a conta em asaas.com com CNPJ (ou CPF, no começo) e conclua a verificação.
3. Crie uma conta de testes em sandbox.asaas.com e gere a chave em Integrações.
4. Na Vercel, crie:
   - `ASAAS_API_KEY`: a chave do sandbox, para testar;
   - `ASAAS_ENV` = `sandbox`;
   - `ASAAS_WEBHOOK_TOKEN`: uma senha longa que você inventar.
5. No Asaas, em Integrações > Webhooks, cadastre:
   - a URL `https://dimeta.com.br/api/asaas/webhook`;
   - o mesmo token do passo anterior;
   - os eventos de Cobrança e de Assinatura.

## 8. Ligar a cobrança (5 minutos, mais 15 minutos de teste)
1. Na Vercel, crie `BILLING_ENABLED` = `true` e publique de novo.
2. Teste com uma conta nova: assine pelo sandbox e confira se o status muda e se o e-mail de pagamento confirmado chega.
3. Para cobrar de verdade, troque `ASAAS_API_KEY` pela chave de produção e mude `ASAAS_ENV` para `production`.
4. Sua conta também entra no teste grátis. Se quiser ficar isento, me peça e eu marco a sua assinatura como ativa.

## 9. Backup semanal (5 minutos)
1. No Supabase, abra Project Settings > Database > Connection string (URI), copie e troque a senha.
2. No GitHub, crie o segredo `SUPABASE_DB_URL` em Settings > Secrets and variables > Actions.
3. Para testar, rode o fluxo "backup-semanal" em Actions.

---

## Variáveis de ambiente (nomes)
| Nome | Para quê | Situação |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | banco | já existem |
| GROQ_API_KEY, GROQ_MODEL | IA da barra | já existem |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY | notificações | já existem |
| CRON_SECRET, REMINDER_SECRET | agendamentos | já existem |
| NEXT_PUBLIC_SITE_URL | domínio | passo 2 |
| SUPABASE_SERVICE_ROLE_KEY | tarefas do servidor | passo 4 |
| RESEND_API_KEY, EMAIL_FROM | e-mails | passo 5 |
| AUTH_ENABLED | login | passo 6 |
| ASAAS_API_KEY, ASAAS_ENV, ASAAS_WEBHOOK_TOKEN | pagamento | passo 7 |
| BILLING_ENABLED | cobrança | passo 8 |
| SUPABASE_DB_URL (segredo do GitHub) | backup | passo 9 |

## Alertas do Supabase que ficam como estão
- **pg_net no schema public:** risco baixo. Mover a extensão quebraria o agendamento de avisos.
- **Índices "não usados":** normais com poucos dados.
