# 🧹 Sub-fase 6.A — Limpeza de Notas Fiscais e Reposicionamento

> **Contexto:** Azulli é um SaaS B2B (Next.js 16 + Tailwind v4 + Supabase + shadcn/ui). Fases 1-5 entregues.
>
> **Decisão estratégica:** Notas Fiscais foram **removidas do escopo** definitivamente. Razão: custo alto pra MVP sem investimento externo (R$ 0,30-1 por NF via Focus NFe), complexidade brutal de variações municipais, e foco do produto migrou pra **assistente financeiro inteligente** com IA e automação.
>
> Esta sub-fase é **100% cosmética e textual** — sem migrations, sem mudanças de DB, sem custo. Objetivo: deixar o produto coerente com o novo posicionamento.

---

## 🎯 Objetivos

1. **Remover toda menção a Notas Fiscais** do código e da UI
2. **Reposicionar features dos planos** (PLANS) substituindo o que era "NF/mês" por funcionalidades novas que virão nas Fases 7-11
3. **Deletar pasta** `/notas-fiscais` por completo
4. **Limpar sidebar, billing e tab fiscal** se houver
5. **Não quebrar nada** que dependa de transactions, customers, etc.

---

## 🔍 Tarefa 1 — Busca completa por referências

Antes de mexer em qualquer arquivo, fazer um inventário com **busca global no projeto** pra mapear tudo que precisa sair.

### Termos a buscar (case-insensitive)

```
nfe
nfse  
nf-e
nfs-e
nota fiscal
notas fiscais
fiscal
nfeIncluded
focus_nfe
focus-nfe
needs_nfe
nfe_id
emitir nota
notas-fiscais
```

### Comandos sugeridos no Antigravity terminal

```bash
# Buscar em todo o src
grep -r -i -l "nfe\|nota fiscal\|notas fiscais\|fiscal" src/ --include="*.ts" --include="*.tsx"

# Buscar termos específicos
grep -r "nfeIncluded" src/
grep -r "needs_nfe\|nfe_id" src/
grep -r "/notas-fiscais" src/
```

### Resultado esperado

Listar **todos** os arquivos que aparecem na busca. Vai ter pelo menos:
- `src/lib/billing/plans.ts` (definitivo — feature list e limits)
- `src/components/app/sidebar-nav.tsx` (definitivo — item de menu)
- `src/app/(app)/notas-fiscais/` (pasta inteira a remover)
- `src/app/(app)/configuracoes/_components/billing-tab.tsx` (possivelmente)
- `src/app/(app)/billing/` (se já existir da Fase 5)

> 💡 **Anotar o resultado** num comentário ou TODO no Antigravity antes de mexer em qualquer coisa.

---

## ✅ Tarefa 2 — Atualizar `src/lib/billing/plans.ts`

### Mudanças

#### Remover do tipo `Plan.limits`:
- `nfeIncluded: number` — **deletar essa chave**

#### Atualizar `PLANS.pro`

Substituir a feature `"10 NF-e/NFS-e por mês"` por outras features mais alinhadas ao novo posicionamento. Lista final sugerida:

```
- Lançamentos ilimitados
- Até 500 clientes e fornecedores
- Controle de estoque
- Metas e lembretes
- Exportação Excel
- Importação automática de extrato bancário (em breve)
- Detector de despesas recorrentes (em breve)
- Suporte por e-mail
```

**Mudanças em limits.pro:**
- Remover `nfeIncluded: 10`
- Manter o resto (maxCustomers: 500, etc.)

#### Atualizar `PLANS.enterprise`

Substituir `"30 NF-e/NFS-e por mês"` por features novas. Lista final sugerida:

```
- Tudo do Pro
- Clientes, fornecedores e produtos ilimitados
- Funcionários ilimitados
- Assistente IA conversacional (em breve)
- Previsão de fluxo de caixa (em breve)
- Régua de cobrança automatizada (em breve)
- Insights semanais por e-mail (em breve)
- Suporte prioritário
```

**Mudanças em limits.enterprise:**
- Remover `nfeIncluded: 30`
- Manter o resto (maxCustomers: null, etc.)

> ⚠️ **Importante:** ao remover `nfeIncluded` do tipo `Plan.limits`, o TypeScript vai apontar todos os lugares que usam essa chave. Listar esses lugares e ajustar (próximas tarefas vão limpar).

### Validação

- `npm run typecheck` (ou `tsc --noEmit`) **não** pode apontar erro relacionado a `nfeIncluded`
- Lint passa

