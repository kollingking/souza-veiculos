# Documentação Técnica: Souza Select Car 🏛️🚗

Esta documentação detalha a arquitetura, funcionalidades e diretrizes do sistema desenvolvido para a **Souza Select Car**. O objetivo deste documento é fornecer uma base sólida para que qualquer desenvolvedor ou IA possa entender, manter e evoluir o projeto mantendo a integridade da "Vibe" e das regras de negócio.

---

## 1. Visão Geral do Sistema
O **Souza Select Car** é uma plataforma de vitrine automotiva premium e gestão de estoque. Ele foi construído utilizando uma arquitetura **Local-First**, eliminando a necessidade inicial de servidores de banco de dados complexos e garantindo performance instantânea.

### Tecnologias Core:
- **Frontend**: HTML5 Semântico, CSS3 Moderno (Variáveis, Flexbox, Grid).
- **Lógica**: JavaScript Vanilla (ES6+).
- **Persistência**: `localStorage` do navegador para dados de estoque, configurações e sessões.
- **Integração Externa**: API Pública da FIPE (via Parallelum) para padronização de dados.

---

## 2. Arquitetura de Dados
O sistema utiliza o `localStorage` com as seguintes chaves principais:
- `souza_cars`: Array de objetos contendo todos os veículos (id, título, marca, modelo, ano, preço, km, imagens[], opcionais[]).
- `souza_options`: Array de strings contendo a lista global de opcionais (aprende novos termos conforme o uso).
- `souza_session`: Token temporal de autenticação para acesso à área restrita.

---

## 3. Diretrizes de Negócio (O "Coração" do Projeto)
Estas regras são imutáveis para manter a estratégia de vendas do cliente:
1.  **Sem Simulador de Financiamento**: Proibido exibir parcelas automáticas. O foco é a exibição do preço total e o CTA (**Call to Action**) obrigatório para o WhatsApp.
2.  **Design Premium (No Emojis)**: A estética deve ser sóbria (Dark Mode / Gold), sem o uso de emojis, transmitindo seriedade e luxo.
3.  **Abordagem Humana**: O site é um gerador de leads. Toda e qualquer dúvida técnica ou de pagamento deve direcionar o usuário para o contato humano.

---

## 4. Funcionalidades do Usuário (Vitrine)
- **Home Page**: Banner rotativo, destaques dinâmicos e busca rápida.
- **Catálogo de Veículos**: Listagem completa com filtros inteligentes (Marca ➔ Modelo sincronizado).
- **Filtros por Estilo de Vida**: Categorização por tags (Família, Off-road, Econômico, etc).
- **SEO & Marketing**: Meta tags configuradas para indexação e **Facebook Pixel** integrado para rastreamento de conversão em tráfego pago.

---

## 5. Área Administrativa (Restrita)
- **Segurança**: Proteção via tela de login (`login.html`). Bloqueio de acesso direto ao `admin.html` sem sessão ativa.
- **Integração FIPE**: O cadastro de veículos é guiado. O admin seleciona Marca ➔ Modelo ➔ Ano ➔ Versão, buscando preços e nomes oficiais para evitar erros de digitação.
- **Gestão de Imagens**: Suporte para upload de até **20 fotos** por veículo (convertidas para Base64 para persistência local).
- **Gestão de Opcionais**: Sistema de "tags" onde novos opcionais digitados são salvos globalmente para uso futuro.
- **CRUD Completo**: Funcionalidades de Criar, Ler, Atualizar (Editar) e Deletar veículos.

---

## 6. Como Rodar e Testar
1.  **Execução**: Abra o arquivo `index.html` em qualquer navegador moderno.
2.  **Acesso Restrito**:
    - **URL**: `login.html` (ou via botão no cabeçalho).
    - **Login de Teste**: `1234`
    - **Senha de Teste**: `xxxx`
3.  **Sincronização**: Ao adicionar um carro no Admin, ele aparecerá instantaneamente na Home e na página de Veículos.

---

## 7. Próximos Passos (Roadmap)
- **Database Cloud**: Migração para **Supabase** para sincronização multi-dispositivo.
- **Página de Detalhes**: Criação de página individual para cada veículo com galeria expandida.
- **Dashboard de Leads**: Rastreamento de quantos cliques o botão de WhatsApp recebeu.

---
*Documentação gerada em 05/02/2026 para fins de auditoria e evolução técnica.*
