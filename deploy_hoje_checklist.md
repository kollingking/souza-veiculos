# 🚀 DEPLOY HOJE - CHECKLIST EXECUTIVO
## Site no ar em 1 hora

**Data:** 11/02/2026 21:29  
**Objetivo:** Colocar Souza Select Car online HOJE  
**Prazo:** 1 hora  
**Plataforma:** Netlify (GRÁTIS)

---

## ⚡ RESUMO EXECUTIVO

**Status Atual:** Site completo e funcional (87/100)  
**Pronto para produção:** ✅ SIM  
**Bloqueadores:** ❌ NENHUM  
**Você Precisa:** 30 minutos de trabalho

---

## 📋 PARTE 1: PREPARAÇÃO (10 min)

### ✅ **1.1. Criar Conta Netlify**
⏱️ 3 minutos

1. Acesse: https://netlify.com
2. Clique em "Sign Up"
3. Use sua conta GitHub, Google ou Email
4. Confirme o email (se pedido)

**✓ Checklist:**
- [ ] Conta criada
- [ ] Email confirmado
- [ ] Logado no dashboard

---

### ✅ **1.2. Preparar Arquivos para Upload**
⏱️ 7 minutos

#### **Arquivos OBRIGATÓRIOS (copiar para pasta limpa):**

```
📁 site-deploy/
├── index.html          ✅ OBRIGATÓRIO
├── veiculos.html       ✅ OBRIGATÓRIO
├── detalhes.html       ✅ OBRIGATÓRIO
├── admin.html          ✅ OBRIGATÓRIO
├── login.html          ✅ OBRIGATÓRIO
├── script.js           ✅ OBRIGATÓRIO
├── styles.css          ✅ OBRIGATÓRIO
├── logo.png            ✅ OBRIGATÓRIO
├── favicon.ico         ✅ OBRIGATÓRIO
├── porsche_engine.mp3  ✅ OBRIGATÓRIO
└── fotos do site/      ✅ OBRIGATÓRIO (pasta toda)
```

#### **Arquivos OPCIONAIS (não enviar):**
```
❌ .git/                  (não precisa)
❌ *.md                   (documentação)
❌ .gitignore             (não precisa)
❌ docs/                  (não precisa)
❌ commit_project.bat     (não precisa)
```

#### **AÇÃO RÁPIDA:**
```powershell
# Execute no PowerShell (dentro da pasta do site)

# 1. Criar pasta limpa
New-Item -ItemType Directory -Force -Path "..\site-deploy"

# 2. Copiar arquivos essenciais
Copy-Item "*.html" "..\site-deploy\"
Copy-Item "*.js" "..\site-deploy\"
Copy-Item "*.css" "..\site-deploy\"
Copy-Item "*.png" "..\site-deploy\"
Copy-Item "*.ico" "..\site-deploy\"
Copy-Item "*.mp3" "..\site-deploy\"
Copy-Item "fotos do site" "..\site-deploy\fotos do site" -Recurse

# 3. Verificar
Get-ChildItem "..\site-deploy"
```

**✓ Checklist:**
- [ ] Pasta `site-deploy` criada
- [ ] 5 arquivos HTML copiados
- [ ] script.js copiado
- [ ] styles.css copiado
- [ ] logo.png copiado
- [ ] favicon.ico copiado
- [ ] Pasta "fotos do site" copiada

---

## 📋 PARTE 2: DEPLOY NO NETLIFY (15 min)

### ✅ **2.1. Upload via Drag & Drop**
⏱️ 5 minutos

1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta `site-deploy` para a área indicada
3. Aguarde o upload (pode levar 2-3 minutos)
4. Site estará no ar automaticamente!

**URL temporária:** `https://random-name-12345.netlify.app`

**✓ Checklist:**
- [ ] Pasta arrastada para Netlify
- [ ] Upload concluído (100%)
- [ ] URL gerada automaticamente
- [ ] Site acessível via URL

---

### ✅ **2.2. Configurar Domínio Personalizado (OPCIONAL)**
⏱️ 10 minutos