---

## ✅ Tarefa 3 — Limpar `sidebar-nav.tsx`

Arquivo: `src/components/app/sidebar-nav.tsx`

### Mudanças

1. **Remover do array `items`** a linha que contém `/notas-fiscais` e label `"Notas fiscais"` (ícone `FileText`)
2. **Remover o import** `FileText` se não for usado em outro lugar do arquivo
3. **Conferir ordem final** dos itens. Sugestão:
   ```
   Painel → Lançamentos → Clientes → Fornecedores → Produtos →
   Funcionários → Metas e lembretes → Configurações
   ```

### Validação

- Sidebar renderiza sem item "Notas fiscais"
- Mobile: sheet do `MobileNav` também não mostra (ele usa o mesmo `SidebarNav`)

---

## ✅ Tarefa 4 — Deletar pasta `/notas-fiscais`

### Ação

Deletar **completamente**:

```bash
rm -rf src/app/(app)/notas-fiscais
```

Isso remove:
- `page.tsx` (a lista MVP que talvez exista)
- `_components/` (qualquer componente)
- Qualquer subrota `[id]` se houver

### Validação

- Rota `/notas-fiscais` retorna **404** quando acessada
- `npm run build` passa sem erro de import órfão

> 💡 Se o build apontar imports órfãos a `notas-fiscais` em outros arquivos, esses arquivos precisam ser limpos também (provavelmente são referências antigas).

---

## ✅ Tarefa 5 — Limpar `BillingTab` se houver menção a NF

Arquivo: `src/app/(app)/configuracoes/_components/billing-tab.tsx`

### Verificações

1. Procurar strings: `"NF"`, `"nota fiscal"`, `"fiscal"`, `"NFS-e"`, `"NF-e"`
2. Se houver:
   - Remover frases que mencionam emissão
   - Atualizar lista de features mostrada (vai vir automaticamente de `PLANS` se o componente lê de lá)

### Atenção

- Se a aba **"Fiscal"** foi adicionada (Fase 6 original previa), **remover por completo**:
  - Tirar do `TabsList` (voltar pra `grid-cols-3`)
  - Remover `<TabsContent value="fiscal">`
  - Remover arquivo `fiscal-tab.tsx` se existir
  - Atualizar `src/app/(app)/configuracoes/page.tsx`

### Sobre o arquivo `page.tsx` de configurações

Conferir `TabsList`:
- Voltar de `!grid !grid-cols-4` (se foi mudado) pra `!grid !grid-cols-3`
- Tabs finais: `Conta` | `Empresa` | `Plano`

---

## ✅ Tarefa 6 — Limpar `/billing` page se mencionar NF

Arquivo: `src/app/(app)/billing/page.tsx` e componentes em `_components/`

### Verificações

1. Procurar `"NF"`, `"nota fiscal"`, `"NFS-e"` em todos os arquivos da pasta
2. Se a página listar features dos planos manualmente, garantir que está **lendo de PLANS** (não hardcoded)
3. Se houver componente `<PlanCard>` que itera sobre `plan.features`, ele vai pegar a nova lista automaticamente

### Importante

- O componente `<PlanCard>` deve renderizar as features lendo `plan.features` direto
- Se houver alguma feature hardcoded sobre NF (fora do PLANS), remover

---

## ✅ Tarefa 7 — Limpar referências em `transactions`

Buscar e remover:

### No DB
- Verificar se a migration `00014_nfe.sql` foi **executada** no Supabase
- Se SIM: criar migration `00015_remove_nfe.sql` (ver Tarefa 8)
- Se NÃO: **apenas deletar o arquivo de migration local** (`supabase/migrations/00014_nfe.sql`) se existir

### No código
- Buscar `needs_nfe` e `nfe_id` em queries de transactions
- Remover referências em:
  - `src/lib/financial/schemas.ts`
  - `src/lib/financial/transactions.actions.ts`
  - `src/lib/financial/queries.ts`
  - `src/components/app/transaction-dialog.tsx`
  - `src/lib/financial/types.ts` (se houver)

### Em `transaction-dialog.tsx`

Se o checkbox "Emitir nota fiscal junto" foi adicionado (estava no plano original da Fase 6):
- Remover completamente o checkbox
- Remover lógica de abrir EmitNFSeDialog automaticamente

---

## ✅ Tarefa 8 — Migration de rollback (CONDICIONAL)

