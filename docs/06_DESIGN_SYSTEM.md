# 06 - Design System (Retroativo)

## 1. Tokens principais (derivados de `styles.css`)

### Paleta base
- `--primary`: `#FF7A1A`
- `--primary-dark`: `#E66000`
- `--primary-light`: `#FFB36B`
- `--primary-soft`: `#FFF2E8`
- `--cta-green`: `#1E8E3E`
- `--cta-green-dark`: `#166A31`

### Texto
- `--text-primary`: `#1A1A2E` (light) / `#FFFFFF` (dark)
- `--text-secondary`: `#4B5563` (light) / `#D1D5DB` (dark)
- `--text-light`: `#9CA3AF`

### Superfícies
- `--bg-primary`: branco no light, quase preto no dark
- `--bg-secondary`: cinza claro no light, escuro no dark
- Header:
  - Light: preto (`--header-bg: #0B0B0B`, texto branco)
  - Dark: laranja (`--header-bg: #FF7A1A`, texto branco)

## 2. Tipografia
- Família principal: **Plus Jakarta Sans**.
- Pesos usados com maior recorrência: `300`, `400`, `500`.
- Diretriz atual aplicada no front: visual mais clean com menor peso nos botões.

## 3. Botões

### Primário
- Fundo laranja, texto branco.
- Uso: CTA principal (`Salvar`, `Detalhes`, etc., conforme contexto).

### Secundário
- Fundo claro/branco, borda visível.
- Uso: ações auxiliares.

### Perigoso
- Variante vermelha para exclusão.

### WhatsApp/Contato
- Verde com texto branco.
- Cantos arredondados e altura compacta em cards e detalhe.

## 4. Componentes recorrentes
- Header fixo com menu centralizado.
- Cards de veículo com:
  - imagem
  - título/specs
  - preço
  - ações (detalhes + contato)
- Carrosséis horizontais com setas e scroll sem barra visível.
- Footer em tema escuro com links institucionais e legais.
- Modal de galeria de imagens.
- Toast global de feedback.

## 5. Padrões de layout
- Container central com `max-width: 1200px`.
- Seções em blocos com espaçamento consistente.
- Grid responsivo:
  - Home/listagens: cards adaptativos
  - Detalhes: topo em bloco com mídia + info e seções subsequentes
  - Admin: sidebar + área principal

## 6. Comportamento visual
- Hover em cards com elevação/sombra.
- Hover de imagem de card troca para segunda foto.
- Carrosséis com rolagem horizontal suave (`scroll-behavior: smooth`).
- Setas de teclado controlam o carrossel ativo.

## 7. Estados de UI
- `loading`: placeholders e textos de carregamento.
- `empty`: mensagens como “Nenhum veículo encontrado”.
- `success`: toast de confirmação e feedback visual.
- `error`: toast/alert para falhas de validação ou sincronização.

## 8. Divergências observadas
- Existe `design-system.md` legado no repositório com referências antigas (ex.: Inter), não totalmente alinhado ao CSS atual.
- O design system real vigente é o derivado de `styles.css` + ajustes inline do admin.
