# 09 - Roadmap Sugerido

## Curto prazo (0-30 dias)
1. Alinhar schema de `veiculos` com payload atual do frontend.
2. Corrigir autenticação para remover credenciais hardcoded.
3. Implementar persistência confiável de `videoUrl`, `condition`, `type`, `code`.
4. Exibir status explícito de sincronização nuvem/local no admin.
5. Revisão final de textos e acentuação em toda UI.

## Médio prazo (31-90 dias)
1. Modularizar `script.js` por domínio (data, home, detalhes, admin, ui).
2. Migrar login para Supabase Auth com políticas RLS formais.
3. Implementar analytics centralizado no backend (não localStorage).
4. Ativar integrações Pixel/GA em runtime conforme config salva.
5. Adicionar testes de regressão dos fluxos críticos (cadastro, edição, detalhe, filtros).

## Longo prazo (90+ dias)
1. Criar backend BFF/API dedicada para regras de negócio críticas.
2. Implantar trilha de auditoria e histórico de alterações de veículos.
3. Incluir CRM de leads com funil (origem, contato, status, conversão).
4. Multi-loja / multi-tenant com isolamento de dados por operação.
5. Automações de conteúdo de anúncio (copy assistida, templates por canal, agendamento).

## Critérios de sucesso por fase
- Curto prazo:
  - 100% dos campos críticos persistindo em nuvem.
  - Login sem fallback inseguro.
- Médio prazo:
  - Redução de falhas por regressão e menor acoplamento no frontend.
- Longo prazo:
  - Operação escalável com governança, segurança e inteligência comercial.
