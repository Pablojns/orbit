# Orbit

Dinheiro, prazos e hábitos no mesmo lugar, organizados pelo **ciclo financeiro** da pessoa (do dia do salário até a véspera do próximo), e não pelo mês do calendário.

PWA feito com Next.js 16 + Supabase, publicado na Vercel. Funciona no navegador do computador e instala no celular pela opção "Adicionar à tela inicial".

| Endereço | O que é |
|---|---|
| `/` | Site público com lista de espera |
| `/app` | O app (exige login) |
| `/login` | Entrada sem senha |
| `/privacidade`, `/termos` | Páginas legais |

## Status: Fase 1 (fundação)

- [x] Site público com lista de espera salva no Supabase
- [x] App responsivo: barra inferior no celular, menu lateral no computador

- [x] Login sem senha (link por e-mail) e com Google
- [x] Rotas protegidas: quem não está logado vai para `/login`
- [x] Modelo de dados completo do MVP com Row Level Security
- [x] Navegação inferior: Início, Dinheiro, Agenda, Hábitos e Perfil
- [x] Início mostra o ciclo atual (dia X de Y, dias restantes)
- [x] Perfil salva o nome e o dia de início do ciclo no banco
- [x] PWA instalável (manifest, ícones, service worker, tela offline)
- [ ] Fase 2: entradas, gastos, categorias, painel "livre para gastar"

---

## Como colocar no ar (primeira vez)

### 1. Pegar as chaves do Supabase
No painel do Supabase, abra o projeto **orbit** → **Project Settings → API Keys** e copie:
- **Project URL** (algo como `https://abcd.supabase.co`)
- **Publishable key** (começa com `sb_publishable_`). Se só aparecer a "anon key", ela também serve.

> Essas duas chaves são públicas e podem ficar no navegador. **Nunca** use a `service_role`/`secret` key neste projeto.

### 2. Criar as tabelas
No Supabase: **SQL Editor → New query**, cole o conteúdo inteiro de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e clique em **Run**. Deve aparecer "Success". Depois faça o mesmo com [`supabase/migrations/0002_waitlist.sql`](supabase/migrations/0002_waitlist.sql) (lista de espera).

Os e-mails da lista ficam em **Table Editor → waitlist**. A coluna `source` mostra de onde a pessoa veio: use links como `seusite.com/?origem=tiktok` em cada rede para saber qual traz mais gente.

### 3. Publicar na Vercel
1. Na Vercel: **Add New → Project → Import** o repositório `orbit`.
2. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Publishable key
3. Clique em **Deploy**. Anote o endereço gerado (ex.: `orbit-xxxx.vercel.app`).

### 4. Liberar o endereço no Supabase
No Supabase: **Authentication → URL Configuration**:
- **Site URL**: `https://orbit-xxxx.vercel.app`
- **Redirect URLs**: adicione `https://orbit-xxxx.vercel.app/**` e `http://localhost:3000/**`

Sem esse passo, o link do e-mail volta para o lugar errado.

### 5. Testar no celular
1. Abra o endereço no Chrome do Android.
2. Entre com seu e-mail e abra o link **no próprio celular**.
3. Menu (⋮) → **Adicionar à tela inicial** / **Instalar app**.
4. Em **Perfil**, troque o dia do ciclo e salve. O Início deve mudar na hora.

### 6. Antes de divulgar
- Preencha **nome/CNPJ** e **e-mail de contato** em [`src/lib/site.ts`](src/lib/site.ts). Eles aparecem na Política de Privacidade.
- Na Vercel, abra o projeto → **Analytics → Enable**. É isso que conta os visitantes do site (conversão = inscritos ÷ visitantes).

### (Opcional) Login com Google
Exige criar credenciais no Google Cloud. Siga o guia do Supabase em **Authentication → Providers → Google**. Até lá, o botão mostra um aviso e o link por e-mail continua funcionando.

---

## Rodar no computador (opcional)

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do passo 1
npm run dev                  # http://localhost:3000
```

## Estrutura

```
src/
  app/
    page.tsx          site público (página inicial)
    _site/            peças do site: lista de espera, prévia, rodapé, páginas legais
    app/              telas logadas: Início, dinheiro, agenda, habitos, perfil
    privacidade/      Política de Privacidade
    termos/           Termos de Uso
    login/            tela de entrada (link por e-mail e Google)
    auth/callback/    para onde o link do e-mail e o Google voltam
    auth/signout/     sair da conta
    setup/            aviso quando faltam as variáveis do Supabase
    manifest.ts       dados do app instalável (nome, ícones, cores)
  components/         peças de interface reaproveitadas
  lib/
    supabase/         clientes do Supabase (navegador, servidor e proxy)
    cycle.ts          cálculo do ciclo financeiro
    dates.ts          datas no fuso de São Paulo
    money.ts          dinheiro sempre em centavos
    profile.ts        lê o usuário logado e o perfil
    site.ts           nome, CNPJ e contato que aparecem no site
  proxy.ts            renova a sessão e protege as rotas do /app
supabase/migrations/  SQL do banco
public/sw.js          service worker (cache de estáticos + tela offline)
scripts/              gerador de ícones
```

## Regras do código
- Dinheiro sempre em **centavos** (inteiro). `R$ 12,34` = `1234`.
- Datas no fuso **America/Sao_Paulo**.
- Toda tabela tem `user_id` e Row Level Security: cada pessoa só vê os próprios dados.
- O service worker **não** guarda dados financeiros em cache.
