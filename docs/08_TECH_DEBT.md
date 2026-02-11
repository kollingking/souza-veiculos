# 08 - Limitações e Débitos Técnicos

## 1. Itens parciais / mock
- Integrações de Pixel/GA:
  - UI existe e salva localmente.
  - Aplicação runtime no site não está implementada.
- Módulo de vendedores:
  - Funções JS existem.
  - UI de gestão não está exposta no menu atual.

## 2. Itens incompletos
- Segurança de autenticação/autorização não está em nível de produção robusta.
- Telemetria operacional centralizada (server-side) não existe.
- Contrato de dados entre frontend e banco está desalinhado para alguns campos.

## 3. Itens não escaláveis (estado atual)
- `script.js` monolítico com alta concentração de responsabilidades.
- Estado global via variáveis em `window` e localStorage.
- Analytics por navegador/dispositivo, não por sistema central.

## 4. Débitos de modelagem de dados
- Frontend usa campos que não existem no schema público de `veiculos`:
  - `condition`, `type`, `code`, `videoUrl`.
- Risco de falhas silenciosas e fallback local mascarando problema de persistência na nuvem.

## 5. Débitos de qualidade
- Sem suíte de testes automatizados.
- Sem linting/build gate no repositório.
- Parte do conteúdo textual ainda depende de revisão contínua de padronização linguística.

## 6. Débitos de segurança
- Senhas em texto puro em `vendedores`.
- Sessão local suscetível a manipulação no cliente.
- Credenciais de fallback no login.

## 7. Débitos de produto
- Falta trilha de auditoria de ações administrativas.
- Sem módulo de leads e acompanhamento comercial.
- Sem painel de métricas realmente globais para múltiplos usuários/dispositivos.