#### **Opção A: Usar domínio grátis do Netlify**
1. No dashboard do site, clique em "Site settings"
2. Vá em "Domain management" → "Domains"
3. Clique em "Edit site name"
4. Digite: `souzaselectcar` (ou nome desejado)
5. Salvar

**Novo URL:** `https://souzaselectcar.netlify.app`

#### **Opção B: Usar domínio próprio (se tiver)**
1. No dashboard, "Domain management" → "Add custom domain"
2. Digite seu domínio: `souzaselectcar.com.br`
3. Siga instruções para configurar DNS
4. Aguarde propagação (pode levar até 24h)

**✓ Checklist:**
- [ ] Domínio configurado (Netlify ou próprio)
- [ ] HTTPS habilitado automaticamente
- [ ] Site acessível pelo novo domínio

---

## 📋 PARTE 3: CONFIGURAÇÃO SUPABASE (5 min)

### ✅ **3.1. Verificar Credenciais**
⏱️ 2 minutos

**Abra:** `script.js` (linha 422)

```javascript
const SUPABASE_URL = 'https://ltymsdjeylwhgqtlsyaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGci...'; // Sua chave
```

**Verificar:**
- [ ] SUPABASE_URL está correto
- [ ] SUPABASE_KEY está correto
- [ ] Ambos estão no arquivo que foi pro Netlify

---

### ✅ **3.2. Configurar CORS no Supabase** 
⏱️ 3 minutos

1. Acesse: https://supabase.com
2. Login no seu projeto
3. Vá em "Settings" → "API"
4. Adicione o domínio do Netlify na lista de origens permitidas:
   ```
   https://souzaselectcar.netlify.app
   ```
5. Salvar configurações

**✓ Checklist:**
- [ ] Domínio Netlify adicionado no Supabase
- [ ] Configurações salvas

---

## 📋 PARTE 4: TESTES PÓS-DEPLOY (15 min)

### ✅ **4.1. Teste de Páginas**
⏱️ 5 minutos

Abra cada página no navegador:

```
✅ https://seusite.netlify.app/
✅ https://seusite.netlify.app/veiculos.html
✅ https://seusite.netlify.app/detalhes.html?id=1
✅ https://seusite.netlify.app/admin.html
✅ https://seusite.netlify.app/login.html
```

**Verificar:**
- [ ] Todas as páginas carregam
- [ ] Logo aparece
- [ ] CSS está aplicado
- [ ] Não há erros no console (F12)

---

### ✅ **4.2. Teste de Funcionalidades**
⏱️ 10 minutos

#### **Teste 1: Filtros**
1. Acesse `/veiculos.html`
2. Selecione um filtro (ex: marca)
3. Verifique se os carros aparecem
- [ ] Filtros funcionando

#### **Teste 2: Dark Mode**
1. Clique no botão de tema (sol/lua)
2. Verifique se muda de tema
- [ ] Dark mode funciona

#### **Teste 3: WhatsApp**
1. Clique no botão flutuante do WhatsApp
2. Verifique se abre conversa
- [ ] WhatsApp abre corretamente

#### **Teste 4: Admin Login**
1. Acesse `/login.html`
2. Login: `1234` / Senha: `1234`
3. Verifique se entra no admin
- [ ] Login funciona

#### **Teste 5: Cadastro de Veículo**
1. No admin, tente cadastrar um veículo
2. Preencha os campos
3. Salve
- [ ] CRUD funciona (online ou offline)

#### **Teste Mobile**
1. Abra no celular
2. Teste navegação
3. Teste filtros
- [ ] Mobile responsivo

**✓ Checklist Geral:**
- [ ] Todos os 5 testes passaram
- [ ] Zero erros críticos
- [ ] Mobile funcionando

---

## 📋 PARTE 5: OTIMIZAÇÕES PÓS-DEPLOY (5 min)

### ✅ **5.1. Google Search Console**
⏱️ 3 minutos

1. Acesse: https://search.google.com/search-console
2. Adicione propriedade (URL do Netlify)
3. Verifique propriedade (via DNS ou HTML)
4. Envie sitemap (se criou): `https://seusite.com/sitemap.xml`

**✓ Checklist:**
- [ ] Propriedade adicionada
- [ ] Propriedade verificada
- [ ] (Opcional) Sitemap enviado

---

