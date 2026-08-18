# Portal Vistoria HAAS

Sistema de gestão de inspeção de equipamentos com análise por IA (Claude).

## Arquitetura

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript
- **Banco**: Supabase (PostgreSQL)
- **IA**: Claude API (Haiku, Sonnet, Opus com fallback automático)
- **Deploy**: Docker + Kubernetes + GitLab CI/CD

## Estrutura do Projeto

```
haas/
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── config/         # Configurações (env, database, cors)
│   │   ├── services/       # Lógica de negócio (claudeAnalysisService, usuarioService, inspecaoService)
│   │   ├── routes/         # Endpoints da API
│   │   ├── middleware/     # Auth, error handling
│   │   └── index.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                # App React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/          # Páginas (Dashboard, Confirmacoes, etc)
│   │   ├── services/       # API client
│   │   ├── context/        # Auth context
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── k8s/                     # Manifests Kubernetes
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml.example
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── rbac.yaml
│
├── Dockerfile               # Build Docker
├── nginx.conf              # Configuração nginx
├── .gitlab-ci.yml          # Pipeline CI/CD
└── migrations/             # SQL migrations
```

## Como Publicar

### Pré-requisitos

- Node.js 18+
- Docker
- GitLab CI/CD configurado
- Variáveis de ambiente configuradas no GitLab

### 1. Variáveis de Ambiente

No GitLab, configure as variáveis CI/CD:

**QA:**
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_KEY` - API key do Supabase
- `JWT_SECRET` - Secret para JWT
- `ANTHROPIC_API_KEY` - API key da Claude (obrigatório)
- `GPTMAKER_API_TOKEN` (opcional)
- `GPTMAKER_AGENT_ID` (opcional)
- `GPTMAKER_WORKSPACE_ID` (opcional)
- `POWER_AUTOMATE_WEBHOOK_URL` (opcional)
- `K8S_KUBECONFIG` - Base64 encoded kubeconfig
- `K8S_NAMESPACE` - Nome do namespace (ex: ia-servicos-portalvistoriahaas-app)
- `K8S_CLUSTER` - Nome do cluster Kubernetes
- `CI_REGISTRY_IMAGE` - URL da imagem Docker

**PRD:**
- Mesmas variáveis acima + `K8S_KUBECONFIG_PRD`

### 2. Build e Deploy

#### Development Local

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

#### QA (via GitLab)

1. Commit para branch `qa`
2. Tag: `git tag v1.0.0-qa && git push origin v1.0.0-qa`
3. Pipeline executa automaticamente:
   - Build Docker
   - Deploy para K8s/QA
   - Teste de health check

#### Produção (via GitLab)

1. Commit para branch `main`
2. Tag: `git tag v1.0.0 && git push origin v1.0.0` (criada pela Infra)
3. Pipeline executa:
   - Build Docker
   - Deploy para K8s/PRD (manual approval)

### 3. Health Check

O endpoint `/api/health` verifica se a aplicação está saudável:

```bash
curl http://localhost:5000/api/health
# {"status":"ok"}
```

## Variáveis Importantes

| Variável | Onde aparece | Descrição |
|----------|-------------|-----------|
| `APP_NAME` | configmap, deployment, labels | Nome da aplicação (ia-servicos-portalvistoriahaas-app) |
| `BIND_PORT` | deployment, configmap | Porta interna (3001) |
| `SUPABASE_URL` | secrets | URL do Supabase |
| `SUPABASE_KEY` | secrets | API key do Supabase |
| `JWT_SECRET` | secrets | Secret para JWT (40+ chars aleatórios) |
| `ANTHROPIC_API_KEY` | secrets | API key da Claude (OBRIGATÓRIO) |
| `INGRESS_CLASS` | ingress.yaml | Controller Ingress (nginx ou haproxy) |
| `APP_URL_INT` | ingress.yaml | URL interna (positivo.corp) |
| `APP_URL_EXT` | ingress.yaml | URL externa (positivotecnologia.com.br) |

## Secrets - IMPORTANTE

**Nunca commite secrets em código!**

1. Arquivo `k8s/secrets.yaml.example` serve de template
2. Nunca commite versão preenchida (`.gitignore` já protege)
3. Valores reais vivem em `APP_SECRETS` do GitLab (variável tipo `file`)
4. Deploy falha de propósito até Infra preencher os valores

## Desenvolvimento

### Backend

```bash
cd backend

# Install
npm install

# Build
npm run build

# Dev (com hot reload)
npm run dev

# Tests
npm test

# TypeScript check
npm run type-check
```

### Frontend

```bash
cd frontend

# Install
npm install

# Dev (com hot reload)
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## Serviços Principais

### claudeAnalysisService
Análise de fotos com Claude:
- Fallback automático: Haiku → Sonnet → Opus
- Retry com exponential backoff
- Detecção de trincas, quebras, avarias
- JSON parsing robusto

### usuarioService
Gerenciamento de usuários:
- CRUD de usuários
- Validação de roles (admin, analyst, client)
- Geração de senhas temporárias

### inspecaoService
Lógica de inspeção:
- Perguntas por tipo de equipamento
- Salvar/buscar respostas
- Validação de respostas

## Monitoramento

### Logs

```bash
# Ver logs do pod
kubectl logs -f deployment/ia-servicos-portalvistoriahaas-app -n ia-servicos-portalvistoriahaas-app

# Ver eventos
kubectl describe pod <pod-name> -n ia-servicos-portalvistoriahaas-app
```

### Health Check

```bash
kubectl get endpoints ia-servicos-portalvistoriahaas-app -n ia-servicos-portalvistoriahaas-app
```

## Troubleshooting

### Deploy falha com "SECRET_MISMATCH"

**Causa**: `APP_SECRETS` contém "troque-aqui" (valor-sentinela)

**Solução**: Infra preenche os valores reais em `APP_SECRETS`

### Pipeline falha com "IMAGE_PULL_BACKOFF"

**Causa**: Registry credentials inválidas

**Solução**: Verificar `regcred` secret e token ci-deploy no GitLab

### Aplicação não responde em `/api/health`

**Causa**: Variáveis de ambiente faltando (ex: `SUPABASE_URL`, `ANTHROPIC_API_KEY`)

**Solução**: Verificar ConfigMap e Secret no namespace

## Suporte

Para problemas de deploy/CI/CD, consulte o **Agente Deploy Advisor** no Microsoft Teams.

Para bugs na aplicação, abra issue no repositório GitLab.