> ⚠️ **Só executar essa tarefa se a migration `00014_nfe.sql` já tiver sido aplicada no Supabase.**

Como o usuário **não implementou a Fase 6** (decisão de descartar), o mais provável é que **não exista** essa migration. Confirmar primeiro:

```sql
-- No SQL Editor do Supabase
select tablename from pg_tables where schemaname='public' and tablename in ('nfe_configs','nfe_documents');
```

### Se retornar 0 linhas
- **Nada a fazer** — pular essa tarefa
- Se houver arquivo `supabase/migrations/00014_nfe.sql` localmente, **deletar**

### Se retornar 1+ linhas

Criar `supabase/migrations/00015_remove_nfe.sql`:

```sql
-- ============================================================================
-- AZULLI — Sub-fase 6.A: Remoção das estruturas de NF
-- ============================================================================

-- Remover FK e colunas de transactions
alter table public.transactions
  drop column if exists nfe_id,
  drop column if exists needs_nfe;

-- Drop tabelas (CASCADE pra remover policies e indexes)
drop table if exists public.nfe_documents cascade;
drop table if exists public.nfe_configs cascade;

-- Drop função
drop function if exists public.count_nfe_this_month(uuid);
```

Rodar no SQL Editor. Validar:

```sql
select tablename from pg_tables where tablename like 'nfe_%';
-- 0 linhas

select column_name from information_schema.columns 
where table_name='transactions' and column_name in ('nfe_id', 'needs_nfe');
-- 0 linhas
```

---

## ✅ Tarefa 9 — Limpar arquivos de NF na lib (se houver)

Verificar e deletar (se existirem):

```
src/lib/nfe/
src/lib/focus-nfe/
src/lib/crypto/aes.ts          ← era pra criptografar senha do A1
src/app/api/webhooks/focus-nfe/
```

Buscar com:

```bash
ls -la src/lib/nfe/ 2>/dev/null
ls -la src/lib/focus-nfe/ 2>/dev/null
ls -la src/lib/crypto/ 2>/dev/null
ls -la src/app/api/webhooks/focus-nfe/ 2>/dev/null
```

Se existirem: `rm -rf` cada uma.

---

## ✅ Tarefa 10 — Limpar `.env.example` e docs

### `.env.example` (ou similar)

Se houver, remover linhas:
```
FOCUS_NFE_TOKEN=
FOCUS_NFE_BASE_URL=
FOCUS_NFE_WEBHOOK_TOKEN=
NFE_CERT_ENCRYPTION_KEY=
```

### `.env.local`

Mesma coisa — pode apagar as linhas dessas vars (não vão ser usadas mais).

### README.md (se existir)

Procurar menções a "NF", "Focus NFe", "nota fiscal" e remover/atualizar.

---

## ✅ Tarefa 11 — Atualizar copy geral

Buscar e ajustar textos em componentes:

### Procurar termos
- `"emitir NF"`
- `"nota fiscal"`
- `"NF-e"`
- `"NFS-e"`

### Componentes prováveis
- Landing page (se houver em `src/app/page.tsx` ou `(marketing)`)
- Empty states
- Tooltips
- Mensagens de toast

### Frases a substituir

Antes:
> "Emita notas fiscais sem complicação"

Depois:
> "Controle suas finanças com IA e automação"

Ou similar — alinhar com o novo posicionamento de **assistente financeiro inteligente**.

> 💡 Se o agente do Antigravity quiser sugerir novas frases pro novo posicionamento, perfeito. Manter tom amigável já estabelecido ("Dinheiro na conta! 💰").

---

## ✅ Tarefa 12 — Verificação final

### Checklist técnico

```bash
# 1. Build limpo
npm run build

# 2. TypeScript sem erros
npx tsc --noEmit

# 3. Não há mais referências
grep -r -i "nfe\|nota fiscal\|notas fiscais" src/ --include="*.ts" --include="*.tsx"
# Espera-se: 0 resultados (ou só comentários de histórico)

# 4. Pasta deletada
ls src/app/\(app\)/notas-fiscais 2>/dev/null
# Espera-se: "No such file or directory"
```

### Checklist visual (testar no `npm run dev`)

