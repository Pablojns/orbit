# Lista de verificação de deploy

Use a cada publicação importante e antes de divulgar.

## Antes de publicar
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npx eslint src --quiet` sem erros
- [ ] Todos os `scripts/test-*.ts` passando (`for f in scripts/test-*.ts; do npx tsx $f; done`)
- [ ] Migração nova? Aplicada no Supabase e salva em `supabase/migrations`
- [ ] Nenhuma senha ou chave no código: `git grep -nE "sk_|eyJhbGci|service_role"` vazio

## Depois de publicar (2 minutos depois do push)
- [ ] https://dimeta.vercel.app/ abre a página de vendas com "7 dias grátis" e "R$ 29,90"
- [ ] /app abre o Início com Saldo, Agenda, Contas, Hábitos e Para onde foi
- [ ] Lançar "TESTE mercado 1 pix" pela barra, conferir no Extrato e apagar
- [ ] Celular (390px): barra de baixo com 5 itens, nada cortado
- [ ] Computador (1280px): Início, Estudos e Hábitos sem rolar a página
- [ ] Vercel > Logs sem erros novos nos últimos 10 minutos

## Antes de divulgar (uma vez)
- [ ] Pendências 1 a 8 de `docs/PENDENCIAS-DO-PABLO.md` feitas
- [ ] `src/lib/site.ts` sem marcadores entre colchetes
- [ ] Criar conta nova, receber e-mail de boas-vindas, fazer o tutorial e chegar ao Saldo certo
- [ ] Assinar no sandbox do Asaas e receber o e-mail de pagamento confirmado
- [ ] Cancelar e conferir que o acesso continua até o fim do mês pago
- [ ] Exportar CSV no Perfil
- [ ] Nota do PageSpeed (celular) no Início: 90 ou mais
- [ ] Termos e Privacidade com nome, CNPJ e e-mail reais
