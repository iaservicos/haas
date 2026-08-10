# Stack Tecnológica - Portal de Vistoria HaaS

## 📋 Visão Geral
Sistema de inspeção de equipamentos TI com análise de imagem por IA, gerenciamento de usuários e geração de relatórios.

---

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│              Portal de Vistoria - Cliente                │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend (Node.js)                       │
│            Express API + Cron Jobs                       │
└────────────┬─────────────────────────────────┬───────────┘
             │                                 │
             ↓                                 ↓
    ┌─────────────────┐           ┌──────────────────────┐
    │   Supabase      │           │  Claude AI (Anthropic) │
    │  PostgreSQL     │           │  Image Analysis         │
    │  Storage        │           │                        │
    └─────────────────┘           └──────────────────────┘
```

---

## 🎨 Frontend

### Framework & Linguagem
- **React** 18.2.0 - UI framework
- **TypeScript** 5.1.6 - Linguagem com tipos
- **Vite** 4.4.9 - Build tool & dev server

### Styling
- **Tailwind CSS** 3.3.0 - Utility-first CSS
- **PostCSS** 8.4.24 - CSS processing
- **Autoprefixer** 10.4.14 - Cross-browser compatibility

### Routing & Estado
- **React Router DOM** 6.14.2 - Client-side routing
- **Zustand** 4.4.0 - State management (alternativa leve ao Redux)

### Componentes & Utilidades
- **Recharts** 2.8.0 - Gráficos e dashboards
- **QRCode.react** 4.2.0 - Geração de QR Codes
- **Axios** 1.4.0 - HTTP client
- **date-fns** 2.30.0 - Manipulação de datas
- **XLSX** 0.18.5 - Export/import Excel

### Banco de Dados (Cliente)
- **Supabase JS** 2.100.0 - Cliente Supabase/PostgreSQL

---

## 🔧 Backend

### Runtime & Framework
- **Node.js** - Runtime JavaScript
- **Express.js** - Web framework (implícito nas rotas)
- **TypeScript** - Linguagem com tipos

### Autenticação & Segurança
- **bcryptjs** 3.0.3 - Hash de senhas
- **JWT** - Token-based authentication (via jsonwebtoken)

### Processamento de Dados
- **Multer** 2.1.1 - Upload de arquivos
- **Sharp** 0.34.5 - Processamento de imagens
- **XLSX** 0.18.5 - Processamento de planilhas

### Banco de Dados
- **Supabase** - PostgreSQL gerenciado
- **pg** 8.20.0 - Driver PostgreSQL
- **Supabase Storage** - Armazenamento de fotos (S3 compatível)

### Tarefas Agendadas
- **node-cron** 4.2.1 - Cron jobs para análise de imagens

### Utilidades
- **Axios** 1.15.2 - HTTP client
- **dotenv** 17.4.2 - Gerenciamento de variáveis de ambiente

---

## 🤖 IA & Análise

### Modelo de IA
- **Claude 3.5 Haiku** - Análise de imagens (modelo primário)
- **Claude 3.5 Sonnet** - Fallback (mais preciso, mais caro)
- **Claude 4.1 Opus** - Fallback final (máxima precisão)

### Detecção de Danos
- Análise de fotos de equipamentos TI
- Identificação de avarias: tela, carcaça, teclado, conectores, bateria
- Processamento via cron job com retry automático
- Suporte para fallback entre modelos

---

## 🗄️ Banco de Dados

### Plataforma
- **Supabase** (PostgreSQL gerenciado)
- **Versão**: Última (cloud)

### Tabelas Principais
- `usuarios` - Usuários do sistema (analyst, client, admin)
- `contratos` - Contratos de clientes
- `contrato_equipamentos` - Equipamentos associados
- `fotos_vistoria` - Fotos de inspeções
- `inspecao_respostas` - Respostas do checklist
- `analises_fotos` - Resultados de análise IA
- `vistorias` - Registros de vistorias
- `confirmacoes` - Confirmações de inspeção

### Storage
- **Bucket**: `fotos` - Armazenamento de imagens

---

## 🚀 Deployment

### Frontend
- **Vercel** - Hospedagem do React app
- **Auto-deploy** com git push

### Backend
- **Vercel** - Serverless functions (endpoints)
- **Cron jobs** - Agendamento de análises

### Variáveis de Ambiente

#### Backend
```
ANTHROPIC_API_KEY        # Chave API Claude
SUPABASE_URL            # URL do Supabase
SUPABASE_KEY            # Chave pública Supabase
JWT_SECRET              # Chave para assinar tokens JWT
NODE_ENV                # production/development
PORT                    # Porta do servidor
```

#### Frontend
```
VITE_API_URL            # URL da API backend (ex: https://haas-mu.vercel.app/api)
```

---

## 📦 Dependências Críticas

### Versões Fixas (Produção)
| Pacote | Versão | Razão |
|--------|--------|-------|
| react | 18.2.0 | Estável, render otimizado |
| typescript | 5.1.6 | Type safety |
| tailwindcss | 3.3.0 | CSS utilities |
| vite | 4.4.9 | Build rápido |
| express | implícito | Framework web |
| @supabase/supabase-js | 2.100.0+ | Client DB |
| axios | 1.15.2 | HTTP requests |

---

## 🔒 Segurança

### Autenticação
- JWT tokens com expiração de 40 minutos
- Inatividade: logout automático
- Role-based access control (RBAC)

### Criptografia
- bcryptjs para hash de senhas
- HTTPS obrigatório em produção
- Variáveis sensíveis via environment variables

### Upload de Arquivos
- Multer com limite de 50MB
- Validação de tipo de arquivo (imagens)
- Armazenamento em Supabase Storage (S3)

---

## 📊 Performance

### Otimizações
- **Frontend**: Vite para build otimizado, code-splitting automático
- **Backend**: Serverless com Vercel (escalabilidade automática)
- **IA**: Modelo Haiku (5x mais rápido que Sonnet)
- **Imagens**: Sharp para otimização/processamento
- **Banco**: Índices em campos frequentemente consultados

### Limites
- Upload máximo: 50MB por arquivo
- Timeout API: 30 segundos
- Retry automático: 2 tentativas por modelo
- Fallback: 3 modelos disponíveis

---

## 🧪 Testing

### Ferramentas (Se configuradas)
- ESLint - Linting
- TypeScript - Type checking
- Testes unitários/integração (não visível em package.json)

---

## 📱 Suporte

### Plataformas
- Desktop (Chrome, Firefox, Safari, Edge)
- Mobile (iOS Safari, Android Chrome)
- Tablets (iPad, Android tablets)

### Navegadores Mínimos
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 🌍 Localização

- **Idioma**: Português (Brasil)
- **Timezone**: São Paulo (UTC-3)
- **Moeda**: BRL (se aplicável)

---

## 📝 Versionamento

- **Sem SemVer formal** - Versão 1.0.0
- **Implantação contínua** - Vercel auto-deploy
- **Controle de versão**: Git + GitHub

---

## 🔄 Integração Contínua

### Fluxo Atual
1. Push para main no GitHub
2. Vercel detecta mudanças
3. Build automático
4. Deploy em produção

### Status
- Frontend: ✅ Funcionando
- Backend: ✅ Funcionando
- IA (Claude): ✅ Funcionando
- Cron jobs: ✅ Funcionando

---

## 📞 Contato & Suporte

- **Time**: IA Serviços
- **Projeto**: Portal de Vistoria HaaS
- **Ambiente**: Production (Vercel)
