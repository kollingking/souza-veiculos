# 00 - Overview do Produto

## Nome do sistema
- Nome em uso: **Souza Select Car**
- Nome técnico sugerido para documentação: **Souza Veículos Web + Painel Administrativo**

## Objetivo principal
- Publicar e gerir estoque de veículos (carros e motos) com vitrine pública e painel administrativo.

## Problema que resolve
- Reduz dependência de publicação manual e descentralizada.
- Permite cadastro, edição e organização de estoque com atualização rápida no site.
- Centraliza contato comercial (WhatsApp), mídia do veículo e dados básicos para venda.

## Público-alvo
- Equipe interna da loja (admin e vendedores).
- Visitantes interessados em comprar veículos.

## Proposta de valor
- Operação leve (frontend estático), com fallback local quando nuvem falha.
- Fluxo rápido de cadastro com FIPE, upload de fotos, duplicação e geração de texto de marketing.
- Página de detalhe com forte foco visual (galeria, opcionais, vídeo/mosaico, localização e CTA de WhatsApp).

## Diferenciais atuais implementados
- Arquitetura híbrida de dados: **Supabase + localStorage**.
- Carrosséis com suporte a:
  - Setas clicáveis
  - Scroll horizontal via mouse/trackpad
  - Teclas do teclado (`ArrowLeft`/`ArrowRight`) quando o carrossel está ativo
- Fallback automático de mídia:
  - Se há vídeo válido do YouTube: exibe iframe
  - Se não há vídeo: exibe mosaico com fotos do veículo
- Dashboard administrativo com métricas locais de uso e veículos mais vistos.

## Escopo atual (o que o sistema FAZ hoje)
- Site público:
  - Home com busca por marca/modelo/ano/preço e filtros por tipo (carro/moto)
  - Página de estoque (`veiculos.html`) com filtros e busca textual
  - Página de detalhes (`detalhes.html`) com galeria, dados, opcionais, compartilhamento social e botão de contato
  - Tema claro/escuro persistido
  - Botão flutuante de WhatsApp e atualização automática de links pelo telefone configurado no admin
- Painel (`admin.html`):
  - Login restrito via `login.html`
  - Dashboard geral
  - Cadastro de veículo em 3 etapas
  - Upload de fotos com preview e reorder (drag and drop)
  - Edição, duplicação, exclusão com modal de confirmação
  - Filtros avançados de estoque (busca, faixa de ano, faixa de preço, marca, status e combustível)
  - Geração de texto de marketing e compartilhamento via WhatsApp
  - Configurações de WhatsApp/endereço/dados da empresa
  - Integrações (Pixel/GA) com configuração local

## Fora de escopo atual (o que NÃO faz)
- Não há backend próprio (API custom) nem servidor de aplicação.
- Não há autenticação robusta (JWT/refresh/expiração real no cliente) nem RBAC seguro no backend.
- Não há gestão de leads/CRM.
- Não há trilha de auditoria persistida no banco para ações administrativas.
- Não há analytics centralizado por servidor (métricas atuais são locais do navegador).
- Não há fluxo real de integração dinâmica de Pixel/GA na renderização do site (somente configuração local no painel).