### ✅ **5.2. Facebook Pixel / Google Analytics**
⏱️ 2 minutos

Se você tiver IDs de rastreamento:

1. Acesse `/admin.html` (logado)
2. Vá na seção de "Configurações"
3. Configure:
   - Facebook Pixel ID (se tiver)
   - Google Analytics ID (se tiver)
4. Salvar

**✓ Checklist:**
- [ ] IDs configurados (se aplicável)
- [ ] Rastreamento ativo

---

## 🎯 CHECKLIST FINAL - SITE NO AR!

### ✅ **Deploy Completo:**
- [ ] Site hospedado no Netlify
- [ ] HTTPS habilitado automaticamente
- [ ] Domínio configurado
- [ ] Supabase conectado
- [ ] Todas as páginas acessíveis
- [ ] Funcionalidades testadas
- [ ] Mobile funcionando
- [ ] Console sem erros críticos

### ✅ **Credenciais de Acesso:**
```
Admin Master:
- URL: https://seusite.com/login.html
- Usuário: 1234
- Senha: 1234 (ou XXXX)

Vendedor:
- Usuário: kaua
- Senha: 1234
```

### ✅ **URLs Importantes:**
```
🏠 Site Principal: https://seusite.netlify.app
📱 WhatsApp: (19) 99838-3275
📧 Suporte Netlify: https://docs.netlify.com
🗄️ Supabase Dashboard: https://app.supabase.com
```

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### **Problema 1: Imagens não aparecem**
**Causa:** Caminho relativo errado  
**Solução:** Verificar se a pasta "fotos do site" foi enviada

### **Problema 2: Admin não conecta com Supabase**
**Causa:** CORS não configurado  
**Solução:** Adicionar domínio Netlify nas configurações do Supabase

### **Problema 3: CSS não carrega**
**Causa:** Arquivo styles.css não foi enviado  
**Solução:** Verificar se styles.css está na raiz da pasta de deploy

### **Problema 4: Login não funciona**
**Causa:** Modo offline ou credenciais erradas  
**Solução:** Verificar credenciais ou forçar modo offline (funciona com localStorage)

### **Problema 5: Erro 404 em páginas**
**Causa:** Arquivos HTML não foram enviados  
**Solução:** Re-deploy com todos os arquivos .html

---

## 📊 TEMPO TOTAL ESTIMADO

| Etapa | Tempo | Status |
|-------|-------|--------|
| 1. Preparação | 10 min | ⏳ |
| 2. Deploy Netlify | 15 min | ⏳ |
| 3. Configurar Supabase | 5 min | ⏳ |
| 4. Testes | 15 min | ⏳ |
| 5. Otimizações | 5 min | ⏳ |
| **TOTAL** | **50 min** | ⏳ |

**Margem de segurança:** +10 min = **1 hora no máximo**

---

## ✅ PÓS-DEPLOY: MONITORAMENTO

### **Primeira Semana:**
- [ ] Verificar erros no console diariamente
- [ ] Testar admin em diferentes navegadores
- [ ] Monitorar analytics (se configurado)
- [ ] Coletar feedback de usuários

### **Manutenção:**
- Cadastrar veículos reais via admin
- Atualizar fotos conforme necessário
- Monitorar espaço no Supabase (plano grátis: 500MB)

---

## 🎉 SITE NO AR - SUCESSO!

**Parabéns!** Seu site está online e funcionando.

**Próximos passos (opcionais):**
1. Aplicar otimizações técnicas (arquivo `OTIMIZACOES_TECNICAS_87_PARA_95.md`)
2. Cadastrar veículos reais
3. Divulgar nas redes sociais
4. Configurar domínio próprio (se ainda não tiver)
5. Adicionar mais fotos/vídeos

---

**⚠️ IMPORTANTE:**
- Netlify FREE tem 100GB/mês de banda (suficiente para 10-50k visitas)
- Supabase FREE tem 500MB de storage
- HTTPS é automático e grátis
- CDN global incluído

---

**Status Final:** ✅ PRODUCTION READY  
**Data de Deploy:** 11/02/2026  
**Responsável:** Souza Select Car Team

🚀 **BOA SORTE COM O LANÇAMENTO!**
