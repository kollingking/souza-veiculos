# 04 - DB Spec

## Fonte da especificação
- OpenAPI do PostgREST do projeto Supabase (`standard public schema`, versão `14.1`).
- Paths disponíveis: `/veiculos`, `/vendedores`.

## 1. Tabela `veiculos`

### Chave primária
- `id` (`bigint`, obrigatório, PK)

### Campos
- `id` (`integer/bigint`) **obrigatório**
- `created_at` (`timestamp with time zone`, default `now()`) **obrigatório**
- `title` (`text`) opcional
- `brand` (`text`) opcional
- `model` (`text`) opcional
- `year` (`text`) opcional
- `km` (`text`) opcional
- `price` (`double precision`) opcional
- `fuel` (`text`) opcional
- `badge` (`text`) opcional
- `options` (`jsonb`) opcional
- `lifestyle` (`jsonb`) opcional
- `images` (`jsonb`) opcional
- `description` (`text`) opcional
- `engine` (`text`) opcional
- `transmission` (`text`) opcional
- `power` (`text`) opcional
- `color` (`text`) opcional
- `createdBy` (`text`) opcional
- `lastEditedBy` (`text`) opcional

### Relacionamentos
- Não há FKs declaradas no OpenAPI público desta tabela.

### Regras implícitas
- `images`, `options`, `lifestyle` funcionam como arrays JSON no frontend.
- Ordenação padrão no app: `created_at DESC`.

## 2. Tabela `vendedores`

### Chave primária
- `id` (`uuid`, default `gen_random_uuid()`, obrigatório, PK)

### Campos
- `id` (`uuid`) **obrigatório**
- `username` (`text`) **obrigatório**
- `password` (`text`) **obrigatório**
- `role` (`text`, default `vendedor`) opcional
- `login_count` (`bigint`, default `0`) opcional
- `last_login` (`timestamp with time zone`) opcional
- `created_at` (`timestamp with time zone`, default `now()`) opcional

### Relacionamentos
- Não há FK explícita com `veiculos`.
- Relação lógica usada no frontend: `veiculos.createdBy` == `vendedores.username`.

## 3. Campos locais (fora do schema atual do banco)
O frontend usa campos adicionais no objeto de veículo que **não aparecem na definição pública atual de `veiculos`**:
- `code`
- `condition`
- `type`
- `videoUrl`
- `createdAt` (local, mapeado parcialmente para `created_at`)

### Impacto
- Se enviados no `upsert` e não existirem no schema, o Supabase retorna erro de coluna inexistente.
- Nesse cenário, o app cai em fallback local (`souza_cars`).

## 4. Obrigatórios vs opcionais
- `veiculos`: somente `id` e `created_at` são obrigatórios no schema público.
- `vendedores`: `id`, `username`, `password`.

## 5. Campos derivados/calculados (no app)
- `title` composto de marca + modelo + versão.
- `badge` inferido de lifestyle (`premium` -> `Luxo`; caso contrário `Destaque`).
- `type` pode ser inferido por heurística de marca/modelo no carregamento local.

## 6. RLS/permissões
- O OpenAPI público não expõe políticas RLS diretamente.
- Pelo comportamento do app com chave anon, há permissões suficientes para operações de leitura/escrita que ele executa.
- Documentação de políticas (se houver) não está versionada neste repositório.
