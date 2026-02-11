# 05 - API / Funções / Integrações

## 1. APIs de dados (Supabase)

### 1.1 Tabela `veiculos`
- Cliente: `supabaseClient.from('veiculos')`
- Operações usadas:
  - `select('*').order('created_at', { ascending: false })`
  - `select('*').eq('id', id).single()`
  - `upsert(dbPayload)`
  - `delete().eq('id', id)`

### 1.2 Tabela `vendedores`
- Operações usadas:
  - Login: `select('username, role, password').eq('username', ...).eq('password', ...).single()`
  - Tracking login: `select('login_count')` + `update({ last_login, login_count })`
  - Gestão interna (funções JS legadas): `select`, `insert`, `update`, `delete`

### 1.3 Storage `car-photos`
- Upload: `storage.from('car-photos').upload(fileName, blob, ...)`
- Public URL: `storage.from('car-photos').getPublicUrl(fileName)`

## 2. API FIPE (externa)
Base: `https://parallelum.com.br/fipe/api/v1`

### Endpoints consumidos
- `GET /{tipo}/marcas`
- `GET /{tipo}/marcas/{marca}/modelos`
- `GET /{tipo}/marcas/{marca}/modelos/{modelo}/anos`
- `GET /{tipo}/marcas/{marca}/modelos/{modelo}/anos/{ano}`

`tipo` usado no app: `carros` ou `motos`.

## 3. Integrações e links externos
- WhatsApp:
  - `https://wa.me/{phone}?text=...`
  - `https://api.whatsapp.com/send?phone=...&text=...`
- Compartilhamento:
  - Facebook share URL
  - LinkedIn share URL
  - Instagram (URL configurável via localStorage)
- Mapa:
  - Google Maps embed por endereço
- YouTube:
  - Conversão para `https://www.youtube.com/embed/{id}`

## 4. Fluxos síncronos/assíncronos
- Assíncronos:
  - Carregamento de dados (Supabase)
  - Busca FIPE
  - Upload de imagem
- Síncronos:
  - Renderizações locais
  - Filtros em memória
  - Persistência de estado em localStorage

## 5. Eventos importantes do sistema
- `DOMContentLoaded`: bootstrap principal.
- Eventos de UI:
  - `click`, `input`, `change`, `wheel`, `keydown`, `touchstart/end`.
- Persistência:
  - gravações em `localStorage` para sessão, analytics, configurações e fallback de dados.

## 6. Itens parciais/não implementados
- Configuração de Pixel/GA no admin não ativa/injeta script dinamicamente nas páginas públicas.
- Não há webhook/event bus para propagação de mudanças entre dispositivos em tempo real.
