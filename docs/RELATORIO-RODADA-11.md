# Relatório da Rodada 11

## Pronto
- **Página de vendas final (/):** no visual do app, com um plano só: 7 dias grátis e depois R$ 29,90 por mês, sem plano grátis. Saíram "Gratuito" e "R$ 19,90".
  - Os botões abrem o app hoje.
  - Com AUTH_ENABLED ligado, os botões levam a "Criar conta" (`/login?modo=criar`).
  - Termos e Privacidade também passaram para o visual do app.
- **E-mails de sistema**, prontos e desligados:
  - boas-vindas, uma vez por conta;
  - fim do teste grátis, 2 dias antes;
  - pagamento confirmado, pagamento pendente e assinatura cancelada, pelo webhook do Asaas.
  - Saem pelo Resend, só com o login ligado e as chaves criadas.
  - Têm teste automático (`scripts/test-email.ts`).
- **Domínio preparado:** tudo usa `NEXT_PUBLIC_SITE_URL`: e-mails, notificações e endereço base. Quando o domínio for ligado, dimeta.vercel.app passa a redirecionar para ele (menos as rotas internas /api).
- **site.ts:** e-mail e CNPJ com marcadores entre colchetes.
- **Avisos para várias pessoas:** os agendamentos rodam para cada pessoa quando o login estiver ligado. Era a pendência E da Rodada 9 e agora está pronta, com teste (`scripts/test-run-as.ts`).
- **Lista de verificação de deploy:** docs/CHECKLIST-DEPLOY.md.
- **PENDENCIAS-DO-PABLO.md** reescrito em ordem (0 a 9), com tempo de cada passo e a tabela de variáveis.

## Não ficou e por quê
- **Comprar o domínio e ligá-lo na Vercel:** custa dinheiro e exige seu CPF ou CNPJ. Está na pendência 2.
- **Valores reais de e-mail e CNPJ:** só você tem.
- **Conta no Resend:** só você pode criar.

## Decisões que tomei
- **Resend** para e-mails: plano grátis suficiente no começo, API simples e sem biblioteca extra.
- **Sem e-mail com o login desligado:** assim nada sai para você por engano enquanto o app está em modo teste.
- **A página de vendas não mostra depoimentos nem números de usuários,** porque ainda não existem e inventar seria enganoso.

## O que achei ruim no teste e corrigi
- No computador, o botão "Começar 7 dias grátis" quebrava em duas linhas. Corrigido.