- [ ] Sidebar **NÃO** mostra item "Notas fiscais"
- [ ] Acessar `/notas-fiscais` retorna 404
- [ ] Acessar `/billing` mostra os novos features dos planos
- [ ] Aba `/configuracoes` tem 3 tabs (Conta / Empresa / Plano), sem "Fiscal"
- [ ] `BillingTab` não menciona NF em nenhum lugar
- [ ] `TransactionDialog` não tem checkbox "Emitir nota fiscal"
- [ ] Plano Pro mostra 8 features (sem menção a NF)
- [ ] Plano Empresarial mostra 8 features (sem menção a NF, com "em breve" nas novas)

### Checklist no DB (Supabase SQL Editor)

```sql
-- Tabelas NF não existem
select tablename from pg_tables where tablename like 'nfe_%';
-- 0 linhas

-- Colunas removidas de transactions
select column_name from information_schema.columns 
where table_name='transactions' and column_name in ('nfe_id','needs_nfe');
-- 0 linhas
```

---

## 🧨 Pegadinhas e atenção

### 1. Não quebrar `BillingTab` ou `/billing` que **leem de PLANS**
- O componente `<PlanCard>` itera sobre `plan.features` — não precisa mexer na lógica, só atualizar o array em PLANS
- Mas se houver código hardcoded `<li>10 NF/mês</li>` em algum lugar, **remover manualmente**

### 2. TypeScript não vai pegar string interpolations
- `"10 NF-e/NFS-e por mês"` é string, TS não acusa
- Por isso o grep global é essencial pra encontrar resíduos

### 3. Mudança de `grid-cols-4` pra `grid-cols-3` em configurações
- Se a aba Fiscal foi adicionada, lembrar de **mudar o tamanho do grid**
- Senão fica com gap esquisito no TabsList

### 4. Migration de rollback opcional
- Só rodar se a migration original tiver sido aplicada
- Se não rodou, **só deletar o arquivo local** (não criar 00015)

### 5. Histórico Git
- Os arquivos vão ficar no git history mesmo após delete
- Isso é OK e desejado — facilita ressuscitar a feature no futuro se mudar de ideia (improvável, mas...)
- Não precisa fazer rebase nem nada

### 6. Customers/Suppliers/Products **não** são afetados
- A coluna `tax_id` (CNPJ) continua existindo — é usada pra outras coisas, não só pra NF
- `cpf_cnpj`, `inscricao_estadual`, etc. **não foram** criadas (eram parte da Fase 6 original)

### 7. Atenção ao revalidatePath
- Procurar em todas as actions: `revalidatePath('/notas-fiscais')` → **remover**
- Buscar com: `grep -r "notas-fiscais" src/lib/`

---

## 📦 Commit sugerido

```bash
git add .
git commit -m "refactor: remove notas fiscais do escopo" -m "
Decisão estratégica: NF (NFS-e/NF-e) saem do escopo do MVP por:
- Custo alto da API Focus NFe (R\$ 0,30-1 por nota)
- Complexidade de variações municipais
- Foco do produto migra para assistente financeiro inteligente

Mudanças:
- PLANS atualizado: features de NF substituídas por features futuras
  (importação OFX, previsão de caixa, assistente IA, régua de cobrança)
- Remove pasta src/app/(app)/notas-fiscais
- Remove item 'Notas fiscais' do SidebarNav
- Remove colunas nfe_id, needs_nfe de transactions (se aplicável)
- Remove tabelas nfe_documents, nfe_configs (se aplicável)
- Remove aba 'Fiscal' de /configuracoes (se aplicável)
- Limpa lib/nfe, lib/focus-nfe, webhook handler (se existirem)
- Atualiza copy geral pra novo posicionamento
"
```

---

## 🚀 Próxima fase

Quando essa limpeza estiver completa, volta no chat aqui e fala **"ok, Fase 7"**. Gero o plano da:

### **Fase 7 — Importação OFX + Detector de Despesas Recorrentes**

Visão geral do que vai ter:
- Upload de arquivo OFX (formato padrão dos bancos brasileiros)
- Parser de OFX em servidor (lib `node-ofx-parser` ou similar)
- **Categorização automática via Gemini Flash** (free tier — 1M tokens/dia grátis)
- Tela de revisão antes de importar (user confirma cada lançamento)
- Aprendizado com correções (few-shot dinâmico)
- **Detector de despesas recorrentes** (assinaturas, contas fixas) usando análise estatística simples
- Card no dashboard: "Você gasta R$ X em assinaturas mensais"
- Migration nova: `transactions.source` (manual / ofx_import / etc.) + `transactions.import_batch_id` pra agrupar

**Custo:** zero (Gemini Flash free tier cobre folgado pra MVP).

---

**Pronto pra implementar.** 🧹
