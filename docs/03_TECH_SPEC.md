# 03 - Technical Spec

## 1. Stack
- Frontend: HTML5 + CSS3 + JavaScript (Vanilla, sem framework).
- Banco/serviços: Supabase (PostgREST + Storage).
- Bibliotecas CDN:
  - `@supabase/supabase-js@2`
  - `heic2any` (conversão HEIC)
- APIs externas:
  - FIPE Parallelum (`https://parallelum.com.br/fipe/api/v1`)
  - Google Maps Embed
  - Links de compartilhamento (WhatsApp/Facebook/LinkedIn/Instagram)

## 2. Arquitetura geral
- Aplicação 100% client-side.
- Um arquivo JS principal (`script.js`) concentra:
  - Data layer
  - Renderização
  - Lógica de páginas
  - Estado global
- Persistência híbrida:
  - Fonte preferencial: Supabase
  - Resiliência: localStorage

## 3. Organização de código
- Páginas:
  - `index.html` (home)
  - `veiculos.html` (listagem)
  - `detalhes.html` (detalhe)
  - `login.html` (acesso)
  - `admin.html` (painel)
  - `limpar.html` (utilitário local)
- Lógica principal:
  - `script.js` (~4k linhas)
- Estilo:
  - `styles.css` (~4.9k linhas)
  - CSS extra inline no `admin.html` e `login.html`

## 4. Padrões adotados
- Inicialização única em `DOMContentLoaded` com detecção de página.
- Funções globais no `window` para handlers inline e interações de cards.
- Uso de `showToast` para feedback uniforme.
- URL query params como contrato de filtro entre páginas.

## 5. Convenções e contratos técnicos
- Estrutura de veículo (frontend) inclui campos além do banco atual:
  - `code`, `condition`, `type`, `videoUrl`, `createdAt`
- Mapeamento DB:
  - `createdAt` <-> `created_at`
- Chaves de estado no localStorage com prefixo `souza_`.

## 6. Fluxo de dados (alto nível)
1. Página inicia e chama `refreshAppData()` ou `initDetails()`.
2. `DB.getAllCars()`:
   - Busca Supabase
   - Busca localStorage
   - Mescla por `id`
3. Dados populam UI por renderizadores específicos.
4. Ações do admin atualizam DB/local e refrescam estado global.

## 7. Pontos críticos
- `script.js` monolítico (alto acoplamento e baixa testabilidade).
- Segurança fraca por autenticação local e uso de credenciais no frontend.
- Divergência entre schema de banco e payload de salvamento.
- Analytics local (não confiável para visão operacional global).

## 8. Build/deploy
- Não há pipeline de build obrigatório.
- Projeto pode ser servido como site estático (ex.: Netlify/Vercel/hosting tradicional).

## 9. Observabilidade
- Logs via `console.log`.
- Não há tracing, error reporting centralizado, nem monitoramento de backend.
