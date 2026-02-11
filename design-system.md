# Souza Car – Design System

## Cores

### Texto
- `text-primary`: #1A1A2E (Texto principal)
- `text-secondary`: #4B5563 (Texto secundário)
- `text-muted`: #9CA3AF (Texto terciário)
- `text-accent`: #FF7A1A (Texto de destaque - laranja)
- `text-on-primary`: #FFFFFF (Texto sobre fundo laranja)

### Superfícies
- `surface-page`: #F7F7FA (Fundo da página)
- `surface-card`: #FFFFFF (Fundo de cards)
- `surface-elevated`: #FFFFFF (Elementos elevados)
- `surface-soft`: #FFF2E8 (Fundo suave laranja)
- `surface-overlay`: rgba(26, 26, 46, 0.5) (Overlay)

### Ações
- `action-primary`: #FF7A1A (Laranja - CTA principal)
- `action-primary-hover`: #E66000 (Laranja escuro - hover)
- `action-secondary`: #FFFFFF (Botão secundário claro)
- `action-secondary-hover`: #F1F5F9 (Hover secundário)

### Bordas
- `border-default`: #E5E7EB (Bordas padrão)
- `border-subtle`: #F1F5F9 (Bordas sutis)
- `border-accent`: #FFB36B (Borda de destaque)
- `border-focus`: #FFB36B (Borda em foco)

### Status
- `status-success`: #10b981 (Verde - disponível)
- `status-success-bg`: #064e3b (Fundo verde escuro)
- `status-warning`: #f59e0b (Amarelo - reservado)
- `status-warning-bg`: #78350f (Fundo amarelo escuro)
- `status-error`: #ef4444 (Vermelho - vendido)
- `status-error-bg`: #7f1d1d (Fundo vermelho escuro)

## Tipografia

### Fontes
- `font-family-heading`: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- `font-family-body`: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

### Tamanhos
- `text-xs`: 12px / 0.75rem
- `text-sm`: 14px / 0.875rem
- `text-base`: 16px / 1rem
- `text-lg`: 18px / 1.125rem
- `text-xl`: 20px / 1.25rem
- `text-2xl`: 24px / 1.5rem
- `text-3xl`: 30px / 1.875rem
- `text-4xl`: 36px / 2.25rem

### Pesos
- `font-normal`: 400
- `font-medium`: 500
- `font-semibold`: 600
- `font-bold`: 700

### Line Heights
- `leading-tight`: 1.25
- `leading-normal`: 1.5
- `leading-relaxed`: 1.625

## Espaçamentos (grid de 8px)

- `space-1`: 4px / 0.25rem
- `space-2`: 8px / 0.5rem
- `space-3`: 12px / 0.75rem
- `space-4`: 16px / 1rem
- `space-5`: 20px / 1.25rem
- `space-6`: 24px / 1.5rem
- `space-8`: 32px / 2rem
- `space-10`: 40px / 2.5rem
- `space-12`: 48px / 3rem
- `space-16`: 64px / 4rem
- `space-20`: 80px / 5rem
- `space-24`: 96px / 6rem

## Bordas e Sombras

### Border Radius
- `radius-sm`: 4px / 0.25rem
- `radius-md`: 6px / 0.375rem
- `radius-lg`: 8px / 0.5rem
- `radius-xl`: 12px / 0.75rem
- `radius-2xl`: 16px / 1rem
- `radius-full`: 9999px

### Sombras
- `shadow-sm`: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
- `shadow-md`: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
- `shadow-lg`: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)
- `shadow-xl`: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)

## Componentes

### Botões

#### Primary (`button-primary`)
- Background: `action-primary` (laranja)
- Color: `text-on-primary` (branco)
- Padding: `space-3` `space-6`
- Border radius: `radius-lg`
- Font weight: `font-semibold`
- Font size: `text-base`
- Hover: background `action-primary-hover`, transform scale
- Box shadow: `shadow-md` (glow laranja)
- Transition: all 0.3s ease

#### Secondary (`button-secondary`)
- Background: `action-secondary` (claro)
- Color: `text-primary` (escuro)
- Padding: `space-3` `space-6`
- Border radius: `radius-lg`
- Font weight: `font-semibold`
- Font size: `text-base`
- Hover: background `action-secondary-hover`, border `border-accent`
- Transition: all 0.3s ease

#### Ghost (`button-ghost`)
- Background: transparent
- Color: `text-secondary`
- Padding: `space-3` `space-6`
- Border radius: `radius-lg`
- Font weight: `font-medium`
- Font size: `text-base`
- Hover: background `action-secondary`
- Transition: all 0.2s ease

### Cards

#### Default Card (`card-default`)
- Background: `surface-card`
- Border: 1px solid `border-default`
- Border radius: `radius-xl`
- Padding: `space-6`
- Box shadow: `shadow-sm`
- Transition: shadow 0.2s ease
- Hover: `shadow-md`

#### Elevated Card (`card-elevated`)
- Background: `surface-elevated`
- Border: none
- Border radius: `radius-xl`
- Padding: `space-6`
- Box shadow: `shadow-lg`

### Badges

#### Default Badge (`badge-default`)
- Background: `action-secondary` (cinza escuro)
- Color: `text-secondary` (cinza claro)
- Padding: `space-1` `space-3`
- Border radius: `radius-full`
- Font size: `text-sm`
- Font weight: `font-medium`

#### Accent Badge (`badge-accent`)
- Background: transparent
- Color: `text-accent` (laranja)
- Border: 1px solid `border-accent`
- Padding: `space-1` `space-3`
- Border radius: `radius-full`
- Font size: `text-sm`
- Font weight: `font-medium`

#### Success Badge (`badge-success`)
- Background: `status-success-bg` (verde escuro)
- Color: `status-success`
- Padding: `space-1` `space-3`
- Border radius: `radius-full`
- Font size: `text-sm`
- Font weight: `font-medium`

#### Warning Badge (`badge-warning`)
- Background: `status-warning-bg`
- Color: `status-warning`
- Padding: `space-1` `space-3`
- Border radius: `radius-full`
- Font size: `text-sm`
- Font weight: `font-medium`

#### Error Badge (`badge-error`)
- Background: `status-error-bg`
- Color: `status-error`
- Padding: `space-1` `space-3`
- Border radius: `radius-full`
- Font size: `text-sm`
- Font weight: `font-medium`

### Inputs

#### Text Input (`input-text`)
- Background: `surface-card`
- Border: 1px solid `border-default`
- Border radius: `radius-lg`
- Padding: `space-3` `space-4`
- Font size: `text-base`
- Color: `text-primary`
- Placeholder color: `text-muted`
- Focus: border `border-focus`, outline none, shadow `shadow-sm`
- Transition: border 0.2s ease

## Breakpoints (Responsivo)

- `mobile`: até 640px
- `tablet`: 641px - 1024px
- `desktop`: 1025px+

## Grid & Layout

### Container
- Max-width desktop: 1200px
- Padding lateral: `space-6` (mobile), `space-12` (desktop)
- Margin: 0 auto

### Grid de 2 colunas (desktop)
- Display: grid
- Grid-template-columns: 1fr 1fr
- Gap: `space-12`

### Grid de 1 coluna (mobile)
- Display: flex / block
- Flex-direction: column
