# 07 - Permissões e Segurança

## 1. Tipos de acesso

### Público
- Acesso livre às páginas de vitrine.
- Pode filtrar, visualizar detalhes e abrir contato via links externos.

### Área restrita
- Login em `login.html` grava sessão em `localStorage` (`souza_session`).
- `admin.html` verifica existência de sessão e redireciona para login se ausente.

### Perfis
- `role=admin`: habilita tabs de Integrações e Configurações.
- `role=vendedor`: acesso às tabs principais de operação.

## 2. O que cada usuário pode fazer
- Público:
  - Leitura de catálogo e contato.
- Vendedor autenticado:
  - Cadastro/edição/duplicação/exclusão de veículos.
  - Filtros de estoque e geração de texto.
- Admin autenticado:
  - Tudo do vendedor + integrações/configurações.

## 3. Validações no frontend
- Formulário em steps com campos obrigatórios por etapa.
- URL de vídeo validada para padrão YouTube.
- Número de WhatsApp validado por tamanho mínimo.
- Confirmação de exclusão em modal.

## 4. Validações no backend
- Não há backend próprio no projeto.
- Validações dependem de:
  - regras de coluna no Supabase
  - permissões/policies do Supabase (não versionadas neste repositório)

## 5. Pontos de risco conhecidos
- Chave anon do Supabase embutida no frontend (esperado para apps client-side, mas requer políticas corretas).
- Login baseado em consulta direta de `username/password` (senha em texto puro na tabela `vendedores`).
- Sessão em `localStorage` sem token assinado/verificação server-side.
- Controle de acesso por role é de interface (pode ser burlado no cliente se não houver policy robusta no Supabase).
- Credenciais hardcoded de fallback no login.

## 6. Recomendações mínimas de endurecimento
- Migrar autenticação para Supabase Auth (hash de senha, sessão real, expiração/refresh).
- Aplicar RLS estrita por perfil e operação.
- Remover hardcoded credentials.
- Evitar escrita sensível baseada apenas em estado local.
