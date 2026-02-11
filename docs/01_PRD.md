# 01 - PRD (Product Requirements Document)

## 1. Contexto
Produto web de concessionária com dois contextos de uso:
- **Público**: descoberta e contato de veículos.
- **Administrativo**: cadastro e gestão de estoque.

## 2. Personas reais (presentes no sistema)

### Persona A - Comprador
- Objetivo: encontrar veículo por filtros, avaliar detalhes e entrar em contato.
- Canais no sistema: `index.html`, `veiculos.html`, `detalhes.html`.

### Persona B - Vendedor (acesso restrito)
- Objetivo: cadastrar e atualizar veículos, duplicar anúncios, gerar texto de marketing.
- Canais no sistema: `login.html` + `admin.html`.

### Persona C - Administrador principal
- Objetivo: além do fluxo do vendedor, ajustar configurações e integrações.
- Canais no sistema: `admin.html` com tabs extras exibidas para `role=admin`.

## 3. Jornadas de usuário (fluxos reais)

### Jornada pública - descoberta até contato
1. Usuário acessa home.
2. Seleciona tipo/marca/modelo/ano/preço ou navega por cards/carrosséis.
3. Entra em `veiculos.html` com query params de filtro.
4. Abre `detalhes.html?id=...`.
5. Navega fotos, vê preço/dados/opcionais.
6. Clica em `Enviar mensagem` (WhatsApp).

### Jornada admin - cadastro de veículo
1. Usuário acessa login e autentica.
2. Entra no painel em `Painel Geral`.
3. Vai para `Novo Veículo`.
4. Step 1: tipo/marca/modelo/ano/versão (FIPE).
5. Step 2: preço, km, combustível, técnicos, descrição, data da adição, URL do vídeo.
6. Step 3: opcionais, fotos, lifestyle.
7. Salva veículo.
8. Opcional: compartilhar e gerar texto de marketing.

### Jornada admin - gestão de estoque
1. Acessa tab `Estoque Cadastrado`.
2. Aplica filtros.
3. Executa ação:
  - Editar
  - Visualizar
  - Duplicar
  - Gerar texto de marketing
  - Excluir (com confirmação)

## 4. Fluxos principais
- Carregamento de dados híbrido (`Supabase -> localStorage merge`).
- Filtro em tempo real no estoque público e no admin.
- Persistência de preferências e configuração em localStorage.
- Atualização de links WhatsApp global com número configurado.

## 5. Fluxos administrativos existentes
- Dashboard com estatísticas locais (`souza_analytics_v1`).
- Cadastro/edição com stepper e validação por etapa.
- Upload para bucket `car-photos` com fallback para base64 local.
- Configurações de contato e endereço da loja.
- Integrações Pixel/GA persistidas localmente.

## 6. Regras de negócio implementadas
- Marca é normalizada (`vw`, `volks`, etc. -> `Volkswagen`).
- Título de veículo é padronizado em `capitalizeText`.
- Condição inferida para filtros quando não existe campo explícito:
  - Novo: km 0 / badge 0km
  - Seminovo: km > 0
  - Usado: ano antigo
- Em detalhes, se não há vídeo válido de YouTube, exibe mosaico de fotos.
- Carrosséis aceitam teclado (setas) quando ativos.

## 7. Estados e comportamentos do sistema
- Estados de carregamento por placeholders e textos (`Carregando...`).
- Toast para feedback de sucesso/erro.
- Fallbacks:
  - Sem Supabase: usa localStorage
  - FIPE indisponível: usa marcas fallback
  - Upload falhou: salva base64 local

## 8. Restrições conhecidas
- Parte das métricas é local do navegador, não global da operação.
- Segurança de login e permissões é majoritariamente frontend.
- Campos usados no frontend não estão integralmente na tabela `veiculos` do banco (detalhado em DB Spec).

## 9. Decisões de produto implícitas no código
- Prioridade de UX sobre rigidez transacional (salva local mesmo sem nuvem).
- WhatsApp como CTA principal de conversão.
- Detalhe do veículo orientado a mídia e informação compacta acima da dobra.
- Painel simplificado para velocidade operacional diária.
