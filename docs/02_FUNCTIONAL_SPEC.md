# 02 - Functional Spec

## 1. Módulo: Home (`index.html`)

### Funcionalidades
- Banner com rotação automática.
- Busca com abas `carros`/`motos`.
- Carrossel de veículos em destaque.
- Carrossel de marcas.
- Cards de faixa de preço e categoria.
- Grid `Nossos Veículos` com filtros por condição.
- FAQ, rodapé, botão WhatsApp flutuante.

### Entradas esperadas
- `carsData` carregado de `DB.getAllCars()`.
- Eventos de interação (clique, scroll horizontal, teclado).

### Saídas esperadas
- Navegação para `veiculos.html` com query string de filtros.
- Renderização de cards com preço, specs e ações.

### Regras/validações
- Busca da home monta parâmetros URL apenas com campos preenchidos.
- Categoria especial:
  - `moto` -> `type=motos`
  - `esportivo` -> `lifestyle=esportivos`

## 2. Módulo: Estoque público (`veiculos.html`)

### Funcionalidades
- Filtro por tipo, marca, modelo.
- Busca textual por marca/modelo/título/ano/motor/descrição.
- Contador de resultados.
- Persistência de filtros em URL.

### Entradas
- Query params: `type`, `brand`, `model`, `search`, `year`, `max/priceMax`, `lifestyle`, `condition`.

### Saídas
- Grid filtrado de veículos.
- Counter: `x de y veículos encontrados`.

### Regras/validações
- `model` só habilita após escolher marca.
- Debounce de busca textual (300ms).
- Filtros de URL e UI são sincronizados na inicialização.

## 3. Módulo: Detalhes do veículo (`detalhes.html`)

### Funcionalidades
- Carrossel de imagens com 3 slots visíveis e navegação horizontal.
- Dados principais (título, subtítulo, preço, grid técnico compacto).
- Opcionais.
- Compartilhamento (Facebook, Instagram, WhatsApp, LinkedIn).
- Botão `Enviar mensagem` (WhatsApp).
- Mídia:
  - Exibe vídeo YouTube quando URL válida
  - Senão, exibe mosaico de fotos
- Localização (mapa embed + endereço configurável).
- Carrossel de veículos relacionados.
- Favoritos locais e modal de galeria ampliada.

### Entradas
- `id` no query param.
- Dados do veículo do banco/local.
- Configurações locais: telefone, endereço, Instagram.

### Saídas
- Página renderizada com fallback robusto de mídia.
- Ações de contato e compartilhamento.

### Regras/validações
- Sem `id`: redireciona para home.
- Se veículo não encontrado: tela de fallback com link de retorno.
- URL de vídeo validada por parser de YouTube.

## 4. Módulo: Login (`login.html`)

### Funcionalidades
- Login com verificação:
  - Hardcoded offline (`kaua/1234`, `1234/XXXX|1234`)
  - Supabase (`vendedores.username/password`)
- Atualização de `last_login` e `login_count` no Supabase.
- Criação de sessão local (`souza_session`).

### Entradas
- `username`, `password`.

### Saídas
- Redirecionamento para `admin.html` quando válido.
- Mensagem de erro quando inválido.

### Regras/validações
- Sem validação de força de senha.
- Sessão é apenas localStorage (sem token assinado pelo backend).

## 5. Módulo: Painel Admin (`admin.html`)

### 5.1 Painel geral
- Exibe:
  - Acessos totais
  - Acessos do dia
  - Quantidade em estoque
  - Veículo mais acessado
  - Lista de top veículos
  - Insights (mais tempo em estoque / mais clicado)
- Fonte de analytics: localStorage (`souza_analytics_v1`).

### 5.2 Novo veículo (3 steps)
- Step 1: Tipo, Marca, Modelo, Ano modelo, Versão.
- Step 2: Preço, Km, Combustível, Motorização, Câmbio, Potência, Cor, Classificação, Data da adição, URL do vídeo, descrição.
- Step 3: Opcionais, upload/reordenação de fotos, lifestyle.

#### Validação por step
- Step 1: exige marca/modelo/ano/versão.
- Step 2: exige preço > 0, km e classificação.

#### Salvamento
- Gera/atualiza `carObj`.
- Upload para Supabase Storage com compressão quando arquivo >2MB.
- Fallback para base64 local em falhas de upload.
- Persiste via `DB.saveCar`.
- Exibe feedback `saveFeedback` + toast.

### 5.3 Estoque cadastrado
- Filtros:
  - Busca textual
  - Marca
  - Status
  - Combustível
  - Range de ano (min/max)
  - Range de preço (min/max)
- Ações por card:
  - Editar
  - Visualizar
  - Duplicar
  - Gerar texto de marketing
  - Excluir (modal de confirmação)
- Exibe `Na loja desde ...` com base em `createdAt`.

### 5.4 Integrações
- UI para Facebook Pixel e Google Analytics.
- Campos ID + toggle + conectar/remover.
- Persistência em `souza_integrations` (localStorage).
- Observação: configuração não injeta scripts dinamicamente no frontend atual.

### 5.5 Configurações
- Salva:
  - Telefone principal WhatsApp
  - Nome da empresa
  - CNPJ
  - E-mail
  - Endereço da loja
- Atualiza links WhatsApp no site e endereço do mapa da página de detalhe.

## 6. Comportamentos automáticos transversais
- `capitalizeText` para padronização visual de nomes.
- Troca de imagem no hover dos cards (primeira/segunda foto).
- Persistência de tema claro/escuro (`souza_theme`).
- Coleta de analytics local por acesso e por visualização de veículo.

## 7. Dependências entre funcionalidades
- Telefone (`souza_admin_phone`) influencia:
  - CTA contato em cards
  - botão flutuante
  - botão enviar mensagem na página de detalhe
- Endereço (`souza_store_address`) influencia iframe de mapa em detalhes.
- `souza_session.role` define visibilidade de tabs `Integrações` e `Configurações`.

## 8. Erros tratados
- Supabase indisponível: fallback local com aviso.
- FIPE indisponível: fallback de marcas fixas.
- URL de vídeo inválida: impede salvar.
- Exclusão: exige confirmação.

## 9. Parcial / não implementado
- Módulo de vendedores existe no JS, mas não há tab ativa no admin atual (feature não exposta na UI).
- Integrações Pixel/GA salvas localmente, sem pipeline ativo de aplicação no runtime do site.
- `contact form` completo na página de detalhe não está ativo no layout atual.
