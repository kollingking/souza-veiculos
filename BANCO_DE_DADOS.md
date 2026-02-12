# Configuração do Banco de Dados - Souza Select Car 🚀

Para transformar o site em um sistema online, utilizaremos o **Supabase** (Plano Gratuito).

## 1. Criando a Conta
1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Crie um novo projeto chamado `souza-select-car`.
3. Defina uma senha forte para o banco de dados.

## 2. Criando a Tabela de Veículos
No menu **Table Editor**, clique em **New Table** e configure como abaixo:

**Nome da Tabela:** `veiculos`

| Nome da Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `int8` | Primary Key (Auto Identity) |
| `created_at` | `timestamptz` | default: `now()` |
| `title` | `text` | Nome completo do carro |
| `brand` | `text` | Marca |
| `model` | `text` | Modelo |
| `year` | `text` | Ano |
| `km` | `text` | Quilometragem |
| `price` | `numeric` | Preço |
| `fuel` | `text` | Combustível |
| `badge` | `text` | Badge (Novo, Luxo, etc) |
| `options` | `jsonb` | Lista de opcionais (Array) |
| `lifestyle` | `jsonb` | Categorias (Array) |
| `images` | `jsonb` | Links das fotos no Storage (Array) |
| `description` | `text` | Descrição completa |
| `engine` | `text` | Motorização |
| `transmission`| `text` | Câmbio |
| `power` | `text` | Potência |
| `color` | `text` | Cor |
| `condition` | `text` | Classificação (seminovos, novos, usados) |
| `type` | `text` | Tipo (carros, motos) |
| `createdBy` | `text` | Vendedor que criou |
| `lastEditedBy`| `text` | Último que editou |
| `videoUrl` | `text` | Link do YouTube |

## 3. Armazenamento de Fotos (Storage)
1. Vá em **Storage** no menu lateral.
2. Crie um novo Bucket chamado `car-photos`.
3. Marque como **Public** (para que as fotos apareçam no site).

## 4. Credenciais
Vá em **Project Settings** -> **API** e você encontrará:
- `Project URL`
- `anon public key` (Esta chave é segura para usar no frontend)

---
---
**Dica:** Guarde a Chave Anon e a URL, pois vamos colá-las no `script.js` a seguir.

## 5. Script de Reparo Rápido (SQL)
Caso o site mostre aviso de "Salvo no dispositivo", execute este comando no **SQL Editor** do Supabase para atualizar a tabela:

```sql
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS engine TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS transmission TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS power TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS "lastEditedBy" TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
```
