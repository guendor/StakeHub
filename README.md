# StakeHub 🎯

**StakeHub** é um marketplace de *poker staking* (cavalagem), conectando **Jogadores** (horses) que desejam vender cotas de torneios e **Investidores** (backers) interessados em comprar essas cotas.

> 🚧 Versão MVP — pagamentos **não são processados** na plataforma. O propósito é conectar as partes e organizar anúncios. A integração de pagamentos (Stripe/PIX) está planejada para uma fase futura.

---

## 🔎 Conceito

- **Jogadores** publicam anúncios com detalhes do torneio (buy-in, add-on, taxas, premiação garantida, nº de cotas, % markup por cota)
- **Investidores** navegam pelo marketplace, filtram anúncios e registram interesse em comprar cotas
- O app calcula automaticamente **custo total** e **preço por cota**
- Perfis de jogadores exibem bio, conquistas e links externos

---

## 🛠 Tech Stack

| Layer | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Estilização | Vanilla CSS + CSS Modules |
| Banco de dados & Auth | Supabase (PostgreSQL + RLS) |
| Deploy | Vercel |
| Pagamentos (futuro) | Stripe / PIX (stub reservado) |

---

## 🚀 Setup rápido

### 1. Clonar e instalar

```bash
git clone https://github.com/guendor/StakeHub.git
cd StakeHub
npm install
```

### 2. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/migrations/001_initial.sql`
3. Copie a **URL** e a **Anon Key** em *Project Settings > API*

### 3. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
# Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Rodar localmente

```bash
npm run dev
# Acesse http://localhost:3000
```

---

## 📁 Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── marketplace/                # Feed de anúncios com filtros
│   ├── listings/[id]/              # Detalhe do anúncio + interesse
│   ├── players/[id]/               # Perfil público do jogador
│   ├── dashboard/                  # Dashboard autenticado
│   │   ├── new-listing/            # Criar anúncio
│   │   └── listing/[id]/           # Editar anúncio
│   └── auth/login/                 # Login e cadastro
├── components/                     # Componentes reutilizáveis
├── lib/supabase/                   # Clientes Supabase (client/server/middleware)
└── types/                          # TypeScript types + funções de cálculo
supabase/
└── migrations/001_initial.sql      # Schema completo + RLS policies
```

---

## 💳 Integração de pagamentos (futuro)

O schema já está preparado para receber pagamentos:

- A tabela `interests` possui um campo `payment_stub JSONB` reservado
- Os listings têm status: `open → funded → in_progress → settled`
- O arquivo `.env.local.example` já tem os slots para `STRIPE_SECRET_KEY` e `PIX_API_KEY`

Para implementar: basta criar uma Route Handler em `/api/checkout` e popular o `payment_stub` após confirmação do pagamento.

---

## 🔐 Segurança

- Row Level Security (RLS) ativo em todas as tabelas
- Jogadores só editam/deletam seus próprios anúncios
- Investidores só veem seus próprios interesses + interesses nas listagens onde são donos
- Dashboard protegido via middleware (redirect para login se não autenticado)

---

## 📦 Deploy (Vercel)

1. Importe o repositório no [vercel.com](https://vercel.com)
2. Adicione as variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy automático ✅
